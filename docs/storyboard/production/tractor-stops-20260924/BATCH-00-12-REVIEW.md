# B lane: eight completed source-locked stops

Current completion: **00–05 except 04, plus 10–12** — eight source-anchored panorama/cube exports are registered, all `sourceLockStatus: experimental`. Stops 06–09 were reassigned to the UI/production lane. This lane reports 35 image calls in its final handoff; exact per-call prompts, inputs, outputs and hashes remain in the stop directories. No further image calls are pending.

The current `selected.json` and linked per-stop source-lock review are authoritative. Every selected stop has a generated background, unchanged decoded source frame, canonical camera, source-locked sphere, actual cube atlas and six faces. Runtime overlays the source once on the background; downloaded cubes derive from the separate baked source-locked sphere.

Original source motion blur is intentionally preserved and refinement is deferred by Miguel. This does not hide geometry defects: 00 retains clear side/lower scenery cuts; 03 and 05 retain vegetation/ground/tree or sky joins; 10–12 retain lower-ground, shadow or tonal transitions.01/02 showed substantially better sampled boundaries, with local foliage/ground detail and sharpness changes still disclosed. These are experimental review candidates, not seamless measured reconstructions. Per-stop review links and the complete 24-stop state are in [ALL-24-REVIEW.md](ALL-24-REVIEW.md).

No generated bridge is used in source-lock mode. The old bridge failures and panorama attempts remain preserved. No official publication was performed by this lane.

## Historical initial pilot checkpoint

The following earlier hold report is retained as history. Its pending/hold statements describe the initial stop 00 trial and do not override the completed descriptors above.

# Stops 00–12 artwork lane

This lane owns stops 00–12 except the existing selected stop 04. The other production lane owns 13–23; shared UI, bridge generation and archival work remain separate.

Current state: **held after stop 00** at the coordinator's instruction to reconsider exact tractor preservation during bridges. Five new image calls produced stop 00's two panorama attempts and three registered repairs. No new art call was made for 01–03 or 05–12. All originals remain unchanged.

Stop 00's first raw-first recipe enlarged the machine and was rejected after perspective review. The revised guide-first, gray-region-outpainting recipe improved the full-machine framing and was approved for the next production trial before the later hold. See [stop 00 review](stops/stop-00/review.md) for measured fit, call history, actual export and remaining source-identity caveats. There is no final stop descriptor available for automatic bridge submission yet.

Exact raw video frames remain the sole camera, machinery, material and light authority. The deterministic guide uses authored vertical FOV 65°, 16:9 aspect, yaw/pitch zero. The successful assembled V4+rear panorama supplies spherical continuity/quality context, not a replacement vehicle angle. No restoration image was used in these new sphere calls. Prior 45° guides are retained but superseded for this experiment.

New 65° raw guides were generated on the mini for all twelve assigned stops, with input hashes and roundtrip metadata. Creating a guide is preparation only; it does not make a panorama ready. Heavy masters, projections, six-face exports and review captures remain under the matching mini SSD pack. Source prompts and provenance are regular text; media are working links. No commit, UI edit or additional video generation was performed by this artwork lane.
