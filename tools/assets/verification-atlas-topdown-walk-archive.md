# Atlas Elevated-Walk Archive Verification

2026-09-23. **Complete: 46/46 files, 23,999,539 bytes.** All selected originals
matched the frozen local snapshot before upload and remained unchanged after
both verification passes. No paid generation, runtime changes or commits.

## Scope

[Preservation manifest](atlas-topdown-walk-preservation.json), all entries
`role: archive`, public bucket `miguelemosreverte/mr-pinpin-archive`.
Source root: `/Volumes/TB4/mac-mini-storage/shared/atlas-topdown-walk-20260923/`.

- New opaque still PNG, exact image-edit provenance Markdown and opacity audit.
- Native MP4 plus exact request JSON/Markdown; one request only.
- Trial config, native contact sheet, preliminary native motion audit/code,
  and the read-only QC wrapper.
- All 25 lossless matte RGBA frames; preview/batch/render recipes and metadata;
  dark/green MP4s, all-frame dark contact and full read-only QC records.

Excluded: the old white anchor, old sheets, HTML review/copies, quarter-frame
preview duplicates, frame-zero duplicate exports/masks, comparison MP4, model
weights/cache, and Parfit's separate seam-24 candidate. The 57-file local freeze
is broader than this deliberately selected archive. Original files were not
removed or mutated. No earlier manifest or receipt was modified.

## Proof

The existing `hf_store.py` ran on the mini with external SSD cache, four workers.
It validated all local bytes/hashes, uploaded 45 new objects, and reused one
existing identical object. All 46 passed fresh download/size/SHA-256 checks.
A separate `verify_entries(..., api=HfApi(token=False))` then freshly downloaded
and verified every object anonymously. Final local byte/hash checks also passed.

Manifest SHA-256:
`af30f96746f45efdd63f8e0407e9b649a91f44c96b2641f36d2a0198a201493a`.

Receipts live under
`/Volumes/TB4/mac-mini-storage/shared/atlas-topdown-walk-archive-20260923/verified-v1/`:

- `upload-receipt.json`: `bbebca1de587261bfb78b7fa4b77cb55a32923d9d0c0a2c771da060212d591c4`.
- `anonymous-receipt.json`: `d78b9bffed67a924c0785a04b80b5e2206145d064d4a16176306a16f0b90695a`.
- `complete.json`: compact completion record, 46/46 verified, sources unchanged.

The job folder preserves the exact adapter, bounded uploader and manifest copy.
These are operator verification records, not signed attestations or artwork
approval. The trial remains one-view evidence; seamless gait and atlas readiness
are not established by successful preservation. No command remains running.
