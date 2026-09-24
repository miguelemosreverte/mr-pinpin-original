# Connected house tour — art direction

The target is the rich, warm **prior refined illustrated panorama**: `room-panorama-v3.webp` displayed with its four front/rear/up/down repairs. The plain gray model is composition evidence, not the desired finished aesthetic. The older unified cubemap remains a different experiment and is not this benchmark.

I inspected the panorama and all four repair images, plus the approved common-room arrival05, bathroom bedtime08 and bedroom bedtime17 stills. Verified paths, dimensions, SHA-256 and specific roles are in `references.json`.

## What carries forward

Honey-colored timber with readable grain and rounded crafted edges; creamy plaster; soft warm light and filled shadows; restrained olive door paint; dark iron and small brass fittings; tactile woven textiles. The older image has appealing material richness and a coherent cozy atmosphere. Carry this into all three rooms without copying its old floor plan, old camera projection, large central rug or extra furniture.

The historical v3 record explicitly names a Blender spherical guide. The benchmark is therefore described accurately as a refined image-generated illustration of an earlier room, not as the current measured house or proof of unconstrained image generation. Its raw equirectangular image still shows problems at the poles/rear; the repair-composited viewer is the intended comparison.

## Reference hierarchy

1. **Current room’s gray whole atlas**: sole authority for geometry, silhouette, viewpoint, apertures, leaf angle and what can be seen in adjoining rooms.
2. **Prior equirectangular panorama**: global material/lighting/illustration quality only. It is not a cube atlas and must never determine tile framing.
3. **Prior front repair**: local material/finish quality only. It is a110° perspective image, not a90° cube face to paste into the output.
4. **Room-specific book still**: common-room finish, broad low tub/mat/washstand design, or wood bed/quilt design. No book characters or old staging are copied into this empty tour.

The rear/up/down repairs are retained as benchmark evidence; they need not all be passed to every generation. Sending many conflicting old layouts would increase the risk of overwriting the current geometry.

## One house, one finish specification

| Item | Shared treatment | Geometry restriction |
|---|---|---|
| Walls and ceiling | Light cream plaster, soft finish | Keep current surface profile; no copied old vaulted roof |
| Floor and wood fixtures | Honey-brown oak, readable restrained grain | Floorboards run world+Y; same scale across thresholds |
| Door leaves | Restrained olive green, dark iron, one small visible brass knob | Current hinge, angle, aperture and frame stay fixed |
| Stove | Matte charcoal iron, restrained ember treatment | Existing low rounded proxy; never a barrel/new fireplace |
| Bookcase/table/counter/stools | Warm oak; books contained on existing shelves | Existing fixture counts and positions only |
| Bath | Broad low stave tub with dark hoops; cream basin | Current footprint/height and washstand position |
| Bath mat | Muted terracotta/ochre/cream/charcoal braid | Existing fitted oval only; no giant common-room rug |
| Bed | Warm oak, fitted sage quilt and cream pillows | Existing bed volume and north headboard |

This is a proposed consistent finish assignment grounded in the supplied references, not a claim that every color was canonically specified in the old book. No new bench, cabinet, counter, lamp, plant or free-standing prop is authorized by these prompts. Furnishing semantic labels are in the prompt text only, never painted on the image.

Both internal doors are open75° in every room. The front door remains closed0°. The outdoor recess between bathroom and bedroom is not an interior corridor. The common room connects to each private room; the private rooms do not connect directly. An open doorway must reveal the same neighboring room, using only the portion visible along the guide’s rays. A convincing-looking but invented counter beyond a doorway is a failure, as learned from the earlier still demo.

## Current cameras

All origins are meters in the same unchanged world frame, +Y north and +Z up:

- Common `[-1.3,-1.3,1.15]`: moved within the actual common room for real doorway visibility.
- Bath `[-2.4,2.0,1.15]`.
- Bedroom `[1.45,1.2,1.15]`.

Geometry and portal-ray verification belong to `geometry/`. These coordinates are recorded in the generation jobs and must match the actual atlas manifests before a tool call.

## Generation and acceptance

The initial trial used one complete 3×2 atlas in one built-in imagegen call per room, not six independent face calls. Its visible panel discontinuities led to the selected continuous-panorama workflow described below. The shared prompt lock is expanded into three final room prompts. The first attachment is always the current gray atlas, followed by the explicitly identified style inputs. Record exact prompt and image hashes, actual returned dimensions and original output bytes. Do not call a paid image API from a helper script.

Before accepting an illustration, compare all six face centers and all twelve cube-edge centers against the gray guide, using the real viewer. Check opening count/placement, leaf states, furniture silhouette and rays into adjoining rooms; compare matching fixture/color identities across the three separate room atlases. Inspect ceiling/floor edges and seam corners rather than declaring success from an attractive front view. Changes to decoration cannot justify changing geometry.

A flat contact sheet or numerical hash cannot certify visual continuity. Until this inspection is complete, label each output a candidate. Record every failed seam or changed fixture in `art-review/`; root performs any image-tool correction. This pack is a local tour experiment, not approved live chapter content.

## Executed revision: one continuous sphere

The selected trial mathematically reprojects gray and illustrated atlases to matching 2:1 spheres, repairs each whole sphere in one built-in imagegen call, then deterministically converts back to the same cube convention. Prompts `*-panorama-v1.txt` and exact ordered input jobs are frozen. Actual outputs are 1774×887; earlier atlas outputs were 1536×1024. Both differ from requested dimensions, which remain documented separately.

All three continuous candidates have been inspected at six face centers and twelve edge directions each. Broad panel failures improved; narrow bedroom ceiling/wrap discontinuity, approximate fixture silhouettes and cross-room trim differences remain. See [ART-REVIEW.md](art-review/ART-REVIEW.md) and the versioned evidence matrix. These are reviewed local proposals, not exact geometry certification or chapter approval. The prepared bedroom-v2 atlas revision was never executed.
