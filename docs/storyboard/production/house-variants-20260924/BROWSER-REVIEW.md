# House variants: browser review

The separate comparison is ready for local review at house-variants.html. Its three Before configurations exactly match the current connected tour, including all selected repairs and the bathroom rug detail. No original tour, shared renderer or canonical geometry was changed.

## Selected candidates

- Kitchen: common-table-v1 plus the downward110° repair. The round table, pedestal and stools read coherently. The repair removes the original nadir leg convergence. Front, both lower sides and rear floor transitions show no obvious doubled seat, leg or rug edge in the inspected views.
- Bathroom: bath-child-v1 plus rear/downward110° repairs and bath-child-rug-v1 as a registered final detail. At pitch0 the tub side hides the water, giving a lower drawn viewpoint. The first two repairs still disagreed at the rug beside the basket; the final detail removes that cut and duplicate edge. Its registration is yawπ, pitch−0.7rad, FOV90°, mask[−0.04,−0.03,0.26,0.38]. Exact target and adjacent yaw±0.3 views pass visual inspection.
- Bedroom: bedroom-child-v1 plus rear/downward110° repairs. At pitch0 the footboard blocks much of the mattress and the underside becomes visible. The repaired rear rug/floor reads continuously at yawπ, pitch−0.7 and at yawπ±0.3, pitch−0.6.

These are image-model proposals, not measured camera translations. The lower viewpoint is supported by changed painted occlusion, not a numerical eye-height claim. Full-panorama textures are softer than the original live repair layers, and wide-angle furniture/texture shapes remain illustrated approximations. The inspection does not certify every possible angle as artifact-free.

## Functional verification

Final actual candidates pass at1400px and390px: all six current/candidate views become active, direction and field of view synchronize, native touch drag changes the camera, keyboard turning works, mobile current/candidate switching works, and no horizontal overflow or page errors occurs. Exact prompts load and the linked image, prompt and generation resources return200. Entry and configuration imports use variants-final-v2; the unchanged shared renderer is pinned to bath-rug-detail-v1.

The final browser run completed after transient Air disk exhaustion was resolved. Its profiles, screenshots and results stayed on TB4. No additional image calls were made by this UI lane.

Six frozen paired views are preserved under browser-evidence/: common-table, common-down, bath-right, bath-down, bedroom-right and bedroom-down. Additional rear/pole/boundary views, including bath-detailtarget-pair.png and private-room joinleft/joincenter/joinright pairs, remain at /Volumes/TB4/mac-mini-storage/shared/pinpin-house-variants-20260924/browser-check. Final results.json records the selected assets, repairs, detail registration and camera states.

Owned source: docs/house-variants.html, house-variants.css, house-variants.js, house-variants.config.js and this report. No commit, push or publication was performed.
