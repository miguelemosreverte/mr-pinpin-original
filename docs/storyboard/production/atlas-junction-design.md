# Atlas junction design

Requested by Miguel on 2026-09-21. Approved road/occlusion checkpoint: `ebe1d72`.

## Visual rule

Treat turns like roads for fast-moving vehicles. Three-way junctions should use
rounded triangular connections: smooth approaches, gentle merging and branching,
and no abrupt pivot at a common center. Tight loop shapes should become rounded
where the terrain permits. This is navigation geometry, not merely a stroke style.

## Constraints

- Walking and dashed trails must share the same centerlines and travel direction.
- Preserve the Home, tractor, picnic, bridge loop and all story return locations.
- Keep full character clearance from the tractor, picnic furniture and food.
- Do not introduce a water crossing, edge exit, or road through a building.
- Trees still occlude both the character and trails along hidden woodland ground.
- Build reusable geometry once; do not rebuild curves or graphs every frame.
- A physically constrained turn needs an explicit exception, not a silent shortcut.

## Review locations

The current three-way centers in 1536-by-1024 map coordinates are `(378,732)`,
`(552,691)`, `(873,606)`, `(1032,581)` and `(1094,524)`. The west bridge junction
at `(873,606)` has two nearly parallel approaches and deserves special review.
Also inspect the two-way tractor connection at `(1248,820)`.

For each junction, verify every approach/exit pair in both directions, inspect
the actual rendered trail and character movement, and check obstacle clearance.
Passing connectivity tests alone does not establish a visually smooth turn.

Measure heading change over traveled distance as well as between sampled curve
vertices. At 44 map pixels per second, an ordinary 60 Hz frame travels about
0.73 pixels. Dense samples can conceal an extremely small turning radius: the
first review found a 107-degree turn within one normal frame despite each curve
segment changing direction by less than 12 degrees. Test normal-speed movement
and preserve that failure as a physical-curvature regression.
