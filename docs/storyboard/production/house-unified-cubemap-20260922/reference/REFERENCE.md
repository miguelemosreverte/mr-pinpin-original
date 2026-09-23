# Unified Blender cubemap reference

This single **3072 × 2048 PNG** assembles all six 1024² grayscale 90° camera renders from the same locked Blender room. It is the structure reference for **one image-generation pass over the whole cubemap**, not six independently styled faces.

Layout has no gutters, labels, rotation, rescaling or color adjustment:

| Top left | Top middle | Top right |
|---|---|---|
| front | right | back |
| left | up | down |

The bottom row in that table is the second atlas row. Tiles occupy exact 1024-pixel grid cells. They preserve the orientations of the earlier direct Blender renders.

## Camera and sampling convention

Camera origin is (0,0,1.15) metres. Blender world front is +Y, right +X, up +Z. PNG/atlas UV origin is top-left.

| Face | Forward | Image right | Image up |
|---|---|---|---|
| front | +Y | +X | +Z |
| right | +X | −Y | +Z |
| back | −Y | −X | +Z |
| left | −X | +Y | +Z |
| up | +Z | +X | −Y |
| down | −Z | +X | +Y |

For face UV (u,v), world ray = normalize(forward + (2u−1)×imageRight + (1−2v)×imageUp). Atlas UV = ((column+u)/3,(row+v)/2). To use the existing browser world axes, map Blender (x,y,z) to browser (x,z,y). A dominant-axis cube sampler chooses the correct face; clamp within each tile's half-texel border to avoid neighboring atlas pixels.

## Twelve shared geometric edges

Edge traversal is top-to-bottom for left/right edges, and left-to-right for top/bottom edges. “Reversed” means that the second edge must be traversed in the opposite direction.

| First edge | Second edge | Traversal |
|---|---|---|
| front.left | left.right | same |
| front.right | right.left | same |
| front.top | up.bottom | same |
| front.bottom | down.top | same |
| back.left | right.right | same |
| back.right | left.left | same |
| back.top | up.top | reversed |
| back.bottom | down.bottom | reversed |
| right.top | up.right | reversed |
| right.bottom | down.right | same |
| left.top | up.left | same |
| left.bottom | down.left | reversed |

This 3×2 atlas is a packing layout, not an unfolded cube net. Adjacent tiles in the PNG do not necessarily share a physical room edge. The explicit pairs above, also recorded with atlas UV endpoints in atlas-manifest.json, are the boundary contract for one-pass stylization and rendering.

## Exact preservation and reproduction

assemble_atlas.py uses only Python's standard library. It verifies PNG chunk CRCs, decodes PNG scanline filters, concatenates unmodified RGB pixel rows, and writes a new PNG. It then decodes that atlas and verifies every extracted tile is byte-identical to its original decoded RGB image. All six source PNG hashes also match the locked face manifest. Compression bytes and nonvisual metadata differ; image pixels do not.

Run with --faces pointing to the earlier Blender references/faces-90 folder and --out pointing to this folder. atlas-manifest.json records the source scene hash, original face hashes, decoded pixel hashes, camera bases, tile bounds, all twelve edge pairs, and final atlas hash.

No artistic generation, Git operation, runtime edit, or change to experiments A/B was performed. Source and generated originals remain unchanged.
