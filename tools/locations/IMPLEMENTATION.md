# Reusable location rendering workflow — 2026-09-23

Implemented `cli.py` commands `build`, `render`, `cubemap`, `prepare`, `import`, and `validate`, backed by a pinned source recipe and the canonical `docs/storyboard/locations/pinpin-house/` package. The actual jobs ran on the mini with Blender 4.5.14 LTS; no dated external Blender scene is required to rebuild. `README.md` contains executable commands, camera conventions, dependencies, and the imagegen handoff.

## Executed evidence

All heavy artifacts are under `/Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/`.

| Output | Verified result |
| --- | --- |
| `common-still/build/build-manifest.json` | Source-built `base.blend`; positive structural volume; zero nonmanifold wall edges |
| `common-still/render-manifest.json` | Common-room still, 1400×1000 |
| `door-open/render-manifest.json`, `door-closed/render-manifest.json` | Identical camera and scene; actual hinged leaves at 75° versus 0° |
| `common-cubemap/cubemap-manifest.json` | Common origin [1.1, −1.8, 1.15] m; bath/bedroom doors 75°, front 0° |
| `bath-cubemap/cubemap-manifest.json` | Bath origin [−2.4, 2, 1.15] m; doors closed |
| `bedroom-cubemap/cubemap-manifest.json` | Bedroom origin [1.45, 1.2, 1.15] m; doors closed |
| `render-evidence.json` | All three atlases: six true 90° cameras, one origin per set, same base scene, every decoded tile exactly equals its source face |
| `review-webps.json` | Six review derivatives preserve decoded RGB bytes; dimensions and SHA256 recorded |
| `door-state-test.json` | Actual Blender function: repeated closed→open and repeated open are idempotent; front door retains outward negative swing |

All selected build/render/cubemap manifests validate against current source inputs. Atlas resolution is 3072×2048 with six 1024×1024 faces, ordered top front/right/back, bottom left/up/down. Pure standard-library PNG assembly avoids Blender image color-space conversion and has no Pillow dependency. The first closed common cube remains in `common-cubemap-closed/` as superseded evidence; its staged source captures that old job. It is not the selected example.

`python3 -m unittest discover -s tools/locations/tests -v` passes five meaningful tests: camera rejection, door-angle rejection, malformed/escaped/tampered manifest rejection, exact atlas tile order/pixels, and all twelve paired cube edges. Rendered camera records include matrices, quaternion, lens, dimensions, and basis vectors. Invalid interior camera locations and solid-surface proximity fail before rendering.

## Reproducibility and image generation

C independently restored the six scoped assets into a fresh root, validated nine jobs, validated a relocated actual render, and successfully prepared/validated its imagegen handoff. Evidence: `docs/storyboard/locations/WORKFLOW-REPORT.md` and `portability-check.json`; external `pinpin-location-portability-20260923/`.

The parent completed a real `prepare` → built-in `image_gen__imagegen` → `import` → `validate` run in canonical `examples/illustration-demo/`. Runtime code was frozen before that import. The illustration remains a proposal requiring visual revision (an extra counter appeared), not automatically approved geometry. The CLI only emits the exact prompt/reference bundle and records a returned image; it never invokes a paid image API or claims a tool invocation that it cannot perform. Imported provenance metadata is operator-supplied, not an attestation.

## Geometry and limitations

The original plan, floor, walls, and furniture remain pinned. Reversible ceiling closure, exterior ground/tree markers, and three interior fill lights reside in `05 Inferred panorama supplement`, with configuration recorded in the build manifest. These are explicit rendering assumptions, not newly established book canon.

This is a gray structural guide. Window openings and exterior markers are deliberately simple; the roof closure is not a detailed roof design. The opened bedroom leaf genuinely occludes part of the adjacent-room view from the matched hall camera; it is not hidden to make an impossible sightline. Camera clearance is not a claim of adult accessibility through the narrow bathroom door.

No prior production pack, live menu, chapter artwork, or published release was changed by this lane. Browser review, canonical example copying, archive policy, and publication belong to their respective lanes.
