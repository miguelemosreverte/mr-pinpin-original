# Illustrated room panorama — comparison A

This experiment extends the approved two-window cottage into a complete rotational room view. The viewer can turn through 360°, look up/down and zoom, while the projected doorway and bookcase remain real navigable links. This is rotation from a fixed viewpoint, not walking through a 3D scene.

The first two direct panoramic generations preserved the style but produced a rear seam and distorted poles. A primitive Blender room then supplied a true spherical geometry guide for `room-panorama-v3.png`. Four ordinary 110° camera views were extracted from that panorama and edited with the built-in imagegen tool to repair the duplicate door knob, rear join, ceiling junction and rug center. The renderer overlays these registered repairs with feathered boundaries. Exact camera transforms are saved in `cube-inputs/`.

Runtime assets in `docs/storyboard/images/house-menu/`:

- `room-panorama-v3.webp` — native1774×887 equirectangular base.
- `room-cube-front-v1.webp` — single door-knob repair.
- `room-cube-rear-v1.webp` — rear-wall/table seam repair.
- `room-cube-up-v1.webp` — coherent timber ceiling junction.
- `room-cube-down-v1.webp` — flat braided rug.

Each repair master is native1254×1254. Runtime derivatives are lossless WebP. Every master has its exact `.prompt.txt` and adjacent provenance `.json`, including the original built-in tool output path. Rejected drafts, guide renders and editable Blender scenes are retained and archived, not deleted.

- [Preproduction and canonical references](PREPRODUCTION.md)
- [Blender room recipe](blockout/BLOCKOUT.md)
- [Perspective-view extraction](cube-inputs/REPROJECTION.md)
- [Implementation](IMPLEMENTATION.md)
- [Browser verification and visual limitations](VERIFICATION.md)
- [Archive evidence](ASSET-ARCHIVE.md)

Preview route: `/?view=panorama&lang=ru`. A/B review: `/room-compare.html?lang=ru`. Version B is documented in the sibling `house-blender-cubemap-20260922` pack. These routes preserve the default expanded flat/depth menu while the author compares the approaches.

A is visually coherent for comparison after repairs; the rear/down overlap can retain a small tonal line in the floor. It is not described as mathematically perfect image stitching. Renderer projection, gesture behavior, native link alignment and fallbacks are verified independently from artwork quality.
