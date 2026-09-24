# Held expansion media checkpoint

This scoped increment preserves **108 new media paths, 308,499,515 bytes** from the completed expansion work. Thirteen already-preserved path/hash identities were omitted rather than duplicated.

Included scope: stop 00's completed panorama attempts, registered repairs, guides, fitting evidence, deterministic exports and review views; stop 04's canonical assembled sphere, cube faces/atlas, forward endpoint and existing V1 bridge videos/contact sheet; stop 13's completed art, exports, reviews and raw bridge; stop 14's existing base, fit, guide and restoration; and the completed restorations for stops 15 and 23.

This is a preservation checkpoint while new generation is held. It does not approve the bridge's vehicle motion, establish exact source-frame geometry or make every panorama selectable. The original stop-04 bridge's intermediate drift and the endpoint limitations are documented in `STATIC-TRACTOR-REVIEW.md`.

The in-flight `stop-04/pilot-static-v1` trial, private video-operation JSON/Markdown, signed URLs, locks, environments and unrelated assets are excluded. Every staged entry is an image or MP4; prompts, sanitized provenance and code remain source text. Stop-04 bridge per-frame extraction bulk is omitted because it is reproducible from the preserved clip; the contact sheet is retained.

All copied bytes matched both the original source and regular-file staging SHA-256. The existing catalog/HF adapter uploaded 107 new objects and completed remote content verification for **108/108 entries** in public bucket `miguelemosreverte/mr-pinpin-archive`. `assets/tractor-stops-expansion-checkpoint-receipt.json`, paired with `assets/tractor-stops-expansion-checkpoint.json`, has `verified: true`. An independent comparison passed every path, role, byte count, SHA-256 and object key, with both verification flags true. Older receipts and global asset policy remain unchanged.

Mini evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/{archive-expansion-inputs.json,archive-expansion-stage,archive-expansion-receipt.json,archive-expansion-upload.log}`.

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/tractor-stops-expansion-checkpoint.json \
  --root /external/tractor-stops-expansion-restored \
  --cache /external/asset-cache --profile archive
```

Use a fresh regular restore directory; do not overwrite active media symlinks. No media deletion, source untracking, commit or publication is part of this checkpoint.
