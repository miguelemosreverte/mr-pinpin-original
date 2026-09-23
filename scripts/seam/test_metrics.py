import unittest

import numpy as np

from metrics import assess, boundary, pair


class SeamTests(unittest.TestCase):
    def test_empty_foreground_is_unknown_not_perfect(self):
        rgb = np.full((16, 16, 3), 255, np.uint8)
        result = pair(rgb, rgb, np.zeros((16, 16)), np.zeros((16, 16)))
        self.assertIsNone(result['silhouette_iou'])
        self.assertIsNone(result['native_rgb_mae_255_foreground'])

    def test_background_does_not_dilute_foreground_difference(self):
        alpha = np.zeros((32, 32), np.uint8)
        alpha[10:20, 10:20] = 255
        a = np.full((32, 32, 3), 255, np.uint8)
        b = a.copy()
        b[10:20, 10:20] = 235
        self.assertEqual(pair(a, b, alpha, alpha)['native_rgb_mae_255_foreground'], 20)

    def test_texture_can_change_without_silhouette_change(self):
        alpha = np.full((32, 32), 255, np.uint8)
        a = np.full((32, 32, 3), 150, np.uint8)
        b = a.copy()
        b[::2, ::2] = 180
        result = pair(a, b, alpha, alpha)
        self.assertEqual(result['silhouette_iou'], 1)
        self.assertEqual(result['alpha_mae_255_foreground'], 0)
        self.assertGreater(result['native_highpass_mae_255_interior'], 0)

    def test_identical_endpoints_do_not_hide_opposite_motion(self):
        alpha = np.array([100, 120, 120, 100], np.uint8)[:, None, None]
        result = boundary(alpha, 3)
        self.assertEqual(result['wrap_alpha_step_mae'], 0)
        self.assertAlmostEqual(result['incoming_to_outgoing_cosine'], -1)
        self.assertIsNone(result['incoming_to_wrap_cosine'])

    def test_candidate_is_metrics_only_and_inputs_unchanged(self):
        native = np.full((25, 16, 16, 3), 150, np.uint8)
        alpha = np.full((25, 16, 16), 255, np.uint8)
        before = alpha.copy()
        result = assess(native, alpha, 24)
        self.assertEqual([r['samples'] for r in result['wraps']], [25, 24])
        self.assertEqual(result['wraps'][1]['playback_duration_seconds'], 1)
        np.testing.assert_array_equal(alpha, before)


if __name__ == '__main__':
    unittest.main()
