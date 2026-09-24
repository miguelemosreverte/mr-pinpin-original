# Image-led panorama projection

Run from the repository root with Python 3 and NumPy. No Blender scene or render is used. On the mini, the existing NumPy-equipped interpreter is `/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/Resources/4.5/python/bin/python3.11`; using that interpreter does not invoke Blender. Use TB4 for outputs.

```sh
python3 tools/panoramas/project.py assemble --config path/to/stack.json --output /external/panorama.png --width 3072
python3 tools/panoramas/project.py extract --input /external/panorama.png --output /external/rear.png --yaw 180 --pitch 0 --fov 110 --size 1400
python3 tools/panoramas/project.py export --config path/to/stack.json --output /external/elder --width 3072 --face-size 1024
```

`extract` also accepts `--config` instead of `--input`, sampling the assembled stack directly. `export` likewise accepts a full 2:1 `--input` if no live repairs remain. Exactly one input mechanism is required. Camera angles are degrees. These operations only resample supplied pixels; they do not move a camera in recovered geometry or repair painted seams.

A stack job contains `inputs` with `base` and optional `front`, `rear`, `up`, `down`, `detail` records. Each record has `file` relative to the job, `sha256`, and optional repository-relative `sourcePath` fallback. Run from repository root to resolve that fallback. Restore media before use. PNG is preferred; WebP decoding uses `/opt/homebrew/bin/ffmpeg`. A record's exact hash is checked before reading.

```json
{
  "schemaVersion": 1,
  "id": "example",
  "inputs": {
    "base": {"file": "panorama-v1.png", "sha256": "ACTUAL_SHA256"},
    "down": {"file": "down-v1.png", "sha256": "ACTUAL_SHA256"}
  },
  "repairs": {
    "fovDegrees": 110,
    "frontMask": [0, 0, 2, 2],
    "assets": {"down": "down"}
  }
}
```

Repair keys name the enabled cardinal textures. The normalized repair blend matches the existing panorama renderer: full weight through normalized edge .70, smooth fade to zero at .96. Optional `repairs.downMaskX` and `details` preserve the existing directional mask and registered detail contracts; see the frozen house-variants configuration for actual examples. Do not invent masks when exporting a selected runtime stack.

World coordinates are +X right, +Y front, +Z up. Panorama front is `(u=.5,v=.5)`; right is `u=.75`; rear wraps at `u=0/1`; top is `v=0`. The internal shader frame is `[world X, world Z, world Y]`.

`export` writes:

- `panorama-assembled-v1.png`: final stack in one 2:1 image.
- `faces-v1/{front,right,back,left,up,down}.png`: six 90° square faces.
- `cube-atlas-v1.png`: 3×2 `[front,right,back; left,up,down]`.
- `exports-v1.json`: input/output hashes, dimensions, helper hashes, explicit face bases and validation.

The cube is sampled from the assembled panorama, never independently generated faces. Validation checks all twelve shared angular edges at identical rays and verifies each atlas tile equals its face PNG. This proves the projection convention, not visual seamlessness. Adjacent texel centers represent different directions; no edge pixels are painted or copied. Original image-model masters remain unchanged.

A lossless WebP may be made separately for the viewer; record its hash and verify decoded RGB against the PNG. Never discard the original, replace a selected old stack, or claim art approval merely because this script passes.
