# Tractor performance evidence preservation

54 regular files, **50,093,977 bytes**, preserved in the existing public bucket
`miguelemosreverte/mr-pinpin-archive`: 38 PNG screenshots, 9 JSON evidence files,
and 7 exact baseline/final runtime JavaScript snapshots. No artwork was resized,
regenerated, compressed, or removed.

The scoped [manifest](tractor-performance-20260924.json) and
[receipt](tractor-performance-20260924-receipt.json) cover these frozen
directories under `docs/storyboard/production/tractor-stops-20260924/browser-check/`:

- `performance-baseline`: 7 files.
- `performance-final-v2`: 8 files.
- `source-all24-performance-v2`: 30 files.
- `performance-off-axis-final-v2`: 9 files.

Provisional performance runs are excluded. The older `source-all24-v2`
comparison screenshots remain preserved by the existing
[exact-QA manifest](tractor-stops-expansion-qa-exact.json) and
[receipt](tractor-stops-expansion-qa-exact-receipt.json), without duplication.
See the [performance report](../docs/storyboard/production/tractor-performance-20260924/REPORT.md)
for measurements, controls, source-frame checks, and stated limitations.

Files were copied into a separate regular-file staging root on the mini:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/performance-archive-stage`.
The existing `hf_store.py push` workflow used the external
`pinpin-asset-cache`; all 54 entries passed remote download/SHA verification.
An independent check then matched each receipt entry's path, role, byte count,
SHA-256 and content object key with the manifest, rehashed both the original
and staged file, and required `verified: true`, `remote_verified: true`, a
remote Xet identity, and `dry_run: false`. No global asset catalog/policy,
original files, or existing archives were changed.

- Manifest SHA-256: `c1430d0bea7b1113b8bd65883a9fc428e7a21fa3ed73a6e075235173cace4107`.
- Receipt SHA-256: `6eb4860336707ae0ef89917537400842bbcc6941af3bf8f2ac3adbebe2876441`.

Restore these files through `tools/assets/hf_store.py pull` using this manifest,
an external regular destination directory, the existing external cache, and
`--profile archive`. No binary evidence belongs in the Git commit.
