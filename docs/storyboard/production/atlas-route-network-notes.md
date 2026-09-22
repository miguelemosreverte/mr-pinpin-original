# Atlas route network v13

## V13 close foreground roadside lane

The front road is now on the close wheel/trailer diagonal
`y = 825 - .175 * (x - 1280)`. Actual centerline positions include
(1340,814.5) and (1420,800.5), respectively 40.8px and 46.8px north of v12.
The straight baked section runs from (1294.198272,822.515712) to
(1443.803136,796.334080). Guides: the unchanged (1204.159488,845.648896)
fork, (1244,845), (1280,825), (1460,793.5), (1505.000448,780), and the
unchanged rear join (1505.000448,735.935488). The short entry guide preserves
the existing fork's <=25deg turn bound over 0.75px travel. Corners use seven
quadratic samples and <=28px setback. All eight original route objects,
junction settings, and the exact north/rear arc remain hash-protected.

`atlasGeometry.foregroundRoads[0]` is the shared depth/clearance contract:
route `tractor-encircling-loop`, logical segments [8,32) only, world-space
corridor polygon, `depthPolicy: 'foreground-road'`. Eligibility requires the
same route ID, both endpoints inside the corridor, and both endpoints on one
tagged logical segment (0.002px normalization tolerance). The helper
`foregroundRoadForEdge` in `scripts/atlas-roadside-contact.test.cjs` implements
that check for logical and production-derived edges. A corridor-box test alone
is insufficient. Body overlap with the vehicle is legitimate only on those
front-road segments; renderer integration is owned by the depth lane.

All road feet are checked with a continuously swept capsule of x extent +/-12px
and y extent +/-2px (horizontal spine +/-10px, radius 2px). Its minimum vehicle
gap is 9.013793px, leaving 6.813793px after the retained 2.2px update reserve,
above the required 6px. Outside the tagged foreground segments, both quantized
heading bins, all gait frames and both directions retain full crop clearance:
minimum 9.353010px, or 7.153010px after the update reserve. Picnic full-body
clearance, banner exclusions, water exclusions, and turning limits are retained.

Loop length is 627.872632px, down 45.532407px from v12. Graph size remains
313 logical segments, 605 derived edges, 595 nodes. Focused contact, route,
junction, and motion suites pass 50 tests with four opt-in browser tests skipped.
The two broad browser verifiers now use the same scoped clearance contract,
default to v13, and expect lower travel at y790..830. Broad route verification
passes 13/13 checks at desktop 1440px and emulated phone 390px, including both
loop directions and exact arrivals at the new east waypoint (1505,750).
Report: `/tmp/atlas-tractor-loop-v13-browser.md`. The tractor-scene verifier
was syntax checked but not run in this lane. Depth/sprite adjacency validation
belongs to the parent; details are in `/tmp/atlas-roadside-geometry-v13.md`.
No renderer, motion, sprite or source-image edits belong to this geometry lane.

Geometry SHA256: `d0b1a47ca275c400cbddc4788062c78c2709f26cefd61becf10bc451dcfdc025`.
Baseline: `/tmp/atlas-geometry-before-v13.js`. No commit or push.

## Historical V12

## V12 straight lower vehicle-side lane: geometry frozen

Only the lower encircling road changes. The long lower perimeter is now one
straight diagonal from (1293.365760,859.963392) to (1469.606400,842.339328),
heading -5.710593deg, alongside the vehicle's longitudinal wheel axis. Its
guide line is y=861.3-0.1*(x-1280). Entry/exit curves use the existing offline
quadratic baker with seven samples and <=28px setback, guided by
(1204.159488,845.648896), (1244,848), (1280,861.3), (1480,841.3), (1505,825),
then the exact existing join (1505.000448,735.935488). Everything from that
join through the north/rear arc is unchanged, as are the eight original routes,
both forks, junction settings, sprite, renderer and depth treatment.

Full bidirectional blended crop clearance, swept over every logical and derived
edge including the east turn, is 8.378711px (v11: 8.374448px). Reserving the same
2.2px update travel leaves 6.178711px against the unchanged 6px body requirement.
Foot clearance remains 12.599084px; picnic and banner exclusions also pass.
The regression checks every segment across x1330..1455 in both logical and
derived geometry against the line within 0.01px and heading within 0.01deg.
Exact v11 rear/north coordinates and junction settings are protected by hashes.
All physical clearance and turning limits remain unchanged.

Loop length: 680.501869 -> 673.405039px (7.096831px shorter). Maximum lower y:
857.164800 -> 860.237824, at the curved entry; x1345 is approximately y854.8
and x1430 y846.3. The old lumpy middle and east-end bulge are removed. Logical
segments: 353 -> 313; derived edges/nodes: 645/635 -> 605/595. Existing graph
budgets are unchanged. Focused route, junction and motion tests: 47 passed,
four opt-in browser tests skipped, zero failures (6.26s).

V12 browser walking passes ten sampled stops across desktop and emulated phone
viewports, including reverse travel, with no visible-alpha sprite pixels inside
the surveyed vehicle polygon. Art-size gap during these samples is >=13.26px.
Results and actual screenshots: /tmp/atlas-lower-lane-v12-runtime/results.json.
The before/after route guide at /tmp/atlas-lower-lane-v12-comparison.png was
visually reviewed; it deliberately omits canopy masking to show the line shape.
Production occlusion is unchanged: the middle stop is about 15% visible and the
farther trailer-side stop is almost entirely hidden. This is a parallel-path
geometry correction, not a claim of a fully visible roadside walk. Historical
v11 broad browser results below do not certify v12.

Frozen geometry SHA256:
`f6f2dd9ef6c3fc285b10c003e823e441a1c74cc05f79be538f7187c27aae1dfc`.
Baseline: `/tmp/atlas-geometry-before-v12.js`.
Handoff: `/tmp/atlas-lower-lane-v12.md`. No commit or push.

## Historical V11

## V11 rear-trailer dirt lane: verified and frozen

The encircling road now follows the south-side wheel/trailer diagonal instead
of the flat y875 woodland detour. Its main-wheel section is near (1345,855),
trailer section near (1430,846), and maximum south y is 857.1648. The visible
adjacent section is now behind the trailer on clear dirt: north-to-east guides
(1400,658), (1430,672), (1455,713), (1488,713), (1505,728). Actual baked stops
include (1450,704.59), (1460,712.05), and (1470,713). The route is 680.5019px long.
That is 32.8307px shorter than v9 (713.3326px), a 4.6024% reduction, and
19.3439px shorter than v10 (699.8458px), a 2.7640% reduction. The visible rear
road placement is the main improvement; total loop length is secondary.
All eight previous route objects, both fork positions, all junction settings,
and exact tractor/story return positions remain unchanged. The north minimum
remains y658. No runtime, renderer, scale, asset or occlusion changes belong here.

Tractor clearance now checks full crop rectangles for BOTH production-quantized
heading bins, all gait frames, and both travel directions, swept continuously
over every logical and derived segment. Minimum crop clearance is 8.374448px:
6.174448px after reserving 2.2px for the 50ms sprite update at 44px/s. The required
body margin is 6px. This replaces the unnecessarily tall all-heading union only
for tractor clearance. Picnic retains that union and 14px, measuring 16.000768px.
The helper is offline-only: `scripts/atlas-sprite-clearance.cjs`. No alpha threshold
or visibility masking is used to make these collision assertions pass.

Tractor foot clearance now requires the same 8.2px as the full body, measuring
12.599084px; picnic foot clearance stays >=20px. Banner feet (1360,720)/(1348,720) retain their
23px exclusion radii; minimum road gaps are 62.000128px / 61.820063px. Nine routes,
seven rounded branches, 353 logical segments, 645 derived edges / 635 nodes.
The logical budget is now 360 for the measured extra rear bend; derived budget650
is unchanged. The rear parallel section has an explicit position regression test.
Focused route, junction and motion checks pass 45 tests; four opt-in browser
tests are skipped. Existing <=12.1deg segment turns and <=25deg over each 0.75px
phase remain enforced, including all 42 directed branch pairs.

The final actual-runtime adjacency check passes all 10 stops across desktop
(1440px) and an emulated phone viewport (390px), including reverse travel.
At (1450.818,705.755), the original 56px character is 82.89% / 83.51% visible
in the two directions on both viewports, above the 75% required at this stop.
The minimum actual alpha>15 sprite-to-vehicle gap during sampled movement is
10.500064px, with zero overlap. The check tests sprite pixels before occlusion,
then separately measures visibility with the unchanged production GPU depth mask.
These are sampled runtime checks against the surveyed vehicle polygon; the
continuous conservative crop proof above also covers every logical/derived edge.

Results: `/tmp/atlas-tractor-adjacency-v11-final/results.json`. Inspected final
GPU screenshots: `/tmp/atlas-tractor-adjacency-v11-final/1440-stop-1.png` and
`/tmp/atlas-tractor-adjacency-v11-final/390-stop-3.png`. The lower foreground lane
is still partly hidden by canopy; this does not certify an entirely visible loop.
The east turnaround also has partial tree occlusion. No size or renderer change
was used to achieve the clear rear-trailer stop. Parent reports all 38 integrated
scene checks passing with stable sources. The broad route check initially passed
11/13; its old lower-arc fixture required y>860, inconsistent with the intended
new maximum857.1648. After correcting the expected corridor to835<y<860,
the final rerun passes 13/13, including both complete-loop directions and
native mouse/touch targeting. Report: /tmp/atlas-tractor-loop-v11-browser.md.

Frozen geometry SHA256:
`68a652a5a660512e6f182799822c1cdfe3e4cbf326095cc5c6ec6f349b048753`.
Handoff: `/tmp/atlas-tractor-lane-v11.md`. No commit or push.

## Historical V10

## V10 modest north tightening

Only the encircling road's north arc and approach change from approved v9
`6132a6a`. North moves from y=644 to y=658; south y=875 and east x=1505 stay
fixed. Revised north guide points are (1458,672), (1400,658), (1340,658), and
(1296,664), with the same eight-sample quadratic corners. The outer road is
699.8458px versus 713.3326px, a 13.4868px / 1.8907% reduction. This is a small
visual trial; it does not change travel speed or controls.

All eight previous route objects and both connection points remain exact.
All 24 focused route and junction tests pass, including full-body clearance
>=14px, foot clearance >=20px, and heading <=25deg over every 0.75px phase.
Measured full-body gaps remain 15.000448px vehicle and 16.000768px picnic.
Banner centerline gaps are 62.000128px at (1360,720) and 61.822452px at the
(1348,720) fallback, both above the 17+6px reserved radius. The derived graph
has 616 edges / 606 nodes; nine routes and seven rounded branches remain.

[Comparison survey](/tmp/atlas-tractor-v10-survey.png) and
[handoff](/tmp/atlas-tractor-v10.md). Independent Chrome WebGPU verification
passes all 38 checks on desktop and two emulated phone widths, with stable
sources, unchanged banner visibility, full-body clearance and native story
return. Results: /tmp/atlas-tractor-scene-v10-review.md.
Normal canopy occlusion and inferred woodland-ground limitations remain.

## Historical V9

## Tractor encircling road

The nine-route network adds `tractor-encircling-loop` and retains all eight
approved a17f870 route objects byte-for-byte at the JSON level, including the
west bypass. The new road forks from the lower approach at (1204.16,845.65),
passes south and east of the vehicle, then returns above the raised boom to the
west approach at (1264,674). Tractor (1248,820) and picnic (1260,642) remain
exact degree-two arrivals; neither becomes a removed branch center.

The user authorized a true circle around the vehicle, including a modest outer
passage inside the map. The full directional sprite envelope remains clear of
the conservative vehicle polygon, including the boom, by at least 14px. The
perimeter stays within x<=1505 and y<=875: it is an inferred woodland passage,
not a claim that the original art contains a continuous painted dirt road.
The existing vegetation/depth treatment still owns canopy occlusion.

The new 100-segment baked road uses quadratic corners with eight samples per
corner and at most 28px setback. Two 24px branch trims use the existing motion
engine. There are now seven three-way junctions, 324 logical segments, and
618 derived edges / 608 active nodes. Unit budgets increase to 350 logical
segments and 650 derived nodes to cover this measured addition. The 12.1deg
local heading and 25deg per 0.75px travel bounds are unchanged. All 42 directed
branch approach/exit plans are exercised, including both new forks.

V9 review artifacts: [survey](/tmp/atlas-routes-v9-survey.png),
[tractor detail](/tmp/atlas-tractor-v9-survey.png),
[handoff](/tmp/atlas-tractor-loop-v9.md), and
[browser evidence](/tmp/atlas-tractor-loop-v9-browser.md).
No motion engine, UI, banner, renderer, or occlusion change belongs to this pass.
No commit before parent review.

## Historical V8

## Derived rounded junctions

V8 retains every v7 logical route coordinate and story/tractor return coordinate.
`atlas-motion.js` builds an opt-in rounded navigation graph once at creation:
five three-way branches become three pairwise cubic portal connections each;
nine sharp two-way bends are rounded, including four exact return/POI anchors.
The east-bridge dogleg is consumed with its branch spokes. Navigation and dashed
trails use the same 479 derived edges and 472 active nodes. No per-frame curve
generation, renderer change, new dependency or occlusion change is introduced.

Default spoke trim is 14px; west bridge uses 26px with chord-limited handles.
East bridge uses 44px and asymmetric handles; the elder turnaround is widened,
and the lake endpoint dogleg is replaced with two authored curves through its
exact anchor. These three corrections address independent normal-time motion
failures that per-segment tessellation checks did not detect.
All 30 ordered branch approach/exit plans and 18 ordered two-way portal plans
pass a 12.1-degree sampled heading bound. Removed branch centers retain no
central spokes. Exact story returns, tractor cycle and no-new-leaf checks pass.
Synthetic `graphFor(routes)` callers remain unchanged unless options are supplied.

Current focused units, including occlusion: 45 passed, four skipped, no TODOs. Every external branch pair and
all protected anchor journeys pass a 25deg heading limit over 0.75px travel at
every phase. Tractor's 26.66deg worst phase was fixed with an 8px anchor trim;
the limit is unchanged. Full sprite clearance and no-extra-water
crossing tests pass. The earlier 11/11 browser smoke is historical. Final independent
browser verification passed 38 directed approach/exit plans and normal-time motion:
maximum measured heading changes were 15.70deg at east bridge, 14.44deg at the
Elder, 10.88deg at the lake and 10.35deg at the tractor. Mobile-viewport east
bridge also measured 15.70deg. All 479 derived edges passed full-sprite clearance
checks (16.11px vehicle, 25.87px picnic against the independent review polygons).
The graph was built once; paused draws/uploads and new steady-state requests
were zero. These browser measurements use Mac Chrome, not a physical phone.

- [V8 implementation handoff](/tmp/atlas-junctions-v8.md)
- [V8 derived overview](/tmp/atlas-routes-v8-survey.png)
- [V8 browser smoke](/tmp/atlas-junctions-v8-browser.md)
- [Final independent review](/tmp/atlas-junctions-v8-review.md)

Approved road and occlusion checkpoint: `ebe1d72`. The rounded-junction changes
are saved separately; no remote publication is part of this pass. Inactive dash
phase can still have small discontinuities at derived joins; selected moving
trails use continuous journey offsets. The source depth remains approximate.

## Retained V7 Survey

Eight routes, 224 baked segments. The lower Home road continues through tractor
(1248,820), west of the vehicle, to picnic (1260,642), then through the existing
bridge network back to Home. Tractor is a degree-two navigation point with no
terminal-leaf exemption. The prior seven routes retain their exact coordinates,
identities and provenance; the bypass alone has v7 survey provenance.

## Survey and curves

The parent reviewed and approved the west woodland bypass over the original
artwork. Its guide points are (1248,820), (1248,804), (1238,786), (1230,766),
(1234,738), (1260,712), (1264,680), (1264,660), (1260,642). Local quadratic corners
with at most 10px setback are baked offline into 29 segments. Runtime planning,
walking and dashed strokes use those same points; no curve engine was added.

The passage runs behind the west fence and conifer canopy. Hidden ground is
inferred, not certified as a continuous visible dirt path. Correct vegetation
and fence occlusion belongs to the rendering worker. No new coastal return,
eastern vehicle detour, bridge artwork or road artwork is introduced.

The first two routes retain their strict v2 trace source. The previously
resurveyed picnic approach, gold shortcut, blue outer route and lower woodland
road retain v6 provenance. The new bypass is `manual-original-art-survey-v7`
from `shire-v1.png`. Generated v3 remains rejected historical material.

## V9 Integrated Verification

The route, motion, occlusion, grounding and surface suites pass 58 tests, with
four opt-in browser tests skipped. The motion suite traverses all 42 directed
branch pairs. Separate Chrome WebGPU checks pass 13 route cases and 38 combined
scene cases across desktop, 390px and 320px phone-sized viewports, including
native story opening and map return. These are emulated phones, not devices.

The tractor banner footprint at [1360,720] (small-phone fallback [1348,720])
clears every derived edge by at least 75.6 map pixels. Ground-ring calibration
is local to banners; source normals and depth remain artistic estimates.
The pre-existing Home banner visibility failures are outside this focused fix.
Integrated report: /tmp/atlas-tractor-scene-v9-review.md.

## V7 Verification

Geometry and motion tests: 28 passed, four opt-in browser tests skipped.
All nine geometry tests pass, including tractor degree >=2 and cycle membership,
two simple journeys to Home/picnic, no unapproved leaves or dangling loops,
planner reachability, compact west passage and bounded turning angles.

Every production graph segment is checked against independently surveyed picnic
and vehicle polygons using the full directional-sprite swept rectangle: >=20px
foot clearance and >=14px sprite clearance. Current maximum extents are 28px
left, 28.11px right, 57.06px above and 1.06px below the foot. The conservative
vehicle outline includes wheels, trailer and raised boom. Full sprite checks
also include picnic furniture, food and blanket. These are manual polygons,
not complete terrain/tree/rock collision masks.

The v7 asset audit passes. Original trace alignment remains 194/194 and 375/375
samples for Home/lake and lake/elder. The lower road's inferred hidden-ground
limitation remains; its visible water-channel check passes.

Focused Chrome WebGPU verification: 11/11 passed in 27.99s, using 1440x1000 and
390x844 touch viewports. Minimum full-sprite clearance is 15.8935px to the vehicle
and 16.0008px to picnic. Tractor degree is two, on a cycle; Home is the only leaf.
It checks native lower-road targeting, actual Home-to-tractor arrival, then
actual tractor-to-picnic and picnic-to-tractor walking with intermediate and
arrival screenshots. Playwright accelerates the test clock; production motion
and geometry are unmodified. Results: [/tmp/atlas-routes-v7-browser.md](/tmp/atlas-routes-v7-browser.md).
Occlusion changes are independently owned and are not certified by this route
geometry report.

## V7 Frozen Artifacts

Geometry SHA-256:
`e34dceec653d71d707e9898741032cc6f2f217a58a00fd5ff5f1990d0e7b7795`.

- [Original-art survey](/tmp/atlas-routes-v7-survey.png)
- [Geometry handoff](/tmp/atlas-routes-v7-geometry.md)
- [Offline bypass guides and baker](/tmp/atlas-v7-bypass.cjs)
- [Browser screenshots](/tmp/atlas-route-network-v7)

The survey was refreshed from frozen production geometry and checked nonblank.
Earlier v4/v5/v6 results are historical. No commit or push.
