# Native panorama browser review

Route: `/house-native-panorama.html?preset=entry`. The report shows the actual native Blender panorama and published Arrival 05 illustration as the two inputs, the single generated panorama as output, and the exact prompt/input record. No earlier generated room is presented as an input.

The interactive row compares the native guide using the spherical renderer with the generated result using the deterministic cubemap renderer. Both use identical yaw, pitch and vertical field of view. The book reference stays alongside them. Optional outlines use the actual common-room openings at unchanged origin `[-1.3, -1.3, 1.15]`; no yaw correction or painted-contour recalibration was applied.

This is a fresh experiment, not a causal controlled test: the input projection, prompt and generation differ from previous trials. Links connect it to the original process and previous appearance experiment. The existing connected tour remains unchanged.

## Browser checks

Desktop 1600×1100 and mobile 390×844 passed:

- All input/output/reference images loaded; source-file and navigation links responded successfully.
- Six presets keep both cameras synchronized. Native desktop drag/keyboard and actual mobile drag/two-finger pinch passed, as did Reset.
- The displayed prompt matches the generation job's exact SHA-256.
- Measured opening outlines render in both views, without document overflow or JavaScript errors.

Evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-20260923/browser-check/`. `results.json` records checks; `inputs.json` pins the native guide and candidate cube. Paired captures cover six presets and twelve edge-center directions. `1600-inputs-output.png` shows actual inputs/output; `1600-doors-comparison.png` shows registered openings and the reference.

## Visual outcome

The result draws richer craftsmanship, plants, decoration and warm light from the book. It also changes the scene: the stove becomes a flower barrel and the bathroom glimpse becomes another bedroom. Opening directions remain identifiable, but painted trim/leaf silhouettes and adjacent-room contents do not faithfully preserve the guide.

A large hard vertical wrap join cuts plaster and foliage beside the front door. The floor pole collapses the rug and leaves into radial streaks; the ceiling also pinches its beams. These failures are visible in the report's main review note and exposed by entry/up/down presets. Successful camera synchronization and deterministic conversion do not establish seamless artwork.

This is a useful documented single-call experiment, unsuitable as a continuity-correct, seamless replacement for the tour. This UI task performed no extra generation or repair. The independent `ART-REVIEW.md` supplies the full visual assessment.

Owned files: `docs/house-native-panorama.html`, `.css`, `.js`, this report, and small navigation links in `house-process.html` and `house-style-review.html`. No Git or publishing actions.

## Full-window cubemap demo

`/house-native-demo.html` displays only the resulting cubemap across the full viewport, with compact Report, Reset and Fullscreen controls. Entry-facing start; native drag, pinch/wheel and keyboard look controls. A prominent link in the report opens it.

Bounded checks passed at 1440×900 and 390×844: active GPU rendering, exact viewport coverage without scrolling, desktop drag/keyboard/fullscreen entry and exit, actual mobile drag/pinch, Reset and the report link. Screenshots `demo-1440.png` and `demo-390.png` were visually inspected; `demo-results.json` records the checks. This viewer uses the unchanged candidate texture and therefore exposes the same documented image defects.
