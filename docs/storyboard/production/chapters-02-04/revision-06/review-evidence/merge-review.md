# Elder publication merge compatibility review

Read-only source inspection of release `9c8e779`, common base `a8527f5`, and fetched `origin/main` (upstream `6aa2262`). No repository edits or Git mutations performed by this lane.

## Findings

The push rejection is a non-fast-forward integration issue. Upstream adds an extensive atlas and a production/archive asset split. It does not require replacing story media URLs with Hugging Face URLs. Production assets remain in Git at their existing document-relative URLs; HF is archival storage only.

### Required preservation and adjustments

1. Preserve upstream `.github/workflows/pages.yml`, `package.json`/lock, all asset tools, policy, archive manifest identities, and upstream atlas files. Pages now runs `npm ci`, `npm run test:assets`, and `npm run build:pages`, uploading `.pages-site`, not raw `docs`.
2. Preserve upstream `index.html` reader DOM and `reader.js` navigation. New IDs include `reader-map`, `reader-map-end`, `language-toggle`, and `reader-languages`; old controls-toggle/library-label wiring is incompatible. Apply Elder chapter navigation insertion to upstream reader and retain asset cache-busting changes. Keep upstream current-scene language-position restoration.
3. Preserve upstream Home Sweet Home schema and artwork HEAD-readiness check in `standalone-stories.js`; merge the Elder validator/load/edition/available additions around these. Extend the new verifier mock `fetch(file, options)` to recognize HEAD via file existence rather than attempting JSON parsing, otherwise its legacy Home assertion falsely fails.
4. Preserve upstream `titleCovers.resolveMiniature`, used by atlas. Merge Elder `assetMatches` into title validation. If the new chapter is connected to atlas, miniature validation must explicitly accept the five known `images/published/elder-cycle/<part>-miniature.webp` assets for six known edition IDs. Existing PNG miniature validation and derivative srcset behavior must remain intact.
5. Preserve all four existing upstream cover records and derivatives, then add the six Elder cover records. During active root merge, duplicate `derivatives` keys appeared in the first three old cover records; remove duplicate keys because ordinary JSON parsing hides them.
6. Preserve upstream library atlas navigation, apply Elder library card addition. `available()` should return only the combined Elder cycle so the library does not show six duplicate cards. Individual part routes remain loadable.
7. New reader chapter navigation should preserve `returnTo` and `returnPlace` query parameters while setting `story`/`lang`, so upstream map-return context survives part changes. Current release replaces the entire search string.
8. Run `npm run assets:plan` after integration and commit the refreshed manifest/archive proposal. `assets/policy.json` already traverses all JSON in `docs/storyboard/stories` and seeds `covers.json`, so all 181 Elder WebPs are automatically production; no blanket production path or HF upload is necessary. Generated/computed chapter-nav thumbnails are already covered through registry miniatures.
9. Run focused asset tests and a production build. The builder checks every production hash, missing files, dangling local references, no symlinks, and a hard size limit below 950,000,000 bytes. Prior artifact was about669MB; new Elder media adds about80MB, within the nominal budget, but actual merged build is required.
10. The export provenance JSON under `docs/storyboard/images/published/elder-cycle` is excluded from the artifact by the upstream images-sidecar rule. Its historical source PNG paths do not need to become public. The six public story manifests have no dangling provenance paths.

## Atlas discoverability

Upstream `atlas-stories.js` maps `elder` to original `chapter=2`, `coverId=chapter-02`. Keeping it preserves the existing atlas but the new cycle is reached through library/direct URL. If publication intends the new expanded edition to replace the Elder map destination, change only the Elder entry to `story:one-day-in-the-forest`, `coverId:one-day-in-the-forest`, `route:story=one-day-in-the-forest`, and extend miniature validation as above. Do not delete original chapter2.

## Publication URL

Combined Russian edition after successful Pages deployment:
https://miguelemosreverte.github.io/mr-pinpin-original/storyboard/?story=one-day-in-the-forest&lang=ru

This report is compatibility analysis, not a deployment verification. Root owns merge, tests, push, and checking public HTTP/browser behavior.

## Authorized implementation follow-up

Root assigned implementation ownership of `docs/storyboard/title-covers.js` and `docs/storyboard/atlas-stories.js` only. Added strict six-edition-ID mapping to the five known Elder miniature WebP paths, version1 only. Legacy PNG miniature approval and responsive derivatives remain unchanged; Elder files do not inherit PNG derivative construction. Repointed existing Elder atlas entry to the combined `one-day-in-the-forest` story and cover. Map callers in both atlas modes still append their existing `returnTo` and `returnPlace` parameters.

Validation: seven existing upstream runtime miniature tests passed using a temporary harness (the tests were absent from sparse worktree); 51 focused positive/negative whitelist, route and return-wiring checks passed. Full original miniature suite contains legacy all-PNG/all-derivatives fixture assumptions and expects two standalone loads, now three; root was notified to adapt that suite if running it. No Git mutations or other repository files changed by this lane.

### Test fixture follow-up

Root additionally assigned `scripts/atlas-miniatures.test.cjs`. Updated fixtures retain all four legacy PNG/dimension/SHA/provenance and derivative checks, and validate all six Elder records using their known WebP path, version1, actual VP8 dimensions, and export-manifest SHA/byte count. Added thirty invalid path/version checks. Concurrent atlas availability now expects three standalone story loads. Nine runtime tests pass. Two asset-backed tests still require root to materialize the sparse checkout binaries; the Elder miniature files were temporarily absent following sparse expansion. Confirmed a release miniature Git blob is VP8 1024x1536. Reader part and combined links now preserve existing search parameters in root’s edits.
