# Chapter PDF export

The house library downloads one completed chapter in the selected language. Its nine entries include the two original published chapters, the continuous tractor story, bedtime, and the five individual Elder-cycle chapters. The combined Elder collection is omitted to avoid duplicate content. The original second chapter remains available with an “Earlier edition” label.

## Reproduction

```sh
node scripts/export-chapter-pdfs.cjs \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/pdf-export
```

Use `--metadata` to emit the catalog draft without rendering. Requirements: Chrome, Playwright (`PLAYWRIGHT_MODULE` can override its location), ImageMagick, `pdfinfo`, and `pdftotext`.

The script reads canonical chapter manifests, approved title covers, original translations, and the existing tractor composition function. It does not modify any artwork or runtime story manifest. All temporary media and PDFs are stored outside the checkout on the mini SSD. Root publication fills the anonymous content-addressed download URLs after verified archive upload.

## Layout and fidelity

Each existing scene occupies one page, including the approved title cover. Covers use A4 portrait; narrative scenes use A4 landscape. Images fit entirely within their allocated area, with no crops. Captions use 17-point Georgia with embedded Unicode fonts, selectable text, and full Russian/English/Spanish prose. The export has no browser controls, links, headers, or footers in the page artwork.

Native-size JPEG quality-92 derivatives reduce download size inside PDFs. The source image dimensions are checked against each derivative; no resizing or image regeneration occurs. PNG/WebP originals remain unchanged. These print derivatives are not replacements for archived master artwork.

## Catalog

The exporter writes `library-pdfs-draft.json` with `schemaVersion:1` and nine `chapters`. Each chapter contains its `id`, localized `title` and `cover`, `coverId`, `miniature`, `route`, `pageCount`, and `pdf` language objects containing `url`, `filename`, `pageCount`, `bytes`, and `sha256`. Draft `url:null` becomes an absolute verified download URL during publication. Only independently approved miniatures are selected; otherwise the approved title cover supplies the fallback.

Expected page counts, including cover:

| Chapter | Pages |
|---|---:|
| Original chapter 1 | 16 |
| Original chapter 2 — earlier edition | 17 |
| Timber Tractor | 34 |
| Home, Sweet Home | 21 |
| Papa Comes Home | 28 |
| A Morning Together | 21 |
| Through the Forest | 23 |
| The Elder’s House | 36 |
| Beneath the Roots | 70 |

## Verification

The exporter asserts no layout overflow, a substantial visible image area, exact PDF page count, and recoverability of every original paragraph via UTF-8 `pdftotext`. Extraction normalization only accounts for whitespace and line wrapping of explicitly hyphenated words. `pdfinfo` confirms mixed cover/story sizes; `pdffonts` confirms embedded Unicode Georgia for Russian. Every output and print derivative has a recorded SHA-256 and byte size in the external `export-manifest.json`.

Completion and aggregate sizes are appended after all 27 exports finish. Browser download integration and archive verification belong to the publication lane.

## Completed export

All 27 PDFs passed verification: nine chapters × three languages, 798 pages total, 550,030,725 bytes (524.6 MiB). Individual downloads range from 11.9 to 42.4 MiB. Final SHA-256 and byte counts were rechecked against every output.

External output directory: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/pdf-export`. `export-manifest.json` records `pass:true`, all paragraph/layout checks, master-image identities, and final PDF hashes. `library-pdfs-draft.json` contains complete file metadata pending root upload URLs. Unapproved miniature entries are `null`, allowing the UI to select the correct localized title cover.

Visual inspection of rasterized PDF pages confirmed the original Elder dialogue, corrected Mama walking scene, and Russian Papa cover are complete and readable. Preview files remain under external `previews/`.

## Verified archive and public download URLs

All 27 PDFs were uploaded to the existing public bucket `miguelemosreverte/mr-pinpin-archive` and downloaded again for fresh SHA-256 verification. The adapter ran on the Mac mini’s native SSD to support its atomic hardlink/cache operations. Existing default HF authentication was used; credentials are not included in any catalog or receipt.

- Preservation manifest: `assets/chapter-pdfs.json`, separate from site media policy and the Pages bundle.
- Final public catalog: `docs/storyboard/library-pdfs.json`, with all 27 content-addressed URLs.
- Verified receipt: `pdf-upload-receipt.json` beside this report (all entries `verified:true` and `remote_verified:true`).
- Export provenance: `pdf-export-manifest.json` beside this report.
- Anonymous browser proof: `anonymous-pdf-cors.json` beside this report.

An actual Chrome page at `https://mr-pinpin.github.io` fetched the Russian Papa PDF with credentials omitted. The response was HTTP 200, CORS-readable, `application/pdf`, and its complete 17,651,012 bytes matched the expected SHA-256. This verifies the cross-origin fetch required for the library’s user-initiated file download.

Future restoration uses the same verified adapter and preservation manifest, with the restore root on the SSD:

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/chapter-pdfs.json \
  --root /Volumes/TB4/mac-mini-storage/shared/pinpin-pdf-restore \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache \
  --profile archive
```

Run this on the mini when the cache resides on its SSD. PDFs stay outside the Pages bundle; the published catalog points directly to immutable archive objects. New PDF revisions must produce new content hashes and URLs, preserving old objects and receipts.

## Three-page coloring edition

```sh
node scripts/export-chapter-pdfs.cjs \
  --coloring-manifest docs/storyboard/production/house-menu-library-20260922/coloring-manifest.json \
  --base-pdfs /Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/pdf-export \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/pdf-export-coloring
```

This mode requires `pdfunite` and `pdfimages` in addition to the normal tools. The output directory must be new and outside the baseline PDF directory. It merges three independent, language-neutral portrait coloring pages onto each existing PDF, preserving the original story pages rather than reprinting them. Selected coloring PNGs are embedded without JPEG conversion. Every baseline file hash remains unchanged; original selectable text and embedded-image inventory must match. Expected new chapter counts are 19/20/37/24/31/24/26/39/73, totalling 879 pages across three languages. The new catalog records `storyPageCount`, `coloringPageCount:3`, and total `pageCount`.

## Coloring edition completed and archived

All 27 new PDFs passed append validation and fresh HF upload/readback verification. They contain 879 pages, including exactly three coloring pages in each of nine chapters and each language. The original 27 PDF files remain unchanged. All 879 page sizes were checked: original page dimensions match their baselines and all 81 appended pages are A4 portrait. Total new PDF storage: 641,834,981 bytes (612.1 MiB).

`library-pdfs.json` and `assets/chapter-pdfs.json` now select the new content-addressed coloring editions, with top-level chapter `coloringPageCount:3`. Previous PDF objects, old export provenance, and the original upload receipt remain preserved. New proofs are `pdf-coloring-export-manifest.json`, `pdf-coloring-upload-receipt.json`, and `anonymous-coloring-pdf-cors.json` beside this report. The anonymous browser probe from the actual GitHub Pages origin fetched the full Russian Papa coloring edition (20,864,540 bytes) with HTTP 200, CORS-readable `application/pdf`, and exact SHA-256.
