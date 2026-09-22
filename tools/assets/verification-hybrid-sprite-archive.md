# Hybrid sprite study archive

Status: COMPLETE. All 30 objects uploaded and freshly verified, including an
independent anonymous full-checksum download pass.
Date: 2026-09-22. Optional review copies are excluded and do not block this archive.

## Selection

Dedicated manifest: `tools/assets/hybrid-sprite-study-preservation.json`.
All entries have archive role; no production/global catalog changes were made.

Study source root on mini:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-pose-study-20260922/`.

Approved selection: **30 files, 7,203,562 bytes, 30 content-addressed objects**.
The adapter validated every selected path, size and hash before any upload.
Manifest SHA-256:
`745d21e7763da5215cf52ff1453bd3f8af91756fe73a6a8a6647f32a66ed7a44`.

- Four/eight neutral guide PNGs, both `.blend` files, study/verification metadata,
  and the four-pose contact sheet.
- Seven existing guide scripts/documentation files, including the configuration
  and inspection scripts actually present in the SSD study workspace.
- `pinpin-appearance-4-v01.png` and its exact-prompt/hash Markdown record.
- `plan-4-angle105/plan.json` and `prompt.txt`, explicitly an example planning
  output, NOT the actual submitted generation prompt. The candidate Markdown
  sidecar is the actual prompt/execution provenance.

Excluded: all review versions/assets, Python caches, `.pyc`, `.blend1`, and
screenshots. Review assets can be regenerated from the preserved study or archived
separately later. Original book references are identified by source paths and
hashes in the exact prompt record and are NOT reuploaded in this archive.

This is experimental preservation, not production animation approval. The main
lane recorded one image-generation call, tool elapsed time 60.3 seconds; this
archival lane makes no image calls.

## Prepared procedure

External job directory:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-study-archive-20260922/`.

- `prepare.py`: explicit allowlist selection and content-addressed manifest.
- `prepared-v1/`: retained superseded provisional selection; never uploaded.
- `prepared-v2/preservation-manifest.json` and `selection.json`: approved core
  selection, identical to the repository preservation manifest.
- `hf_store.py`: copy of the existing checked-in adapter, no changes.
- `upload.py`: requires explicit `--review-ready`, the approved manifest path and
  SHA-256, and a new receipt output directory under this job directory.

The operator explicitly approved the core study and planning example after
preparation. The mini runs the existing HF SDK/cached authentication with progress
bars disabled. The adapter validates all source hashes before writing, refuses
conflicting remote objects, and freshly downloads every upload for full checksum
verification. The script then verifies every object through a separate anonymous
client and checks the source hashes again. Receipt destination: `verified-v1/`.
Both receipts contain 30 matching entries with verified remote byte identities.
All 30 source hashes were checked again after anonymous verification and remain
unchanged. `verified-v1/complete.json` records the final counts, manifest hash,
receipt hashes, and `anonymous_verified: true`.

## Receipt proof

Receipt directory on mini:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-study-archive-20260922/verified-v1/`.

- `upload-receipt.json` SHA-256:
  `d586b1754f1e79812f74beddbb0b4922c8ff62387bdfe3f52b6bc731dcce8ccd`.
- `anonymous-receipt.json` SHA-256:
  `e4bf868c6a99092f1893b73bc8737c5cb3f4f44aee938fb50d958a5f43d4b6dc`.

The later review-v3 readiness signal did not change the frozen core manifest.
As explicitly agreed, regenerable review files remain outside this archive.

## Restore contract

Manifest paths are relative to the study root, not the source checkout or its
`docs/` tree. After successful archival, create an empty external study directory
and run from the source checkout (on mini for the transfer):

```sh
HF_HUB_DISABLE_PROGRESS_BARS=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1 \
  python3 tools/assets/hf_store.py pull \
  --manifest tools/assets/hybrid-sprite-study-preservation.json \
  --profile archive \
  --root /Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-study-restored \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache \
  --receipt /Volumes/TB4/mac-mini-storage/shared/pinpin-sprite-study-restore-receipt.json
```

Unset explicit HF token environment variables when testing fully anonymous
restoration. The public bucket remains `miguelemosreverte/mr-pinpin-archive`.
Restoration recreates `control-4-angle105-v01/`, `control-8-angle105-v01/`,
`scripts/`, `plan-4-angle105/`, and the candidate PNG/Markdown at the root. Review
HTML is not selected; archival does not establish animation or browser approval.

No source asset was modified/deleted, no runtime or production manifest changed,
no bucket setting changed, and no commit or Git index/history write was made.
The upload ran only on mini with all heavy outputs/cache on the external SSD.
All required processes exited successfully. No transfer job remains running.
