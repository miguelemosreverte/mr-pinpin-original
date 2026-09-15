# Mr. PinPin Storyboard Reader

Published reader:
https://miguelemosreverte.github.io/mr-pinpin-original/storyboard/?chapter=1&lang=en

Chapter one is a six-scene candidate derived from the character investigation.
Its new full-size illustrations live in `images/chapter-01-v2/`; earlier images
remain in `images/chapter-01/` and are no longer selected by the reader.
This is a review candidate, not a declaration of final art approval.

## Text and Continuity

- The eight original prose paragraphs are retained in full. The final paragraph
  is divided across drawing, returning water and celebration. The `---` chapter
  divider is not narrated.
- Existing English and Spanish translations are retained, with the same split.
- The other 37 chapters retain their existing extracted scene text.
- `production/chapter-01-v2.json` records prompts, references, measured tool times,
  visual checks and adaptation choices.
- The quill is held in scenes 4-5, and appears on the back in scenes 1-3 and 6.
  Its removal and return are visual continuity choices, not added narration.

## Reading and Navigation

The URL parameters are `chapter=1..38` and `lang=en|es|ru`.
Language flags preserve approximate reading progress. The horizontal chapter
strip offers direct links without a modal; previous/next controls remain.
Historical illustrations are in a plainly labeled section, with no accordion.
Each chapter's scene count is calculated from its own data, not fixed at five.

## Verification

Serve the repository's `docs/` directory over HTTP, then run:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright READER_URL=http://127.0.0.1:8767/storyboard/ node docs/storyboard/verify.cjs
```

Requires an existing Playwright installation and Google Chrome. The suite checks
five viewport widths, all three languages, image dimensions, exact rendered
paragraphs, source-text preservation, routing, language-position retention and
overflow. Use `LIVE_CHECK=1` with the public URL for desktop/mobile deployment
checks. Screenshots are written to the OS temporary directory.

Visual anatomy is checked manually; browser tests cannot establish limb counts.
