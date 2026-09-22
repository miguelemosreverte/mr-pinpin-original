# Expanded two-window room implementation

Selected runtime artwork is room-expanded-v2.webp with registered room-expanded-depth-v1.webp, both1254x1254. The room now has the canonical window–door–window wall and extra ceiling, floor and side context. New doorway and full-bookcase contours follow this selected composition; color artwork was not modified by the implementation lane.

The shared docs/home-scene.js contract defines dimensions, asset URLs, normalized focal centers, normalized interior tap anchors and zoom limits. Camera, depth geometry, DOF texels and both existing verifiers consume the same dimensions. Hard-coded1536x1024 assumptions were removed. Geometry taper/displacement and sampling scale with the world; the square scene uses a64x64-cell mesh. Both color and depth dimensions must match before the GPU view activates.

Camera starts at1.25 times cover, clamps at1.08–3 times cover, and therefore allows travel along both axes even at minimum zoom. Portrait begins centered horizontally on the doorway at520/1254 and vertically at0.5; landscape stays centered on the room so neither direction begins clamped. No blank edges, page scrolling, new visible labels or extra controls are introduced. Existing native drag/pinch/wheel behavior, safe taps, keyboard reveal/Enter, arrow/+/- controls, fixed language flags, routes and fallbacks remain intact.

Image, sharp SVG outlines and native hit areas still share one depth mesh projection. Focus blur follows hovered/keyboard-selected destination depth or the viewport center. Localized image descriptions in RU/EN/ES now explicitly describe the doorway between two round windows.

The room camera is now an ES module. Home CSS, localization/camera/depth entries and all depth/scene imports consistently use v=expanded-20260922 so existing browsers cannot mix the old camera dimensions with the new scene. The common scene module uses exactly one import URL across all consumers.

Changed runtime files: docs/home-scene.js (new), home-camera.js, home-depth.js, home-depth-geometry.js, home-depth-gl.js, home.css, home.js (image alt text only), and index.html. Updated scripts/verify-home-camera.cjs and verify-home-depth.cjs consume dimensions/anchors instead of assuming the previous artwork. New visual landmarks and a fixed minimum-zoom focus comparison were reviewed for this scene.

Local checks passed: camera verifier at390x844,320x568,844x390 and1440x900; depth verifier23 checks covering visible parallax/DOF, projected contour registration, gestures/navigation, rotation, bounds and all four fallbacks. Far-focus outside detail increased37.0% over nearer focus; nearer-focus rug detail increased157.8%. Near/far differential motion measured24.2px desktop,35.6px at390x844 and22.6px at320x568. Independent expanded-home four-direction QA is maintained by the separate verification lane.

Representative initial mobile screenshot: expanded-depth-smoke/390x844-depth-initial.png. Other evidence: expanded-flat-camera/ and expanded-depth-smoke/ results/screenshots. The source modules pass syntax checks and scoped diff whitespace checks. No Git, publishing, assetpolicy or image-provenance changes were performed by this lane.

Independent expanded-room QA completed: scripts/verify-expanded-home.cjs passed all4 viewports and all32 fresh initial/minimum directional movement cases, plus maximum pan bounds, projected contours, native link taps after drag, keyboard reveal and rotation. No runtime issues found.
