# Bathroom repair-transition preservation

The scoped manifest preserves **20 media files / 53,020,112 bytes** in the authorized public bucket `miguelemosreverte/mr-pinpin-archive`:

- Five deterministic diagnostic views: current stack, base alone, base plus down, stack without down, and down-alpha visualization.
- Four selected actual-browser report captures: tub before/after and floor before/after.
- Four unchanged bathroom runtime dependencies: `panorama-door-v2.png`, `front-v1.png`, `rear-v1.png`, `down-v3.png`.

These are archive-role entries in this scoped manifest only. Global catalog and production roles were not changed. No image-generation call or texture modification was needed for the initial tub-band fix; the selected code applies the bathroom-only down-weight multiplier `1 − smoothstep(0,.08,qDown.x)`.

The existing catalog and Hugging Face adapter operated against regular files on the mini SSD. Four exact prior runtime-asset proofs were resumed; the five new diagnostics and four selected screenshots were uploaded and remotely read back. Every row in `house-bath-join-receipt.json` matches its manifest path, size, SHA-256 and object key, with `verified` and `remote_verified` true. Anonymous HTTP GET/hash checks cover all 20, reusing unchanged prior proofs and freshly checking new objects.

External evidence directory:

`/Volumes/TB4/mac-mini-storage/shared/pinpin-house-bath-join-20260924/`

`archive-stage/` contains the regular-file catalog/upload stage. `archive-inputs.json` records source paths and hashes. `archive-initial-receipt.json` preserves the first nine proofs. Final evidence is `archive-final-receipt.json`, `archive-final-upload.log` and `anonymous-final-verification.json`. The corresponding anonymous verification scripts remain beside those records. No credentials were included in output.

Restore:

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/house-bath-join.json \
  --root /Volumes/TB4/mac-mini-storage/shared/pinpin-house-bath-join-restored \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache \
  --profile archive
```

Source report images may be specific links to retained TB4 files; upload used regular files on the mini. No original media was removed, and no broad output was written to the Air. Projection recipes/config snapshots and UI verification are retained separately as text. The alpha image is a diagnostic, not artwork. Preservation verifies recoverability and identity; the report's live-renderer checks establish the local visual improvement. No Git operation or public release was performed in this lane.

## Lower-angle rug repair extension

All original 13 manifest rows and exact proofs remain preserved. Seven additions record the follow-up: `rug-repair-before.png` (initial diagnostic), `rug-join-target.png` (recentered actual model input), `rug-join-v1.png` (untouched generated repair), and the four frozen browser screenshots `rug-{user,target}-{before,after}.png`. The final count is 20. Unlike the initial tub mask, this follow-up includes one genuine image-generation edit; it is not described as projection-only. Exact prompt/generation and registered-overlay settings are recorded in the production pack.

The first three additions were preserved in `archive-rug-input-receipt.json`; all 20 are covered by `archive-rug-final-receipt.json` and `archive-rug-final-upload.log`. Combined anonymous evidence is `anonymous-rug-verification.json`, created by `verify-rug-anonymous.py`, preserving the original 13 exact anonymous proofs and checking the seven new identities freshly. The source manifest/receipt match this final set; the earlier reports and source artwork remain unchanged.
