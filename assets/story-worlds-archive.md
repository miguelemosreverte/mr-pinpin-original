# Story-worlds preservation

All **58 media / 290,320,329 bytes** are preserved in public bucket `miguelemosreverte/mr-pinpin-archive`. The scoped manifest and receipt match on path, SHA-256, byte count, role and immutable object key. Every receipt entry is remotely verified; a separate anonymous GET/hash pass verified all 58 identities.

This includes 17 untouched generated masters (selected artwork and retained trials), 12 repair inputs, two kitchen references, and 27 final download derivatives: one assembled panorama, six face PNGs, one PNG atlas and one lossless WebP atlas per scene. All source-pack image paths and symlinks are covered. All 17 retained master hashes match generation records. The final check does not newly dereference original tool paths through the stalled Air mount; generation authors recorded and preserved those originals.

Heavy work and regular-file staging used the mini SSD. Archive uploads were incremental and reused exact prior proofs. No global policy/catalog or existing-tour selection changed. No Git commit, push or publication was performed by this lane.

Evidence is in `/Volumes/TB4/mac-mini-storage/shared/pinpin-story-worlds-20260924/`: `archive-inputs.json`, `archive-stage/assets/manifest.json`, `archive-receipt.json`, `anonymous-verification.json`, `generation-identity.json`, and `final-check.json`. A compact final check is also retained in the source pack’s `projection/final-check.json`.

```sh
python3 tools/assets/hf_store.py pull --manifest assets/story-worlds.json --root /external/restored --cache /external/asset-cache --profile archive
```

Restoration verifies identities; it does not establish new licensing rights or visual perfection. Original artwork remains unchanged on TB4. Source files use individual media links; only text recipes, metadata and these scoped preservation records belong in the source commit.
