# Room depth and focus implementation

Implemented independently in docs/home-depth.js, home-depth-geometry.js and home-depth-gl.js, with minimal integration in docs/index.html, home.css and home-camera.js. The original color image is unchanged. No external rendering package or reference-project code is copied.

A 64x44-cell triangle mesh samples the generated room-depth-v1.webp, interpreting white as near and black as far. Camera-center changes produce restrained depth-dependent lateral perspective; ordinary pan and zoom remain controlled by the established cover camera. The mesh perimeter stays fixed, and a signed-area safeguard reduces displacement if a triangle approaches folding. This preserves full viewport coverage without inventing unseen image content.

The image and interaction projection use exactly the same triangle interpolation. Existing SVG contour curves are sampled every3 world pixels and projected through the mesh; the resulting paths provide both sharp visible outlines and native hit regions. Native links, drag/pinch click suppression, language URLs, fixed flags and keyboard navigation are retained. The flat original SVG paths are restored immediately on fallback.

The single-pass WebGL renderer uses projected vertex depth for a nine-sample, depth-aware focus filter, capped at3.2 CSS pixels. Focus follows hovered or keyboard-selected door/bookcase depth, otherwise the camera center, and converges smoothly with a130ms time constant. Depth discontinuities reduce cross-edge blur. Flags and SVG outlines bypass the focus filter and remain crisp.

Rendering density is capped at1.5x and2 million pixels. Geometry uploads and SVG updates occur only when the camera changes; focus-only frames update uniforms, and requestAnimationFrame stops once focus settles. Reduced-motion mode uses the flat camera without loading the depth asset on initial load. Missing/invalid depth, unavailable WebGL or rendering failure preserve the flat room. Context loss immediately restores the flat image and hit paths; context restoration rebuilds GPU resources.

The camera integration exposes .room-fit.cameraState and a roomcamerachange event. Read-only .room-fit.depthView.snapshot reports backend, depth convention, focus/target, selected contour, draw count, maximum blur and camera state. depthView.project([x,y]) returns projected world coordinates and depth using the same interpolation as the image mesh. This supports independent geometric/interaction verification without renderer mutation controls.

Initial Chrome smoke: renderer active at390x844; initial focus converged and drawing stopped; screenshot initial-depth-390.png visually inspected. Independent projection, native-touch interaction, focus and fallback QA is running in the separate verification lane. Source files are not committed or published by this lane.
