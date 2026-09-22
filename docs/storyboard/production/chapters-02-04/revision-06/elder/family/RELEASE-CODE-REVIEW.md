# Independent release code review — 2026-09-22

Scope: standalone-stories.js, title-covers.js, reader.js, scripts/build-elder-edition.py and the new public-edition verifier. No artwork reviewed in this task. Root owns browser and serving checks.

## Findings and disposition

1. Fixed during review: individual editions contain one chapterNav item, so reader's index+1 labeled every chapter as1. Root/release lane added explicit part number to assembler/navigation, validated it in completeElder, and reader now uses that number. New negative test rejects wrong numbers.
2. Fixed in this lane by explicit root assignment: legacy title-cover test required registry exactly4 and missing-registry library exactly2 stories. It now requires all4legacy entries and all3public adventures, while new6edition entries have their dedicated validator. Existing48route/language/approval tests, prose/spread preservation, fallback tests and asset/provenance checks remain.
3. Fixed in this lane: legacy miniature verifier iterated every registryentry and expectedPNG miniaturefolders, rejecting new ElderWebP entries. It now explicitly validates the4legacy entries. Canonical↔flat title bytecomparison still verifies both physical copies regardless of which exactallowedpath isregistered. New181WebP assets are dedicated-editionverifier scope.
4. Existing approval state preserved: legacy miniature verifier --release correctly rejects chapter01 miniature status proposed. Normalreviewmode passes. This is not a new Elder asset issue; do not silently rewrite old approvalstates to make a check green.

## Results

- node scripts/verify-title-covers.cjs — PASS:12approvedPNGcoverassets/sidecars,48reader/library route-language-state cases, existing scene/prose/spread preservation, missingregistry/missingimagefallbacks.
- node scripts/verify-cover-miniatures.cjs — PASS:4PNGminiatures, dimensions/hashes/provenance/currentstates;12canonical/flat titlecopies byteidentical.
- node scripts/verify-cover-miniatures.cjs --release — expected FAIL on pre-existing proposedlegacyminiature; noapprovalstatechanged.
- node scripts/verify-elder-edition.cjs --schema-only — PASS:6editions166/16/21/23/36/70scenes, RU/EN/ES internalcovers, route/pathwhitelist, malformedcases and existingstory/coverfixtures. Assetpresence deferred to root's full release check.

Localization uses scene.images[lang] for every internal title page, not just index0. The first cover can still be replaced through the shared registry. Existing tractor/bedtime loadbranches and chapterroutes remain intact; only whitelisted newIDs take the newbranch. Same-language links are constructed withURLSearchParams. PrintCSS hides newnavigation.

Remaining nonblocking UX limitation: each individualchapter's navigation shows itself plus Readallfive; readers reach siblings via thecyclecontents rather than next/previouslinks. Builder depends on the separate production/export validation gates for sourceSHA andassetpresence; its pending flag alone is not a substitute for those final root checks.
