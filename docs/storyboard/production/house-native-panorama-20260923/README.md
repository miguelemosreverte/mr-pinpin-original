# Native spherical guide + book reference

Local visual report: [house-native-panorama.html](../../../house-native-panorama.html).
This experiment is a proposal, not a replacement for the selected house tour.

## Result

One built-in imagegen call used the two images and the 198-word prompt. The
unmodified output is 1774 × 887 pixels; 2048 × 1024 was requested. It achieves
much richer book-like craftsmanship, vegetation, textiles and lighting without
individual decorative instructions. It also changes the bathroom glimpse into
another bedroom and interprets the gray stove primitive as a flower barrel.
Those are actual content failures, not permissible surface refinements.

The interactive sphere also exposes a hard vertical join next to the front door,
ceiling-beam pinching, and severe convergence of the rug and foliage at the floor
pole. These defects are present in the generated panorama; converting it to a
cubemap preserves them. A beautiful flat preview is insufficient for selection.

The comparison preserves this first result rather than concealing its problems
with additional editing. Consult the art and browser reviews below for the full
sphere inspection. This test demonstrates useful reference-driven appearance
completion, but not a production-ready or reliably repeatable house generator.

The scalable lesson is to keep appearance reference-driven, but separately test
room/object identity and spherical continuity. The gray cylinder alone did not
communicate “stove” reliably. Future experiments can draw semantic constraints
from the scene's existing object/room names rather than author a decorative
shopping list. That proposed improvement has not been tested in this record.

## The experiment

Render the existing common-room scene directly with Blender's panoramic camera,
then send that single geometry image and one actual book illustration to the
built-in image generator. Convert the resulting full-sphere panorama into the
existing cubemap layout deterministically for viewing. No independently painted
cube faces and no repair patches are part of this first attempt.

The two input roles are deliberately distinct:

1. **Native Blender panorama:** camera, room connections, opening placement,
   door states and major furniture placement.
2. **Book illustration:** finished visual language, craftsmanship, materials,
   light and decoration. The model may infer missing domestic and botanical
   detail. The gray scene's facets and primitive shapes are not the desired finish.

The reusable [prompt](prompt.txt) contains no per-plant or per-wall repair list.
Its scope is broader than the previous style-pass prompt, which explicitly
forbade adding decorative props and plants. This experiment changes both the
input history and that appearance constraint; it is not a controlled proof that
projection alone caused any improvement.

## Why this projection

Blender's equirectangular camera captures a full 360° × 180° view in one 2:1 image.
It eliminates internal cube-panel borders from the editing input. A flat image
still has a wrapping left/right boundary and two singular poles; generation can
still introduce discontinuities there. The final cube conversion cannot repair
painted inconsistencies. See the [Blender camera documentation](https://docs.blender.org/manual/en/3.2/render/cycles/object_settings/cameras.html).

Earlier experiments also used equirectangular images, reconstructed from cube
atlases. Here the starting guide is rendered directly from Blender before its
first illustration pass. Native spherical rendering is not in itself a guarantee
of better style transfer or seam handling.

## Evidence and review

- [Geometry and orientation](GEOMETRY.md)
- [Exact image-generation request](generation-job.json)
- [Generation result](generation-result.json)
- [Art review](ART-REVIEW.md)
- [Browser review](BROWSER-REVIEW.md)

Checksums and projection checks establish provenance and coordinate correctness;
they do not establish an exact match to the book or visual approval. New decorative
details inferred by the image model remain illustration details, not additions to
the canonical Blender geometry. Their consistency across other camera positions
has not been demonstrated by this single-view experiment.
