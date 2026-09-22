# House menu implementation

Status: complete local implementation, ready for integration and release verification.

Owned files: `docs/index.html`, `docs/home.css`, `docs/home.js`, `docs/original.html`, `docs/original/index.html`, and the source-path constant in `tools/build_book.py`. Reference investigation is recorded separately in `INTERACTION-REFERENCE.md`.

The illustration and SVG share a 1536×1024 coordinate system without cropping. SVG anchors provide two keyboard/touch destinations; ordinary footer links provide the same destinations and access to the preserved original. EN/RU/ES selection updates page text, accessible labels and outgoing query parameters. White dashed contours become gold on hover/keyboard focus; reduced-motion preferences remove transitions. The contours were manually traced against the selected room-v2 PNG (served as room-v1.webp), including the door leaf, open doorway, bookcase silhouette and foreground occlusion. The labels are also real links, so tapping the visible wording works.

## Preservation

Original HTML: 621,563 bytes, SHA-256 `07bf4433d51b7236ff2db5f15b717d15129b9d7c7f1e61aaa4eca7e55d7f0114`. The preserved `docs/original.html` matches the pre-edit homepage and `book.json` source hash exactly. No original image was edited or moved. All 104 image occurrences (100 distinct files) resolve through the retained `images/` paths. The `/original/` alias redirects to the byte-identical document and preserves query parameters and fragments when JavaScript runs; the HTML refresh/link provide fallback navigation.

## Initial browser checks

Chrome/Playwright local preview, 2026-09-22:

- 320, 390 and 1440 px widths × RU/EN/ES: no document overflow; correct titles, accessible hotspot labels and atlas/library destinations with language preserved.
- Keyboard Tab visits language links, door hotspot, bookcase hotspot and footer links. Focused hotspot stroke is gold.
- Reduced motion sets contour transition duration to zero.
- `/original/?lang=es#h.example` reaches `/original.html?lang=es#h.example`.
- `node --check docs/home.js` passes.

Final local artwork checks also passed at 320, 390 and 1440 px: selected 1536×1024 art loads, the image and contours remain aligned without cropping or horizontal overflow, and the full desktop menu fits within a 900 px-high viewport. Pixel-coordinate hit checks select the door at (215,385), open passage at (370,430), and books at (1200,400); the round window at (750,280) is correctly not interactive. Actual hover/focus screenshots show gold contours; keyboard focus uses the contour rather than an additional rectangular box.

Visually inspected screenshots are saved outside Git at `/Users/miguel_lemos/.codex/tmp/pinpin-home-check/`: `home-1440.png`, `home-390.png`, `home-320.png`, `door-hover.png`, and `bookcase-focus.png`. Initial versions were replaced after fixing label wrapping/tap targets and desktop height.

Root owns the asset catalog, release integration and live-site verification. No publication is claimed by this lane.

## Original-route documentation follow-through

Updated current LICENSE scope paths from `docs/index.html` to `docs/original.html`; the complete original export, its styling and images remain excluded from the software grant. Added the exact original/export site paths to THIRD-PARTY-NOTICES without changing any upstream grant or ownership statement. Root LICENSE and THIRD-PARTY-NOTICES remain byte-identical to their `docs/permissions/` copies. The permissions page links its original-book mention to `/original/`.

README, PUBLISHING and the current storyboard guide now point original-book readers to `/original/` and source-file readers to `docs/original.html`; README distinguishes the new house menu at `docs/index.html`. Historical reports and immutable release records were left unchanged. `git diff --check` passes for these edits.

A real browser click on the door hotspot reached `/storyboard/atlas-webgpu.html?lang=en`, with title `The Shire - Mr. PinPin` and an atlas canvas present. This is a bounded navigation check, not a new full atlas-rendering audit.
