# Atlas Top-Down Seam Preservation

Complete, 2026-09-23: **8 files, 2,179,748 bytes**, public bucket `miguelemosreverte/mr-pinpin-archive`. Existing `hf_store.py` on mini uploaded and freshly verified all eight; a separate fresh-download verification with `HfApi(token=False)` also passed. All staged and original artifact hashes remained unchanged afterward.

- [Preservation manifest](atlas-topdown-seam-preservation.json).
- [Exact anonymous verification receipt](atlas-topdown-seam-receipt.json).
- [Parent preservation manifest](atlas-topdown-walk-preservation.json), owned by Pauli. All 24 referenced frames, omitted frame 24, and raw25 preview hashes match this parent manifest; this lane did not duplicate or re-upload them.

Included only: `candidate24-v01/{candidate24-dark.mp4,candidate24-green.mp4,manifest.json,report.md}`, `seam-audit-v01/{metrics.json,foot-regions.json,report.md}`, and `seam-native-v01/feet-boundary-cycles.png`. HTML comparison, other contact sheets, original PNGs/native video, dependencies, and source-code copies are outside this delta. Archived reports retain their chronology and may link to those local-only auxiliary diagnostics.

## Proof

| Artifact | SHA256 |
| --- | --- |
| Delta manifest | `9e87fba7df5c9b024c462ba02a8166d11786858550a10b17950300cf105bcf99` |
| Parent manifest snapshot | `af30f96746f45efdd63f8e0407e9b649a91f44c96b2641f36d2a0198a201493a` |
| Upload receipt | `f5bcca79536e24633b659dd3a5ade80acd2e199a8ae5bf9a906c905dc77e11c1` |
| Anonymous receipt | `b788ecbf391a68e3fb66287754c9c7c9d84a560deddadac19eafa9076d3a2d55` |

Full upload/anonymous receipts and regular-file staging remain under `/Volumes/TB4/mac-mini-storage/shared/atlas-topdown-seam-archive-20260923/`, receipts in `verified-v1/`. The exact anonymous receipt is also copied to source at the link above. No credentials were written to these artifacts.

## Restore

Restore the parent and delta into the same new external root:

```sh
python3 tools/assets/hf_store.py pull --profile archive \
  --manifest tools/assets/atlas-topdown-walk-preservation.json \
  --root "$RESTORE" --cache "$CACHE"
python3 tools/assets/hf_store.py pull --profile archive \
  --manifest tools/assets/atlas-topdown-seam-preservation.json \
  --root "$RESTORE" --cache "$CACHE"
```

Candidate frame references in `candidate24-v01/manifest.json` are relative to that trial root. Use original RGBA `000.png` through `023.png` at 24fps, not another generated sequence. The MP4s are one-second lossy opaque-background previews; source RGBA bytes remain in the parent archive. No overlay, replacement PNG, frame duplication, interpolation, crossfade, or warp is needed.

Candidate24 improves the measured local wrap direction and exact period but remains **not certified seamless**. Variable foot speed and uncertain gait/contact remain documented in the preserved assessment. This archive is not an atlas deployment or artistic approval.

This final lane added only the delta manifest, receipt, and this report. No further code analysis, media generation, commits, or runtime changes. Source `scripts/seam/` was handed off in the preceding implementation task. Lane complete.
