# Atlas Elevated-View Walking Trial

2026-09-23. **One authorized request completed and collected**; native and local
matte outputs are frozen for review. No additional paid requests.
Main supplied and inspected the opaque book-only still; this lane also viewed
it and verified the pixel gate. Main verified the official 720p silent tier today at
$0.045/second and confirmed exactly one authorized request under $0.10.
Request ID: `01a0cfee-8b2c-7812-9810-34b0d0061f54`.
Exactly one submission; use collection only from here. No runtime/atlas or QC code changes.

## Bounded Request

[Exact config and prompt](atlas-topdown-walk-v01.json): PixVerse V6 Transition,
one second, 720p, 16:9, audio off, multi-clip off, prompt optimization disabled.
One expected $0.045 request; absolute authorization ceiling $0.10. No automatic
retry, upscale, alternate model or additional angle generation. Price is an
estimate, not an invoice; current official-price confirmation was relayed by main.

External root: `/Volumes/TB4/mac-mini-storage/shared/atlas-topdown-walk-20260923/`.
Input: `topdown-reference-v01.png`, 1672x941 native RGB, 1,690,658 bytes.
SHA-256: `cabe37ed98075c90c1990860e8128ecf6f66916219e1dd4ec5b6ee76002d2836`.
All 1,573,352 pixels are opaque; the 16px border is entirely RGB 251..255.
The gate passed before submission. Exact image-edit prompt/provenance is in
[topdown-reference-v01.md](topdown-reference-v01.md), identical to the adjacent
external Markdown. No rig, guide, old anchor or substitute input was used.
Main's intended new view is 55 degrees above ground, facing right at nominal
heading 0 degrees; this describes the requested still, not a measured render.

The same uploaded still is supplied as `first_image_url` and `end_image_url`.
This requests a same-view loop, not an angle transition. The unchanged existing
runner keeps exclusive submission sidecars and a single-POST transport guard.
On ambiguous submission, retain state and reconcile; never retry submission.
After a request ID exists, use only `collect` for that ID.

```sh
node scripts/generate-atlas-video.cjs submit docs/storyboard/production/atlas-topdown-walk-v01.json
node scripts/generate-atlas-video.cjs collect docs/storyboard/production/atlas-topdown-walk-v01.json
```

The submit command above is historical and must not be repeated. Input and
price gates passed. All ten existing runner tests pass. Sidecars guard against
duplicate submission and retain the input hash and exact request parameters.

## Loop Assessment

Retain the native video and request JSON/Markdown without alteration. Inspect
the actual frame count, duration, all four paws where visible, heading, body
size, framing, and how many coordinated gait cycles were produced. A requested
one-second cycle does not establish that one was generated.

Reuse local rembg/PyMatting only in a new derivative directory, with the correct
new input hash; do not run the prior hardcoded-clip scripts unchanged. Preserve
native order/timing and compare matte edges on dark and green. Matting is not a
gait or loop repair; any future pixel correction requires explicit reviewed
selection, never automatic application of QC candidates.

Compare first/last appearance within the foreground rather than relying on a
white-dominated whole-frame score. Inspect incoming motion (last few frames),
outgoing motion (first few), and the last-to-first jump. Similar endpoint poses
alone do not establish matching velocity or seamless playback. Start with the
unaltered native loop and report any pause, reversal, jump or heading drift.
Do not use ping-pong walking, silently discard endpoints, replace frames, or
claim an exact loop merely because first/end conditioning images matched.

This is one-view evidence only. Eventual 15-degree view spacing would require
consistent reviewed headings, gait phase, body scale and contact timing across
views; no multi-angle atlas readiness is implied by this single trial.

## Collected Result

- Native: `atlas-topdown-walk-pixverse-v01.mp4`, 515,886 bytes, H.264,
  1280x720, 25 frames at 24 fps, 1.041667 seconds, no audio.
- SHA-256: `7688f1ee5030de0385d5e9a77017a127591f010c5bd304bc6a91160b1ad732bf`.
- Submitted 20:21:51.968Z; collected 20:22:24.836Z on 2026-09-23. The 32.868s
  interval includes queue/poll/download and is not isolated inference latency.
- Same first/end URLs and exact input hash confirmed. $0.045 remains an estimate,
  not independently verified billing. Still/native hashes remain unchanged.

`matte-v01/` contains 25 lossless RGBA PNGs, dark/green previews and an
original/dark/green/magenta comparison. All keep native frame order and timing.
Existing rembg `u2netp` + PyMatting recipes were reused, changing only the native
basename and expected SHA in `preview.py` and `batch.py`; `render.py` is unchanged.
The recipes are based on [white-background-matte-v01](white-background-matte-v01/).
No new model download, smoothing, endpoint replacement or reviewed QC repair.

Inspected `native-all25.png`, the dark contact sheet and first-frame comparison:
the elevated right-facing view is broadly retained, with changing leg poses
and a blink around frames 14..17. Hidden paws prevent certification of a full
coordinated four-paw cycle. Face/cream fur and visible paws survive this bounded
matte review; fine edges and temporal alpha are not certified perfect.

Read-only generic `detect()` recorded 57 near-white components, all amber, with
zero `repair-candidate` IDs and no pixel changes. Full records are external
`matte-v01/detection-only.json`. This lower-body heuristic can miss new-view
defects; zero candidates is not proof of a flawless matte. The prior fixed-hash
CLI was not modified or applied to this clip.

Preliminary native boundary diagnostics in
[native-loop-audit.json](atlas-topdown-walk-v01/native-loop-audit.json): endpoints
are not pixel-identical; RGB MAE is 3.0863/255 whole-frame and 8.4253/255 on the
foreground union. Farneback median image displacement is 2.210 px for 23->24,
0.556 px at 24->0, and 1.198 px for 0->1. The wrap differs from neighboring steps;
these texture-based image-flow estimates are not physical paw velocities or
proof of a seamless loop. Parfit owns final seam assessment and candidate choice.

Reproducible native audit and read-only detector wrapper are preserved in
[atlas-topdown-walk-v01/](atlas-topdown-walk-v01/). They run on the mini from the
external trial root; `native-audit.py` uses existing VGGT Python/OpenCV 4.13,
and `qc-readonly.py` uses the existing matting venv. Exact local file hashes are
in `files.json` there. This snapshot is not an HF preservation receipt. No
runtime changes or commits were made by this lane; no commands remain running.

## Public Preservation

The [separate primary-asset manifest](../../../tools/assets/atlas-topdown-walk-preservation.json)
now preserves 46 selected files, 23,999,539 bytes. All passed fresh anonymous
public download/size/SHA-256 verification and post-check source hashes are
unchanged. [Verification and receipt hashes](../../../tools/assets/verification-atlas-topdown-walk-archive.md)
record the completed mini run. Review copies, duplicate exports and Parfit's
separate seam candidate are excluded. Earlier archives/manifests remain intact.
