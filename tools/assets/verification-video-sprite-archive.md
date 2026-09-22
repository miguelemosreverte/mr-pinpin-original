# Video Sprite Trial Archive

Status, 2026-09-22: **complete. All 34 files uploaded/present and freshly
verified, including an independent anonymous full-download checksum pass.**
The lead confirmed Parfit's final diagnostics stable and authorized preservation;
Dewey was told not to duplicate upload. The diagnostics retain their historical
`archive_ready: false` value, without rewriting another lane's evidence. Explicit
storage authorization does not approve the gait or production use.

## Selection

Source root:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-trial-20260922/`.

Final core: **34 files, 21,824,597 bytes**, all archive role.
Manifest: `tools/assets/video-sprite-study-preservation.json`.
Manifest SHA-256:
`6a8cbed769045de23232e2659c34d1a148f322c377689a75fcb269bdd4339980`.

- Two native MP4s and their JSON/Markdown request sidecars.
- Original appearance pair PNG and prompt/provenance Markdown, both lossless
  cropped PNG anchors, and `appearance-crop-verification.json`.
- All five guide PNG/JSON/Blender files in `anchors-v01/`.
- Six source/test/documentation files currently in external `scripts/`.
- Eight diagnostic PNG/MP4 derivatives, `video-derivatives-manifest.json`, and
  final `visual-review.md` from `diagnostics-v01/`.
- Both supplied original book copies: `input-book-face-scene17.png` and
  `input-book-body-scene10-v2.png`, explicitly added to the authorized selection.

Excluded: review-native versions and copied review assets, review manifests,
screenshots, duplicate provider contact sheets, caches and `.pyc` files.
This preserves a rejected gait experiment, not approved production animation.
The user subsequently rejected the rig-input workflow; this archive is retained history, not authorization to continue that workflow or make further paid video calls.
The copied book references retain their original byte identities. The adapter's
object keys include basename as well as hash, so these differently named copies
receive distinct keys from historical originals. Storage-level deduplication is
not measured or claimed.

## Prepared Procedure

External job directory:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-archive-20260922/`.

`hf_store.py` is a copy of the existing repository adapter. `upload.py` requires
explicit diagnostics-stable authorization and the frozen manifest hash, validates every source
size/hash, uploads content-addressed objects, then freshly verifies each object.
It makes a separate anonymous full-download verification pass using
`HfApi(token=False)` and checks every source hash again afterward.

The mini ran the transfers with its existing HF authentication and the
external SSD cache. Adapter and SDK import checks passed. A bounded scan of 13
initial text records and all 15 final selected text records found no token-like
secrets or credential/query URLs;
the existing runner's unsigned provider result URLs are retained as provenance.
Both copied book-reference SHA-256 hashes match their original source images.

The final manifest is `tools/assets/video-sprite-study-preservation.json`,
with paths relative to the external trial root, bucket
`miguelemosreverte/mr-pinpin-archive`, and archive role only. No production catalog
or runtime changes are part of this work.

Upload started after the adapter validated all 34 local source sizes/hashes.
There were 32 new object uploads and two already-present matching objects;
all 34 were freshly verified in both passes. Final source rehash passed for every
entry. The transfer process exited successfully; no job remains running.

## Receipts and Restore

Receipt directory:
`/Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-archive-20260922/verified-v1/`.

- `upload-receipt.json` SHA-256:
  `b726b15b6f9ff77e1830d35371893e4102ae0983e20111c2c503d3059d0f0d73`.
- `anonymous-receipt.json` SHA-256:
  `f10c58babb15328e86de383c83794eb82098b389e84755f0473f05951a04055f`.
- `complete.json` records 34 files, 21,824,597 bytes, manifest/receipt hashes,
  `anonymous_verified: true`, and `source_unchanged: true`.

Reproduction command used on mini:

```sh
/opt/homebrew/bin/python3 -B \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-archive-20260922/upload.py \
  --diagnostics-stable \
  --manifest /Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-archive-20260922/preservation-manifest.json \
  --expected-manifest-sha 6a8cbed769045de23232e2659c34d1a148f322c377689a75fcb269bdd4339980 \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-archive-20260922/verified-v1
```

That receipt directory already exists and is not reusable for a new run. Restore
from the source checkout into a new external directory using the existing adapter:

```sh
env -u HF_TOKEN -u HUGGING_FACE_HUB_TOKEN \
  HF_HUB_DISABLE_IMPLICIT_TOKEN=1 HF_HUB_DISABLE_PROGRESS_BARS=1 \
  /opt/homebrew/bin/python3 tools/assets/hf_store.py pull \
  --manifest tools/assets/video-sprite-study-preservation.json --profile archive \
  --root /Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-restored \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache \
  --receipt /Volumes/TB4/mac-mini-storage/shared/pinpin-video-sprite-restore-receipt.json
```

This recreates the trial-relative layout, not a production site. No asset
deletion, Git index/history write, generation call or paid-video retry was performed.
Mission Control CLI was unavailable; the lead lane was asked to relay the
stability request to Parfit and exclusive upload ownership to Dewey.
