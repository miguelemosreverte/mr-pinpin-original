# shire-motion-mask-v1

Estimated motion coverage: lake and waterfall interiors gated by cyan/foam color; selected canopy tops capped at 0.22. Authored polygons exclude roads, buildings, trunks, bridge and rocks; conservative coverage intentionally omits uncertain areas.

GRAY8 linear coverage, red=green=blue; black 0, white 1. Six source-pixel inward water feather, ten-pixel canopy feather. Multiply the scene overlay blend (e.g. 0.35) by red coverage.

Orthographic P=(x-W/2,H/2-y,-s*H*d), s=0.75, d in [0,1]. N=normalize(s*H*dd/dx,-s*H*dd/dy,1). Arbitrary affine distance scale; no intrinsics or physical units. Depth offset does not affect N. Ground receding upward gives positive Ny; no extra global tilt applied. Silhouettes use lower-jump one-sided tangents, not cross-object slopes.

Artistic recalibration, not geometry recovery. Monotonic ground plane intentionally replaces far-distance brightness bias. Bounded occluder lifts still inherit dark-paint/shadow errors and may miss bright occluders. Pixel grid/framing are registered; true silhouettes are not guaranteed. Water is assumed on the ground plane; waterfalls are not reconstructed. V1 stays authoritative for existing occlusion. Brightness does not recover actual emission.

Generated: 2026-09-21T01:28:46.615Z

Command: `node scripts/build-atlas-surface-passes.cjs` (`--check` rebuilds in temporary storage and compares bytes).

Generator SHA-256: `50668af7316060f7f647bb1a1034438d969f42876f9ac2805795cc2d3abde157`

- shire-v1.png: `80af7f9eb7188f0a1f64969a22632d0ef9732284d027042222c1543879f03780`
- shire-depth-v1.png: `bf30f8bebe002348d6e911a3a0fe5ef8a8b02d14a17d9dccb8ab4f59aee0e2ec`

Full pass: 512x342. Preview: 512x342. Sidecar JSON records settings, encoders, output hashes and compact field when applicable. No original input is modified. Timestamp is retained for identical outputs; SOURCE_DATE_EPOCH sets it on new builds.
