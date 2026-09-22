# Seedance2 atlas motion review

Miguel explicitly selected Seedance2 for one 8-second, 1080p test. Result and motion approval are pending. The previous [Kling original](../videos/shire-kling-loop-v1.mp4) was rejected for insufficient visible water and tree movement. No cause for that failure has been established.

## Exact request

Model: `bytedance/seedance-2.0/image-to-video`.

The prompt and configured input parameters below match [atlas-video-seedance2-v1.json](atlas-video-seedance2-v1.json):

```json
{
  "prompt": "Fixed overhead camera. Clearly visible ripples and shimmering reflections move across the lake. Water flows continuously down the waterfalls and beneath the bridge. Tree crowns and leaves sway in a breeze. Clear air, steady daylight. Seamless looping shot.",
  "duration": "8",
  "resolution": "1080p",
  "aspect_ratio": "auto",
  "generate_audio": false
}
```

The generation helper uploads `docs/storyboard/images/atlas/shire-v1.png` once and assigns the same uploaded URL to both `image_url` and `end_image_url`. Using the approved map as the end frame is an explicit user request; it is not an established explanation for the earlier Kling failure. Matching frame inputs and the loop prompt do not establish a successful loop before review.

The config explicitly sets `sourceImageField: "image_url"`. This selects Seedance2's required starting-image field instead of the helper's Kling-oriented `start_image_url` default. The [official API schema](https://fal.ai/models/bytedance/seedance-2.0/image-to-video/api) documents `image_url`, optional `end_image_url`, duration, resolution, inferred aspect ratio, and audio control.

## Cost and resolution

The rough estimate is **$5.456**, calculated as 8 seconds at the advertised 1080p rate of $0.682/second. It is not an invoice or confirmed charge. The [official model pricing page](https://fal.ai/models/bytedance/seedance-2.0/image-to-video) also specifies $0.014 per 1,000 tokens for 1080p, with `tokens = (output height * output width * duration * 24) / 1024`. Actual billing depends on delivered dimensions and duration; `aspect_ratio: "auto"` does not establish those dimensions in advance.

The [API schema](https://fal.ai/models/bytedance/seedance-2.0/image-to-video/api) includes optional `resolution: "4k"`, although some overview copy still lists a 1080p maximum. This test requests 1080p. No 4k generation or upscale is part of this test; review motion first.

## Generation provenance

- Generation helper: `scripts/generate-atlas-video.cjs`.
- Configuration: `docs/storyboard/production/atlas-video-seedance2-v1.json`.
- Approved source: `docs/storyboard/images/atlas/shire-v1.png`.
- Source SHA-256: `80af7f9eb7188f0a1f64969a22632d0ef9732284d027042222c1543879f03780`, checked against the PNG and saved request sidecar.
- Requested output: `docs/storyboard/videos/shire-seedance2-loop-v1.mp4`.
- Request sidecars: [JSON](../videos/shire-seedance2-loop-v1.json) and [Markdown](../videos/shire-seedance2-loop-v1.md). These record the submitted input, source hash, request identity, status, and generation events. The parent owns collection and completion metadata.
- Review page: [Seedance2 review](../review/atlas-seedance2.html), with the original `shire-v1.webp` poster and native video controls.

The saved request was submitted when these notes were prepared. Sidecars are the current provenance record; this page does not claim generation success, measured duration, delivered resolution, or motion approval. Keep credentials out of notes, browser assets, reports, and sidecars. This documentation task makes no paid API calls and does not change the production atlas.

## Review handoff

The parent will collect the existing request and test playback after download. Do not submit another request to fill a missing video. The review page can be checked locally while the MP4 is absent; a missing-media error is expected at that stage.

After download, check visible lake ripples and reflections, continuous waterfall and bridge-water movement, tree movement, camera stability, preservation of the approved map, and the loop boundary. Record actual media dimensions and duration before replacing the pending caption. A playable file alone is not motion approval.
