"""Deterministic packaging of an already verified build-pages output."""
import gzip
import hashlib
import os
from pathlib import Path
import shutil
import stat
import tarfile

from release_format import (BUCKET, MAX_BYTES, MAX_FILES, archive_url, canonical,
                            clean_path, identity, new_directory, object_key,
                            regular_open, relative, require, sha, validate, write_new)


def inventory(root):
    files = {}
    for directory, dirs, names in os.walk(root, followlinks=False):
        for name in dirs + names:
            path = Path(directory) / name
            info = path.lstat()
            require(not stat.S_ISLNK(info.st_mode), "Artifact contains a symlink")
            if stat.S_ISDIR(info.st_mode):
                continue
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, "Artifact contains a special file or hardlink")
            key = relative(path.relative_to(root).as_posix())
            files[key] = (info.st_size, info.st_mtime_ns, info.st_ino, info.st_dev)
            require(len(files) <= MAX_FILES, "Too many artifact files")
    require(files and sum(info[0] for info in files.values()) < MAX_BYTES, "Pages size budget exceeded")
    return files


class HashReader:
    def __init__(self, stream):
        self.stream, self.checksum, self.size = stream, hashlib.sha256(), 0

    def read(self, size):
        block = self.stream.read(size)
        self.size += len(block)
        self.checksum.update(block)
        return block


def package(artifact, source_commit, output):
    artifact = clean_path(artifact)
    require(artifact.is_dir(), "Artifact must be a directory")
    output = clean_path(output)
    require(not output.is_relative_to(artifact), "Package output cannot be inside artifact")
    files = inventory(artifact)
    output = new_directory(output)
    try:
        entries = []
        with (output / "release.tar.gz").open("xb") as raw:
            with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0, compresslevel=6) as compressed:
                with tarfile.open(fileobj=compressed, mode="w|", format=tarfile.USTAR_FORMAT) as archive:
                    for name, snapshot in sorted(files.items()):
                        info = tarfile.TarInfo(name)
                        info.size, info.mode, info.mtime = snapshot[0], 0o644, 0
                        info.uid = info.gid = 0
                        info.uname = info.gname = ""
                        with regular_open(artifact / name) as stream:
                            reader = HashReader(stream)
                            archive.addfile(info, reader)
                            require(reader.size == snapshot[0] and not stream.read(1), "Artifact changed while packaging")
                            entries.append({"path": name, "bytes": reader.size, "sha256": reader.checksum.hexdigest()})
        require(inventory(artifact) == files, "Artifact changed while packaging")
        size, checksum = identity(output / "release.tar.gz")
        manifest = {"version": 1, "bucket": BUCKET, "source_commit": source_commit,
                    "bytes": sum(e["bytes"] for e in entries), "files": entries,
                    "archive": {"bytes": size, "sha256": checksum,
                                "object": object_key(checksum), "url": archive_url(checksum)}}
        validate(manifest)
        write_new(output / "release-manifest.json", canonical(manifest))
        storage = {"version": 1, "bucket": BUCKET, "assets": [
            {"path": "release.tar.gz", "role": "archive", "bytes": size,
             "sha256": checksum, "object": object_key(checksum)}]}
        write_new(output / "storage-manifest.json", canonical(storage))
    except BaseException:
        shutil.rmtree(output)
        raise
    return {"release": sha(canonical(manifest)), "archive": checksum,
            "files": len(entries), "bytes": manifest["bytes"], "package": str(output)}
