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

## Exact user-camera cache check

The reported active camera (yaw1.89000rad, pitch−0.72162rad, FOV75.96421°) renders a clean continuous tub in a fresh browser context. This supports a stale loaded module graph as the likely explanation for the old open tab, but that tab’s JavaScript state was not directly inspected: Chrome AppleScript JavaScript execution is disabled and was not enabled. No artwork or mask was changed during this follow-up.

The HTML entry script, panorama renderer import and room-config import now all request revision bath-join-2b04c95. A fresh request trace confirms all three versioned URLs; the active snapshot reports that revision and downMaskX [0,0.08]. The evidence panel also displays the loaded revision. The exact-camera versioned view was captured and opened in Chrome with a unique rev query. Proof is external at bath-overlap-check/exact-user/versioned-check.json and versioned-exact-camera.png; the initial fresh-context capture is retained alongside it.

## Steeper rug-edge follow-up

A fresh current-version view at yaw1.66785rad, pitch−1.10346rad, FOV90° reveals a remaining translucent rug extension beside the basket. The earlier tub checks did not cover this angle. Removing layers and restricting their masks exposed either the same join or the base floor pinch; those controls were diagnostic only and were not selected. The existing tub-safe down mask remains unchanged.

A separately registered perspective detail was generated from the assembled view centered at yaw3rad, pitch−0.95rad, FOV90°. The optional renderer extension mixes this detail after the existing repair stack, within a feathered rectangle. Before enabling any image, actual GPU tests confirmed six byte-identical old/new room framebuffers with the option disabled and nine mapping samples, including behind-camera rejection. Evidence: external rug-detail-check/renderer-results.json. The selected correction is rug-join-v1.png, registered at the exact target camera with mask [0.04,0.08,0.25,0.26]. Its sampled color is applied after the existing normalized repair stack.


Final actual-module checks pass at the reported user camera, registered target, both nearby rotations, prior tub camera, and near-nadir floor. The rug extension is gone and no new translucent rim is visible in these views. Mobile390×844 loads the correction and a native touch tap returns to the common room. No page errors occurred. This is a bounded visual correction, not a claim that every possible view is artifact-free.

Entry/config/renderer imports and the visible diagnostic revision now use bath-rug-detail-v1. The before/after report retains the original tub evidence and adds four new screenshots mapped to external rug-detail-check/{before,after}-{user,target}.png, exposed as rug-{user,target}-{before,after}.png. The generated image is linked with its exact prompt and provenance. Final camera/snapshot evidence is rug-detail-check/final-results.json.

The updated report passes at1400px and390px: all eight comparison images decode, all unique linked resources return200, and no horizontal overflow occurs. A fresh request trace confirms the three entry/config/renderer modules all request bath-rug-detail-v1. Evidence: rug-detail-check/report-results.json. Root opened the exact corrected user angle after reviewing the selected captures.

The focused GPU regression harness is retained as verify-detail.cjs. It compares against the frozen projection/runtime-panorama-gl-mask-v1.js and accepts PINPIN_BASE_URL plus optional external PINPIN_TEST_OUTPUT; Playwright must be resolvable through NODE_PATH.
