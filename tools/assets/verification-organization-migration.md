# Organization migration: documentation and template verification

Date: 2026-09-22. Scope: current documentation and publishing-template orientation.

## Canonical locations

- Source: https://github.com/mr-pinpin/mr-pinpin-source
- Publishing: https://github.com/mr-pinpin/mr-pinpin.github.io
- Readers: https://mr-pinpin.github.io/
- Storage, unchanged: https://huggingface.co/buckets/miguelemosreverte/mr-pinpin-archive

Local checkouts remain `mr-pinpin-source` and `mr-pinpin-official` under
`/Users/miguel_lemos/anastasia-pinpin-repos/`. The remote publishing name does not
rename the local directory. GitHub repository redirects do not automatically
redirect old Pages URLs; any source legacy Pages site is noncanonical.

## Changes

Updated source `README.md`, `AGENTS.md`, `PUBLISHING.md`, `assets/README.md`,
`assets/bucket-README.md`, `tools/assets/backup-publication.md`,
`tools/publishing/README.md`, and the README/AGENTS strings in
`tools/publishing/pages_template.py`. Updated only the current published-reader
link in `docs/storyboard/README.md`, preserving the rest of that document.
Updated the official checkout's `README.md` and `AGENTS.md` with organization
links and the unchanged local checkout path.

The bucket README is ready for the operator's public metadata upload. No HF
upload was performed by this lane. No runtime logic, workflows, package format,
assets, historical reports, release records, selector, or Git remotes were changed
by this lane. No Git staging, commits, pushes, or deployments were performed.

## Verification

- `python3 -B -m unittest discover -s tools/publishing -p 'test_*.py' -v`:
  all 11 tests passed, including generated-template offline materialization,
  archive safety, tampering, rollback, and upload-verification gates.
- Focused assertions passed for canonical organization/source/site links in
  eight source orientation files and both official docs; source storage
  references still name `miguelemosreverte/mr-pinpin-archive`.
- `git diff --check` passed in both checkouts.
- Scanned current docs, scripts, workflows, publisher, and runtime HTML, JS,
  CSS, and JSON for the old personal GitHub/Pages URLs and old Pages prefixes.
  No matches remain outside excluded historical review/model/comparison/authoring
  trees. Historical comparison links were intentionally not rewritten.
- Reviewed the official diff: only README/AGENTS changed; release manifests,
  selector, workflow, and materializer are untouched.

## Release and deployment boundary

No hardcoded old runtime URL requiring a new release was found. Runtime
navigation remains relative and the workflow obtains its Pages URL dynamically.
The selected immutable release includes `storyboard/README.md`: its existing
archived link remains historical. Publishing the updated downloadable README
requires a future newly packaged release, not mutation of the current archive.
This documentation detail does not require a runtime rebuild for the org move.

Deployment evidence and final public smoke checks belong to the main operator,
not this lane. The operator reports successful run `35700304196` and opened
library/atlas; independent live verification was not performed here. Final
deployment signoff remains with the operator and the separate live report.

## Operator signoff

Both repository transfers completed and admin access was verified. Local origin
remotes now point to the organization; local directories and linked worktrees
remain unchanged. Previous personal repository URLs resolve to the new owners.
Official deployment `35700304196` succeeded, including full archive and per-file
verification. The existing release selector and manifests were not changed.
The separate [live audit](verification-organization-live.md) passed 33 standard
checks plus 16 additional language checks at the organization URL. Library and
atlas were opened using the operating system's `open` command.
Documentation-only commits skip CI; the already verified production bytes remain
served by the successful deployment above.
