# Common-room style-pass browser review

Review route: `/house-style-review.html`. This is a separate candidate comparison. The current connected-tour texture and house geometry remain unchanged.

The page shows the current room, the actual published Arrival 05 style reference, and the new candidate. Both room canvases use the same cubemap renderer and synchronized yaw, pitch and vertical field of view. Either canvas accepts drag, pinch, wheel and keyboard control. Presets cover the two internal doors, stove/bookcase, front entry/window, table, ceiling and floor. Mobile stacks the paired views at matching dimensions. The book reference is explicitly an appearance reference, not a matched camera or geometry source.

Optional doorway outlines project the same actual world-space openings into both canvases. They were not recalibrated to fit the generated candidate. Original panorama/cube links, the exact prompt, ordered input explanation, generation record and deterministic conversion record are available directly in the page. The earlier visual benchmark link uses the existing complete repaired-panorama viewer.

## Functional checks

Desktop 1600×1100 and mobile 390×844 passed:

- Identical yaw/pitch/FOV in both views through all six presets, native pointer drag, actual mobile two-finger pinch, keyboard and Reset.
- Measured doorway contours render in both views; no document overflow or JavaScript errors.
- Exact displayed prompt matches its recorded SHA-256.
- All linked original images, prompt and provenance/navigation records respond successfully.

Evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-style-pass-20260923/browser-check/`. `results.json` records the UI checks; `inputs.json` pins the two runtime textures. Paired captures include six presets and all twelve cube-edge-center directions. `1600-doors-comparison.png` and `390-doors-comparison.png` show the complete before/reference/after arrangement.

## Visual findings

The candidate gives the furniture more rounded edges, visible joints and richer grain, with more varied daylight. It reduces the flat blockout appearance. The table, stove/bookcase, front entry and two internal openings remain recognizable in the same directions.

The measured opening outlines remain close to the painted doorways, but the candidate changes frame/leaf contours slightly. It also adds conspicuous timber posts and a continuous cornice that are absent from the original geometry. This is therefore an appearance proposal, not proof of identical silhouettes or new modeled timber structure. The gray model was not supplied to this generation call; camera and placement were carried forward from the existing illustrated panorama.

The independent art review inspected all twelve edge pairs and found a rear-wrap cornice/post discontinuity (`edge-back-up`) plus slight radial pinching at the ceiling pole. These remain visible limitations of this one-shot candidate. See `ART-REVIEW.md` for the complete assessment. Browser synchronization and deterministic cube conversion do not prove seamless artwork or geometry fidelity.

No publishing or Git actions were performed. UI ownership: `docs/house-style-review.html`, `docs/house-style-review.css`, `docs/house-style-review.js` and this report.
