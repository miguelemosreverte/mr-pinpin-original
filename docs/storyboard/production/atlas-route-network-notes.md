# Atlas route network v8

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
