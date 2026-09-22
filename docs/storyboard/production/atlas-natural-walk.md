# Natural Walking Trial

2026-09-21. Local trial; no image regeneration or publication.

The default atlas now uses `spriteMode=natural`. Explicit `spriteMode=crisp`
and `spriteMode=legacy` retain the prior comparisons without extra UI controls.

## Motion

- Confirm a new direction for 120 ms and hold walking headings for 150 ms.
  Continuously changing candidates commit after 240 ms to avoid getting stuck.
- Accelerate and brake over roughly 200 ms; add an 11% step-synchronized speed
  pulse around the 44 map-pixel/second reference speed. Gait follows distance.
- Add up to 0.75 map pixels of body lift and a small fixed contact shadow.
  The path, ground/depth anchor, character size and occlusion stay unchanged.
- Limit moving sprite uploads to 20 Hz; settled sprites stop repainting.
  Integration has bounded work even after a long frame gap.

## Selective Blending

`scripts/build-atlas-blend-transitions.cjs` measures the existing sprite frames
offline. The metadata stores 24 undirected neighboring-pair permissions and
source hashes. Runtime builds a constant-time lookup; no image analysis runs
on the phone.

The current conservative checks allow only 120/135 degrees in both directions.
The others fail silhouette or cream-face-region alignment checks, including
the problematic 345/0 transition. Cream-region matching is a heuristic, not
semantic face recognition. Do not assume nominally neighboring angles align.

Allowed transitions briefly mix at most two views of the same frozen gait
phase. Weights sum to one. The transition window is 80 ms, sampled at the
existing bitmap-update cadence. There is no persistent directional mixture,
no distant-pose dissolve, and no walking-frame crossfade.

## Verification and Review

- Focused natural tests: acceleration, braking, exact arrival, direction timing,
  jitter, continuous curves, both approved directions, rejected transitions,
  grounding, fixed surfaces, lifecycle freezing and bounded work.
- `node scripts/verify-atlas-natural-walk.cjs`: real Chrome/WebGPU on desktop
  and mobile. Both runs reached the exact endpoint, retained the ground anchor,
  settled without continued sprite uploads and froze when paused. Measured
  cruising speed ranged from 39.20 to 48.78 map pixels/second.
- `node scripts/record-atlas-walk.cjs`: records a 12-second real-browser preview
  to `/tmp/atlas-natural-walk/natural-walk.mp4`. Requires local ffmpeg and the
  Playwright video helper. This recording is not an AI-generated animation.

[Natural atlas](../atlas-webgpu.html?spriteMode=natural)
| [Previous crisp walk](../atlas-webgpu.html?spriteMode=crisp)
| [Original blended walk](../atlas-webgpu.html?spriteMode=legacy)
