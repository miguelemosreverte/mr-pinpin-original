"""Authored proportions in working units; output uses meters."""

SEED = 210926
PARAMS = {
    "body_center": (0.0, 0.32, 1.00),
    "body_radii": (0.83, 1.28, 0.77),
    "head_center": (0.0, -0.86, 1.24),
    "head_radii": (0.60, 0.63, 0.56),
    "leg_x": 0.54,
    "front_leg_x": 0.45,
    "rear_leg_x": 0.61,
    "front_y": -0.65,
    "rear_y": 1.01,
    "voxel_size": 0.023,
    "eye_x": 0.255,
    "eye_y": -1.408,
    "eye_z": 1.435,
    "eye_width": 0.105,
    "eye_height": 0.119,
    "iris_radius": 0.106,
    "pupil_radius": 0.077,
    "ear_width": 0.144,
    "ear_height": 0.158,
    "ear_x": 0.515,
    "ear_y": -0.86,
    "ear_z": 1.675,
    "quill_count": 3900,
    "fur_count": 11000,
    "nose_to_rump_m": 0.25,
    "nose_front_y": -1.988,
    "rump_y": 1.60,
}
SCALE = PARAMS["nose_to_rump_m"] / (PARAMS["rump_y"] - PARAMS["nose_front_y"])
