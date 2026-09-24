# Final tractor rear repair preservation

This scoped increment preserves **6 images, 14,071,106 bytes**: the exact V4 rear-view input and generated repair, plus four frozen V4-to-video fitting diagnostics under `pilot/fov-correction/v4-fit-raw/`.

The rear repair master is 1254×1254, 3,126,385 bytes, SHA-256 `3d62e73591146277fb40e20f3fcf81baf460dd08108253e716548e1c94dc17f2`. Its unchanged 1400×1400 input is 5,397,616 bytes, SHA-256 `bb4e1e902baf53a27d4ba455f846cad06591e2a203b7e96c9fd019c6f000b5c6`. Exact prompt and generation records remain regular source text in the production pack.

All files were staged as regular files on the mini and matched to their original SHA-256. The existing HF adapter uploaded and remotely verified **6/6 entries** in public bucket `miguelemosreverte/mr-pinpin-archive`. `assets/tractor-stops-rear-receipt.json`, paired with `assets/tractor-stops-rear.json`, has `verified: true`. Independent comparison passed each path, role, byte count, SHA-256 and object key, with both verification flags true for every entry.

The fitting images are diagnostics, not additional scene variants or geometry proof. No browser screenshots, coordinate caches or unrelated media are included. Earlier verified manifests remain unchanged. No source media was removed or modified.

Mini evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/{archive-rear-inputs.json,archive-rear-stage,archive-rear-receipt.json,archive-rear-upload.log}`.

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/tractor-stops-rear.json \
  --root /external/tractor-stops-rear-restored \
  --cache /external/asset-cache --profile archive
```

Restore into a regular directory; do not restore through the active workspace's media symlinks.
