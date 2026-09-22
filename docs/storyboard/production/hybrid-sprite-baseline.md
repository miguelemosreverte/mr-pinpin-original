# Hybrid Sprite Baseline

Audit date: 2026-09-22. Reference selection only; no generation, asset replacement,
runtime changes, or new approval. Review UI deferred to the parent lane.

## Recommended Book Reference

**Use this image for face and eye identity:**

`/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-source/docs/storyboard/images/standalone/timber-tractor/scene-17.png`

Visually inspected: selected book close-up, 1536 x 1024. Brown irises, dark pupils,
visible ivory sclera crescents, shaped lids, cream face fur and brown quills.
Use the existing gaze-dependent whites, not oversized white disks. This portrait
is a face reference, not evidence of correct four-legged walking anatomy.

Provenance: `stories/timber-tractor.json` selects `scene-17`.
`images/atlas/family-proofs/pinpin-eyes-v1.md` explicitly names this same image as
its eye-identity reference, but labels that sprite trial **not approved or active**.
The named approved-six and pacing subsets in `timber-tractor-production.json`
do not include scene-17. Book selection is established; separate user approval
of this image as a hybrid sprite reference is not established.

Secondary whole-body reference, also visually inspected:
`docs/storyboard/images/chapter-02-direct/scene-10-v2.png`.
The scene-17 production shot names it for PinPin identity, not location. Its wider
composition makes the eyes less useful than scene-17. Neither reference is the
neutral static 3D candidate, whose workflow does not establish user acceptance.

## Current Runtime Versus Candidates

- Source default: `atlas-motion.js` selects single-character `natural` mode.
  `spriteMode=crisp` and `spriteMode=legacy` are explicit alternatives.
- `atlas-directions.js` contains 24 approximate heading bins, four frames each
  (96 frames), across six older sheets. Status: `reviewed-approximate-azimuths`;
  this does not certify exact 15-degree rotations.
- Family mode requires `family=1`; production art additionally requires
  `familyArt=production`. `atlas-family.js` selects the corresponding registry.
- `family-production.json` has 24 headings/four frames for each of PinPin, Mama
  and Mr. Pompom. It remains `prepared-awaiting-visual-review`, with
  `productionReady: false`. The runtime opt-in checks full-circle availability,
  not this approval flag; opt-in visibility is not production approval.
- `family-sprites.json` is the earlier candidate: four headings (15/45/75/105),
  four frames each. Runtime mirroring does not establish missing rear views.
- Also visually inspected: `images/atlas/pinpin-directions-a-v1.png` and
  `images/atlas/family-production-v1/pinpin-a-v1.png`. The older sheet has beadlike
  dark eyes; the family candidate makes eye rims/irises more readable but remains
  rounder/toy-like compared with the book close-up. The production sheet's own
  metadata says `awaiting-visual-review`, not approved. Generation prompts refer
  to a book-face input without retaining its exact path, so do not assume every
  family sheet used scene-17. Paths here are under `docs/storyboard/` unless stated.

## Gait Limits

Four distinct frames and 24 heading entries establish inventory, not a sound gait.
The existing `gait-audit-v1.md` documents limited paw displacement in several
profiles. Its corrected ear-relative PinPin 180-degree hind-toe range is 6 x 7
source pixels, with uncertainty large enough that exact freezing is unproven.
Do not repeat the earlier render-anchor Y range as body-relative measurement.

Natural motion advances from distance travelled; the four-frame phase interval
is 190 ms, with a small procedural vertical lift. These runtime effects cannot
prove each paw performs stance, lift, swing and return. Review a moving sequence
with independent body landmarks, visible-leg tracking, contact sliding, cycle
closure, heading consistency and actual 56-pixel PinPin display size. Occluded
legs cannot be certified from counts or labelled frozen from absence of evidence.
This bounded audit inspected four images; it did not remeasure the prior gait
audit or certify animation quality.
