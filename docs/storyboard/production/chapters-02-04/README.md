# Expanded Elder and Forest Academy proposals

**Latest work:** [Revision06](revision-06/CONTRACT.md) expands the Elder outing into five adapted chapters: Papa Comes Home, A Morning Together, Through the Forest, The Elder’s House, and Beneath the Roots. See the [current production report](revision-06/elder/REPORT.md) and [five-chapter preview](http://127.0.0.1:8782/storyboard/review/chapter-workshop.html?revision=6&chapter=elder&lang=ru&view=reading). Academy remains [revision02](revision-02/academy/REPORT.md). Earlier proposals below are preserved history. Official editions remain unchanged.

Start here in any future session. User commissioned complete, carefully paced proposals for both chapters, supported by reusable preproduction and a documented workflow. These files are the production state; conversation context is not required.

- Shared interface and editorial scope: [CONTRACT.md](CONTRACT.md)
- Reusable method: [../CHAPTER-PRODUCTION.md](../CHAPTER-PRODUCTION.md)
- Elder: [elder/bible.md](elder/bible.md), [elder/shot-plan.json](elder/shot-plan.json), [elder/chapter.json](elder/chapter.json), [elder/REPORT.md](elder/REPORT.md)
- Academy: [academy/bible.md](academy/bible.md), [academy/shot-plan.json](academy/shot-plan.json), [academy/chapter.json](academy/chapter.json), [academy/REPORT.md](academy/REPORT.md)
- Browser review: [../../review/chapter-workshop.html](../../review/chapter-workshop.html)
- Shared chronology and canon: [world-state.json](world-state.json)

Both proposals are complete and ready for feedback: Elder30 reading images and Academy36, in Russian, English and Spanish. See [ROOT-REVIEW.md](ROOT-REVIEW.md) for final verification and [review-evidence/browser-results.json](review-evidence/browser-results.json) for36 passing browser cases. Neither proposal replaces the official chapter until user review. Previously proposed title miniatures are separate work and remain intact.

Use the durable worktree `/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-cover-standard`. The original checkout has independent work in progress; do not reset or overwrite it. Run `python3 scripts/serve-chapter-workshop.py` from this worktree to serve the review on port 8782. It falls back to the original checkout for legacy image files omitted by sparse checkout. Open `http://127.0.0.1:8782/storyboard/review/chapter-workshop.html`. A full checkout needs no fallback.

Check: `node scripts/verify-chapter-workshop.cjs` from the worktree. Final browser QA and source/copy reviews are recorded in `ROOT-REVIEW.md` here.

Direct previews: [Elder](http://127.0.0.1:8782/storyboard/review/chapter-workshop.html?chapter=elder&lang=ru&view=reading) · [Academy](http://127.0.0.1:8782/storyboard/review/chapter-workshop.html?chapter=academy&lang=ru&view=reading). These are local review links, not public GitHub Pages URLs.
