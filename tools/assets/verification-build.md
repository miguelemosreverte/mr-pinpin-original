# HF migration: catalog and Pages verification

Status: focused verification passed. Full production materialization awaits the
primary agent's SSD coordination. No uploads, Git mutations, or media moves were
performed in this resumed lane. The HF quota blocker remains unresolved.

## Changes verified

- The existing camera fixture already sets `familyPreview: false` and tests that
  preview does not overwrite the saved reading camera. Its five unit tests pass.
- Promoted `shire-v1.webp` and `shire-depth-v1.webp` to production in policy and
  manifest, removing them from the proposed archive ignore file. The real-tree
  build check identified live WebGPU/calibration references to these textures.
  Their existing hashes and sizes were preserved and checked against local files.
- Added opt-in `unreferencedRole: "archive"` to the catalog policy. New supported
  binary assets under `docs` no longer need individual archive policy entries.
  Policies without this setting retain strict unknown-asset rejection.
- Regression tests cover default archive classification, registry promotion,
  retention of absent archive identities, preservation of explicit production,
  missing promoted assets, and rejection of a direct runtime fallback pointing
  at an archive asset.

## Verification

`node --test tools/assets/catalog.test.cjs tools/assets/build-pages.test.cjs scripts/atlas-camera-return.test.cjs`

Result: 32 tests, 31 passed, zero failed, one skipped. The hardware Chrome test
requires `PLAYWRIGHT_MODULE` and was not run. Small fixtures exercise actual
staging, production-only checkouts, missing archives, symlinks, size caps,
reference failures, and destination protection. No broad Node suite was run;
the primary agent retains coordination of that work.

`node tools/assets/catalog.cjs --check`

Passed without writing catalog outputs. Production: 321 assets / 665,756,385
bytes. Archive: 181 assets / 745,024,807 bytes. No absent archive identities needed
retention in this real-tree run; fixture tests cover that case. The catalog's
674,684,561-byte estimate includes non-production text and metadata.

`node tools/assets/build-pages.cjs --check`

Passed without creating a production artifact. Selected output: 411 files /
669,319,537 bytes, including 321 managed production assets, below the strict
950,000,000-byte cap. This validates selected production hashes, symlink
rejection, exclusions, and statically discoverable local references. Browser
runtime behavior and a complete materialized artifact remain unverified here.

## Automatic and manual boundaries

- Run `npm run assets:plan` after adding assets or changing registries. This
  refreshes metadata and the proposed ignore list; it does not upload, remove,
  or relocate media. `build:pages` does not implicitly refresh the catalog.
- On refresh, known binary extensions anywhere under the configured `docs` root
  default to archive when neither allowlisted nor referenced by the configured
  production registries. This includes new chapter drafts, review, model,
  comparison, and authoring assets. Existing audited production paths remain.
- Book, illustrations, covers of every status, family sprite/face/production
  registries, video variants, and all JSON files in the stories directory promote
  referenced assets automatically. Missing required production assets fail.
- New direct HTML/CSS/JS asset paths require a production policy entry. The build
  rejects discoverable local references to missing or archive files; it cannot
  infer arbitrary computed URLs. Computed paths and fallback families rely on
  the audited production allowlist and runtime tests.
- New extensions, roots, registry types, and managed symlink locations require
  explicit policy updates. Excluded review/model/authoring trees remain excluded
  from Pages even if a registry accidentally attempts to promote their contents.
- Missing optional archives keep their prior manifest identities. A missing
  archive with no prior identity fails rather than inventing a hash.
- `assets/archive.gitignore` remains a proposal. Applying exclusions or removing
  archive media still requires verified HF receipts; classification is not a
  verified remote backup.

## Handoff

Primary agent: document the refresh step and these boundaries in the root
workflow guidance. Coordinate SSD-backed full build and any broader verification.
Storage/sync lane: consume the updated manifest (321 production / 181 archive),
particularly the two textures removed from archive scope. No full production
artifact was materialized on the Air.
