# House furnishing and child-height variants

Separate image-led comparison candidates. The current three-room tour and its approved bathroom correction remain unchanged.

The user explicitly requested testing the image model for furnishing and changed eye height without a new Blender render. This experiment therefore does not execute the canonical location geometry workflow or claim measured camera translation. Existing assembled room images supply visual continuity; the image model infers newly revealed surfaces and changed occlusion. The canonical location pack remains unchanged.

Requested variants: a central round family table in the common kitchen (design reference: published breakfast scene elder-r6-family-016); bathroom and bedroom viewed from a small child’s eye height. The low views must change occlusion rather than simply tilt the existing panorama. Candidates await visual inspection and user feedback.

All heavy masters, assembled inputs, previews and archive caches live on TB4 under pinpin-house-variants-20260924; source paths link to that storage for local review. Exact prompts, hashes, generation records and comparison configuration remain in source control. No official reader-site publication is part of this experiment.

## What the experiment establishes

The common-room variant adds the published breakfast scene’s round pedestal table and four low stools while retaining the existing illustrated architecture. The first full panorama put implausibly long converging legs near its nadir; one registered downward image correction replaces those supports with compact separate legs.

The private-room variants visibly change occlusion at level pitch: the bathroom rim hides the water and the bedroom footboard conceals substantially more of the mattress. That is more than rotating the original camera downward. However, the model also changes some bedding pattern coverage and small object proportions; these are plausible illustrated viewpoints, not exact recovered metric translations.

The full panorama masters remain untouched. Perspective repairs are separate registered images: rear and downward repairs remove wrap/floor cuts in both private rooms; a final bounded bathroom detail addresses their overlapping rug outlines. These stages, their exact input/output hashes and prompts are retained separately so an agent can reproduce the projection and understand what was generated versus mathematically sampled.

The current room stack has sharper local repair textures than a single full-sphere image. The new full panoramas are native1774×887 outputs; targeted1254-square repairs restore detail only in their footprints. Enlarging an export does not create new source detail. This comparison should not be read as proof that one whole-panorama call produces flawless high-resolution geometry.

The side-by-side viewer synchronizes direction and field of view. The menu selects kitchen, bathroom or bedroom; on narrow screens, Current/New buttons switch the visible version. View presets cover the subject, reverse direction, ceiling and floor. The original connected house tour is retained separately. Exact prompts and generation records are linked in the viewer; all new artwork used the built-in image-generation tool, with no new Blender render.

## Generation count and preservation

Nine built-in image calls were used: two for the kitchen (full panorama and downward furniture correction), three for the bedroom (full low-eye panorama, rear join, floor join), and four for the bathroom (full low-eye panorama, rear join, floor join, localized overlapping rug edge). Inputs were derived deterministically from the preceding selected image stack. There were no Blender renders or edits to the original room assets in this iteration.

See [EXPORTS.md](EXPORTS.md) for source mapping and hash checks, [CHILD-VIEWS.md](CHILD-VIEWS.md) for low-view findings, and [BROWSER-REVIEW.md](BROWSER-REVIEW.md) for final camera coverage and limitations. The library of original tool outputs and each separate repair remains available via the media archive; the new variants are review candidates, not replacements selected for publication.
