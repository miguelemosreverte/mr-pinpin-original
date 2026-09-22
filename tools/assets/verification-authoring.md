# Blender authoring preservation

Status: all 208 authoring objects uploaded; roundtrip verification resumed on the
mini, 2026-09-22. No success receipt yet.

- Source on mini: `/Volumes/TB4/mac-mini-storage/shared/pinpin-blender-v3`.
- Approved public bucket: `miguelemosreverte/mr-pinpin-archive`.
- Object prefix: `authoring/blender-v3/`, retaining relative source paths.
- Exclusions: `*.blend1`, `*.pyc`, and `__pycache__` directories.
- Inventory: 208 files, 799,047,393 bytes (762.03 MiB); eight `.blend1` files and
  six `__pycache__` directories excluded. Source and SSD snapshot SHA-256 match.
- Separate from the main operator's 181 manifest assets and migration receipt.
- Upload, cache, and roundtrip verification run on the mini and external SSD.
  Source files are retained. No repository manifest, catalog, index, or Git history
  changes are part of this lane.

Job state and retained snapshot/roundtrip files:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache/authoring-blender-v3-20260922/`.
The external success receipt will be `authoring-upload-receipt.json` there.
`inventory.json` records every source path and hash; `progress.json` provides
compact status, and `verified-progress.json` records completed roundtrip checks.
The separate authoring receipt is not an `assets:sync` migration receipt.

The job uses the installed HF SDK's cached authentication and
`HF_HUB_DISABLE_PROGRESS_BARS=1`. It uploads only missing objects, refuses
conflicting existing content, and downloads every object to the external SSD for
byte-count/SHA-256 verification before publishing the success receipt. Local
sources and cached copies remain in place.

The first verification attempt hit the SDK HEAD-size discrepancy also seen by
the main upload. Verification now uses authoritative bucket path-info sizes and
Xet identities, with full downloaded SHA-256 checks unchanged. Existing objects
are verified on resume; they are not overwritten.

Mission Control CLI was unavailable (connection refused per handoff); this
existing lane continues via SSH for the authorized storage job. No raw fleet
internals or peer messaging are used.
