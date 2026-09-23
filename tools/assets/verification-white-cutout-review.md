# White clip software cutout review

Completed 2026-09-23. Experimental offline review only; no production changes,
paid calls, media regeneration, endpoint repair, or commits by this lane.
The earlier white `review-v1` is unchanged.

## Review and rebuild

Trial root: `/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923`.
Opened page: `review-cutout-v1/index.html` beneath that root.

```sh
node scripts/build-white-cutout-review.cjs \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923 \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/review-cutout-v2
```

Choose a new external output directory; existing output is refused. The small
builder copies the native clip, dark/green composites, endpoint pair, contact
sheet, and producer metadata/scripts. `review-provenance.json` records each
trial-relative source, copied path, and SHA-256. It checks native provenance
against both audits and provider metadata, verifies both composite hashes, and
checks each copied file. It does not alter producer files or invoke models.

## Findings

- Native and composites retain 25 frames at 24 fps, duration 1.041667 seconds.
  All players use controls, loop, muted, playsinline, and no autoplay; offscreen
  and hidden-page playback pauses. No animation-frame polling is used.
- Pauli's local u2netp/rembg/PyMatting processing uses fixed thresholds 240/10
  and erosion 10. Masks are independent per frame, without temporal filtering.
  Dark/green MP4s are baked composites; RGBA PNGs are the transparency outputs.
- Separation looks promising, with slight pale face fringe and whisker loss.
  Heading movement remains; neither gait nor temporal matte stability is certified.
- The original request supplied the same first/end still and `matchEndFrame:
  true`. Decoded endpoints differ: full-frame RGB MAE 3.750314, foreground-mask
  MAE 9.292345 on a 0-255 scale; only 1.346321% of foreground pixels match
  exactly. Approximate pose closure is not pixel lock. Generation and lossy
  encoding both contribute; no endpoint replacement was performed.

Native SHA-256:
`7ca187118f003e7b0d7ace3a16fa5f0bc03eead0115c4adee1f0428c92495877`.

## Verification

Chrome/Playwright checked 1440x844 and 390x844. All three videos decoded at
1280x720 and looped after explicit playback. Images decoded, exact displayed
video prompt matched the provider record, offscreen pause worked, and there
were no JavaScript errors or horizontal overflow. Both full-page screenshots
were visually inspected: readable stacked mobile content and three desktop
players, with no overlaps.

Desktop had no failed requests. Mobile emitted one `net::ERR_ABORTED` for the
green clip; a focused repeat confirmed all clips reached readyState 4, had no
MediaError, and looped. The page's error alert stayed empty. This canceled
request did not prevent playback; the raw evidence is retained rather than
claiming a clean network log.

Evidence within the review directory: `browser-results.json`,
`browser-mobile-recheck.json`, `browser-1440.png`, and `browser-390.png`.
`node --check scripts/build-white-cutout-review.cjs` passed. No new test harness
was introduced for this bounded report. Browser sessions finished and closed.

Handoff files: this report and `scripts/build-white-cutout-review.cjs` only.
No live atlas changes, Git writes, or changes to other agents' assets.
