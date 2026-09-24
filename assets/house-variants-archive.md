# Separate house variants preservation

The scoped manifest preserves **27 media files / 88,428,696 bytes** in the authorized public bucket `miguelemosreverte/mr-pinpin-archive`. All manifest rows match successful remote SHA-256/size proofs and anonymous-download checks.

The set contains three assembled current-room panorama inputs, three matching level reference views, six deterministic repair inputs, nine untouched generated masters, and six final paired browser screenshots. All source-pack image files and image symlinks are covered. Each generated master matches its generation record; the available original image-tool files were also checked. The kitchen table/stool book reference remains in its existing preservation scope, with its exact path/hash recorded in the generation metadata rather than an unnecessary duplicate asset entry.

The existing catalog and Hugging Face adapter ran against regular files on the mini SSD. Uploads were incremental, retaining exact prior proofs. The final `house-variants-receipt.json` has `verified` and `remote_verified` true for every row, with matching path, size, SHA-256 and object key. A separate anonymous HTTP GET/hash pass verified each new object; prior exact anonymous proofs were reused on later extensions.

External evidence directory:

`/Volumes/TB4/mac-mini-storage/shared/pinpin-house-variants-20260924/`

- `archive-stage/`: regular-file catalog and upload stage.
- `archive-inputs.json`: final source-path and identity inventory.
- `archive-initial-receipt.json`, `archive-repairs-receipt.json`, `archive-review-receipt.json`: incremental proofs.
- `archive-final-receipt.json`, `archive-final-upload.log`: final 27-file proof.
- `anonymous-verification.json`: all 27 anonymous identities.
- `final-inventory-check.json`: source-media coverage and all nine master checks.

Restore:

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/house-variants.json \
  --root /Volumes/TB4/mac-mini-storage/shared/pinpin-house-variants-restored \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache \
  --profile archive
```

Every row is archive-role in this scoped manifest only. No global asset policy/catalog, current tour selection or published chapter was changed by this preservation lane. Original media remain intact; source links point to retained TB4 files. Heavy processing and transfers ran on the mini. Text recipes, frozen runtime/config snapshots, prompts, generation records, export report and browser review are retained separately in source.

The variants remain image-led proposals. Preservation verifies exact recoverability, not metric camera translation, measured furnishing geometry or universal seam perfection. The export report separates deterministic assembled inputs from later model edits, and the browser/child-view reports record their actual visual status. No Git commit, push or public release was performed in this lane.
