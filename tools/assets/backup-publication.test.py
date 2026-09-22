"""Small offline fixtures for the publication-only preservation wrapper."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))
spec = importlib.util.spec_from_file_location("backup", Path(__file__).with_name("backup-publication.py"))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class API:
    def __init__(self, objects=None):
        self.objects = objects if objects is not None else {}
        self.uploads, self.downloads, self.lookups = [], [], []
        self.corrupt = self.change_generation = False

    def get_bucket_paths_info(self, bucket, paths):
        self.lookups.append(list(paths))
        return [SimpleNamespace(type="file", path=p, size=len(self.objects[p]),
                                xet_hash=hashlib.sha256(self.objects[p]).hexdigest())
                for p in paths if p in self.objects]

    def batch_bucket_files(self, bucket, *, add):
        for source, key in add:
            self.objects[key] = Path(source).read_bytes()
            self.uploads.append(key)

    def download_bucket_files(self, bucket, files, *, raise_on_missing_files):
        assert raise_on_missing_files
        for metadata, target in files:
            key = metadata.path
            self.downloads.append(key)
            data = self.objects[key]
            Path(target).write_bytes(b"X" * len(data) if self.corrupt else data)
            if self.change_generation:
                self.objects[key] = b"Y" * len(data)


class BackupTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.base = Path(temp.name)
        self.root, self.worktree, self.transfer, self.job = [self.base / name for name in ("repo", "masters", "transfer", "job")]
        self.master = "docs/storyboard/images/source/master.png"
        self.master_data = b"original PNG master"
        self.write(self.worktree / self.master, self.master_data)
        assets = []
        for name, data in [("docs/legacy.bin", b"legacy"), ("docs/alias/legacy.bin", b"legacy"),
                           ("docs/storyboard/images/published/elder-cycle/a.webp", b"web-a"),
                           ("docs/storyboard/images/published/elder-cycle/b.webp", b"web-b")]:
            self.write(self.transfer / name, data)
            digest = hashlib.sha256(data).hexdigest()
            assets.append({"path": name, "bytes": len(data), "sha256": digest, "role": "production",
                           "object": backup.store.content_key(digest, Path(name).name)})
        self.manifest = {"version": 1, "bucket": backup.BUCKET, "assets": assets}
        self.write(self.root / "assets/manifest.json", json.dumps(self.manifest).encode())
        records = [{"source": "images/source/master.png", "sourceSHA256": hashlib.sha256(self.master_data).hexdigest(),
                    "target": Path(e["path"]).name, "webSHA256": e["sha256"], "bytes": e["bytes"]} for e in assets[2:]]
        self.write(self.root / backup.EXPORT, json.dumps({"assets": records}).encode())
        self.before = (self.root / "assets/manifest.json").read_bytes()
        self.args = SimpleNamespace(root=str(self.root), masters_root=str(self.worktree),
                                    transfer_root=str(self.transfer), job=str(self.job), workers=2)
        self.api = API()
        self.reader = API(self.api.objects)

    def write(self, filename, data):
        filename.parent.mkdir(parents=True, exist_ok=True)
        filename.write_bytes(data)

    def prepare(self):
        with contextlib.redirect_stdout(io.StringIO()):
            backup.prepare(self.args)

    def execute(self):
        with patch.object(backup.store, "_client", side_effect=lambda api: self.api if api is None else api), \
                patch("huggingface_hub.HfApi", return_value=self.reader) as factory, \
                contextlib.redirect_stdout(io.StringIO()):
            backup.run(self.args)
            factory.assert_called_once_with(token=False)

    def test_full_backup_anonymous_roundtrip_and_alias_proofs_keep_runtime_manifest(self):
        self.prepare()
        self.execute()
        receipt = backup.read_json(self.job / "publication-backup-receipt.json")
        self.assertTrue(receipt["verified"])
        self.assertTrue(receipt["anonymousFreshDownloads"])
        self.assertEqual(len(receipt["entries"]), 5)
        self.assertEqual(len(receipt["exportRecords"]), 2)
        self.assertEqual(len(self.api.uploads), 4)
        self.assertEqual(len(self.reader.downloads), 4)
        self.assertEqual(self.api.downloads, [])
        self.assertEqual(len(self.api.lookups), 6)  # Two batched reads, four fresh post-download reads.
        self.assertTrue(all(e["remote_verified"] for e in receipt["entries"]))
        production = backup.read_json(self.root / "tools/assets/production-preservation.json")
        self.assertEqual(production["assets"], sorted([dict(e, role="archive") for e in self.manifest["assets"]], key=lambda e: e["path"]))
        self.assertEqual((self.root / "assets/manifest.json").read_bytes(), self.before)
        self.assertEqual((self.worktree / self.master).read_bytes(), self.master_data)

    def test_wrong_master_sha_stops_before_remote_writes(self):
        self.prepare()
        (self.job / "root" / self.master).write_bytes(b"wrong")
        with self.assertRaises(backup.store.StorageError):
            self.execute()
        self.assertEqual(self.api.uploads, [])
        self.assertFalse((self.job / "publication-backup-receipt.json").exists())

    def test_corrupt_anonymous_download_cannot_publish_success(self):
        self.prepare()
        self.reader.corrupt = True
        with self.assertRaises(backup.store.StorageError):
            self.execute()
        self.assertFalse((self.job / "publication-backup-receipt.json").exists())

    def test_remote_generation_change_still_fails_with_prefetched_metadata(self):
        self.prepare()
        self.reader.change_generation = True
        with self.assertRaises(backup.store.StorageError):
            self.execute()
        self.assertFalse((self.job / "publication-backup-receipt.json").exists())


if __name__ == "__main__":
    unittest.main()
