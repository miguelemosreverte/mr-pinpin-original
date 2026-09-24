# E/F fixed-camera room verification

**Passed for the selected experiment:** E is the warm-material Blender panorama; F is illustrated v2 plus one rear repair. The default homepage and default A/B comparison remain unchanged. The public release is handled separately.

Review route: `room-compare.html?baseline=materials&candidate=illustrated&lang=ru`. Add `&inputs=1` to open the complete inputs and camera proofs.

## What is implemented

E (`?view=blender-materials`) and F (`?view=blender-illustrated`) use the existing spherical renderer. E preserves the guide geometry and target UVs. F has independently traced door/bookcase contours calibrated to the actual 1774×887 painting. Only F’s rear repair is enabled, at 110° with the existing normalized feather. No new shader or independently blended cube faces were introduced.

The report’s left baseline is limited to A or E; the right selector preserves B/C/D and adds E/F. Both sides share yaw, pitch and field of view. Baseline changes preserve the current camera. Source image paths in the input module are explicit static production paths, correcting the earlier build reference ambiguity.

## Functional checks

- Actual E and F v2 passed at 1200×800 desktop and 390×844 mobile: selected image/mode, background camera/depth pause, full yaw turn, projected hotspot hit regions, and native RU door/library navigation.
- E/F comparison passed 1440×1000 and 390×844: E→A→E retained the synchronized camera, labels/query matched the selected modes, with no overflow or browser errors.
- Missing F texture and lost E WebGL context restored the expanded fallback with working ES library navigation.
- Final F v2 loaded exactly one repair, `rear`, with the expected selected asset. Desktop and mobile final checks passed.
- All 15 actual input images decoded successfully on both final viewports, including the remote archived A guide, selected E/F, the published book style reference, rear repair and four camera proofs. The dialog scrolls, full-size links work, Escape/Close restore focus, and the underlying comparison remains fixed. The earlier dedicated modal checks also passed 320×568 and the `inputs=1` deep link.
- JavaScript syntax and diff whitespace checks passed. No broad PDF or earlier cube suite was repeated.

## Visual review

Six directions were captured for E and raw F v2. Door and bookcase outlines were visually checked against both selected renderings. E remains continuous at the spherical wrap, ceiling and floor. F v2 brings stronger woven rug texture, timber detail, foliage and soft patterned light while preserving the scene layout. Roof crossbeams and the circular rug remain coherent.

Raw F v2 had a distinct vertical lighting/paint boundary across the rear wall/table. The selected rear repair removes that conspicuous boundary. Final captures inspected the rear center, yaw ±50° repair edges and pitch ±45° upper/lower edges: no doubled furniture or hard geometric jumps were observed. A faint fine-texture join remains in the rear rug area; this is not a claim of pixel-perfect seamlessness. No additional repair was justified for this review.

## Camera proofs and practical limit

The input dialog distinguishes actual geometry, artistic style and projection. Blender’s camera is at (0,0,1.15 m), forward +Y/up +Z. The interactive panoramas rotate from that fixed position: full yaw, pitch ±65°, vertical FOV 40–90°.

Two proof rows show original and  +0.5 m X camera positions with the same 22 mm lens / 36 mm sensor (horizontal FOV 78.58°, vertical 63.07°). E’s material render remains geometrically coherent after translation. Projecting raw F v2 onto that geometry reproduces the painting near the original viewpoint, but movement exposes previously hidden surfaces: wood paint and duplicated aperture fragments appear in the windows/garden. The report explicitly explains this failure. The projection proofs do not include the rear repair and do not demonstrate a fully textured, freely explorable illustrated room.

## Evidence

External evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-blender-camera-20260922/verification/`.

- `materials-results.json`: E desktop/mobile checks.
- `selected-v2/results.json`: selected raw F v2 checks and six directional captures.
- `baseline-results.json`: E/F switching and camera retention.
- `fallback-results.json`: actual missing-image/context-loss fallbacks.
- `final/results.json`: final F repair metadata and 15-image loading on both viewports.
- `final/rear*.png`: rear center and all four repair boundaries.
- `final/1440-comparison.png`, `final/390-comparison.png`, and corresponding proof-dialog screenshots.

The raw v2 rear extraction and complete source/camera/shader hashes are retained in sibling `rear-input-v2/`; it is a 1024² WebGL reprojection at yaw π / pitch 0 / FOV 110° with no overlays or art edits. Artwork generation, Blender scene construction, archival and publication were performed in the other lanes.
