# Preserving a video frame inside a look-around panorama

Use this variant when entering a spherical view must preserve the visible subject's geometry. The tractor experiment showed that a well-fitted generated image can still redraw wheels and bodywork. Two endpoint-conditioned video bridges then changed the machine between their endpoints, even when the second prompt prohibited camera and machinery motion. Endpoint similarity alone did not detect the intermediate deformation.

## Separate known pixels from generated surroundings

Keep the original paused video frame as a rectangular perspective texture registered into the panorama. Generate the unseen surroundings with the image model. The source image and its camera are constraints implemented by the renderer, rather than requests that the model may reinterpret.

The source camera and opening viewer camera must be identical: yaw and pitch in radians, vertical FOV in degrees, and the actual source aspect ratio. A 16:9 image must not be stretched onto a square repair face. In the tractor prototype the source has full weight through normalized rectangular extent .94, with a smooth fade to zero at 1. This leaves the central machinery unchanged while allowing an edge transition in the scenery. Inspect whether any subject part enters that feather band.

Runtime implementation: `docs/tractor-panorama-anchor.js`. Deterministic projection helper: `docs/storyboard/production/tractor-stops-20260924/source_anchor.py`. These project existing pixels; they do not reconstruct unseen geometry. The original generated master remains separate from the controlled scene stack.

## Generate the surroundings

The most effective tested prompt treats the mathematical equirectangular guide as the **first input and edit target**: fill only its neutral unknown region, preserve the colored projected core, and do not enlarge or reframe the subject. Supply the native frame for appearance and an accepted panorama for spherical continuity only. Once the browser display path is selected, use its recorded decoded frame for newly versioned guides and appearance references; retain earlier raw guides and their hashes. Exact tested prompts and attempts remain in the tractor production pack.

Even this prompt is not a pixel lock: one result preserved the core closely, while another redrew the tractor. The registered source texture supplies that stronger constraint. Check the background outside its field for duplicate subject fragments and check all four field boundaries, especially blurred foreground vegetation meeting newly generated scenery.

For a visible boundary defect, extract a perspective from the **current source-anchored stack**, repair that scene join with imagegen, and register the repair beneath the source layer. Preserve the source core again during final rendering. Inspect the repair's perimeter as well as the original join. A fixed subject does not imply a seamless surrounding panorama.

## Match the displayed video

Use the exact decoded video frame at the selected stop. Record the `requestVideoFrameCallback` media time; a rounded slider percentage can select an adjacent frame. Browser video, a separately decoded PNG and a WebGL-uploaded video can follow different color-conversion paths. Compare actual browser captures at the same timestamp, viewport and raster dimensions before declaring an identical switch. Browser-decoded `source-display.png` files retain their own provenance and do not replace the original model-reference frames.

Do not compensate for a frame-selection error with color filters or camera changes. Preserve the original source, the displayed source reference, and their identities separately.

The tractor sourceLock v3 trial uses a flat WebGL video texture for orbit and the same texture path for the spherical source layer. At RVFC mediaTime 4.0 seconds, the inner 88% measured zero RGB difference between the two modes at native 1280×720. The outer feather still differed. This proof applies to the tested browser, exact timestamp and protected region; it is not a claim of seamless full-frame imagery or cross-browser equivalence.

## Verify and deliver

Check geometry and color separately in the fully preserved region, then inspect yaw/pitch changes across the source boundary. For an animated transition, inspect intermediate wheel centers, tire tread, joints, silhouette and contact points; first/last-frame checks are insufficient. The failed tractor clips are retained for comparison.

At direct entry the projected source can match the orbit frame without a generated morph. On exit, recenter to that same registered camera before returning to the orbit anchor. Keep input handling responsive and preserve the user's pending orbit movement.

Export cube faces from the complete source-anchored stack, including any background repairs. A cube exported from only the generated background does not represent the controlled runtime view. Baked exports add sampling and resolution limits; retain the native source texture for the runtime and record the export inputs, camera, feather, output dimensions and hashes.
