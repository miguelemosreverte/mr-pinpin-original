"""Anonymous, verified release download and strict tar extraction (stdlib only)."""
import argparse
import gzip
import hashlib
from pathlib import Path
import shutil
import tarfile
import tempfile
from urllib.request import Request, urlopen

from release_format import (canonical, clean_path, digest, identity, load_release,
                            new_directory, read_json, regular_open, relative, require)


def download(manifest, destination=None):
    archive = manifest["archive"]
    size, checksum = 0, hashlib.sha256()
    # No SDK, credential lookup, Authorization header, or CI secret.
    request = Request(archive["url"], headers={"User-Agent": "pinpin-pages-materializer/1"})
    with urlopen(request, timeout=60) as response:
        require(response.geturl().startswith("https://"), "Insecure download redirect")
        while True:
            block = response.read(min(1024 * 1024, archive["bytes"] - size + 1))
            if not block:
                break
            size += len(block)
            require(size <= archive["bytes"], "Archive exceeds declared size")
            checksum.update(block)
            if destination:
                destination.write(block)
    require((size, checksum.hexdigest()) == (archive["bytes"], archive["sha256"]),
            "Archive size/SHA-256 mismatch")


class LimitedReader:
    def __init__(self, stream, limit):
        self.stream, self.remaining = stream, limit

    def read(self, size):
        require(size >= 0, "Unbounded decompression request")
        block = self.stream.read(min(size, self.remaining + 1, 1024 * 1024))
        self.remaining -= len(block)
        require(self.remaining >= 0, "Expanded tar exceeds release budget")
        return block


def extract(archive_path, manifest, output):
    require(identity(archive_path) == (manifest["archive"]["bytes"], manifest["archive"]["sha256"]),
            "Archive size/SHA-256 mismatch")
    expected = {entry["path"]: entry for entry in manifest["files"]}
    seen = set()
    output = new_directory(output)
    try:
        with regular_open(archive_path) as packed, gzip.GzipFile(fileobj=packed) as uncompressed:
            bounded = LimitedReader(uncompressed, manifest["bytes"] + len(expected) * 1024 + 10240)
            with tarfile.open(fileobj=bounded, mode="r|") as archive:
                for member in archive:
                    name = relative(member.name)
                    require(member.type == tarfile.REGTYPE and not member.linkname and
                            not member.pax_headers and not member.sparse, "Only plain regular tar members allowed")
                    require(name in expected and name not in seen, "Unexpected or duplicate tar member")
                    entry = expected[name]
                    require(member.size == entry["bytes"], "Tar member size mismatch")
                    target = output.joinpath(*name.split("/"))
                    target.parent.mkdir(parents=True, exist_ok=True)
                    checksum, size = hashlib.sha256(), 0
                    with archive.extractfile(member) as incoming, target.open("xb") as outgoing:
                        while True:
                            block = incoming.read(1024 * 1024)
                            if not block:
                                break
                            size += len(block)
                            require(size <= entry["bytes"], "File exceeds declared size")
                            checksum.update(block)
                            outgoing.write(block)
                    require((size, checksum.hexdigest()) == (entry["bytes"], entry["sha256"]),
                            f"File size/SHA-256 mismatch: {name}")
                    target.chmod(0o644)
                    seen.add(name)
            # Drain gzip to check its CRC and bound content following tar's EOF.
            while bounded.read(1024 * 1024):
                pass
        require(seen == set(expected), "Archive is missing manifest files")
    except BaseException:
        shutil.rmtree(output)
        raise
    return output


def selected_release(repo):
    repo = clean_path(repo)
    selector, raw = read_json(repo / "release.json")
    require(isinstance(selector, dict) and set(selector) == {"version", "release"}
            and selector["version"] == 1 and raw == canonical(selector), "Invalid release selector")
    release = digest(selector["release"])
    return load_release(repo / "releases" / (release + ".json"), release)


def materialize(repo, output, archive=None):
    manifest, release = selected_release(repo)
    output = clean_path(output)
    require(not output.exists(), "Output already exists")
    require(output.parent.is_dir(), "Output parent must already exist")
    if archive:
        extract(archive, manifest, output)
    else:
        with tempfile.TemporaryDirectory(prefix=".pinpin-download-", dir=output.parent) as temporary:
            packed = Path(temporary) / "release.tar.gz"
            with packed.open("xb") as stream:
                download(manifest, stream)
            extract(packed, manifest, output)
    return release


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    parser.add_argument("--out", required=True)
    parser.add_argument("--archive", help="Optional local archive for offline verification")
    args = parser.parse_args()
    print(materialize(args.repo, args.out, args.archive))


if __name__ == "__main__":
    main()
