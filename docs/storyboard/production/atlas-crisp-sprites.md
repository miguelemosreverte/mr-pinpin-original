# Crisp Sprite Trial

The default walk has since advanced to the [natural walking trial](atlas-natural-walk.md).
This crisp version remains available explicitly with `spriteMode=crisp`.

2026-09-21. Local trial, not published. The atlas now selects one opaque walking
frame from 24 nominal 15-degree heading bins. A two-degree switching margin
prevents jitter at direction boundaries. Walking frames advance every 190 ms.
The original twelve headings and all original images remain unchanged.

## Artwork and Prompts

Generated with the built-in image_gen tool. Each active PNG has a lossless WebP
runtime copy, a Markdown prompt/timing record, and a prepare.json measurement
record beside it:

- [15/45/75/105 degrees, A v2](../images/atlas/pinpin-directions-intermediate-a-v2.md)
- [135/165/195/225 degrees, B v1](../images/atlas/pinpin-directions-intermediate-b-v1.md)
- [255/285/315/345 degrees, C v1](../images/atlas/pinpin-directions-intermediate-c-v1.md)

A v1 was rejected for a clipped outer nose; the v2 edit repairs that margin.
These are artistic azimuth approximations, not measured turntable rotations.
Some neighboring rear views remain similar. One fixed scale per sheet matches
the existing character, with measured crop-local foot anchors. DisplayWidth
remains 56; the sprite surface remains 128 by 128.

## Review

- [Current atlas](../atlas-webgpu.html?spriteMode=crisp)
- [Original blended comparison](../atlas-webgpu.html?spriteMode=legacy)
- [All directions](../review/atlas-directions.html)

No extra production buttons were added. Legacy comparison loads only the three
original sheets. Crisp mode loads six, adding 3.47 MiB of compressed transfer
and approximately 18 MiB of decoded RGBA storage. It draws one sprite crop
instead of up to four crossfaded crops; straight walking also reduces bitmap
repaints. This trades extra asset memory for a cleaner silhouette.

## Verification

The asset audit passes all six sheets, 24 headings and 96 distinct frames:
alpha, clear gutters, exact crop/anchor records, checksums and fixed sheet scale.
Route checks retain feet clearance and use the actual crisp hysteresis candidates.

`node scripts/verify-atlas-crisp-sprites.cjs` compares 32 actual WebGPU walking
samples across desktop/mobile, east/west, crisp/legacy and four gait phases.
Every crisp sprite equals one independent source-crop render pixel for pixel.
No sprite request failures, page errors or renderer errors occurred. The matched
diagnostic screenshots disable bokeh only for inspection; production bokeh and
foreground foliage occlusion remain unchanged.

The script writes a flat comparison page and screenshots under
`/tmp/atlas-crisp-sprites/`. The direction review page also passed desktop/mobile
checks with 24 nonblank views, 96 frames and no horizontal overflow.
