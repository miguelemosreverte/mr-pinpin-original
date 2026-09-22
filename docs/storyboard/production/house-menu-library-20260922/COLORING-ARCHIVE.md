# Coloring original archive

Complete, 2026-09-22. All **30 PNG originals**—27 selected coloring pages plus three rejected versions—were copied to the mini SSD, uploaded to the existing public `miguelemosreverte/mr-pinpin-archive` bucket through the standard HF adapter, downloaded for fresh SHA-256 verification, and independently downloaded again through anonymous HTTPS. Their combined size is **44,259,719 bytes**.

`assets/manifest.json` now records these originals with archive role and content-addressed object paths. Its archive inventory is 244 files: the previous 214 verified proofs were reused only after exact path/role/bytes/SHA/object comparison, and the 30 new entries have fresh adapter and anonymous verification. This does not claim a fresh re-download of the previous 214.

The complete matching receipt was applied with `assets:sync --apply-receipt`. Dry run and application both reported **zero tracked paths to untrack**. Only the managed ignore entries/inventory were refreshed; all 30 working PNGs remain present and their hashes were rechecked. No source commit, push, official selector or runtime PDF catalog was changed by this archival lane. Prompt/provenance JSON and reports remain ordinary source files.

## Evidence

Mini SSD work area: `/Volumes/TB4/mac-mini-storage/shared/pinpin-coloring-archive-20260922/`.

| Evidence | SHA-256 |
| --- | --- |
| `coloring-manifest.json` — 30 original identities | `5be1accb1784e2cfaedf58f04c043336f1a8623168764e1cd216bc5d45d53e44` |
| `upload-receipt.json` — fresh adapter readback | `11e1dffa5c914b59e6d616e70c23c34ddf574c8ef5563402c1c1f82223efa046` |
| `anonymous-receipt.json` — fresh unauthenticated downloads | `efad64e977b39861a174c400e293148a600a68cf300d45f9ffd34f9ca352eced` |
| `complete-archive-receipt.json` — exact 244-entry application receipt | `246fb64441c3f4529eaf389d5e7e296626c906b3622881ea0a4e3051240a9795` |

`complete.json` records totals and retention checks. The prior proofs came from `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-library-20260922/ui-complete-archive-receipt.json`. Source manifest snapshot, unchanged staged PNGs, upload log and anonymous verification script remain alongside the new receipts.

Restore absent coloring originals using the standard `npm run assets:pull` workflow, or the adapter with `coloring-manifest.json` and an external cache. Existing conflicting working files are not overwritten. Selected PDF assembly uses each chapter's manifest selection, not every archived PNG; rejected versions remain archival evidence.
