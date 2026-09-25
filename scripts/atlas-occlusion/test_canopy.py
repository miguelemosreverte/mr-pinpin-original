import unittest

import numpy as np

from compile_canopy import apply_canopy, canopy_gate


class CanopyTests(unittest.TestCase):
    def test_threshold_and_colored_source_rejected(self):
        rgb = np.repeat(np.array([[0, 127, 128, 255]], dtype=np.uint8)[:, :, None], 3, axis=2)
        gate, _ = canopy_gate(rgb)
        self.assertEqual(gate.tolist(), [[False, False, True, True]])
        with self.assertRaises(ValueError):
            canopy_gate(np.array([[[255, 0, 0]]], dtype=np.uint8))

    def test_id0_canopy_without_blanket_id0_gate(self):
        base = np.zeros((2, 3, 4), dtype=np.uint8)
        base[:, :, 3] = 255
        gate = np.zeros((2, 3), dtype=bool)
        gate[0, 1] = True
        result, _, stats = apply_canopy(base, gate, [1, 2])
        self.assertEqual(result[0, 1].tolist(), [0, 255, 1, 255])
        self.assertEqual(result[1, 1].tolist(), [0, 0, 0, 255])
        self.assertTrue(np.array_equal(result[:, :, 0], base[:, :, 0]))
        self.assertEqual(stats["previouslyOpenCanopyPixels"], 1)

    def test_hard_objects_vetoed_other_pixels_byte_identical(self):
        base = np.zeros((1, 4, 4), dtype=np.uint8)
        base[0, :, 0] = [1, 2, 174, 55]
        base[0, :, 1] = [255, 255, 255, 128]
        base[:, :, 3] = 255
        gate = np.array([[True, True, True, False]])
        result, effective, stats = apply_canopy(base, gate, [1, 2])
        self.assertEqual(effective.tolist(), [[False, False, True, False]])
        self.assertTrue(np.array_equal(base[~effective], result[~effective]))
        self.assertEqual(result[0, 2].tolist(), [174, 255, 1, 255])
        self.assertEqual(stats["protectedVetoPixels"], 2)

    def test_no_gate_is_identity(self):
        base = np.zeros((5, 5, 4), dtype=np.uint8)
        base[:, :, 3] = 255
        base[1:4, 1:4, :2] = [174, 255]
        result, _, _ = apply_canopy(base, np.zeros((5, 5), dtype=bool), [1, 2])
        self.assertTrue(np.array_equal(base, result))

    def test_reviewed_low_bushes_remain_profiles(self):
        base = np.array([[[79, 255, 0, 255], [81, 255, 0, 255], [0, 0, 0, 255]]], dtype=np.uint8)
        result, _, stats = apply_canopy(base, np.ones((1, 3), dtype=bool), [1, 2, 79, 81])
        np.testing.assert_array_equal(result[:, :2], base[:, :2])
        self.assertEqual(result[0, 2].tolist(), [0, 255, 1, 255])
        self.assertEqual(stats["protectedVetoPixels"], 2)

    def test_reject_dimensions_alpha_prior_mode_and_unprotected_policy(self):
        base = np.zeros((2, 2, 4), dtype=np.uint8)
        base[:, :, 3] = 255
        with self.assertRaises(ValueError):
            apply_canopy(base, np.zeros((3, 3), dtype=bool), [1, 2])
        with self.assertRaises(ValueError):
            apply_canopy(base, np.zeros((2, 2), dtype=bool), [])
        base[0, 0, 2] = 1
        with self.assertRaises(ValueError):
            apply_canopy(base, np.zeros((2, 2), dtype=bool), [1, 2])
        base[0, 0, 2] = 0
        base[0, 0, 3] = 0
        with self.assertRaises(ValueError):
            apply_canopy(base, np.zeros((2, 2), dtype=bool), [1, 2])


if __name__ == "__main__":
    unittest.main()
