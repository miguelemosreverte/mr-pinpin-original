# Publishing merge review

## Reconciliation implemented

The main operator subsequently authorized the bounded implementation. Runtime
reconciliation is now complete; the findings below retain the original review
context and are no longer an outstanding edit list.

- Restored both chapter cover approvals while retaining all local miniature
  objects and the existing miniature resolver unchanged.
- Restored cover loading/rendering in reader/library, prepend/replace fallbacks,
  print CSS, and script dependencies with fresh cache versions. Preserved local
  atlas navigation, language controls, loading/race handling, and WebGPU links.
- Added the prepended title cover to reading-position tracking. Language changes
  preserve the visible cover anchor even when total document height changes.
- Restored canonical Home JSON byte-for-byte from origin/main (number 3,
  bedtime-cover, twenty narrative scenes), restored compatible validation and
  localized original-cover fallback, and retained local artwork readiness checks.
- Restored the twelve chapter cover provenance files exactly from origin/main.
  Restored missing production/TITLE-COVERS.md and verify-title-covers.cjs; adapted
  the verifier fixture to the local navigation DOM and added navigation checks.
- Restored library chapter-link query preservation. Public review links remain
  absent from the owned reader/library surfaces; local reports remain available
  in the source tree. No asset bytes or Git state were changed by this lane.

Verification passed:

`node --test scripts/standalone-home.test.cjs scripts/atlas-miniatures.test.cjs`

13 passed, zero failed/skipped. Covers canonical Home loading, all twenty scenes,
localized fallback titles, incomplete story rejection, artwork readiness, atlas
miniature approval separation, dimensions/provenance, loading, and fallbacks.

`node scripts/verify-title-covers.cjs`

Passed: twelve approved cover PNG/sidecar identities; 48 reader/library route,
language, and approval/preview combinations; scene/prose/spread preservation;
missing-registry and image fallbacks; language changes with localized covers;
returnTo/returnPlace/coverPreview preservation; prepended-cover and Home-cover
position preservation; no links to excluded review routes in the owned surfaces.

These are focused Node checks, not browser/layout verification. Full browser
checks for four destinations and all languages, catalog/build refresh, and the
upload/untrack/commit/conventional merge/push remain with the primary operator.

## Original review

The initial read-only phase compared the working files against local `origin/main` at
`a8527f52ac43ae8ebe73aed807d6b97a23f40197` ("Standardize title covers and publish
approved chapter one and two covers"). That phase performed no fetch, runtime
edits, Git mutations, tests, uploads, or fleet-internal calls and wrote only this
report. The main operator owns the approved public HF upload and publishing.

## Findings in publishing order

### P1: Local files would undo approved chapter covers

`docs/storyboard/covers.json:8` marks chapter 1 proposed; chapter 2 has the same
regression. Both are approved on origin/main. All other pre-existing registry
fields match; local additions are the four independent `miniature` objects.

The local reader and library also dropped the cover integration, independently
of those statuses: index/library HTML no longer load `title-covers.js`, reader
initialization no longer loads its registry, reader rendering no longer prepends
chapter covers or replaces standalone covers, and library cards no longer use
the approved cover resolver. Fixing the registry alone will not publish covers.

Required merge:

- Preserve origin/main's top-level `status: "approved"` for all four cover IDs,
  including chapter-01 and chapter-02. Overlay each local `miniature` object
  without altering its independent approval: chapters 1/2 and timber remain
  proposed; Home remains approved. Preserve localized title/alt/assets,
  dimensions, version, routes, and prepend/replace placements from origin/main.
- Keep the local `title-covers.js` implementation. It includes all remote
  behavior plus `resolveMiniature`, which the local atlas uses. Do not replace
  it with the remote version and lose miniature support.
- In index.html and library.html, restore the deferred `title-covers.js` script
  before reader.js/library.js. Retain local reader-navigation.css and local
  navigation DOM. Update affected script/style cache versions when publishing.
- In reader.js `initialize` (currently line 272), restore
  `await window.titleCovers.load()` before either story/chapter initialization.
  In `render`, resolve the cover for `chapterId` and `language`; restore the
  remote prepend slot before the spread loop (currently line 94), and apply
  replacement covers for scene index 0 after assigning base image fields
  (currently lines 106-109). Keep remote fallback behavior: absent prepend cover
  removes its slot; failed replacement reuses the scene artwork.
- In library.js, restore registry loading before first render (currently lines
  123-128), standalone cover resolve/apply at lines 58-61, and chapter cover
  resolve/apply at lines 85-93, including portrait aspect ratio and fallback reset.
- Restore the single `.title-cover-slot .spread-cover` rule from remote
  edition.css and both `.title-cover-slot` rules from remote paper.css. Other
  reader/library/editorial/print stylesheet content shows no tracked difference
  against origin/main; retain local reader-navigation.css separately.

### P1: Remote Home story plus local loader makes Home unavailable

The remote JSON has `number: 3` and cover scene ID `bedtime-cover`. Local JSON
omits number and uses cover scene ID `title`. Local standalone-stories.js:18
requires `chapterNumber(chapter) === 1`, while its default parameter uses
`story.number`. Thus `complete(remoteStory)` rejects number 3. Its validator
also requires `title` at line 84. Restoring remote JSON without merging the
loader will hide Home in the reader, library, and atlas, whose story resolution
all uses this loader.

Required merge:

- Use origin/main's home-sweet-home.json as the canonical story: number 3,
  bedtime-cover followed by bedtime-01 through bedtime-20, 21 spreads, all
  translations, image versions, dimensions, and localized cover alt text.
  All 20 narrative scenes, all spreads, cover paths, and titles are already
  structurally identical locally. There is no competing narrative to merge.
- Restore the remote Home branch in `complete` so it delegates directly to
  `completeBedtime`, and restore its validator's number 3 / bedtime-cover schema.
  The remote validation is the smallest known-compatible choice. Keep existing
  timber composition and its separate chapter-1/chapter-2 validation unchanged.
- Align `load`'s Home branch with that validator. Local URL chapter restrictions
  at line 99 must not conflate the story's number 3 with timber part selectors;
  the remote Home branch did not restrict the optional chapter parameter.
  The local artwork HEAD readiness check may remain after schema validation.
  It checks the three original localized covers plus 20 scene images; missing
  optional standardized covers must not become an additional availability gate.
- Restore remote `edition` cover localization using
  `index === 0 && story.spreads[0]?.style === 'cover'` (currently line 126 uses
  `(story.number ?? 1) === 1`). Otherwise number-3 Home falls back to the English
  cover scene when Spanish/Russian readers need the original localized fallback.
- Local subtitle, sourceDraft, and sourceDraftSha256 are extra metadata only.
  They are not needed for runtime navigation or the 20-scene story. Preserve the
  canonical remote JSON; retain local provenance separately if desired.

### P1: Chapter-cover approval provenance would be lost

Exactly twelve existing cover provenance files differ: each of
`images/covers/{chapter-01,chapter-02}/title-{en,es,ru}-v1.{json,md}` under
docs/storyboard. All six JSON differences are only status and the missing
approval object. The remote JSON says approved and records Miguel's approval
at `2026-09-20T19:54:37.730198+00:00`. Remote Markdown appends the matching
Publication approval section, which explicitly leaves generation-time notes
historical. Take those twelve files from origin/main in full.

Do not rewrite historical proposed language in generation prompts, plan files,
or production.html as if it were a new approval. Those existing plan/report
files already match remote; preserve the later approval record alongside them.
Keep all local miniature assets and their separate provenance additions.

### P2: Preserve library query parameters when restoring cover links

Local library.js:83 replaces remote URL construction with
`'./?chapter=' + number + '&lang=' + lang`, dropping coverPreview, returnTo,
returnPlace, and other existing parameters. Restore remote chapter-link URL
construction: copy current search, delete story, set chapter and lang. Local
standalone links already preserve search parameters. Keep the local WebGPU map
target at library.js:26 and library.html's map link.

Do not blindly restore remote camera-study links: local Pages intentionally
excludes docs/storyboard/review. Keep those links absent until a public review
adapter actually provides reachable destinations. Public HF archive approval
does not itself create those HTML review routes.

## Local atlas navigation that must survive

Keep these local behaviors while grafting back remote cover rendering:

- Reader `syncNavigation` (lines 12-38), allowed returnTo targets atlas-webgpu.html
  and atlas.html, returnPlace allowlist home/lake/elder/bridge, and language
  preservation in both return links.
- Reader `route` preserving existing query parameters while normalizing story
  versus chapter, loading/race handling in `openRoute`, and localized errors.
- Map links `reader-map` / `reader-map-end`, current-language toggle and menu,
  accessibility/focus/Escape handling, and the matching reader-navigation.css.
  Remote controls-toggle/library-label handlers depend on the old DOM; do not
  restore those handlers over the local DOM.
- Scene-relative reading position, disconnected-render guard, and existing
  print infrastructure. Index currently hides print/preview buttons; preserve
  that local choice while restoring cover print layout. Integrating a prepended
  cover introduces a non-scene slot: include that slot in position preservation
  or later verify language changes while on the title page, since the current
  helper only locates `.scene` elements.
- Local atlas.html/atlas-webgpu.html script dependencies, atlas CSS/modules,
  miniature resolver, image fallbacks, and atlas-preview propagation of
  returnTo/returnPlace. AtlasStories maps home directly to
  `story=home-sweet-home` without a chapter parameter; canonical remote metadata
  is compatible once the standalone loader is merged correctly.

## Asset evidence and scope limits

Compared all 111 files present in origin/main under images/covers and
images/standalone/home-sweet-home against their actual local filesystem contents:
99 byte-identical, 12 provenance differences listed above, zero missing files.
Every remote media file in these trees is byte-identical locally, including
the standardized covers, original Home fallback covers, and narrative artwork.
No regeneration or asset substitution is required to preserve this publication.

Some remote-tracked paths are untracked in the current branch. Consequently,
plain `git diff origin/main` labels existing local files as deleted. This review
used direct filesystem reads versus `git show origin/main:path` for those files;
the apparent deletion list is not evidence that their content is absent.

The origin/main reference was read, not fetched. No tests or browser checks were
run, as requested. Main operator should merge chapter/cover/story requirements
first, then refresh the catalog and validate publishing plus atlas return paths.
All upload/untrack/commit/merge/push actions remain with the main operator.
