# Atlas video review workflow

## Experiment 1: Kling rejected

Miguel reviewed the native video and reported no visible water or tree movement.
The candidate is rejected for insufficient meaningful motion. Numerical pixel
differences are not proof of animation: compression, texture variation and
exposure drift can all change pixels without making water flow or leaves sway.
It was a workflow error to submit an upscale before passing this visual gate.

The 2160p SeedVR request (`01a0c1cf-89cc-7951-ad16-822c28c95ff6`) was already
running. A cancellation request was sent; the immediately subsequent status was
still `IN_PROGRESS`. Cancellation and billing are unconfirmed. The local
collection poller was stopped; no further paid generations were submitted during
that review. Miguel subsequently authorized the separate Seedance 2 test below.
The original clip remains available as a rejected experiment, not a production
animation. No live atlas assets were replaced.

The initial proposed next experiment was a short locked-camera video demonstrating
clearly visible ripples and moving reflections, with simple positive direction
and no end-frame constraint. Matching start/end conditioning may have discouraged
motion, but this is an unverified hypothesis. Validate visible motion before
investing in a loop boundary, upscaling, or renderer integration.

## Experiment 2: Seedance 2 requested by Miguel

Miguel explicitly selected ByteDance Seedance 2 and asked to retain end-frame
conditioning. The new eight-second 1080p request uses
`bytedance/seedance-2.0/image-to-video`, with the approved map passed as both
`image_url` and `end_image_url`. It has a short motion-focused prompt, no
negative prompt and no additional upscale queued. See
[the request config](atlas-video-seedance2-v1.json) and
[the separate review page](../review/atlas-seedance2.html).
The historical restaurant experiment used an earlier Seedance version for
lighting, not proof of Seedance 2 performance on this map's water or trees.
Changing the model and prompt together makes this a practical candidate test,
not a controlled measurement of model quality alone.

This candidate replaces the rejected five-frame crossfade experiment with one
continuous fal.ai Kling 3 Pro generation, followed by video upscaling. The
generation target is eight seconds with audio disabled. The approved map is used
as both the start and end image. Matching endpoint conditioning requests a loop;
it does not guarantee a seamless transition or stable geometry.

The review page is [atlas-ai-video.html](../review/atlas-ai-video.html). This work
does not change the live atlas or select video as its production background.

## Inputs and outputs

- Generation config: [atlas-video-kling-v1.json](atlas-video-kling-v1.json).
- Generation model: `fal-ai/kling-video/v3/pro/image-to-video`.
- Approved source: `docs/storyboard/images/atlas/shire-v1.png`.
- Review poster: `docs/storyboard/images/atlas/shire-v1.webp`.
- Original generation: `docs/storyboard/videos/shire-kling-loop-v1.mp4`.
- Upscale config: [atlas-video-upscale-2160p-v1.json](atlas-video-upscale-2160p-v1.json).
- Upscale endpoint: `fal-ai/seedvr/upscale/video`.
- Upscaled candidate: `docs/storyboard/videos/shire-seedvr-loop-2160p-v1.mp4`.

The `2160p` filename identifies the intended output. It is not evidence of measured
resolution. Keep the original generation available as a direct native-resolution
video link alongside the high-resolution candidate.

## Credentials and commands

Use the existing `GauchoAI/image-generation` client and its local dotenv file
externally. `scripts/generate-atlas-video.cjs` accepts `FAL_CLIENT_ROOT` and
`FAL_ENV_FILE` to locate them. Do not copy credentials or dotenv files into this
repository, configs, metadata, reports, or command output.

Run from the repository root. Replace these example external paths with the
existing local paths:

```sh
export FAL_CLIENT_ROOT=/absolute/path/to/GauchoAI/image-generation
export FAL_ENV_FILE=/absolute/path/to/GauchoAI/image-generation/.env

node scripts/generate-atlas-video.cjs submit docs/storyboard/production/atlas-video-kling-v1.json
node scripts/generate-atlas-video.cjs collect docs/storyboard/production/atlas-video-kling-v1.json
```

Submission queues the job; collection retrieves its result using the recorded
request ID. Preserve that ID and collect the existing request instead of
submitting a duplicate. Before submission, verify that the generator supplies
the approved source as both start and end conditioning images.

Once the native generation has been collected and reviewed, use the
upscale config with the collected video as its input:

```sh
node scripts/generate-atlas-video.cjs submit docs/storyboard/production/atlas-video-upscale-2160p-v1.json
node scripts/generate-atlas-video.cjs collect docs/storyboard/production/atlas-video-upscale-2160p-v1.json
```

## Upscale settings and estimate

The restaurant's implemented image-tile zoom uses
`fal-ai/seedvr/upscale/image` at 4x per tile, in the reference checkout's
`src/server.ts:1649` (`generateSeedvrPatch`). The atlas video therefore uses
its temporal counterpart, `fal-ai/seedvr/upscale/video`:

```js
{
  video_url: generatedResult.video.url,
  upscale_mode: 'target',
  target_resolution: '2160p',
  noise_scale: 0.1,
  seed: 20260920,
  output_format: 'X264 (.mp4)',
  output_quality: 'high',
  output_write_mode: 'balanced'
}
```

Here `generatedResult` represents the result payload containing `video.url`.
The native generation measured 1764 x 1176, 24 fps, 193 frames, 8.041667 seconds,
H.264, no audio, and 30,959,986 bytes. The first upscale requested factor
2.17687074829932, targeting 3840 x 2560, but failed with HTTP 422:
"Upscale factor is too high. Please use an upscale factor of 1.9 or lower for this video."
That request (`01a0c1cc-6060-7d01-a25f-82d90759d825`) and its config
[atlas-video-upscale-v1.json](atlas-video-upscale-v1.json) are retained.
No video was produced by that failed request; its billing has not been verified.
The corrected request uses the explicit supported 2160p target. A 3:2 output
would be 3240 x 2160. No cropping, stretching, or extra interpolation is requested.

SeedVR's published rate is $0.001 per output megapixel-frame. A 3240 x 2160 raster
and 193 frames imply $1.3506912 for upscaling, plus $0.896 estimated generation:
about $2.25 combined, excluding any unknown charge for the rejected request.
These are estimates, not an invoice; delivered dimensions
and frame count determine the upscale charge. See
[pricing](https://fal.ai/models/fal-ai/seedvr/upscale/video) and
[API](https://fal.ai/models/fal-ai/seedvr/upscale/video/api).

Topaz Proteus was initially proposed but not invoked. Direct inspection of the
restaurant's implemented zoom provider, following Miguel's question, corrected
the selection to SeedVR. The older restaurant segmentation notes alone were
insufficient evidence for choosing the upscaler. Video SeedVR is a new test here,
not a claim that the restaurant used video upscaling. Check temporal shimmer and
map alignment; the shared model family does not guarantee either.

## Provenance

Keep JSON and Markdown sidecars adjacent to each MP4, using the same basename
(`shire-kling-loop-v1.json` / `.md` and `shire-seedvr-loop-2160p-v1.json` / `.md`).
Record the exact model, submitted input parameters, prompt and negative prompt,
request ID, UTC submission and collection timestamps, and source SHA-256 hashes.
For the upscale, identify the original video and its hash, generation request ID,
upscale request ID, and effective upscale settings. If the upscale has no prompt,
record that explicitly. Include measured output properties and review findings;
exclude secrets and credential-bearing URLs.

## Measurement and visual review

Probe both completed files before replacing pending labels with measured facts:

```sh
ffprobe -v error -show_entries stream=index,codec_type,codec_name,width,height,avg_frame_rate:format=duration,size -of json docs/storyboard/videos/shire-kling-loop-v1.mp4
ffprobe -v error -show_entries stream=index,codec_type,codec_name,width,height,avg_frame_rate:format=duration,size -of json docs/storyboard/videos/shire-seedvr-loop-2160p-v1.mp4
```

Record exact width, height, duration, frame rate, codec, file size, and audio
presence in the sidecars. A 3:2 map need not become a 16:9 UHD frame: retain the
approved composition and report actual dimensions. A 4K target is unverified
until `ffprobe` confirms the delivered raster; upscaling does not establish
native 4K detail.

- Watch several complete repetitions and inspect the last-to-first transition
  for a jump, pause, exposure change, or flicker. Equal start/end conditioning
  alone does not establish a seamless loop.
- Check that the camera stays locked, with no pan, zoom, drift, fog, or smoke.
  Motion should be limited to subtle water flow, reflections, and foliage.
- Compare buildings, roads, bridge, shorelines, and tree trunks against the
  approved map at the beginning, middle, and end. Check for warping, cropping,
  new objects, and changing illumination.
- Review geometric alignment with the existing depth and occlusion masks.
  Stable-looking playback does not prove those masks still align; a mismatch
  blocks using this video under the atlas's existing depth effects.
- Inspect both native video links at full size and in fullscreen. Compare the
  upscale against the original for invented texture, halos, and temporal shimmer.

The HTML uses native video controls, muted autoplay, looping, and inline mobile
playback. Autoplay remains subject to browser policy. The approved poster stays
available while media loads; the native controls allow manual playback.

## Review record

Native playback was verified in Chrome at 1764 x 1176, 24 fps, 8.041667 seconds.
The job took 315.265 seconds from submission to collection, including queue,
polling and download time; this is not isolated model inference time.
The all-frame audit is `../videos/shire-kling-loop-v1.audit.json`.
Global adjacent grayscale MAE at 192 x 128 was 0.1096/255; the loop boundary
was 1.5296/255. These measurements do not establish useful motion, and the
user's visual review rejected it. Seamlessness, upscale delivery and depth-mask
alignment are not certified.
