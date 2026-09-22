# Publication backup verification

Status: COMPLETE on the mini, 2026-09-22. All 678 new immutable objects were
uploaded successfully and freshly downloaded anonymously; every byte count and
SHA-256 passed. The final successful receipt covers all 683 logical paths.

Selection: 502 current production paths (751,884,605 bytes) plus all 181 unique
Elder original PNG paths from the export manifest (506,521,592 bytes). Total:
683 logical paths, 1,258,406,197 bytes. Five production aliases deduplicate to
678 immutable objects totaling 1,244,796,005 bytes. No master overlaps the
production selection or previously verified archive objects.

All source paths were present. The masters were copied from the cover-standard
worktree to the SSD; production staging already existed on the mini. Every
production hash matched the frozen runtime manifest, and every PNG master hash
matched its export `sourceSHA256`, before upload. The job used the existing HF
adapter and cached authentication; all fresh verification downloads explicitly
used anonymous `HfApi(token=False)`. Post-download Xet identity checks remained
fresh remote requests. Staged source files were rehashed before the final receipt.

Independent final receipt validation confirmed all 683 entries match the combined
manifest, every entry has `verified: true`, `remote_verified: true`, and a Xet
identity, and all 181 export provenance records are preserved. The receipt records
`anonymousFreshDownloads: true`; all source/staged files remain present.

Four focused offline tests passed: full anonymous roundtrip and alias expansion,
bad master SHA rejection before upload, corrupt download rejection, and changed
remote generation rejection. The runtime manifest stays byte-identical in the
end-to-end fixture. No SDK upgrade or existing-adapter changes were needed.

An additional live CLI restore smoke test passed using the existing `hf_store.py
pull`, with token environment variables removed and
`HF_HUB_DISABLE_IMPLICIT_TOKEN=1`. It restored and hash-checked the 47,088-byte
`docs/storyboard/images/covers/home-sweet-home/miniature/miniature-v1-256.webp`
into a separate SSD destination. This checks the documented token-free CLI path;
the full backup run separately verified anonymous downloads of all 678 objects.

## Artifacts

- Public bucket: `miguelemosreverte/mr-pinpin-archive`.
- Keys: existing `sha256/<prefix>/<sha256>/<basename>` format, unchanged for
  production assets. Masters use the identical format with export source SHA-256.
- External job: `/Volumes/TB4/mac-mini-storage/shared/pinpin-publication-backup-20260922/`.
- Successful final receipt: `publication-backup-receipt.json` in that directory.
  SHA-256: `f64b5cd95b122a56ef0808c55302c1f064c553e2acefce725ae2bbaa822eec36`.
- `preservation-manifest.json`: combined 683-path preservation selection.
- `production-preservation.json`: 502 production-only paths, role copies `archive`.
- `master-preservation.json`: 181 original PNG paths, separate from production.
- `provenance.json`: all 181 export records, source/object mappings, input manifest
  hashes, and logical/object byte totals.
- `object-receipt.json`: fresh proof for all 678 unique immutable objects.
- `anonymous-restore-smoke-receipt.json`: successful token-free CLI restore proof.
- `progress.json`: sanitized current progress; `failure.json` only upon failure.

Restore manifests are also generated in PRIMARY at
`tools/assets/production-preservation.json` and
`tools/assets/backup-publication-masters.json`. See `backup-publication.md` for
reproduction and token-free restore commands.

Frozen input SHA-256 values:

- Runtime manifest: `6e21d80e689c3e063e98b1886235b27a2038c14d5f915b9477a45073d4008262`.
- Export manifest: `85c38d9c43038ff84a41f7e72e57240b860d02e40cfa902f2de31077b5f238dc`.

This lane changes no runtime manifest, policy, classification, application code,
Git index, ignore rules, or history. Local files remain present and production
assets remain in legacy Git. The already verified 181 archive and 208 Blender
objects are not selected for repeat backup. Publishing/cutover belongs to the
other lanes and is not implied by this storage report.
