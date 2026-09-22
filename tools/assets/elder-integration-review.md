# Elder integration review

## Verifier follow-up completed

After deployment at b40556f, the primary authorized a bounded verifier fix in
mr-pinpin-elder-release. Only scripts/verify-title-covers.cjs was edited there:
the exact registry expectation now includes the original four IDs plus the six
elder IDs, and the missing-registry library fallback expects three images.
The original four-cover asset checks and all regression loops remain unchanged.

`node scripts/verify-title-covers.cjs` passed (exit 0): twelve approved PNGs and
sidecars, 48 reader/library release and synthetic-proposal cases, preserved
scenes/prose/spreads, registry/image fallbacks, title localization, query/map
return preservation, and cover reading position. This is a local filesystem/VM
verifier with no URL arguments; localhost:8783 was not needed. No runtime files,
assets, index entries, or commits were changed by this follow-up.

The concrete issue below is retained as audit history and is now resolved in
the release worktree's uncommitted verifier change.

Bounded read-only audit of mr-pinpin-elder-release against main `6aa2262` and
author commit `9c8e779`. The working files and index changed during the audit as
the primary operator continued integration; conclusions below use the latest
read. No release-tree edits, Git mutations, builds, or test-suite runs by this
lane. Only this report was written in the primary repository.

## Concrete issue

The inherited `scripts/verify-title-covers.cjs` has two stale release assertions:

- Line 82 requires registry IDs to equal the four original IDs exactly. The
  integrated registry correctly has those four plus the collection and five
  chapter entries, ten total. This assertion will fail on the intended release.
- Line 156 requires two adventure images when covers.json is unavailable.
  The library now correctly contains timber, Home, and One Day in the Forest,
  so that fallback count should be three.

Update those expectations without removing the original four-cover regression
cases. New collection/chapter coverage belongs in the existing elder verifier.
This is a verification mismatch, not evidence of broken publication behavior.

## Runtime result

No blocking runtime regression found in the reviewed integration files.

- Reader differs from main only by the new chapter-navigation block. Current
  map return links, returnTo/returnPlace preservation, language menu, cover
  prepend/replace behavior, title-cover reading-position handling, and async
  navigation protection remain intact.
- Library retains main's WebGPU target, parameter-preserving reader links,
  approved cover resolution, and lack of public links to excluded review pages.
  Its addition selects the collection's approved miniature for its card.
- Existing four cover records, including approval, assets, and miniature
  derivatives, are structurally identical to main. The full registry and all six
  new story files match author commit 9c8e779. The Home and timber validators
  remain alongside the new elder validation and localized internal title pages.
- reader-navigation.css, edition.css, paper.css, editorial.css, print.css, and
  library.css match main. reader.css retains the author's chapter-navigation
  rules. HTML retains current main navigation and loads updated reader/cover/
  standalone scripts with the elder release cache versions.
- All 181 elder-cycle WebPs from the author commit exist after sparse checkout
  was disabled. This was an existence check, not a new image/hash audit.

## Five-chapter visibility

The intended library design is one collection card, not five separate cards.
`standaloneStories.available()` explicitly adds one-day-in-the-forest; the elder
verifier explicitly checks that individual parts do not duplicate library cards.
The collection renders all five chapter links before its story pages. Each part
has its own direct route and a "Read all five chapters" return link.

The chapter IDs and page counts (including one title page each) are:
papa-home 16, family-morning 21, forest-path 23, elder-house 36, beneath-roots 70.
The combined collection has 166 scenes/spreads and five chapter-navigation entries
at offsets 0, 16, 37, 60, and 96. No chapter content was lost in the merge.

Read-only evaluation of both latest indexed and working modules confirmed:
all six story IDs validate; AtlasStories.href('elder', 'en') resolves to
`index.html?story=one-day-in-the-forest&lang=en`; and the collection miniature
resolves to `images/published/elder-cycle/papa-home-miniature.webp`.

Initially the atlas route and WebP-miniature support existed only in working
files. A subsequent read confirmed both in the index too, consistent with the
primary operator staging during this audit. Preserve these takeover edits and
the asset-manifest/test changes owned by the primary. The stale chapter=2 route
constants in atlas.js/atlas-webgpu.js are fallback-only: normal links prefer
AtlasStories.href, and the preview also uses AtlasStories' resolved route.

Browser behavior and final Pages artifact verification remain with the primary
operator, who is running the release checks. No separate heavy work was started.

## Completed in primary

The verifier expectation fix is complete in PRIMARY mr-pinpin-original. The main
operator mirrored the three-line addition/two-line replacement with apply_patch
and confirmed `node scripts/verify-title-covers.cjs` passes there. The registry
assertion now expects all ten IDs, and the missing-registry library assertion
expects three story images. The original four-cover regression assertions remain
intact, including 48 reader/library cases, asset/provenance checks, fallbacks,
localized titles, navigation/query preservation, and cover reading position.

The earlier instruction to update these expectations is resolved, not pending.
No additional tests were run for this documentation-only completion note.
