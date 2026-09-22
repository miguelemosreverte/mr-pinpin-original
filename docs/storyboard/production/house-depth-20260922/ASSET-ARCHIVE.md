# Room depth asset preservation

Added `images/house-menu/room-depth-v1.webp` to the explicit production allowlist and retained the generated PNG as an archive asset. Catalog refresh added exactly these two assets; all 760 prior entries kept their original identities and roles.

| Asset | Role | Bytes | SHA-256 |
|---|---|---:|---|
| `docs/storyboard/images/house-menu/room-depth-v1.webp` | production | 843,728 | `5e9c8977bad8f7076177bac89a1f78e2cab592ba7dfa6c8bd302c9a83bf1a61e` |
| `docs/storyboard/production/house-depth-20260922/room-depth-v1.png` | archive | 1,473,180 | `1f8337ea7e3c0c0405f4e9b164bfb395049ae3d5d6fbe8b3cd6adec023e92cc0` |

Final catalog: **517 production assets** (778,238,385 bytes) and **245 archive assets** (871,780,805 bytes), 762 assets total. The runtime derivative remains eligible for ordinary Git tracking and the verified Pages artifact. The historical production-restoration manifest was not changed because no production working file was removed or untracked.

Only the new PNG was uploaded, using the existing HF adapter on the Mac mini with native SSD cache and default authentication. Its fresh remote download matched all bytes and SHA-256. A separate anonymous HTTPS GET also returned HTTP 200 `image/png` with the exact same identity. No existing archive objects were reuploaded.

External evidence root: `/Volumes/TB4/mac-mini-storage/shared/pinpin-room-depth-20260922/archive/`:

- `manifest-before.json`: pre-change catalog.
- `delta-manifest.json`: the one new archive object.
- `delta-upload-receipt.json`: fresh upload/readback proof.
- `anonymous-verification.json`: independent anonymous download proof.
- `complete-archive-receipt.json`: 245 matching proofs, combining the fresh PNG proof with 244 unchanged proofs from `/Volumes/TB4/mac-mini-storage/shared/pinpin-coloring-archive-20260922/complete-archive-receipt.json`.
- `asset-tests.log`: 48 passed, zero failed, one skipped.

The archive sync dry run and application both reported **zero paths to untrack**. Sync updated only the existing managed block in root `.gitignore`; `assets/archive.gitignore` remains the generated proposal. There is no separate `managed.gitignore` file. Both working images were rehashed after sync and remain unchanged; the generator’s original files were not touched. No commit or deployment was performed.
