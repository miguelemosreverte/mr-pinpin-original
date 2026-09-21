# Chapter workshop implementation and editorial review

Status: workflow/review software implemented. Independent Academy visual review is complete for all36 proposed scene positions; coordinator final integrated review remains ongoing. No official-reader change, publication or commit was performed by this lane.

## Durable deliverables

- `../CHAPTER-PRODUCTION.md`: reusable source → character/space bible → inspected-reference gate → shot plan → per-scene QA → whole-chapter review workflow. This is an illustrated continuity pack, not a calibrated digital 3D model. Its workflow link is now repository-relative `WORKFLOW.md`.
- `../chapter-template/`: empty bible/chapter/shot-plan templates, scene and shot-plan JSON schemas, setup instructions. Empty placeholders are not fabricated chapter content.
- `../../review/chapter-workshop.html`, `.css`, `.js`: RU-default chapter selector; RU/EN/ES; clean complete uncropped reading sequence; preparation pack; separate scene-production mode with source/camera/continuity/review; optional before/after; full-image links; scene counter, next/previous and sequence navigation; missing-manifest/image placeholders and refresh/retry controls.
- Optional `miniature` accepts a path or `{src}` and appears in preparation mode. It does not replace title cover or reading scenes.
- `scripts/verify-chapter-workshop.cjs` at repository root: safe storyboard-relative paths, ID uniqueness, sequence coverage/order, complete three-language title/summary/alt/narration, silence rules, source evidence, image availability/dimensions/SHA-256, adjacent sidecars, new-art prompt/reference/timestamp/review fields. Explicit filesystem legacy fallback only for reused/before assets. Declared covers, miniatures and preproduction art are checked.

Commands: `node scripts/verify-chapter-workshop.cjs --self-test`; `node scripts/verify-chapter-workshop.cjs --allow-pending --json` during generation; strict `node scripts/verify-chapter-workshop.cjs` once complete. Pending mode is not a completion pass.

Workshop route: `/storyboard/review/chapter-workshop.html`. The coordinator is restarting the local 8782 server after the temporary environment disappeared. Browser URLs use the existing local-first/original-fallback storyboard contract; this lane did not change that server.

## Actual historical validation

Before the temporary-directory reset, self-tests passed and progress audit reported two manifests,66 scenes (30 Elder,36 Academy),5 reference entries and29 checked image variants with zero structural/hash errors. Missing renders/reviews were explicitly pending. Those counts were an in-progress snapshot, not a final assertion.

Existing Playwright with installed headless Chrome ran36 route/language/view/viewport cases:2 chapters ×3 languages ×3 views ×2 widths (1440 and390). No page JavaScript errors or horizontal overflow. Loaded images retained native ratios; reading mode contained no production details. RU default, next-scene and sequence selection worked. A mocked404 manifest produced a pending panel with navigation hidden. Mobile reading/preproduction and desktop comparison screenshots were visually inspected.

The historical `/tmp` browser JSON/screenshots no longer exist after the handoff. This report records checks actually observed in the conversation; it does not claim those artifacts are still retrievable or replace the coordinator’s final post-reset browser checks. No new browser pass was run while the remaining art was being produced.

## Independent full written-draft/source read

Read original source chapters2/4, all initial draft scenes in RU/EN/ES, bibles, shot-plan structures and progress reports. No narration edited. The Elder arrival/listening/help demonstration/quill mystery/dawn promise/departure arc is coherent; invented twig demonstration is identified, no named ancestor history invented, dawn lesson stays future, final silent frames remain separate.

Academy gives one substantial listening walk then the original friendship, crown, quiet listening and Mama-homecoming progression. It is an ordinary later school day, not the first day or necessarily the morning after bedtime. Source afternoon duplication is adapted once. Teacher/place/activity/punchline additions are identified. Anecdote remains oral; crown stays with Lulu. No blocking written source-chronology or coverage issue found. Full visual continuity is tracked separately in `ACADEMY-VISUAL-QA.md`.

Findings sent to coordinator at the time (verify current resolution; not assumed still open):

1. Both lane reports were stale preproduction descriptions despite scene generation; durable gate/progress/rejection/next-step records needed updating.
2. Spatial bibles had useful prose axes but no explicit origin/+X/+Y/+Z or per-shot position/target/axis-side coordinates. Add nominal art-direction coordinates, not claims of calibrated geometry.
3. Gate ledger needed actual selected reference paths, reviewer/timestamps and observed findings instead of generic acceptance strings.
4. Elder05 EN “I thought you might come” weakens RU/ES/source certainty; “I felt you would come today” aligns.
5. Elder11 EN “what needs our help” is less precise than RU/ES “what help is needed”, which matches demonstration.
6. Academy01 RU unspecified day versus EN/ES afternoon is a minor time-wording discrepancy; can align without story changes.

No tests or invisible anatomy were invented or certified. Publication and user approval remain separate from this proposal workshop.

## Final lane handoff

All36 Academy scene positions were individually visually reviewed; see `ACADEMY-VISUAL-QA.md` for exact versions, hashes, corrected rejects and minor caveats. This lane produced targeted corrections11/13/17/25/30/34 with adjacent exact provenance. Final36 report hashes and six owned correction sidecars match durable PNG bytes. No post-reset browser claims are added here; root owns final integrated verification.
