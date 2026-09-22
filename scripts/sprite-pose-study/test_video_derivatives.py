import unittest
from video_derivatives import sample_indices


class VideoSampleTests(unittest.TestCase):
    def test_includes_native_endpoints_without_duplicates(self):
        for count in [24, 144, 180, 360]:
            for samples in [6, 12]:
                values = sample_indices(count, samples)
                self.assertEqual(len(set(values)), samples)
                self.assertEqual(values[0], 0)
                self.assertEqual(values[-1], count-1)
                self.assertEqual(values, sorted(values))

    def test_short_clip_is_not_padded_with_repeated_samples(self):
        with self.assertRaises(ValueError):
            sample_indices(4, 6)


if __name__ == "__main__":
    unittest.main()
