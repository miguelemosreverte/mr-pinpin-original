# Coloring lane B — completed

Nine separate portrait coloring pages are ready for PDF integration: one approved
cover adaptation and two distinct story scenes for each of the three assigned
chapters. All final PNGs are 1024 × 1536. They use bold black outlines, broad white
fillable regions, simplified quills and props, and no lettering. Each input was
visually inspected before editing; each generated result was visually reviewed.

Built-in `image_gen__imagegen` only was used: nine initial calls and one targeted
revision. No API, CLI generation, filtering, thresholding, or pixel edits were used.
Original generated files remain under `.codex/generated_images/`; exact copies of
selected results are stored in the production pack.

| Chapter | File | Approved source |
| --- | --- | --- |
| home-sweet-home | `coloring/home-sweet-home/cover.png` | `images/covers/home-sweet-home/title-en-v1.png` |
| home-sweet-home | `coloring/home-sweet-home/scene-1.png` | `images/standalone/home-sweet-home/bedtime-12-v2.png` — brushing teeth |
| home-sweet-home | `coloring/home-sweet-home/scene-2.png` | `images/standalone/home-sweet-home/bedtime-19-v1.png` — family asleep |
| elder-papa-home | `coloring/elder-papa-home/cover.png` | `images/published/elder-cycle/papa-home-title-en.webp` |
| elder-papa-home | `coloring/elder-papa-home/scene-1.png` | `images/published/elder-cycle/elder-r6-family-003.webp` — Papa and Scooby |
| elder-papa-home | `coloring/elder-papa-home/scene-2.png` | `images/published/elder-cycle/elder-r6-family-012.webp` — bread to the table |
| elder-family-morning | `coloring/elder-family-morning/cover.png` | `images/published/elder-cycle/family-morning-title-en.webp` |
| elder-family-morning | `coloring/elder-family-morning/scene-1.png` | `images/published/elder-cycle/elder-r6-family-023.webp` — building blocks |
| elder-family-morning | `coloring/elder-family-morning/scene-2.png` | `images/published/elder-cycle/elder-r6-family-028.webp` — packing the picnic |

Output paths are relative to this production directory; source paths are relative
to `docs/storyboard/`. Each chapter has `manifest.json` listing the ordered pages,
repository-relative source/output paths, dimensions, byte counts, SHA-256 values,
and a link to each page's `.provenance.json`. Each provenance file includes the
exact prompt, approved source hash, generated original path, final hash, and
visual review.

The bread scene initially acquired an extra table leg. A targeted built-in edit
replaced the table legs with one unambiguous pedestal while preserving the family
and action. Both prompts, generated original paths, and hashes are retained in
that page's provenance.

Read-only verification passed for all nine files: correct dimensions, matching
manifest hashes, roughly 84.6–90.2% near-white pixels, and less than 0.03% chromatic
raster variation. There are no intended colored fills or gray shading; normal
antialiased edges and faint generated raster variation are retained unchanged.
Total final PNG size: 12,577,093 bytes.

No current PDFs, public catalog, reader, library UI, or publication selections were
changed during this coloring lane. Root can append these three language-independent
pages to each chapter's next PDF editions in manifest order.
