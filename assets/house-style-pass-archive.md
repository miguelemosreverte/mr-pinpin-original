# One-shot common-room style comparison preservation

All six assets (11,851,008 bytes) passed remote download and SHA-256 verification in the existing public `miguelemosreverte/mr-pinpin-archive` bucket. `house-style-pass-receipt.json` is the actual successful, non-dry-run push receipt; each entry matches `house-style-pass.json` and has both verification flags. The scoped catalog was generated with the existing catalog tool; global policy and manifests were not modified.

Preserved media: the previous common panorama and runtime cube, the exact approved-book reference, the new1774×887 generated panorama original, its deterministic512px-face cube PNG, and its1536×1024 lossless runtime WebP. The new candidate is separate from the tour; its original runtime remains byte-identical. The generated candidate changes timber framing/trim volumes, so this is an appearance proposal, not proof of unchanged architecture.

The raw derived PNG lives externally at `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-style-pass-20260923/cube-atlas-v1.png`. Its portable restore path is `docs/storyboard/production/house-style-pass-20260923/cube-atlas-v1.png`. All other files preserve their current repository-relative paths. The generated original and review WebP are already available from the static source server; both HTTP responses were checked against their local hashes.

Restore to an external regular directory:

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/house-style-pass.json \
  --root /Volumes/TB4/mac-mini-storage/shared/pinpin-house-style-pass-restored \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache \
  --profile archive
```

The mini performed conversion and upload. `projection-v1.json` in the new production pack records exact image hashes, projection convention and12shared-boundary checks. The existing frozen converter was used without changes or image retouching. Staging and full adapter output remain under external `pinpin-house-style-pass-20260923/`. No Git operation, source cleanup, or publication occurred.
