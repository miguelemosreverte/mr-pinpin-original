# Atlas ping-pong loop

Created September 21, 2026 using local FFmpeg. No new AI generation or provider
charge. This is a review derivative; the original and production atlas remain
unchanged.

## Source

- Video: `shire-seedance1-steady-light-v1.mp4`.
- SHA-256: `580179b34287ffd8ecf87d983795e741b4f8b67ce011fa93f5e571468ceb00db`.
- Source request: `01a0c219-1bda-7562-b88f-afef067706ea`.
- Source model: `fal-ai/bytedance/seedance/v1/pro/fast/image-to-video`.
- Exact generation prompt and settings: [source provenance](shire-seedance1-steady-light-v1.json).
- Native source: 1664 x 1248, 24 fps, 121 frames, silent.

## Transformation

Frame order (zero-based): `0, 1, ... 119, 120, 119, ... 2, 1`, then loop to `0`.
The reverse leg omits both endpoints, avoiding a repeated endpoint frame at
either turn. Output is 240 frames at 24 fps, or 10 seconds. Velocity still
reverses, including the stream's flow; this is not a physically continuous loop.
No interpolation, crossfade, stabilization, color adjustment or speed ramp.

Command, run from repository root:

```sh
ffmpeg -hide_banner -loglevel warning -n \
  -i docs/storyboard/videos/shire-seedance1-steady-light-v1.mp4 \
  -filter_complex_threads 1 \
  -filter_complex '[0:v]split=2[f][r];[f]setpts=N/(24*TB)[forward];[r]reverse,trim=start_frame=1:end_frame=120,setpts=N/(24*TB)[backward];[forward][backward]concat=n=2:v=1:a=0[out]' \
  -map '[out]' -an -c:v libx264 -preset veryfast -crf 18 -threads 2 \
  -pix_fmt yuv420p -r 24 -movflags +faststart \
  docs/storyboard/videos/shire-seedance1-pingpong-v1.mp4
```

This frame-count-specific command applies to this 121-frame source. It is not a
generic recipe for sources of arbitrary length. Video is re-encoded at native
dimensions, so compression can slightly change pixels. Faststart prepares the
MP4 for progressive browser playback.

[Browser review](../review/atlas-pingpong.html). Inspect both turnarounds and the
backward-flowing stream before deciding whether to use it in the atlas.

## Verification

Measured output: 1664 x 1248, 240 frames at 24 fps, exactly 10 seconds, H.264,
silent, 33,910,054 bytes. SHA-256:
`9356345b426d8f033ee059e4db88d4c0e7d94414ccf79f082c2f5954703a1657`.

Decoded all frames at 96 x 72 grayscale and compared each output frame against
the expected source index. Mean absolute mapping error was 0.1731/255, maximum
per-frame error 0.5832/255, consistent with re-encoding differences. Frame counts
and the intended forward/reverse order passed. This check does not judge whether
backward water flow looks natural.

Desktop and mobile-size Chrome played the clip without media errors or page
overflow. A desktop playback check crossed the end back to the beginning.
The browser preview was opened with the operating-system `open` command.
