# Single existing panorama anchor

The selected anchor is recorded in `anchor.json`: the previously reviewed tractor panorama and its rear/up/down repairs. Time zero is an approximate orbit stopping point, not proof that the old panorama shares that camera. The UI should disclose its scale/viewpoint change.

Before the scope correction, this lane extracted four original decoded video frames: front at 0 s / frame 0, near at 4 s / frame 96, rear at 7 s / frame 168, and far at 8.5 s / frame 204. Each 1280×720 PNG and its adjacent record remains unchanged on the mini SSD; `frames.json` pins the source video and output identities. These are provenance-only preparation, not generated panoramas or enabled stops.

This lane made **zero new image-generation calls and zero video requests**. Reference inspection and ordinary local copies occurred before the correction; no new panorama prompt or image-model output was produced here. Any other lane’s interrupted work is reported separately by that lane.

Media stay at `/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-explore-20260924/`. The local source uses individual links; the mini preview mirrors this pack directly and reuses the existing story-worlds pack. No new geometry, cube export, or replacement of existing artwork is necessary for the one-anchor experiment.
