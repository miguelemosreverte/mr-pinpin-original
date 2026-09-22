# Publication preservation

`backup-publication.py` preserves production media and Elder original PNG masters
in the existing public bucket `miguelemosreverte/mr-pinpin-archive`. It does not
edit runtime classification, remove files, untrack assets, or write Git state.
Existing archive and Blender backups are outside its selection.

## Reproduce

Prepare a new external job directory on the Air. Preparation reads the current
runtime and export manifests, validates their published identities, and copies
only selected PNG masters across the SSD mount. It freezes those manifests, its
script, and the existing HF adapter in the job directory.

```sh
python3 -B tools/assets/backup-publication.py prepare \
  --root /Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original \
  --masters-root /Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-cover-standard \
  --transfer-root /Volumes/TB4/mac-mini-storage/shared/pinpin-hf-transfer \
  --job /Volumes/TB4/mac-mini-storage/shared/pinpin-publication-backup-20260922
```

Run the frozen script on the mini, preferably in a persistent job. Its existing
transfer root must contain the production paths matching the frozen runtime
manifest. Heavy copies, hashing, uploads, and downloads stay on the mini/SSD.

```sh
HF_HUB_DISABLE_PROGRESS_BARS=1 /opt/homebrew/bin/python3 -B \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-publication-backup-20260922/backup-publication.py run \
  --job /Volumes/TB4/mac-mini-storage/shared/pinpin-publication-backup-20260922 \
  --workers 4
```

The existing adapter performs uploads with standard cached authentication.
Downloads use `HfApi(token=False)` and new temporary files; each full SHA-256 and
byte count must match. Prefetched path metadata reduces API traffic, while the
post-download identity lookup always goes to HF. No resume receipt bypasses fresh
downloads. Duplicate immutable objects are downloaded once and their proof is
expanded to every independently checked logical path. All export entries remain
in provenance and the final receipt, even when multiple exports share a source.

The job publishes `object-receipt.json` and `publication-backup-receipt.json` only
after verification. Read `progress.json` for bounded status and `failure.json` for
sanitized failure classification. A completed receipt is never replaced by rerun.
Source files, SSD staging, and cache are retained.

## Anonymous restore

`tools/assets/production-preservation.json` contains only the production selection,
with original `docs/...` paths and unchanged content-addressed object keys. Its
copied roles are `archive` solely to use the existing storage adapter. It does
not change `assets/manifest.json` or imply assets have been untracked.

In a fresh source checkout, with the pinned HF SDK installed, use:

```sh
HF_HUB_DISABLE_IMPLICIT_TOKEN=1 python3 tools/assets/hf_store.py pull \
  --manifest tools/assets/production-preservation.json \
  --root . --profile archive --cache /path/outside/checkout/asset-cache
```

The public restore needs no HF token. Existing conflicting files are refused.
`tools/assets/backup-publication-masters.json` is the separate PNG-master manifest;
restore it with the same command and a separate destination directory as needed.
Both subsets and the combined manifest are also frozen in the external job.
See `verification-publication-backup.md` for actual completion and receipt proof.

Focused tests: `python3 -B tools/assets/backup-publication.test.py -v`.
