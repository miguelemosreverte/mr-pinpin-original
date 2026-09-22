# Book-Only Video Trial

2026-09-22. **One request completed and collected**, at $0.045 estimated total,
with the original RGBA image unchanged as both endpoints. Frame review finds
more walk-like limb motion, but does not certify gait; background and edge
artifacts remain. No retries, upscale or fallback model.
The previous rig-guided experiment remains rejected and archived separately.

## Endpoint and Budget

`fal-ai/pixverse/v6/transition`.
[Official schema](https://fal.ai/models/fal-ai/pixverse/v6/transition/api), checked
2026-09-22, supports integer duration 1-15 seconds, required `first_image_url`
and `end_image_url`, 720p, `generate_audio_switch: false`,
`generate_multi_clip_switch: false`, and `thinking_type: disabled`.
The endpoint does not call its final-frame field `last_image_url`.

[Official tier pricing](https://fal.ai/models/fal-ai/pixverse/v6/transition)
lists $0.045/second at 720p without audio. One second estimates **$0.045 total**,
under the **$0.10 authorization ceiling**. No purchase above that ceiling or
switch to another model is authorized without further confirmation. Generic
pricing API base rates are not a substitute for this resolution/audio tier.
This estimate is not a billing receipt or a provider-enforced account cap.

## Input and Execution Gate

[Prepared config](book-only-video-pixverse-v01.json) points only to
`book-only-walk-reference-v01.png` in the external trial root. Its
[generation record](book-only-walk-reference-v01.md) identifies exactly two
original book inputs, with no rig, pose sheet, old appearance anchor or video.
The still is not approval of anatomy, heading or motion. The image is 1672 x 941
with alpha. Use of its unchanged RGBA bytes was explicitly authorized; no
flattening, compositing or alpha editing is performed. The prompt requests a
plain white background, which is an instruction rather than an input conversion.
This transition endpoint is used for a same-view loop, not a turn between angles.

The existing runner gains only PixVerse's documented first-frame and control
fields. Its current end-frame assignment, one-upload behavior, source hash,
redaction and duplicate-submit/retry guards are retained. The one request uses
the same confirmed image as both endpoints. All ten focused runner tests pass,
including old endpoint behavior and PixVerse field/provenance preservation.

## Review Limits

Inspect full-body framing, face consistency, every visible leg's stance/swing,
foot sliding, loop closure, and actual duration. First/last conditioning does
not prove movement or a valid gait cycle. Do not infer unseen limb correctness.
This trial changes both the input workflow and video model (LTX to PixVerse),
as well as duration and resolution; any improvement cannot be attributed solely
to removing rig guidance. Retain native results and reject bad gait explicitly.

## Native Result

- Request ID: `01a0c88d-3731-74b3-bf4c-dc9e33a0b85a`.
- Status: `complete`; exactly one submission. Subsequent calls collected only
  this saved request, without paid resubmission.
- Submitted 2026-09-22T09:58:13.032Z; collection completed at
  09:59:10.979Z. The 57.947-second interval includes queue, polling and download,
  not isolated inference time.
- Output: `/Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922/book-only-walk-pixverse-v01.mp4`.
- Same-basename JSON and Markdown preserve the submitted prompt, settings,
  input URLs, source hash, UTC events and output metadata.
- Delivered: H.264, 1280 x 720, 24 fps, 25 frames, 1.041667 seconds, no audio;
  625,420 bytes. Requested one second is not the exact container duration.
- Output SHA-256: `2c6e29180b44527752d6317addc6dd8c97155f4d4871975947670fd631a85c9c`.
- Unchanged RGBA input SHA-256:
  `c49afbdfa934f1cf7f4fb193e975861f518a5e6954b3dc97f55e29b4dc7e30d4`.
  Rehash after collection matched the submitted source hash. First/end URLs
  match exactly; no flattening or alpha edits occurred.
- $0.045 remains a request estimate, not verified billing. No successful-gait,
  seam or alpha-preservation claim follows from successful generation.

## Frame Review

The lead reviewed all 25 native frames in `book-only-native-frames-v01.png`;
the bounded audit is `book-only-native-frames-v01.compact.md` beside the video.
This lane also inspected that sheet. Fore- and hind-leg positions change more
like walking than the previous gesture clips, but occlusion, overlap and ground
smearing prevent tracking every distinct paw reliably. A coordinated four-leg
cycle and a seamless endpoint are not certified. The full character fits the
frame; roughly similar endpoint poses do not establish exact closure.

The requested **plain white background failed**: native content is black behind
the character, with colored red/yellow-green fringes and grey/dark smearing near
the paws. White padding in the contact sheet is not the native background.
Interpretation of the transparent input by the provider is a possible cause,
not an established diagnosis or proof that alpha alone caused the artifacts.
The original RGBA input remains unchanged; no flattening, color cleanup,
alpha repair, paid retry, or new model request was performed.

The book-only still and its provenance have a separate supplemental manifest,
`tools/assets/book-only-sprite-reference-preservation.json`; the historical
rig-trial preservation manifest and receipts remain frozen. The supplemental
selection contains only the two reference files, not this new video output.

Supplemental reference preservation completed on the mini: **2 files,
1,205,735 bytes**, upload verification plus a fresh anonymous full-download
SHA-256 pass. Sources were rehashed unchanged afterward. Manifest SHA-256:
`0f03e4aa29ddcd15f0e7b3473ffb53d3682eb3c0d0540691369624a6bf42d225`.
Receipts are under
`/Volumes/TB4/mac-mini-storage/shared/pinpin-book-only-reference-archive-20260922/verified-v2/`:

- `upload-receipt.json`: `6cf26a91533f8354c4aed334d04fd62d18d7c03da3246dc5bca469e523c1d445`.
- `anonymous-receipt.json`: `9038a1ed7a3992a2b078e7e82db0a3b93c2cfd45b930b49a843e8fabd1367901`.
- `complete.json` records manifest/receipt hashes and both verification flags.

The first archival preflight stopped before upload because another lane updated
the reference Markdown to record the authorized video submission. The final
supplemental manifest preserves that updated record; the still itself did not
change. This was a storage preflight correction, not a video-generation retry.

## Video and Audit Preservation

The final video/audit supplement is separately frozen in
`tools/assets/book-only-video-trial-preservation.json`: **5 files, 1,462,738
bytes**. It contains the native MP4, JSON/Markdown request sidecars, all-25-frame
contact PNG and final `.compact.md` audit. No review HTML/assets, screenshot
duplicates, caches or additional generation are included. Combined with the
reference supplement, **7 essential files, 2,668,473 bytes** are preserved.

All five objects passed upload verification and independent fresh anonymous
download/SHA-256 verification on the mini. Sources were rehashed unchanged.
Manifest SHA-256:
`d80cb1f96dbac44244033b0c0cfd565c35d781711445b09ca6283dc0f8751ed6`.
Receipts:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-book-only-video-archive-20260922/verified-v1/`.

- `upload-receipt.json`: `c20fb9d40cd037e1dd9583fceb15c59ee0abb5de948ea7da0b32e378189a73ab`.
- `anonymous-receipt.json`: `a0ad14ceadc690c04fbd4324b11ded01feb6720d014f71aac4045b6d56ef6889`.
- `complete.json` records final counts, hashes and verification flags.

The previous two-file reference manifest/receipts and 34-file historical rig
manifest/receipts remain unchanged. Restore each supplemental manifest with
`tools/assets/hf_store.py pull --profile archive` into the same external trial
root, supplying that manifest, root, external cache and a distinct receipt path.
Storage verification is not gait approval. Both transfer processes exited
successfully; no archive job or paid generation remains running.
