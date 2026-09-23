import unittest

import numpy as np
from scipy import ndimage as ndi

from detector import detect, repair
from review import reviewed_candidates
from run import parse_args


def scene():
    native = np.full((7, 64, 64, 3), 248, dtype=np.uint8)
    rgba = np.zeros((7, 64, 64, 4), dtype=np.uint8)
    native[:, 10:58, 10:54] = (180, 130, 85)
    rgba[:, :, :, :3] = native
    rgba[:, 10:58, 10:54, 3] = 255
    return native, rgba


def gap():
    native, rgba = scene()
    native[3:, 48:54, 28:36] = 248
    rgba[3:, 48:54, 28:36, :3] = 248
    rgba[4:, 48:54, 28:36, 3] = 0
    rgba[3, 48:54, 28:36, 3] = 240
    return native, rgba


class DetectorTests(unittest.TestCase):
    def test_cli_defaults_to_detection_only(self):
        args = parse_args(['--native', 'native.mp4', '--frames', 'frames', '--out', 'new'])
        self.assertEqual(args.apply_reviewed, [])
        self.assertIsNone(args.review_record)

    def test_enclosed_moving_white_paw_flagged_but_not_modified_without_review(self):
        native, rgba = scene()
        native[:, 48:54, 28:36] = 248
        rgba[:, 48:54, 28:36] = (248, 248, 248, 0)
        rgba[3, 48:54, 28:36, 3] = 255
        for frame in (0, 1, 2, 4, 5, 6):
            native[frame, 48:54, 16:24] = 248
            rgba[frame, 48:54, 16:24] = (248, 248, 248, 255)
        records, candidates = detect(native, rgba)
        self.assertIn(3, [r['frame'] for r, _ in candidates])
        self.assertTrue(all(r['confidence'] == 'repair-candidate' for r, _ in candidates))
        selected = reviewed_candidates(candidates, [], None, 'native-hash', ['frame-hash'])
        result, repairs = repair(native, rgba, selected)
        self.assertEqual(repairs, [])
        np.testing.assert_array_equal(result, rgba)

    def test_review_requires_matching_native_and_all_rgba_hashes(self):
        native, rgba = gap()
        _, candidates = detect(native, rgba)
        ids = [candidates[0][0]['id']]
        record = {'selected_ids': ids, 'reviewed_by': ['test reviewer'],
                  'reviewer_rationale': 'Synthetic fixture only', 'native_sha256': 'n',
                  'input_frame_sha256': ['a', 'b']}
        with self.assertRaises(ValueError):
            reviewed_candidates(candidates, ids, None, 'n', ['a', 'b'])
        with self.assertRaises(ValueError):
            reviewed_candidates(candidates, ids, record, 'other-native', ['a', 'b'])
        with self.assertRaises(ValueError):
            reviewed_candidates(candidates, ids, record, 'n', ['a', 'changed'])
        self.assertEqual(len(reviewed_candidates(candidates, ids, record, 'n', ['a', 'b'])), 1)

    def test_disoccluded_white_gap_with_previous_real_paw(self):
        native, rgba = gap()
        records, strong = detect(native, rgba)
        self.assertEqual([r['frame'] for r, _ in strong], [3])
        self.assertEqual(strong[0][0]['supports'], [4, 5, 6])
        self.assertEqual(strong[0][0]['local_opaque_neutral_pixels'], 48)
        self.assertEqual(strong[0][0]['neighbors'][0]['local_opaque_neutral_pixels'], 0)
        self.assertFalse(strong[0][0]['confidence_is_probability'])

    def test_persistent_interior_eye_catchlight(self):
        native, rgba = scene()
        native[:, 20:24, 20:24] = 250
        rgba[:, 20:24, 20:24, :3] = 250
        records, strong = detect(native, rgba)
        self.assertTrue(records)
        self.assertFalse(strong)

    def test_legitimate_cream_fur(self):
        native, rgba = scene()
        native[:, 46:53, 22:33] = (252, 245, 228)
        rgba[:, 46:53, 22:33, :3] = (252, 245, 228)
        records, strong = detect(native, rgba)
        self.assertTrue(records)
        self.assertFalse(strong)

    def test_shifting_white_paw_safeguard(self):
        native, rgba = scene()
        for frame in range(7):
            x = 14 + (frame % 3)*12
            native[frame, 58:63, x:x+8] = 248
            rgba[frame, 58:63, x:x+8] = (248, 248, 248, 255)
        records, strong = detect(native, rgba)
        self.assertTrue(records)
        self.assertTrue(any(r['supports'] for r in records))
        self.assertFalse(strong)

    def test_ambiguous_one_neighbor_remains_review_only(self):
        native, rgba = gap()
        rgba[5:, 48:54, 28:36, 3] = 255
        records, strong = detect(native, rgba)
        self.assertFalse(strong)

    def test_repair_locality_and_input_immutability(self):
        native, rgba = gap()
        snapshot = rgba.copy()
        _, strong = detect(native, rgba)
        result, repairs = repair(native, rgba, strong)
        np.testing.assert_array_equal(rgba, snapshot)
        self.assertTrue(repairs[0]['outside_allowed_unchanged'])
        self.assertTrue(repairs[0]['alpha_never_increased'])
        self.assertLess(result[3, 50, 31, 3], 32)
        allowed = ndi.binary_dilation(strong[0][1], iterations=5)
        np.testing.assert_array_equal(result[3][~allowed], rgba[3][~allowed])
        np.testing.assert_array_equal(result[[0, 1, 2, 4, 5, 6]], rgba[[0, 1, 2, 4, 5, 6]])

    def test_overlapping_repairs_do_not_raise_accumulated_alpha(self):
        native, rgba = gap()
        _, strong = detect(native, rgba)
        once, _ = repair(native, rgba, strong)
        twice, repairs = repair(native, rgba, strong + strong)
        self.assertTrue(np.all(twice[:, :, :, 3] <= once[:, :, :, 3]))
        self.assertTrue(all(r['outside_allowed_unchanged'] for r in repairs))
        allowed = ndi.binary_dilation(strong[0][1], iterations=5)
        np.testing.assert_array_equal(twice[3][~allowed], rgba[3][~allowed])


if __name__ == '__main__':
    unittest.main()
