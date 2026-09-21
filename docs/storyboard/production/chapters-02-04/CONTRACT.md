# Two-chapter production contract

User request, 20 September 2026: finish expanded Elder and Forest Academy chapter proposals; plan characters, environments, interior/spatial consistency and camera work before rendering; persist a reusable workflow independent of chat context. Reviewable complete chapters, not only a plan. No publication until review. Existing chapter and cover/miniature work must remain intact.

Workspace: `/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-cover-standard`.
Original source/references: sibling `mr-pinpin-original` (read only; other work in progress).

## Ownership

- Elder lane: `production/chapters-02-04/elder/`, `images/chapter-02-expanded/`.
- Academy lane: `production/chapters-02-04/academy/`, `images/chapter-04-academy/`.
- Workflow/review lane: `production/CHAPTER-PRODUCTION.md`, `production/chapter-template/`, `review/chapter-workshop.{html,css,js}`, `scripts/verify-chapter-workshop.cjs`.
- Root: this contract, shared manifest conventions, final integration/QA and cross-chapter decisions. No edits to official story manifests/reader code required for the proposal.

## Draft manifest interface

Each lane writes `chapter.json` in its production directory, plus `bible.md`, `shot-plan.json`, `REPORT.md`. Image paths below are relative to docs/storyboard (NOT manifest-relative). JSON:

```json
{
 "schemaVersion":1,"id":"elder","sourceChapter":"chapter-02","status":"proposed",
 "title":{"ru":"Мудрость Старейшины","en":"The Elder’s Wisdom","es":"La sabiduría del anciano"},
 "summary":{"ru":"…","en":"…","es":"…"},
 "cover":{"ru":"images/covers/chapter-02/title/title-ru-v1.png","en":"images/covers/chapter-02/title/title-en-v1.png","es":"images/covers/chapter-02/title/title-es-v1.png"},
 "preproduction":[{"id":"cast","title":"Character reference","src":"images/chapter-02-expanded/preproduction/cast-v1.png","description":"..."}],
 "sequences":[{"id":"arrival","title":{"ru":"…","en":"Arrival","es":"…"},"purpose":"..."}],
 "scenes":[{"id":"elder-01","sequence":"arrival","src":"images/chapter-02-expanded/scenes/scene-01-v1.png","width":1536,"height":1024,"alt":{"ru":"…","en":"…","es":"…"},"text":{"ru":["…"],"en":["…"],"es":["…"]},"source":{"kind":"original|expanded|new|silent","blocks":[0],"note":"..."},"camera":"...","continuity":"...","review":"...","reused":false}],
 "editorialNotes":["..."],"continuityNotes":["..."]
}
```

Academy id `academy`, sourceChapter `chapter-04`. Full multilingual text needed. Small optional headings/metadata may be English in production views. Every final scene should be usable as an uncropped standalone landscape. Existing chapter2 assets may be reused by existing image paths, marked reused=true and reviewed against new sequence. Add optional `before` image path for per-scene comparisons with old chapter2 when useful. No fixed image quota: sufficient physical/emotional transitions, no filler and no pressure to stop at twenty.

## Preproduction gate (internal, proceed autonomously)

Read original entire source and existing artwork, write source/adaptation map. Inspect character refs. Render and inspect canonical character study plus environment layout/clean plate BEFORE scene generation. Fix geography, dimensions/proportions, entrances, props, seating/blocking zones and camera axes in bible.md. Shot plan records each action/reaction/transition, cast, positions, camera and prop state. Design unknown interiors before showing them; do not introduce interiors that the story does not use. These are illustrated continuity references, not a calibrated 3D model. Full internal review is required; user will review final proposal afterward.

## Editorial direction

Elder expands existing first visit, preserves personal mystery and responsibility, keeps strong approved art where coherent. Separate dense ideas into small exchanges and observable responses. Any simple demonstration is an explicit adaptation addition; do not invent ancestor history as established canon. Preserve next-dawn invitation as a future thread.

Academy is an ordinary academy day on another day, not automatically the morning after bedtime, not asserted to be a first-ever school day. Include one substantial shared woodland activity, then source afternoon friendship/crown/listening/Mama-homecoming sequence. Original text repeats the afternoon passage twice: adapt it once. Lulu is rabbit, Tutu squirrel; inspect original images and existing modern Lulu before locking identities. Teacher/building/class activity details are proposed inventions and must be identified as such. Keep Elder's promised dawn follow-up as an explicitly unresolved future episode; do not claim this proposal depicts or cancels it.

## Art and provenance

Read imagegen skill and original production/WORKFLOW.md. Built-in imagegen only; one output per scene, not montage shortcuts. View references before use, inspect EACH output. Warm dimensional woodland style and identifiable cast. Exact prompt/refs/timestamps/dimensions/hash/review in same-basename JSON+MD. Version retries; no overwrites of approved imagery. One rejected attempt does not invalidate whole run; record it honestly. Do not claim hidden anatomy or exact scale certified. Only mild ordinary child-safe action.

## Completion

Complete both reading sequences, reusable preproduction pack, multilingual narration, browser workshop with reading/preproduction/comparison views, asset/structure tests and desktop/mobile visual review. Existing official reader remains unchanged; proposal report clearly states status. Keep REPORT.md current after each production phase so another session can resume.
