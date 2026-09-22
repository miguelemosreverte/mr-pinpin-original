# House, library, and printable chapters

The public entrance is https://mr-pinpin.github.io/. Its door opens the forest atlas; its bookcase opens the [chapter PDF library](https://mr-pinpin.github.io/storyboard/library.html?lang=ru). The library supports Russian, English, and Spanish.

## Artwork and exact prompts

- [Preproduction and architecture](PREPRODUCTION.md)
- [Room and library generation prompts](generation-plan.json), with source references and individual output records under `images/`
- [Coloring group A](COLORING-A.md): first adventure, earlier Elder chapter, tractor
- [Coloring group B](COLORING-B.md): bedtime, Papa arrives, family morning
- [Coloring group C](COLORING-C.md): forest walk, Elder’s house, beneath the roots
- [Selected coloring pages](coloring-manifest.json): exactly three per chapter, in PDF append order; per-chapter generation records are under `coloring/`

Artwork was generated and revised with the built-in image generation tool. Original and rejected PNGs are retained and archived; runtime room art uses lossless WebP. Each coloring edition appends a text-free cover drawing and two scene drawings to the existing chapter PDF.

## Implementation and verification

- [House interactions](HOME-IMPLEMENTATION.md)
- [Library layout and downloads](LIBRARY-UI.md)
- [PDF export](PDF-EXPORT.md)
- [Browser verification](HOUSE-LIBRARY-VERIFICATION.md)
- [Coloring archive](COLORING-ARCHIVE.md)

The runtime PDF catalog is `docs/storyboard/library-pdfs.json`; the preservation inventory is `assets/chapter-pdfs.json`. Official release selection remains in the separate Pages repository. A catalog is switched to a new edition only after its PDF objects have passed upload and anonymous readback verification.
