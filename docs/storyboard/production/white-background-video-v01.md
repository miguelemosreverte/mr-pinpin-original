# White-Background Video Trial

2026-09-23. **One authorized request completed and collected.** Parfit's
read-only white/opacity check passed. One PixVerse request only; no automatic
retry, upscale or fallback model. Not production artwork.

## Settings and Budget

[Config](white-background-video-v01.json): `fal-ai/pixverse/v6/transition`,
one second, 720p, 16:9, audio off, multi-clip off, prompt optimization disabled.
The complete `input` object, including the exact prompt, is unchanged from
[the preceding book-only trial](book-only-video-pixverse-v01.json).
The same new still was supplied as `first_image_url` and `end_image_url`:
a same-view loop request, not an angle transition.

[Official tier pricing](https://fal.ai/models/fal-ai/pixverse/v6/transition)
checked 2026-09-23 remains $0.045/second at 720p without audio. The one-request
estimate is **$0.045**, below the **$0.10 authorization ceiling**; no actual
charge is yet verified. The generic pricing API base rate is not this tier.
SDK/credential availability was checked without exposing credentials; a read-only
authenticated pricing request returned HTTP 200. All ten focused runner tests
passed, and a deep comparison confirmed the exact prior prompt/settings. The
existing runner is reused unchanged.

## Input Gate

External root:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/`.
The supplied input is `white-reference-v01.png`, with adjacent Markdown edit
provenance, copied verbatim into [white-reference-v01.md](white-reference-v01.md).
The authorized output is `white-walk-pixverse-v01.mp4`. The
read-only white/opacity check passed before submission. The edit originates only from the book-only reference,
not a rig, guide, or old rig-derived appearance anchor. This lane does not edit
the supplied image. Preserve the original, verification and exact input hash.

`white-reference-opacity.json` records 1672 x 941, native RGB24, 1,430,911 bytes,
all 1,573,352 decoded alpha values equal to 255, and zero partially/fully
transparent pixels. Every channel in the 16px border is 253..255; every border
and corner pixel satisfies the opaque near-white threshold (RGB >=250). This
is genuinely opaque near-white content, not uniformly exact RGB 255 white.
The file's SHA-256 matched the audit immediately before upload:
`49a7d64954735a18aa1be03b5e0b9e27728627514e74de717d9621655e0f1098`.

Request ID: `01a0cfbe-6dd7-7030-965f-6da1e87387ad`. Submitted once with the
existing runner. Subsequent status/collection calls reference that saved ID;
no second generation submission is authorized.

## Collected Result

- Native output: `white-walk-pixverse-v01.mp4` in the external root above,
  with same-basename JSON/Markdown exact request records.
- Submitted 2026-09-23T19:29:18.790Z; collected at 19:30:35.684Z. The
  76.894-second interval includes queue, polling and download, not just inference.
- H.264, 1280 x 720, 24 fps, 25 frames, 1.041667 seconds, no audio;
  581,514 bytes. One-second request does not mean an exact one-second container.
- SHA-256: `7ca187118f003e7b0d7ace3a16fa5f0bc03eead0115c4adee1f0428c92495877`.
- Input hash rechecked unchanged after collection; submitted first/end URLs
  are identical. Exactly one generation submission, no retries or upscale.
- $0.045 remains estimated rather than verified billing.

## Review and Preservation

Compare native background and paw-edge fringes with the previous transparent
input trial, while also reviewing gait, face, full-body framing and loop closure.
Opacity does not guarantee a white output or repair anatomy. The image edit may
change appearance; it is not a pixel-identical alpha-only intervention. Sampling
is not controlled by a fixed seed, so improvement
would not establish alpha as the sole cause of the prior failure.

Parfit's final `white-native-frames-v01.compact.md` reviews all 25 native frames
in `white-native-frames-v01.png` (5x5, 256px cells with white padding). Native
background stays white/light, and the previous obvious colored paw fringes are
not apparent at that review scale; this is not a full-resolution zero-defect
claim. Full body and quills remain framed. Midclip heading drift and blinking
remain visible. Occluded paws prevent a reliable four-limb contact trace;
exact coordinated gait count, fixed heading and seamless velocity closure are
not certified. Similar endpoint poses do not establish identical end frames.

The separate [preservation manifest](../../../tools/assets/white-background-video-preservation.json)
freezes ten files, 2,869,713 bytes: input PNG/Markdown, baseline/new opacity JSON,
native MP4/JSON/Markdown, final contact PNG/Markdown and still-audit `report.md`.
The latter retains its original pre-video chronology; the contact audit is the
final video review. No review copies, HTML, screenshots, or old book-reference
duplicates were archived. Earlier manifests and receipts are unchanged.

Manifest SHA-256:
`64486df8e617a3845f344ab01f66deaa5ba80c3c2ce88c11354fb28d80716f8a`.
All ten new objects were uploaded to public bucket
`miguelemosreverte/mr-pinpin-archive` with the existing `hf_store.py` on the mini,
fresh-download verified on upload, then independently fresh-download verified
with `HfApi(token=False)`. All byte counts/hashes passed; post-verification source
hashes are unchanged. The Git image-edit provenance copy also matches verbatim.

Receipts under external shared root
`pinpin-white-background-archive-20260923/verified-v1/`:

- `upload-receipt.json` SHA-256:
  `d10c9872d93d01288f3eb25ea9e95e8cfb6a6e425bdcc6eaed4b399fa0aa209d`.
- `anonymous-receipt.json` SHA-256:
  `1f7c60d2e07bec38cbef27427d7f2d131f3bf2fa2e5fc961291ef71212d0ada6`.
- `complete.json` records successful verification and unchanged sources.

The previous input is independently preserved by
[book-only-sprite-reference-preservation.json](../../../tools/assets/book-only-sprite-reference-preservation.json),
and its native video by
[book-only-video-trial-preservation.json](../../../tools/assets/book-only-video-trial-preservation.json).
No runtime, global asset catalog, house/home files or other agents' work was
changed by this lane. Exactly one paid video request; no further generation.
