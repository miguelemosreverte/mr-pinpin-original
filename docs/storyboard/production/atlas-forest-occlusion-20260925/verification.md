# Forest Visibility Reproduction

Scope: three user scenarios represented by four marks. The final two marks are
the before/after pair for one sudden-flip scenario, not two separate user cases.

Latest candidate 57790: fixed-pose jump is removed in the bounded 21-position
sweep (maximum adjacent retained-signal drop 3.52 percentage points). Scenario 1
retains .218 versus baseline .011; main visually accepted its remaining foliage
gap rather than requiring baseline pixel identity. All four house/tractor poses
and eight trailer neighbors preserve their intended ordering. Evidence
`candidate-2026-09-25T05-07-20-216Z/`. Final 57791 Space/mobile smoke PASS below.

Historical baseline status: **sudden forest visibility flip reproduced** independently of animation
or navigation. Current drops from 89.9% to 19.1% retained sprite signal across
one 3.1 px foot step; baseline progresses gradually across the same nine poses.
This is a regression reproduction, not a pass or a proposed runtime fix.
Read-only servers: frozen current 57789 versus frozen baseline 57786. No runtime
changes, user-tab control, animation retuning or navigation replay in this lane.

Evidence root: `/Volumes/TB4/mac-mini-storage/shared/atlas-forest-occlusion-20260925/`.
Source session `1fd5aa14-9d33-46e5-b6af-434d75e9c09c`:

| Scenario / mark | Mark | Point | Original visual |
| --- | --- | --- | --- |
| 1 | 025a1ca5-6a9b-4789-9b66-d9d41420edc9 | 1009.136,884.585 | Mostly intact sprite appears over foliage, not obvious ground contact. |
| 2 | 24a04e9d-3e30-4537-b951-4b7deec9f0ba | 1282.401,734.133 | Canopy removes a large portion of the back. |
| 3 / before | 65ba8f65-4ff8-4a29-b59f-f8513a5e66f3 | 1255.796,778.465 | Mostly foreground beside tractor/tree. |
| 3 / after | 7ace1bf3-9858-494c-a96f-324e53d197e4 | 1248.536,754.739 | Mostly hidden behind canopy. |

Last pair is 864 ms apart, same camera and target. Original clip changes from
turn270255 frame16 to loop255 frame13; a direct screenshot comparison therefore
confounds position with animation. Ground distances are 13.296 and 11.677 px,
held=false; planner generation 1330/replans152 and goal are unchanged. This is
not evidence of a collision stop or teleport. The bounded test holds the later
camera/clip/frame fixed at both endpoints plus seven intermediate footpoints,
alongside four exact original-pose replays on both frozen servers.

Only owned test pages receive the previously verified pose-restoration hooks;
original/delivered hashes are recorded. App/user tabs are never paused. Actual
rendered clip/frame/point/camera must match before capture. Normal GPU captures
are separate from DOF-off masked/unmasked/background pixel diagnostics. ROI
retention estimates are supporting evidence, not an automatic visual pass.
Original mark/tail/JPEG bytes are preserved and SHA256 recorded on TB4.

## Matched Replay Results

Current: `current-2026-09-25T04-55-00-809Z/`; baseline:
`baseline-2026-09-25T04-55-25-014Z/`. Both contain flat scroll `index.html`,
normal GPU JPEGs, separate pixel diagnostics, frozen manifest and hook hashes.
All 26 poses assert exact camera, point, clip and frame. Zero page errors.

Grid holds `loop255`, frame13, camera [1319.949905,662.807474], scale1.875,
1440x665 canvas, DPR2. It is a static visibility probe, not actual route travel.

| Grid | Foot X,Y | Baseline retention | Current retention |
| --- | --- | --- | --- |
| 0 | 1255.796,778.465 | .370 | .923 |
| 1 | 1254.889,775.499 | .329 | .920 |
| 2 | 1253.981,772.533 | .278 | .908 |
| 3 | 1253.074,769.568 | .228 | .904 |
| 4 | 1252.166,766.602 | .192 | .906 |
| 5 | 1251.259,763.636 | .149 | .905 |
| 6 | 1250.351,760.670 | .105 | .899 |
| 7 | 1249.444,757.705 | .060 | .191 |
| 8 | 1248.536,754.739 | .027 | .184 |

Current `fixed-grid-6.jpg` and `fixed-grid-7.jpg` visibly switch the central
canopy from behind most of the sprite to covering most of it. Same sprite
frame and camera; point changes only [-0.907,-2.966] px. The drop is approximately
70.8 percentage points, versus baseline's 4.5 points over that identical step.
The old behavior is substantially more occluded even before the switch; this
does not establish that the old mask was universally correct.

Exact original-pose retained signals (baseline -> current): case1 .011 -> .971;
case2 .161 -> .698; case3 .342 -> .917; case4 .027 -> .180. Case1 is now almost
entirely foreground over the foliage where the prior system hid it almost
entirely. Case2 changes which parts of the canopy cover the body. Neither is
declared fixed by a positive ground SDF or higher visible-pixel count.

## Recorded Timeline

The turn remains stationary through 04:50:01.882Z; walking starts before
01.983Z. Nearby recorded samples: [1251.391,764.069] at 02.285Z,
[1249.913,759.239] at 02.383Z, [1248.536,754.739] at 02.470Z.
The fixed-grid transition lies within this final approach. All retained timeline
samples have held=false and clearance >=8.949 px. Camera/goal/planner generation
remain stable. Animation timing explains some original image differences, but
cannot explain the independently reproduced fixed-frame flip.

## Visual Mechanism And Limits

Read-only frozen shader comparison supports the observed difference. Baseline
character visibility uses a spatial depth comparison with smoothstep feathering.
Current character visibility uses `object_visibility(instance, foot)`: the same
footpoint chooses foreground/background against an instance's ground profile.
Crossing that profile can change coverage for many overlapping canopy fragments
at once. It does not gradually move an occlusion boundary up the sprite as the
old spatial depth field did. The measured synchronized coverage jump is
consistent with this hard ordering rule. Exact responsible instance IDs and
authoring correctness belong to the parallel texture/shader read-only reports;
this lane does not invent a physical trunk/root location from the screenshots.

Normal GPU images reviewed: all four originals; current exact1/2, grid6/7;
baseline exact1/2, grid0/6/7. They corroborate case1 foreground appearance,
case2 changed canopy cutout and the sudden pair transition. Other grid values
are supported by saved automated pixel evidence, not a blanket human pass.
Focus/lens phase and scenery animation can differ from original marks, so there
is no whole-image pixel-identity claim. Pixel estimates use a bounded sprite ROI
and DOF-off control images; JPEG edges/contrast affect the exact percentages.

Flat paired visual review: `index.html` at the evidence root. Current frozen
version `6e99baa553d47320d014cf7a31f7495b401638dedfaee17d390675c2a34492a9`;
baseline `250f4b73576e993cf3036e20861ddd5a1e3116def66cc2c5766c7814336b9c9a`.
No runtime fixes, broad forest claims, stress tests, new recorder marks or
production changes. Mission CLI unavailable; bounded verification exception
matches the handoff. Harness `scripts/atlas-forest-occlusion-browser.cjs` uses
the existing mini Playwright install and TB4-only profiles/artifacts.

Cleanup: both owned browsers closed normally; no owned browser/test process
remains. The single owned SSH process forwarding 57786/57789 was closed after
verification. Servers and user browser were untouched. Node syntax check PASS.

Candidate verification below uses the same 13 poses, a 21-position fixed-frame
pair sweep, and the prior four house/tractor poses plus eight trailer neighbors.
No baseline repetition or navigation matrix was run. The tested artifact is the
baked instance-v2 PNG, not the raw generated `canopy-proposal-v1.png` proposal.

## Candidate 57790

Actual requests load `shire-object-instances-v2.png` and unchanged ground-v2.
Instance PNG: 163165 bytes, SHA256
`6d4723e1b843c3f1f9694ec6cff8c68b08591e878fd8ca33f93d54d9afe0acc9`.
Loaded B1 mapper SHA `febccc5c69e30e27dd1e9851834eba0f1924b2a00e60fecd800c5b2107100b3c`;
shader `d908a784d5898031434e68a8aa5ae9591b513b4c04813f5d3f7e94e8fbc7873c`;
renderer `dab7fe8bb8659543b7c7ecae703191466ec03361c63f3e3e874fec8c201f494f`.
Raw loaded source/asset copies are preserved beside the results. No runtime
substitution beyond the same recorded pose hooks. Motion and animation hashes
match frozen 57789. Live server has no collector manifest; per-source hashes
bind the run rather than inventing a frozen version ID.

34 candidate poses assert exact point/clip/frame/camera: four exact marks,
the original nine-point grid, plus a 21-position dense grid. Zero page errors.
Nine-point retention is .371, .334, .286, .239, .205, .162, .118, .058, .026.
Across the formerly failing grid6 -> grid7 step, candidate drop is 5.97 points
instead of 70.77. Dense grid falls monotonically from .371 to .026; largest
adjacent drop is 3.52 points over about 1.24 world px. This removes the tested
abrupt flip, not a proof of all canopy behavior everywhere.

Candidate exact marks retain .218 / .224 / .346 / .026. Scene 1 was inspected:
most of the body is now covered, but a visible residual fragment remains where
baseline hid almost everything. Scene 2 is mostly hidden again, closer to the
old spatial-depth result. Main subsequently inspected exact1/2 and grid0/4/8,
accepting the natural progressive coverage and the remaining gap fragments.
The whole-body-above-canopy appearance is gone in these scenarios; retained
signal alone is not acceptance. This lane inspected exact1/2 and grid6/7 normal
images; all diagnostics remain separate from originals.

## Existing Ordering Regressions

`57790-regression-visual-2026-09-25T05-07-56-030Z/`: four original house/tractor
poses, exact camera/point/clip/frame, zero page errors. All four normal images
reviewed by this lane and main: doorway/bush foreground body remains intact,
front-tractor body remains intact, and rear-trailer overlap remains opaque.

`57790-regression-adjacent-2026-09-25T05-08-44-930Z/`: eight trailer offsets
(cardinal and diagonal +/-4 px), exact camera/pose, zero errors. All eight normal
GPU images individually reviewed: trailer rim/body stays in front where it
overlaps the character; no returning foreground limb over the rear rim. This
is a bounded neighborhood check, not a whole-map occlusion guarantee.

Final scope: three forest scenarios accepted by main's visual review plus the
measured gradual sweep; 12 prior ordering regression poses pass visual review.
Navigation and animation were not changed or requalified by these static poses.

## Final Frozen 57791

Frozen version `2012b39c412397a0475f0dba7f227b382804e7c0a1493485ddd7999da0c73f99`.
Served instance-v2, ground-v2, mapper, shader and renderer hashes exactly match
the reviewed 57790 candidate above. Motion/video hashes remain unchanged.

`final-57791-recorder-2026-09-25T05-12-11-883Z/`: all 17 checks PASS, zero
page errors. Real pointer click began road travel; Space preserved target and
unpaused state while moving from [1263.616,827.376] to [1282.546,824.106].
Mark/tail HTTP 200, bounded pre/post history, planner snapshot/tail, actual
pointer inputs, frozen version and byte-identical saved JPEG all verified.
Keyboard camera input still works. The persisted screenshot was viewed and
shows the actual character on the road. Test-only session
`60e393e8-a1dc-4f4a-b89a-fe600ac8e8ec`, mark
`f489f1a2-4f3e-44af-aec4-e491a523a4b3` distinguishes this from user reports.

Mobile review-off capture is nonblank (14386 sampled colors), semantic textures
ready, recorder inactive, and character clearly visible in front of the door.
This is a paused test fixture with camera-only focus, not untouched default
startup framing. Image: recorder directory `mobile-final.jpg`.

`final-57791-mobile-2026-09-25T05-13-23-502Z/`: mobile road motion ARRIVED
within the 6.5 s bound, 219.431 px traveled, remaining 3.827 px, minimum observed
clearance 21.018 px, zero turn transitions, 605 ms maximum pre-arrival no-progress
and held duration. Zero page errors. Normal final image viewed: actual character
visible on road. This short smoke does not replace prior navigation coverage.

Both final test browsers exited normally; no owned test/browser processes
remained. Owned 57790/57791 forwards were closed after verification. No server
or user tab was touched. Both browser harnesses pass `node --check`.
Root `index.html` is a flat three-scenario before/after review with relative
local images and evidence links; it needs the accompanying evidence directory,
but no running server or network service.
