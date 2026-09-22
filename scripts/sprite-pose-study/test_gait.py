import math
import unittest
from gait import DUTY, LINK, OFFSETS, SOLE, sample

PARAMS = {"front_leg_x": .45, "rear_leg_x": .61, "front_y": -.65, "rear_y": 1.01}


class GaitTests(unittest.TestCase):
    def test_sampling_motion_and_loop(self):
        for count in [4, 8, 16, 30]:
            poses = [sample(k / count, PARAMS) for k in range(count)]
            self.assertLess(poses[-1]["t"], 1)
            for name in OFFSETS:
                feet = [p["limbs"][name]["foot"] for p in poses]
                self.assertGreater(len(set(feet)), 2)
                self.assertTrue(any(p["limbs"][name]["contact"] for p in poses))
                self.assertTrue(any(not p["limbs"][name]["contact"] for p in poses))
                self.assertEqual(sample(0, PARAMS)["limbs"][name]["foot"],
                                 sample(1, PARAMS)["limbs"][name]["foot"])

    def test_link_lengths_and_ground(self):
        for k in range(301):
            for limb in sample(k / 300, PARAMS)["limbs"].values():
                for a, b in [("hip", "knee"), ("knee", "foot")]:
                    self.assertAlmostEqual(math.dist(limb[a], limb[b]), LINK)
                self.assertGreaterEqual(limb["foot"][2], SOLE - 1e-9)
                if limb["contact"]:
                    self.assertAlmostEqual(limb["foot"][2], SOLE)

    def test_stance_anchor_no_slip(self):
        for name, offset in OFFSETS.items():
            t = (0.2 - offset) % 1
            a = sample(t, PARAMS)["limbs"][name]
            b = sample(t + .05, PARAMS)["limbs"][name]
            self.assertTrue(a["contact"] and b["contact"])
            self.assertLess(math.dist(a["ground_anchor_world"], b["ground_anchor_world"]), 1e-9)


if __name__ == "__main__":
    unittest.main()
