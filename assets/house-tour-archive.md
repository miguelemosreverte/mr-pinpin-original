# Connected house tour preservation

Status: all 36 assets passed remote download and SHA-256 verification in the existing public bucket. `house-tour-receipt.json` is the successful non-dry-run push receipt; every entry matches the scoped catalog and has both `verified:true` and `remote_verified:true`. No source media were deleted or untracked.

`house-tour.json` was generated with the existing `tools/assets/catalog.cjs` against a deliberately scoped external stage. Every entry is `archive`, solely for preservation/restoration. This does not modify the global asset catalog, serving policy, or production selection. The 36 entries total 98,407,691 bytes: three gray atlas WebPs and three original PNG atlases; five prior panorama/repair references and three book references; six retained illustrated cube candidates; three generated continuous panorama originals; three deterministic panorama-to-cube PNGs and three final runtime WebPs; six projected gray/art input panoramas; and the gray roundtrip diagnostic.

The source WebPs and reference images retain their existing repository-relative paths. Raw gray atlas originals currently live only at `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/rooms/{common,bath,bedroom}/cube-atlas.png`. Their portable restore paths are `docs/storyboard/production/house-tour-20260923/geometry/rooms/{common,bath,bedroom}/cube-atlas.png`. This mapping preserves the originals without forcing them onto the space-constrained Air. `geometry/rooms/<room>/provenance.json` contains the same original hashes and external working paths.

External staging: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/archive-stage/`. Its `archive-staging-map.json` sibling records original paths, restore paths, hashes and sizes. Every staged file is regular and hash-verified; the adapter never needs a source-symlink exception.

Restore the preserved bundle into an external directory:

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/house-tour.json \
  --root /Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-restored \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache \
  --profile archive
```

Use `--root .` only when restoring media into a source checkout with sufficient space. Existing differing files are never overwritten. Python adapter dependencies and public bucket authorization follow `assets/README.md`. No working files are deleted/untracked, no global ignore block is changed, and no Git operation is part of this scoped archive lane.

Illustration originals restore under `docs/storyboard/production/house-tour-20260923/illustrated/<room>/` with their versioned external filenames. Projected inputs restore under the same pack’s `projection/` directory. Runtime WebPs retain their actual source paths. Failed cube candidates remain explicitly preserved rather than overwritten by the panorama-derived versions. The redundant external `projection/common-v3-original.png` copy is not duplicated in the manifest: its exact bytes are preserved as `illustrated/common/cube-atlas-v3.png`.
