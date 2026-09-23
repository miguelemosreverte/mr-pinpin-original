# White-video endpoint audit

2026-09-23. Review evidence only, not production approval. No image edits,
retiming, endpoint replacement, or paid calls were performed by this audit.

The provider record confirms identical first/end image URLs and a matching
source hash. Native frames 0 and 24 (t=0 and t=1 second) are not pixel-identical.
The enlarged comparison shows broadly similar stance with paw, fur/quill and
shadow-detail differences: approximate pose closure, not an exact endpoint lock.

| Same-coordinate native RGB comparison | MAE, 0..255 |
| --- | --- |
| Entire 1280x720 frame | 3.750314 |
| Foreground bounding-box ROI | 7.291061 |
| Foreground union mask | 9.292345 |
| Near-white background mask | 0.970142 |

Foreground is the union of pixels with any RGB channel below 245 in either
endpoint. Bounding box: x=232..1010, y=86..609 inclusive. This includes shadows,
not anatomical segmentation. Near-white background occupies 66.59% of pixels,
diluting the whole-frame score. MAE combines any generation differences with
lossy H.264 effects; their contributions cannot be separated here. No resized,
registered, warped, or background-corrected comparison was substituted.

`metrics.json` is a byte-identical copy of the external audit metrics. Its
relative artifact/evidence paths refer to the external audit directory, NOT
this source directory. It records native and decoded hashes, ROI definition,
provider evidence and all artifact sizes/hashes.

## External evidence

- [First decoded PNG](/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/endpoint-audit-v01/first-native-frame000.png)
- [Last decoded PNG](/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/endpoint-audit-v01/last-native-frame024.png)
- [Unscaled first/last comparison](/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/endpoint-audit-v01/first-last-native.png)
- [Original MP4](/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/white-walk-pixverse-v01.mp4)
- [Provider record](/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/white-walk-pixverse-v01.json)
- [Full external audit](/Volumes/TB4/mac-mini-storage/shared/pinpin-white-background-trial-20260923/endpoint-audit-v01/report.md)

Replacing a final frame with the first in a new derivative could impose matching
pixels, but would not establish model compliance, matching motion velocity,
correct gait, or a seamless playback boundary. No such change was made.

## Archive handoff

Main has reviewed the report and comparison. Pauli should preserve the complete
new `endpoint-audit-v01/` directory: three PNGs, `metrics.json`, and `report.md`.
Native/source/provider records already belong to the white trial; do not replace
or rewrite them. Verify archived hashes against the metrics and record the HF
receipt before claiming archive completion. Existing manifests/receipts are owned
by the storage lane and were not edited here. HF upload status is pending that
lane's confirmation, not implied by these source notes.

Direct peer-send is unavailable in this lane; main relays this scoped handoff
to Pauli. Only this README and metrics copy were added to source. All external
audit assets and unrelated worktree edits remain untouched.
