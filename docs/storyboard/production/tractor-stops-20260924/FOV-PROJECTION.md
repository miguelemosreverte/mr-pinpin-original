# V2 projection correction

The generated V2 contains a broadly perspective-shaped tractor spread across a large part of its flat panorama. Reading that region as an ordinary equirectangular image and opening it at the fitted 89.4° vertical field of view stretches the outer wheels and crops the vehicle. Changing only the viewer FOV does not undo that projection mismatch.

This experiment resamples **the generated V2 alone**. The video frame supplies feature correspondences and a framing target; none of its pixels are overlaid. No new image generation, painting, vehicle reconstruction, or restoration was performed.

## Evidence and candidates

| Result | Actual outcome |
| --- | --- |
| Direct flat homography | Whole-vehicle framing and wheel proportions improve substantially. Root and independent visual review accepted this frontal diagnostic. Small redrawn geometry and background differences remain. |
| Two harmonic mappings | Rejected by the nonpositive-Jacobian guard; no candidate panorama emitted. Failure records retained. |
| Monotone candidates 1 and 2, authored 45° | Positive coordinate derivatives and improved front, but **rejected visually**: oblique browser views expose strong rectangular-looking forest/floor transitions and stretched surroundings. Mathematical continuity did not make them acceptable panoramas. |
| Candidate 3, authored 65° | **Frontal proof only; not accepted as a corrected full sphere.** Actual browser views retain the improved whole vehicle, and the transition is smoother than candidate 1, but turning ±36° exposes strong forest/ground streaking and a rectangular-looking lower transition. |

The direct homography uses SIFT/RANSAC between raw-frame coordinates and flat V2 pixels. It found 86 inliers, with a median residual of 1.47 V2 pixels. These features concentrate around the central machine, so this statistic alone is **not** a whole-vehicle registration test. The frontal image and source overlay were also inspected for outer wheels, trailer, crane, and crop.

## Candidate 3 recipe

Input: `pilot/panorama-v2.png`, SHA-256 `93542403af245904ed2a32f696fa116cea50e18b7a4adf76622a985c5152f493`.

Output: [panorama-projection-v3.png](pilot/fov-correction/panorama-projection-v3.png), 3072 × 1536, SHA-256 `cad6e2dbca18eca40fad3e4961f5989af4ef3ee775d25ed0c92b3abbfc6ffbdc`.

Entry camera: yaw **0**, pitch **0**, vertical FOV **65°**, aspect **16:9**. This lens is an authored display convention, not a measured physical video lens. The remap and viewer must use the same lens to reproduce the diagnostic composition.

The central inverse mapping composes perspective rays with the flat-image homography. Longitude uses the homography at the middle row; latitude retains its column-dependent vertical mapping. Small horizontal cross-coupling is omitted to preserve a provably increasing mapping. Outside this central region, integrated positive exponential derivatives match endpoint values and slopes, giving broad C1 transitions toward the unchanged rear. Longitude returns to identity inside the polar caps where latitude is already identity.

The exact metadata, bridge parameters, input identities, and executable hash are in [projection-v3.json](pilot/fov-correction/projection-v3.json). The recipe is [smooth_projection_remap.py](smooth_projection_remap.py); its coordinate-map NPZ is retained on the mini beside the output.

Run on the mini using the isolated fitting environment:

```sh
cd /Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924
fit-env/bin/python smooth_projection_remap.py \
  --registration pilot/fov-correction/homography.json \
  --out pilot/fov-correction --width 3072
```

Actual checks: positive analytic Jacobian lower bound `1.3674791214463197e-6`; output rows/columns strictly increase in their mapped longitude/latitude respectively; the rear 20° bands and true 4.5° polar caps have **zero pixel difference** from an identity resampling of V2. These checks establish sampling behavior, not artistic continuity or physical camera recovery. Surrounding trees and ground necessarily change angular spacing. Source-image seams, generated detail differences, and previously synthesized scenery are not repaired by this arithmetic.

## Retained proof

- [Frontal homography proof](pilot/fov-correction/front-homography.png) and [source overlay](pilot/fov-correction/front-overlay.png).
- [Candidate 3 forward view](pilot/fov-correction/forward65-v3.png) and [source overlay](pilot/fov-correction/forward-overlay-v3.png).
- [Homography correspondences](pilot/fov-correction/homography.json), [inverse harmonic failure](pilot/fov-correction/failed-inverse-attempt/map-check.json), and [forward harmonic failure](pilot/fov-correction/forward-map-check.json).
- Actual browser comparison and perimeter observations are recorded by the UI lane in `FOV-REVIEW.md`; independent appearance review is in `FOV-VISUAL-REVIEW.md`.

Original V2 and all rejected candidates remain intact. New raster files stay on the mini/TB4; checkout links are working-media references, not portable archive receipts. The archive lane will record preservation separately after selection.

## Final bounded verdict

The projection diagnosis is supported: treating the machine's flat generated depiction as a perspective image substantially restores source-like frontal proportions. The global correction is **not complete**. A continuous, positive-Jacobian remap can still squeeze a narrow source margin across a large viewing angle, producing conspicuous streaks. Candidate 3's actual left browser capture confirms this; it is not a successful 360° replacement. No further model call or remapping candidate was made after this review. The useful result is the frontal correction and reproducible diagnosis, with all failed full-sphere trials explicitly retained.

## Subsequent model repair V4

After that deterministic experiment closed, the coordinator made **one image-model edit**, using V3 as the geometric edit target and the original t4 frame as the appearance reference. This is a separate artistic repair of stretched surroundings, not a claim that remapping alone succeeded. Its exact [prompt](pilot/fov-correction/repair-v4-prompt.txt) and [generation record](pilot/fov-correction/repair-v4-generation.json) are retained.

The unchanged generated master [panorama-repaired-v4.png](pilot/fov-correction/panorama-repaired-v4.png) is 1774 × 887, SHA-256 `7af1d1f029f4f8d0e68a41777b0d48598bce49a8a9eb708693bc163d357b4890`. The existing `fit_camera.py` was run against the original frame without altering V4:

```sh
fit-env/bin/python fit_camera.py \
  --reference stops/stop-04/source.png \
  --panorama pilot/fov-correction/panorama-repaired-v4.png \
  --out pilot/fov-correction/v4-fit-raw
```

The [fit](pilot/fov-correction/v4-fit-raw/fit.json) gives yaw **0.00355781 rad**, pitch **0.00092705 rad**, vertical FOV **65.41538°**: close to the intended **0 / 0 / 65°** entry. Of 185 RANSAC inliers, 179 fit below 8 pixels; median residual is 3.38 pixels and p90 is 6.13 pixels at 1280-pixel width. Feature coverage spans x22–85% of the source, substantially broader than the original cab-dominated V2 fit. The [fitted view](pilot/fov-correction/v4-fit-raw/fitted-view.png) retains the full machine with ordinary wheel proportions. These are correspondence and frontal framing results, not a guarantee of unchanged machinery or a flawless sphere. No math remap was applied to V4.

The coordinator accepted V4's actual front and side browser views for preview: the model edit repairs the conspicuous stretched surrounding textures while retaining near-65° framing. Generated details still differ from the original frame; this is not pixel-identical recovery. Browser review then found a separate rear-wrap seam. A [rear input](pilot/fov-correction/rear-v4-input.png) was extracted using the unchanged `tools/panoramas/project.py` at yaw 180°, pitch 0°, square FOV 110°, 1400 pixels. Its [record](pilot/fov-correction/rear-v4-input.json) pins the V4 master, output, helper hashes and camera. Any subsequent model repair is recorded separately by the coordinator; the original V4 is retained.

The coordinator then made **one localized rear edit**, [rear-v4-repair.png](pilot/fov-correction/rear-v4-repair.png), using that extracted view as its sole input. The unmodified tool result is 1254 × 1254, SHA-256 `3d62e73591146277fb40e20f3fcf81baf460dd08108253e716548e1c94dc17f2`. Its exact [prompt](pilot/fov-correction/rear-v4-prompt.txt) and [record](pilot/fov-correction/rear-v4-generation.json) are retained. The coordinator inspected the center seam as repaired; the UI lane integrates it through the existing 110° rear slot and reviews its overlaps. The original full V4 remains unchanged beneath this layer.

This correction phase therefore used **two image edits total**: one full-panorama surroundings repair, followed by one rear repair. The earlier V1/V2 panorama and restoration calls belong to earlier documented phases. No additional generation occurred in the projection lane. The completed result is an authored preview with measured near-65° front registration, not a pixel-identical video reconstruction or a guarantee that every direction is perfect.
