# Green Software Key Review

2026-09-23. Complete bounded experiment. The user changed the proposed purple
background to green; the coordination root and source directory retain their
historical purple names. No purple variant, new AI matting model, paid call,
runtime edit, or commit by this lane.

Root: `/Volumes/TB4/mac-mini-storage/shared/atlas-purple-key-20260923/`.

## Handoff

Preferred experimental transparent candidate: `green-key-despill-v01/rgba-frames/000.png`
through `024.png`, all native 1280x720 RGBA. Its `dark.mp4` and `green.mp4` are
25-frame/24fps opaque previews, 1.041667s, not an endpoint-trimmed loop. Raw
software baseline and matching previews remain in `green-key-baseline-v01/`.
No source RGBA or native video was overwritten.

Useful evidence under `key-evidence-v01/`:

- `nose-frame000.png`: enlarged native, baseline/dark, despill/dark, unchanged alpha.
- `nose-all25.png`: all 25 native/baseline/despill muzzle crops, row-major.
- `native-all25.png`, `baseline-dark-all25.png`, `despill-dark-all25.png`: whole-clip contacts.
- `evidence.json`: input/output hashes and exact preview commands.

The despilled candidate visibly reduces conspicuous green whiskers/fringe while
keeping the full central muzzle, dark nose, and eye whites in the inspected
sequence. A thin **yellow-green fringe remains**, especially along underside
quills and whiskers; some gray edge tint/noise also remains. Main independently
confirmed this on RGBA frame000. No obvious large internal hole was seen in the all-frame contact
review; this does not certify every fine edge. It is a useful experiment, not a
perfect cutout or automatic production acceptance.

## Exact Processing And Checks

The RGB still is 1672x941, SHA256
`7bc8c69f083516af9a0e685c8678a1c250eeefe47ba219722e068e77b80573cf`.
Its 16px border median is (4,248,4), range R1..20/G239..251/B1..16, not exact
flat #00FF00. The still baseline used
`format=rgba,colorkey=0x04f804:similarity=0.08:blend=0.12`; `green-still-key-v01/`
contains `keyed.png` and `compare.png`. All measured border pixels cleared,
RGB was unchanged, and 3,688 pixels received partial alpha.

Native video has a different measured border median, **(0,209,0)**. One fixed
key across all 25 frames used
`format=rgba,colorkey=0x00d100:similarity=0.08:blend=0.12` directly on its RGB
decode. No rembg alpha was loaded. `green-key-baseline-v01/key.json` records
parameters, source hash, per-frame checks, timestamps, and output hashes.
Every frame's measured border cleared completely. All sampled warm-cream-color
pixels remained alpha 255. Baseline RGB exactly matches the FFmpeg RGBA decode;
an initial RGB24 comparison was corrected for decoder rounding differences,
without changing the generated baseline PNGs.

The separate candidate uses the proven FFmpeg filter
`despill=type=green:mix=1:expand=0:green=-1:alpha=0`. All 25 alpha planes are
bit-identical to the baseline; no erosion, dilation, painting, or reconstruction.
It changed 237,699 visible RGB pixel occurrences across 25 frames to suppress
green spill. **Zero measured opaque warm-color pixels changed**, maximum channel
change zero in that class. This class is R>=G>=B, alpha>=240, not an anatomical
segmentation. The chosen filter also preserved synthetic neutral white, cream,
brown/nose samples and arbitrary alpha values in regression tests. No broad
parameter search or extra image generation was performed.

Four tests passed with actual FFmpeg: preserved pale/warm colors, transparent
sampled green/border variation, monotonic partial alpha on a synthetic edge
color ramp without RGB painting, and despill alpha/color preservation. All four
preview MP4s independently probed at 1280x720, 25 frames, 24fps, 1.041667s.

## White Nose Finding, Kept Separate

`nose-audit-v01/white000-nose-native-matte.png` compares original white-video
frame000 with its existing matte and alpha. The dark nose core ROI
`[963,381,987,404)` has final alpha 246..255, mean 254.904, no pixel below 32;
the raw u2netp mask there is 251..255. This selected core was not erased.

`nose-audit-v01/white000-nose-all25.png` extends the native/matte inspection to
all frames. The central nose/muzzle remains visible in these crops; fine whiskers
and pale contour detail are attenuated, and their contrast changes on dark.
That does not disprove the user's observation elsewhere or identify its cause.
Do not conflate low contrast with complete alpha erasure, or claim full-sequence
anatomical preservation from a single ROI. No nose was painted back.

White and green clips have different generated appearance/motion. Their apparent
difference is not a pixel-matched background-only A/B comparison. The direct
native-green -> key -> despill comparisons above isolate this software pipeline's
effect on the same green input.

Source ownership: `scripts/purple-key-review/` and this report only. Heavy work
ran on mini using existing tools. All assets ready for Dewey via main; no further
refinement running.
