import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

from compile_instances import bake, digest, front_profile
from override_profiles import amend


class SupportProfileTests(unittest.TestCase):
    def test_generic_support_mode_ignores_body_gaps(self):
        ids = np.zeros((32, 32), dtype=np.uint8)
        ids[4:10, 4:28] = 1
        ids[10:24, 8] = 1
        ids[10:20, 24] = 1
        item = {"id": 1, "name": "fixture", "contact": "support-line",
                "front": [[8.5, 23.5], [24.5, 19.5]]}
        profile = front_profile(ids, item, 32)
        self.assertEqual(profile[16], 21.5)
        self.assertEqual(profile[0], 23.5)
        self.assertEqual(profile[-1], 19.5)
        self.assertLessEqual(np.abs(np.diff(profile)).max(), 0.25)

    def test_authored_rear_region_not_just_saved_mark(self):
        spec = json.loads(Path(__file__).with_name("support-v2.json").read_text())
        item = {"id": 2, "name": "tractor", **spec["instances"]["tractor"]}
        profile = front_profile(np.zeros((1024, 1536), dtype=np.uint8), item, 1024)
        profile = np.rint(profile * 16) / 16
        for x in range(1438, 1465):
            for y in range(754, 765):
                self.assertLess(y, profile[x])
            for y in range(788, 793):
                self.assertGreaterEqual(y, profile[x])
        self.assertGreaterEqual(min(profile[1438:1465]) - 764, 10.5)
        self.assertLessEqual(np.max(np.abs(np.diff(profile[1438:1465]))), 0.125)

    def test_amend_preserves_mask_and_every_unselected_row(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rgb = np.zeros((1024, 1536, 3), dtype=np.uint8)
            rgb[10:30, 10:30, 0] = 255
            rgb[40:60, 40:60, 1] = 255
            Image.fromarray(rgb).save(root / "source.png")
            config = {"instances": [
                {"name": "first", "color": [255, 0, 0], "contact": "root-bottom"},
                {"name": "second", "color": [0, 255, 0], "contact": "root-bottom"}]}
            (root / "base.json").write_text(json.dumps(config))
            base = bake(root / "source.png", root / "source.png", root / "base.json", root / "out", "fixture", root / "diag")
            frozen = {name: digest(item["path"]) for name, item in base["outputs"].items()}
            override = {"version": "v2", "method": "test support", "instances": {
                "second": {"contact": "support-line", "front": [[40.5, 55.5], [59.5, 54.5]]}}}
            (root / "override.json").write_text(json.dumps(override))
            metadata, _, _, lut = amend(root / "out/fixture.json", root / "override.json")
            with Image.open(base["outputs"]["ground"]["path"]) as image:
                original = np.asarray(image)
            other_rows = np.arange(256) != 2
            self.assertTrue(np.array_equal(original[other_rows], lut[other_rows]))
            self.assertFalse(np.array_equal(original[2], lut[2]))
            self.assertEqual(metadata["outputs"]["instances"], base["outputs"]["instances"])
            self.assertEqual(frozen, {name: digest(item["path"]) for name, item in base["outputs"].items()})
            override["instances"]["second"]["id"] = 5
            (root / "override.json").write_text(json.dumps(override))
            with self.assertRaises(ValueError):
                amend(root / "out/fixture.json", root / "override.json")


if __name__ == "__main__":
    unittest.main()
