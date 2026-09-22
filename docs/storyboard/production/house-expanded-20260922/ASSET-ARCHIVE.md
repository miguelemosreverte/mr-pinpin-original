# Expanded house asset preservation

Added the selected expanded room and its depth WebPs to the explicit production allowlist. The initial room draft, selected room original, and depth original remain archive assets. Catalog refresh added exactly five assets; all 762 prior entries retained their identities and roles, including older runtime room versions.

| Asset | Role | Bytes | SHA-256 |
|---|---|---:|---|
| `docs/storyboard/images/house-menu/room-expanded-depth-v1.webp` | production | 1,007,228 | `700ed3cd48fa4127b5498aa7d7e4f657ad611d6a4800b04e3edd325a28d6b985` |
| `docs/storyboard/images/house-menu/room-expanded-v2.webp` | production | 1,981,882 | `48b834c8d5c87a82b4560792049ad43d078d300b698525333245ea215eb3f2ad` |
| `docs/storyboard/production/house-expanded-20260922/room-expanded-depth-v1.png` | archive | 1,432,258 | `3cffa2482b29e234295a584fd2ff7611056104c1583e39564f05d2fd2e4841c4` |
| `docs/storyboard/production/house-expanded-20260922/room-expanded-v1.png` | archive | 2,724,381 | `dab5ae67d2606642db2b56d89b4e46e8ae135b3a627f13d7518b433a57e1b6cf` |
| `docs/storyboard/production/house-expanded-20260922/room-expanded-v2.png` | archive | 2,529,619 | `9be8b30744b45a706b907f03b9f6b9cf3e3139a75a84a489bf87383370e85845` |

Final catalog: **519 production assets** (781,227,495 bytes) and **248 archive assets** (878,467,063 bytes), 767 total. Runtime WebPs remain eligible for ordinary Git tracking and the verified Pages artifact. The historical production-restoration manifest was unchanged because no production working file was removed or untracked.

Only the three new PNGs were uploaded, using the HF adapter on the Mac mini with native SSD cache and default authentication. All three passed fresh remote download, byte-count, and SHA-256 verification. Independent anonymous HTTPS GETs returned HTTP 200 with exact matching bytes and hashes. No older archive objects were reuploaded.

External evidence root: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-expanded-20260922/archive/`:

- `manifest-before.json`: baseline catalog.
- `delta-manifest.json`: exactly the three new PNG objects.
- `delta-upload-receipt.json`: fresh upload and readback proofs.
- `anonymous-verification.json`: independent anonymous download proofs for all three.
- `complete-archive-receipt.json`: all 248 matching proofs: three fresh proofs plus 245 unchanged proofs retained from `/Volumes/TB4/mac-mini-storage/shared/pinpin-room-depth-20260922/archive/complete-archive-receipt.json`.
- `asset-tests.log`: 48 passed, zero failed, one skipped.

Sync dry run and application both reported **zero paths to untrack**. Sync updated the existing managed block in root `.gitignore`; `assets/archive.gitignore` is the generated proposal. There is no separate `managed.gitignore` file. All five working images were rehashed after sync and remain unchanged. Generator originals were not touched. No commit or deployment was performed; the release owner performs the production build.
