# V2 field-of-view and projection review

The flat V2 tractor has substantially more normal, source-like proportions than its 89.41566° rendered view. The severe enlarged edge wheels, stretched hood/grapple and cropped whole machine are mainly introduced by how that image region is interpreted in the sphere. They should not all be attributed to the image model redrawing a badly shaped tractor.

Inspected the exact raw t4 frame, unchanged flat `pilot/panorama-v2.png`, actual UI captures `browser-check/fov/before-video-1440.png` and `before-panorama-1440.png`, then the projection lane’s `front-homography.png` and `front-overlay.png`. Temporary review copies are under `/tmp/pinpin-fov-*`, `/tmp/tractor-fov-review/` and `/tmp/pinpin-v2-fit/`. No art edits or image-generation calls were made in this review.

## Source versus flat panorama

The source has a near-side tractor with a slightly higher rear axle, a straight trailer bed and two close tandem trailer wheels. The flat V2 retains that broad relationship, its cab/hood silhouette, crane behind the cab and grapple over the empty trailer. Its wheels look reasonably round rather than the huge oblique ellipses visible in the wide-angle sphere screenshot.

As a rough visual cross-check, manually estimated hub centers are below (image pixels, several-pixel uncertainty; not calibrated measurements):

| Hub | Raw 1280×720 | Flat V2 1774×887 |
|---|---|---|
| Tractor front |270,469|618,520|
| Tractor rear |535,449|811,505|
| Trailer first |927,479|1097,523|
| Trailer second |1077,480|1211,523|

With the front hub as 0 and front-to-rear tractor spacing as 1, the two trailer centers lie around 2.48/3.05 in the raw frame and 2.48/3.07 in flat V2. These approximate ratios support the visual finding of broadly consistent machine layout before spherical projection. They do not establish exact geometry or validate every painted part.

## Corrected front diagnostic

The projection lane’s front-homography diagnostic shows the whole machine with normal wheel sizes and a much closer framing to the source. The actual 89° screenshot exaggerates the edges so strongly that it is unsuitable as the basis for judging the raw V2 vehicle proportions. Camera framing and the assumed source projection must be calibrated together; simply selecting a smaller FOV can crop the problem rather than recover the intended full vehicle.

The overlay still exposes real differences: small front-wheel and trailer-wheel offsets, slight hood/cab/grapple mismatches and changed trees, sun treatment and foreground texture. A correction of projection can improve the overall view, but cannot recover pixel-identical original art or reverse every generated difference. The diagnostic is a closer composition, not a source-preservation guarantee or recovered 3D camera.

## Global candidate boundary check

Independently inspected actual candidate-1 viewer captures `browser-check/fov/candidate-left.png` and `candidate-lower.png` supplied by the UI lane. The corrected front retains normal-looking wheels, but its boundary is visibly rectangular. At the left edge the forest stretches horizontally into the preserved front; below the tires the road abruptly becomes long vertical streaks, with a large distorted foreground rock. This is a failed all-direction transition, despite the improved central vehicle.

Candidate 1 is useful projection evidence, not a seamless replacement. The UI lane reports that it has not been selected. A second mapping that preserves polar coordinates requires its own actual boundary review; preserving the exact poles alone would not establish that the front-to-surround transition is clean. The appearance/material judgment remains separate from projection geometry. No further generation or art edit was made by this review lane.

## Final coordinated outcome

The subsequent UI review also rejected candidate 3's stretched surroundings. The coordinator then generated V4 surroundings and a separate registered rear correction; the UI lane's final front/side and rear 140°/180°/220° checks passed, and the coordinator accepted that stack for preview. These later findings are attributed to `FOV-REVIEW.md`, rather than presented as additional independent image inspections by this lane. The selected configuration is `tour-fov-v4r`. Earlier failed candidates and original V2 remain preserved; the result still carries generative detail drift and does not establish pixel-identical source geometry.
