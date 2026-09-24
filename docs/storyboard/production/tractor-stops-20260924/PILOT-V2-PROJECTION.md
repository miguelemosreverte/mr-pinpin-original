# V2 pilot projection and appearance comparison

This is one prompt-workflow trial, not a new 24-stop generation run. The original t4 video frame is the appearance authority. No original-frame overlay, runtime patch, local painting or core replacement is used in this comparison. All previous batch generation remains on hold.

## What V1 changed

The raw frame has warm backlit haze, soft dappled/contact shadows, varied paint and rubber response, forest reflections in glass and depth-separated vegetation. Restoration retains broad framing but strengthens local contrast and makes tire tread, fasteners and foliage uniformly explicit. V1 spherical generation then changes more than sharpness: peripheral wheels stretch, crane/hose detail is redrawn, glass and painted-metal shading simplify, and nearby trees, ground and sun treatment shift. These are appearance and shape changes. Raster resolution is a separate observation, not an explanation sufficient to dismiss them.

The V1 prompt classified the task as illustration and assigned the older accepted sphere authority over sunlight and illustrated finish. That is a plausible source of competing appearance guidance, not a demonstrated causal diagnosis from one image. V2 instead assigns original-frame appearance sole priority, uses restoration only for obscured fine detail, a raw-frame geometric guide only for placement, and the older sphere only for projection organization. It asks for the source's apparent physically rendered qualities without claiming a known engine.

## Comparable cameras

Both candidate panoramas are compared against the **same original 1280×720 frame**, not different restored references. The unchanged `fit_camera.py` uses SIFT/RANSAC matches and a robust yaw/pitch/vertical-FOV fit. It changes the viewing camera only. Matching features can cluster on a small object region; fit residuals do not certify the surrounding scene or unchanged geometry.

V1 raw-reference fit: yaw 0.0550150844rad, pitch 0.0034835594rad, vertical FOV 65.02985794°. It has 207 RANSAC inliers, median 3.40 px / p90 6.16 px at 1280 pixels wide. Reference feature bounds cover x 26–69%, confirming the cab/crane bias. Its fitted forward image and half-opacity overlay remain available under `pilot/style-v2/v1-fit-raw/`. Old restoration-reference fit evidence remains unchanged in `pilot/fit/`.

V2 uses a fresh deterministic raw-frame guide, yaw 0 / pitch 0, vertical FOV 45°, aspect 16:9, horizontal FOV 72.73435141°. Unknown rays are neutral gray. The guide roundtrip mean absolute RGB error is 2.313/255 after two bilinear samplings; that is a projection check, not a guarantee of generated pixel preservation. Guide records are in `pilot/style-v2/raw-guide/`.

## V2 outcome

The single V2 master is retained as `pilot/panorama-v2.png`, 1774×887, SHA-256 `93542403af245904ed2a32f696fa116cea50e18b7a4adf76622a985c5152f493`. Flat-image inspection shows more convincing warm bounce light, shaded undercarriage, paint/glass response and varying surface roughness than V1. This is an appearance improvement; it does not establish matching camera geometry.

The vehicle also occupies a much larger angular region than the guide or V1: roughly 150° of longitude across its visible width. The completed raw-reference camera fit confirms central-only feature agreement and substantial peripheral distortion. A good central match cannot be reported as unchanged whole-frame registration. No pixel overlay or composited frame is used.

The unchanged fitter ran successfully after the machine restart. Its actual V2 camera is yaw **0.0083150838 rad**, pitch **0.0078683391 rad**, vertical FOV **89.41565983°**, aspect 16:9. This was a measured feature fit, not a manually invented descriptor. Of 304 ratio-test matches, 133 pass RANSAC and 93 fall below an 8-pixel physical-fit residual. Median residual is 4.57 pixels; the 90th percentile is 12.99 pixels at 1280-pixel width. The feature bounds cover only x 32–59% of the reference, substantially narrower than V1.

**Whole-frame registration fails.** Inspection of the fitted forward view and half-opacity overlay shows the center cab/crane approximately aligned while the front wheel, extended crane end and trailer wheels stretch and crop far outside their original locations. The numerical inliers therefore cannot certify the desired unchanged-frame result. No additional manual fit, patch or compositing was used to hide that failure.

Both raw-reference fits and their views are available to the browser comparison at `pilot/style-v2/{v1-fit-raw,v2-fit-raw}/`. The V2 flat image improves material/lighting treatment, but the ordinary forward view exposes a worse perspective mismatch. The outcome supports better appearance prompting, **not** a source-faithful one-shot panorama workflow or approval to generate the remaining stops. No cube export was added because the fit is not promising as a faithful source-frame transition. Wrap/poles are not certified by this bounded comparison. The projection lane made no image-generation call for this V2 trial.
