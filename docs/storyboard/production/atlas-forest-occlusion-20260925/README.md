# Forest Occlusion Review

**Published and live-verified:** [Open the atlas](https://mr-pinpin.github.io/storyboard/atlas-webgpu.html).
See the [publication record](publication.md) for release/source identities,
preservation proof and rollback, and [live verification](publication-verification.md)
for desktop/mobile movement, actual home entry, reader returns and asset checks.

## Local Review History

Frozen review 57791 remains available. Three scenarios visually reviewed;
89 Node tests and 21 compiler tests pass. The 12 house/tractor regression poses,
desktop Space capture and mobile movement smoke pass. These are the original
local-review results; existing review services remain untouched.

Frozen source: `2012b39c412397a0475f0dba7f227b382804e7c0a1493485ddd7999da0c73f99`.
Served renderer and texture hashes match the tested candidate. See verification
for exact evidence and limits; navigation and animation are unchanged this turn.

[Final review target](http://127.0.0.1:57791/storyboard/atlas-webgpu.html?spriteTrial=1&spriteSet=video&lang=en&gait=regen&sandbox=1&reviewCapture=1)

## Architecture

- Image generation proposes a registered canopy annotation, not replacement art
  or recovered geometry. Software compiles and validates it, preserving original
  proposals, versioned outputs and hashes.
- The existing categorical instance texture now uses B0 for opaque foot-profile
  ordering and B1 for authored canopy pixels. B1 can cover previously unclassified
  ID0 pixels; it is not an ID0-wide fallback. R IDs stay unchanged.
- B1 uses the existing spatial depth comparison and shared nine-tap sample, with
  each character's own foot depth. Coverage changes spatially, with no added
  whole-character fade. B0 preserves house, vehicle and low-bush profile ordering.
- Protected labels live in reviewed authoring data. There are **no runtime object
  names, special instance IDs, GPS/geographic coordinate exceptions or case patches**.
  GPU occlusion stays separate from CPU SDF steering; animation and capture remain
  unchanged. Artistic DOF and existing banner ordering retain their own behavior.

Assets: `shire-object-instances-v2.png` + unchanged `shire-object-ground-v2.png`;
provenance `shire-object-occlusion-v3.json`. The PNG grows by **51217 network bytes**;
there are **zero additional GPU textures** and no per-frame CPU pixel readback.

## Evidence And Limits

The original last-pair defect was a shared root threshold switching a large
canopy overlap at once. With fixed pose/camera, the coarse step's retained-signal
drop improves from 70.77 to 5.97 percentage points (about 71 to 6). The dense 21-position
sweep is monotonic, with maximum adjacent drop 3.52 points over about 1.24 world px.
These bounded spatial measurements are not frame-rate or whole-forest guarantees.

The first scenario still retains about 22% of the sprite signal versus baseline 1%.
Not all canopy pixels are covered by the authored gate. Main's visual acceptance
does not erase that limitation or establish complete baseline equivalence.
Artistic depth remains approximate 2.5D ordering, not metric terrain/volume depth.

Parfit's candidate run: TB4
`shared/atlas-forest-occlusion-20260925/candidate-2026-09-25T05-07-20-216Z/`.
It records 34 exact poses and zero page errors. See the evolving verification report
for house/tractor regressions and final 57791 smoke/Space capture. Earlier immutable
marks, baseline replays, authored proposals and compiler outputs remain on TB4.

## Reports

- [Canopy proposal](canopy-proposal.md): exact image-generation prompt and raw provenance.
- [Textures](textures.md): classification, protected hard/low-bush labels, compiler tests and hashes.
- [Renderer](renderer.md): mechanism, B0/B1 contract, 30 focused tests, GPU fixtures and source hashes.
- [Verification](verification.md): original/baseline/candidate browser evidence and final smoke.
- [Publication](publication.md): selective release, immutable media, source branch and rollback.
- [Publication verification](publication-verification.md): candidate blocker, correction and live receipt.
- [Production runtime](publication-runtime.md): explicit defaults and home-arrival dispatch.
- [Publication assets](publication-assets.md): frozen dependency audit and exact identities.
- [Prior texture review](../atlas-texture-fix-20260924/README.md): house/tractor support profiles and CPU steering context.

Reproduction uses Parfit's `scripts/atlas-forest-occlusion-browser.cjs` on the mini
with the selected existing review service. Preserve per-run source hashes and
exact-pose checks; do not restart services or relabel old evidence as a new freeze.
