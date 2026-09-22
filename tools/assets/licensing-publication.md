# Licensing publication

Status: COMPLETE. Upload, fresh readbacks, and anonymous materialization passed.
Date: 2026-09-22. No release selection or deployment was performed by this lane.

## Prepared workspace

Read `PUBLISHING.md` and `tools/publishing/README.md`. All build, package,
download, and materialization outputs will remain on the mini's external SSD:

`/Volumes/TB4/mac-mini-storage/shared/pinpin-licensing-publication-20260922/`

After the explicit commit handoff, `git archive` streamed exactly commit
`02d81bc3c274e23f46c7519af6bcb0d4eee971ec` from the source repository to a new
`source/` directory on the mini. No working-tree files or concurrent dirty edits
were copied. No archive was stored on the Air. The existing mini dependencies
were reused through `NODE_PATH`; no source files were rewritten.

Readiness checks on 2026-09-22 passed:

- Existing `pinpin-hf-transfer/` contains all 502 production-media paths.
- Every file was freshly SHA-256 and size checked against the existing production
  preservation manifest: 751,884,605 bytes, zero mismatches.
- Existing Node build dependencies load successfully on the mini.
- The mini's `/opt/homebrew/bin/python3` has HF SDK 1.27.0.
- External SSD free space at preparation: 3,110,677,114,880 bytes.
- Readiness process exited successfully before the commit handoff.

## Release handoff

The release selected before this update was
`636d0c1c5c652ee40c72e0754ef2d795feffb485d33e2c26d8e07e47cf06164c`.
Existing baseline evidence is retained in the shared SSD directories
`pinpin-pages-immutable-20260922/`, `pinpin-release-package-20260922/`, and
`pinpin-pages-anonymous-verified-20260922/`.

## Candidate release

- Source commit: `02d81bc3c274e23f46c7519af6bcb0d4eee971ec`.
- Release SHA-256: `9c1a4d8e7ed8fcd9dcbd297a248ffc94999369dd2f7801148884f26d12871dea`.
- Archive SHA-256: `3e3e6b0d5a76b076ba4c7e3a4f553380b8035838354fa8d9205cf7a0d8c1e05e`.
- Archive size: 743,640,902 bytes.
- Artifact: 603 files, 755,857,620 bytes, below the 950,000,000-byte budget.
- Package: `pinpin-licensing-publication-20260922/package/` under the shared SSD.
- Upload receipt: `pinpin-licensing-publication-20260922/upload-receipt.json`.
- Upload receipt SHA-256: `64d4d86438cb2b00ec41eb27573dae3dd439c4d563d6b3a49cf05048e8bbcd8d`.

The production allowlist builder passed its checksums and reference checks.
Every one of the 603 package manifest entries was independently compared against
the corresponding committed snapshot file by byte count and SHA-256.
All 502 production-media entries match both the old and new release manifests
and the committed preservation manifest: 751,884,605 unchanged bytes.

Exactly five files were added under `permissions/`: `index.html`, `LICENSE`,
`LICENSE-MIT`, `CONTENT-LICENSE.md`, and `THIRD-PARTY-NOTICES.md`.
Only `storyboard/library.html`, `storyboard/library.css`, and
`storyboard/README.md` changed. The README difference is solely the historical
reader URL becoming `https://mr-pinpin.github.io/storyboard/?chapter=1&lang=en`.
No files were removed. Machine-readable comparison: `comparison.json`.

The publisher uploaded the content-addressed archive to the existing public
bucket, verified a fresh SDK download, and separately verified an anonymous
HTTPS readback before writing its successful receipt. A disposable candidate
template is used for anonymous materialization; the official checkout and its
selector remain untouched.

Final anonymous materialization succeeded into `anonymous-materialized/`.
An independent inventory and SHA-256 pass matched all 603 files to the package
manifest, with no missing or extra files. Final evidence is `complete.json`;
the external orchestration script is `run-publication.py`. All required exec
sessions finished successfully; no job remains running for this lane.

## Bucket README

The README came from the same committed snapshot, not the working tree.
The only mutable object updated was bucket-root `README.md`; a separate
`HfApi(token=False)` fresh download matched all 3,737 bytes and the stable remote
Xet identity. Cached SDK authentication was reused with progress bars disabled.

- README SHA-256: `5d0d636682e16029a64b5f9ce5fd54f2cfd0632eb33143de62338f29d0dade53`.
- README receipt SHA-256: `9a51ff85001d5705f3fbc1e4c4363d17d647ebca0e0f39d978fbe79c90f9f2dc`.
- Evidence: `bucket-readme/receipt.json`, `README.md`, `README.anonymous.md`,
  and retained `README.before.md` under the job directory.

## Tests and limitations

Publisher suite: 12 passed in the committed snapshot.
Broader Node suite on mini: 325 tests, 312 passed, 4 failed, 9 skipped.
The four failures require data/tools outside this clean snapshot: archived
`shire-depth-v1.png`, archived `chapter-02-landscapes/shot-02.png`, the external
`@fal-ai/client` installation, and `magick`. No test or runtime changes were made
to hide these failures. An initial run also needed the mini's Homebrew directory
added to `PATH`; the reported totals are from the corrected environment.

## Boundaries

The operator retains ownership of release selection and cutover. This lane does
not commit, push, select a release, delete assets, change bucket privacy, or alter
Git history. Existing release objects, media, and caches remain untouched.

## Operator cutover

After reviewing the complete upload receipt, anonymous materialization, and
unchanged-media comparison, the operator selected release
`9c1a4d8e7ed8fcd9dcbd297a248ffc94999369dd2f7801148884f26d12871dea`
with the expected previous selector. Official commit
`fb95a330d33e14655334371c1ebe10d5409701ec` was pushed normally.
[Deployment 35705401859](https://github.com/mr-pinpin/mr-pinpin.github.io/actions/runs/35705401859)
completed successfully, including GitHub's independent archive/file verification.
The public `/permissions/` route returned HTTP 200 and was opened with the
operating system's `open` command. Browser results are recorded separately in
[the live verification report](licensing-live-verification.md).
