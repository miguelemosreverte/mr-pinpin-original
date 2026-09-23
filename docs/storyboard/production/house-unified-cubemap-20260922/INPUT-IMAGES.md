# Input images visible in the comparison report

The report's input-images inspector exposes the source images directly rather than only presenting projected room views. Full-size image links preserve the original files.

## A: spherical panorama with repairs

The recorded inputs to `house-panorama-20260922/room-panorama-v3.json` are:

- `blockout/room-blockout-equirectangular.png`: the actual Blender spherical geometry guide, SHA-256 `604d32e7044bc90b2927ec8e9656103d990688addccb534bd4afdf14144c816e`, 1,611,318 bytes. It is loaded from its existing immutable public archive object, without another derivative or new catalog entry.
- `room-expanded-v2.webp`: approved material and illustration style reference.

A's runtime base is `room-panorama-v3.webp`, a 1774×887 spherical panorama. Its four separate registered repair images are `room-cube-{front,rear,up,down}-v1.webp`; each is a 110° perspective edit projected over the base with feathered boundaries. These repairs do not form a six-face cubemap.

## C/D: cube projection

`room-blender-gray-v1.webp` is the untouched 3072×2048 Blender cubemap already present in the public site. It packs six true 90° square faces: front/right/back above left/up/down. The displayed grid is a packing layout, not an unfolded cube net. It is the input for C's whole-atlas stylization and the exact pixels used by D's grayscale control.

The inspector labels these projections separately. It does not present the Blender cubemap as A's original generation input. No images were generated, retouched or replaced for this report change.
