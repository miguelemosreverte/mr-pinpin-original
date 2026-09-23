# Unified cubemap C — independent verification

2026-09-22. Selected image: `room-unified-cubemap-v2.webp`,1536×1024, six512×512 faces in one3×2 texture. Every generation treats the whole atlas together; selectedv2 follows a whole-atlas correction rather than six independently generated pictures.

Local comparison: `http://127.0.0.1:8789/room-compare.html?candidate=unified&lang=ru`. The original route still opens A/B. The selector changes only the right-hand candidate between B and C, retaining the shared camera. The normal main menu is not replaced.

## Result

**C is a working single-image experiment, but not a seamless improvement over A.** V2 removes the black divider lines found inv1 and restores radial window spokes. The front-right stove/bookcase area is much cleaner than the earlier independently blended B. However, the single generation still invents incompatible geometry across some face boundaries: the extra rear-left cupboard ends at a hard cut, roof beams shift across the upper boundaries, and the rug changes scale/position across all four lower boundaries. A remains the more continuous presentation. C is kept available for direct comparison, with these limits recorded.

The gray Blender atlas joins correctly with the same renderer, supporting correct face orientation and projection. C uses true90° dominant-axis selection with one texture sampler and half-texel clamps; it does not average images or hide the generated differences with blur.

## Twelve-edge visual review of actualv2

| Edge | Observed result |
|---|---|
| Front/right | Single stove and bookshelf; small material/light mismatch remains. |
| Right/back | Wall corner aligns broadly; floor grain/lighting changes. |
| Back/left | Extra cupboard abruptly appears at the boundary. |
| Left/front | Cupboard/counter edge and floor cut at the boundary. |
| Front/up | Roof beam size/position changes abruptly. |
| Right/up | Beam alignment and plaster/light change. |
| Back/up | Central ridge geometry changes. |
| Left/up | Roof beams shift at the join. |
| Front/down | Rug boundary/scale changes. |
| Right/down | Rug position/scale and flooring change. |
| Back/down | Rug edge and floorboards do not continue. |
| Left/down | Rug scale/pattern and floorboards change. |

All twelve were inspected from actual shader captures, alongside six face-center views. Evidence: `final-v2-qa/` under this external workspace. The most useful comparisons are `front-right.png`, `back-left.png`, `front-up.png`, `right-up.png`, `front-down.png` and `left-down.png`.

## Functional checks

- Actualv2: four native door/library links passed on mobileRU and desktopEN, using the final traced contours.
- Missing atlas, unavailable WebGL, context loss and reduced motion each restored the expanded fallback with a working ES library link.
- A/C comparison passed1440×1000,390×844 and320×568: real drag in either frame, synchronized yaw/pitch/FOV, shared presets, mobile toggle, rotation and no overflow/browser errors.
- Switching C→B→C preserved the camera and matched the selected mode/label/URL. Existing default A/B regression also passed all three sizes.
- Source syntax/whitespace checks passed. Browser profiles and evidence were kept onTB4 after the Air ran short of space; the storage error was not a site failure.

Evidence JSON: `final-v2-qa/results.json`, `comparison-final-v2/results.json`, and `comparison-ab-regression/results.json`. No broad PDF/download tests were repeated.

## Owned files

`docs/room-compare.html`, `docs/room-compare.css`, `docs/room-compare.js`, `scripts/verify-room-compare.cjs`, `scripts/verify-home-unified.cjs`, and this report. Runtime renderer/configuration and artwork were handled by the other lanes. This lane performed no Git or publishing changes.

Selected atlas SHA-256: `a240b1b6f2726d4f108cf00a4f586d7dfc735171c9aa0bd1bad567b50f99a982`.

## D — pure Blender diagnostic view

The comparison selector now includes **D · Pure Blender**, directly available at `room-compare.html?candidate=gray&lang=ru`. It uses the unaltered gray Blender atlas through exactly the same single-atlas90° projection as C, without imagegen styling. The review-only **Blender source atlas** link opens the lossless flat six-face image. Switching C/D at a fixed camera lets the reader distinguish source-render geometry from changes introduced during stylization; A remains the left baseline and the original A/B URL remains valid.

Actual gray-mode comparison passed1440×1000,390×844 and320×568, including native drag in either frame, shared presets/FOV, mobile toggle/rotation, D→B→D switching with camera retained, actual mode assertions, no overflow and no browser errors. The lossless source-atlas link returned successfully. Desktop and mobile gray screenshots were visually inspected. Evidence: `comparison-gray-mode-final/results.json` and corresponding PNGs. No further full scene/PDF checks were repeated.

Gray atlas SHA-256: `65267888c17c2ae16027357d373a302afef9be8cbc94c464bc92d52cfc197e36`.
