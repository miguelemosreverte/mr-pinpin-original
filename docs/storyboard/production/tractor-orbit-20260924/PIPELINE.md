# Orbit generation and local replay

One authorized `fal-ai/pixverse/v6/transition` request was submitted through the existing `scripts/generate-atlas-video.cjs` runner. Request ID: `01a0d363-d5a8-70d1-8ffc-9ab2d859bbc8`. It used the reviewed `start-v1.png` at both endpoints, requested 12 seconds, 720p, 16:9, silent, single clip, thinking disabled. The exact prompt, negative prompt, config and runner sidecar are preserved alongside this report. No paid retry or upscale occurred. The recorded estimate was $0.54 at $0.045/second; this is not an invoice.

The starting still was an image-model reframing from the book references, not a measured geometric camera translation. Matching endpoint conditioning does not by itself establish a full orbit or rigid machinery.

The untouched provider result `orbit-v1.mp4` is 1280×720 H.264, 24 fps, 289 frames, 12.041667 seconds, no audio. SHA-256: `172af688f536364ca766a517d94fd9b849585a128bbc192e2713b67ce6e4a83d`.

`orbit-scrub-v1.mp4` is a separate all-intra derivative for frequent browser seeks. It retains resolution, frame rate, duration and frame count; all 289 frames were verified as keyframes. It uses x264 CRF 18, GOP 1, yuv420p, fast-start MP4, no interpolation or audio. This is an additional lossy encoding; the provider original remains unchanged. `orbit-scrub-v1.json` records the exact command, hashes and measured output.

Seven unaltered decoded frames at requested times 0, 2, 4, 6, 8, 10 and 11.9 seconds and their labelled thumbnail sheet are recorded in `keyframes-v1.json`. The additional half-second contact sheet and exact endpoint indices 0, 1, 287, 288 support the bounded visual review. `endpoint-check.json` records differences; endpoints are not pixel-identical. See `VISUAL-REVIEW.md` for what actually moves and remaining limitations. No measured 3D model or perfect loop is claimed.

## SSD preview, independent of the Air SMB mount

The isolated mini mirror is `/Volumes/TB4/mac-mini-storage/shared/pinpin-review-mirror-20260924/docs`. It contains only the current study UI, its imported renderer/control modules, seven targeted book-reference files and links to the two external production packs. Other repository pages are outside this small mirror. Completed media are read directly from the mini SSD.

The read-only `preview-server.cjs` binds to mini localhost and serves GET/HEAD requests with byte ranges. Its range parser derives from the existing tested atlas-traversal server; it does not modify official serving code. Approved production-directory symlinks in the isolated mirror are intentional. No credentials or dotenv file are present in the mirror.

Restart only when these ports are free; do not replace unrelated services:

```sh
ssh mini 'nohup /opt/homebrew/bin/node /Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-orbit-20260924/preview-server.cjs /Volumes/TB4/mac-mini-storage/shared/pinpin-review-mirror-20260924/docs 18792 > /Volumes/TB4/mac-mini-storage/shared/pinpin-review-mirror-20260924/server-18792.log 2>&1 < /dev/null &'
ssh -f -N -o ExitOnForwardFailure=yes -L 127.0.0.1:18791:127.0.0.1:18792 mini
```

Open `http://127.0.0.1:18791/tractor-orbit.html` or `http://127.0.0.1:18791/story-worlds.html` on the Air. Mini browser tests use `http://127.0.0.1:18792/` directly. Ports 8791/8792 were already occupied and were left untouched. A byte-range probe returned 206 with a 1024-byte range; final player interaction is recorded by the UI review lane.

Heavy generation collection, transcoding, frame extraction and archive transfers ran on the mini. Tiny source metadata and UI files crossed SSH during the Air mount outage. The scoped archive is `assets/tractor-orbit.json`; original and derivative video files stay outside Git. No source commit or official publication was performed by this lane.
