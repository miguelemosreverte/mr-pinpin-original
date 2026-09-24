# Tractor projection evidence increment

This separate archive increment preserves **13 PNG/JPG files, 40,852,677 bytes** from `docs/storyboard/production/tractor-stops-20260924/pilot/fov-correction/`: front alignment diagnostics, projection candidates V1–V3 and the generated scenery repair `panorama-repaired-v4.png`.

V1–V3 remain failed or diagnostic experiments, with better central tractor proportions but stretched surrounding scenery. The parent selected V4 for preview after front/side browser review. Its final registered rear repair is preserved separately in `assets/tractor-stops-rear.json` and passed the UI lane's rear/overlap review. Preservation itself does not certify camera correspondence or source geometry. Review and generation records remain in the production pack.

The mini staged every file as a regular file and checked its SHA-256 against the original. The existing catalog and HF adapter uploaded all 13 objects and completed remote content verification for **13/13 entries** in public bucket `miguelemosreverte/mr-pinpin-archive`. `assets/tractor-stops-fov-receipt.json`, paired with `assets/tractor-stops-fov.json`, has `verified: true`. Independent comparison passed every path, role, byte count, SHA-256 and object key, and both verification flags are true for every entry.

Browser screenshots, coordinate-map caches, environments and unrelated files are excluded. No source media or previous manifest was replaced. Source prompts, scripts and JSON provenance remain regular text for Git; no commit or publication was performed.

Mini evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/{archive-fov-inputs.json,archive-fov-stage,archive-fov-receipt.json,archive-fov-upload.log}`.

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/tractor-stops-fov.json \
  --root /external/tractor-stops-fov-restored \
  --cache /external/asset-cache --profile archive
```

Restore into a regular directory; the active review workspace may contain individual media symlinks, which restore deliberately refuses to overwrite.
