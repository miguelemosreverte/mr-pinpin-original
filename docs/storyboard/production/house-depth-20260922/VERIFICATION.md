# Independent room depth QA

2026-09-22. Canonical source served at http://127.0.0.1:8789/. Owned source file: scripts/verify-home-depth.cjs. Runtime unchanged by this lane.

Final run passed all23 recorded observations/check groups, covering1440×900 desktop,390×844 and320×568 native touch, both portrait-to-landscape rotations, and four fallback modes. No page errors in the GPU navigation cases. Syntax and diff checks pass.

## Visible effect and focus

At a fixed camera, hovering the outdoor doorway changes focus to about0.014; hovering the nearer bookcase changes it to about0.459. Screenshot gradient measurements show19.6% stronger outdoor detail at far focus and75.8% stronger rug detail at nearer focus. These are regional image measurements, not merely shader-uniform changes. The selected-object overlay fill and its CSS transition are disabled only during the two metric screenshots to prevent hover tint from changing contrast; geometry, lighting, blur and runtime interaction remain unmodified. GPU drawing stops after focus settles.

Near/far landmarks have differential displacement of approximately13px desktop and35–50px mobile after removing the ordinary affine pan/zoom. These displacement values are computed from the runtime's shared geometry projection; same-camera flat/depth screenshots additionally document the actual rendered result. The effect is depth-dependent and clearly exceeds subpixel frame noise.

## Alignment and interaction

Forty independent samples of each original SVG boundary were compared with the actual projected path at both horizontal pan extremes and after rotation. Worst observed distance was below1.71 screen pixels, including finite comparison-path sampling error. Real taps/clicks on projected door and bookcase locations navigate to the correct RU routes. Native CDP touch pinch/pan keeps the browser viewport at1×, never follows a link after dragging, and preserves full artwork coverage. Keyboard Tab reveals the cropped target before navigation. Native DOM anchor semantics remain active.

## Fallback and mobile behavior

Missing depth (network abort), unavailable WebGL, actual WEBGL_lose_context, and reduced-motion preference each return to a visible sharp flat illustration with working ES bookcase navigation. Toggling reduced motion on/off at the panned camera also restores active depth rendering. Rotation while zoomed and panned maintains coverage and projected contours. Flags remain visible and fixed.

Animation-frame interval p95 was16.7–16.8ms; largest observed interval was66.7ms across captures and gestures. Measurements run on host Chrome with emulated mobile viewports, not a physical phone or GPU-timer benchmark. The renderer is small and stops at rest; these results do not claim physical-phone frame rates.

## Visual inspection and evidence

Inspected the focus pair, portrait left/right edge frames and rotated frame. Door/shelf outlines remain crisp and aligned, book covers stay readable, and no black holes, torn triangles or conspicuous edge smears were observed at the tested bounds. The foreground softens visibly when focused outside. The effect is a restrained image-depth warp with DOF, not a complete navigable3D reconstruction.

Open comparison.html for paired same-camera flat/depth rows and the focus pair. results.json contains numeric evidence; PNGs contain the initial, edge, rotated and fallback captures. All evidence remains external on TB4. Parent owns commit/build/release.
