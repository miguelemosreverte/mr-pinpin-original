# Neighbor-Turn Browser Review

2026-09-23. Complete; local experimental review only. No production atlas changes,
paid calls, source commits, media repair, or deletion by this lane.

## Open And Findings

External root: `/Volumes/TB4/mac-mini-storage/shared/atlas-neighbor-turn-20260923`.
Open `review-v01/index.html` directly. Main opened this version for the user;
verification did not rebuild or alter the opened page.

Both native directed turns make nonmonotonic front-facing detours, not clean
neighbor rotations. Outbound overshoot is conspicuous around samples 8-18;
the return also faces forward before reaching 000. These issues appear beside
both clips and the demo. Nominal 015 is not angular calibration. Existing user
approval covers the earlier 000 loop/perspective, not these new turns.

Full input images appear first, paired on desktop and stacked on mobile.
Exact image-edit and all three video prompts are visible, with settings, source
hashes, unchanged native clips and USD 0.135 total estimated new video cost.
Conditioning transport URLs are checked for endpoint binding but not published.

## Verification

- Focused Node suite: **11 passed**. Scheduler, latest intent/cancellation,
  unloaded clips, immediate next turn, decode coalescing/retry, exact prompts,
  content hashes, safe paths, geometry and no-overwrite checks.
- Real Chrome: **1440x900 desktop and 390x844 touch/mobile passed**.
  Both 1672x941 input images decoded; exact prompts matched their source records;
  no horizontal overflow, JavaScript errors or failed requests were recorded.
- All three unchanged 1280x720 native videos played and wrapped with controls,
  loop, muted and no autoplay. No media errors. Mobile loop015 readyState was
  sampled at 1 immediately after wrapping; other final media samples were 4.
  Wrapping was verified independently of this readiness snapshot.
- Actual heading clicks/taps drove 000 -> outbound -> return -> 000, then 015.
  Queued return started at precisely the outbound completion boundary. No
  compulsory extra destination loop. Initial load fetched only loop000; the
  first 015 request fetched two further sheets, and the return fetched one.
  Repeated pending requests did not issue duplicate sheet requests.
- Pause stopped RAF and drawing. Offscreen suspension preserved phase across
  a 1.1-second wall-clock wait; returning resumed playback without time catchup.
- All four input/demo screenshots were visually inspected: real, fully framed
  imagery; readable text and controls; mobile references stacked correctly.
  Canvas screenshot crops contained 185,919 desktop / 18,659 mobile pixels
  differing from the canvas background, confirming nonblank rendered content.
  Screenshots and machine results: `browser-v01/{1440,390}-{inputs,demo}.png`
  and `browser-v01/browser-results.json`.

Each playback clip uses original matte samples 0-23 at 24fps (1000ms); native
sample 24 remains separate endpoint evidence. Packed previews are 480x270,
lossless WebP after fixed downscaling from 1280x720, not full-resolution previews.
No alignment, interpolation, crossfade or reverse playback. Only joins matter;
matching phase throughout the two steady loops is not an acceptance requirement.
Loading/pauses may extend wall wait beyond one second. Browser scheduling is not
hard real-time. Immediate turn-to-turn chaining is timing-tested, not covered by
Parfit's four loop/turn visual-join audit or a new seamlessness approval.

Main reported repo asset checks 48 pass / 1 skip, with the Pages build check
blocked by unrelated in-progress house/bath dangling references. This lane did
not rerun or modify that unrelated work.

## Reproduce

Source: `scripts/neighbor-turn-review/{pack.py,build.cjs,scheduler.js,sheets.js,player.js,review.css,review.test.cjs,verify.cjs}`.
The external `pack-spec-v01.json` identifies all 96 selected original matte PNGs
relative to the shared parent. `review-manifest-v01.json` selects references,
records, warnings and join report. Preserve both alongside archived study assets.
Packing uses existing Pillow on mini; original 000 frames remain in the prior
`atlas-topdown-walk-20260923/matte-v01/rgba-frames/` sibling directory.

```sh
node --test scripts/neighbor-turn-review/review.test.cjs
ROOT=/Volumes/TB4/mac-mini-storage/shared/atlas-neighbor-turn-20260923
# With the recorded sheets-v01 already restored; output must not exist:
node scripts/neighbor-turn-review/build.cjs --trial "$ROOT" \
  --manifest review-manifest-v01.json --out "$ROOT/review-rebuilt"
PLAYWRIGHT_MODULE=/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright \
  node scripts/neighbor-turn-review/verify.cjs "$ROOT/review-rebuilt" "$ROOT/browser-rebuilt"
```

To regenerate sheets, run `pack.py --trial <shared-parent> --spec
<trial>/pack-spec-v01.json --out <new-sheet-directory>` on mini using the existing
`pinpin-matting-tools-20260923/bin/python`, then point a new review manifest at
that output's `sheets.json`. Packing refuses overwrite and records all source
hashes. Builder validates each source/video/sheet hash and emits copied-asset
and helper hashes in `review-provenance.json`.

Frozen review HTML SHA-256:
`cb3b938c537324456f204b06bdd707f428f454228ebf6fa9f5cbe46e1e67cf3b`.
Review provenance SHA-256:
`1686de29f0ef1442f372f844c049f74bd8344d3a5d208f03489cb0c3c891971c`.
Sheet manifest SHA-256:
`88c4789fd5583d1cc13f89d2347e965d23893941429f321aa91bff03234dcc2a`.

All build, pack and verification sessions finished. Archive ownership remains
with Pauli/main; this report does not claim an archive receipt.
