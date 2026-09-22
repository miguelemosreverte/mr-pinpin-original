# Immutable Pages publishing

This tool packages an existing, verified `build-pages.cjs` artifact, preserving
every file's bytes and relative path. It does not build, convert images, create a
remote repo, configure Pages, stage Git changes, commit, push, or change the old
site. The operator owns those actions. All implementation is under this folder.

Use Python 3.10+ (CI uses 3.12). Packaging, templates, and materialization use only
stdlib. Upload additionally needs `tools/assets/requirements.txt` in the selected
Python environment and the existing `tools/assets/hf_store.py` beside this folder.
Run large operations on the mini/TB4; allow room for the build, archive, HF cache,
SDK verification download, and a fresh materialized site. Use actual mount paths,
not symlink aliases. Output parents must exist; outputs themselves must be new.

## Authoring to release

1. Start from the intended source checkout/commit. If production assets were
   untracked, hydrate them with the verified production preservation manifest:
   `python3 tools/assets/hf_store.py pull --manifest tools/assets/production-preservation.json --profile archive --root . --cache EXTERNAL_CACHE`.
   This is needed only when that preservation manifest exists and assets are
   absent. Keep existing asset identity and verification requirements.
2. Run the authoring repo's tests/build checks and materialize a new Pages artifact
   with `node tools/assets/build-pages.cjs --dest NEW_ARTIFACT_DIRECTORY`.
3. Package the verified artifact using its full source commit ID:

   ```sh
   python3 tools/publishing/publish.py package \
     --artifact NEW_ARTIFACT_DIRECTORY \
     --source-commit FULL_SOURCE_COMMIT \
     --out NEW_PACKAGE_DIRECTORY
   ```

4. Explicitly upload, using the same Python environment as the HF adapter:

   ```sh
   python3 tools/publishing/publish.py upload \
     --package PACKAGE_DIRECTORY --cache EXTERNAL_CACHE \
     --receipt NEW_RECEIPT_PATH.json
   ```

   The public bucket is fixed to `miguelemosreverte/mr-pinpin-archive`. The adapter
   uses an archive-role entry, checks existing remote identity, and downloads for
   SHA-256 readback. The publisher then performs a separate anonymous HTTPS GET
   and verifies its bytes/hash before writing a receipt. It never creates the
   bucket or changes its visibility. If anonymous verification fails, no success
   receipt is written. The object may already have uploaded; retrying is safe.
5. For the first release generate a NEW template directory:

   ```sh
   python3 tools/publishing/publish.py template \
     --package PACKAGE_DIRECTORY --out NEW_TEMPLATE_DIRECTORY
   ```

   The operator reviews and copies its tiny contents to the fresh
   `miguelemosreverte/mr-pinpin-pages` clone. Do not copy the package/archive, the
   source checkout, or its `.git` history. Template generation does not edit an
   existing clone. The template contains workflow, stdlib scripts, README/AGENTS,
   an immutable manifest, a selector, and ignore rules.
6. Verify the selected template via actual anonymous download before deployment:

   ```sh
   python3 NEW_TEMPLATE_DIRECTORY/scripts/materialize.py \
     --repo NEW_TEMPLATE_DIRECTORY --out NEW_VERIFICATION_DIRECTORY
   ```

   No URL argument, token, SDK, or CI secret is needed. For an additional offline
   check use `--archive PACKAGE_DIRECTORY/release.tar.gz`. Output is only retained
   after every tar file matches its manifest; failures remove that newly created
   output. Existing directories are never replaced. Keep the original artifact
   for an independent file-list/hash comparison.
7. Review selected SHA, source commit, totals, upload receipt and materialized
   output, then use ordinary commits/pushes in the Pages repo. Its workflow
   repeats anonymous verification before uploading/deploying the Pages artifact.
   Configuring GitHub Pages and changing any public site URL remain operator
   actions. The old repo/site can remain untouched and live throughout.

The package records the caller-supplied full source commit. It does not prove
that an arbitrary input directory was produced by that commit; the verified
build-to-package handoff is the operator's responsibility.

## Subsequent publication and rollback

`stage` means writing a release JSON file, never `git add`:

```sh
python3 tools/publishing/publish.py stage --package PACKAGE_DIRECTORY --pages-repo PAGES_CLONE
python3 tools/publishing/publish.py select --pages-repo PAGES_CLONE \
  --release NEW_MANIFEST_SHA --expected-current CURRENT_MANIFEST_SHA
```

Rollback uses that same explicit `select` command with a previous manifest SHA.
It requires the existing selector to match `--expected-current`, serializes its
own writers with a lock, and atomically replaces only the selector. Older
manifests/archives stay intact. Review, commit and push normally; no force-push.
After an interrupted selector operation, inspect `.release-selector.lock` before
manually removing a stale lock. This lock coordinates this tool, not external
editors. Staging/generating a template does not itself certify remote availability;
the verified upload receipt and anonymous materialization supply that evidence.

## Format and limits

- `release.tar.gz`: sorted regular files, USTAR headers, uid/gid/mtime zero,
  mode 0644, empty owner names, gzip mtime zero and no original filename. No media
  transformation. Reproducibility is tested with the same Python/zlib toolchain.
- `release-manifest.json`: canonical sorted-key JSON plus newline, source commit,
  each file's path/bytes/SHA-256, total, archive size/SHA-256/object/HTTPS URL.
- The manifest's SHA-256 names `releases/<sha>.json`. `release.json` is a tiny
  selector containing version and that SHA. CI verifies the manifest SHA first.
- `storage-manifest.json`: adapter-compatible archive-role plan. Upload derives
  its entry from the validated release manifest, not this convenience file.
- Total extracted files must be strictly below 950,000,000 bytes; archive at most
  960,000,000 bytes, at most 100,000 files, manifest at most 32 MB. Root index.html
  is required. USTAR name-length limits apply when packaging.
- Reject traversal, absolute/drive/backslash/control-character paths, duplicate
  and case-colliding paths, file/directory collisions, symlinks, hardlinks,
  special files, PAX/sparse members, undeclared/missing files, wrong sizes/hashes,
  and decompressed tar content exceeding the release budget. Extraction never
  invokes `tar.extract`/`extractall` or trusts archived ownership/permissions.

HF buckets are mutable, **not provider WORM**. Content-addressed keys and the
existing adapter enforce no conflicting overwrite during normal serialized
publication; readback and CI checks detect changed content. The SDK adapter has
no transactional create-if-absent guarantee against concurrent external writers.
Keep publishing serialized, keep prior objects, and restrict who can write the
bucket. External deletion or replacement can break availability but cannot pass
the selected archive/file hashes. Deterministic archives and hashes are integrity
checks, not signatures or a substitute for reviewing the publishing commit.

## Tests

`python3 -B -m unittest discover -s tools/publishing -p 'test_*.py' -v`

Small fixtures cover deterministic archives, copied-template materialization,
unsafe tar members, budgets, tampering, output protection, explicit rollback,
anonymous transport, and upload receipt gating. No production build is created
by this suite.
