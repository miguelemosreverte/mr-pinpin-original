# Tractor stop experiments preservation

The scoped catalog contains **122 restorable media paths, 210,073,835 logical bytes and 72 distinct SHA-256 identities**. Repeated content is retained at the paths used by the recipes:

| Media | Paths |
|---|---:|
| Exact extracted video frames | 24 |
| Per-stop source aliases of those frames | 24 |
| Completed restored stop candidates | 21 |
| Eleven stop guides, masks, roundtrips and guide aliases | 44 |
| Pilot restoration, panorama V1/V2 and their two guide sets | 9 |

Stop 04 reuses the pilot restoration bytes. Stops 14, 15 and 23 have no restoration output; no missing output is represented as complete. This count describes saved media, not the number of model calls. The restoration and panorama batches remain held; preservation does not approve their geometry, style or camera matching.

All staged files were copied into a regular-file tree on the mini SSD and checked against their source SHA-256. The existing catalog and HF adapter completed preservation in public bucket `miguelemosreverte/mr-pinpin-archive`: 107 new immutable objects were uploaded, and **all 122 manifest entries passed remote content verification**. The remaining entries reused existing objects. `assets/tractor-stops-receipt.json` has `verified: true`; an independent manifest/receipt comparison passed every path, role, byte count, SHA-256 and object key, with both verification flags true for every entry.

Only this scoped catalog assigns archive roles. In-flight FOV correction outputs, fit environments, browser screenshots and profiles are excluded. Source scripts, prompts and generation/projection records remain ordinary source files for Git; no global policy, runtime selection or previous archive was changed. No media was removed, untracked, committed or published by this operation.

Mini evidence and staging: `/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/{archive-inputs.json,archive-stage,archive-receipt.json,archive-upload.log}`. The manifest uses portable `docs/storyboard/production/tractor-stops-20260924/…` paths. Existing working symlinks should be left alone; restore into a fresh regular directory, or detach an individual link before restoring its path.

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/tractor-stops.json \
  --root /external/tractor-stops-restored \
  --cache /external/asset-cache --profile archive
```
