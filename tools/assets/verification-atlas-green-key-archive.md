# Green-Key Archive Verification

2026-09-23. Complete: **50 files, 21,130,215 bytes** in the existing public
bucket `miguelemosreverte/mr-pinpin-archive`. No earlier archive changed.

[Preservation manifest](atlas-green-key-preservation.json), relative to:
`/Volumes/TB4/mac-mini-storage/shared/atlas-purple-key-20260923/`.
The directory retains the initially assigned purple name; actual input/video
are green. Exactly one video call, estimated $0.045, no retries.

## Scope

Includes the inspected green still and exact provenance/opacity record; native
MP4 and JSON/MD; config and generation snapshot; all 25 final despilled RGBA
frames; baseline key/despill records; baseline dark and final dark/green previews;
keying/despill/test/evidence scripts; five selected nose/full-contact PNGs and
their evidence record. Original files remain local and unchanged.

Excludes all 25 duplicate baseline RGBA files, the redundant baseline green
preview, copied white assets, browser HTML/screenshots/posters, caches and models.
Baseline frames can be regenerated from the native using the preserved recipe.
Browser posters derive from preserved native/keyed frames; no poster upload was
required. This is an asset/provenance archive, not a standalone browser snapshot.

## Verified Proof

Manifest SHA-256:
`eff44247d02db20014c4fea06d7e8880ff0b333216823cd7c9791ae5e24d974d`.

Job root:
`/Volumes/TB4/mac-mini-storage/shared/atlas-green-key-archive-20260923/`.

- `verified-v1/upload-receipt.json`: 50 new objects; fresh remote size/SHA checks
  passed for all 50. SHA-256:
  `1dca9d9dc3833b7727a165690f5c725a49a4f51e74bb24a847a6737dfb59569e`.
- `verified-v1/anonymous-receipt.json`: independent fresh downloads with
  `HfApi(token=False)`; all 50 passed. SHA-256:
  `a70b7ff664c7f992e39dd521eb1e6aa62b165a54bf1c00548bdfeee651d93fcf`.
- `verified-v1/complete.json`: all local source hashes rechecked unchanged.
  SSH job exited 0; no active transfer remains.

Used unmodified `tools/assets/hf_store.py`, four workers, fixed path allowlist
and expected manifest hash. No receipt-resume shortcut, visibility change,
deletion or Git write. Receipts are operator records, not signed attestations.

## Reproduction And Limits

All 25 final PNGs fully decoded as 1280x720 RGBA and matched their recorded
hashes; their alpha matched baseline at every pixel. No separate alpha copies
are necessary. All original files remain intact.

The current `key-tools-v01/key.py` adds only the DESPILL constant relative to
baseline execution. Removing that exact line reproduces the recorded baseline
SHA `0647e166898405451c9a16627fb42311b3c54af02e9c4421f4ad73d22aa5ff53`.
That byte-identical snapshot is archived as `key-tools-v01/key-baseline.py`.
Use it as `key.py` alongside `run.py` in a NEW external reproduction directory
for the historical baseline; use the current `key.py` for `despill.py`.
Neither owned script was modified. Native and all original outputs stay frozen.

[Generation handoff](../../docs/storyboard/production/atlas-purple-key-v01/HANDOFF-generation.md)
and [Parfit's review](../../docs/storyboard/production/atlas-purple-key-v01/REVIEW-key.md)
separate provider provenance, software checks and visual limits. Residual
yellow-green/gray edge fringes remain; preservation is not a perfect-key, gait
or seamlessness certificate. The archived generation summary reflects its
pre-preservation stage; these receipts close that pending archive step.
No extra generation, runtime integration or commits by this lane.
