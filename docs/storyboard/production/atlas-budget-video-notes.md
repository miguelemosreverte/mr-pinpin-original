# Budget motion comparison

## Decision and scope

Miguel rejected the Seedance 2 result: it moved the water and trees but invented
a splash in the middle of the lake. Its estimated $5.48 per attempt is unsuitable
for repeated exploration. This estimate is not a reconciled billing receipt.
On September 21, 2026, he authorized trying cheaper models, accepting imperfect
looping for this motion review.

Two generation candidates, estimated $0.46 combined, with no automatic retries or
upscaling. Nothing replaces the production atlas. The existing approved map
`images/atlas/shire-v1.png` is the first-frame reference for both requests.
Unlike the prior trials, `matchEndFrame: false` omits end-frame conditioning.

| Candidate | Requested settings | Estimated cost | Config |
| --- | --- | --- | --- |
| MiniMax H3 Max Turbo | 5 seconds, 768P, prompt expansion disabled | $0.10 promotional | [H3 config](atlas-video-h3-turbo-v1.json) |
| LTX-2.3 Fast | 6 seconds, 1080p, 24 fps, audio disabled, auto aspect | $0.36 | [LTX config](atlas-video-ltx23-fast-v2.json) |

H3's endpoint lists $0.02/second for 768P through September 30, 2026, then
$0.04/second. The pricing API's $0.0125 base rate corresponds to 480P, not
the requested 768P tier. LTX's authenticated pricing API rate is $0.06/second.
These are estimates, not confirmed charges. H3 does not expose an audio-off
switch in its current schema; the preview is muted and the downloaded original
is retained unchanged.

Sources: [H3 pricing](https://fal.ai/models/minimax/h3-max-turbo/image-to-video),
[H3 API](https://fal.ai/models/minimax/h3-max-turbo/image-to-video/api),
[LTX pricing](https://fal.ai/models/fal-ai/ltx-2.3/image-to-video/fast),
[LTX API](https://fal.ai/models/fal-ai/ltx-2.3/image-to-video/fast/api).

## Shared prompt

> Fixed overhead camera watching this miniature forest map. A steady light
> breeze makes small ripples travel across the lake, with sunlight shimmering
> on the water. The stream flows beneath the bridge. Leaves and tree crowns
> sway gently. Houses, paths, bridge and shoreline remain still. Steady warm
> daylight throughout.

## Chronology and review

The generator writes the request ID, exact inputs, source hash, UTC events and
measured output metadata to JSON and Markdown beside each MP4. Follow those
records for submission, queue and collection times. Never resubmit an existing
request merely because collection failed or the queue is slow.

- H3 request: `01a0c1ee-8315-78e2-906a-813169a964d1`.
- LTX v1 request: `01a0c1ee-891c-7a60-a463-211624729035`, validation rejected.
- Corrected LTX v2 request: `01a0c1f0-9cf7-76d3-a51e-63e76c0ba34b`.
- [Comparison preview](../review/atlas-budget-video.html).
- H3 sidecars: `../videos/shire-h3-turbo-motion-v1.json` and `.md`.
- LTX sidecars: `../videos/shire-ltx23-fast-motion-v2.json` and `.md`.

LTX v1 returned explicit HTTP 422 validation errors for string `duration: "6"`
and `fps: "24"`: both fields require numeric enum values. No video was returned.
Its config and failed-request sidecars remain unchanged. The v2 request changes
only those values to numbers and uses a separate output path; it is a manual
correction of a confirmed validation failure, not an ambiguous-request retry.
Billing of the rejected request is unverified.

H3 delivered 1152 x 768, 24 fps, 124 frames, 5.184 seconds, with audio,
16,111,139 bytes. Sampled frames show expanding concentric rings centered in the
lake and increasing brightness, rather than only the requested small distributed
wind ripples. This candidate should not be promoted to the atlas without review.

Review meaningful water and foliage movement, new objects or splashes, camera
drift, structural warping and exposure changes. Check the loop boundary, but do
not reject useful motion solely for an imperfect loop. Pixel differences alone
are not proof of plausible movement. Different resolution and duration mean
this is a practical candidate comparison, not a controlled quality benchmark.

Production approval remains pending Miguel's review.

## Collected results

H3 was submitted at 03:07:08.887 UTC and collected at 03:08:05.461 UTC
(56.574 seconds including queue, polling and download). Corrected LTX was
submitted at 03:09:26.577 UTC and collected at 03:10:06.181 UTC (39.604 seconds
including queue, polling and download). These are not isolated inference times.

LTX delivered 1920 x 1080, 24 fps, 145 frames, 6.041667 seconds, no audio,
41,983,334 bytes. Its auto aspect ratio produced 16:9 from the 3:2 source, so
the framing is not faithful to the existing map. Sampled frames do not show
H3's pronounced concentric central rings, but show framing drift. Neither
candidate is suitable for direct integration with fixed segmentation and depth
passes without further review. No upscale was submitted.

Both original encoded files are available in the browser preview without
postprocessing. The displayed loop simply repeats the clip; it does not repair
the boundary. Existing atlas assets remain unchanged.
