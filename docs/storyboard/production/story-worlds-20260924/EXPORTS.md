# Story-world projection exports

This experiment uses image-led panoramas and deterministic projection; no new Blender geometry is used. The selected kitchen/table stack supplies the Elder style reference, not a canonical floor plan for a new scene.

## Delivered bootstrap

`kitchen-bootstrap.png` is the complete selected kitchen/table panorama at 3072×1536, including the generated down repair. SHA-256: `fbf70ac4415fbc9e63febdc756af4a512ee9b7cd29e693fa4423e65608178184`. The original base and repair are unchanged. This export samples the existing normalized runtime blend; its larger raster does not add detail to the original artwork.

The frozen input job is `projection/kitchen-bootstrap.json`; output evidence is `projection/kitchen-bootstrap-result.json`. Heavy working files live at `/Volumes/TB4/mac-mini-storage/shared/pinpin-story-worlds-20260924/`. Source images are retained there and exposed through individual source links.

Reusable commands and the exact projection contract are in `tools/panoramas/README.md`. `project.py assemble`, `extract`, and `export` respectively produce an assembled sphere, a requested ordinary perspective, and a full download set. Each operation records identities and camera parameters.

## Final-scene contract

Scene IDs are `elder`, `lake`, and `tractor`. Each selected actual stack is exported to `<scene>/panorama-assembled-v1.png`, six `faces-v1/*.png`, `cube-atlas-v1.png`, and `exports-v1.json`. Viewer derivatives may be lossless WebP with decoded-pixel equality checked separately.

Atlas tiles are `[front,right,back; left,up,down]`, six 90° faces. World +Y is front, +X right, +Z up; panorama front is center, rear wraps left/right. Each manifest records all face direction/right/up vectors. Check twelve identical-ray boundaries and each atlas tile's identity against its individual face. These checks establish mathematical consistency only. Painted wrap lines, pole pinches, object changes and repair overlap must still be inspected in the viewer.

No prior outdoor full-sphere reference was found by the targeted existing-file name search; ordinary chapter imagery remains a separate style/content reference. This is not a claim that every archived experiment was exhaustively searched.

Initial Elder, lake, and tractor stack jobs are recorded under `projection/*-stack-v1.json`. Their rear diagnostic inputs use yaw 180°, pitch 0°, square FOV 110°, 1400 pixels; each has its own adjacent provenance record. All three final exports are selected after viewer review. Existing tours, old generated masters and previous preservation manifests remain unchanged.

## Selected Elder export

`projection/elder-final.json` pins base v1, rear/up/down v1 and registered rear detail v1. Cardinal patches use FOV 110°, front mask `[0,0,2,2]`; the detail uses yaw π, pitch −0.7 radians, FOV 90°, mask `[-0.05,0.10,0.32,0.36]`. This is the exact reviewed live stack. A slight rug-weave scale transition remains disclosed in the visual review.

`elder/exports-v1.json` records the 3072×1536 assembled panorama, six 1024² PNG faces and 3072×2048 atlas. All twelve identical-ray boundary tests and all six face/tile identity checks passed. `elder/webp-v1.json` records lossless `cwebp -lossless -exact` conversion and decoded RGB equality. Projection ran on the mini; this bounded encoder step read and wrote TB4 through the Air because its verified encoder was already available. No originals were modified.

## Selected lake export

`projection/lake-final.json` pins panorama v2 plus rear/up/down v2, generic FOV 110° and front mask `[0,0,2,2]`, with no registered detail or custom directional mask. The first panorama and its first rear repair are preserved trials, not mixed into the v2 stack. Actual viewer review passed the rear join, poles, rear/up, rear/down and front/down overlaps with minor detail-softness variation disclosed.

`lake/exports-v1.json` and `lake/webp-v1.json` record the same delivery sizes and checks as the Elder set. The download suffix `v1` means this is the first assembled download edition; the provenance explicitly identifies v2 artwork inputs.

## Selected tractor export and final checks

`projection/tractor-final.json` pins panorama v2 plus rear/up/down v2 with standard FOV 110°, front mask `[0,0,2,2]` and no detail or custom mask. Actual viewer review passed rear and pole views plus oblique overlaps and the machine side. Earlier v1 artwork remains a separate retained trial.

All three scenes have `exports-v1.json` and `webp-v1.json`. All 36 shared-edge checks, 18 face/tile comparisons and three decoded WebP/PNG equality checks passed. Raster delivery sizes are identical across scenes; they are resampled export sizes, not a claim that the original model produced that resolution. Final input and output identities are summarized in `projection/final-check.json`.

Tractor WebP encoding moved to a small isolated Pillow 12.3.0 / libwebp 1.6.0 environment on the mini when the Air’s SMB mount stalled; the encoder settings and decoded RGB equality are recorded. Elder and lake used the existing `cwebp` encoder with TB4 input/output. No original generation was recompressed or replaced.

The scoped archive covers all 58 media and verifies 17 generated master identities against their generation records. See `assets/story-worlds-archive.md`. Private session logs are absent. Metadata transferred through SSH during SMB recovery; completed media remained on the mini.
