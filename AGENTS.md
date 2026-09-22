# Working in Mr. PinPin Source

- Canonical source: `https://github.com/miguelemosreverte/mr-pinpin-source`, local
  `/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-source`. Use this checkout
  for authoring; old local names are compatibility symlinks only.
- Canonical reader site: `https://miguelemosreverte.github.io/mr-pinpin-official/`.
  Public storage stays `miguelemosreverte/mr-pinpin-archive`; do not rename its
  objects or rewrite historical reports/manifests to match repository renames.
- Read `PUBLISHING.md` before releasing. The separate `mr-pinpin-official` repository
  is a lightweight deployment ledger, not an authoring checkout. Never copy this
  repository's Git history or binary assets into it. Use the verified,
  content-addressed release tools in `tools/publishing/`.
- Preserve the original book and approved story/image content. Storage migration
  must not regenerate, resize, compress, or shorten the published book.
- Keep source, recipes, provenance, and asset manifests in Git. Restore absent
  production media through `npm run assets:restore-production`; backing up media
  does not authorize deleting working files or rewriting its Git history.
  Non-production media belongs in the configured Hugging Face archive.
- Read `assets/README.md` before generating, moving, restoring, or publishing assets.
  Use the catalog and `npm run assets:sync`, not manual deletion or blanket staging
  of experimental binaries. A verified matching backup is required before untracking.
- Never commit tokens, credential files, signed download URLs, or local cache data.
  Use standard Hugging Face authentication. Never change archive visibility silently.
- Prefer the mini and TB4 for large transfers, caches, and site build outputs.
  Set `PINPIN_ASSET_CACHE` outside the checkout; pass an external build output path
  when the Air is low on disk space.
- Run focused asset tests and a production build before pushing. The Pages artifact
  must contain only production assets, with valid checksums and no local symlinks.
- Keep local review tools usable through verified asset restoration. Do not describe
  archived or proposed studies as approved production content.
- Do not rewrite Git history to remove old assets without explicit approval.
- Renamed GitHub repository URLs redirect; old Pages URLs do not automatically
  redirect. The source legacy site may deploy under `/mr-pinpin-source/`, but
  link readers to `/mr-pinpin-official/`. A source push does not select an official
  release. Rollback explicitly selects an existing release SHA in the official
  checkout, with ordinary commits/pushes and retained archive objects.
