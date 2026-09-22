"""Deterministic control kinematics, not a physically simulated animal."""
import math

DUTY = 0.6
STRIDE = 0.44
LIFT = 0.20
SOLE = 0.09
LINK = 0.38
OFFSETS = {"front_L": 0.0, "front_R": 0.5, "rear_L": 0.75, "rear_R": 0.25}


def sample(t, params):
    root_y = -STRIDE / DUTY * t
    limbs = {}
    for name, offset in OFFSETS.items():
        front = name.startswith("front")
        x = params["front_leg_x" if front else "rear_leg_x"]
        x *= 1 if name.endswith("L") else -1
        y = params["front_y" if front else "rear_y"]
        phase = (t + offset) % 1.0
        contact = phase < DUTY
        if contact:
            travel = -STRIDE / 2 + STRIDE * phase / DUTY
            height = 0.0
            stage = "contact"
        else:
            swing = (phase - DUTY) / (1 - DUTY)
            travel = STRIDE / 2 * math.cos(math.pi * swing)
            height = LIFT * math.sin(math.pi * swing) ** 2
            stage = "lift" if swing < 0.5 else "return"
        hip = (x, y, 0.64)
        foot = (x, y + travel, SOLE + height)
        dy, dz = foot[1] - hip[1], foot[2] - hip[2]
        distance = math.hypot(dy, dz)
        bend = math.sqrt(LINK * LINK - distance * distance / 4)
        knee = (x, (hip[1] + foot[1]) / 2 + dz / distance * bend,
                (hip[2] + foot[2]) / 2 - dy / distance * bend)
        anchor = (x, foot[1] + root_y, 0.0) if contact else None
        limbs[name] = {"phase": phase, "state": stage, "contact": contact,
                       "hip": hip, "knee": knee, "foot": foot,
                       "ground_anchor_world": anchor}
    return {"t": t, "root_motion_world": (0.0, root_y, 0.0), "limbs": limbs}
