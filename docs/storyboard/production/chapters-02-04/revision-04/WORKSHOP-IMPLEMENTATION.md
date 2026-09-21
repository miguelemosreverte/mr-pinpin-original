# Revision04 workshop support

Implementation complete. Final revision04 manifest, selected art and actual full-story browser review remain with the production/root lanes. No official reader, prior manifest, commit or publication changed.

The existing chapter workshop now offers a localized fourth Elder proposal in Russian, English and Spanish. `?revision=4&chapter=elder` fetches `production/chapters-02-04/revision-04/elder/chapter.json`; preparation/production document links use that same folder. Earlier revision1 remains the default, and revisions2/3 retain their paths. Academy selected from revision4 (or entered via a direct Academy4 link) changes the actual selector and URL to revision2 before fetching. Elder-only versions3/4 are disabled for Academy. No Academy4 copy or hidden substitution was created.

Existing schemaVersion1 comparison support already handles actual revision03 `before` images, complete `beforeText` and localized `beforeNote`. No fabricated prior counterpart is required for new beats. Final correspondence of those comparisons remains an editorial manifest check; safe paths alone do not prove it. The existing reading/production hooks, image sizing, planning-diagram link and pending-state UI are preserved. CSS required no change.

`verify-chapter-workshop.cjs --revision 4` audits only Elder and rejects an unavailable Academy4 folder. All existing schema, language, source, image/hash/provenance and optional planning-diagram checks remain active. Unknown revision5 and duplicate revision arguments remain errors.

## Verification actually performed

- Self-tests passed, including revision4 CLI parsing, Elder folder/scope and rejection of Academy4/unknown5, plus prior structural/comparison/path tests.
- Strict revision1 passed:2 manifests,66 scenes,10 preparation entries,92 image variants/sidecars; no errors or pending items.
- Strict revision2 passed:2 manifests,106 scenes,22 preparation entries,150 image variants/sidecars; no errors or pending items.
- Strict revision3 passed:1 Elder manifest,83 scenes,10 preparation entries,109 image variants/sidecars; no errors or pending items.
- Revision4 currently has no chapter.json: strict mode correctly exits1 with only Elder pending; `--allow-pending` exits0 while explicitly reporting in-progress. This is not a chapter-completion pass.
- Headless Chrome at390/1440px in RU/EN/ES:6 targeted cases passed version labels, revision04 folder/document routing, actual prior-image/text comparison rendering, no horizontal overflow, and chapter change to actual Academy02 without fetching Academy04.
-3 real deep-link cases passed: Academy04 normalizes to Academy02/49 scenes; default remains Elder01/30 scenes; explicit Elder03 remains83 scenes. No browser page errors in the6 routing cases.
- Browser checks completed2026-09-21T09:40:13.616Z against existing local port8782. Revision04 responses in those6 cases were intercepted only in memory using two actual revision03 scenes, text and artwork. No fabricated manifest was written. Root owns final real revision04 content/sequence/browser review.

Read [CONTRACT.md](CONTRACT.md) and [USER-BRIEF.md](USER-BRIEF.md) for revision04 narrative authority. This UI work does not approve unfinished story assets.
