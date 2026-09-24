# Bath overlap: browser verification

The screenshot defect was reproduced at yaw1.9rad, pitch−0.5rad, vertical FOV72°, stage1352×720. Per-layer browser interception identified the down-v3 repair as the cause of the mismatched tub band/wood and duplicate rug. Removing only down restored the tub; removing front/rear did not. Original configuration, four runtime image hashes and15 isolation views are retained externally.

Two mask prototypes were inspected. The wider down-local x fade0.1→0.3 still crossed the rug weave. The selected0→0.08 fade ends before the tub/rug and keeps the corrected central/left floor and door-fragment cleanup. This is a bath-only optional renderer parameter; missing/invalid mask configuration remains disabled.

## Actual selected-module verification

- The final renderer/configuration produces byte-identical RGBA framebuffer hashes to the successful intercepted prototype at the tub, near-nadir floor and lower doorway cameras.
- Common room and bedroom each produce byte-identical old/new RGBA framebuffer hashes at two camera poses, including their downward repair. The disabled option preserves their output.
- Actual mobile390×844 loads the selected bath view and its common-room door works with a native CDP touch tap after keyboard reveal.
- Final tub/floor screenshots are the actual selected module, not the temporary intercepted prototype. The original tub band and wood are continuous and the broad doubled rug silhouette is removed. The base rug retains its own perspective curvature; no metric-geometry claim is made.
- No generated image or repair texture was modified, and no new image call was used.

Evidence: /Volumes/TB4/mac-mini-storage/shared/pinpin-house-image-tour-20260924/bath-overlap-check/. Frozen baseline-config.js/baseline-renderer.js, baseline.json, DIAGNOSIS.md, and final-proof/results.json hold the comparisons. The report's four screenshots map to final-proof/{before,after}-bath-{0,1}.png.

Scoped source changes: optional downMaskX in home-panorama-gl.js; bath-only house-image-tour-config.js opt-in; tour evidence link; house-bath-join.html/.css and this report. No Git/publishing or other room art changes.

The before/after report also passed at1400px and390px: all four images and source links load, with no horizontal overflow. Desktop mouse activation of the revealed bath→common door passed. Evidence final-proof/report-check.json and report-{1400,390}.png. The corrected user-camera view was opened in Chrome.
