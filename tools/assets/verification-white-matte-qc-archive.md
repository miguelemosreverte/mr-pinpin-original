# White Matte QC Delta Archive

Complete, 2026-09-23. Main relayed Pauli's final freeze before packaging.

[Manifest](white-matte-qc-preservation.json): **15 files, 3,633,226 bytes** in public bucket `miguelemosreverte/mr-pinpin-archive`. Existing `hf_store.py` on mini uploaded and freshly downloaded/hash-verified every object; a second fresh verification with `HfApi(token=False)` passed for all 15. [Anonymous verification receipt](white-matte-qc-receipt.json) is the exact generated receipt, not a summary. No commits, asset regeneration, original modifications, or further matte iteration.

Included: corrected frame 014 only, its exact change mask, corrected dark/green MP4s, marked before/after PNG, final `qc.json`, reviewed-selection record copied byte-for-byte from source, seven temporal-audit evidence files, and the independent validation report. No other 24 RGBA frames, source glob, credentials, dependencies, or HTML review duplicates were uploaded.

## Integrity And Provenance

- Manifest SHA256: `e07f84e5164646ee60ec632caa78e07df4dbcf0dea719f459270916d08560aba`.
- Upload receipt SHA256: `80b70e30ad84848513b91ac6ecb3c3819a62a198aaab69b23c9a2e49a9cf9acf`.
- Anonymous receipt SHA256: `70c3c15432d77aad966cb8382ce1d203f4f5d4a728c70cd15c7d0d391c8c8be3`.
- Final QC SHA256: `0232f0bddb5bd3518b7788f697c810f11c831942af932f781a3fdbb67f352154`.
- Reviewed-selection SHA256: `6d590dade4a7320ebbe3a6a93a21f951785af8919205a11da3156eb982803a52`; matches final QC authorization record and hash.
- Corrected frame 014 SHA256: `a3a41679e9ff96d6a29505faaa2b0b3ad4b43b7c6f3ff4d349d67d426f080b09`.

Final QC includes executed code hashes and explicit reviewed candidate `f014-c0003`, bound to native video and all 25 original frame hashes. The independent report describes the earlier detector false-positive finding, not the final reviewed gate: it is preserved as chronological evidence. Final operation was explicitly authorized; the normal CLI now defaults to detection only.

All staged files were rehashed after anonymous verification, and every corresponding existing trial file still matched. Parent-manifest hash, all 25 original hashes, and all 24 omitted corrected-frame hashes were checked against final QC. No parent manifest or receipt changed.

External archive root: `/Volumes/TB4/mac-mini-storage/shared/pinpin-white-matte-qc-archive-20260923/`. Exact manifest, adapter copy, and regular-file `stage/` are retained there; full receipts are `verified-v1/upload-receipt.json` and `verified-v1/anonymous-receipt.json`.

## Restore Parent Then Delta

Use a new external restoration root, never overwrite the original trial:

```sh
python3 tools/assets/hf_store.py pull --profile archive \
  --manifest tools/assets/white-matte-preservation.json \
  --root "$RESTORE" --cache "$CACHE"
python3 tools/assets/hf_store.py pull --profile archive \
  --manifest tools/assets/white-matte-qc-preservation.json \
  --root "$RESTORE" --cache "$CACHE"
```

The parent [white-matte-preservation.json](white-matte-preservation.json), SHA256 `d7acf6f8cd8fd4d2fe4ae46c83e0f160badbb362cc1a701fbeb2daf97274c7dd`, restores `matte-v01/rgba-frames/000.png` through `024.png`. The delta restores corrected `matte-qc-v01/rgba-frames/014.png` separately, leaving original 014 intact.

To assemble the complete corrected sequence, copy the other 24 parent frame files into the corrected directory only if their destinations are absent. Retain delta 014, refuse conflicting existing files, and SHA256-check all 25 corrected files against the relative `outputs` records in `matte-qc-v01/qc.json`. The manifest's `reconstruction` metadata documents this overlay; `hf_store.py` does not perform it automatically. This archive run verified the complete hash relationship without generating another sequence.

Public object URLs use `https://huggingface.co/buckets/miguelemosreverte/mr-pinpin-archive/resolve/` plus each manifest `object` key. No authentication is required for the verified downloads. Hash-key immutability is application-enforced, not a provider WORM guarantee.

Owned source handoff: `tools/assets/white-matte-qc-preservation.json`, `tools/assets/white-matte-qc-receipt.json`, and this report only. Lane stopped after archival completion.
