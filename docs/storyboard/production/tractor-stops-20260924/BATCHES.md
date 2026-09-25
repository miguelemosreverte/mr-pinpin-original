# Current per-stop production handoff

Current result: all 24 source-locked cubemaps are exported and available in the experimental demo. The strict desktop/mobile runtime pass succeeded after correcting the final video seek: all 24 decoded entry and return frames match their saved source timestamps exactly. See [ALL-24-REVIEW.md](ALL-24-REVIEW.md) for evidence and remaining scenery limitations; source motion blur remains unchanged.

The target is 24 source-matched look-around viewpoints along the existing orbit. The user accepted the exact frame match and explicitly deferred motion-blur refinement until all cubemaps are complete. Keep the source pixels, lighting and blur. Generated transition clips are stopped because the tractor deformed; do not resume the bridge watcher.

Current ownership: B owns 00–05 excluding 04 and 10–12; A owns 06–09 and 16–19 plus viewer verification; C owns 13–15 and 20–23. The coordinator retains 04. Historical range assignments and 45-degree restoration guides are superseded. See `BRIDGE-EXPANSION.md` for the decision history.

## Inputs and generation

Every stop retains `source.png` and its original extraction record. `source-display.png` and its sidecar record the exact browser-decoded video frame used by the source layer. Retain earlier restorations as separate attempts; they do not replace the original frame.

New guides use a 65-degree authored vertical lens, actual 16:9 aspect and the recorded source-display frame. This is an authored projection convention, not a measured video lens. The guide is the first image-model input and the edit target: fill unknown gray directions while preserving the colored core. The native source frame supplies appearance and identity. An accepted sphere may supply projection/continuity context only; do not borrow its tractor pose. A bounded two-input variant omitting that third reference improved stop03 after a failed attempt, but does not establish universal reliability. Exact ordered input paths, hashes and prompts in each generation record are authoritative.

Use built-in image generation after inspecting its inputs. Keep each returned master unchanged and version later attempts separately. Camera fitting is diagnostic; broad source coverage matters more than a small residual restricted to the cab. Registered rear/pole repairs address demonstrated geometric defects. The original frame's motion blur and surrounding focus differences are deferred by the user.

## Source control and exports

Inspect the source-anchored scene, not just the generated background. `source_anchor.py` reproduces the runtime ray projection with the native source aspect and .94-to-1 rectangular feather. The source camera must equal the selected opening camera. Runtime uses the actual paused video texture and the same WebGL color path in orbit and look-around modes.

Keep these roles separate:

- `panorama-assembled-v1.png`: selected generated background with registered repairs.
- `panorama-source-locked-v1.png`: deterministic baked source-anchored sphere.
- `source-locked-exports-v1/`: cube atlas, six faces and export provenance from the anchored sphere.
- `forward.png`: generated background opening proof; identify it as such.
- `source-lock-review.md`: actual source-boundary review, including deferred blur and any geometric limitations.

The selected descriptor records `panorama`, `camera`, `sourceCamera`, `sourceAnchor`, `anchoredPanorama`, `anchoredExports`, `anchoredCube`, prompt/generation records and review paths. `sourceLockStatus` is separate from background-art review. Use `experimental` for a reviewed, usable prototype with disclosed limitations; pending or extracted-only assets stay unavailable. Never use readiness as a synonym for measured geometry or perfect seam continuity.

The viewer retains one-finger/left-drag orbit, two-finger/right-drag look-around, nearest-stop snapping and recenter-before-return. Opening geometry and source timestamp must match; rejected bridges must never autoactivate. Review exported face adjacency and actual browser views, then include the stop in the final 24-viewpoint switching check.

## Storage and preservation

Heavy media, fitting, cube export, browser capture and archive verification run on the mini under `/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924`. Use SSH/SCP while the Air cannot read the SMB mount. Keep temporary local image references small and remove only verified disposable copies.

Source, exact prompts, sanitized records and manifests stay in Git. Media are preserved through scoped regular-file stages and the existing verified HF adapter. `archive_batch.py` prepares stable media snapshots; it does not upload, delete originals or alter global policy. No official reader publication is part of this experiment.
