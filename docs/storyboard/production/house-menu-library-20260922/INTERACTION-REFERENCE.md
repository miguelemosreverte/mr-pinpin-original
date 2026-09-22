# Illustrated house interaction reference

Reviewed 2026-09-22 at GitHub commit `c6e626d0ed639c8440821d9acd99570ce9e4fd90`:
https://github.com/miguelemosreverte/ui-experiment

The reference is an interactive segment viewer. It loads an illustration and a color-coded hitmap at natural image dimensions. Pointer coordinates are transformed from the displayed image rectangle into image pixels; the hitmap color identifies a segment, and a name groups related segments into meaningful objects. Hover draws a cached colored segment mask, updates a tooltip and shows an action cursor. Click finds the corresponding action and plays a pre-rendered transition video; each resulting scene state has its own segmentation. Optional depth-of-field and cube-map reprojection are separate GPU effects, not prerequisites for object navigation.

Grounding in reference `index.html`: `initViewer`, `getSegAtPixel`, `buildMask`, `drawHighlight`, the container mousemove handler, `rebuildActionTriggers`, and the click/video handler. `README.md` describes scene-state clicks and layer/depth/reprojection keyboard controls.

No LICENSE file was listed and the GitHub repository metadata reported `licenseInfo: null` at review time. The PinPin implementation therefore uses independently written code and new PinPin artwork. It does not redistribute the reference's code, media, inline segmentation or shaders. The reference supplies an interaction concept: recognizable scene objects act as the menu.

## PinPin implementation

- One generated house-room illustration with a left arched garden door and a right bookcase.
- Independently drawn SVG contour links share the image coordinate system. Responsive scaling keeps the image and contours aligned; the illustration is never independently cropped.
- Dashed white contours identify the two destinations. Hover and keyboard focus turn the contour gold; activation gives a short visual press. Standard links retain keyboard, touch and browser navigation behavior.
- Door opens the existing forest atlas. Bookcase opens the chapter PDF library. Language selection is retained in destination links.
- Text navigation remains available underneath the picture, including the original book. Reduced-motion preferences disable animation.
- No hitmap download, image segmentation model, video transition or GPU renderer is needed for these two stable objects.

Root selected room-v2.png (1536×1024); the home worker inspected it and traced the actual doorway and bookcase silhouettes. Runtime room-v1.webp refers to that selected second-generation PNG.

## Preserving the original export

The pre-menu `docs/index.html` is copied byte-for-byte to `docs/original.html`, retaining its existing `images/` URLs and original source hash. `docs/original/index.html` is a small navigable alias to that preserved document. The source extractor `tools/build_book.py` changes only its input filename to `docs/original.html`; original narrative, artwork, CSS and extraction behavior remain unchanged.

Authoring and publication remain in the existing canonical source/release workflow. This reference report does not grant art approval or claim a live deployment.
