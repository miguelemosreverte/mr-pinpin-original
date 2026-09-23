# White-Background Matte Prototype

2026-09-23. Local software-only experiment; zero paid API calls. Not approved
production art or certified gait. The original video remains byte-identical.

## Method

Source: `../white-walk-pixverse-v01.mp4` relative to the external matte directory.
SHA-256: `7ca187118f003e7b0d7ace3a16fa5f0bc03eead0115c4adee1f0428c92495877`.
All 25 frames, 1280x720, are processed in order at native 24 fps (25/24 seconds).
No endpoint removal/replacement, registration, temporal smoothing or retiming.

[rembg](https://github.com/danielgatis/rembg) 2.0.85 with local CPU `u2netp`
supplies the segmentation mask; its `alpha_matting_cutout` calls PyMatting
closed-form alpha estimation and foreground-color estimation. Thresholds:
foreground 240, background 10, erosion size 10. This is not a global white key.
Alpha matting already estimates decontaminated foreground colors; a separate
`-dc` pass is not stacked on it. Direct use of the primitive makes failure
explicit rather than accepting rembg's silent fallback.

Python 3.13.13 isolated environment:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-matting-tools-20260923`.
Existing VGGT/MASt3R environments were only inspected, not modified.
Resolved wheels total 112,422,991 bytes; downloaded model is 4,574,861 bytes.
No large model or paid API was used. Compute/electricity cost is not quantified.
The model URL and checksum verification come from rembg's U2netpSession:
`https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx`.
Model SHA-256:
`309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`.
Exact library versions are pinned in `requirements.txt`.

## Outputs and Limits

External directory:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/matte-v01/`.

- `rgba-frames/000.png` through `024.png`: lossless RGBA results, 20,132,373 bytes.
- `matte-dark.mp4`, `matte-green.mp4`: full-size opaque previews, 25 frames at
  24 fps, silent. These MP4s do not carry alpha; the PNG sequence does.
- `matte-comparison.mp4`: original/dark/green/magenta comparison at native timing.
- `frame-000.preview.png`, `frame-012.preview.png`, `all-25-dark-contact.png`:
  inspected static evidence, not a substitute for motion review.
- `frame-000.json`, `batch.json`, `render.json`: settings, hashes and media probes.

First and midclip previews retain cream face/body and visible paws against the
test backgrounds. All-frame contact inspection retains the body throughout.
Fine whiskers are reduced; soft/pale edges remain, particularly around the face.
Ground shadow removal and reconstruction of edge RGB are derivative changes.
This is not a pixel-preserving interior/edge guarantee or a perfect matte.

Independent per-frame masks use identical settings, not a video matting model.
Temporal alpha consistency is not certified. Consecutive whole-frame mean alpha
changes span 0.98261..3.24560 on a 0..255 scale; genuine motion contributes, so
these numbers are not isolated flicker scores. Head turn/blink are present in
the original and remain. Matting does not correct gait or endpoint closure.
The separate endpoint audit shows the original first/last frames differ.

The batch took 13.85 seconds after imports/session initialization. The first
probe's 1.583-second figure includes model setup but excludes cold imports.

## Reproduction

The three small scripts preserved alongside this report are exact copies of
the executed external scripts. Copy them into a NEW sibling matte directory
under the trial root, with the original MP4 one directory above. Do not run
the source-checkout copies directly: `__file__` determines their output paths.
Install
`requirements.txt` into Python 3.13 on the mini, then run `preview.py`,
inspect its result, followed by `batch.py` and `render.py`. Scripts deliberately
refuse overwriting reviewed outputs. FFmpeg/ffprobe are expected in
`/opt/homebrew/bin/`. Model and Numba caches stay on the shared SSD.

Previous white-video originals/receipts remain frozen. Derivative preservation
and the five-file endpoint audit are recorded in a separate source manifest
and verification receipts; no runtime, catalog or house/home changes are made.

## Preservation Complete

[New manifest](../../../../tools/assets/white-matte-preservation.json): 46 files,
26,507,111 bytes, including all 25 RGBA frames and the five endpoint-audit files.
All uploaded objects passed fresh download/hash verification, then a separate
fresh anonymous pass with `HfApi(token=False)`; source hashes remained unchanged.
The earlier ten-file white archive and all historical manifests are untouched.
Excluded duplicate frame-zero images, extra quarter previews, HTML review
copies, installed dependencies/model caches and screenshots remain outside this
manifest. The archived report snapshots retain their pre-receipt chronology.

Manifest SHA-256:
`d7acf6f8cd8fd4d2fe4ae46c83e0f160badbb362cc1a701fbeb2daf97274c7dd`.
Receipts: `/Volumes/TB4/mac-mini-storage/shared/pinpin-white-matte-archive-20260923/verified-v1/`.

- `upload-receipt.json`: `eea1c3e055b292e3c41e9753284b2c8444518873ca06b3450b8565438c4a3b9d`.
- `anonymous-receipt.json`: `4c16a93d24c28c602f79ef121160c6e3e538ab796316105344b696aad4c2fa42`.
- `complete.json`: compact success record; 46/46 verified, zero files remaining.

Seven source script/settings copies match executed external files byte-for-byte.
All three scripts parse; every RGBA frame decodes at native size with both
transparent and opaque pixels. All three MP4 previews contain 25 frames at
24 fps; endpoint PNG hashes match the independent audit. No command remains
running, no further variants or paid calls were made, and no commits were made
by this lane.
