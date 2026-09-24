# Native Blender panorama experiment preservation

All six assets (13,472,774 bytes) passed remote download and SHA-256 verification in the existing public `miguelemosreverte/mr-pinpin-archive` bucket. `house-native-panorama-receipt.json` is the successful non-dry-run push receipt; every identity matches `house-native-panorama.json` and includes both verification flags.

Preserved: the direct native2048×1024 Cycles guide, separate editable Blender camera scene, exact actual-book reference, one generated1774×887 panorama original, its deterministic512px-face cube PNG, and the1536×1024 lossless review WebP. The generated image’s semantic drift is retained without repair. Neither successful projection nor archive verification approves the illustrated architecture.

The native scene and raw converted cube PNG remain externally under `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-20260923/`. Their portable restore paths are the same filenames under `docs/storyboard/production/house-native-panorama-20260923/`. The guide, generated panorama and review WebP are present in source for the separate experiment page. Source recipe scripts and provenance remain text files in the production pack.

Restore to an external regular directory:

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/house-native-panorama.json \
  --root /Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-restored \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache \
  --profile archive
```

The scoped catalog used the existing asset tools on a regular-file TB4 stage. No global catalog/policy, previous scene, tour runtime, Git index, or public release was changed. Blender rendering, spherical conversion and upload ran on the mini. See the experiment’s `GEOMETRY.md`, `native-guide.json`, `orientation-check.json` and `projection-v1.json` for the exact camera and projection evidence.
