# Mr. PinPin Design Comparison

A scroll-first HTML report examining historical character treatments and
testing them through complete chapter sequences. Open `index.html` directly in
a browser; no build or dev server is required.

Published report: https://miguelemosreverte.github.io/mr-pinpin-original/comparison/

The desktop chapter sidebar becomes a horizontal strip on smaller screens.
All content stays visible in reading order. Native fragment links support
bookmarks and browser history; `navigation.js` only adds a scroll-following
highlight. Without JavaScript, the links still work.

## Contents

- `index.html` and `report.css`: report, source references, chapter text and critiques.
- `trials/`: generated exploration sheets, including earlier versions retained for provenance.
- `farm/`: the historical farm storyboard reference set.
- `evidence.json` and `directions.json`: evidence ledger and editorial style families.
- `trial-prompts*.json`: built-in image generation prompts and chapter-selection records.
- `character-rules.json`: explicit four-limb constraint and panel-by-panel review rules.
- `anatomy-repair-chapter-28.json`: repair attempts, selected revision and tradeoff.
- `generation-timing.json`: observed timing samples, calculations and limitations.

The report displays 20 sheets and 106 panels across chapters 3, 24, 28, 32 and 34.
The original book and reader are not modified. General satisfaction with the report
does not silently approve every trial as a final character design.

## Observed Generation Rate

Measured sample: round 5, six sequential image-generation calls producing six
storyboard sheets with 33 panels. Approximate combined tool wait: **9m 08s**,
or **1m 31s per sheet**, **0.66 sheets/minute**, and **3.62 panels/minute**.

The subsequent chapter-28 anatomy correction took four edit attempts and about
**3m 29s** of combined tool wait, producing one selected revised sheet and no new
story panels. Combined observed wait for these ten calls: **12m 37s**.

These are conversation tool wall-time observations, not pure model inference time
or end-to-end delivery time. They exclude prompting, review, report writing,
verification, feedback and publication. Panels on a sheet are not independent
image calls. Earlier rounds are not included in the timing estimate. No cost,
model-version or future speed guarantee is inferred. See the JSON for individual
samples and the repair record for failed attempts.

## Verification

Use an existing Playwright installation and installed Google Chrome:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node docs/comparison/verify.cjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node docs/comparison/verify-navigation.cjs
```

Run from the repository root. Checks cover 1440, 1024, 768, 390 and 320px viewports,
image loading, chapter pairing, preserved source paragraphs, local file links,
overflow, duplicate IDs and text/image overlap. Screenshots go to the OS temporary
directory. These automated checks do **not** establish correct illustrated anatomy;
that requires visual inspection.

The navigation suite also checks direct links, browser Back, manual-scroll
highlighting, sticky positioning and mobile link visibility. Set `REPORT_URL`
to the published report URL to run its desktop/mobile deployment checks.

## Repository Boundary

This directory belongs to `miguelemosreverte/mr-pinpin-original`. A local commit
records the work; pushing and GitHub Pages deployment are separate operations.
