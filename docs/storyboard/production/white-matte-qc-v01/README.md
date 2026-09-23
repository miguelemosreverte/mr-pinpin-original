# Local Matte Anomaly Repair

2026-09-23. Offline software only, zero paid/generative calls. Source/native and
the previous `matte-v01` are unchanged. No runtime integration or commits.
Work continued in the authorized built-in agent lane because Mission Control
CLI was unavailable; main coordinates the independent review lane.

## Result

The detector automatically found frame **14**, t=14/24 = 0.583333 seconds.
There is no hardcoded frame or repair rectangle in the detector. Of 67 candidate
components, one met the candidate heuristics and was explicitly reviewed for
repair; 66 are amber/review-only and untouched. Detection alone cannot repair.
The detected component has 224 pixels, bounding box `[810,530,827,551)`.
Its expanded evidence ROI `[804,524,833,557)` contains 224 opaque near-white
pixels in frame 14, versus zero in each neighbor 11..13 and 15..17.

Native RGB distinguishes disocclusion from a simple alpha spike: frames 11..13
contain a real paw at these coordinates. Frames 15..17 instead have similar
near-white source RGB and mostly transparent alpha, supporting the new gap.
The detector does not demand transparency in both immediately adjacent frames.
The 202-pixel native-neutral connected region is enclosed, not border-connected.
Counts differ from the independent audit's 201-pixel core because thresholds
and component definitions differ; both identify the same gap.

Repair changes **502 pixels in frame 14 only**, within a five-pixel dilation
of the detected component. It uses PyMatting closed-form alpha and foreground
color estimation in a small local trimap, not a rectangle clear or global key.
244 pixels change from alpha >=160 to <32. Alpha never increases, including
when repair regions overlap. Pixels outside the permitted region are exact;
the other 24 PNGs are byte-identical copies of their inputs.

## Evidence

External root:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/matte-qc-v01/`.

- `f014-c0003-before-after.png`: marked native/dark/green crops and change mask.
- `masks/014.png`: exact changed-pixel mask, not a rectangular selection.
- `rgba-frames/000.png`..`024.png`: lossless corrected sequence.
- `corrected-dark.mp4`, `corrected-green.mp4`: 25 frames, 24 fps, silent.
- `qc.json`: all 67 candidate records, gates, neighbor counts, changed-pixel
  records, exact source/code/output hashes, including the preview videos.

The source [qc.json](qc.json) is a byte-identical copy of the final evidence.
Final-code recomputation matches every saved RGBA pixel and the saved mask.
The inspected crop clears the white triangle and retains the surrounding paws.
No smoothing, registration, retiming, endpoint replacement or gait repair occurs.

## Scope and Reproduction

This is a review-assisted lower-body enclosed-gap profile for this known fixed-view
clip, not a universal anatomy detector. Labels describe rule-based evidence,
not calibrated confidence probabilities. True white fur/paws against white
background can be intrinsically ambiguous. Parfit demonstrated an enclosed
moving-white-paw false positive that passes all heuristics. The regression
keeps it flagged but verifies that the default review gate leaves it unchanged;
the heuristic was not adjusted to conceal this counterexample. Future clips
require explicit review. Tests are not semantic proof or a quality guarantee.

Implementation: [scripts/sprite-matte-qc](../../../../scripts/sprite-matte-qc/).
Use the existing mini Python environment
`/Volumes/TB4/mac-mini-storage/shared/pinpin-matting-tools-20260923/bin/python`.
Copy the five Python files to an external code folder on the mini. Run
`test_detector.py`, then `run.py --native ORIGINAL_MP4 --frames ORIGINAL_RGBA_DIR
--out NEW_EMPTY_DIRECTORY`. This default writes detection evidence only, with
no RGBA or video generation. Candidate labels are `repair-candidate`, never
background certainty. To apply the reviewed known gap, additionally pass
`--apply-reviewed f014-c0003 --review-record reviewed-selection.json` using
[the bound review record](reviewed-selection.json). It records main/Parfit's
review rationale and exactly binds the native and every input PNG hash.
The runner also verifies input PNG hashes against the original `batch.json`.
The runner checks the native SHA and exactly 25
1280x720 RGBA frames; decode is capped at 26 frames and mismatches fail.
`--verify-existing` also requires explicit reviewed selection; it recomputes
and compares saved results and refreshes evidence without making new variants.
Code, thresholds, selected IDs, review record/hash and preview hashes are in `qc.json`.

Ten tests pass: disoccluded white gap, interior eye/catchlight, cream fur,
shifting white paw, insufficient evidence, input/locality invariants, and
overlapping-repair monotonicity, detection-only CLI default, the enclosed
moving-white-paw review gate, and rejected mismatched native/RGBA review hashes.
The actual clip's detection-only run generated only `qc.json` with zero changes.
Explicitly reviewed final-code recomputation preserves the existing 502-pixel
repair exactly; no new visual variant was generated. Both previews pass frame-rate/count
checks. Final inputs remain unchanged, and no command remains running.
Archive preservation is deferred to main's separate bounded manifest; no earlier
manifest or receipt was changed by this work.
