# Two earlier illustrated continuity benchmarks

Read-only audit, 2026-09-24. **The strongest recorded pair is A (September22) and F (September23).** Both achieved a substantially coherent illustrated 360° viewing experience after localized perspective repairs. Neither historical review claimed pixel-perfect stitching. This is the most plausible interpretation of “twice” from the recorded chronology and visual evidence, not a newly invented user-approval record.

[Compare the original A/F implementations at matched cameras](../../../room-compare.html?candidate=illustrated&lang=ru). The default left baseline is A; the right candidate is F. Standalone routes are `/?view=panorama&lang=ru` and `/?view=blender-illustrated&lang=ru`. The prior E/F report is `room-compare.html?baseline=materials&candidate=illustrated&lang=ru`.

## A — illustrated spherical room with four registered repairs

Exact configuration: [home-panorama-config.js](../../../home-panorama-config.js). Base `room-panorama-v3.webp` is1774×887. Four1254² images, `room-cube-{front,rear,up,down}-v1.webp`, are perspective repairs over that base; they are not six independent cube faces.

[Generation provenance](../house-panorama-20260922/room-panorama-v3.json) records one whole-image built-in imagegen edit with `blockout/room-blockout-equirectangular.png` as the Blender spherical geometry guide and `room-expanded-v2.webp` as illustration/style reference. The generated PNG SHA is `b489ab5f700469202990b8e8b55deeaea8a0b20412312f75fe9a2424f540c2ef`. Exact prompts and per-repair JSON remain in [the original pack](../house-panorama-20260922/README.md): `room-panorama-v3.prompt.txt`, `room-cube-{front,rear,up,down}-v1.prompt.txt`, matching `.json` records, and `cube-inputs/` extracted views.

The four repairs addressed the duplicate door knob, rear wall/table join, ceiling beam junction and rug-center pole distortion. They use110° perspective projections centered at front(0,0), rear(π,0), up(0,π/2), down(0,−π/2). The front repair has a small knob-area mask.

The [final original QA](../house-panorama-20260922/VERIFICATION.md) inspected12directions and found no obvious doubled furniture or rafters. The conspicuous rear cut and pole stars were removed. **Residual:** a small tonal line remains in the rear-down floor near the repair boundary. This audit reopened the saved ceiling and rear-down captures; the coherent beam crossing and subtle floor discontinuity remain visible. It was selected for comparison, not recorded as the selected main menu.

Original evidence root: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-panorama-20260922/`. Key captures: `visual-patched/{front,rear,up,down,rear-down,rear-up,right-up,left-up}.png`. The15-direction unedited-face GPU roundtrip in `patch-roundtrip/roundtrip.json` verified repair axes/FOV/sampling separately from art quality. Mean RGB differences0.014–2.117/255 reflect reinterpolation; that numerical check does not prove painted continuity.

## F — illustrated Blender panorama with one rear repair

Exact configuration: [home-blender-config.js](../../../home-blender-config.js), export `BLENDER_ILLUSTRATED`. Base `room-blender-illustrated-v2.webp` is1774×887; the sole registered repair is1254² `room-blender-rear-repair-v1.webp`, rear yawπ/pitch0/FOV110°.

The [scene manifest](../house-blender-continuity-20260923/scene-manifest.json) records a native2048×1024 Blender PANO render from(0,0,1.15m), +Yforward/+Zup, using one fixed primitive scene with procedural materials. Its color guide `room-storybook-color-equirectangular.png` has SHA `0e06184ff319f23ae18d9f413f9c6aae18d5c930928508d2e3068ea35db9ddd4`.

The [first whole-sphere style pass](../house-blender-continuity-20260923/room-blender-illustrated-v1.json) used that color guide plus `room-expanded-v2.webp` for style. The [selected v2 generation](../house-blender-continuity-20260923/room-blender-illustrated-v2.json) then edited v1 using the Blender guide for geometry/projection and the actual book image `papa-arrival-20260922-arrival-05.webp` for style. V2 master PNG SHA: `64f6c82283184b82159899c0020ba8f2d393658d2f3c0bb8ec72657774d1dd56`.

A110° rear view was extracted from raw F2 and edited once to remove its vertical lighting/paint boundary. [Rear-repair provenance](../house-blender-continuity-20260923/room-blender-rear-repair-v1.json) identifies `rear-input/rear.png`, its camera, literal prompt and generated PNG SHA `c1c7ac153d43f93a0efe98cf83435fb33de13f8bce07fb4e0a10438d920aae79`. The three literal prompts are `room-blender-illustrated-{v1,v2}.prompt.txt` and `room-blender-rear-repair-v1.prompt.txt` in that pack.

The [final original QA](../house-blender-continuity-20260923/VERIFICATION.md) inspected six raw directions, then the selected rear center and its yaw±50°/pitch±45° repair boundaries. No doubled furniture or hard geometric jumps were observed there. **Residual:** faint fine-texture joining remains in the rear rug. This audit reopened those captures and the ceiling/floor captures: the roof/rug remain recognizable and coherent, but fine texture converges/pinches around the spherical poles. Thus “visually successful” is warranted; “perfect at every pole pixel” is not.

Evidence root: `/Volumes/TB4/mac-mini-storage/shared/pinpin-blender-camera-20260922/verification/`. Key captures: `final/{front,rear,rear-left-edge,rear-right-edge,rear-up-edge,rear-down-edge}.png`, `selected-v2/illustrated-{front,rear,left,right,up,down}.png`, and `final/results.json`. Both final desktop/mobile checks loaded exactly one rear repair. This was a comparison selection, not a recorded main-menu promotion.

## Why these worked, and what they did not prove

Both use the same [perspective-ray spherical renderer](../../../home-panorama-gl.js). The renderer samples the equirectangular base by spherical direction and projects that exact ray into registered repair views. Repair weights fade over normalized face radius0.70–0.96, with normalized blending where repairs overlap. Their success is a continuous spherical base plus targeted repairs, rather than six independently invented illustrated faces. F needed only one repair.

The historical interactive limits were full yaw360°, pitch±65°, vertical FOV40–90°. The screenshots cover ceiling/floor regions, but the recorded viewer tests are not a proof that every ±90° ray was visually flawless. A new review that permits±89° is a stricter present-day inspection and must be labeled separately from historical checks.

These are fixed-origin rotational panoramas, not freely translated textured3D interiors. The [F projection experiment](../house-blender-continuity-20260923/IMPLEMENTATION.md) exposed paint leakage and disocclusion after moving the camera+0.5m; it does not expand F’s success into a claim of valid3D walking. The old simple room also predates the later organic multi-room plan, so continuity does not certify the current house layout.

The alternatives were weaker illustrated continuity benchmarks: [B’s six separately styled views](../house-panorama-20260922/VERIFICATION.md) retained beam/chimney/floor joins; [C’s single generated six-face atlas](../house-unified-cubemap-20260922/VERIFICATION.md) retained rear-cupboard, upper-beam and lower-rug discontinuities. Pure gray D and material E are useful continuous geometry controls but are not the requested illustrated successes.

## Selected runtime identities

The following SHA-256 values were reread from the current assets during this audit; dimensions and selection roles are recorded in the original provenance. No image, configuration or runtime was changed.

| Runtime asset under `docs/storyboard/images/house-menu/` | Bytes | SHA-256 |
| --- | ---: | --- |
| `room-panorama-v3.webp` | 2,020,370 | `efc3a9ddf626ce3cd411e1cfd57945854f220eea3b0cf29d5117a7bfa80d1187` |
| `room-cube-front-v1.webp` | 1,391,254 | `109a9aa49599c197c5f8878792b8a0d7a8da1e2654ee781cace1769be5ee175c` |
| `room-cube-rear-v1.webp` | 1,241,870 | `0bb26a9090fbb8fd9cb132d7ea3669b18c4bab0c786e121912168c970d3cc08f` |
| `room-cube-up-v1.webp` | 1,231,868 | `32edeea516f3bbc15341372dcf7cd9238210eb0575df13595d4342269b5a7d79` |
| `room-cube-down-v1.webp` | 1,608,808 | `a49c2550009e354f14ea03225695001a48f915153c5bdb624eb46c6ba403121a` |
| `room-blender-illustrated-v2.webp` | 1,856,040 | `3b7cd157da093a815076ccd6a2af7b24daffe50e1f6b58abc28e4790580c8751` |
| `room-blender-rear-repair-v1.webp` | 1,293,120 | `bc5e0c21ab71259a1c2df56d3a75bab20b56e539597c078a829e7c318bee21ad` |
