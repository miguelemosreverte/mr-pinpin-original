# Registered atlas loop: mobile

1152 x 768; 240 frames / 24 fps / 10 seconds; silent H.264, yuv420p, square pixels, faststart, CRF 26. 3,630,525 bytes.

Fixed measured affine registration with original-map fill outside source coverage. No temporal blend, per-frame stabilization, paid generation, or AI upscale. The approved forward/reverse frame order and full motion are retained.

Decoded landmark errors (world pixels): {"median": 1.0, "p95": 5.0, "max": 6.4031}. [Full audit](shire-atlas-loop-mobile-v1.json); [production notes](../production/atlas-video-assets-notes.md).

Rebuild: `python3 scripts/build-atlas-video-assets.py` from repository root.
