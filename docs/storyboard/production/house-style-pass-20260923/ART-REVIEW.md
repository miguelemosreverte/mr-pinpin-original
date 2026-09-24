# One-shot book-style appearance review

Status: **reviewed appearance proposal with remaining issues**. The single requested pass improves the room's craftsmanship and light. It is useful as a before/reference/after comparison, not a seamless or geometry-approved replacement. No second image call was made.

## Appearance

The new timber has rounder edges, more expressive joints and less uniform grain. The stove reads more like crafted iron; windows, green leaves and frames have warmer dimensional detail. Stronger but soft daylight breaks up the uniform orange plaster treatment. The obvious vertical facet bands are less conspicuous, although the original wall profile is not wholly eliminated. This is closer to the actual book reference's visual character; it is not an exact match or an approval of new canon.

The model introduced a continuous timber cornice, brackets, posts and thicker frame treatments. These are visible painted extrusions absent from the canonical Blender scene. They must not be described as existing modeled geometry or as proof of a better mesh. Adjacent bathroom/bedroom artwork was not restyled in this experiment.

## Actual viewer inspection

The original panorama, actual book still, matched doorway-outline comparison, six saved view presets and all twelve before/after cube-edge pairs were inspected. Edge pairs were compared in contact sheets made from the actual browser captures; doors, stove, entry, table and pole views were also inspected directly. This is a bounded visual check, not a pixel-perfect registration metric.

- Main aperture locations, room connections and furniture placement remain broadly recognizable. The front door is still closed and both internal doors remain open. Door outlines are close, but the new frame and leaf silhouettes drift slightly; exact opening fidelity is not established.
- Table, stools and broad floor contours remain continuous at the sampled face joins. No extra room opening, character or freestanding furniture was observed in these views.
- The **rear longitude wrap** cuts through the new cornice/post, leaving a visible narrow vertical trim discontinuity. It is clearest in `edge-back-up-after.png`; a subtle wall line is also visible near the entry view. Mathematical cubemap-edge agreement does not remove this painted mismatch.
- The **zenith** has slight radial texture pinching (`1600-up-after.png`). The nadir floor is broadly coherent, with spherical texture stretching and the expected off-center table/stool fragments.
- The image remains limited by its actual 1774×887 source; 512-pixel cube projection does not create more painted detail.

## Evidence and identities

Exact prompt and two ordered inputs are in [generation-job.json](generation-job.json). Root's [generation-result.json](generation-result.json) records the actual call. The original output is 1774×887, SHA-256 `5c9f0fd1bc30f2566fc4790f901b1fe3093fca5f69707c354598a056578f5a48`. Requested size was 2048×1024.

The deterministic 1536×1024 runtime WebP has SHA-256 `dc667fcfca597b927da9e57cb725514cf5f4f422b782e65499324fa1ae62bb7a`; conversion evidence is [projection-v1.json](projection-v1.json). Before-view WebP SHA is `147ce0ce9b0cb750a72da122deb555efc9624ffac5abaa5c0625afce1a5dbca4`.

All browser evidence remains under `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-style-pass-20260923/browser-check/`, with pinned identities in `inputs.json`. Edge directions checked: front-right, front-left, back-right, back-left, front-up, down-front, back-up, back-down, right-up, down-right, left-up, down-left. The original tour artwork and canonical Blender geometry remain unchanged.
