# Perspective repair inputs

Four pure perspective reprojections of the unchanged v3 runtime WebP, using an exact frozen copy of `docs/home-panorama-gl.js`. No creative edits, overlays, annotations, crops, or subsequent resizing. Each PNG is rendered directly at **1024 × 1024**, device pixel ratio 1, square aspect, **110° vertical and horizontal field of view**.

| File | Yaw | Pitch | Centre ray | Image top ray points toward | Image right |
|---|---:|---:|---|---|---|
| `front.png` | 0 | 0 | +Z, front | +Y, ceiling | +X |
| `rear.png` | π | 0 | −Z, rear/seam | +Y, ceiling | −X |
| `up.png` | 0 | +π/2 | +Y, zenith | −Z, rear | +X |
| `down.png` | 0 | −π/2 | −Y, nadir | +Z, front | +X |

Axes here are the runtime shader's axes: Y is vertical, Z is forward. They differ in naming from Blender's world axes. Image coordinates start at top-left. Given normalized image coordinates `(u,v)`, the initial ray is `normalize(((2u−1)tan55°, (1−2v)tan55°, 1))`. Apply the runtime pitch rotation, then yaw rotation. Source panorama UV is `fract(0.5+atan2(worldX,worldZ)/(2π)), 0.5−asin(worldY)/π`.

The 110° views extend 10° past each side of an ordinary 90° face. This overlap supports feathered repairs instead of hard cube boundaries. Keep edited image framing and outer edges consistent with these inputs. Parent handles artistic repair; runtime owner handles blending.

`provenance.json` records the source and renderer SHA-256 plus exact view angles, dimensions, byte counts, and output hashes. `renderer-snapshot.js` preserves the unmodified sampling shader, including its linear filtering and clamp-to-edge texture configuration. `reproject.cjs` regenerates these views in installed Chrome through Playwright, reusing the frozen renderer when present.

All four outputs were visually inspected: front is correctly upright with the doorway, rear shows the table and source wrap seam, up shows the ceiling pinch, and down shows the rug pinch. The original source image and repository runtime code remain unchanged.
