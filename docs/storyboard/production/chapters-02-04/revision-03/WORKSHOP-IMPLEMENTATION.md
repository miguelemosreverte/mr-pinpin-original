# Revision03 workshop support

Status: implementation complete; real revision03 content and final browser review belong to the production/root lanes. No official publication, commit or Academy copy was created.

The version selector now includes a localized Elder-only third proposal. `?revision=3&chapter=elder` resolves `production/chapters-02-04/revision-03/elder/chapter.json`; bible, shot plan, report and optional planning diagram use that same folder. Existing reading/preproduction/production hooks and full uncropped images remain unchanged.

Choosing Academy from revision03 switches the actual selection and URL to revision02. A direct Academy/revision03 link also normalizes to revision02 before fetching. The third option is disabled while Academy is selected and explicitly says Elder in RU/EN/ES. No fake revision03 Academy manifest or silent content substitution is used. Returning to Elder keeps the currently chosen revision; the reader can explicitly select its third proposal.

The verifier accepts `--revision 3` and audits only Elder. `chaptersForRevision(3)` returns only Elder; requesting an Academy revision03 folder throws. Default revision1 and explicit revision2 still audit both chapters. JSON output includes `auditedChapters` so scope is explicit. Existing schemaVersion1 supports the new edition: real previous images/text use `before`/`beforeText` with contextual `beforeNote`; new discovery beats do not require a fabricated earlier image.

## Verification actually performed

- Self-tests passed, including revision03 argument parsing, Elder routing/scope, rejection of unavailable Academy03 and invalid/duplicate revision arguments, plus all existing language/path/provenance/comparison tests.
- Revision1 strict audit passed:2 manifests,66 scenes,10 preparation entries,92 checked image variants/sidecars; zero errors/pending.
- Revision2 strict audit passed:2 manifests,106 scenes,22 preparation entries,150 checked image variants/sidecars; zero errors/pending.
- Revision3 with no saved manifest correctly reports only Elder pending. Strict mode exits1; `--allow-pending` exits0 while explicitly saying in-progress. This is not a completed chapter pass.
- Headless Chrome at390 and1440 pixels, RU/EN/ES:6 focused cases passed revision03 folder/document routing, comparison text, no horizontal overflow and switching to actual Academy02 without any Academy03 fetch. Two additional real deep-link cases passed Academy03 normalization and unchanged default Elder01 routing. Checked2026-09-21T06:11:11Z.
- Revision03 browser content in those6 cases was intercepted only in memory using two actual revision02 scenes, artwork and narration. No fabricated chapter file was saved. These checks exercise routing/UI behavior, not the future revised story. Root owns the final actual revision03 browser matrix and sequence review.

CSS required no change. Source/reuse boundaries are in [SOURCE-REVIEW.md](SOURCE-REVIEW.md). Before-text factual correspondence to revision02 is an editorial final-manifest review, not something inferred merely from a valid local image path.
