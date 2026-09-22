# Video sprite input and review verification

Status: COMPLETE for the final book-only video review and bounded builder,
2026-09-22. Book-only output awaits acceptance; the earlier rig-derived motion
remains rejected. Neither is certified production animation.

## Final opened edition

`/Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922/review-book-only-video-v3/index.html`

V3 is final and was opened in the OS browser. Its first section shows the
unaltered book-only RGBA reference beside the native single-view PixVerse output,
the exact video prompt/settings and endpoint fields, the two original book
reference images, and the full exact imagegen record. Source/reference hashes
and the native-video hash were checked against their recorded identities.

Endpoint: `fal-ai/pixverse/v6/transition`. Actual submitted image fields:
`first_image_url` and `end_image_url`, containing the same original reference.
The one authorized request produced 1280x720 H.264, 25 frames, 1.041667 seconds,
no audio. Requested duration was one second; estimate was USD 0.045, not an
invoice. No angle-transition claim is made. Model, reference, and duration all
changed relative to LTX, so causation is not isolated.

The native artifact remains unedited: its background is black despite the white
prompt; transparency was not preserved and red/yellow fringes are visible around
feet/edges. Input-alpha handling is a hypothesis, not a proved cause. The page
states these issues and does not certify gait, seamless closure, or readiness.
The original reference alpha is preserved and displayed on white using CSS.

Final Chrome/Playwright checks passed at **1440x1000 and 390x844**:
all three book-only images decoded; exact video prompt matched saved JSON;
1280x720 native video played and wrapped through its loop. Controls, `loop`,
`muted`, and `playsinline` are retained, with no autoplay. No horizontal overflow
or JavaScript exceptions. Header reads "BOOK-ONLY VIDEO TRIAL / AWAITING REVIEW";
rejected prior work is labeled only in the historical sections.

Evidence under the infrastructure directory below:
`book-only-loop-results.json`, `book-only-loop-1440.png`, and
`book-only-loop-390.png`. The focused source suite now passes **10 tests**,
including book-only/no-guide input, original hash verification, single-view
records, alternate first/last image fields, and native-video hash rejection.

Portable rebuild input: `scripts/video-sprite-review-book-only.example.json`.
Place it in the restored trial root under a new manifest name, then use the
existing builder command below with that name and a NEW output directory.
It uses only trial-relative archived paths and retains historical sections;
no `input-lineage/` duplicate is required. All earlier HTML editions remain
unchanged. No further edition, generation call, or running job is pending.

## User decision

After viewing the inputs, the user rejected the Blender-proxy/rig-derived
workflow entirely. Preserve the opened report and all native artifacts as
historical evidence; do not extend or overwrite that HTML version. The next
image experiment uses only the original book face/body illustrations, with no
rig guide or prior rig-derived anchor. Await the new image and exact-prompt
handoff before creating a separate book-only review version. This restriction was
subsequently superseded ONLY for one approved PixVerse single-view retry: one
second, 720p, 16:9, estimated USD 0.045, original book-only RGBA used unchanged at
both endpoints. The saved record confirms submission at 2026-09-22T09:58:13.032Z.
No angle-transition trial, retry, or further expansion is included. The review builder
does not require a guide asset; the old rig-specific prose is historical, not
the specification for future book-only inputs.

The new reference-only report was opened separately as `review-book-only-v1/index.html`.
Its three book-only images decoded at desktop/mobile, its exact imagegen record
was visible, white CSS background preserved the original alpha, and no overflow
or JavaScript exceptions occurred. The old input-first HTML remains unchanged.

## Historical input report

`/Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922/review-inputs-v1/index.html`

This historical HTML was opened in the OS browser and is preserved unchanged.
The final book-only edition above supersedes it for current viewing.

Each angle appears first with its actual cropped input beside its native video,
followed by the verbatim video prompt, actual submitted parameters, endpoint,
USD 0.36 estimated price per call (not an invoice), source SHA-256, and recorded
workflow event timestamps. The builder checks each anchor's bytes against the
provider record's `sourceHash` and confirms the start/end image URL equality
without embedding the remote transport URLs in the page.

The exact same cropped still was used as start AND end for each video. No rig
video or pose-frame sequence was supplied to that video model. Inputs were
887x887; outputs were 1920x1080, 145 frames, about 6.041667 seconds, with no audio.
Requested settings were duration 6, fps 24, resolution 1080p, aspect_ratio auto,
generate_audio false, endpoint `fal-ai/ltx-2.3/image-to-video/fast`.

The visible lineage section includes the neutral phase-zero rig guide pair,
the actual book face/body references, the generated appearance pair before
deterministic cropping, and the complete original appearance Markdown including
the **exact submitted imagegen prompt visibly in the body**, not just embedded
JSON or a download. An unchanged Markdown copy is also linked.

Angles 105/120 are nominal AI-view labels. Only the rig cameras have exact
15-degree separation. Generated anchor anatomy is unapproved and some far-side
feet are occluded. Reviewer notes record repeated forepaw motion at nominal 105
and a paw-to-chin gesture with largely static hind legs at nominal 120. Neither
output establishes the requested single four-legged walking cycle.

## Source implementation

- `scripts/build-video-sprite-review.cjs`: standalone external HTML builder,
  safe relative asset resolution, exclusive new outputs, checksummed copies,
  visible exact-input provenance, native video controls, optional diagnostics.
- `scripts/video-sprite-boundary.cjs`: pure two-angle boundary queue helper.
- `scripts/build-video-sprite-review.test.cjs`: nine focused tests passed.

The builder does not generate media, call providers, interpolate, reverse, blend,
align anatomy, or modify production runtime/manifests. Selected ordered frames
are played forward on a shared one-second clock. A queued angle changes only
when that clock crosses a cycle boundary. The reported wait is measured wall
time, including a pause; it is not a promised maximum latency. Pause, hidden-tab,
and offscreen states freeze playback time. There are no animation-frame calls
while paused or offscreen, and native clips pause offscreen/when hidden.

`review-inputs-v1` deliberately has no selected cycles and leaves those controls
disabled. Earlier `review-diagnostic-v1` contains explicitly rejected,
provisional one-second whole-clip retimes, not certified gait. Its preview frames
are direct 256x256 cells from the provided 6x4 diagnostic sheets, without
rescaling, alignment, interpolation, or reversal. No shared endpoint match is
asserted. Native outputs remain available independently of cycle selection.

## Verification

`node --test scripts/build-video-sprite-review.test.cjs`: **9 passed**. Coverage:
boundary-only switches, measured wait including pauses, cancel/repeat requests,
clock validation, pending media, exact provenance/hash checks, rejected-gait
certification refusal, ordered frames, unsafe paths/symlinks, no overwrite, and
HTML/script escaping. Small unit fixtures require no external trial or provider.

Chrome via Playwright at **1440x1000 and 390x844** verified the real input-first
report: all images decoded, two input anchors and four lineage images present,
no horizontal overflow and no JavaScript exceptions. Additional comparisons at
1440 and 390 widths verified both video prompts equal provider JSON verbatim and
the full imagegen prompt appears visibly in the lineage body. A mobile screenshot
was visually inspected: readable wrapped text and a fully framed input image.

Real native clips were separately decoded and played in `review-native-v3` at
both viewport sizes, confirming both 1920x1080 videos advance and the pending
cycle preview stays disabled. Native players use 16:9 layout capped at 70vh;
contact sheets are full-width, distinct from the smaller frame grid.

A separately labeled synthetic fixture verified boundary behavior at both
viewport sizes, including unchanged angle before the boundary, pause stability,
cancel, a single visible frame, and stopped RAF counters while paused/offscreen.
Measured switch waits including a deliberate paused interval were 1254/1262 ms.
This fixture verifies control mechanics, not the generated character's gait.

## Evidence and rebuild

Screenshots and machine-readable fixture results:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-video-review-infrastructure-20260922/`.

- `inputs-top-{1440,390}.png`, `inputs-lineage-{1440,390}.png`.
- `native-real-{1440,390}.png`.
- `browser-fixture-v2/results.json` and desktop/mobile screenshots.
- `verify-browser.cjs`, `prepare-real-review.py`: retained external check helpers.

From the source checkout, with an existing external parent and NEW output:

```sh
cp -n scripts/video-sprite-review-manifest.example.json \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922/review-manifest-inputs-v1.json
node scripts/build-video-sprite-review.cjs \
  --trial /Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922 \
  --manifest review-manifest-inputs-v1.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922/NEW-review
```

The manifest uses `version: 1`, `verdict: rejected-gait`, and two `angles` records
in 105/120 order. Trial-relative record paths: `nativeVideo`, `anchor`,
`submission` (original provider JSON), `contacts`. Optional `cycle` accepts
`video`, ordered `frames`, `durationSeconds: 1`, `certified: false`, and
`boundaryPose: null` when no shared pose was established. Top-level paths:
`guidePair`, `appearancePair`, `appearanceRecord` (original Markdown), and
`bookReferences` (face then body). The exact opened manifest remains on the SSD.
The tracked `scripts/video-sprite-review-manifest.example.json` is a portable
copy of that manifest. It uses archived root files `input-book-face-scene17.png`
and `input-book-body-scene10-v2.png`, not the redundant `input-lineage/` copies.
After HF restoration, the no-clobber copy above supplies the manifest only if
missing. All media/provenance paths remain relative to the restored trial root.

No new image/video request or angle-transition submission occurred in this lane.
No commits, runtime changes, source deletions, or HF uploads were made. Pauli
owns archival. All required review/test processes finished successfully.
