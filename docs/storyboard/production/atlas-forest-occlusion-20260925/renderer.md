# Forest Renderer Audit

Status: **all three forest scenarios visually validated on candidate57790 by
main and Parfit**. Main reports the full 89-test suite passes; this lane's 30
focused tests and desktop/mobile synthetic WebGPU checks also pass. Final frozen
review57791 is being started by main; final smoke remains pending. This is bounded
candidate acceptance, not complete canopy coverage or production publication.
Main owns review freezing and servers.
Archimedes owns the independently authored canopy raster and asset compilation.
No texture, steering, animation, server or recorder edits by this lane. No Mission
Control operation was attempted; this report is the handoff under the prior
CLI-unavailable exception. The audit/proposal below is retained as decision history.

## Candidate Acceptance

Parfit's actual-scene evidence is on TB4:
`/Volumes/TB4/mac-mini-storage/shared/atlas-forest-occlusion-20260925/candidate-2026-09-25T05-07-20-216Z/`.
Its 34 poses have exact point/clip/frame/camera checks and zero page errors:
four original marks (three scenarios), the nine-position grid and 21-position
dense grid. Main subsequently visually validated all three scenarios. The evolving
[verification report](verification.md) owns detailed replay, house/tractor
regressions and final frozen smoke; its earlier first-case review request is
superseded by main's bounded visual acceptance, not by a claim of baseline parity.

Across the formerly failing coarse step, the retained-signal drop falls from
70.77 to5.97 percentage points (about71 to6). Dense-grid retention decreases
monotonically with maximum adjacent drop3.52 points over about1.24 world pixels.
These are fixed-frame spatial probes, not frame-time or universal smoothness
guarantees. First-case retention remains .218 versus baseline .011: about22%
versus1%. The authored gate does not cover all canopy pixels. This visible
residual and the artistic-depth approximation remain explicit limitations.

Authored instance-v2 is163165 bytes versus v1's111948: **51217 additional PNG
network bytes and zero additional GPU textures**. The categorical texture keeps
the same dimensions/format and uses its previously unused B channel. The baker
preserves R IDs, bytes outside the canopy gate, protected hard-object/low-bush
pixels and ground-v2. No geographic coordinate exceptions were introduced.
See [textures.md](textures.md) for the protected-label policy and full validation.

No further runtime changes in this acceptance update. No owned jobs remain.

## Implemented Candidate

Main supplied baseline evidence before authorizing implementation: fixed-frame
legacy retention .370,.329,.278,.228,.192,.149,.105,.060,.027, versus the profile
model staying about .923..899 then dropping to .191. All three forest scenarios
favored legacy spatial ordering; first-case retention was .011 versus .971.
See [verification.md](verification.md) for the baseline lane's evidence and
[textures.md](textures.md) for classification/provenance. These are historical
baseline measurements; subsequent candidate acceptance is recorded above.

- Default instance URL is `shire-object-instances-v2.png`; ground remains
  `shire-object-ground-v2.png`. Old inputs are untouched. Archimedes supplied the
  validated instance PNG and Parfit verified actual network loading on57790;
  SHA256 `6d4723e1b843c3f1f9694ec6cff8c68b08591e878fd8ca33f93d54d9afe0acc9`.
  Missing input still surfaces loading failure.
- B is a **per-pixel** mode, not an instance class. B0 retains the original ID,
  coverage and character-foot-X profile path without changed comparison math.
  B1 executes legacy spatial depth before the ID0 early return and needs no profile.
  R stays categorical ID; G is authored coverage; A must be255. B1 requires G>0;
  B0/ID0 requires G0; unknown modes and malformed dimensions/bytes are rejected.
- B1 visibility is `1 - coverage * (1 - visibility(scene, memberFootDepth))`.
  One nine-tap legacy scene sample is shared across all overlapping members and
  legacy banner/overlay work. Members use their existing `depths.z` ground-depth
  uniform, not the lead character's depth. No new uniform, GPU texture or CPU
  per-frame readback. No object names, ID constants or coordinate branches.
- Banner ordering and DOF remain intact. The only renderer.js change against the
  previous frozen GPU file is the stats model string `hybrid-profile-canopy-v2`.
  Capture, animation, texture allocation and member ordering code are unchanged.
  The legacy per-pixel feather remains intentional in this comparison candidate;
  it is not an added body-wide alpha/temporal fade or claimed physical volume.

### Tests And Evidence

`node --test scripts/atlas-object-occlusion.test.cjs scripts/atlas-video-renderer.test.cjs scripts/atlas-occlusion.test.cjs`
passes **30/30 on both Air and mini** (12 object tests, 13 renderer tests, 5 existing
occlusion tests). Includes ID0/B1, positive partial coverage, absent reference
visibility, invalid modes, missing asset failure, independently ordered profiles,
per-member legacy depth uniforms, exhaustive fixture B0 invariance to canopy
values, and exact v2 URL pairing. Initial strict floating-point test equality was
corrected to numerical tolerance; no runtime behavior changed to satisfy it.

Actual Apple/Metal WebGPU harness, desktop800x600 and mobile390x844:
`/Volumes/TB4/mac-mini-storage/shared/atlas-forest-occlusion-20260925/gpu-fixture-2026-09-25T05-01-33-656Z/result.json`.
Twenty captures total; front and unclassified retention1.0, hard-profile rear0.0,
ID0 canopy0.0, spatial canopy .52332 at both sizes (one side of the opaque test
sprite remains visible). Screenshot inspected. No page/renderer errors; exactly
two static data decodes and one sprite upload per viewport, no extra texture.
These are synthetic contract checks, not the saved forest/house/tractor replay.
The ephemeral harness server/browser closed normally; existing services untouched.

Tested source copies are on TB4 `atlas-forest-occlusion-20260925/renderer-candidate/`;
the three runtime copies were byte-compared with the checkout after verification.
Runtime SHA256:

| File | SHA256 |
| --- | --- |
| object-occlusion.js | febccc5c69e30e27dd1e9851834eba0f1924b2a00e60fecd800c5b2107100b3c |
| renderer.js | dab7fe8bb8659543b7c7ecae703191466ec03361c63f3e3e874fec8c201f494f |
| world.wgsl | d908a784d5898031434e68a8aa5ae9591b513b4c04813f5d3f7e94e8fbc7873c |

Focused test-source hashes:
`atlas-object-occlusion.test.cjs` = `2fa34a336850a135bfcce8869a907317867c5cec9cc957c016cfbf1fdc223725`;
`atlas-video-renderer.test.cjs` = `faf8d7cfed63fc0a677794ce130267c80edc6c220ba4b5a5eb0c7bba90a6de54`;
`atlas-object-occlusion-browser.cjs` = `841d14fcbbf15723c487eea9c26afc5d2436fd1cd751b3d66cf0371d19f9fdf8`.

No commits, publication, review-version edits or main-server operations performed.

## Initial Audit Evidence

Read all four immutable `mark.json` payloads and viewed all four `screenshot.jpg`
files under `/Volumes/TB4/mac-mini-storage/shared/atlas-review-marks/marks/`.
All report semantic occlusion ready/enabled, ground ready, and ground not held.
Their frozen version is
`6e99baa553d47320d014cf7a31f7495b401638dedfaee17d390675c2a34492a9`
(review service 57789). Frozen shader/renderer hashes match the inspected checkout.

| Mark ID | Recorded foot | Clip / frame | Ground clearance |
| --- | --- | --- | --- |
| 025a1ca5-6a9b-4789-9b66-d9d41420edc9 | 1009.1360,884.5855 | loop165 / 0 | 86.8055 |
| 24a04e9d-3e30-4537-b951-4b7deec9f0ba | 1282.4010,734.1330 | turn045030 / 2 | 6.8499 |
| 65ba8f65-4ff8-4a29-b59f-f8513a5e66f3 | 1255.7961,778.4649 | turn270255 / 16 | 13.2961 |
| 7ace1bf3-9858-494c-a96f-324e53d197e4 | 1248.5364,754.7389 | loop255 / 13 | 11.6766 |

The last pair captures a whole foreground body followed by substantial canopy
coverage. Capture timestamps differ by 863 ms (rounded telemetry by 864 ms), with
24.81 world-pixel travel. They are NOT consecutive frames. The user's report is
that the transition between them occurred in one frame; these screenshots alone
cannot measure that duration. Recorded history is approximately 100 ms cadence.

Decoded the existing PNGs on the mini using Pillow, without changing them:

- Instance v1 SHA256: `8e2268ee623ca3ef862ff28240409d4d379ed0097e8ccc44981657aa74efbe24`.
- Ground v2 SHA256: `c3e1a45275537805494a6cb0b961769052d8e13c0c7c34dcd979a85c4d1f12eb`.

Simple center-column scene probes, not a complete sprite-alpha intersection audit:

| Scenario | Scene probes / instance | Base Y | Foot Y minus base |
| --- | --- | --- | --- |
| First mark | (1009,836), (1009,852): ID160, coverage255 | 859.5 | +25.0855 |
| Second mark | (1282,686/702/718): ID55, coverage255 | 733.5 | +0.6330 |
| Pair before | (1255,730): ID174, coverage255 | 758.5 | +19.9649 |
| Pair after | (1248,706/722/754): ID174, coverage255 | 758.5 | -3.7611 |

ID174's profile is constant Y758.5 across all sampled columns X1248..1255;
ID55 is constant Y733.5 there and at X1282. The sidecar calls these root-bottom,
unreviewed components, not verified physical trees. ID174 has bbox
[1184,625,1286,760]; ID55 [1267,627,1334,735]. Label correctness is a separate
authoring question; a shader must not interpret these specific IDs specially.

History immediately preceding the final mark has foot Y759.2391 at t13237884,
still above ID174's threshold; the marked point at t13237971 is below it.
Thus the mathematical ordering flips within that 87 ms recorded interval.
Per-frame replay is needed to measure visible pixel change and isolate pose change.

## Mechanism

[`world.wgsl`](../../gpu/world.wgsl) `object_visibility` (lines69-80) samples the
scene fragment's categorical ID, then reads a single LUT value at
`[floor(character.footX), instanceID]`. Every overlapping pixel of that instance
uses the same comparison `footY >= baseY`. Coverage changes only at the silhouette;
it cannot make the interior enter progressively. With a flat root profile, a
subpixel crossing can therefore toggle all currently overlapping canopy pixels
in the same rendered frame. This is a structural limit of the current model,
not necessarily an incorrect comparison or animation discontinuity.

The first two sampled canopy IDs likewise deliberately return foreground under
this rule; ready-state/fallback failure does not explain those probes. Correcting
a mislabeled root can improve ordering, but moving a single constant threshold
only relocates its potential pop. Bilinear LUT interpolation cannot fix a flat row.

The older `visibility(sceneDepth, objectDepth)` evaluates different scene depths
at different fragments, with a depth feather. It can reveal different body parts
at different positions, unlike one root threshold. It is not recovered volume
geometry. In particular the retained `groundDepth` calibration is flat from
Y740 to845, covering this pair: perceived progression there can arise from moving
through the spatial depth image, not continuously changing foot depth. Its broad
feather also permits translucent interiors. Do not equate its pleasant transition
with physically correct depth or restore it globally: that would risk the prior
house/tractor cutouts. Current artistic depth is separate from character ordering;
legacy banner ordering and DOF are intentional, unrelated consumers.

## Original Bounded Proposal

**Recommended first comparison candidate: reuse the existing artistic-depth
texture, gated by an authored B mode byte.** This is smaller than adding a new
texture and directly tests the user's reported previous behavior. Mode0 preserves
the exact support-profile path. Mode1 evaluates the old per-pixel depth comparison
only inside reviewed vegetation coverage, sharing one nine-tap scene sample across
overlapping characters (and the existing banner sample where appropriate). Ground
and unknown IDs do not opt in. No whole-character opacity multiplier, coordinate
branch, new GPU texture or CPU readback is necessary. The loader currently rejects
nonzero B, so its versioned validation/reference and fixtures must change too.

Mode1's old feather may create local translucent patches; this is a comparison
prototype, not approval of that artifact. Compare baseline first. If spatial
ordering works but feathering ghosts, test a hard per-fragment comparison with
only contour-local AA. Do not claim this recovers physical volume or guarantees
progression where the artistic depth is flat. Keep per-instance mode consistent
in authored data, and keep hard-object bytes unchanged. No runtime edits yet.

**Alternative only if reused depth fails:** a separately authored spatial-front
texture. Do not build this extra path before the smaller comparison answers the
question. Select its mode by numeric data, never scene coordinates, instance-ID
constants, object names or runtime plant detection. Proposed future contract:

1. Version the instance encoding: retain R=ID, G=coverage, A=255; use the currently
   reserved B byte for mode0=support-profile and a versioned spatial-front mode
   distinct from the experimental legacy-depth mode. The compiler
   validates mode consistency per instance and keeps all hard-object mode bytes0.
   Existing v1 assets remain valid mode0; authoring decides which reviewed
   components qualify, not the shader. Unknown modes fail validation.
2. Add one registered RGBA8 spatial-front texture (1536x1024, about6 MiB on GPU).
   RG packs an equivalent world-foot-Y threshold at 1/16 px; B is validity0/255,
   A255. Each eligible scene pixel has its own threshold instead of one root Y.
   This is an authored ordering surface, explicitly not measured terrain height.
   Reject missing spatial-mode samples at bake/load validation; do not silently import
   artistic depth in unclassified ground. Preserve explicit load diagnostics.
3. At a fragment: load instance once. Mode0 executes today's exact profile lookup
   and comparison. Spatial mode loads its threshold at that fragment and performs
   the same opaque foot-Y comparison. Different surface pixels cross at different
   positions, producing spatially advancing coverage rather than whole-body alpha.
   This uses two data loads per evaluated fragment/member path, not a CPU readback.
   With multiple characters the spatial sample can be shared. Profile and spatial
   samples need not both execute for the same mode.
4. Start with hard per-pixel coverage plus the authored silhouette edge. If sample
   aliasing requires AA, bound it to the local projected contour (about one output
   pixel), not a fixed wide foot-distance feather; flat threshold areas must not
   become an all-body fade. Do not add temporal blending, noise/dither, gait changes,
   or scene-specific threshold biases to conceal bad surface data.

This costs one additional static texture/binding and a small versioned loader,
validator/reference and shader branch. Packed RG values must be decoded before
any optional interpolation; filtering packed bytes/IDs directly corrupts values.
Nearest sampling is the minimal initial contract; precision/contour stepping
must be assessed in replay before adding more samples.

**Authoring is the unresolved part.** An approved per-pixel canopy depth/support
   surface can be compiled to equivalent foot-Y thresholds. The old artistic depth
may be a useful proposal/reference within explicitly reviewed masks, but is not
automatically suitable: calibrated ground depth is not globally invertible, is
locally flat here, and artistic dark/light details may create false holes. Require
Parfit's same-pose baseline comparison and Archimedes's label/registration findings
before choosing a derivation. Do not bake an arbitrary noise ramp, distance-to-mask
gradient or hand-tuned threshold at the failing point just to obtain a smooth clip.

This improves a front-surface representation, not full volumetric rendering.
One visible scene layer still cannot resolve every interleaved branch/body layer,
and wrong segmentation or flat authored surfaces can still produce a pop.

## Acceptance Before Cutover

- Replay all four marks with exact pose/camera; separately sweep the final pair's
  path with a fixed sprite frame at <=1 world-pixel spacing, in both directions,
  then replay real animation. Capture per-frame coverage, not only 100 ms history.
- Compare the old renderer at the same poses/path; distinguish spatial progression
  from ghosting. Assess first two scenarios independently of the threshold pair.
- Preserve four house/tractor cases, eight rear neighbors and front/behind controls
  under mode0, ideally byte-identical semantic visibility; keep original v2 inputs.
- Synthetic fixtures: two surface thresholds partially cover an otherwise opaque
  sprite; flat surface stays hard; missing/invalid data diagnosed; mode0 unchanged;
  unclassified ground remains clear; multiple members use their own foot coordinates.
- Verify actual WebGPU shader compilation, desktop/mobile framing, no new CPU reads,
  texture cleanup, unchanged banner/DOF/capture, and honest version/freeze identity.

No new browser run or runtime test was performed at the initial read-only stage.
The numerical threshold and hashes above were checked directly against decoded
existing assets. Subsequent authorization and candidate verification are recorded
at the top; the larger spatial-front texture alternative was not implemented.
