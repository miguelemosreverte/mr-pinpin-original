import json
from pathlib import Path
import tempfile
import unittest

from compose_atlas import atlas_target, reviewed_version, verify_preservation, walk_manifest
from release_format import sha


class AtlasCompositionTests(unittest.TestCase):
    def test_scope_excludes_house_and_chapter_paths(self):
        for name in ("storyboard/atlas-motion.js", "storyboard/gpu/world.wgsl", "storyboard/images/atlas/walk/manifest.json"):
            self.assertTrue(atlas_target(name))
        for name in ("index.html", "storyboard/book.json", "home.js", "storyboard/reader.js", "storyboard/images/house/a.png"):
            self.assertFalse(atlas_target(name))
        with self.assertRaises(ValueError):
            atlas_target("storyboard/../index.html")

    def test_freeze_identity_is_verified(self):
        body = {"kind": "frozen-server-source", "files": []}
        checksum = sha(json.dumps(body, sort_keys=True, separators=(",", ":")).encode())
        with tempfile.TemporaryDirectory() as root:
            root = Path(root).resolve()
            (root / "versions").mkdir()
            target = root / "versions" / (checksum + ".json")
            target.write_text(json.dumps({"id": checksum, **body}))
            self.assertEqual(reviewed_version(root, checksum), {})
            target.write_text(json.dumps({"id": checksum, **body, "dirty": True}))
            with self.assertRaises(ValueError):
                reviewed_version(root, checksum)

    def test_manifest_only_changes_sheet_urls(self):
        clip = {"sheet": "/__sprite-trial/sheets/loop000.webp", "bytes": 5, "sha256": "a" * 64, "pace": {"phase": .5}}
        source = {"clips": {"loop000": clip}, "grounding": {"anchor": [1, 2]}}
        frozen = {"__sprite-trial/sheets/loop000.webp": {"bytes": 5, "sha256": "a" * 64}}
        result = json.loads(walk_manifest(json.dumps(source).encode(), frozen))
        self.assertEqual(result["clips"]["loop000"]["sheet"], "./sheets/loop000.webp")
        result["clips"]["loop000"]["sheet"] = clip["sheet"]
        self.assertEqual(result, source)
        frozen["__sprite-trial/sheets/loop000.webp"]["bytes"] = 6
        with self.assertRaises(ValueError):
            walk_manifest(json.dumps(source).encode(), frozen)

    def test_non_atlas_bytes_and_file_set_must_remain_exact(self):
        baseline = {"files": [{"path": "book.json", "bytes": 1, "sha256": "a"}, {"path": "atlas.js", "bytes": 2, "sha256": "b"}]}
        final = {"book.json": (1, "a"), "atlas.js": (3, "c"), "new.js": (1, "d")}
        self.assertEqual(verify_preservation(baseline, final, {"atlas.js", "new.js"}), 1)
        for changed in ({**final, "book.json": (1, "x")}, {**final, "surprise": (1, "e")}, {k: v for k, v in final.items() if k != "book.json"}):
            with self.assertRaises(ValueError):
                verify_preservation(baseline, changed, {"atlas.js", "new.js"})

    def test_public_manifest_omits_only_local_native_provenance(self):
        source = {"clips": {"loop000": {"sheet": "/__sprite-trial/sheets/loop000.webp", "bytes": 1,
                  "sha256": "a" * 64, "generated": {"take": "a", "native": "/Volumes/private/video.mp4"}}}}
        frozen = {"__sprite-trial/sheets/loop000.webp": {"bytes": 1, "sha256": "a" * 64}}
        result = json.loads(walk_manifest(json.dumps(source).encode(), frozen))
        self.assertEqual(result["clips"]["loop000"]["generated"], {"take": "a"})
        self.assertEqual(source["clips"]["loop000"]["generated"]["native"], "/Volumes/private/video.mp4")


if __name__ == "__main__":
    unittest.main()
