"""Run with python -m unittest discover -s scripts/atlas-field -p test_ground_sdf.py.

Set GROUND_SDF_ASSETS to the baked output directory for real-mask checks.
Set GROUND_SDF_VERSION to select a version (default 2).
"""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

SPEC = importlib.util.spec_from_file_location('ground_sdf', Path(__file__).with_name('build-ground-sdf.py'))
baker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(baker)


class NumericalTests(unittest.TestCase):
    def test_axis_boundary_and_signs(self):
        mask = np.zeros((9, 12), dtype=bool)
        mask[:, 5:] = True
        distance = baker.signed_distance(mask)
        np.testing.assert_allclose(distance, np.tile(np.arange(12) - 4.5, (9, 1)))
        np.testing.assert_array_equal(distance > 0, mask)

    def test_euclidean_diagonal_and_complement(self):
        mask = np.ones((15, 15), dtype=bool)
        mask[7, 7] = False
        distance = baker.signed_distance(mask)
        self.assertEqual(distance[10, 11], 4.5)
        self.assertAlmostEqual(distance[9, 9], np.sqrt(8) - 0.5)
        self.assertEqual(distance[7, 7], -0.5)
        np.testing.assert_allclose(baker.signed_distance(~mask), -distance)

    def test_against_brute_force_nearest_centers(self):
        mask = np.random.default_rng(9124).random((17, 23)) > 0.35
        distance = baker.signed_distance(mask)
        for y, x in np.ndindex(mask.shape):
            opposite = np.argwhere(mask != mask[y, x])
            nearest = np.sqrt(((opposite - [y, x]) ** 2).sum(axis=1).min()) - 0.5
            self.assertAlmostEqual(distance[y, x], nearest if mask[y, x] else -nearest)

    def test_rgb_roundtrip_and_alpha(self):
        values = np.linspace(-2048, 2047.9375, 10000).reshape(100, 100)
        rgb = baker.encode(values)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'test.png'
            Image.fromarray(rgb).save(path)
            with Image.open(path) as image:
                self.assertEqual(image.mode, 'RGB')
                rgba = np.array(image.convert('RGBA'))
            self.assertTrue(np.all(rgba[..., 3] == 255))
            self.assertTrue(np.all(rgba[..., 2] == 0))
            self.assertLessEqual(np.abs(baker.decode(rgba) - values).max(), 1 / 32)
            np.testing.assert_array_equal(rgba[..., :3], rgb)

    def test_invalid_input_and_overflow_rejected(self):
        for mask in [np.zeros((2, 2)), np.ones((2, 2)), np.zeros(3)]:
            with self.assertRaises(ValueError):
                baker.signed_distance(mask)
        for value in [-2049, 2048, np.nan]:
            with self.assertRaises(ValueError):
                baker.encode(np.array([[value]]))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'gray.png'
            Image.new('RGB', (4, 4), (128, 128, 128)).save(path)
            with self.assertRaises(ValueError):
                baker.read_mask(path)


@unittest.skipUnless(os.environ.get('GROUND_SDF_ASSETS'), 'Set GROUND_SDF_ASSETS for real asset tests')
class AssetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(os.environ['GROUND_SDF_ASSETS'])
        version = int(os.environ.get('GROUND_SDF_VERSION', '2'))
        cls.meta = json.loads((cls.root / f'shire-ground-sdf-v{version}.json').read_text())
        cls.walk = baker.read_mask(cls.root / cls.meta['mask']['src'])
        with Image.open(cls.root / cls.meta['sdf']['src']) as image:
            cls.rgba = np.array(image.convert('RGBA'))
        cls.distance = baker.decode(cls.rgba)

    def test_dimensions_hashes_signs_alpha_and_distances(self):
        self.assertEqual(self.walk.shape, (1024, 1536))
        for key in ['mask', 'sdf']:
            self.assertEqual(baker.sha256(self.root / self.meta[key]['src']), self.meta[key]['sha256'])
        source_mask = self.meta.get('source_mask', 'walk3.png')
        if self.meta['mask'].get('threshold') is None:
            self.assertEqual(self.meta['mask']['sha256'], self.meta['source'][source_mask]['sha256'])
        else:
            raw = Path(self.meta['source_archive_directory']) / source_mask
            self.assertEqual(baker.sha256(raw), self.meta['source'][source_mask]['sha256'])
            np.testing.assert_array_equal(
                self.walk, baker.read_mask(raw, self.meta['mask']['threshold']))
        self.assertTrue(np.all(self.rgba[..., 3] == 255))
        self.assertTrue(np.all(self.rgba[..., 2] == 0))
        np.testing.assert_array_equal(self.distance > 0, self.walk)
        self.assertLessEqual(np.abs(baker.signed_distance(self.walk) - self.distance).max(), 1 / 32)

    def test_real_obstacles_and_open_ground(self):
        for name in ['lake', 'stream', 'house', 'elder_trunk', 'tractor', 'trailer']:
            x, y = baker.PROBES[name]
            self.assertLess(self.distance[y, x], 0, name)
        for name in ['forest_floor', 'tractor_front', 'tractor_behind', 'bridge_deck']:
            x, y = baker.PROBES[name]
            self.assertGreater(self.distance[y, x], 3, name)

    def test_real_passages_at_runtime_clearance(self):
        for name, (bounds, start, end) in baker.PASSAGES.items():
            if name == 'bridge':
                continue
            with self.subTest(passage=name):
                self.assertTrue(baker.connected(self.distance, bounds, start, end, 3), name)

    def test_bridge_at_runtime_clearance(self):
        bounds, start, end = baker.PASSAGES['bridge']
        for x, y in [start, end]:
            self.assertGreater(self.distance[y, x], 3, 'Outside approach must itself be clear')
        self.assertTrue(baker.connected(self.distance, bounds, start, end, 0))
        self.assertTrue(baker.connected(self.distance, bounds, start, end, 3),
                        'Candidate has a narrow bridge entrance; source correction required')

    def test_visible_lake_water_under_canopy_blocked(self):
        for x, y in [(445, 320), (460, 300)]:
            self.assertLess(self.distance[y, x], 0,
                            'Candidate exposes visible lake water as walkable')


if __name__ == '__main__':
    unittest.main()
