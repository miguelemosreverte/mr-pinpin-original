# Illustrated image-tour review

**Outcome: a useful, visually cohesive three-room prototype ready for user feedback.** [Open the tour](../../../house-image-tour.html). The new doors make the bathroom and bedroom discoverable from the preferred common-room illustration. The repaired private rooms retain the same warm timber, cream plaster, plants, lanterns and woven textiles; no gray blockout or conspicuous faceted render has replaced the illustration.

Reviewed selection: historical A common base/front/up/down plus `common/rear-v1.png`; bathroom `panorama-door-v2.png` plus `front-v1.png`, `rear-v1.png`, `down-v3.png`; bedroom `panorama-v1.png` plus `rear-v1.png`, `down-v1.png`. The five private repairs were confirmed active in the actual browser snapshot. These are live registered perspective textures, not a newly built Blender house.

## Observed art

| Area | Observation | Result |
| --- | --- | --- |
| Common room | Original front, stove/bookcase, roof and rug remain recognizable. Two rear doorways read as bath/bedroom; no obvious old table ghost or doubled furniture in the center and side blends | Suitable prototype |
| Common rear boundaries | Side and upper transitions remain coherent. The rear/down floor retains the subtle rectangular/tonal discontinuity already visible in historical A | Minor inherited residual |
| Bathroom | Low wooden tub, braided mat, round clear-center window, washstand, towels and herbs read as the bedtime bathroom. The tub remains distinct from the floor and surrounding props | Recognizable room |
| Bedroom | Wooden bed, green quilt, pillows, bedside lanterns and warm storage furnishings are consistent with the intended bedtime room | Recognizable room |
| Private rear wraps | The conspicuous straight vertical joins in the first panoramas are no longer apparent in the repaired rear-center views | Markedly improved |
| Private rear patch boundaries | Independent browser views at rear±50° and rear/down45° show no obvious doubled furniture or hard geometric jump | Clear in inspected views |
| Ceilings | Timber crossings remain broadly coherent, including saved near-zenith views. No additional ceiling repair was needed for this iteration | Clear in inspected views |
| Floors | The severe radial rug/tub convergence is replaced by readable floorboards, braided mat edges and solid bed/tub forms in the near-nadir views | Markedly improved |
| Bathroom return leaf | The corrected right-hand open leaf reverses the visible hinge side relative to the common-room view as expected. The former upper tip and lower floor stump are absent in the final inspected views | Corrected in selected output |
| Door reciprocity | Common-room views show a tub and a bed in the correct destinations. Both return apertures show the recognizable green front door, two round windows and rug | Plausible pictorial connection, not measured geometry |

The original bathroom return-leaf remnants are retained in earlier captures, not hidden. A wider registered front correction in `panorama-door-v2.png` removed the upper ghost. Reprojecting that correction into `down-door-v2.png` addressed overlap with the downward texture, but a lower fragment lay outside the front source’s coverage and remained visible. One final targeted image edit produced `down-v3.png`, removing the floor stump. Independent final browser views confirm the stump is gone while the intended right leaf, mat and tub remain coherent. This is the practical lesson: projection can carry existing corrected pixels into an overlap, but cannot supply missing corrected image content outside its source view. The result is suitable for feedback, not a claim of pixel-perfect stitching.

## Functional evidence and scope

The [UI review](UI-REVIEW.md) records all four directed transitions—common→bath, bath→common, common→bedroom, bedroom→common—at1500×1050 and390×844, using native mouse/touch. It also records drag-on-door suppression, mobile pinch, keyboard focus/reveal/Enter, Back/Forward, Reset, viewport bounds and no JavaScript errors. Recovery evidence separately records fullscreen, context loss/restoration and working links. After the final floor cleanup, the UI lane repeated the focused bathroom→common transition successfully. These are the UI lane’s functional results, not a duplicate gesture suite by this art-review lane. No multilingual acceptance claim is inferred from those checks.

This lane independently opened the actual repaired browser renderer at1200×900 and captured six private-room repair-boundary views. The snapshot confirms the three bathroom repairs and two bedroom repairs were loaded. After final selection I independently captured the lower-front bathroom view and near-nadir again, with `panorama-door-v2.png`/`down-v3.png` confirmed in the browser snapshot. I also visually inspected the UI lane’s common-room center/sides/ceiling/floor, private arrivals, return doors, rear centers, near-zenith/nadir and bathroom front-boundary screenshots. A working link is kept separate from visual reciprocity.

## Evidence

External root: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-image-tour-20260924/`.

- `independent-review/snapshots.json`: selected actual browser assets and repair activation.
- `independent-review/{bath,bedroom}-{rear-left,rear-right,rear-floor}.png`: six independent final-state boundary captures,1200×900; yawπ±50°/pitch0 and yawπ/pitch−45°,FOV72°.
- `browser-check/common-{doors,left,right,floor,up}.png`: common replacement and surrounding retained A illustration.
- `browser-check/1500-{bath,bedroom}-arrival.png`: room identity and staging.
- `browser-check/final/{bath,bedroom}-{door,rear,up,down}.png`: five-repair selection, plus `bath-front-upper.png` for the identified remnant.
- `independent-review/bath-selected-{front-lower,down}.png` and `bath-selected-snapshot.json`: independent final cleanup confirmation. Earlier `bath-final-*` files retain the failed deterministic-only state.
- `browser-check/final/bath-{lower,down,rear}-selected.png`: UI lane’s final selected captures.
- `browser-check/results.json`, `recovery.json`: functional evidence. Initial uncorrected captures remain outside `final/` and must not be mislabeled as selected repaired results.

Nine image-generation calls were used in this iteration: one new common rear view, two whole private-room panoramas, five initial targeted corrections, and one final floor cleanup. All eight initial generated masters plus the ninth cleanup master are retained. Two deterministic coverage derivatives are separate processing outputs, not extra model calls. This was an iterative build, not a one-shot whole-house generation. No new Blender scene was made. Historical A’s Blender ancestry remains acknowledged in the [workflow](README.md).

This is fixed-point viewing with clickable node transitions, not free camera translation through a metrically consistent three-room interior. The two return vistas are recognizable illustrations of the common room; their exact sightlines, sizes and object placements are not certified by a shared model. The canonical location pack and approved story artwork remain unchanged. No final user approval, commit or publication was performed by this review lane.
