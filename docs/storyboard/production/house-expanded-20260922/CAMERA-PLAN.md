> Final decision: initial1.25×cover, minimum1.08×cover, maximum3×cover. Actual selected world is1254×1254. The original planning discussion below predates this refinement.

# Expanded room camera plan

Status: planning complete; awaiting the approved expanded color artwork, its exact dimensions, and a registered depth map. No runtime or asset files changed for this planning step. Architecture review and artwork generation remain separate lanes. Do not trace the present single-window composition as the new scene.

## Framing and travel

The current cover scale necessarily fits one axis exactly, leaving no travel on that axis until the user zooms. Start the expanded room at1.22 times cover instead. This leaves about18% of the world outside the viewport on the fitted axis, allowing immediate vertical and horizontal dragging in portrait and landscape. Keep bounded cover minimum and3 times cover maximum; at the exact minimum, one axis naturally reaches its travel limit. Resizing retains zoom relative to cover and clamps the center without exposing background.

Use normalized focal centers, then multiply by actual asset width/height. Start portrait near the newly drawn doorway, with its center high enough to make the entrance and surrounding architecture legible; choose the exact normalized center from the final image. Start landscape near the visual center of the room. The expanded composition should include additional ceiling and floor plus side room context, both canonical windows, a clear doorway and the bookcase. The camera can support any supplied aspect ratio; no assumed pixel dimensions are necessary.

## Shared scene contract

Add a small shared home-scene.js module holding actual world dimensions, color/depth URLs, normalized initial centers, initial/minimum/maximum zoom ratios and approved normalized hotspot interior anchors. Convert the camera script to an ES module so it shares that source with depth geometry and rendering. Keep existing language localization separate.

Remove hidden1536x1024 assumptions from camera initialization, CSS world size, geometry dimensions, DOF texel radius and verifier world/screen conversion. Geometry taper distances and parallax displacement become fractions of world width/height, retaining the present restrained proportions. Derive grid rows from aspect ratio with a bounded grid budget. SVG viewBox and image metadata must match the supplied world dimensions. Validate both color and depth natural dimensions before activating GPU projection.

Expose world dimensions, configured zoom ratios and normalized hotspot anchors through the existing read-only camera/depth snapshot contract. Keep .room, .room-fit, .room-links, #door-link, #bookcase-link, cameraState and depthView.project([worldX,worldY]) interfaces stable. Pixel coordinates remain valid for existing consumers, while dimensions and anchor data stop being implicit.

## Architecture and interactions

Trace new door and bookcase contours only after the final two-window artwork is approved. Use original SVG curves as the flat source, with the existing dense samples and shared mesh interpolation for rendered outlines and native hit areas. Preserve keyboard reveal/Enter, drag and pinch click suppression, fixed flags, language URLs, cover bounds, no-scroll layout, depth focus and fallback behavior. Windows remain artwork unless explicitly requested as destinations.

## Verification integration

Update the two existing camera/depth verifiers to read actual world dimensions and configured zoom limits instead of hard-coded1536x1024/aspect1.5. Use approved normalized interior anchors for taps and new image-specific near/far landmarks for depth metrics. Assert that initial framing permits positive horizontal AND vertical travel at390x844,320x568,844x390 and1440x900. Continue bounds, pinch anchor, mouse/touch drag, tap suppression, keyboard reveal, rotation, all languages, projected-contour registration, DOF and fallback checks. Save evidence externally and leave publishing to the coordinator.
