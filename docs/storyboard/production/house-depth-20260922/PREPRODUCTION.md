# House depth camera

The approved room illustration remains the color plate. A separate pixel-aligned grayscale depth pass adds depth-aware perspective/parallax and gentle depth of field as the existing pan/zoom camera moves.

Depth convention: white is near, black is far. Preserve the exact 1536×1024 framing, door and bookcase silhouettes, furniture, floor, and window geometry. Estimate geometry independently of lighting: outdoor views are distant even where bright; foreground furniture is near even where shadowed. Use smooth depth on continuous surfaces, with clear occlusion boundaries and no painted textures.

Runtime requirements: keep the current full-viewport bounded touch/mouse camera, fixed flag controls, language routes, and safe tap/drag separation. Visual displacement and object hit detection/highlights must agree. Both destinations stay legible and reachable. Apply restrained depth effects rather than exposing unseen sides of furniture. Focus follows the selected/pointed scene object or current view; interaction targets must remain readable. Provide the working flat image/camera when rendering or context is unavailable, and respect reduced motion.

Study the user's UI experiment as the behavior reference. Do not copy unlicensed implementation or artwork. Record the inspected commit, rendering approach, assets, exact generation prompt, validation, and any adaptation here before publication.
