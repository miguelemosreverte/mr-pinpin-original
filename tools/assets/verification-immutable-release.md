# First immutable Pages release

Published 2026-09-22 without changing the old site or rewriting source history.

## Identifiers

- Authoring source: `miguelemosreverte/mr-pinpin-original`.
- Source snapshot: `d8e4493e1fc1f6e87b3d11e64dcf193d4213a4df`.
- New deployment repo: https://github.com/miguelemosreverte/mr-pinpin-pages
- Deployment commit: `6f2c31d`.
- Successful workflow: https://github.com/miguelemosreverte/mr-pinpin-pages/actions/runs/35692850929
- Public site: https://miguelemosreverte.github.io/mr-pinpin-pages/
- Release: `636d0c1c5c652ee40c72e0754ef2d795feffb485d33e2c26d8e07e47cf06164c`.
- Archive SHA-256: `5d0023f5b51adaf211e8f7ece559b99735c2ecabc80df91db7f718e1e19e19ad`.

## Preservation and deployment evidence

1. Existing allowlist builder produced 598 files, 755,844,681 bytes, with 502
   production-media entries. No image conversions or runtime edits in this release.
2. Every packaged file was independently hash-compared with the primary source
   checkout's docs tree: 598 matches, no differences.
3. Deterministic packaging produced a 743,637,847-byte archive. The existing HF
   adapter uploaded it under its content-addressed key in the approved public
   bucket, then verified a fresh SDK download. A second, anonymous HTTPS download
   also matched its full SHA-256 before the success receipt was written.
4. The generated Pages materializer downloaded anonymously to a fresh SSD
   location and validated all 598 file identities during strict extraction.
   A separate `diff -qr` against the original artifact returned no differences.
5. GitHub Actions independently repeated anonymous download and per-file
   verification, uploaded the Pages artifact, and deployed successfully.
6. The new collection URL returned HTTP 200. Browser checks are recorded in
   `verification-pages-cutover.md`, including the new base URL and screenshots.

The first Pages commit contains eight text files totaling 105,525 bytes and no
image/video/archive blobs. Local `.git` was 192 KiB after pushing, compared with
about 2.6 GiB in the preserved legacy authoring repository. The deployed site is
still about 756 MB; Git repository size and site size are different measurements.

## Reproducible local evidence

All large outputs are on the mini's external SSD under
`/Volumes/TB4/mac-mini-storage/shared/`:

- `pinpin-pages-immutable-20260922/`: original verified build artifact.
- `pinpin-release-package-20260922/`: archive, manifests, and upload receipt
  containing `verified: true` and `anonymous_verified: true`.
- `pinpin-pages-anonymous-verified-20260922/`: fully verified anonymous restore.
- `pinpin-publication-backup-20260922/`: separate production/master preservation
  job; see `verification-publication-backup.md` for its own completion evidence.

Publisher tests: 11 passed. Backup-script tests: 4 passed. Existing storage
adapter tests: 27 passed. Full Node test suite passed. Publisher tests include
determinism, tamper/path/link rejection, stale-selector protection, rollback,
anonymous transport, and materializing the generated template in a subprocess.

## Safety boundaries

No originals were deleted, no media was untracked, and no Git history was
rewritten. The original website remains online at its existing address.
The new repo receives only release manifests and deployment tooling. Keep
previous manifests and HF objects for rollback; never force-push release history.
HF storage is mutable, so these are application-enforced integrity guarantees,
not provider-enforced write-once retention.
