# Locked-camera motion trials

September 21, 2026. Miguel authorized Seedance 1.0 Pro Fast, Wan 3.0 and a fresh
LTX-2.3 Fast attempt with explicit stationary-camera instructions. Previous
clips remain unchanged. No upscaling or production-atlas integration is included.

## Shared prompt

> The camera stays in exactly the same place for the entire shot. Locked overhead
> view, identical framing from first to last frame: no pan, tilt, zoom, rotation
> or reframing. Wind moves fine surface texture and reflected sunlight across
> the lake. Leaves flutter gently, and the existing stream flows continuously.
> Buildings, paths, bridge and shoreline stay fixed. Steady daylight.

This prompt describes no falling object, splash, or event in the lake's center.
All use the approved `images/atlas/shire-v1.png` as their first frame, with no
end-frame constraint. Imperfect looping is accepted for this motion review.
Seedance's supported `camera_fixed` flag is enabled in addition to the prompt.
Wan prompt expansion is disabled to retain the written instruction. Current
Wan and LTX schemas do not expose a dedicated camera-lock field.

## Requests

| Model | Settings | Estimated USD | Request ID |
| --- | --- | --- | --- |
| Seedance 1.0 Pro Fast | 5s, 1080p, auto aspect, camera_fixed | 0.243 | `01a0c20c-9da1-7b41-8368-f635efefeaa9` |
| Wan 3.0 | 5s, 720p, adaptive aspect, audio off, expansion off | 0.50 | `01a0c20c-a203-7193-ad12-874c8c2e7b72` |
| LTX-2.3 Fast | 6s, 1080p, 24fps, auto aspect, audio off | 0.36 | `01a0c20c-a68c-7b32-be0a-c749e059a11e` |

Estimated combined cost: $1.103, not an invoice. Each config records its pricing
source. Seedance uses token billing, so actual dimensions and frame count affect
the final estimate. No automatic paid retries are enabled.

- [Seedance config](atlas-video-seedance1-fast-locked-v1.json)
- [Wan config](atlas-video-wan3-locked-v1.json)
- [LTX config](atlas-video-ltx23-fast-locked-v1.json)
- [Browser comparison](../review/atlas-locked-camera.html)

The generator records exact inputs, original source SHA-256, request ID, UTC
events and output metadata in JSON and Markdown beside each video. Output stems:
`shire-seedance1-fast-locked-v1`, `shire-wan3-locked-v1`, and
`shire-ltx23-fast-locked-v1`, all in `../videos/`.

## Review criteria

Check meaningful water/reflection/leaf movement, invented objects and central
disturbances, camera drift, geometry changes, exposure, source composition and
loop boundary. A camera-lock instruction or parameter is not proof of a locked
output. No automatic approval based on pixel differences. Compare the LTX retry
with the previous LTX clip; a different random sample means prompt changes alone
cannot be credited for every difference.

Approval remains pending visual review. Original files are preserved without
stabilization, interpolation, cropping, or other postprocessing.

## Collected results

| Candidate | Measured output | Bytes | Submission to collection |
| --- | --- | --- | --- |
| Seedance | 1664 x 1248, 121 frames at 24 fps, 5.041667s, no audio | 26,350,877 | 83.918s |
| Wan | 1174 x 782, 150 frames at 30 fps, 5s, no audio | 24,885,394 | 137.982s |
| LTX | 1920 x 1080, 145 frames at 24 fps, 6.041667s, no audio | 47,385,069 | 84.966s |

Times include queue, polling and download, not just inference. All are H.264.
Seedance's delivered frame count and dimensions imply $0.245388 at $1 per million
video tokens. Combined with the requested Wan and LTX rates, the revised estimate
is $1.105388, approximately $1.11. Billing is not reconciled.

Visual inspection of one-frame-per-second contact sheets:

- Seedance still adds concentric rings near the dock despite no mention of
  ripples or anything landing in the water. Removing that word did not prevent
  the artifact. Its auto aspect produces 4:3 rather than the source's 3:2.
- LTX still shifts the camera substantially over the shot despite explicit
  stationary instructions, and produces 16:9 rather than the source's 3:2.
- Wan preserves approximately 3:2 framing. Sampled frames do not show the
  pronounced concentric rings or LTX's large framing shift. It is the most
  promising candidate from these sampled frames, not an approved result.

Sampled stills cannot establish overall motion quality or prove absence of
brief artifacts. The browser preview presents the unmodified clips for Miguel's
full-playback review. No further paid jobs or upscaling were submitted.
