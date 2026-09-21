# Atlas route network v7

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

## Verification

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

## Frozen artifacts

Geometry SHA-256:
`e34dceec653d71d707e9898741032cc6f2f217a58a00fd5ff5f1990d0e7b7795`.

- [Original-art survey](/tmp/atlas-routes-v7-survey.png)
- [Geometry handoff](/tmp/atlas-routes-v7-geometry.md)
- [Offline bypass guides and baker](/tmp/atlas-v7-bypass.cjs)
- [Browser screenshots](/tmp/atlas-route-network-v7)

The survey was refreshed from frozen production geometry and checked nonblank.
Earlier v4/v5/v6 results are historical. No commit or push.
