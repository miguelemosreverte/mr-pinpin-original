# Process-report media availability

All **35 report media files** are available at their portable `docs/` paths. The source files and their HTTP responses from `http://127.0.0.1:8789/` match the exact sizes and SHA-256 identities in `assets/house-tour.json`: **35/35 HTTP 200 and hash checks pass**.

Twenty-one missing originals (69,763,775 bytes) were restored by exact copy from the already remotely verified TB4 archive stage. Fourteen matching files were already present. No image was resized, re-encoded, edited, or replaced with a different version. No network re-download was needed.

The unused `projection/common-gray-roundtrip.png` diagnostic remains archived/external, as directed; it is the sole omitted entry of the 36-file preservation manifest. Its provenance and measurements remain available in the projection JSON. The report does not need to load that diagnostic image.

## Portable paths

All paths below are relative to this production pack. Browser URLs are `http://127.0.0.1:8789/storyboard/production/house-tour-20260923/` followed by the relative path:

- `geometry/rooms/{common,bath,bedroom}/cube-atlas.png` — three original gray guides.
- `geometry/rooms/{common,bath,bedroom}/cube-atlas.webp` — three lossless gray review derivatives.
- `illustrated/common/cube-atlas-v{1,2,3}.png`, `illustrated/bath/cube-atlas-v{1,2}.png`, `illustrated/bedroom/cube-atlas-v1.png` — six retained cube illustration attempts.
- `projection/{common-gray,common-v3,bath-gray,bath-v2,bedroom-gray,bedroom-v1}-equirect.png` — six reprojected geometry/art inputs.
- `illustrated/{common,bath,bedroom}/panorama-v1.png` — three generated continuous panorama originals.
- `illustrated/{common,bath,bedroom}/cube-from-panorama-v1.png` — three deterministic reverse projections.
- `illustrated/{common,bath,bedroom}/cube-atlas.webp` — three current lossless runtime derivatives.

The eight book and prior-panorama references remain at their original source paths listed in `references.json`; their HTTP responses were included in the same verification. No browser URL needs a `file://` or `/Volumes/TB4` location.

Disk headroom after restoration: **273,293,312 bytes (about 261 MiB)** free on the Air, above the requested 150 MiB stopping threshold. Detailed per-file HTTP/hash evidence is external at `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/process-media-restore.json`.

Only media availability and this report were changed. UI, art selection, source provenance, archive manifest/receipt and Git state were not edited by this restoration lane.
