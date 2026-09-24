# Three-room illustrated tour review

The continuous-panorama revision is the strongest local review candidate. It removes the broad table/floor cuts, split bathroom window/tub/rug and doubled bedroom doorway seen in the initial atlas attempts. It still has visible limitations and is not approved chapter art or an exact reconstruction of the Blender geometry.

## What was inspected

The actual tour renderer supplied paired gray/illustrated screenshots for all twelve cube-edge directions and six face centers in each room: 36 edge comparisons and 18 center comparisons. The art lane inspected these in paired contact sheets and inspected the remaining bedroom ceiling defect in the original screenshot. Pole views use the viewer's 89° pitch limit. Exact input and screenshot SHA-256 identities, observations per edge, and external evidence paths are in [continuous-v1.json](continuous-v1.json). This is a bounded visual sample, not a pixel-by-pixel or all-angle certificate.

| Room | Improvement | Remaining issue |
|---|---|---|
| Common | Continuous table, stools, floor and ceiling; wooden tub glimpse; one leaf per visible doorway | Soft raster, faint wall bands; stove height and some furniture silhouettes drift from gray |
| Bath | Window, tub and braided mat no longer break at former face joins; coherent return doorway | Tub/window trim alter silhouettes; added timber cornice/posts are not matched by the common-room finish |
| Bedroom | One return leaf replaces doubled doors; bed/floor joins and low stove glimpse repaired | Narrow ceiling/wall discontinuity at rear wrap, visible in `bedroom-illustrated-up.png` and `back-up`; bed/frame proportions approximate |

The warm wood, cream plaster, olive doors and textile treatment form a convincing shared palette. Door openings remain recognizable against the gray views and the selected tour is usable for feedback. Matching the broad aperture does not certify exact hinge, leaf silhouette, furniture size, or cross-room light transport. Switching fixed stations is not free camera translation through a textured 3D model.

## Failed atlas approach retained

The first approach stylized a complete 3×2 atlas in one call per room. It did not generate six faces separately, but imagegen still treated some panels as independent compositions. Common V1 moved the table under the camera, changed the closed front door into plaster and added incorrect bathroom detail. V2 repaired those features but introduced a white tub; V3 fixed its wood material. Bathroom V1/V2 retained broad window, tub and floor/mat discontinuities. Bedroom V1 had two incompatible doorway leaves across back/left and ceiling/bed cuts. These failures are preserved in the earlier generation records and review directories; they are not accepted simply because a sampler can render the atlas.

Actual returned atlas dimensions were **1536×1024**, despite the requested 3072×2048. The strengthened `bedroom-v2` atlas prompt was prepared but **never executed**: the method changed first. Historical point reviews may say a complete edge pass was pending; the later continuous review supersedes that status only for the selected continuous version, not for old artwork.

## Selected method and evidence

1. Keep the same frozen Blender scene, three measured camera origins and internal door states.
2. Reproject each gray atlas and its latest illustrated candidate mathematically to one continuous 3072×1536 equirectangular image.
3. Give those two whole-sphere images to one built-in imagegen call: gray is geometry authority; illustrated input supplies materials and the defects to repair. Exact prompts and ordered inputs are under `generation-jobs/*-panorama-v1.json`.
4. Preserve the returned **1774×887** originals, not the requested 2048×1024 size. Deterministically convert to 512-pixel cube faces and lossless WebP; do not paint seams in conversion code.
5. Review the result in the real viewer against gray. All three selected candidates are `reviewed-proposal-remaining-issues`.

Reprojection's direction, edge and roundtrip tests establish that the conversion is mathematically consistent. They do **not** establish that imagegen retained geometry or painted every seam correctly. The bedroom wrap defect demonstrates that distinction. No further art calls were made after this review.

Raw candidates, reprojections and full screenshot sets remain on the mini SSD under `pinpin-house-tour-20260923`; source records retain their identities. This experiment did not change approved chapter images or the live book.
