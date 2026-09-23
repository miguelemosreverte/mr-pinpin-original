# Temporal white-patch review

Status: complete; final reviewed-correction page built from frozen producer
outputs and verified at desktop/mobile viewports.
Date: 2026-09-23.

Source: `scripts/build-white-matte-qc-review.cjs`.
Trial: `/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923`.
Final output: `review-qc-v02/index.html` beneath the trial. Its copied QC record
contains explicit authorization for `f014-c0003`, source-hash bindings, and
`recomputed_pixels_match_saved_outputs: true`. Main relayed Pauli's final freeze
acknowledgement; the exact 502-pixel repair is unchanged. The provisional
`review-qc-v01` remains historical, not the final CLI/approval contract.
Prior reviews and media remain unchanged.

## Visible target

Parfit's `matte-temporal-audit-v01/frames012-016-native-matte-alpha.png`
visually confirms white background retained in the hind-leg gap at frame 14,
t=0.58333 seconds. Frame 15 opens the gap. The new review shows matching
before/after crops for frames 13, 14, and 15, detection overlays, dark-background
loops, and the unchanged native video for face/fur comparison.

Independent locator: exclusive bbox `[811,531,827,551]`, 201 connected
near-white pixels, alpha 238..241. Context crop `[700,470,1020,630]`.
This is a locator, not a repair mask: the same coordinates contain real leg/fur
in frame 13. The page pairs the original frame-14 gap with its erroneous alpha.

The review must not equate a lower white-opacity score with visual correctness:
pale fur and highlights can be removed incorrectly. Local detection/repair is
not gait correction, endpoint replacement, or a seamless-loop certification.

Independent validation found a synthetic enclosed white paw that passes all
five detector gates despite being actual foreground. The actual frame-14 fix
is visually approved by main, but the detector does not guarantee automatic
cleanup. The final CLI defaults to detection only and requires explicit reviewed
candidate IDs for software correction. Source evidence:
`matte-independent-validation-v01/report.md` under the trial root.
That audit independently confirms exactly 502 changed pixels, unchanged face/
eyes and all pixels above y=500, and original bright-core alpha reduced to
0..15, not uniformly zero. Zero in the color-weighted score below must not be
misread as every alpha value becoming zero.

## Builder contract

```sh
node scripts/build-white-matte-qc-review.cjs \
  --trial /Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923 \
  --manifest review-qc-manifest-v02.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/review-qc-v03
```

Use a new output path; the existing v02 is preserved. The external
`review-qc-manifest-v02.json` maps the producer's actual outputs;
it does not impose a new detector output format. It contains `version: 1`,
trial-relative `native`, `before`, and `after` clips, plain-text `summary`, `decision`,
`timing`, `method`, and `limitations`, plus:

- `flagged`: entries with `frame`, `note`, `before`, `after`, optional `overlay`
  and `crop` (exclusive native 1280x720 bounds). Cropping is CSS presentation
  only; copied PNG bytes are unchanged and full images remain linked.
- `evidence`: `native` and `alpha` diagnostic crops, with an explanatory `note`.
- `timeline`: `label` with actual score definition/units and `samples`, each
  carrying `frame`, `before`, and `after` numeric values.
- `logs`: trial-relative metadata, method records, or software source files.

The builder copies selected evidence with SHA-256 verification and writes
`review-provenance.json`. It refuses existing output, in-checkout output,
noncanonical output parents, and source paths escaping the trial. Videos have
controls, loop, muted and playsinline, no autoplay, offscreen/hidden-page pause,
and no animation-frame polling. Timeline is a plain SVG data chart.

## Result and score

Pauli's `qc.json` records one repair: frame 14, 502 changed pixels, no increased
alpha, and unchanged RGBA outside the allowed local region. All 24 other frame
files are byte-identical. Independently checked native video and all 50 before/
after RGBA hashes against the QC record. The reviewed before/after crop visibly
clears the white opening; face/fur preservation is supported by the bounded
change mask, not a claim that every original matte edge is perfect.

The timeline is a separate review measurement, not detector confidence:
in fixed ROI `[760,510,870,590]`, sum `alpha/255` for matte pixels where minimum
RGB is at least 230 and channel range is at most 20. Pillow/NumPy measured all
25 original and repaired PNGs on the mini. Frame 14 falls from 188.447059
fully-opaque-equivalent near-white pixels to zero; all other frames score zero.
The manifest preserves the full series and definition. Equivalent calculation
on each RGBA ROI: `((a[:,:,3]/255) * ((a[:,:,:3].min(2)>=230) &
(np.ptp(a[:,:,:3].astype(np.int16),axis=2)<=20))).sum()`.
This fixed-region, color-threshold measure is not motion-compensated and does
not establish general matte quality.

## Verification

`node --check` passed. Inline timeline checks passed for escaped labels, finite
values, strictly increasing frame indices, and distinct series styling.
Existing-output, traversal, in-checkout output, and nonfinite-score guards passed.

Chrome/Playwright at 1440x844 and 390x844: all three clips decoded at 1280x720,
duration 1.041667 seconds, readyState 4; explicit playback crossed a loop
boundary. All started paused, with loop/muted set and no autoplay. Offscreen
pause passed. All nine images decoded, including the six unmodified native-size
RGBA files displayed as matching crops. No horizontal overflow, JavaScript
errors, or media errors. Desktop recorded no failed requests. Mobile recorded
one `net::ERR_ABORTED` for the corrected clip's file request; it subsequently
reached readyState 4, played and looped without MediaError. This is a functional
pass, not a claim of zero transport aborts. The final page's visible reviewed-ID,
white-paw counterexample, and nonzero-alpha caveats were also checked.

Evidence inside `review-qc-v02`: `browser-results.json`, `browser-1440.png`,
`browser-390.png`, `frame14-1440.png`, and `frame14-390.png`. Desktop/mobile
frame-14 screenshots and the full mobile page were visually inspected. The
before/after defect is clear; text and stacked comparisons have no overlap.
Browser sessions finished and closed. No local server is needed.

No paid calls, live atlas changes, commits, producer-asset modifications, or
changes to unrelated dirty files by this lane.

Source handoff: this report and `scripts/build-white-matte-qc-review.cjs` only.
The separate HTML and its evidence remain on the external SSD. Archival belongs
to the main/producer lane; the producer freeze has now been acknowledged.
