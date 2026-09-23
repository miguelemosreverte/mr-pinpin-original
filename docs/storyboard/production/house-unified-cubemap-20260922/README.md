# C: stylize the complete Blender cubemap

This review experiment implements Miguel's requested order: render a complete 360° room in Blender, assemble the six true 90° views into one atlas, and stylize that complete atlas together. It does not generate each direction separately.

## Reference and generation

The fixed camera and primitive room are shared with experiment B, making this a comparison of stylization workflows rather than a new architectural design. The reference is a pixel-exact 3072×2048 assembly of six 1024×1024 Blender renders. Layout, camera bases and all twelve physical edge pairings are recorded in [reference/REFERENCE.md](reference/REFERENCE.md) and [reference/atlas-manifest.json](reference/atlas-manifest.json). [reference/assemble_atlas.py](reference/assemble_atlas.py) reproduces the assembly.

Built-in `image_gen.imagegen` stylized the entire atlas with the approved expanded room as a style reference. A second whole-atlas edit removed unwanted drawn divider lines and addressed window details. Both iterations preserve their exact prompts and provenance records:

- [First whole-atlas prompt](room-unified-cubemap-v1.prompt.txt), [record](room-unified-cubemap-v1.json).
- [Whole-atlas correction prompt](room-unified-cubemap-v2.prompt.txt), [record](room-unified-cubemap-v2.json).

Version 2 is the comparison candidate. Its actual native output is 1536×1024: **512 pixels per face**, without upscaling. PNG masters, the grayscale reference and the rejected v1 derivative are archived; only the selected lossless v2 WebP belongs in the published runtime.

## Viewer

Open `/room-compare.html?candidate=unified&lang=ru` for A/C, or `/?view=cubemap-unified&lang=ru` for C alone. The original A/B comparison remains available. The default home menu is unchanged.

The C shader samples one atlas using dominant-axis cube projection and true 90° faces. It clamps samples inside each tile to avoid texture bleed. It neither blends independently generated faces nor hides boundaries with overlap. Rotation is around a fixed camera, not walking through a 3D model.

## Evaluation limits

Joint generation improves shared style but does not enforce Blender geometry or exact edge correspondence. The generated image can still invent furniture, move roof beams or change proportions. The primitive room also retains its rectangular construction. Version 2 removed the first pass's black rules, but an extra cupboard remains near the left/back boundary. Review the browser seam audit before choosing between A and C; this experiment is not automatically promoted to the main menu.

See IMPLEMENTATION.md and VERIFICATION.md for the final runtime checks and visual findings when available.

## D: untouched Blender control

The report also exposes `?candidate=gray` and the standalone `?view=cubemap-gray` mode. D uses the original 3072×2048 grayscale Blender atlas encoded losslessly to WebP, with decoded pixels verified against the reference PNG. It receives no image generation, retouching or stylization. It uses the same true 90° cube sampler as C, allowing the room geometry and camera projection to be inspected independently of the generated artwork. The report links the source atlas for flat inspection as well.

The Blender room itself has rectangular walls and a pitched ceiling. Those architectural corners are expected; discontinuous objects or beams across a cubemap boundary are not. Compare D and C at the same camera angle to distinguish geometry in the blockout from changes introduced during stylization.
