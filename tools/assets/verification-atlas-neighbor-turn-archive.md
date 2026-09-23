# Neighbor-Turn Archive Verification

2026-09-23. Complete: **135 files, 71,772,253 bytes** preserved in the existing
public bucket `miguelemosreverte/mr-pinpin-archive`. No visibility changes,
historical manifest mutations, runtime edits, paid retries or commits.

## Frozen Scope

[Manifest](atlas-neighbor-turn-preservation.json), relative to
`/Volumes/TB4/mac-mini-storage/shared/atlas-neighbor-turn-20260923/`.

Includes the new 015 still, exact prompt/provenance and opacity record; three
native MP4s with JSON/MD records and configs; all 75 lossless RGBA frames; exact
matting scripts and metadata; dark/green previews and contact sheets; conditioning
upload records; generation/validation summaries; Parfit's final boundary audit,
five evidence images and script; three new review sheets, their packing recipe
and manifests.

Excludes copied parent-000 input/native/RGBA/sheet, redundant comparison videos,
intermediate masks and duplicate frames, browser screenshots, HTML review copies,
caches, models and bytecode. Parent 000 originals remain covered by
[their prior manifest](atlas-topdown-walk-preservation.json); the 000 review
sheet can be reproduced from those frames with the preserved pack recipe.
This is an asset/provenance delta, not a self-contained browser snapshot.

## Proof

Manifest SHA-256:
`80ad72c3eac4749f65f69906d65bf395b4a0a70a09521b767575a409aaf52388`.

Job and receipts:
`/Volumes/TB4/mac-mini-storage/shared/atlas-neighbor-turn-archive-20260923/`.

- `verified-v1/upload-receipt.json`: 132 new objects, 3 existing objects;
  all 135 fresh remote download/size/SHA checks passed.
  SHA-256: `a27e69ff36e7cbf1be58fcdf9ad4a2ec3f278ca79510c6a563042a4e009700b9`.
- `verified-v1/anonymous-receipt.json`: independent fresh downloads using
  `HfApi(token=False)`; all 135 passed size/SHA verification.
  SHA-256: `a647374f7ad45bf875164cd4c65124f0b47338044bca7f80b37d6de4dce90ba6`.
- `verified-v1/complete.json`: all 135 local source hashes rechecked unchanged.
  The mini job exited 0. No remaining commands or transfers.

The job reused unmodified `tools/assets/hf_store.py` with four workers and a
fixed path allowlist plus expected manifest hash. Each object key is derived
from content SHA and basename. Receipts are operator verification records,
not signed attestations. No restore, deletion or Git index operation occurred.

## Generation And Review Limits

[Generation handoff](../../docs/storyboard/production/atlas-neighbor-turn-v01/HANDOFF-generation.md)
records exactly three completed requests and an estimated $0.135 video total,
within the $0.20 ceiling; this is not independently verified billing.
All 75 RGBA files decoded and matched their recorded hashes. All nine local
preview videos passed frame-count/rate/audio checks; six essential dark/green
previews are archived. A reverse-matting interpreter shutdown error occurred
after outputs were written; independently verified outputs were retained without
rerunning generation or the matte batch.

Native clips retain 25 frames at 24fps, 1.041667s; demo sheets select frames
0..23 at 24fps, exactly 1s, with no retiming. Frame 24 remains preserved.
[Independent review](../../docs/storyboard/production/atlas-neighbor-turn-v01/REVIEW.md)
finds front-facing detours in both turns, not clean monotonic neighboring turns.
Preservation does not certify calibrated headings, gait, matte perfection or
seamless joins. No automatic matte repair was applied.

Built-in delegation continued under the recorded Mission Control CLI-unavailable
exception. Unrelated working-tree changes and all earlier archives were preserved.
