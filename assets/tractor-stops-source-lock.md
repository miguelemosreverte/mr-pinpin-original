# Source-frame trial preservation

`tractor-stops-source-lock.json` and its matching receipt preserve **138 media paths, 228,808,019 bytes**. The existing HF adapter uploaded 137 new objects and verified all 138 entries against remote content. Independent receipt comparison passed every path, role, size, SHA-256 and object key, with both verification flags true.

Included: all 24 browser-decoded source-display frames, stop-04's strict outpaint and perimeter-repair trials, the rejected locked-camera V2 bridge, and completed static source-projection browser evidence. Individual reproducible bridge frame dumps, credentials, signed URLs and private operations are excluded. Source records and code stay in Git.

This is preservation, not approval. Both generated stop-04 bridges are rejected for vehicle deformation. The sourceLock v3/v4 trial proves unchanged source geometry and matching protected-center color, but the legacy stop-04 scenery boundary remains visible. The perimeter edit did not resolve that boundary after the original frame was reapplied.

The source checkpoint script is `docs/storyboard/production/tractor-stops-20260924/archive_source_lock.py`. Heavy staging, cache, upload and remote verification ran on the mini's TB4 disk. No original media were deleted, no global catalog or asset policy was changed, and no official site was published.

Restore into a fresh external regular directory:

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/tractor-stops-source-lock.json \
  --root /external/tractor-source-lock-restored \
  --cache /external/asset-cache --profile archive
```
