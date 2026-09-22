# Elder cycle — public edition preparation

Publication authorized by Miguel in the active session; root coordinates the final main-branch cutover. This lane has not committed or pushed. The previous workshop remains the production source and preserves PNGs, prompts and reviews.

## Edition and reader contract

`scripts/build-elder-edition.py` assembles from integrated revision06 `chapter.json` and refuses unresolved independent scene reviews by default. Its `--allow-pending` switch is for local integration construction only. Final strict build completed without that switch, after all selected scene reviews were ready.

Public routes:

- `?story=one-day-in-the-forest&lang=ru` — all five chapters,161 narrative scenes plus5 localized title pages (166 illustrated pages).
- `?story=elder-papa-home&lang=ru` —16 pages.
- `?story=elder-family-morning&lang=ru` —21 pages.
- `?story=elder-forest-path&lang=ru` —23 pages.
- `?story=elder-elder-house&lang=ru` —36 pages.
- `?story=elder-beneath-roots&lang=ru` —70 pages.

All six support `en`, `ru` and `es`. Only the complete cycle is added to library availability, avoiding six duplicate cards. Separate chapter routes remain directly loadable. `chapterNav` records each part's `id`, original `number`1–5, localized `title`, zero-based `startScene` and standalone `storyId`. Root owns reader navigation/UI implementation.

Each title scene carries `images.{en,ru,es}`; `standaloneStories.edition` localizes every title page, including the four interior title pages of the full cycle. Existing story cover fallback remains unchanged.

## Files and storage

The six public JSON files are under `docs/storyboard/stories/`. They reference only deterministic compact release paths:

- `images/published/elder-cycle/{scene.id}.webp`
- `images/published/elder-cycle/{partid}-title-{lang}.webp`
- `images/published/elder-cycle/{partid}-miniature.webp`

These are181 unique release assets:161 narrative illustrations,15 localized titles,5 text-free miniatures. Root's exporter owns transcodes, selected-art provenance and hashes. Workshop PNG paths are not changed or copied into the public edition JSON.

Six approved cover registry entries select these WebP assets, portrait1024×1536; narrative illustrations are1536×1024. The complete cycle uses the first chapter's cover and miniature. The existing four registry entries remain otherwise untouched in this worktree. Root merges the six additions with main's original registry at release; `title-covers.js` accepts both exact existing flat PNG and canonical `title/` PNG paths as well as the six whitelisted Elder WebP mappings.

## Validation

Passed on2026-09-22:

```sh
python3 scripts/build-elder-edition.py
node scripts/verify-elder-edition.cjs
node --check docs/storyboard/standalone-stories.js
node --check docs/storyboard/title-covers.js
```

The verifier checks all six page counts, three-language title selection at every title scene, exact whitelist and local image paths, IDs and part boundaries, prose, spread sequence, navigation offsets/numbers, existing tractor/bedtime loading, old flat/canonical cover registry resolution, one new library card, and all181 existing WebP files/signatures. Negative fixtures reject traversal/remote paths, unknown IDs, duplicate scenes/spreads, missing translations/prose, wrong part cover, missing pages and incorrect navigation. `--schema-only` was used during construction, but final pass checked assets.

Separate independent family QA is complete in `forest/independent-family-review.json`:25 selected new family011–038 images match exact src/SHA pass entries; root reviewed006–010. Historical failed attempts and one invalidated concurrent-overwrite review remain traceable and are not counted as passes. All20 existing cover review hashes match selected files.

Root owns final browser checks, cover approval provenance, release registry merge, commit/push and live GitHub Pages verification. No official publication claim is made by this preparation report.
