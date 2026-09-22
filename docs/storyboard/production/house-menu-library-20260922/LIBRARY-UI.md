# House library UI

Implemented in `library.html`, `library.css`, `library.js`, and the small
`library-download.js` transport helper. No story manifests, PDFs, catalog data,
artwork, or publication selections are changed by this lane.

## Catalog contract

`storyboard/library-pdfs.json` uses `schemaVersion: 1` and a `chapters` array.
Each chapter supplies its stable `id`, localized `title` and `cover`, optional
approved text-free `miniature`, positive `pageCount`, optional localized
`editionLabel`, and `pdf[ru|en|es]` containing `url`, `filename`, `bytes`,
`sha256`, and `pageCount`. The PDF lane owns the catalog and exported documents.

The UI shows catalog order, with all nine completed chapter routes and no
combined Elder duplicate. It distinguishes the earlier Elder edition through
its supplied label. A true text-free miniature takes precedence; otherwise the
selected language's title cover is used. A defensive check also prevents an
English title cover supplied as `miniature` from overriding the selected language.
Null download URLs remain visibly unavailable until publication metadata is ready.

## Shelves and navigation

The generated empty oak bookcase is `images/house-menu/library-v1.webp`.
Each row reuses the middle bay, source pixels y355–611 of the 1536 × 1024 image.
CSS aligns the covers' lower edge to the actual generated ledge at y568. The
wooden shelf is part of the generated artwork, not an independently floating
CSS bar. Magazine covers remain uncropped 2:3 images. Titles and page counts sit
beneath the artwork as accessible text.

The responsive layout has three magazines per shelf on desktop, two on tablet,
and one on narrow phones. Gold hover/focus feedback and a slight press response
respect reduced-motion preferences. Home and atlas links preserve the selected
language; the original-book footer points to `../original/`.

## Download behavior

Selecting a magazine downloads its selected-language PDF; it does not open the
reader. Only one user-selected download is fetched at a time. The UI shows byte
progress, a checking state, cancellation, completion, and retry instructions.
HTTP errors, partial/oversized responses, invalid PDF headers, and SHA-256
mismatches prevent a download from being offered. A verified PDF becomes a local
Blob download with the catalog filename. No automatic PDF prefetch or bulk
transfer takes place. Public hosting must permit anonymous browser CORS reads.

## Verification so far

Using the PDF worker's complete draft catalog and controlled browser responses:

- Chrome at 1440, 768, and 390 pixels shows all nine magazines on 3, 5, and 9
  shelves respectively; all cover images load, with no horizontal overflow.
- RU, EN, and ES selection produces the correct localized chapter-01 filename.
- HTTP failure and a same-size corrupt PDF are blocked, with retry available.
- Cancellation aborts the request; keyboard Enter successfully retries.
- Search returns the expected empty state; reduced-motion styling removes motion.
- No JavaScript errors occurred in the successful layout/download checks.
- The generated-art desktop overview was visually inspected for shelf alignment
  and correct localized covers.

Screenshots:

```text
/Users/miguel_lemos/.codex/tmp/pinpin-library-art-desktop.png
/Users/miguel_lemos/.codex/tmp/pinpin-library-art-mobile.png
```

Current source preview: `http://127.0.0.1:8791/storyboard/library.html?lang=ru`.
The older server at port 8783 serves another build, not this source checkout.
Final public-catalog download/CORS validation follows root's verified upload.

## Priority PDF URL delivery

`storyboard/?story=elder-papa-home&lang=ru&download=pdf` now enters a dedicated
PDF route before the reader starts. `pdf-route.js` detects the flag in the head;
`reader.js` immediately returns for that route. The route replaces the body with
minimal localized download progress, cancellation, retry, and a library link.
It loads the catalog and selected PDF only: no chapter JSON or scene images.

Minimal publication files for this feature (independent of the house gallery):

```text
docs/storyboard/index.html
docs/storyboard/reader.js
docs/storyboard/pdf-route.js
docs/storyboard/pdf-route.css
docs/storyboard/library-download.js
docs/storyboard/library-pdfs.json
```

Actual anonymous HF download tested in Chrome using the exact route above on the
source preview server. Result: `elder-papa-home-ru.pdf`, 17,651,012 bytes,
SHA-256 `18e735ab46d2cf0dc904eba3b3585de63ea50765829e673ad060a33555731552`,
matching the verified public catalog. The browser emitted the automatic download;
there were zero reader/scene/image nodes, zero story-asset requests, no JavaScript
errors, and no horizontal overflow at 390 × 844.

Controlled-response route checks also passed for all nine chapter routes, plus
English and Spanish Papa downloads. Unknown stories, unavailable chapter numbers,
and ambiguous story-plus-chapter requests never download another book. The
ordinary route without `download=pdf` still renders its normal 28 scene images
plus the existing navigation miniature, with the reader ready and no script errors.

Actual-download screenshot:
`/Users/miguel_lemos/.codex/tmp/pinpin-pdf-route-real-mobile.png`.
