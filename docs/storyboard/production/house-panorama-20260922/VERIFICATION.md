# Room panorama / Blender comparison — independent QA

2026-09-22. Local review: `http://127.0.0.1:8789/room-compare.html?lang=ru`. Both variants remain explicitly selected preview modes; B does not replace the default menu.

Evidence path base: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-panorama-20260922/verification/`. Relative evidence paths below refer to that external folder.

## Verdict

The comparison is usable and its synchronized controls work. **A, the repaired panorama, is currently more visually coherent across the room. B, the six directly rendered Blender views, is a useful experiment with clean individual directions, but still has visible boundaries between independently styled views.** Neither result is described as geometrically perfect.

A's perspective repairs remove the duplicate door knob, the hard rear-wall/table cut, and the ceiling/rug pole stars. Twelve inspected directions showed no obvious doubled furniture or rafters. A small residual tonal line remains in the rear-down floor near the repair boundary. Evidence: `../visual-patched/`, especially `rear-down.png`.

B's initial normalized blend doubled the stove/chimney and kitchen furniture. The one bounded shader refinement gives each area a stable preferred face with a narrow transition. The front-left kitchen and front-right stove now appear as single objects, and the rug does not look translucent. Remaining limitations are harder spatial/material discontinuities: roof beams do not meet across the upper side boundary, the chimney ends abruptly near that boundary, and floor grain/lighting changes across the lower boundary. Evidence: `../visual-blender-final/front-right.png`, `right-up.png`, `right-rear.png`, `left-down.png`, `rear-down.png`. Earlier broad-blend defects are retained in `../visual-blender/`. No further art or shader revision is proposed in this bounded review.

## Verified behavior

- A and B each passed four viewport suites (390×844,320×568,844×390,1440×900): real native touch/mouse full360° travel, keyboard full-turn rendered-image equality, pitch±65°, FOV40–90°, projected link hits, drag suppression, keyboard reveal, fixed language controls, no overflow and rotation. A was retested with its final repair assets; B's full suite used the original Blender guides before styled assets, avoiding repeated unchanged checks.
- Both modes passed GPU-unavailable, context-loss, reduced-motion and missing-required-image fallback checks. B requires all six faces; optional A repairs may fall back to its base image.
- With actual styled B assets and final traced targets, door/library navigation passed mobileRU and desktopEN (four native links). Evidence: `../styled-links/results.json`.
- The actual A/B page passed1440×1000,390×844 and320×568: dragging either frame synchronizes yaw/pitch/FOV, shared presets/FOV work, mobile toggle retains camera, rotation retains synchronization, no overflow or browser errors. Evidence: `../comparison-styled-qa/results.json` and screenshots. The focused page test was rerun after the final ownership shader at all three sizes and passed again; final evidence: `../comparison-final-qa/results.json`.
- Independent GPU roundtrip of hash-verified, unedited extracted repair faces passed15 directions. Mean RGB discrepancy0.014–2.117/255 is consistent with the extra interpolation; pure side views are pixel-identical. This confirms repair orientation/FOV and does not certify generative art consistency. Evidence: `../patch-roundtrip/roundtrip.json`.

The final B shader changes only which registered face owns overlap regions, not camera controls or hit geometry. Its visible effect was directly re-rendered and inspected in fourteen directions.

## Owned source files

- `docs/room-compare.html`, `docs/room-compare.css`, `docs/room-compare.js`: separate review page, equal desktop frames, equal-size mobile toggle, shared front/rear/left-corner/right-corner/ceiling/floor controls, FOV and reload. Sync accepts the runtime's parent-only same-origin message contract and relays only changed cameras.
- `scripts/verify-home-panorama.cjs`: panorama and cubemap native-input verifier; optional gray-guide substitution is test-only.
- `scripts/verify-home-panorama-patches.cjs`: independent GPU repair-face roundtrip.
- `scripts/verify-room-compare.cjs`: real desktop/mobile comparison integration.

Syntax and whitespace checks pass. This lane made no runtime/art edits, Git commits, official selector changes, or publication. Root owns integration and release. Preproduction architecture notes remain in `../PREPRODUCTION.md`; earlier draft-specific findings are retained in `REVIEW-HISTORY.md`.
