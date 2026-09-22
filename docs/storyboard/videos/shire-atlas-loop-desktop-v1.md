# Registered atlas loop: desktop

1536 x 1024; 240 frames / 24 fps / 10 seconds; silent H.264, yuv420p, square pixels, faststart, CRF 26. 7,263,569 bytes.

Fixed measured affine registration with original-map fill outside source coverage. No temporal blend, per-frame stabilization, paid generation, or AI upscale. The approved forward/reverse frame order and full motion are retained.

Decoded landmark errors (world pixels): {"median": 1.0, "p95": 5.0, "max": 5.6569}. [Full audit](shire-atlas-loop-desktop-v1.json); [production notes](../production/atlas-video-assets-notes.md).

Rebuild: `python3 scripts/build-atlas-video-assets.py` from repository root.
