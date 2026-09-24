# Connected house tour review

Local preview: `/house-tour.html`. The workshop links prominently to it. This is a review proposal, not a published chapter or a continuously walkable 3D scene.

## Working interaction

Three fixed camera nodes use actual common-room, bathroom and bedroom cubemaps. Only the two physical internal doors create transitions: common ↔ bathroom and common ↔ bedroom. Door contours and target positions come from `geometry/portals.json`; that manifest records the actual open-leaf geometry and 36 clear visibility rays. No bathroom–bedroom shortcut is offered.

The default view is illustrated. Geometry is an explicit toggle, with the same room and viewing direction. Pointer dragging does not activate a doorway; tapping or keyboard Enter does. Keyboard focus reveals an offscreen doorway. Each transition sets an inward-facing arrival view, updates the URL and preserves browser Back/Forward. Other room images preload. The short transition fade is disabled for reduced motion. This is a node transition, not simulated free walking or a claim of translated illustration consistency.

## Earlier visual benchmark restored

`/location-workshop.html?room=benchmark` now uses the original repaired panorama renderer: `room-panorama-v3.webp` plus all four front/rear/up/down repair images, 110° repair projection and the original front mask. The inferior unified six-face experiment is no longer presented as the best prior result. Front, rear, ceiling and floor were visually checked. Switching back to a geometry cubemap also works. The earlier panorama remains clearly labelled as different house geometry and a visual target, not the current floor-plan authority.

## Verification completed

The actual gray tour passed at 1440×1000, 390×844 and 320×568: all four directed doorway routes, native mouse/touch activation, drag suppression starting on a doorway, off-camera target exclusion, keyboard reveal/Enter, URL and Back/Forward, no document overflow and no JavaScript errors. Door outlines were inspected against the actual rendered openings. Native two-finger pinch, a complete yaw turn, 40–95° field-of-view limits and Reset also passed. Missing illustrated assets produce an explicit fallback; switching to Geometry recovers. WebGL context restoration, reduced motion and landscape rotation passed without overflow.

External evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/review-check/`. `gray-results.json` records the route checks; gray doorway screenshots show registration. `benchmark-*.png` captures the restored repaired panorama.

## Illustrated review result

The first illustrated cubes did not pass seam review. The pinned `art-v1` bedroom and `art-v2` common/bath captures include six face centers and all twelve edge-center directions, paired with gray geometry and input hashes. Common V2 has a visible side-boundary material discontinuity; bathroom V2 splits the circular window across that boundary. Further table/floor joins were also rejected by the art review. These are image consistency defects, not evidence that continuous gray geometry is discontinuous.

The selected three rooms were instead repaired as continuous spherical images and deterministically converted back to the same cubemap convention. The `continuous-v1` capture set pins the exact six gray/art source files and hashes, then captures six face centers and all twelve edge-center directions for each room. These views show a substantial improvement: the common-room table and floor, bathroom window/tub/mat and bedroom bed/floor now read continuously across the former broad splits. The images are softer than the separately generated tiles. A faint common-room wall-material band and a narrow bedroom ceiling discontinuity remain. The independent art review inspected all 36 edge views and 18 face centers against gray: it also notes adjusted furniture/trim silhouettes and bathroom timber cornice/posts absent from the common-room/gray treatment. Cross-room finish consistency is approximate. This is an improved local review proposal, not strict geometry approval or a claim of mathematically seamless artwork. See `ART-REVIEW.md` for the complete visual matrix.

The final illustrated tour passed the same complete four-door route suite at 1440×1000, 390×844 and 320×568. Actual painted-door screenshots confirm useful registration with the measured arches; the contours were not moved to disguise image drift. Native tap/click, drag suppression, keyboard reveal/Enter and browser history all passed. `illustrated-results.json` records those checks.

No live home page or published chapter was changed. The current review is ready to explore at `/house-tour.html`, with the earlier repaired benchmark one link away.

### Selected runtime image hashes

- common/cube-atlas.webp: `147ce0ce9b0cb750a72da122deb555efc9624ffac5abaa5c0625afce1a5dbca4`
- bath/cube-atlas.webp: `5b6cf2e4f5e6a143b7df075cb9c91879c7cbd9dcd4c50ca06774cba3ba00cddc`
- bedroom/cube-atlas.webp: `8b2f02e453488dbed10b488d8a8deadbe500faa6755782ea605e8fc6eb854ef4`
