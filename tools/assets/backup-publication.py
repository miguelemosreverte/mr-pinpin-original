"""Preserve production media and Elder PNG masters without changing runtime roles."""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
from pathlib import Path
import shutil
import sys
import threading
import time

import hf_store as store

BUCKET = "miguelemosreverte/mr-pinpin-archive"
EXPORT = "docs/storyboard/images/published/elder-cycle/export-manifest.json"


def read_json(filename):
    return json.loads(Path(filename).read_text(encoding="utf-8"))


def write_json(filename, data):
    store.write_receipt(filename, data)


def copy_once(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        if store.file_identity(source) != store.file_identity(destination):
            raise store.StorageError("Existing staging file differs; refusing overwrite")
        return
    with source.open("rb") as incoming, destination.open("xb") as outgoing:
        shutil.copyfileobj(incoming, outgoing, 1024 * 1024)


def plan(root, masters_root):
    root, masters_root = Path(root).resolve(), Path(masters_root).resolve()
    manifest = read_json(root / "assets/manifest.json")
    if manifest.get("version") != 1 or manifest.get("bucket") != BUCKET:
        raise store.StorageError("Unexpected runtime manifest version or bucket")
    production = [dict(e, role="archive") for e in store.validate_entries(manifest["assets"])
                  if e["role"] == "production"]
    if not production:
        raise store.StorageError("Production selection is empty")
    entries = {e["path"]: e for e in production}
    original_paths = set(entries)
    exported = read_json(root / EXPORT)
    records, sources = [], {}
    for record in exported["assets"]:
        source = store.relative_path(record["source"])
        if source.suffix.lower() != ".png" or source.parts[0] != "images":
            raise store.StorageError("Export source must be an images/ PNG master")
        logical = f"docs/storyboard/{source}"
        filename = store.safe_path(masters_root, logical)
        if not filename.is_file():
            raise store.StorageError("Export PNG master is missing")
        target = store.relative_path(record["target"])
        if len(target.parts) != 1:
            raise store.StorageError("Export target must be a basename")
        web = entries.get(f"docs/storyboard/images/published/elder-cycle/{target}")
        if not web or (web["sha256"], web["bytes"]) != (record["webSHA256"], record["bytes"]):
            raise store.StorageError("Export web identity differs from production manifest")
        entry = {"path": logical, "role": "archive", "bytes": filename.stat().st_size,
                 "sha256": record["sourceSHA256"],
                 "object": store.content_key(record["sourceSHA256"], source.name)}
        if logical in entries and entries[logical] != entry:
            raise store.StorageError("Conflicting identity for a preservation path")
        entries[logical] = entry
        sources[logical] = filename
        records.append({**record, "preservationPath": logical, "object": entry["object"],
                        "sourceBytes": entry["bytes"]})
    assets = store.validate_entries(sorted(entries.values(), key=lambda e: e["path"]))
    if not records:
        raise store.StorageError("Export selection is empty")
    objects = {e["object"]: e for e in assets}
    totals = {"production_paths": len(production), "production_bytes": sum(e["bytes"] for e in production),
              "export_records": len(records), "master_paths": len(sources),
              "master_bytes": sum(entries[p]["bytes"] for p in sources),
              "preservation_paths": len(assets), "logical_bytes": sum(e["bytes"] for e in assets),
              "unique_objects": len(objects), "unique_object_bytes": sum(e["bytes"] for e in objects.values())}
    provenance = {"version": 1, "bucket": BUCKET, "totals": totals,
                  "productionPaths": sorted(original_paths), "exportRecords": records,
                  "runtimeManifestSHA256": store.file_identity(root / "assets/manifest.json")[1],
                  "exportManifestSHA256": store.file_identity(root / EXPORT)[1]}
    return {"version": 1, "bucket": BUCKET, "assets": assets}, provenance, sources


def prepare(args):
    root, job = Path(args.root).resolve(), Path(args.job).resolve()
    if job.is_relative_to(root):
        raise store.StorageError("Backup job must be outside the checkout")
    if (job / "preservation-manifest.json").exists():
        raise store.StorageError("Job already prepared; use a new job directory")
    manifest, provenance, sources = plan(root, args.masters_root)
    job.mkdir(parents=True, exist_ok=True)
    write_json(job / "progress.json", {"phase": "staging-masters", **provenance["totals"]})
    for logical, source in sources.items():
        destination = store.safe_path(job / "root", logical, create=True)
        copy_once(source, destination)
    # Freeze small inputs and the executable adapter alongside the selected bytes.
    for source, name in [(root / "assets/manifest.json", "runtime-manifest.json"),
                         (root / EXPORT, "export-manifest.json"),
                         (Path(__file__), "backup-publication.py"),
                         (Path(store.__file__), "hf_store.py")]:
        copy_once(source, job / name)
    provenance["transferRoot"] = str(Path(args.transfer_root))
    write_json(job / "provenance.json", provenance)
    write_json(job / "preservation-manifest.json", manifest)
    production_paths = set(provenance["productionPaths"])
    production = {**manifest, "assets": [e for e in manifest["assets"] if e["path"] in production_paths]}
    masters = {**manifest, "assets": [e for e in manifest["assets"] if e["path"] in sources]}
    write_json(job / "production-preservation.json", production)
    write_json(job / "master-preservation.json", masters)
    write_json(root / "tools/assets/production-preservation.json", production)
    write_json(root / "tools/assets/backup-publication-masters.json", masters)
    write_json(job / "progress.json", {"phase": "prepared", **provenance["totals"]})
    print(json.dumps(provenance["totals"], sort_keys=True))


class PrefetchedAPI:
    """Batch initial identities; keep the adapter's post-download lookup fresh."""

    def __init__(self, api, bucket, entries, reader=None):
        self.api, self.bucket = api, bucket
        self.reader = reader or api
        paths = [e["object"] for e in entries]
        self.metadata = {e.path: e for e in api.get_bucket_paths_info(bucket, paths)}
        if set(self.metadata) - set(paths):
            raise store.StorageError("Unexpected preflight metadata path")
        self.once = set(paths)
        self.lock = threading.Lock()

    def get_bucket_paths_info(self, bucket, paths):
        if bucket != self.bucket:
            raise store.StorageError("Backup bucket changed")
        result = []
        for path in paths:
            with self.lock:
                cached = path in self.once
                self.once.discard(path)
                info = self.metadata.get(path)
            if not cached:
                records = list(self.api.get_bucket_paths_info(bucket, [path]))
                if len(records) > 1 or (records and records[0].path != path):
                    raise store.StorageError("Invalid refreshed metadata")
                info = records[0] if records else None
                with self.lock:
                    if info is not None:
                        self.metadata[path] = info
            if info is not None:
                result.append(info)
        return result

    def batch_bucket_files(self, bucket, *, add):
        self.api.batch_bucket_files(bucket, add=add)
        paths = [key for _, key in add]
        fresh = {e.path: e for e in self.api.get_bucket_paths_info(bucket, paths)}
        if set(fresh) != set(paths):
            raise store.StorageError("Upload metadata is incomplete")
        with self.lock:
            self.metadata.update(fresh)
            self.once.update(paths)

    def download_bucket_files(self, bucket, files, *, raise_on_missing_files):
        # BucketFile inputs skip the SDK's redundant paths-info request. Xet still
        # downloads into the adapter's fresh temporary file, then SHA-256 is checked.
        with self.lock:
            resolved = [(self.metadata[key], target) for key, target in files]
        self.reader.download_bucket_files(bucket, resolved, raise_on_missing_files=raise_on_missing_files)


def run(args):
    os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
    logging.disable(logging.CRITICAL)
    job = Path(args.job).resolve()
    if (job / "publication-backup-receipt.json").exists():
        raise store.StorageError("Successful receipt already exists; refusing overwrite")
    manifest = read_json(job / "preservation-manifest.json")
    if manifest.get("version") != 1 or manifest.get("bucket") != BUCKET:
        raise store.StorageError("Unexpected preservation manifest")
    entries = store.validate_entries(manifest["assets"])
    if any(e["role"] != "archive" for e in entries):
        raise store.StorageError("Preservation manifest must contain archive copies only")
    provenance = read_json(job / "provenance.json")
    root = job / "root"
    transfer = Path(provenance["transferRoot"])

    def progress(message):
        write_json(job / "progress.json", {"phase": "running", "message": message,
                   "updatedAt": time.time(), **provenance["totals"]})

    progress("Copying and hash-checking staged production assets and PNG masters")
    for entry in entries:
        destination = store.safe_path(root, entry["path"], create=True)
        if entry["path"] in provenance["productionPaths"]:
            source = store.safe_path(transfer, entry["path"])
            store.check_file(source, entry["bytes"], entry["sha256"])
            store._copy_verified(source, destination, entry)
        store.check_file(destination, entry["bytes"], entry["sha256"])
    # A single fresh download proves each immutable object, including path aliases.
    unique = list({entry["object"]: entry for entry in entries}.values())
    progress("All source SHA-256 identities verified; inspecting remote objects")
    from huggingface_hub import HfApi
    api = PrefetchedAPI(store._client(None), BUCKET, unique, reader=HfApi(token=False))
    receipt = store.upload_entries(unique, root, BUCKET, job / "cache", api=api,
                                   workers=args.workers, progress=progress)
    if receipt.get("verified") is not True or any(e.get("remote_verified") is not True for e in receipt["entries"]):
        raise store.StorageError("Adapter did not return full remote proof")
    write_json(job / "object-receipt.json", receipt)
    by_object = {e["object"]: e for e in receipt["entries"]}
    expanded = []
    for entry in entries:
        proof = by_object[entry["object"]]
        if any(proof[k] != entry[k] for k in ("bytes", "sha256", "object")):
            raise store.StorageError("Alias identity differs from verified object")
        store.check_file(store.safe_path(root, entry["path"]), entry["bytes"], entry["sha256"])
        expanded.append({**proof, **entry})
    final = {**receipt, "entries": expanded, "purpose": "publication-preservation",
             "anonymousFreshDownloads": True,
             "completedAt": time.time(), "totals": provenance["totals"],
             "exportRecords": provenance["exportRecords"],
             "runtimeManifestSHA256": provenance["runtimeManifestSHA256"],
             "exportManifestSHA256": provenance["exportManifestSHA256"]}
    write_json(job / "publication-backup-receipt.json", final)
    write_json(job / "progress.json", {"phase": "complete", "verified": True,
               "receipt": str(job / "publication-backup-receipt.json"), **provenance["totals"]})
    print(json.dumps({"verified": True, **provenance["totals"]}, sort_keys=True))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    prep = sub.add_parser("prepare")
    prep.add_argument("--root", required=True)
    prep.add_argument("--masters-root", required=True)
    prep.add_argument("--transfer-root", required=True)
    prep.add_argument("--job", required=True)
    execute = sub.add_parser("run")
    execute.add_argument("--job", required=True)
    execute.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    try:
        (prepare if args.action == "prepare" else run)(args)
    except Exception as exc:
        # Remote exceptions may contain auth URLs or response bodies: never log them.
        status = getattr(getattr(exc, "response", None), "status_code", None)
        result = {"phase": "failed", "error_type": type(exc).__name__, "http_status": status}
        job = Path(args.job)
        if job.is_dir():
            write_json(job / "failure.json", result)
        print(json.dumps(result), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
