# Neighboring-Angle Video Sprite Trial

Status, 2026-09-22: **Trial complete; both clips rejected for gait compliance.
Not production artwork.** The bounded trial was authorized for exactly two
requests using the reviewed image pair, at $0.72 estimated total, with no retries
or upscale. Seedance is excluded
in every version. Provider selection itself made no paid generation calls.

## Provider and Budget

Prepared endpoint: `fal-ai/ltx-2.3/image-to-video/fast`.
[Official API](https://fal.ai/models/fal-ai/ltx-2.3/image-to-video/fast/api)
documents `image_url` plus optional `end_image_url`, minimum duration 6 seconds,
1080p, numeric 24 fps, and `generate_audio: false`. It does not document a seed
or dedicated camera-lock parameter; neither is submitted.

On 2026-09-22 at approximately 09:35 UTC, a read-only authenticated request to
`https://api.fal.ai/v1/models/pricing` returned:

```json
{"endpoint_id":"fal-ai/ltx-2.3/image-to-video/fast","unit_price":0.06,"unit":"seconds","currency":"USD"}
```

The [official model page](https://fal.ai/models/fal-ai/ltx-2.3/image-to-video/fast)
also states $0.06/second at 1080p in its request-cost text. Its descriptive table
contradicts that with $0.04/second; use the API-confirmed higher rate, not the
cheaper table. **6 x $0.06 = $0.36 per clip; two clips = $0.72 estimated total.**
This is not a receipt or a provider-enforced spending cap. Only two approved
single submissions; no automatic paid retries, upscale, or fallback models.

Alternative checked, not selected or submitted: [PixVerse V6 Transition
API](https://fal.ai/models/fal-ai/pixverse/v6/transition/api) supports explicit
first/last images and 1-15 seconds; its [tiered price
text](https://fal.ai/models/fal-ai/pixverse/v6/transition) lists $0.045/second
for 720p without audio. Its generic pricing API base is $0.005/second, not the
720p tier, so that base cannot price a 720p request. It requires `first_image_url`
and different audio/control fields that the existing runner does not preserve;
LTX is the selected preparation because it reuses the runner unchanged.

## Prepared Inputs

- [105-degree config](video-sprite-trial-angle105.json)
- [120-degree config](video-sprite-trial-angle120.json)

Both point to validated `appearance-angle105.png` /
`appearance-angle120.png` in
`/Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922/`.
Both were visually inspected and decoded as 887 x 887 before submission. Names
alone do not establish exact heading accuracy, anatomy or identity approval.
MP4s and request sidecars were written to the same external SSD directory.

The prompt is identical between angles, asking for one slow full in-place gait
cycle over six seconds. Heading comes from each image rather than an unsupported
numeric camera parameter. The unmodified [existing runner](../../../scripts/generate-atlas-video.cjs)
uploads each reference once and supplies that same URL as both start and end.
`matchEndFrame: true` is explicit. It records source hash, exact input, request
ID and measured output metadata, with duplicate-submit and transport-retry guards.

The SDK and a credential are available through the existing local client-root/
environment-file mechanism (`FAL_CLIENT_ROOT`, `FAL_ENV_FILE`, or `FAL_KEY`).
Presence was checked without exposing values. No new credential files or provider
client are needed. Config syntax can be checked via exported `readConfig`
without creating a client or contacting generation endpoints.

## Execution and Review Gate

Submitted once each using the unmodified runner:

| Approximate angle | Request ID | Anchor SHA-256 |
| --- | --- | --- |
| 105 | `01a0c87c-e452-7903-8fec-71ba082c7127` | `6f102ee59ee4301b6e1c5a0b0ac0158d70dcc8b2c24ec253d43ebaf07c1f69e9` |
| 120 | `01a0c87c-eabd-7b71-bd70-0b28397f6cc3` | `72bc34262697ecab7ff33d5c23c41c9815e8f474b8b591bfecbdc70a19cf548e` |

Outputs: `video-angle105-ltx23-v01.mp4` and `video-angle120-ltx23-v01.mp4`
under the external root above, with same-basename JSON/Markdown request logs.
Both anchors and `appearance-pair-v01.png` remain unchanged. The runner's nine
focused unit tests passed before submission.

### Collected Results

Both requests returned `complete`. Exact submitted first/end image URLs match
within each request. Both outputs are H.264, 1920 x 1080, 24 fps, 145 frames,
6.041667 seconds, no audio. Thus `auto` changed the 887 x 887 reference canvas
to 16:9; do not claim unmodified reference framing.
Contact-sheet inspection also shows the top quills very close to, or cut by,
the upper frame boundary in sampled poses. This is a framing defect to review
at native size, not a quantified crop amount or proof of its internal cause.

| Angle | Submitted UTC | Collected UTC | Bytes | Output SHA-256 |
| --- | --- | --- | --- | --- |
| 105 | 09:40:23.282 | 09:41:02.587 | 2,671,688 | `96e34c32ec99a44a5632f160735283feadda58661ebec29ac82b92746fe3191a` |
| 120 | 09:40:24.925 | 09:41:02.937 | 1,806,654 | `57355584747d7db90f997a51e8f6228359575795849674c29eef83600d4c4e20` |

Submission-to-collection elapsed time was 39.305s and 38.012s respectively,
including queue, polling and download. No inference-only timing or billing
receipt is available. Request estimate remains $0.72 total; there were exactly
two successful submissions, no retries, no upscale and no Seedance.

Two contact sheets, `video-angle105-ltx23-v01-contact.jpg` and
`video-angle120-ltx23-v01-contact.jpg`, are beside the raw clips. They were
extracted locally at two frames/second, 320-pixel-wide cells, four columns by
three rows. This is sampled inspection, not a full-frame gait measurement:

- 105: repeated alternating visible foreleg poses across the sampled six
  seconds indicate several motions, not the intended single slow full cycle.
- 120: repeated high forepaw lifts toward the muzzle and conspicuous posture
  changes read as paw-to-chin waving, not the requested four-legged walk.
- Far-side limbs remain partly occluded. Neither clip certifies all four paw
  contacts, constant heading, a correct loop seam, or neighboring-angle phase
  consistency. No source normalization was applied to hide the differences.

The lead review independently inspected both contact sheets and rejected gait
compliance. Generation success means files were returned, not that the walk
requirement passed. Native playback and a diagnostic neighboring-angle boundary
view remain useful for showing the defects, not as production approval.

Raw videos and reference pair are preserved. No one-second retime was made by
this provider lane; retiming the whole sequence must not relabel multiple
motions as one cycle. Full playback and any bounded extraction belong to the
subsequent review, without more paid calls.

The commands used were `node scripts/generate-atlas-video.cjs submit CONFIG`
once per config, followed by `node scripts/generate-atlas-video.cjs collect CONFIG`
for each saved request. The two-request authorization is exhausted. Do not rerun
submission, replace requests or purchase an upscale under this authorization.

Preserve original six-second outputs. A one-second derivative would be explicit
6x retiming for comparison, not native one-second generation. Inspect actual
cycle count first: matching endpoint images do not prove one full gait, a clean
seam, fixed anchors, or motion at all. Multiple cycles cannot be labelled one.
Inspect each visible paw's lift/swing/contact, sliding, occluded-limb uncertainty,
face stability, camera drift, generated framing and adjacent-heading consistency.
`aspect_ratio: auto` previously changed framing in landscape tests, so inspect
delivered dimensions rather than assuming reference aspect preservation.
No atlas assets or production registries are changed by this preparation.
