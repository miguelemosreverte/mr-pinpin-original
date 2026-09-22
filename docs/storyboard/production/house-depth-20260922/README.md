# Room depth camera

The house uses its approved color illustration plus a separate depth pass for depth-aware camera movement and focus. The original color plate is unchanged.

- [Preproduction](PREPRODUCTION.md)
- [Reference analysis and rendering choices](REFERENCE.md)
- [Renderer implementation](IMPLEMENTATION.md)
- [Verified asset archive](ASSET-ARCHIVE.md)
- [Visual and interaction verification](VERIFICATION.md)
- [Depth source and encoding](source.json)
- [Exact generation prompt](room-depth-v1.prompt.txt)
- [Generation record and output hash](room-depth-v1.json)

The depth map was generated with the built-in imagegen tool. The selected original is `room-depth-v1.png` in this directory; the lossless runtime derivative is `docs/storyboard/images/house-menu/room-depth-v1.webp`. Both are 1536×1024. White represents nearby surfaces and black represents distant surfaces; the renderer interprets this as inverse depth.

Behavior reference: https://github.com/miguelemosreverte/ui-experiment. Its effects inform an independent implementation; no reference code or artwork is redistributed.

External implementation, reference analysis, archive proofs and visual verification are recorded under `/Volumes/TB4/mac-mini-storage/shared/pinpin-room-depth-20260922/`.
