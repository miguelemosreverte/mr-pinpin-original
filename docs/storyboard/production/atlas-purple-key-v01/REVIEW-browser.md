# Composed Turn And Green-Key Review

2026-09-23. The directory retains its initially assigned purple-key name;
the actual background experiment is GREEN. No atlas changes, paid calls,
commits or source-media edits by this review lane.

External root: `/Volumes/TB4/mac-mini-storage/shared/atlas-purple-key-20260923`.

## Composition First Edition

`review-v01/index.html` was opened by main for the user and is frozen.
It automatically plays the real RGBA clips in this repeating order:
000 walk -> outbound -> 015 walk -> return. Each uses samples 0-23 at 24fps,
one second; the composition is four seconds. No phase matching, interpolation,
crossfade, reverse playback or altered matte pixels. Fixed 480x270 display
proxies are enlarged for inspection, not represented as full native resolution.
The canvas is silent, with automatic playback, a pause control and current phase.

Both turns' front-facing detours remain explicitly labeled. Displaying their
composition is not approval of monotonic turns, calibrated angles or new gait.
This first edition contains no green-key result; its provenance says pending.

Real Chrome checks passed at desktop 1440x900 and touch/mobile 390x844:
automatic ordered playback completed a wrap; pause and offscreen suspension
stopped animation; the heading control worked; images decoded; no horizontal
overflow, JavaScript errors or failed requests were recorded. Canvas fits the
first viewport in both sizes. Both screenshots were visually inspected and show
the actual rendered character, readable phase label and controls.

Evidence: `browser-v01/{1440,390}-composition.png` and
`browser-v01/browser-results.json`. The previous neighbor review is unchanged.

## Final Edition

Open **`review-v03/index.html`**. V02 remains frozen; v03 adds actual first-frame
posters so neither green comparison panel is blank before manual playback.
Posters were extracted with FFmpeg from the native and despilled dark MP4s,
without editing, resizing, AI or media replacement. Source hashes were checked
unchanged. `review-posters-v01/posters.json` records commands and all hashes.

The composition explicitly uses the previous **white-background-derived**
sprites. Green is a separate single 000 loop, not a generated green turn set;
no green clip is mixed into the four-clip composition.

V03 uses the repository's parse5 parser to compose HTML, removes the second
interactive player, and loads four sheets through one decoded cache. The old
interactive review remains accessible through a relative link. Lucide icons
initialize; native videos pause offscreen/hidden. Exact prompts, settings,
source/video hashes and full native/baseline/despill nose crops remain visible.

Baseline keying leaves green fringe. Despill reduces it but residual
yellow-green fringe remains: **not a perfect key**. Despill preserves baseline
alpha; it does not restore missing detail. Frame-000 evidence shows the dark
nose, not proof of all-frame anatomical or whisker preservation. The old white
and new green clips are different generated samples, not a controlled causal
comparison. All 25 green samples remain at 24fps, with no loop repair.

The requested literal #00FF00 was not achieved: measured input border ranges
R 1-20, G 239-251, B 1-16. This limitation must remain visible in the report.

V02 browser checks passed at both viewports: four-phase automatic wrap, actual
SVG pause icon, pause/offscreen suspension, one canvas/cache (four requests and
four decoded sheets), no second interactive player, decoded inputs and exact
green prompts. Both green videos played and wrapped, with no media errors.
There was one `net::ERR_ABORTED` media request per viewport, not zero transport
failures. No JavaScript errors or overflow. Screenshots in `browser-v02/`.

Final v03 checks **passed at both viewports**, including both 1280x720 posters
decoded before Play, actual SVG icon, four automatic phases, one cache/canvas,
pause/offscreen behavior, exact prompts, native/keyed loop playback and no
overflow or JS/media errors. One `net::ERR_ABORTED` media cancellation was
recorded per viewport; playback still passed. Desktop/mobile composition and
pre-play poster screenshots were visually inspected: both comparison panels
show real images immediately, with readable labels and stacked mobile layout.
Evidence: `browser-v03/{1440,390}-{composition,posters,green}.png` and
`browser-v03/browser-results.json`. All build/FFmpeg/browser jobs finished.

## Source And Reproduction

Scoped additions in `scripts/neighbor-turn-review/`: `compose.cjs`,
`composition.js`, `composition.test.cjs`, `green-section.cjs`, and
`verify-composition.cjs`, plus `make-posters.py`. Focused suites: **15 passed** (scheduler, cache,
builder, four-clip sampling, parsed HTML composition and green hash binding).

```sh
ROOT=/Volumes/TB4/mac-mini-storage/shared/atlas-purple-key-20260923
SOURCE=/Volumes/TB4/mac-mini-storage/shared/atlas-neighbor-turn-20260923/review-v01
RECORDS=docs/storyboard/production/atlas-purple-key-v01
# After restoring archived trial media, copy these source-preserved records:
cp -n "$RECORDS/green-review-manifest-v01.json" "$RECORDS/green-review-manifest-v02.json" "$ROOT/"
mkdir -p "$ROOT/review-posters-v01"
cp -n "$RECORDS/review-posters-v01/posters.json" "$ROOT/review-posters-v01/posters.json"
node --test scripts/neighbor-turn-review/{review,composition}.test.cjs
# Output must not already exist. All manifest-selected artifacts must be restored.
node scripts/neighbor-turn-review/compose.cjs --source "$SOURCE" \
  --green "$ROOT/green-review-manifest-v02.json" --out "$ROOT/review-rebuilt"
PLAYWRIGHT_MODULE=/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright \
  node scripts/neighbor-turn-review/verify-composition.cjs "$ROOT/review-rebuilt" "$ROOT/browser-rebuilt"
```

Builder preserves the source review, copies existing media to external SSD,
and emits `composition-provenance.json`. The optional green manifest selects
the actual input, provider record, native/keyed clips, prompts and nose evidence.
First/end binding and source/video hashes are checked; hosted transport URLs
are not included in the generated report/provenance.

Poster regeneration: run `make-posters.py --manifest <trial>/green-review-manifest-v01.json
--out <new-directory>` on mini with the existing Python and FFmpeg installation.
`green-review-manifest-v02.json` adds the native/keyed poster paths and receipt.
Exact byte-identical copies of both manifests and the poster receipt are
preserved beside this source report (receipt under `review-posters-v01/`).
The review manifests are not in the 50-file HF archive; restore these small
records from source before rebuilding. Existing trial files are not overwritten
by the copy commands above.

Final HTML SHA-256:
`e03815cd6c5510f13cd74e00b84b05aaf64c84af9ab364d081ec789ca1a18752`.
Native poster SHA-256:
`cfaa8bfa49e5298e4466d5e7a61f0787175f0c6af03f5739dd9eae9ead0c1636`.
Keyed poster SHA-256:
`0be2e52fe6a2d4c1e1e74c452c1af7a23721be4ef699f0f3ad35aebd4a5b123f`.

Main separately reported 4 actual FFmpeg key tests passed and asset checks
48 pass / 1 skip. Pages checking remains blocked by unrelated house/bath/workshop
references; this lane did not modify them or rerun the global build.
