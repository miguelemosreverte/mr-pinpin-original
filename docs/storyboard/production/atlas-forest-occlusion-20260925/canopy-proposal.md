# Canopy Mask Proposal

Generated 2026-09-25 with the built-in image generator, editing the original
`docs/storyboard/images/atlas/shire-v1.webp`. This is an authoring proposal, not
an accepted runtime texture or a claim of exact geometric registration.

Original output:
`/Users/miguel_lemos/.codex/generated_images/01a0a355-7d5b-7ab2-b71b-90cf4df7313d/exec-e07fcb5b-1e60-4fa7-8651-a22a2f34e459.png`.
Preserved copy:
`/Volumes/TB4/mac-mini-storage/shared/atlas-forest-occlusion-20260925/canopy-proposal-v1.png`.

## Exact Prompt

Edit the attached atlas image into a precisely registered semantic canopy mask for a GPU compositor, same 1536 by 1024 framing and camera. Return only the flat black-and-white mask, not the illustration. Pure white #ffffff marks the elevated foliage crowns and leafy branches of every tall tree: conifers and broadleaf trees, including the dense foreground forest and the trees beside the tractor. Paint the complete leafy crown white even when its foliage is dark or shadowed. Pure black #000000 marks everything else: open ground, paths, water, exposed rocks, bare trunks and roots, the cottage including its planted roof and flowerbeds, small ground-level bushes and grasses, garden fences, picnic, bridge, tractor and trailer. Preserve the exact original projected outlines and locations of the tree crowns; do not rearrange, simplify to circles, add trees, or change camera. Include foliage along image edges. Real gaps between crowns through which ground is visible stay black. This is a flat categorical data annotation with filled regions, no outlines, text, gradients, shadows, or remaining photographic colors.

## Initial Review

The result simplifies some crowns and includes some unwanted trunk shapes.
Do not treat white pixels as opaque tree coverage. Review registration and
the old house/tractor controls before compiling a canopy-mode gate; depth still
determines per-pixel occlusion inside any accepted gate. Protect reviewed solid
objects in authoring data, and retain the existing mask outside accepted regions.
