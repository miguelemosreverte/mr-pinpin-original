# Papa / Scooby style review browser report

Owned deliverable: `docs/storyboard/review/elder-style-iterations.html`.

The page loads `style-correction/review.json` dynamically. All asset and provenance paths resolve relative to the storyboard root. Required rows compare (1) scene002 before/proposal, (2) proposal/established home-51-v1, and (3) shared character study/home-51-v1. The page preserves complete image framing, offers click/keyboard modal enlargement, shows SVG viewport face details directly from originals, loads exact saved prompts, and retains an iteration history. No raster crop or retouch is produced. Official selections are unchanged.

Face coordinates for a changed composition are supplied by optional `candidate.crops` and `study.crops`, each containing `papa` / `scooby` arrays of `[x,y,width,height]`. They are omitted when absent instead of guessing the position of new faces.

## Initial verification

Chrome/Playwright, 1440×1000 and 390×1000, using a request-intercepted pending-candidate fixture (no fixture was written to the repository):

- Both viewports: no JavaScript errors or horizontal overflow.
- Three required comparison rows render; two candidate slots display honest pending placeholders.
- Three available exact prompt disclosures load.
- Click enlargement opens and Escape closes the modal.

## Final live-data verification — PASS

Chrome/Playwright at 1440×1000 and 390×1000 with the actual final review record, selected shared study v2, scene002-style-v1, and foundation study v1:

- Three comparison rows; nine complete raster image placements and eight SVG original-image face viewports.
- Zero broken images, pending placeholders, JavaScript errors, prompt load errors, or horizontal overflow.
- Five exact prompt disclosures load. The original redesign prompt is shown before the later gaze-only refinement; its displayed text exactly matches the saved provenance string.
- Keyboard Enter opens enlargement; Escape closes it. Prompt disclosure click expands the saved wording.
- Final status correctly says ready for feedback, with chapter and published edition unchanged.
- Actual desktop arrival and face screenshots and mobile face screenshots were visually inspected. Fixed the inherited PinPin crop, which previously cut the upper face, and aligned mobile two-line face captions. Root also inspected desktop authority/face screenshots.

Browser evidence remains at `/Users/miguel_lemos/.codex/tmp/pinpin-elder-style-review/`:

- `browser-results.json` — both final viewport checks pass.
- `review-1440-arrival.png`, `review-1440-authority.png`, `review-1440-faces.png`, `review-1440-study.png`.
- Corresponding `review-390-*.png` captures for phone layout.

No chapter manifests, selections, artwork, private photos, or official publication were changed by this lane. No further browser edits are pending.
