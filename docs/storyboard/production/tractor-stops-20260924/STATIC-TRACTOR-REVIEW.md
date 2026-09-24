# Stationary-tractor bridge review

The current stop-04 bridge does not satisfy a locked, stationary vehicle transition. The vehicle moves during the middle of the one-second clip even though its first and last frames are relatively close to their respective reference images. Ground texture also sweeps and changes. A low endpoint RGB error or central SIFT median cannot establish a stationary machine.

Inspected the existing five-frame contact sheet and decoded start/end frames, then tracked manually seeded hub patches through all 25 frames of `stops/stop-04/bridge/bridge-in-v1.mp4` (1280×720, 24 fps; SHA-256 `98814760b7135a39abe491d8ec23650f7d5ca8ec0234ea996d470bb44ba6b41c`). Consecutive pyramidal Lucas–Kanade tracking used a 41-pixel window and forward/backward consistency checks. These are approximate screen-space texture landmarks, not measured physical displacement or recovered axle geometry.

| Hub patch | Maximum excursion from first frame | Frame | Fraction of image width | End displacement (x,y) |
|---|---:|---:|---:|---:|
| Tractor front | 26.3 px | 20 | 2.05% | +6.4, −5.0 px |
| Tractor rear | 20.4 px | 20 | 1.60% | −6.6, +0.2 px |
| Trailer first | 5.6 px | 16 | 0.44% | +2.1, −1.2 px |
| Trailer second | 14.3 px | 24 | 1.12% | +14.0, −3.1 px |

All four hub tracks passed the consecutive forward/backward check with maximum step error below 0.21 px. This does not prove that they follow the exact geometric center under generated deformation. It does show substantial local movement, including a late excursion that partly returns before the endpoint. The endpoint check separately reports mean absolute RGB errors of 4.09/255 at the start and 5.58/255 at the end; those values address endpoint resemblance, not rigidity during playback.

Cab-roof and crane-pivot optical flow drifted onto other texture despite apparent local consistency in one case; their numerical outputs are rejected. Of 80 foreground-ground seeds, only one survived the forward/backward test and its huge apparent displacement is not a valid ground measurement. This is evidence that those textures cannot support a stationary-ground claim, not evidence of a specific physical camera translation. The contact sheet shows changing/moving foreground. A hub remaining nearly fixed would also not prove that its tire stopped rotating; tread and rim orientation need visual checks.

## Replacement pilot rubric

1. Compare the raw source and final spherical forward endpoint before generating a bridge. Check all four hubs, tire outer contours, front grille, both cab roof corners, crane hinges, grapple and trailer posts. A fit supported only near the cab must not hide shifted outer wheels or a changed wheelbase. If these disagree visibly, the endpoint itself requires correction; a video model will otherwise interpolate geometry changes.
2. Keep the same camera, lens and framing for the bridge, with explicit locked vehicle, wheel rotation, crane joints, grapple and ground contact. Remove camera travel, orbit, push-in and parallax language. Background/style refinement must not instruct physical movement.
3. Review at least first, quarter, middle, three-quarter and last frames, plus normal and slow playback. Reject a wheel roll, body drift, crane flex or intermediate excursion even if the endpoint returns. Compare fixed background landmarks separately from moving leaves/water.
4. For a 1280×720 fixed-camera pilot, use **3 px typical / 5 px maximum** landmark movement as a proposed review tolerance, with manual confirmation of tracker identity. This is an authored acceptance target, not an observed guarantee or universal metric. Reject inconsistent tracks rather than averaging them into a low error. Check relative hub spacing and silhouette changes, not just whole-frame translation.
5. Record endpoint image agreement separately from all-frame stationarity. Approval requires both a stable machine and acceptable entry/exit continuity; neither SIFT residual nor RGB endpoint error alone is sufficient.

Detailed raw measurements are retained on the mini as `STATIC-TRACTOR-CHECK.json`; the rejected tracker values are explicitly excluded from the conclusions above. No new image or video call, UI edit, or modification to the accepted orbit was made during this review. The new stricter stop-04 panorama and replacement bridge remain to be checked against this rubric.

## New guide-first stop-04 endpoint

Independently inspected `stops/stop-04/pilot-static-v1/fit-v1/fitted-view.png` against the raw t4 composition. Its fitted camera (vertical FOV 65.5083°) gives sensible full-machine framing, but does not preserve the whole vehicle rigidly. Approximate visual offsets at 1280×720 are 25–30 px right for the front grille/weight, 10–15 px right for the front hub, and 5–10 px downward for the cab roof. The rear hub stays much closer to its source position. Hood silhouette and tire tread also change, and the far trailer hub shifts slightly. These are manual estimates with several-pixel uncertainty, not subpixel measurements.

The reported 101 SIFT inliers and 3.40 px median residual primarily validate the matching central features. They do not negate the visible outer-front changes. This is a better framed endpoint, but it still cannot support a claim that the source tractor stays exactly still while a generated bridge resolves the two different drawings. No bridge to this new endpoint was assessed here.

## Locked-camera video retry

The UI lane subsequently supplied `stops/stop-04/bridge-static-v2/check/contact-sheet.png`. Independent inspection of its five samples still shows changing front-body/cab/wheel proportions and a raised/extended crane around the middle, together with sweeping foreground. The retry fails the stationary requirement despite the revised locked-camera wording. The UI lane separately measured 38.5 px outer-hub-span overshoot beyond the endpoint spans, versus 27.1 px in V1; that measurement is attributed to its tracking run and was not independently recomputed here. No further generation follows this review. Exact clip, prompt and detailed UI evidence remain in the separate `bridge-static-v2` directory.
