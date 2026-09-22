# Atlas video asset alignment and encoding

Approved source: `videos/shire-seedance1-pingpong-v1.mp4`. Originals preserved; SHA-256 checked before and after build. No paid tools or generation.

## Alignment

SIFT feature matching (0.7 ratio test) and affine RANSAC on frame 0 establish a predominantly horizontal crop, with a small anisotropic resampling component. The source covers approximately x=75..1460 of the 1536-pixel world. Filling the entire world by stretching the 4:3 video would be incorrect.

Frame-zero fit: 1857 inliers / 1859 matches. Error summaries in world pixels: `{"fittedAffine": {"median": 0.2189, "p95": 0.601, "max": 1.575}, "blindFullWorldStretch": {"median": 40.2717, "p95": 72.1458, "max": 75.4931}, "idealCenteredFourByThreeCrop": {"median": 5.4671, "p95": 9.6079, "max": 10.8307}}`.

Source-to-world affine: `[[0.8323165929321774, 3.3577231617792132e-06, 74.95523279761129], [-3.958572945435865e-06, 0.8205001291134525, -0.043513335422074584]]`. Fixed transform for all frames; 9.8307% of pixels use the original map as static border fill. No temporal crossfade or dynamic stabilization. Motion gain stays 1.

Measured frames: [0, 12, 24, 48, 72, 96, 120, 144, 168, 192, 216, 239]. Eleven 41x41 grayscale landmark templates searched +/-18 world pixels, independently of the SIFT fit. Integer-pixel displacement precision. All template correlations must exceed 0.65 and all offsets must stay within 10 world pixels or the builder fails. Mobile measurements decode the actual asset then resize to world coordinates. This is a sampled landmark audit, not proof of exact registration of every animated leaf or water pixel.

Maximum displacement over sampled frames (world pixels):

| Landmark | Registered source | Mobile decoded | Desktop decoded |
| --- | ---: | ---: | ---: |
| cottage-door | 2.00 | 1.00 | 2.00 |
| chimney | 2.00 | 2.00 | 2.00 |
| dock | 1.00 | 1.00 | 1.00 |
| bridge | 1.00 | 1.00 | 1.00 |
| tree-door | 3.00 | 3.00 | 3.00 |
| left-shore-rock | 0.00 | 0.00 | 0.00 |
| right-shore-rock | 0.00 | 0.00 | 0.00 |
| picnic | 2.00 | 2.00 | 2.00 |
| tractor | 3.00 | 3.00 | 3.00 |
| bottom-rock | 5.66 | 6.40 | 5.66 |
| top-rock | 5.00 | 5.00 | 5.00 |

## Delivery

- `videos/shire-atlas-loop-mobile-v1.mp4`: 1152x768, 3,630,525 bytes (3.63 MB).
- `videos/shire-atlas-loop-desktop-v1.mp4`: 1536x1024, 7,263,569 bytes (7.26 MB).

Both: silent H.264 / yuv420p / square pixels / 24 fps / exactly 240 decoded frames / 10 seconds; libx264 medium CRF 26, two encoding threads. MP4 moov box verified before mdat for faststart. Original frame order preserved; no interpolation or change to ping-pong reversal.

Per-variant JSON sidecars contain source/output hashes, actual landmark offsets and correlations for each sampled frame, PSNR against the registered uncompressed target, encoding settings and metadata. Corresponding JPEGs show the decoded turnaround frame (120) for visual inspection.

## Visual inspection

Inspected the actual decoded desktop and mobile turnaround frames, plus native-resolution registered-source versus desktop-encode crops of the cottage door, dock, bridge and tractor. CRF 26 retains the major edges and small object details; fine foliage is softer. Kept CRF 26 to retain detail at the requested resolutions. Static side strips can be distinguished from moving foliage at their boundaries; no blending was added to hide that transition.

Sampled BGR PSNR against the registered, uncompressed target: mobile minimum 28.47 dB / mean 30.74 dB; desktop minimum 28.62 dB / mean 30.95 dB. Minimum decoded landmark template correlation was 0.7909 mobile / 0.7778 desktop. These compression metrics support the visual inspection, not a claim of pixel-perfect fidelity. Browser/GPU/phone integration remains the parent lane's verification responsibility.

## Reproduction and limits

Run `python3 scripts/build-atlas-video-assets.py` (Python, numpy, OpenCV, FFmpeg and ffprobe). `--analyze-only` performs registration and source-landmark audit without encoding. Frames pipe directly into FFmpeg. The mini hostname was unavailable, so this bounded job ran locally with two OpenCV/encoding threads and no intermediate videos.

Residual generated geometry changes remain visible: the fixed transform intentionally preserves source motion. The original map supplies about 75 world pixels at each side; motion ends at those static boundaries. The approved loop still reverses water flow at the turnaround. No renderer, scenery, depth, region or unrelated test files changed by this lane.
