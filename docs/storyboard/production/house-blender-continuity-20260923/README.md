# Blender structure, book style and camera movement

This experiment separates repeatable room geometry from the illustration applied to it. It follows the successful continuous-panorama approach of A instead of independently generating six cube faces.

## Review

Open `/room-compare.html?baseline=materials&candidate=illustrated&lang=ru` for E/F. E is the warm Blender render; F is the selected book-style panorama with one rear seam repair. A/B/C/D remain available and the default menu is unchanged. The input-images panel shows the actual references, panoramas and camera movement proofs. Panorama viewers rotate around a fixed point; the separate rendered proof pairs show genuine translation.

## What was made

- **E, editable 3D room:** one Blender scene, procedural materials, soft lighting and modeled details. Two eight-spoke circular windows, one outward-opening green door, stable furniture and one rug. The center and +0.5m X camera renders share unchanged transforms for all390 non-camera objects. The numeric lens, camera matrices, materials, lights and image hashes are saved in this pack.
- **F, illustrated room:** built-in `image_gen.imagegen` edited E's complete spherical render. The first version preserved layout but looked more painted. A second whole-image pass used the actual approved chapter image `papa-arrival-20260922-arrival-05.webp` for style, while retaining E as the geometry reference. It improved material depth, rug fibers, foliage and light. Native output1774×887, no upscaling.
- **One targeted repair:** F2 still had a vertical tonal join behind the viewer. A110° rear view was extracted with the runtime projection and repaired with imagegen. The viewer registers this one repair over F2. Ceiling and floor did not need additional repair images.
- **G, projection test:** raw F2 was projected onto E's real surfaces and rendered from the same two camera positions. The center reconstructs the painting; camera movement gives actual parallax but exposes incorrectly painted newly visible surfaces. This is a documented limitation, not a finished texture solution. E's own materials remain stable under the same move.

## Inputs and reproducibility

[WORKFLOW.md](WORKFLOW.md) defines the repeatable process and checks. [IMPLEMENTATION.md](IMPLEMENTATION.md) records E/G and the camera proof. `build_storybook.py` plus the archived portable `source-room.blend` rebuild E. `project_illustration.py` uses E's editable scene and packed F2 source image to reproduce G. Source PNGs and .blend files are archived with exact hashes; runtime WebPs are lossless derivatives.

Imagegen prompts: [initial spherical style pass](room-blender-illustrated-v1.prompt.txt), [book-style refinement](room-blender-illustrated-v2.prompt.txt), [rear seam repair](room-blender-rear-repair-v1.prompt.txt). Adjacent JSON records identify actual source outputs, dimensions, hashes and reference roles. The selected rear input, projection recipe and transforms are in `rear-input/`.

## Direction for semantic house plans

A proposed illustrated floor plan can guide a future house. Its rooms, walls, doors and windows must then become an explicit structured plan with dimensions, heights, openings, room connections and stable object IDs. A Blender script builds geometry from that plan; colored semantic passes, depth and normals can be rendered from the same scene so they align exactly with the beauty renders. Blender does not infer those missing measurements merely by loading a colored image.

A request such as “add an interior door” should update the structured layout and 3D scene before rendering the illustrated views. A request such as “closer to the book” changes the style reference and finish while keeping the scene/camera records fixed. The current experiment demonstrates the latter and tests camera consistency; a complete new house plan or automatic semantic-image parser has not been built or claimed here.
