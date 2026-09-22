# Storage verification

Offline implementation verification completed 2026-09-22 in
`/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-original`.

## Result

- PASS: `python3 -B -m unittest discover -s tools/assets/tests -v` (27 tests,
  including the subsequent live-metadata regression fix).
- PASS: `node --test tools/assets/sync.test.cjs tools/assets/catalog.test.cjs`
  (30 tests: 17 sync, 13 catalog, including the concurrent catalog lane's additions).
- Installed `huggingface_hub==1.27.0` matches the pinned requirement. Inspected
  local SDK signatures for metadata, batch upload, and downloads; adapter calls
  match. These tests and signature checks were offline.

## Live metadata correction

During the public upload, SDK 1.27.0 `get_bucket_file_metadata().size` returned
1,171 bytes for a 285,710-byte object. It reads HEAD `Content-Length`, which does
not reliably represent the stored object here. `get_bucket_paths_info` returned
the expected 285,710 bytes and the same Xet identity. The main operator observed
this discrepancy across its upload while all 181 path-info sizes matched.

The adapter now uses path-info for authoritative size and Xet identity, requiring
one exact path, file type, and nonempty identity. It still freshly downloads and
checks every unresumed object's full SHA-256 and compares Xet identity before and
after verification. No SDK upgrade or checksum bypass was introduced. Regression
tests cover misleading HEAD lengths, invalid path metadata, and corrupt downloads.
A live read-only mini probe successfully downloaded and hash-verified the
285,710-byte object. Its receipt is at
`/Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache/authoring-blender-v3-20260922/adapter-live-probe-receipt.json`.
The main operator was notified that the fixed adapter was ready to sync and rerun.

## Fixed integration defects

- Receipt application previously accepted omitted verification fields. It now
  requires version 1, push/verify action, exact bucket, explicit successful and
  non-dry-run status, and matching path/role/bytes/SHA-256/object for every archive.
  Each entry must explicitly prove remote verification. Resume proofs also require
  the successful receipt envelope and unchanged remote Xet identity.
- A different staged file version could previously be discarded when working
  bytes matched the receipt. Sync now streams and hashes indexed blobs before
  upload and receipt application. Staged symlink targets must match current links.
  Rechecking the plan now also detects changed index object IDs.
- Managed ignore replacement dropped the CR before its trailing LF. Existing
  trailing content and CRLF are preserved byte-for-byte.
- Cache containment compared canonical cache paths against an uncanonicalized
  root, missing macOS aliases. Both sides now resolve before comparison.
- Python rejects DEL in paths, non-ASCII bucket identifiers, and overlapping
  manifest file/child paths before writes.

## Verified behavior

The Python integration test invokes the real sync CLI, catalog CLI, and storage
adapter with a fake HF backend in tiny disposable repositories. It covers
successful catalog -> push -> fresh download/SHA-256 verification -> receipt ->
ignore/untrack, plus upload failure and corrupt downloads. Failure preserves the
fixture index and ignore file and publishes no receipt. All scenarios preserve
archive files, production files, managed source links, and their external targets.

Focused tests also cover missing local archives with verified receipts, unchanged
resume identities, equal-size remote corruption, production exclusion, malformed
receipts and paths, conflicts, dry runs, and managed-directory coverage. Policy
source links are readable; unmanaged source links and linked restore/cache
destinations are rejected. The push symlink flag cannot be used for pull/verify.
The direct adapter flag is a read-only operator opt-in; sync enforces the policy.

## Handoff and limits

The original offline pass changed only `hf_store.py`, `sync.cjs`, their tests,
`assets/README.md`, and this report. Other lanes' work was retained. That pass
performed no real checkout index or ignore writes, uploads, privacy changes,
asset deletion, or heavy fixtures. Git mutations occurred only inside disposable
unit-test repositories. The subsequent live probe and authoring work are recorded
separately above and in `verification-authoring.md`.

The tests above were offline. In the subsequent 2026-09-22 handoff, Miguel
explicitly approved public visibility and the main operator successfully changed
`miguelemosreverte/mr-pinpin-archive` to public. The earlier private-quota 403 is
historical. The main operator completed uploads and fresh remote verification of
all 181 manifest assets, totaling 745,024,807 bytes. This lane independently read
the successful `action: verify` receipt, confirmed `verified: true`, the exact
bucket, and `remote_verified: true` for every entry. The receipt is at
`/Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache/mini-upload-receipt.json`.
The main operator reports local receipt application underway; this lane has not
changed the real checkout's index or ignore rules. The main operator also reports
27 Python tests and the full Node suite passed after the adapter fix.
Independent authoring preservation is documented
in `verification-authoring.md`. Use an adapter-generated successful
receipt; incomplete older hand-written receipts are intentionally refused.
Receipts remain trusted operator artifacts, not signed attestations. Path checks
cover existing symlinks and conflicts; this is not a hostile concurrent-filesystem
race audit.
