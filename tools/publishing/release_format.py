"""Shared, dependency-free immutable release format and filesystem checks."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath, PureWindowsPath
import re
import stat

BUCKET = "miguelemosreverte/mr-pinpin-archive"
MAX_BYTES = 950_000_000
MAX_ARCHIVE_BYTES = 960_000_000
MAX_FILES = 100_000
MAX_MANIFEST_BYTES = 32_000_000


def require(condition, message):
    if not condition:
        raise ValueError(message)


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(value):
    require(isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value), "Invalid SHA-256")
    return value


def relative(value):
    require(isinstance(value, str) and 0 < len(value) <= 1024, "Invalid relative path")
    parts = value.split("/")
    require(not PureWindowsPath(value).drive and "\\" not in value and len(parts) <= 32
            and all(p not in ("", ".", "..") for p in parts)
            and all(ord(c) >= 32 and ord(c) != 127 for c in value)
            and all(p.casefold() != ".git" for p in parts), "Unsafe relative path")
    return value


def clean_path(value):
    path = Path(value).expanduser().absolute()
    for parent in [*reversed(path.parents), path]:
        require(not parent.is_symlink(), f"Symlink path component: {parent}")
    return path


def new_directory(value):
    path = clean_path(value)
    require(path.parent.is_dir(), "Output parent must already exist")
    path.mkdir()  # Exclusive creation; never replace an existing output.
    return path


def regular_open(path):
    fd = os.open(clean_path(path), os.O_RDONLY | os.O_NOFOLLOW)
    stream = os.fdopen(fd, "rb")
    info = os.fstat(fd)
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
        stream.close()
        raise ValueError("Expected a regular file without hardlinks")
    return stream


def identity(path):
    result, size = hashlib.sha256(), 0
    with regular_open(path) as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
            size += len(chunk)
    return size, result.hexdigest()


def read_json(path):
    with regular_open(path) as stream:
        data = stream.read(MAX_MANIFEST_BYTES + 1)
    require(len(data) <= MAX_MANIFEST_BYTES, "Manifest too large")
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, "Duplicate JSON key")
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=unique), data


def object_key(archive_sha):
    return f"sha256/{digest(archive_sha)[:2]}/{archive_sha}/release.tar.gz"


def archive_url(archive_sha):
    return f"https://huggingface.co/buckets/{BUCKET}/resolve/{object_key(archive_sha)}"


def validate(manifest):
    require(isinstance(manifest, dict) and manifest.get("version") == 1, "Invalid release version")
    require(isinstance(manifest.get("source_commit"), str) and
            re.fullmatch(r"[a-f0-9]{40}|[a-f0-9]{64}", manifest["source_commit"]), "Expected full source commit")
    require(manifest.get("bucket") == BUCKET, "Unexpected bucket")
    archive = manifest.get("archive", {})
    digest(archive.get("sha256"))
    require(type(archive.get("bytes")) is int and 0 < archive["bytes"] <= MAX_ARCHIVE_BYTES,
            "Invalid archive size")
    require(archive.get("object") == object_key(archive["sha256"]) and
            archive.get("url") == archive_url(archive["sha256"]), "Unexpected archive address")
    files = manifest.get("files")
    require(isinstance(files, list) and 0 < len(files) <= MAX_FILES, "Invalid file count")
    seen, total, ordered = set(), 0, []
    for entry in files:
        require(isinstance(entry, dict), "Invalid file entry")
        name = relative(entry.get("path"))
        require(name.casefold() not in seen, "Duplicate or case-colliding path")
        seen.add(name.casefold())
        ordered.append(name)
        require(type(entry.get("bytes")) is int and entry["bytes"] >= 0, "Invalid file size")
        total += entry["bytes"]
        digest(entry.get("sha256"))
    require(ordered == sorted(ordered), "Files must be sorted")
    require("index.html" in ordered, "Artifact needs index.html")
    for name in seen:
        require(not any(str(p) in seen for p in PurePosixPath(name).parents), "File/directory collision")
    require(type(manifest.get("bytes")) is int and manifest["bytes"] == total and total < MAX_BYTES,
            "Invalid total or Pages size budget exceeded")
    return manifest


def load_release(path, expected=None):
    manifest, raw = read_json(path)
    validate(manifest)
    require(raw == canonical(manifest), "Release manifest must be canonical JSON")
    if expected is not None:
        require(sha(raw) == digest(expected), "Release manifest SHA-256 mismatch")
    return manifest, sha(raw)


def write_new(path, data):
    path = clean_path(path)
    with path.open("xb") as stream:
        stream.write(data)
