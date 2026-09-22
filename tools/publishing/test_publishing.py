import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

from release_format import (MAX_BYTES, archive_url, canonical, identity, load_release,
                            object_key, sha, validate)
from package_release import package
from pages_template import select, stage, template
from materialize import download, materialize, selected_release
from publish import upload


class PublishingTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.art = self.root / "artifact"
        self.art.mkdir()
        (self.art / "index.html").write_bytes(b'<a href="storyboard/book.html">Book</a>')
        (self.art / "storyboard").mkdir()
        (self.art / "storyboard" / "book.html").write_bytes(b"chapter\x00bytes")
        (self.art / ".nojekyll").write_bytes(b"")
        self.pack = self.root / "package"
        self.result = package(self.art, "a" * 40, self.pack)
        self.repo = self.root / "pages"
        template(self.pack, self.repo)

    def test_deterministic_and_template_offline_roundtrip(self):
        other = self.root / "again"
        os.utime(self.art / "index.html", (12345, 12345))
        self.assertEqual(package(self.art, "a" * 40, other)["release"], self.result["release"])
        self.assertEqual((other / "release.tar.gz").read_bytes(), (self.pack / "release.tar.gz").read_bytes())
        output = self.root / "site"
        subprocess.run([sys.executable, str(self.repo / "scripts/materialize.py"), "--repo", str(self.repo),
                        "--out", str(output), "--archive", str(self.pack / "release.tar.gz")], check=True, capture_output=True)
        expected = {p.relative_to(self.art).as_posix(): p.read_bytes() for p in self.art.rglob("*") if p.is_file()}
        actual = {p.relative_to(output).as_posix(): p.read_bytes() for p in output.rglob("*") if p.is_file()}
        self.assertEqual(actual, expected)
        self.assertFalse(list(self.repo.rglob("*.tar.gz")))

    def test_refuses_existing_outputs_and_package_links(self):
        with self.assertRaises(FileExistsError):
            package(self.art, "a" * 40, self.pack)
        with self.assertRaises(ValueError):
            materialize(self.repo, self.art, self.pack / "release.tar.gz")
        (self.art / "link").symlink_to("index.html")
        with self.assertRaises(ValueError):
            package(self.art, "a" * 40, self.root / "bad")
        (self.art / "link").unlink()
        os.link(self.art / "index.html", self.art / "hardlink")
        with self.assertRaises(ValueError):
            package(self.art, "a" * 40, self.root / "bad")

    def test_stage_and_explicit_rollback(self):
        (self.art / "index.html").write_text("second")
        second = self.root / "second"
        new = package(self.art, "b" * 40, second)["release"]
        self.assertEqual(stage(second, self.repo), new)
        self.assertEqual(stage(second, self.repo), new)
        select(self.repo, new, self.result["release"])
        with self.assertRaises(ValueError):
            select(self.repo, self.result["release"], self.result["release"])
        select(self.repo, self.result["release"], new)
        self.assertEqual(selected_release(self.repo)[1], self.result["release"])
        record = self.repo / "releases" / (new + ".json")
        record.write_bytes(b"{}\n")
        with self.assertRaises(ValueError):
            stage(second, self.repo)

    def test_manifest_and_archive_tampering(self):
        archive = self.pack / "release.tar.gz"
        archive.write_bytes(archive.read_bytes() + b"corrupt")
        with self.assertRaises(ValueError):
            materialize(self.repo, self.root / "bad", archive)
        self.assertFalse((self.root / "bad").exists())
        record = self.repo / "releases" / (self.result["release"] + ".json")
        manifest = json.loads(record.read_bytes())
        manifest["source_commit"] = "c" * 40
        record.write_bytes(canonical(manifest))
        with self.assertRaises(ValueError):
            selected_release(self.repo)

    def malicious(self, members):
        packed = self.root / "malicious.tar.gz"
        with tarfile.open(packed, "w:gz", format=tarfile.USTAR_FORMAT) as archive:
            for member, data in members:
                archive.addfile(member, io.BytesIO(data))
        manifest, _ = load_release(self.pack / "release-manifest.json")
        size, checksum = identity(packed)
        manifest["archive"] = {"bytes": size, "sha256": checksum, "object": object_key(checksum), "url": archive_url(checksum)}
        release = sha(canonical(manifest))
        (self.repo / "releases" / (release + ".json")).write_bytes(canonical(manifest))
        (self.repo / "release.json").write_bytes(canonical({"version": 1, "release": release}))
        return packed

    def test_rejects_tar_traversal_links_special_and_unlisted_files(self):
        for name, kind in [("../escape", tarfile.REGTYPE), ("/escape", tarfile.REGTYPE),
                           ("C:/escape", tarfile.REGTYPE), ("index.html", tarfile.SYMTYPE),
                           ("index.html", tarfile.LNKTYPE), ("index.html", tarfile.FIFOTYPE),
                           ("unlisted.txt", tarfile.REGTYPE)]:
            with self.subTest(name=name, kind=kind):
                member = tarfile.TarInfo(name)
                member.type = kind
                if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                    member.linkname = "../../escape"
                packed = self.malicious([(member, b"")])
                with self.assertRaises(ValueError):
                    materialize(self.repo, self.root / "bad", packed)
                self.assertFalse((self.root / "bad").exists())

    def test_missing_duplicate_and_wrong_file_hash(self):
        info = tarfile.TarInfo(".nojekyll")
        for members in [[], [(info, b""), (info, b"")]]:
            with self.assertRaises(ValueError):
                materialize(self.repo, self.root / "bad", self.malicious(members))
        wrong = tarfile.TarInfo("index.html")
        wrong.size = (self.art / "index.html").stat().st_size
        with self.assertRaises(ValueError):
            materialize(self.repo, self.root / "bad", self.malicious([(wrong, b"x" * wrong.size)]))

    def test_manifest_budget_paths_and_duplicates(self):
        original, _ = load_release(self.pack / "release-manifest.json")
        for mutate in [lambda m: m.update(bytes=MAX_BYTES),
                       lambda m: m["files"].append(m["files"][0]),
                       lambda m: m["files"][0].update(path="../escape"),
                       lambda m: m["archive"].update(url="https://example.com/other")]:
            manifest = json.loads(canonical(original))
            mutate(manifest)
            with self.assertRaises(ValueError):
                validate(manifest)

    def test_anonymous_download_stream_and_limit(self):
        manifest, _ = load_release(self.pack / "release-manifest.json")
        data = (self.pack / "release.tar.gz").read_bytes()
        class Response(io.BytesIO):
            def geturl(self):
                return "https://cdn.example.test/blob"
        def request(req, timeout):
            self.assertNotIn("Authorization", req.headers)
            return Response(data)
        with patch("materialize.urlopen", side_effect=request):
            output = io.BytesIO()
            download(manifest, output)
            self.assertEqual(output.getvalue(), data)
        with patch("materialize.urlopen", return_value=Response(data + b"x")):
            with self.assertRaises(ValueError):
                download(manifest)

    def test_upload_requires_remote_and_anonymous_verification(self):
        class Adapter:
            def upload_entries(inner, entries, root, bucket, cache, workers):
                self.assertEqual(entries[0]["role"], "archive")
                return {"verified": True, "dry_run": False, "entries": [{"remote_verified": True}]}
        receipt = self.root / "receipt.json"
        with patch("publish.download", side_effect=ValueError("not public")):
            with self.assertRaises(ValueError):
                upload(self.pack, self.root / "cache", receipt, Adapter())
        self.assertFalse(receipt.exists())
        with patch("publish.download") as anonymous:
            upload(self.pack, self.root / "cache", receipt, Adapter())
            anonymous.assert_called_once()
        self.assertTrue(json.loads(receipt.read_bytes())["anonymous_verified"])

    def test_expanded_tar_budget_and_member_size(self):
        member = tarfile.TarInfo("index.html")
        member.size = 1
        with self.assertRaises(ValueError):
            materialize(self.repo, self.root / "bad", self.malicious([(member, b"x")]))
        packed = self.malicious([])
        packed.write_bytes(gzip.compress(b"\0" * 100_000, mtime=0))
        manifest, _ = load_release(self.pack / "release-manifest.json")
        size, checksum = identity(packed)
        manifest["archive"] = {"bytes": size, "sha256": checksum, "object": object_key(checksum), "url": archive_url(checksum)}
        release = sha(canonical(manifest))
        (self.repo / "releases" / (release + ".json")).write_bytes(canonical(manifest))
        (self.repo / "release.json").write_bytes(canonical({"version": 1, "release": release}))
        with self.assertRaisesRegex(ValueError, "Expanded tar"):
            materialize(self.repo, self.root / "bad", packed)
        self.assertFalse((self.root / "bad").exists())

    def test_output_parent_symlinks_and_manifest_case_collision(self):
        alias = self.root / "alias"
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            materialize(self.repo, alias / "bad", self.pack / "release.tar.gz")
        manifest, _ = load_release(self.pack / "release-manifest.json")
        entry = dict(manifest["files"][1])
        entry["path"] = entry["path"].upper()
        manifest["files"].append(entry)
        with self.assertRaises(ValueError):
            validate(manifest)


if __name__ == "__main__":
    unittest.main()
