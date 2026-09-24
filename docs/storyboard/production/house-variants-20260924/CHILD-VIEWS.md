# Child-height room candidates

Final outcome: the selected bathroom repair stack passes its focused overlap check, and both rooms retain the requested level-view occlusion.

Two new image-led viewpoints were generated with the built-in imagegen tool: one call for the bathroom and one for the bedroom. Each call edited the assembled current 3072×1536 panorama, including its selected repairs. No new Blender scene, geometry projection, crop, or camera-pitch substitute was used. The previous room assets remain unchanged.

## Result

Both candidates achieve the main visual low-eye cue in matched perspective renders at **pitch 0°**. In the bathroom, the near wooden tub wall hides all visible water; the previous view showed a broad water surface. In the bedroom, the footboard hides most of the quilt surface, and the lower bed frame reads clearly. These are useful child-view proposals for review, not calibrated translations of a measured room.

The requested eye height was approximately 0.55m, with the bathroom rim described as approximately 0.70m. These are prompting assumptions. Neither the source image height nor the resulting eye height is metrically established. A common horizontal origin and unchanged object scale were requested, but image synthesis cannot verify those invariants.

## Exact artifacts

| Room | Candidate | Native dimensions | SHA-256 |
|---|---|---|---|
| Bathroom | [bath-child-v1.png](bath-child-v1.png) | 1774×887 | `d69c9360d051ecefe5458401faf8b4976e6d7809a22c77ecdcc57e471b596891` |
| Bedroom | [bedroom-child-v1.png](bedroom-child-v1.png) | 1774×887 | `bf3f47c0d25328473c50657f002a0a62928ecc0ea11f03a92eed94a6d1c0880a` |

The literal prompts and source/output identities are recorded in [bath-child-v1.prompt.txt](bath-child-v1.prompt.txt), [bath-child-v1.generation.json](bath-child-v1.generation.json), [bedroom-child-v1.prompt.txt](bedroom-child-v1.prompt.txt), and [bedroom-child-v1.generation.json](bedroom-child-v1.generation.json). Generated originals were retained; workspace and TB4 copies were SHA-verified against them. No image resampling or retouching followed generation.

## Observed strengths and limits

- Bathroom: tub, return doorway, washstand, window, towels, plants and warm materials remain recognizable. The low perspective changes actual depicted occlusion, rather than merely aiming the browser downward.
- Bedroom: bed, wardrobe, dresser, chest, return doorway and window remain recognizable. The floral bedding/green quilt coverage changed, and some framing and object proportions drifted; this is not an exact geometry-preserving camera move.
- The initial bathroom candidate had a hard rear join through the wall/basket and floor. Three registered perspective repairs address this (see below). The initial bedroom also had a narrow wrap join; the coordinator subsequently added two rear/down repairs. A small weave curl at the pole and fine synthetic texture remain limitations. The inspected ceilings avoid the previous severe star-shaped failure.
- Both retain the established warm illustrated appearance. They remain separate review candidates; the original tour is unchanged.

## Review evidence

The actual panorama renderer comparison is [house-variants.html](../../../house-variants.html?room=bath). Reviewed paired captures are in external `pinpin-house-variants-20260924/browser-check/`: `bath-right-pair.png` and `bedroom-right-pair.png` show the central occlusion comparison; both rooms' `rear`, `down` and bedroom `up` pairs support the directional review. The UI agent owns interaction checks and the complete screenshot set. Three additional local bathroom repairs were authorized and generated after this first comparison; the coordinator separately generated two bedroom repairs.

## Bathroom continuity corrections

Three additional built-in imagegen calls preserve the lowered-eye candidate while repairing its wrap. Total for this lane: **five calls** (two room viewpoints, bathroom rear, floor and localized rug-edge repairs).

1. `bath-child-rear-input.png` is the exact yaw180°/pitch0°/FOV110° extraction. `bath-child-rear-v1.png` (1254×1254, SHA `3472decda87c686ece6ed74157175bd3baba782f5f2338d25acd42121fe218ee`) repairs the wall/basket join while keeping the tub opaque.
2. `bath-child-down-input.png` is yaw0°/pitch−90°/FOV110° extracted from the candidate **with that new rear patch already applied**. `bath-child-down-v1.png` (1254×1254, SHA `afa79cf1ca32cfeca40dcd4f9a978825d28173f3324b4f9585a32fb810e23115`) repairs the floor join and the ruler-straight chopped mat boundary.

Each has a literal `.prompt.txt` and `.generation.json`; extraction records retain the exact sources and projection convention. Face inspection shows continuous plaster/basket weave, floorboards and a curved rug boundary. However the actual assembled overlap at yaw180°/pitch−40°/FOV80° still contains the rear patch's straight upper rug edge transitioning into the down patch's new curve. This intermediate state left a visible kink and softened/doubled weave near the basket (`browser-check/bath-edgerear-pair.png`). The rear wall and nadir improved, but that intermediate overlap failed; the later localized detail resolves it. No further call was made within the initial two-repair authorization. The original candidate and both extracted inputs are preserved.

3. After the first two repairs failed their overlap check, the root authorized one further local edit. `bath-child-join-input.png` was extracted from the **full current base+rear+down stack**, yaw180°/pitch−0.7rad/FOV90°. `bath-child-rug-v1.png` (1254×1254, SHA `1ba0ebfa8099a608c11795651c8ce741d16d9d35c9c9001baed607a1a96046c1`) repairs only the cut/soft double weave below the basket. Its registered detail is applied after the main repair stack, with a local mask. Face inspection shows a coherent curved mat edge and continuous surrounding boards; the final assembled detail passes focused review. All earlier attempts remain preserved.

## Final selected-stack check

The report author inspected actual final browser captures bath-joincenter-pair.png, bath-joinleft-pair.png and bath-joinright-pair.png after the UI agent selected the local mask [-0.04,-0.03,0.26,0.38]. The curved mat edge is continuous, without the earlier hard cut or doubled weave. The refreshed bath-right-pair.png confirms the level camera still shows no water. These captures live in external browser-check/. No further generation is needed for this reviewed prototype. The initial failures above describe retained history, not unresolved selected bath defects.

Entire variants experiment: nine image calls (this lane five; coordinator four: common room plus down, bedroom rear plus down). Original tour artwork is unchanged. This remains an inferred illustrated eye-height experiment, not a verified 3D translation.
