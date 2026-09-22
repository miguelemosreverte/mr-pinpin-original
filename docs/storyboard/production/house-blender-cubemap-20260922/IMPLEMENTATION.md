# Perspective panorama preview

Current comparison: http://127.0.0.1:8789/room-compare.html?lang=ru. A uses the corrected v3 panorama; B uses all six styled Blender-guided faces with calibrated clickable targets. Both are previews. The ordinary main-menu URL still uses the approved expanded flat/depth room. The sections below record development and verification, with final B status at the end.

The new implementation uses raw WebGL to generate a perspective ray for every display pixel and convert its direction to equirectangular UV coordinates. It provides a genuine360-degree rotational view, rather than sliding the panorama as a flat image. No positional depth or parallax is claimed in panorama mode. The image dimensions are read and validated as2:1; there is no fixed-resolution dependency.

Camera controls wrap yaw continuously, clamp pitch to±65 degrees and vertical FOV to40–90 degrees, and support native mouse/touch drag plus anchored pinch/wheel zoom. Arrow keys rotate8 degrees per press, +/- adjust FOV5 degrees, and Home resets framing. Drag/pinch sequences cannot activate destination links; ordinary subsequent taps and Enter remain native navigation. Flags remain fixed and preserve the preview query when changing language.

A separate viewport-space SVG projects calibrated UV hotspot polygons through the exact inverse of the rendering camera. It provides both visible crisp outlines and native hit regions. Clipping against the forward hemisphere prevents behind-camera polygons from filling the screen. Keyboard focus turns the view to an offscreen destination. Current provisional IDs are panorama-door-link and panorama-bookcase-link; final UV calibration waits for selected artwork.

The existing expanded camera/depth renderer is paused only after the panorama image and renderer initialize successfully. Missing image, invalid dimensions, unavailable WebGL, rendering failure, context loss and reduced motion restore the existing expanded room and its original native links. The panorama draws only on input/resize and caps render density at1.5x and2MP. No external rendering package was added.

Files: docs/home-panorama.js (preview lifecycle), home-panorama-config.js (asset/calibration), home-panorama-math.js (shared projection/clipping), home-panorama-gl.js (renderer), home-panorama-controls.js (input). Minimal integration updates index.html, home.css, home-camera.js and home-depth.js. No asset or provenance files are owned by this lane.

Read-only verification interface: .room-fit.panoramaView.snapshot exposes backend/readiness, yaw/pitch radians, vertical fov degrees, totalYaw cumulative radians, viewport dimensions, imageSize, limits, draw count and hotspot{polygon,anchor,linkId} data. panoramaView.project([u,v]) returns{x,y,visible}. Canvas is .panorama-canvas; WEBGL_lose_context tests the fallback. Renderer source coordinates use u=.5/yaw0 forward and v=.5/pitch0 horizon.

Initial mobile/desktop smoke passed on provisional1774x887 v1 artwork. Screenshots: panorama-v1-390.png and panorama-v1-1440.png. Native independent QA is in progress. Root is replacing the provisional artistic panorama with a guide-derived asset to correct rear-seam and spherical-layout problems; those are not hidden by renderer tests. No Git or publication performed.

Independent provisional runtime QA completed successfully: four viewport/native gesture cases; full cumulative yaw revolution, pitch/FOV limits, projected links, keyboard reveal, rotation and fixed flags; plus unavailable GPU, context-loss, reduced-motion and missing-image fallbacks. After45 eight-degree arrow presses, the rendered full-turn frame is byte-identical to the starting frame once outline transitions settle. Final art/UV calibration is still pending and must be reviewed separately.

## Guide-derived v3 preview calibration

Preview configuration now uses room-panorama-v3.webp,1774x887, with initial view centered at source x890 and the horizon. Door and bookcase polygons were retraced with denser doorway-arch points, and the config import is versioned panorama-v3-20260922. Front/back/up/down screenshots exist at both390x844 and1440x900 as panorama-v3-<width>-<direction>.png.

Visual review: room geometry is substantially more coherent than v1. The source still contains two visible knobs on one door face, a rear tonal seam crossing the wall/table, and ceiling/floor pinching at the spherical poles. These remain artwork issues, not verified-away renderer behavior. V3 is a review preview, not a selected publication or replacement for the default expanded room.

## Optional perspective-face repairs

Added an optional hybrid repair layer over the spherical base. Four square perspective images use110-degree vertical/horizontal FOV: front(0,0), rear(pi,0), up(0,pi/2), down(0,-pi/2). Each fragment rotates the same world ray into a repair face, divides local x/z and y/z by tan55 degrees, and samples normalized image coordinates. Native face resolution may differ; square aspect and normalized projection are what matter.

Weights fade from normalized face-edge radius0.70 to0.96. Overlapping corrected faces blend through normalized weights, with the base retaining only the uncovered weight; this permits rear/ceiling overlap without reintroducing the original seam at a45-degree boundary. The front face additionally uses a tight mask centered on the knob region to avoid changing surrounding approved geometry. Hotspot UVs and spherical projection remain unchanged.

The renderer uses five texture units including the base. Optional face-load failures leave the base panorama available; existing full-renderer fallback guards remain. Active face descriptors are exposed read-only in snapshot.patches. No faces are enabled until the coordinator supplies corrected assets. This is a panorama with local perspective-image repairs, not a full3D walk-through. The preview skip link now targets the visible panorama stage and restores its expanded-room target on fallback.

## Corrected A and direct Blender-guided B

A now enables all four1254-square corrected perspective faces. Captures panorama-patched-front/back/up/down.png show the single knob, repaired rear wall/table join, coherent ceiling beams and flat rug. Independent unedited-face roundtrip checks passed15 directions before corrected art was enabled, confirming orientation, FOV and overlap sampling separately from the art changes.

B is implemented behind ?view=cubemap. New home-cubemap-config.js and home-cubemap-gl.js use six independent110-degree square directional images, with no equirectangular base. The forward/right/up bases match the supplied Blender guide. Overlapping projections feather at normalized edge radius0.70–0.98 and normalize their weights; at every ray at least one face has strong coverage. The backend uses six texture units and the same bounded rotational controls, projected SVG links, flags and expanded fallback.

B's provisional hotspot regions come from the guide's actual doorway and bookcase3D geometry, sampled into spherical UVs. They still require comparison against the final styled faces. An isolated browser substitution smoke using the six raw guide images passed and rendered the expected front architecture; evidence cubemap-guide-front.png. Final styled B assets are awaited.

The comparison page is owned independently by the verification lane. Both previews support a constrained parent-to-child same-origin message {type:'pinpin-review-camera',camera:{yaw,pitch,fov}}, clamped through their real controls. Only the embedding parent of the same origin is accepted. The parent can poll read-only snapshots to synchronize the views without feedback loops. Snapshot.view distinguishes panorama/cubemap; snapshot.faces supplies B's loaded face descriptors. The default room still uses expanded mode.

## Final styled B calibration and ownership refinement

All six runtime faces are now the actual 1254×1254 styled 110° images. Door and bookcase polygons were retraced against the front/right face pixels, respectively, and each edge subdivided before spherical projection. The door includes its open leaf. The asset dimensions and loaded face descriptors are available in the read-only snapshot.

The first normalized broad blend produced double stove, kettle and kitchen furniture where independently painted faces differed. One bounded refinement replaces that broad averaging with stable directional ownership: side walls over front/back, then roof/floor over walls. Support edges feather only from normalized radius .95 to .99. Every ray remains covered because at least one cube face has normalized radius at most 1/tan(55°), approximately .700. No image pixels or source artwork were edited.

Actual captures after the refinement are in visual-blender-ownership/, including front, rear, front-right, front-left, up, down, and side/roof/floor boundaries. The duplicated stove/kettle and kitchen furniture are substantially removed. Visible geometric joins remain where roof beams, the chimney or floor details differ between painted faces. In particular right-up shows beam misregistration. This is an honest experimental comparison, not a seamless final cubemap or a positional 3D walk-through. Narrow blending does not repair the underlying art geometry.

The corrected panorama A remains the more coherent whole-room candidate. B is ready for interactive comparison and review; no default-mode switch, Git operation or publication was performed by this lane. Independent native gesture/projection/fallback QA passed on the guide-based backend and is rechecking the settled styled version.
