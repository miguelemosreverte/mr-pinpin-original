# Stop 04 guide-first endpoint pilot

Exactly **one built-in image call** used the successful stop-14 recipe: raw-frame 65° spherical guide first as a gray-only outpainting target, raw frame second for appearance/geometry, accepted V4+rear panorama third for projection continuity. Only the viewpoint phrase changed from rear three-quarter to near-side profile. Original selected stop-04 assets were not overwritten.

The native panorama is 1774 × 887, SHA-256 `ef4db0c6422a5ed21690ea183ad57a063ce39175b09682139e6df3248f154ea9`. Exact ordered input identities and prompt are in `panorama-generation.json`.

The unchanged fit utility gives yaw **0.000811993 rad**, pitch **0.000392268 rad**, vertical FOV **65.508299°**, aspect 16:9. It found 101 RANSAC inliers, 98 below 8 pixels; median residual 3.40 pixels, p90 6.61 at 1280-pixel width. Inlier coverage x21–82%, y19–80% is broader than a cab-only match, but is substantially weaker than stop14's 1045 full-frame inliers.

The exact fitted-camera `forward.png` is 1280 × 720, SHA-256 `6205130ccce5b660da4599d4eabdc49c20424b923676710580b3ffba8aac44e4`. It preserves broad composition and ordinary wheel shapes, **not exact static machinery geometry**. The model redrew/sharpened the central subject. Independent inspection found the front grille/weight around 25–30 pixels right of raw, front hub around 10–15 pixels right and cab roof around 5–10 pixels down; the rear hub is closer. Tread, hood silhouette and background also differ. These approximate visual observations are not feature-fit statistics.

Nine direction samples are in `directions/directions.jpg`. Rear and polar defects remain. No pole/rear repair, cubemap export, mathematical remap or original-frame overlay was made: the coordinator requested frontal endpoint review first. The coordinator authorized a separate empirical locked-prompt bridge test despite these limitations; video outcomes belong to that lane. No stationary-tractor claim follows from this image fit.

If exact known-view geometry becomes mandatory, a registered source-frame layer sampled through the same pinhole camera can constrain it deterministically, while generated scenery fills outside that frustum. Such a layer would preserve source content through projection resampling, not native-resolution byte identity; its perimeter would still require seam review. It was **not implemented** here, and would be a different workflow from asking an image model to preserve the frame.
