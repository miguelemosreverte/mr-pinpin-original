# Papa arrival: focused illustration corrections

Status: the six-row revision is approved for publication. Publication integration
is handled separately; this pack preserves the original images and review history.
The earlier five-candidate verification below is historical and does not describe
the final selected revision.

The [comparison report](../../review/papa-arrival-corrections.html) shows one row
per shot in `corrections-plan.json`: the exact current draft image on the left and
the proposed replacement on the right. Missing candidates are visibly marked as
pending. The report shows uncropped images in two columns on desktop and stacks
them on mobile. Select an image to inspect its original size.

The report links to the existing [expanded reading draft](../../review/papa-arrival-expansion.html?lang=ru&view=reader)
and [original expansion report](../../review/papa-arrival-expansion.html?lang=ru).
The correction plan retains the exact prompts, reference choices, and separate
before/output paths. Old images are preserved for comparison.

## Build and verify

Run from the repository root:

```sh
node scripts/build-papa-arrival-corrections.cjs
node scripts/build-papa-arrival-corrections.cjs --check --require-complete
```

The first command supports an incomplete correction set. The second fails if any
candidate is absent, any before image is absent, a path leaves the repository, a
shot lacks a title/issue, or shot IDs repeat. It does not write the HTML.

Inspect each completed candidate for intact window glazing and credible reflections,
separate mother and baby bodies, understandable supporting paws and contact points,
consistent character anatomy, and unchanged storybook rendering. Availability is
not an artistic approval; the final visual review remains necessary.

## Initial interface verification

The five-row pending report was checked in headless Chrome at 1440 × 1000 and
390 × 844. All five original images loaded. Desktop displayed two columns;
mobile displayed one. Both retained native image aspect ratios with no
horizontal overflow. Completed candidates require a final rebuild and image-load
check when generation finishes.

## Earlier five-candidate verification

All five candidates are present. The strict `--check --require-complete` build
passed. Final Chrome checks at 1440 × 1000 and 390 × 844 confirmed:

- Five comparison rows with all ten before/after images loaded at 1536 × 1024;
  no pending placeholders, cropping, or horizontal overflow.
- Two columns on desktop and one on mobile.
- The Russian reading draft displays all 28 images, including the cover, and
  selects `arrival-01-v2`, `arrival-02-v3`, `arrival-03-v2`, `arrival-10-v2`, and
  `arrival-12-v3` from this correction set.
- No JavaScript errors or failed story-image requests. The only incidental
  console request was the preview server's missing `/favicon.ico`; the comparison
  builder now includes an empty data favicon to avoid that request.

The completed desktop overview was visually inspected: all five image pairs
rendered in full. Local screenshots are saved at:

```text
/Users/miguel_lemos/.codex/tmp/papa-arrival-corrections-final-desktop.png
/Users/miguel_lemos/.codex/tmp/papa-arrival-corrections-final-mobile.png
```

## Further revision: original-scene image override

The local arrival builder accepts `story-plan.json` → `originalImageOverrides`,
an object mapping an existing original scene ID to a repository-relative image
path. For example, the new window image can replace `elder-r6-family-002` in the
continuous reading draft while preserving its captions, dimensions, and position.
The original scene lookup and left-side comparison contexts remain untouched.
Unknown scene IDs, paths outside the repository, absolute paths, or absent images
fail the build. No canonical story file is edited by this mechanism.

The revised comparison plan contains six rows: the original window scene,
three added window views, Mama's revised carrying pose, and restoration of the
earlier doorway image.

## Six-row revision: final browser verification

Both report builders passed strict `--check --require-complete` validation.
Chrome checks at 1440 × 1000 and 390 × 844 confirmed six comparison rows, all
twelve before/after images loaded, no pending placeholders, native image aspect
ratios, and no horizontal overflow. The layout remains two columns on desktop
and one column on mobile.

The continuous reader was checked in Russian, English, and Spanish on both viewport
sizes. Every version loads all 28 pages/images and the selected six-row changes:

- `family-002-window-v2.png` overrides `elder-r6-family-002` in the reading sequence.
- `arrival-01-v4.png`, `arrival-02-v4.png`, and `arrival-03-v5.png` supply the added
  window views.
- `arrival-10-v3.png` supplies the revised carrying pose.
- `arrival-12-v2.png` restores the earlier doorway image.

The original comparison context remains `elder-r6-family-002.webp`. Original and
draft caption data match the canonical scene exactly in all three languages;
the original dimensions are also preserved. No missing story assets, JavaScript
errors, or mobile overflow were found. The existing preview-server favicon 404
remains an incidental reader request only.

Updated comparison overview screenshots:

```text
/Users/miguel_lemos/.codex/tmp/papa-arrival-corrections-r3-desktop.png
/Users/miguel_lemos/.codex/tmp/papa-arrival-corrections-r3-mobile.png
```

## Preserved baseline before official integration

Before the runtime manifest was expanded, its exact bytes were saved as
[`original-elder-papa-home.json`](original-elder-papa-home.json): 15 original story
scenes plus the cover. This snapshot is immutable; do not refresh it from the
runtime manifest. SHA-256:

```text
249ebd8d621a63dcaf16f5cacdf0d47bc49a0cc3504280f760a468ad8baf075c
```

Both review builders now read this preserved baseline. The expanded review takes
its original scene lookup and captions from the snapshot. The focused correction
report takes its original chapter count from the snapshot and retains the exact
before/output pairs in `corrections-plan.json`. Official integration therefore
cannot add another twelve scenes to the review or replace its historical original
comparison contexts. Review badges and footers describe an approved review archive,
without asserting that the official chapter remains unpublished.

Both builders were rebuilt successfully with `--require-complete`: 28 reading
pages, 12 additions, six correction rows, and no pending images.
