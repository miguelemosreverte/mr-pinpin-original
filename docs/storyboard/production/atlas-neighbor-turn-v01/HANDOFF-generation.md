# Neighbor Heading and Directed Turn Trial

2026-09-23. **Exactly three authorized requests completed and collected.**
Main supplied and inspected the opaque heading-015 still. Built-in delegated lane
continues under the recorded Mission Control CLI-unavailable exception.
No new stills, runtime changes, commits or edits to the prior QC implementation.

## Authorized Scope

Exactly three PixVerse V6 Transition requests, each one second, 720p, 16:9,
silent, multi-clip off, prompt optimization disabled. Expected $0.045 each,
$0.135 total; aggregate ceiling $0.20. No automatic retries, alternative models,
upscaling, extra angles or regeneration of the existing heading-000 loop.

- `heading-015-loop-v01.json`: same inspected 015 still at first/end.
- `turn-000-to-015-v01.json`: original 000 still first, new 015 still end.
- `turn-015-to-000-v01.json`: new 015 still first, original 000 still end.

The turn configs now contain explicit verified unsigned `end_image_url` values.
`preparation` describes local provenance only and is not a runner enforcement
feature. Each config records both local input hashes. No unresolved placeholder
was submitted. The three commands must not be submitted again.
The existing runner is unchanged: `matchEndFrame: false` preserves an explicit
`input.end_image_url`, while the loop uses `matchEndFrame: true`.
After inspection, both approved anchors were uploaded for endpoint references;
downloaded bytes matched exactly. [conditioning-uploads.json](conditioning-uploads.json)
records local hashes and unsigned provider URLs. The runner additionally uploads
each start image when submitting; storage uploads are not extra video requests.

## Inputs and Outputs

External root:
`/Volumes/TB4/mac-mini-storage/shared/atlas-neighbor-turn-20260923/`.
015 input: `heading015-reference-v01.png`, 1672x941 native RGB, 1,636,906 bytes,
SHA-256 `37ec95e70d26e6393e39a225e836008092b9ef4437d87ea2c17fb1927bda79ad`.
All pixels are opaque; the 16px border is RGB 251..255. Main and this lane viewed
the still. Exact supplied provenance is copied in
[heading015-reference-v01.md](heading015-reference-v01.md). No rig or other
invented still replaced the inspected input. The 015 label is nominal.

Approved 000 still, preserved in its original location:
`/Volumes/TB4/mac-mini-storage/shared/atlas-topdown-walk-20260923/topdown-reference-v01.png`.
SHA-256: `cabe37ed98075c90c1990860e8128ecf6f66916219e1dd4ec5b6ee76002d2836`.
Existing 000 loop also stays untouched; native SHA-256:
`7688f1ee5030de0385d5e9a77017a127591f010c5bd304bc6a91160b1ad732bf`.
Preservation: `tools/assets/atlas-topdown-walk-preservation.json`.

Each new MP4 uses its config's basename under the new external root. Existing
exclusive sidecars and single-POST transport guard must remain in use. Once a
request ID exists, only collect that ID. Ambiguous outcomes require main's
reconciliation, never another submit attempt.

| Request | ID | Submitted UTC, 2026-09-23 |
| --- | --- | --- |
| 015 loop | `01a0d005-ff2d-77f0-8773-f08506184f32` | 20:47:28.911Z |
| 000 to 015 | `01a0d006-652b-7611-9c28-1b76d222fe9e` | 20:47:55.025Z |
| 015 to 000 | `01a0d006-85d5-7950-b5aa-b5ecc156a76c` | 20:48:03.384Z |

The same first/end URLs were confirmed for the loop and distinct URLs for each
turn. All ten existing runner tests passed before submission. No retry occurred.

## Playback Contract and Review

Main's demo policy is frames 0..23 at 24 fps for all four demo clips: exactly one
second without retiming. Native frame 24 remains preserved in native videos and
full 25-frame matte sequences, not included in the demo. Dewey owns those demo
derivatives. Use one-second loops and directed turns, switching at boundaries.
A requested turn can wait up to one loop cycle when preloaded, then play the
directed turn once, then enter the destination loop. A queued next turn starts
at the current turn's end. No cross-loop phase matching, ping-pong walking,
hidden retiming or atlas integration is part of this experiment.

Shared conditioning stills encourage endpoint pose compatibility but do not
guarantee exact endpoints, matching motion velocity or seamless joins. Review
000-loop->forward-turn->015-loop and 015-loop->reverse-turn->000-loop boundaries,
heading drift, framing, paw visibility, blink and the actual turning direction.
The 15-degree labels are intended headings, not a calibrated 3D measurement.

The same local rembg/PyMatting recipe was used on the mini, separately for each
new clip, preserving native timing and lossless RGBA outputs. No matte repairs
were applied. Native inputs, all prior outputs and other agents' work remain
unchanged. Main owns review/integration decisions.

## Collected and Matted

[generation-summary.json](generation-summary.json) records all request IDs,
submitted/collected timestamps, exact conditioning hashes, native hashes and
recipe mapping. Each native is H.264 1280x720, 25 frames at 24 fps, 1.041667s,
silent. Estimated video total remains $0.135, not independently verified billing.

All `<clip-name>-matte/` directories in the external root contain 25 RGBA PNGs,
dark/green MP4s, an original/color comparison, contact sheet, recipes and metadata.
Exactly 75 RGBA files passed full decoding and recorded size/SHA checks. All nine
preview MP4s passed frame-count/rate/audio checks. Parent 000 input/native hashes
are unchanged. [matte-validation.json](matte-validation.json) records the checks.

Reverse-turn matting wrote all 25 frames and complete batch metadata/contact/
comparison, then Python exited SIGABRT with a native `recursive_mutex` shutdown
error. The batch was not rerun. Its outputs independently passed every decode/
hash check; standalone rendering then succeeded. This was local software teardown,
not a failed generation or a paid retry. The known output files are complete.

Inspected all three dark contact sheets and the 015 first-frame comparison.
Cream face/eye whites and visible paws are retained at this review scale.
Turns show midclip rotation toward the viewer followed by a return; monotonic
15-degree motion is not established. Hidden limbs, blinks, generated pose changes
and mask edges prevent four-paw gait or seamless-join certification. No automatic
deletion or extra generation was used to disguise these limitations.

## Preservation Complete

All 135 selected files (71,772,253 bytes), including 75 RGBA frames, passed
fresh authenticated and anonymous download/size/SHA verification. Every local
source was rehashed unchanged afterward. The mini archive process exited 0.
No remaining generation, matting or transfer commands.

Manifest: [atlas-neighbor-turn-preservation.json](../../../../tools/assets/atlas-neighbor-turn-preservation.json).
Proof and exact receipt hashes: [verification-atlas-neighbor-turn-archive.md](../../../../tools/assets/verification-atlas-neighbor-turn-archive.md).
This new archive includes Parfit's final boundary evidence and the three new
demo sheets, without duplicating parent-000 media or browser review copies.
Existing archives remain unchanged. No further generation or automatic repair.
