# Title covers

`docs/storyboard/covers.json` is the lookup and approval authority for title covers and their text-free miniatures. The reader and current library use the title assets; the new miniatures are presented in a separate review until the complete set is approved. All four editions are approved: `chapter-01`, `chapter-02`, `timber-tractor`, and `home-sweet-home`, with Russian, English, and Spanish covers for each. Their `route` objects identify the existing reader query parameters; the timber story includes its existing continuation.

## Find an asset

From the repository root:

```sh
cat docs/storyboard/covers.json
rg --files docs/storyboard/images/covers
node scripts/verify-title-covers.cjs
```

Every chapter uses the same two clearly named subfolders:

```text
docs/storyboard/images/covers/<id>/
  README.md
  title/
    title-ru-v1.png    # Russian title page
    title-en-v1.png    # English title page
    title-es-v1.png    # Spanish title page
  miniature/
    miniature-v1.png   # Text-free title miniature, all languages
```

Every PNG has adjacent same-basename `.json` and `.md` files with its exact generation prompt, references, timestamps, SHA-256, review and approval/provenance. Additional plans and reports may live beside them.

Both roles are portrait 1024 × 1536. A **title** has the chapter name in the illustration and belongs on the first page. A **title miniature** is a separately composed, text-free companion with larger subjects and simpler background, made to remain recognizable at small display sizes. It is ONE master displayed at 96, 160 or 240 CSS pixels, not three independently generated images; no language variants are needed.

The registry's `assets.{ru,en,es}` selects the full titles. Its separate `miniature` object selects the miniature's `asset`, `version`, dimensions and independent approval `status`. The approved bedtime pilot was copied byte-for-byte into its canonical miniature path. The other three miniatures are proposals until Miguel reviews the set. A miniature's approval never changes title approval or replaces the reader's first page.

Paths are relative to `docs/storyboard/`. Always follow the registry to find the selected version. Files directly in a chapter's cover directory are retained historical copies for existing URLs; `title/` and `miniature/` are the active organization. No approved artwork is recompressed or regenerated just to change folders.

## Rendering and review

`title-covers.js` loads the registry and supplies one `resolve(id, language)` lookup to both `reader.js` and `library.js`. Only `approved` entries appear by default. `proposed` entries appear only when the URL contains the exact query parameter `coverPreview=1`. Language switching, library links, and library-to-reader navigation retain that parameter.

Examples:

```text
/storyboard/library.html?lang=ru&coverPreview=1
/storyboard/?chapter=1&lang=en&coverPreview=1
/storyboard/?chapter=2&lang=es&coverPreview=1
/storyboard/?story=timber-tractor&lang=en
/storyboard/?story=home-sweet-home&lang=ru
```

The two main-book covers use `placement: "prepend"`: a separate, unnumbered portrait front page. Original scenes, prose, scene IDs, numbered spread IDs, folios, and spread styles remain unchanged. The two standalone stories use `placement: "replace"`: the cover already embedded at scene index zero receives the registry image, without adding another page.

A missing/invalid registry falls back to the existing story rendering. A missing cover image removes the optional main-book front page or restores the legacy standalone/library image. Cover availability does not determine chapter publication availability. The legacy JSON story schemas remain intact; their cover paths are retained for backward compatibility and fallback.

## Provenance and legacy paths

The existing timber and bedtime cover images were copied byte for byte into canonical directories. No artwork was regenerated, resized, or recompressed. Timber's legacy English `title-v1.png` is canonically named `title-en-v1.png`; the other files keep their localized basenames. All legacy assets and URLs remain in place.

Canonical JSON sidecars for these six copies record `provenance.originalPath`, `provenance.legacyURL`, `provenance.originalSha256`, and `sha256`. The two hashes must match. The original metadata is retained under `provenance.sourceMetadata`, and the original Markdown is included in the canonical Markdown. Historical notes such as “pending approval” inside original source metadata are historical records; current approval is determined by `covers.json`.

For the generated chapter covers, adjacent generation metadata records the supplied references, prompts, outputs, review, and approval. Their `sha256` values identify the actual generated PNGs; copy provenance is not required for generated artwork. Generation reference files need not be copied into the public cover directory. Keep provenance specific to the actual source; do not label a copy/rename as generation, or a regenerated variant as byte-identical. Earlier proposal wording in generation prompts or review history does not override the current approval fields and registry.

## Update and approve

1. Add a new numbered PNG and adjacent JSON/Markdown in `title/` for each language, or one shared image in `miniature/`; never overwrite an approved version. Keep old assets so old URLs continue working.
2. For a title revision, update the entry's version, all three `assets` paths, title/alt details and parent `status: "proposed"`; review all three languages with `coverPreview=1` in the reader, library and print preview. For a miniature-only revision, update only `miniature.version`, `miniature.asset`, dimensions and `miniature.status: "proposed"`; review `review/title-miniatures.html` at 96/160/240px. Leave title fields and parent approval untouched.
3. After Miguel approves the exact selected artwork, record that approval in its sidecars and change the matching approval field to `approved`: parent `status` for titles, or `miniature.status` for miniatures. Do not infer approval from generation, passing tests, preview visibility, or an agent's visual review.
4. Before publishing, run `node scripts/verify-title-covers.cjs`. This release check requires all four editions and their sidecars to be approved. It checks PNG dimensions, actual asset hashes against sidecars (including recorded source hashes for copies), reader/library agreement in all three languages, unchanged prose/scene/spread structure, and missing registry/image fallbacks. A separate synthetic proposed registry exercises the same reader/library routes with preview both enabled and disabled, so proposal gating remains covered after approval. Publishing remains a separate authorized cutover.
5. Bump the HTML query versions for any changed JS/CSS. The registry is fetched with `cache: 'no-cache'`; image version numbers provide immutable asset URLs.

Future adapted chapters follow the same directory and entry convention. Main-book covers do not need to become story scenes or alter the existing chapter edition validators.

## Miniature review

`node scripts/verify-cover-miniatures.cjs` checks four miniature assets, adjacent records, actual hashes, dimensions, selected paths and independent approval states. It allows proposals for local review; pass `--release` to require all four miniature approvals before publishing them. The title verifier continues to check the original reading behavior and title assets. Do not mark generated art approved based only on a successful automated check.
