# Title covers

`docs/storyboard/covers.json` is the lookup and approval authority for the reader's first page and library thumbnails. All four editions are approved: `chapter-01`, `chapter-02`, `timber-tractor`, and `home-sweet-home`, with Russian, English, and Spanish covers for each. Their `route` objects identify the existing reader query parameters; the timber story includes its existing continuation.

## Find an asset

From the repository root:

```sh
cat docs/storyboard/covers.json
rg --files docs/storyboard/images/covers
node scripts/verify-title-covers.cjs
```

Every localized cover has this layout:

```text
docs/storyboard/images/covers/<id>/
  title-ru-v1.png
  title-ru-v1.json
  title-ru-v1.md
  title-en-v1.png
  title-en-v1.json
  title-en-v1.md
  title-es-v1.png
  title-es-v1.json
  title-es-v1.md
```

Each PNG is 1024 × 1536 pixels, portrait, with its title already in the illustration. Adjacent JSON records production/provenance details; Markdown records the brief, review, or original production note. Registry entries name the selected version, localized title, alt text, asset paths, dimensions, placement, route, and approval state. Paths are relative to `docs/storyboard/`.

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

1. Add a new numbered PNG and adjacent JSON/Markdown for each language; never overwrite an approved version. Keep old assets so old URLs continue working.
2. Update the entry's version, all three asset paths, title/alt details, and set `status` to `proposed`. Review all three languages with `coverPreview=1`, including the reader, library, and portrait print preview.
3. After Miguel approves the exact selected artwork, record that approval in the sidecars and change the registry entry to `approved`. Do not infer approval from generation, passing tests, preview visibility, or an agent's visual review.
4. Before publishing, run `node scripts/verify-title-covers.cjs`. This release check requires all four editions and their sidecars to be approved. It checks PNG dimensions, actual asset hashes against sidecars (including recorded source hashes for copies), reader/library agreement in all three languages, unchanged prose/scene/spread structure, and missing registry/image fallbacks. A separate synthetic proposed registry exercises the same reader/library routes with preview both enabled and disabled, so proposal gating remains covered after approval. Publishing remains a separate authorized cutover.
5. Bump the HTML query versions for any changed JS/CSS. The registry is fetched with `cache: 'no-cache'`; image version numbers provide immutable asset URLs.

Future adapted chapters follow the same directory and entry convention. Main-book covers do not need to become story scenes or alter the existing chapter edition validators.
