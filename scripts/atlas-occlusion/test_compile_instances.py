import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

from compile_instances import (bake, check_registration, classify, discover_palette,
                               front_profile, read_rgb, split_instances, textures)


class CompilerTests(unittest.TestCase):
    def test_palette_exact_and_rejection(self):
        rgb = np.array([[[0, 0, 0], [255, 0, 0], [250, 2, 1]]], dtype=np.uint8)
        labels, stats = classify(rgb, [[0, 0, 0], [255, 0, 0]])
        self.assertEqual(labels.tolist(), [[0, 1, 1]])
        self.assertEqual(stats["unknownPixels"], 0)
        with self.assertRaises(ValueError):
            classify(np.full((3, 3, 3), 128, dtype=np.uint8), [[0, 0, 0], [255, 0, 0]])
        with self.assertRaises(ValueError):
            classify(rgb, [[0, 0, 0], [0, 0, 0]])

    def test_components_and_holes_logged(self):
        labels = np.zeros((12, 12), dtype=np.uint8)
        labels[1:6, 1:6] = 1
        labels[3, 3] = 0
        labels[10, 10] = 1
        ids, items, stats = split_instances(labels, [{"name": "house", "split": True}], 3, True)
        self.assertEqual(len(items), 1)
        self.assertEqual(stats, {"removedSmallComponentPixels": 1, "filledEnclosedPixels": 1,
                                 "reassignedPaletteFragmentPixels": 0})
        self.assertEqual(ids[3, 3], 1)
        self.assertEqual(ids[10, 10], 0)

    def test_no_hole_fill_across_other_instance(self):
        labels = np.ones((8, 8), dtype=np.uint8)
        labels[2:6, 2:6] = 2
        ids, _, _ = split_instances(labels, [{"name": "one"}, {"name": "two"}], 1, True)
        self.assertEqual(ids[3, 3], 2)

    def test_tree_overhang_inherits_root_not_leaf_bottom(self):
        ids = np.zeros((20, 16), dtype=np.uint8)
        ids[1:6, 2:14] = 1
        ids[5:18, 7:9] = 1
        item = {"id": 1, "name": "tree", "contact": "root-bottom"}
        profile = front_profile(ids, item, 20)
        self.assertTrue(np.all(profile == 17.5))

    def test_robust_root_ignores_single_low_outlier(self):
        ids = np.zeros((30, 30), dtype=np.uint8)
        ids[:20, :20] = 1
        ids[29, 15] = 1
        profile = front_profile(ids, {"id": 1, "name": "tree", "contact": "root-bottom",
                                      "rootQuantile": 0.995}, 30)
        self.assertTrue(np.all(profile == 19.5))

    def test_fragments_reassign_only_existing_connected_support(self):
        labels = np.zeros((12, 16), dtype=np.uint8)
        labels[2:8, 2:8] = 1
        labels[4, 8] = 2
        labels[4, 10] = 2
        ids, _, stats = split_instances(labels, [{"name": "main"}, {"name": "tiny", "required": False}],
                                         min_pixels=3, fragment_radius=4)
        self.assertEqual(ids[4, 8], 1)
        self.assertEqual(ids[4, 10], 0)
        self.assertEqual(stats["reassignedPaletteFragmentPixels"], 1)
        self.assertTrue(np.all(ids[labels == 0] == 0))

    def test_external_interpolation_endpoint_extension_and_roundtrip(self):
        ids = np.zeros((24, 16), dtype=np.uint8)
        ids[2:8, 3:12] = 1
        item = {"id": 1, "name": "tractor", "front": [[3.5, 20.125], [10.5, 13.125]]}
        mask, lut = textures(ids, [item])
        decoded = (lut[1, :, 0].astype(int) * 256 + lut[1, :, 1]) / 16
        self.assertEqual(decoded[0], 20.125)
        self.assertEqual(decoded[-1], 13.125)
        self.assertEqual(decoded[7], 16.125)
        self.assertTrue(np.all(mask[:, :, 3] == 255))
        self.assertTrue(np.all(lut[:, :, 3] == 255))
        self.assertTrue(np.all(lut[0, :, 2] == 0))
        self.assertTrue(np.all(lut[1, :, 2] == 255))
        self.assertEqual(mask[0, 0].tolist(), [0, 0, 0, 255])
        self.assertEqual(mask[3, 4].tolist(), [1, 255, 0, 255])

    def test_missing_contact_not_silently_inferred(self):
        with self.assertRaises(ValueError):
            textures(np.ones((8, 8), dtype=np.uint8), [{"id": 1, "name": "tree"}])
        with self.assertRaises(ValueError):
            front_profile(np.ones((8, 8)), {"id": 1, "name": "tree", "front": [[0, float("nan")]]}, 8)

    def test_footprint_gap_interpolation(self):
        ids = np.ones((20, 20), dtype=np.uint8)
        footprints = np.zeros_like(ids)
        footprints[18, 4] = 1
        footprints[14, 12] = 1
        profile = front_profile(ids, {"id": 1, "name": "tractor", "contact": "footprint-bottom"}, 20, footprints)
        self.assertEqual(profile[8], 16.5)
        self.assertEqual(profile[0], 18.5)

    def test_registration_probes_and_drift(self):
        ids = np.array([[0, 1], [1, 1]], dtype=np.uint8)
        instances = [{"name": "tree", "id": 1, "pixels": 3, "bbox": [0, 0, 2, 2]}]
        check_registration(ids, instances, {"probes": [{"pixel": [1, 1], "instance": "tree"}]})
        with self.assertRaises(ValueError):
            check_registration(ids, instances, {"instances": {"tree": {"bbox": [8, 0, 10, 2]}}})
        with self.assertRaises(ValueError):
            check_registration(ids, instances, {"probes": [{"pixel": [0, 0], "instance": "tree"}]})

    def test_dimension_and_transparency_rejection(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.png"
            Image.new("RGBA", (4, 3), (255, 0, 0, 0)).save(path)
            with self.assertRaises(ValueError):
                read_rgb(path, [4, 3])
            with self.assertRaises(ValueError):
                read_rgb(path, [8, 6])

    def test_full_bake_provenance_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = np.zeros((1024, 1536, 3), dtype=np.uint8)
            source[200:400, 200:400, 0] = 255
            Image.fromarray(source).save(root / "input.png")
            config = {"instances": [{"name": "house", "color": [255, 0, 0], "contact": "silhouette-bottom"}]}
            (root / "config.json").write_text(json.dumps(config))
            args = [root / "input.png", root / "input.png", root / "config.json", root / "out", "test-v1", root / "diag"]
            result = bake(*args)
            self.assertFalse(result["registration"]["visualApproved"])
            self.assertEqual(len(result["inputs"]["mask"]["sha256"]), 64)
            with self.assertRaises(ValueError):
                bake(*args)


if __name__ == "__main__":
    unittest.main()
