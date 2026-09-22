# Blender authoring preservation

Status: COMPLETE, 2026-09-22. All 208 authoring objects were uploaded and freshly
downloaded on the mini; all 799,047,393 bytes passed SHA-256 verification.

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
The published external success receipt is `authoring-upload-receipt.json` there:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache/authoring-blender-v3-20260922/authoring-upload-receipt.json`.
Receipt SHA-256:
`5efecba2686f1fe2896161a5b4a02bcbd352802f36386af031758fa6ed3fe511`.
`inventory.json` records every source path and hash; `progress.json` provides
compact status, and `verified-progress.json` records completed roundtrip checks.
The separate authoring receipt is not an `assets:sync` migration receipt.

Final receipt validation confirmed all 208 path/object/byte-count/SHA-256 records
match the inventory, every entry has successful remote proof and a Xet identity,
no excluded paths were uploaded, and every source file remains present. Remote
Xet identities matched before and after each downloaded checksum verification.

The job used the installed HF SDK's cached authentication and
`HF_HUB_DISABLE_PROGRESS_BARS=1`, uploaded only missing objects, refused
conflicting existing content, and downloaded every object to the external SSD for
byte-count/SHA-256 verification before publishing the success receipt. Local
sources and cached copies remain in place.

The first verification attempt hit the SDK HEAD-size discrepancy also seen by
the main upload. Verification now uses authoritative bucket path-info sizes and
Xet identities, with full downloaded SHA-256 checks unchanged. Existing objects
are verified on resume; they are not overwritten.

Mission Control CLI was unavailable (connection refused per handoff); this
existing lane continues via SSH for the authorized storage job. No raw fleet
internals or peer messaging are used.
