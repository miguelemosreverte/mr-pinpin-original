# Working on Mr. PinPin

- Read `PUBLISHING.md` before releasing. The separate `mr-pinpin-pages` repository
  is a lightweight deployment ledger, not an authoring checkout. Never copy this
  repository's Git history or binary assets into it. Use the verified,
  content-addressed release tools in `tools/publishing/`.
- Preserve the original book and approved story/image content. Storage migration
  must not regenerate, resize, compress, or shorten the published book.
- Keep source, recipes, provenance, and asset manifests in Git. Production media
  stays in Git; non-production media belongs in the configured Hugging Face archive.
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
