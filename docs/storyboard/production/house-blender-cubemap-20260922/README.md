# Blender-guided room cubemap comparison

The author requested a direct comparison after trying and liking the panoramic room prototype. Version A keeps the illustrated equirectangular room with localized perspective repairs. Version B starts from six cameras in one locked, primitive Blender cottage and illustrates their views independently using the same style references.

The camera origin is fixed at the center of a 6×6m cottage, 1.15m above the floor. Front is world +Y; roof is +Z. The canonical front wall contains exactly two circular windows flanking one arched green exterior door. Kitchen is left, stove front-right, bookcase on the right wall, family table and bench behind the viewer. The rear layout is a proposed continuation of the book references, not measured book architecture.

The reproducible reference set includes exact 90° cube faces and 110° overscan renders from those same orientations. The larger views provide overlap for feathered blending between illustrated faces. The viewer rotates at one point; it does not walk through the geometry. This is an experimental comparison, not a claim that AI-generated textures preserve mathematically exact geometry or seamless material continuity.

All illustrated faces use the built-in imagegen tool, with the matching grayscale camera render as the geometry guide and the approved room as the material/style reference. Exact prompts and output provenance are stored beside the masters. Native output sizes are recorded after generation; requested sizes are not treated as delivered sizes.

The browser comparison will use the same yaw, pitch and field of view for A and B. Review the front, side walls, rear, roof, floor and joins before choosing a version for the main menu.

All six native illustrated outputs are1254×1254 and retain their matching `.prompt.txt` and provenance `.json`. The native1024×1024 Blender reference renders are retained under `references/faces-90/` and `references/faces-110/`, together with the editable rig and camera mapping. Runtime WebPs are named `docs/storyboard/images/house-menu/room-blender-{front,back,right,left,up,down}-v1.webp`.

- [Blender rig and camera contract](references/CUBEMAP.md)
- [Implementation and comparison behavior](IMPLEMENTATION.md)
- [Independent comparison results](VERIFICATION.md)
- [Verified archive preservation](ASSET-ARCHIVE.md)

The direct illustrated faces preserve the general room structure but can shift individual outlines and textures despite the geometry reference. The first broad overlap blend visibly doubled the stove and cupboards. The final comparison uses narrow, stable face ownership to reduce that ghosting. Image generation is not treated as a guarantee of perfectly registered geometry.
