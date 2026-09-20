# The Shire: first atlas

This is a proposed shared geography, not a canonical survey. The map combines
the original story's Crystal Lake and Elder's oak with the cottage and bridge
from the Timber Tractor adventure. Reader and story data are unchanged.

## Navigation

- Crystal Lake opens main-book Chapter 1. Opening it unlocks the Elder's stop.
- The Elder's Oak opens main-book Chapter 2.
- Home, Sweet Home is main-book Chapter 3, not yet illustrated in the new
  edition. Its marker stays Coming soon and does not navigate to a fallback.
- The Timber Bridge opens the independent, continuous 30-scene tractor story.
- Opened is not a claim that the story was read or completed. Progress and
  language are stored on this browser under `pinpin.atlas.v1`. Browsers that
  block storage cannot persist progress across new page loads.
- Existing direct story URLs and the chapter library remain accessible.

## Artwork

The built-in image tool generated one 1536 x 1024 map in 60.789 seconds of
image-call wall time. This excludes planning, review, implementation and tests;
it is not model compute time or a price estimate. Exact prompt, references,
timestamps, source output, hash and visual review are adjacent to the PNG in
`../images/atlas/shire-v1.json` and `../images/atlas/shire-v1.md`.
The chronological journal is `../review/shire-atlas.html`.

## Verification

`verify-atlas.cjs` passed with Chrome at 1440, 390 and 320 pixels in English,
Spanish and Russian, including story navigation, browser back, unlocking,
language persistence, invalid and unavailable storage, zoom, library return,
44-pixel targets and absence of document overflow. All artwork decoded.
The phone header is 61 pixels high. Compact fit mode uses icon markers;
captions remain available on keyboard focus and hover.

Independent Chrome mobile-emulation checks confirmed native map panning and
pinch zoom at 390 x 844 and 320 x 700. These are not physical Safari tests.
Review caught small overview captions covering their own markers; icon-only
overview and a focused-tooltip geometry test address that issue.

The UI is a preview at `../atlas.html`, linked by the map icon in the library.
It does not replace the reader's existing entry URL.
