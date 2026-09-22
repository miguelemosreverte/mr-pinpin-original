# Papa arrival expansion: review implementation

Date: 2026-09-22. Draft only; this does not select or publish a release.

## Files and handoff

- Builder: `scripts/build-papa-arrival-review.cjs`.
- Browser page: `docs/storyboard/review/papa-arrival-expansion.html`.
- Inputs: this production directory's `story-plan.json`, optional `generation-plan.json`, generated images, and the current `stories/elder-papa-home.json`.
- Local review: <http://127.0.0.1:8783/storyboard/review/papa-arrival-expansion.html?lang=ru>.
- Reading view: append `&view=reader`.

Rebuild after each batch of generated images:

```sh
node scripts/build-papa-arrival-review.cjs
node scripts/build-papa-arrival-review.cjs --check
# Once all images exist, require a complete twelve-image proposal:
node scripts/build-papa-arrival-review.cjs --require-complete
```

Availability is captured at build time. Rebuilding and reloading reveals the next images. Missing illustrations have deliberate pending panels, never deliberately broken image elements. Runtime failures also fall back to the pending panel.

## Behavior

The comparison shows twelve rows, one for each proposed addition. Original images are explicitly labelled as published context, so repeated context is not presented as a replaced illustration. Two further rows disclose the proposed caption transitions on existing scenes 003 and 005, using the same artwork before and after.

The reading view has 28 pages: the original cover, all fifteen original scenes in order, and twelve additions. It applies the two proposed caption transitions only in the draft. Scenes 006–015 retain their existing pictures and prose. Technical prompts, coordinates, and generation records do not appear in the reading flow.

Russian is the default. English and Spanish are selectable. The URL retains language and view on reload. Images are full width at their natural aspect ratio, without crops; comparison columns stack on a narrow screen. A persistent draft label and footer state that approval is pending and the published chapter is unchanged.

The builder validates beat IDs, all three caption languages, original context references, sequence membership and ordering, retained original assets, and repository-local image paths. It uses relative browser URLs and has no build dependency outside the repository or Node standard library. Browser verification uses an already-installed Playwright package, not a new project dependency.

## Verification performed

- Node syntax check for builder and extracted inline browser JavaScript passed.
- HTML parsed successfully with the repository's existing parse5 dependency.
- Existing asset paths were resolved from the review location and checked against disk. At the initial one-image snapshot: 49 localized image references existed.
- Chrome via Playwright rendered fourteen comparison rows and 28 reading pages.
- Russian default, English and Spanish switching, comparison/reader buttons, and state retention after reload passed.
- Desktop 1440px and mobile 390px inspected; no horizontal overflow on mobile.
- Final verification decoded all twelve selected proposal PNGs in the actual HTTP-served page at 1536 × 1024. Selections 02, 09, 11, and 12 correctly use their `-v2.png` revisions. No browser page errors or failed HTTP responses were observed. All 28 reading-page images also decoded successfully.
- Desktop and mobile screenshots were captured outside the repository at `/tmp/pinpin-arrival-review-desktop.png` and `/tmp/pinpin-arrival-review-mobile.png`. The desktop screenshot was visually inspected with before/after artwork fully loaded.
- Final complete build: twelve selected proposal images ready, zero pending. `--require-complete` passed. Fourteen comparison rows remain (twelve image additions and two caption changes), and the complete reader has 28 pages. All comparison images retain their full 3:2 aspect ratio with `object-fit: contain`.
- Final checks repeated all three languages and both mobile view modes at 390px with no horizontal overflow. The Mama announcement in reading mode was captured and visually inspected at `/tmp/pinpin-arrival-mama-announcement.png`; mobile comparison capture is `/tmp/pinpin-arrival-mama-mobile.png`.

No canonical story manifest, selected cover, official publishing configuration, or existing artwork was modified by this implementation. No commit was made by this lane.
