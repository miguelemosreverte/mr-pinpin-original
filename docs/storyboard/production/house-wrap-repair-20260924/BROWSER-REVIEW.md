# Wall-wrap repair browser review

Routes: `/house-wrap-repair.html` and `/house-native-demo.html?variant=wrap-repair`. The default demo still loads the original native-pass cube; an unrecognized variant also falls back to that explicit default.

The report shows the original panorama, ordinary perspective extraction, exact generic repair prompt, generated repair, analytic mask coverage, one composite panorama and its final cube. The cyan overlay is labelled as allowed blend coverage, not an actual pixel-difference image. Generation, compositing and cube-conversion records are linked. No new image generation or model change was performed by this UI task.

## Verification

Desktop 1600×1100 and mobile 390×844 passed the synchronized comparison checks: all images load, exact prompt SHA matches the job, local links work, native drag/pinch and keyboard keep both views aligned, six presets and Reset work, and there is no overflow or JavaScript error.

The full-window variant separately passed at 1440×900 and 390×844: active GPU, viewport coverage, native controls, Reset and fullscreen entry/exit. The default and unknown variant routes preserve the original texture and original report destination.

Evidence lives at `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/browser-check/`. It includes `results.json`, `demo-results.json`, six paired presets, additional yaw ±35° feather captures and latitude ±40°/±52° seam/feather captures. The main paired view is `1600-entry-comparison.png`; mobile is `390-entry-comparison.png`.

## Actual visual result

The hard central wall split is removed in the ordinary view and reintegrated panorama. Plaster, shelf, foliage and the door/window area read continuously through the central seam. The reviewed left and right feather regions do not show obvious doubled window or door edges. Sharpness remains broadly consistent at the normal viewing distance, without claiming pixel-identical local artwork.

The lower transition still meets the original stretched foliage/rug near the preserved floor pole. The upper region retains the original beam convergence toward the ceiling pole. These defects remain visible, are named in the report, and are not counted as repaired. The stove/flower-barrel and bathroom/bedroom identity errors also remain outside this task.

The opposite internal-door screenshots before/after are byte-identical, SHA-256 `f713052a538c2156980ccf6af5f173866f44aba25dc9e2e24b3a5326b2505e96`. The compositing record independently proves original panorama RGB outside its alpha support, opposite region and ≥55° polar caps is unchanged. This validates scope preservation, not whole-sphere image quality.

UI files: `docs/house-wrap-repair.html`, `.css`, `.js`; strict variant selection in `house-native-demo.js` and its report-link id; a navigation link in the native report. No live-tour texture, publication or Git change was made by this lane.

## Historical A/F comparison

The new `#history` section displays the actual selected A base plus four registered perspective repairs and F2 plus its rear repair through the original panorama shader. A is identified as the user's preferred visual benchmark, not a promotion to the current three-room geometry. The furnished-room style input is visible, with the decision-log timing linked. The frozen seven-asset configuration records original configuration hashes and avoids importing the unrelated untracked F study module.

Desktop 1600×1100 and mobile 390×844 passed active-GPU loading of every repair, synchronized yaw/pitch/FOV, native desktop drag and mobile CDP touch drag/pinch, keyboard, five presets/reset, zero overflow and no JavaScript errors. All historical image and provenance links load. The default native demo and explicit repaired demo retain their respective assets. Syntax and diff checks pass.

Evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/history-check/`; `results.json`, `links-demo.json`, paired entry/rear/ceiling/floor/rear-floor screenshots and exact-pole diagnostics. Normal inspection permits ±89°; separate direct shader draws inspect exactly ±90°. This is explicitly stricter than the original ±65° historical UI.

Visual inspection of actual selected layers shows A's repaired ceiling cross and woven rug remain coherent at the exact poles, with the previously recorded faint rear-floor join retained. F's room remains coherent but its rug texture converges radially at the floor center. Neither result is described as a flawless sphere. Independent detailed review is recorded in HISTORICAL-VISUAL-REVIEW.md. No historical texture or current repaired texture was modified.
