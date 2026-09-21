# Starting a chapter

Copy this directory into a new chapter production folder. Empty strings and arrays are intentional placeholders, not fabricated story content and not a valid finished chapter. Fill the bible from inspected source material first, then the complete shot plan. Pass the internal reference gate before rendering scenes.

`scene.schema.json` describes each selected scene in `chapter.json`. `shot-plan.schema.json` describes the richer camera/blocking plan. The manifest keeps camera and continuity summaries as strings; the shot plan retains coordinates, axes, gaze and prop states. The current two-chapter contract defines the surrounding manifest fields and relative path convention.

Add `REPORT.md` with status, completed gates, selected/rejected versions, actual review findings and the next step. Record gate evidence in the bible, including actual references and UTC review times. Schemas validate data shape; they do not replace source reading or visual review.

For each generated PNG, save exact prompt and reference roles, UTC start/end, dimensions, SHA-256, source output path and honest review in same-basename JSON and Markdown. Use `startedAt`, `finishedAt`, `sha256`, `width`, `height`, `prompt`, `references`, `review` as standard provenance keys. An `original` or `expanded` scene needs source block references; `new` and `silent` scenes need an explicit source/adaptation note.

Declare every reading sequence and assign every scene to exactly one declared sequence. Keep sequence groups contiguous and in declared order. Include action, reaction and transition coverage as the story requires, without imposing a fixed scene count. Complete title, summary, alt text and narration in `ru`, `en`, `es`; reserve empty narration arrays for explicitly silent scenes.

Use optional `before` for a previous image of the same scene, not a generic illustration. Mark `reused: true` only for selected historical artwork reviewed against the new narrative. Use `preproduction` entries with IDs, titles, image paths and descriptions to expose the actual selected cast/layout/plate references in the workshop. Omit a genuinely unavailable cover rather than inventing one; any declared asset is checked.

An optional `miniature` may be a storyboard-relative image path or an object with a `src` path. It appears in preparation mode and is checked with the selected artwork; it does not replace the chapter's reading illustration sequence or its language-specific title cover.
