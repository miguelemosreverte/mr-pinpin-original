# Location workshop browser review

Local entry: http://127.0.0.1:8789/location-workshop.html

## Review surface

The standalone page uses location-workshop.html/css/js. It offers current common-room, bathroom and bedroom cubemaps, plus the clearly labeled legacy illustrated room as a style-only example of different geometry. Each current cube is the selected lossless WebP from the canonical examples directory; the flat atlas download and adjacent review-manifest link expose its actual source identity.

The common view starts toward the private-room doors. Bathroom and bedroom starting look directions turn toward the tub and bed, respectively; this rotates the viewer only and never translates the camera or alters a cube face. Reset and Home restore the selected room’s starting direction. Drag, native touch/pinch, wheel, arrow keys and zoom buttons use the existing controls. There is no automatic camera motion.

Three saved stills show the common-room composition and exactly matched open/closed-door views. The open bedroom leaf’s partial occlusion is described rather than hidden. Book reference thumbnails are loaded from references.json and retain their style/character/prop scopes. The page links executable CLI render/cubemap examples, job JSON, prompt templates, cameras, current plan and manifests.

The illustration section shows the actual revision-prepared geometry guide and selected revision-result image. V2 removes the extra right-edge counter invented in V1; V1 remains under details with its prompt/provenance and the revised job feedback. Selection is explicitly a workflow demonstration, not chapter approval or pixel-exact geometry. Materials, proportions and decoration still need visual continuity review.

## Focused checks

Passed at1440×1000,390×844 and320×568 with real Chrome/WebGL. Each of the four selectable modes loaded its actual asset and rendered. All ten figure images decoded, including the retained V1 details image; full-size image links and documentation/job/provenance links returned success. No page errors or horizontal overflow occurred.

Keyboard testing completed a full360° turn, reset and zoom. Mobile tests used actual CDP touch input for drag and two-finger pinch, then rotated to844×390 and back. Desktop WebGL context loss displayed the flat atlas fallback, and restoration returned the interactive renderer. Disabled camera buttons and retained flat/download access make that fallback explicit.

After the full checks, a small initial-direction improvement for bath/bedroom was verified at1440 and390 widths, including Home restoring each selected direction. Those final views were visually inspected: tub/bed now occupy the opening view instead of a mostly blank wall. Main-room and mobile layout captures were also inspected. No renderer or asset changes followed.

Evidence: /Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/review-check/ (verify.cjs, results.json and actual mode/page/framing captures). JavaScript syntax and git diff --check passed.

## Dependencies and scope

The review imports the already tracked home-unified-gl.js and home-panorama-controls.js; the latter imports home-panorama-math.js. These modules are reused unchanged. It requires the canonical docs/storyboard/locations/pinpin-house pack and its restored selected media, the referenced published book images, and the retained room-unified-cubemap-v2.webp legacy atlas. Restore through the locations index instructions before local review.

The workshop has no dependency on a dated house-production pack, an old local report, or a .blend file. A one-way local navigation link was added from the earlier bathroom-proposal.html; that historical report is not required to open this standalone workshop. No live home menu, previous renderer, model, media or illustration was changed in this lane. No publishing or Git mutation was performed.
