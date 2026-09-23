# Reusable location media preservation

`locations.json` is a scoped restoration manifest generated from the existing asset catalog. Its archive roles describe preservation/restoration, as in `tools/assets/production-preservation.json`; they do not change the global catalog's production selections.

All 16 referenced/generated media files (27,214,030 bytes) have SHA-256-verified remote copies in the existing `miguelemosreverte/mr-pinpin-archive` bucket. `locations-receipt.json` records the actual verification. No working media were deleted or untracked, and no official Pages release was selected.

Restore from the repository root:

```sh
python3 tools/assets/hf_store.py pull --manifest assets/locations.json --root . --profile archive --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache
```

Use an appropriate external cache path on another machine. See `assets/README.md` for the storage adapter dependency and conflict handling. Existing different local files are not overwritten.

The editable Blender base and all raw six-face outputs remain on TB4 under `pinpin-location-workflow-20260923/`; the committed plan and builder reconstruct them. Published-chapter references, the selected local-review WebPs, semantic underlay and both illustration iterations are covered by this scoped manifest. Runtime source manifests retained in the examples describe raw external PNGs; the adjacent review manifests describe the actual restored WebPs.
