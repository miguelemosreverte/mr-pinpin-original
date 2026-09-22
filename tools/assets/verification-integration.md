# Asset migration integration verification

Verified 2026-09-22. Archive migration and live deployment completed.

## Live publication

GitHub Pages deployment for merge commit `bf08635` succeeded:
https://github.com/miguelemosreverte/mr-pinpin-original/actions/runs/35688609195

Live Chrome verification passed on the public GitHub Pages URL: WebGPU atlas
rendered, all four destinations were available, and Chapter 1 (15 scenes),
Chapter 2 (16 scenes), Timber Tractor (34 scenes), and Home Sweet Home (21 scenes,
including its cover) opened successfully. Library rendered 34 chapter covers.
No JavaScript errors or failing same-site resource responses occurred in those
flows. The atlas and library were opened using the operating system `open` command.

Before deployment, the production artifact also passed all four readers in all
three languages, including localized approved title covers, and all four atlas
cover previews. Mobile navigation passed at 320/390px and desktop at 1440px.

The separate authoring backup is complete: 208 files / 799,047,393 bytes verified
by full remote download and SHA-256, with sources retained. See
`verification-authoring.md`. The public archive also contains a root guide and
catalog; production readers make no archive requests.

## Cutover update

Miguel explicitly approved the public HF archive. All 181 archive assets
(745,024,807 bytes) were uploaded and fresh-downloaded with matching SHA-256.
The SDK's HEAD metadata returned redirect-body lengths; the adapter now reads
authoritative bucket path-info while retaining downloaded checksum and remote
Xet-identity verification. The Python suite now passes 27 tests.

Applied the matching successful verification receipt: 111 indexed paths were
untracked, all working files retained. No archive binaries remain in the index.
Receipt: `/Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache/mini-upload-receipt.json`.

Approved remote covers and canonical Home story metadata were reconciled with
the local atlas navigation before commit `b855ccb`. Rebuilt production artifact:
411 files / 669,321,739 bytes at
`/Volumes/TB4/mac-mini-storage/shared/pinpin-pages-release-20260922`.
The full Node suite, 48 cover verification cases, and mobile/desktop reader
navigation checks passed again. The conventional origin/main merge retains both
histories. Historical pre-cutover observations follow below.

## Results

- Full local Node suite: 321 tests, 312 passed, 9 optional browser tests skipped,
  zero failures. On the mini, two environment-dependent tests failed because
  ImageMagick and the external FAL SDK installation were absent; both passed on
  the Air. No paid generation requests were made.
- Python storage suite on the mini: 25 passed, including fake-backend round trips
  and refusal to untrack files after failed verification.
- Materialized production artifact on the mini SSD: 411 files, 321 managed
  production assets, 669,319,537 bytes. Build verified hashes, selected references,
  exclusions, and absence of symlinks. Output:
  `/Volumes/TB4/mac-mini-storage/shared/pinpin-pages-verified-20260922`.
- Ran `scripts/verify-reader-navigation.cjs` against that artifact, served locally
  for the test. Passed at 320, 390, and 1440 pixels: approved controls, language
  selection, scene position preservation, atlas preview opening/dismissal,
  returning to the saved map camera, and hidden print controls. Also passed
  Chapter 2 in Russian, Timber Tractor in English, Chapter 1 print preview, and
  external return-URL rejection. No page JavaScript errors in the tested flows.
- Inspected the 390-pixel reader screenshot. Screenshots from the browser test
  are local scratch evidence in `/tmp/pinpin-reader-navigation`, not production
  assets. The temporary test server was stopped.
- Actual-checkout `assets:sync -- --dry-run`: 181 archive entries, 111 tracked
  paths; no uploads or Git writes. `git diff --check` passed.

## Initial cutover findings

The private HF bucket exists, but the attempted live upload was rejected for
private storage quota. Offline tests and a dry run are not remote backup proof.
Resolve capacity or obtain explicit public-visibility approval, upload using the
adapter, and apply its successful matching receipt before untracking any assets.
Preserve editable Blender sources separately from the catalogued review exports.

The working branch is ahead of and behind origin/main. No commit, merge, push,
history rewrite, archive untracking, or visibility change was performed in this
verification continuation. Integrate remote approved covers/story changes and
repeat the catalog/build checks before deployment; this artifact is the current
local version, not a claim of deployed or fully merged state.
