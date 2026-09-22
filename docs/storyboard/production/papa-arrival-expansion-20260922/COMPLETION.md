# Papa arrival expansion — review draft

Prepared 2026-09-22 with the built-in imagegen tool. Not approved or published.

- Twelve additional story illustrations, each 1536 × 1024.
- Fifteen existing story images retained, plus the existing localized cover: 28 reading pages total.
- Sixteen generated outputs retained: twelve selected candidates and four superseded attempts.
- Exact prompts, input references, UTC call times, dimensions, hashes and visual review notes are stored beside every PNG. `generation-plan.json` selects the current candidates; revision plans and original sidecars preserve earlier prompts.
- `story-plan.json` records insertion order and short English, Russian and Spanish text. Two small caption bridges avoid repeating Papa's identity reveal and the door opening.

## Read and compare

Local review: http://127.0.0.1:8783/storyboard/review/papa-arrival-expansion.html?lang=ru

Continuous draft: http://127.0.0.1:8783/storyboard/review/papa-arrival-expansion.html?lang=ru&view=reader

Run `node scripts/build-papa-arrival-review.cjs --require-complete` to rebuild. Serve repository `docs/` over HTTP; the port is local preview configuration, not a public address.

## What changed

The children’s side of the arrival now unfolds through recognition, reciprocal waves, PinPin leaving the window, his run to Mama, the announcement, Mama’s joy, PomPom reaching for his brother, Papa’s wait, the walk to the door, its opening, and the first step into Papa’s arms. PomPom remains an infant carried by Mama. The original hug and following family scenes remain.

The final continuity pass repaired an impossible outdoor background, mirrored exterior door hardware, an inward-opening door, and a misplaced door leaf. These failed candidates remain beside their revised versions. Visual checks are observations; hidden anatomy and exact three-dimensional geometry are not mechanically certified.

## Verification and preservation

The focused browser review verifies all twelve new images at their actual dimensions, all 28 reading images, three languages, before/after rows, and narrow-screen layout. See `REVIEW-IMPLEMENTATION.md` for the checks and screenshots.

The new images are local review candidates under `production/`; no canonical story manifest, cover registry, library listing, official release selection or existing illustration was changed. They must enter the documented archive/catalog and approval workflow before a release selects them. A second copy of this review pack and its required original references is saved on the mini SSD; `backup-receipt.json` records its exact path and verified hashes.
