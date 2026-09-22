# House and library verification

Reusable check: `scripts/verify-house-library.cjs`.

```sh
node scripts/verify-house-library.cjs \
  --base https://mr-pinpin.github.io/ \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/ui-verification-public
```

`--base` is the site root, not `/storyboard/`. `--out` must resolve outside the
checkout. The optional `PLAYWRIGHT_MODULE` environment variable selects an existing
Playwright installation. Chrome is used without installing browser dependencies.

## Source-preview result

All 15 checks passed against `http://127.0.0.1:8789/`. Evidence is saved at:

`/Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/ui-verification/`

The directory contains `results.json`, desktop/mobile screenshots, and the two
actual downloaded PDFs. Tests cover:

- Home artwork decoding, Russian/English/Spanish labels and destinations, and
  no horizontal overflow at 1440 × 1000 and 390 × 844.
- Real bookcase navigation to the library and return-home navigation, preserving
  Spanish during the actual round trip.
- The door's gold hover and visible keyboard-focus contours at both sizes.
- Actual door navigation with a successful atlas document response and English
  preserved. Atlas rendering/performance is intentionally outside this audit.
- All nine completed chapter IDs in catalog order, every localized title and
  correct selected miniature/title image in all three languages at both sizes.
  All cover images decode, with no horizontal overflow.
- Gold magazine hover/keyboard-focus states.
- One real English Papa magazine download, which leaves the caller in the
  library. Filename, byte count, PDF header, and SHA-256 match the exact catalog
  response used by that library view.
- The Russian Papa `download=pdf` route, which starts the actual PDF download
  without any reader/scene/image nodes or chapter JSON/image requests.
- No runtime or asset errors. The preview server's missing root favicon is
  recorded separately as incidental.

Verified downloads in this run:

| Route | Filename | Bytes | PDF pages |
| --- | --- | ---: | ---: |
| English library click | `elder-papa-home-en.pdf` | 17,662,284 | 28 |
| Russian direct route | `elder-papa-home-ru.pdf` | 17,651,012 | 28 |

These are observations, not hard-coded test expectations. Each future run reads
page counts, filenames, sizes, and hashes from the catalog actually returned to
that page, so newer PDF editions with appended coloring pages remain testable.
The nine expected chapter IDs are fixed; the combined Elder cycle is excluded.

## Existing full-site audit needs a library update

The library block in `scripts/verify-published-site.cjs` (around lines 189–200)
reflects the previous UI and will fail against the new library:

1. It waits for `[data-story="one-day-in-the-forest"] a`; the combined cycle is
   intentionally absent from the nine-magazine catalog.
2. It queries `.adventure-cover a,.chapter-cover.published a`; the new controls
   are `.magazine-button[data-download]` and initiate PDF downloads.
3. It expects library destinations to be HTML-reader URLs and only decodes
   `.adventure-cover img`; the new image selector is `.cover-frame img`.

Replace that block with the catalog-driven magazine/download assertions in this
focused check, or run the focused check alongside the existing audit with its old
library block removed. Keep the full audit's independent reader/atlas checks.
The old audit was inspected only and was not edited by this lane.

## Official public-site result

GitHub Pages deployment for official commit
`6aa9a0b84ef9214bebb3a7f21d632fba40927c86` completed successfully in
[run 35720908889](https://github.com/mr-pinpin/mr-pinpin.github.io/actions/runs/35720908889).
The verifier then passed all 15 checks against `https://mr-pinpin.github.io/`.

Public evidence:

`/Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/ui-verification-public/`

`results.json` records the successful real English magazine download and Russian
direct-route download, their catalog-matching hashes/sizes, all three languages,
both viewport sizes, decoded chapter covers, gold hover/focus, and actual home,
bookcase, and door navigation. No runtime or asset errors were found; the absent
root favicon remains separately recorded as incidental.

The library checks now also assert that the number of `.coloring-note` elements
matches chapters whose catalog `coloringPageCount` is exactly `3`, and that each
note is visible and has the correct Russian/English/Spanish text. This check was
verified separately on the current public site at both viewport sizes without
additional PDF downloads: all six views correctly had zero notes because that
release's catalog does not yet include coloring pages. Those observations were
added to the corresponding public library check details in `results.json`.
Future runs will verify the new notes automatically once the coloring catalog is
selected, without changing expected PDF sizes or page counts in the script.

## Final coloring PDF visual sample

Rendered and visually inspected the three appended Russian Papa pages (29–31)
and the first appended English Beneath the Roots page (71) from
`pdf-export-coloring/`. Papa has 31 pages; Beneath the Roots has 73.

All four inspected A4 pages have clear white print margins. The drawings are
large and readable, with the important figures and objects intact, bold outlines,
and ample white coloring areas. There is no additional clipping introduced by
PDF placement; peripheral background lines retain their original illustration
framing. The corrected pedestal table is present on Papa page 31.

90-DPI previews are saved at:

```text
/Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/ui-verification-coloring-pdf/papa-ru-29.png
/Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/ui-verification-coloring-pdf/papa-ru-30.png
/Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/ui-verification-coloring-pdf/papa-ru-31.png
/Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/ui-verification-coloring-pdf/beneath-roots-en-71.png
```

The mini did not have Poppler installed, so the existing Air `pdftoppm` rendered
these four small previews directly to TB4. No image or PDF was modified. This
was a visual placement check, not a repeat of the completed merge audit.
