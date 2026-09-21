# Revised-proposal workshop support

Status: implemented and browser-checked. Source research is complete in SOURCE-ARC.md. Revised chapter artwork/manifests remain a separate production task; no publication or official-reader change.

## Behavior

- Default and `?revision=1` load the original `production/chapters-02-04/{elder|academy}/chapter.json`.
- `?revision=2` loads `production/chapters-02-04/revision-02/{elder|academy}/chapter.json`. Visible version selector is localized RU/EN/ES (Previous proposal / Revised proposal). Switching keeps language/view and resets the scene to the selected chapter’s beginning.
- Preparation and production document links follow the selected revision’s bible, shot plan, manifest and report. Existing `.reading-scene`/`.production-scene` hooks and image-relative URLs are retained.
- Production comparison puts previous image and optional `beforeText` beneath its own label, alongside the proposed image and proposed text. On390px screens the two complete image/text groups stack. No crop or duplication of current narration below the details.
- Optional `beforeNote` explains a contextual comparison. It accepts localized RU/EN/ES or a plain production string. If previous narration was not recorded, say so; do not invent it. An explicitly empty earlier paragraph array renders a silent beat. New scenes with no `before` get only their real current image and narration.
- Reading mode remains free of source/camera/review/comparison notes. Pending manifests/images remain inspectable with refresh/retry. Fixed a transient mobile overflow from the loading placeholder inside a small cover slot.

## Validator contract

`node scripts/verify-chapter-workshop.cjs --revision 2` selects revised manifests; omission defaults to1. Existing `--allow-pending`, `--json`, `--self-test` remain. Invalid revision values/paths or repeated revision flags return usage error. JSON output includes selected revision.

`beforeText`, when present, requires a real safe `before` image path and all3 language paragraph arrays. Paragraphs must be nonempty strings; empty arrays are allowed for prior silence only when all3 languages agree. Localized `beforeNote` requires all3 nonempty translations. A plain nonempty string is also valid production context. Existing source/image/hash/sidecar checks are preserved.

## Actual verification

- Validator self-tests passed for safe paths, ID/sequence coverage, language completeness, silence, source evidence, image headers, revision paths/argument parsing, beforeText/context validation, template JSON and browser-script syntax.
- Default strict audit passed after changes:2 original manifests,66 scenes,10 reference entries,91 checked image variants and91 sidecars; zero errors, pending items or warnings. Reused original-checkout fallback remains explicit.
- Revision2 progress audit correctly reported both not-yet-saved manifests as pending with zero structural errors. This is not a revised-chapter completion claim.
- Browser checks used installed Playwright and headless Chrome against local8782.36 cases exercised real revision1 content:2 chapters ×3 languages ×3 views ×2 widths (1440/390).36 more exercised revised routing/comparison with in-memory intercepted manifests assembled from existing chapter records. No synthetic chapter files were saved.
- All72 cases passed: no page exceptions or horizontal overflow; loaded image elements retained native proportions; correct revision document links; clean reading flow; previous/current paragraphs in their own panes; earlier silence; no made-up before image for new beats. Revision switching, next-scene navigation and404 pending behavior passed.
- The first run exposed small-cover placeholder overflow while images were still loading. The CSS was fixed and all72 cases rerun successfully. Desktop and mobile comparison screenshots were then captured after explicitly decoding their real images and visually inspected. A regular390×844 viewport capture also confirmed the offscreen skip link stays offscreen; oversized element screenshots can include fixed off-viewport elements during capture.

Test run timestamp: 2026-09-21T01:25:56.907Z.

Temporary test script/result/screenshots: `/tmp/pinpin-workshop-revision02-qa/`. These are disposable verification artifacts, not revised chapter content. This durable report preserves the observed outcome if temporary storage disappears. Final real revision2 assets still require strict validation and whole-chapter browser review once supplied by production lanes.

## Independent Elder story-plan review

Read all57 English beats, full bible, source-adaptation map and every shot-plan entry against the exact USER-BRIEF and entire-book SOURCE-ARC.

No missing requested religious/archetypal story element observed: sacredness/religion/prayer and differing beliefs are named; pregnant human maternal/fertility goddess and new life are pictured/explained; male war/defender deity, threatened homes and protective strength are explicit; night is distinguished from destructive darkness; shared work connects power to later community survival. Human figures remain paintings, preserving Tarin’s later reveal. Source ancestral quill and future dawn appointment survive. Writing/books/artifacts, practical light, both thresholds, descent/landing/arrival, ascent and return are planned.

Findings sent to Elder lead/coordinator before preproduction (resolution belongs to lead):

1. **Concrete door geometry contradiction:** bible says inner door swings into the home against the east wall; shot18 says Elder pushes inward while standing in the home. Change action to pulling into room or unify the swing before rendering. This affects real hinge/landing continuity.
2. **Small dialogue precision:** beat34 defines war as people fighting one another; “groups of people” distinguishes war from an ordinary children’s quarrel with little extra language. No request to soften/remove the requested war-deity content.

This is a written-plan review, not acceptance of unrendered visual eyelines, mural placement, staircase geometry or translated dialogue. Production images and final RU/ES still need their own checks.

## Code fingerprint at handoff

- `docs/storyboard/review/chapter-workshop.html`: `65f63bedfef3ae75a0d5ae2e922e09070f93c167a9bbcfcc0428818c67be4be4`
- `docs/storyboard/review/chapter-workshop.css`: `bd9af0656484a42975c761656cd7d40639fa6f8a007b5fdc34f541951199a3ed`
- `docs/storyboard/review/chapter-workshop.js`: `fc80394152eefbcbd15d7ec1368f277ad19f51538c9b19e8ceffc6d57590df9f`
- `scripts/verify-chapter-workshop.cjs`: `df18bbc0c93c7f98320de6f970becf71a7d6d33e26cdd2a6ea50bb763134feb0`

## Original-design preproduction provenance follow-up

Root authorized an empty image-reference list only for preproduction metadata that explicitly has `referenceMode: "original-design"`, `references: []`, and a nonempty `referenceRationale`. Exact prompt, timestamps, dimensions/hash and actual review are still required. Narrative scenes and miniatures retain the nonempty-reference rule. Asset cache distinguishes preproduction checks from stricter scene checks, so a loose earlier check cannot hide a missing scene reference.

Self-tests passed for accepting that honest preproduction record and rejecting the identical record as a scene, plus rejecting missing rationale/undeclared empty lists. Default strict audit still COMPLETE, zero errors/pending, now92 checked variants/sidecars (one asset receives both preproduction and stricter generated checks). Browser code unchanged by this follow-up. Elder lead notified to add truthful mural metadata; no fabricated reference paths.

## Optional spatial diagram follow-up

Manifest `planningDiagram` accepts a single chapter-local SVG/PNG basename, for example `floorplan.svg`. Preparation and scene-review document links expose it with RU/EN/ES labels using the selected revision folder. Browser and validator reject directories, traversal, URLs, query/fragment suffixes and other formats. The file must exist and be nonempty during the filesystem audit. This is a deterministic planning document, so no fabricated image-generation sidecar is required.

Self-tests passed for valid SVG/PNG names and unsafe paths; default revision1 strict audit remains COMPLETE: 2 chapters, 66 scenes, 10 reference entries, 92 checked variants/sidecars, no errors or pending. Parent owns final browser review of actual revision2 assets.

## Focused actual revision02 follow-up — 2026-09-21T03:49:10Z

Headless Chrome at390×844 loaded the real completed Elder revision02 manifest. The Russian Preparation “План пространства” link resolved to the revision02 Elder floorplan.svg and returned200 with SVG content. Scene review contained actual earlier and proposed narration under their respective images, and a new beat without a before image had no fabricated earlier panel. Document width did not overflow the mobile viewport. This was a focused DOM/network check, not another all-language/all-view browser matrix or a new screenshot review. Root owns the final actual-manifest matrices.
