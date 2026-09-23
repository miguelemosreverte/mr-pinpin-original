# Unified cubemap asset preservation

Only the selected v2 runtime WebP is production. The grayscale whole-cubemap reference, both generated PNG masters, and rejected v1 WebP are archived. All 812 prior catalog entries retain exact identities and roles; A/B assets are unchanged.

| Asset | Role | Bytes | SHA-256 |
|---|---|---:|---|
| `docs/storyboard/images/house-menu/room-unified-cubemap-v1.webp` | archive | 1,786,306 | `233c85950dd33076c8c3f9478b71b9597ba0813b7c93439b87314949f9852549` |
| `docs/storyboard/images/house-menu/room-unified-cubemap-v2.webp` | production | 1,733,940 | `a240b1b6f2726d4f108cf00a4f586d7dfc735171c9aa0bd1bad567b50f99a982` |
| `docs/storyboard/production/house-unified-cubemap-20260922/reference/room-cubemap-atlas-gray-v1.png` | archive | 3,465,854 | `8e2f7b59aab59069e59ab4ef17b40a53f3d2bc034d1950209d2f5bf564576dc4` |
| `docs/storyboard/production/house-unified-cubemap-20260922/room-unified-cubemap-v1.png` | archive | 2,468,515 | `3a55d6329e4edbead0a155ca18ea4aef123a7bb1cc509ec2bcfab9a31c6b73a6` |
| `docs/storyboard/production/house-unified-cubemap-20260922/room-unified-cubemap-v2.png` | archive | 2,398,098 | `3a55f54b2a42d9e81aa280883ccd301868561d167df6a12e784a25ebc4508647` |

Final catalog: **531 production assets** (800,531,775 bytes), **286 archive assets** (943,485,561 bytes), 817 total. Production selection makes v2 eligible for the review release; it does not imply a final artistic approval.

Only four new archive objects were uploaded on the mini with default HF authentication and external cache. All passed fresh remote download/byte/SHA verification and independent anonymous HTTP downloads. The complete receipt combines four fresh proofs with 282 unchanged exact proofs from the prior panorama archive. No previous object was reuploaded.

External evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-unified-cubemap-20260922/archive/`: `manifest-before.json`, `delta-manifest.json`, `delta-upload-receipt.json`, `anonymous-verification.json`, `complete-archive-receipt.json`, and `asset-tests.log`. Prior exact receipt: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-panorama-20260922/archive/complete-archive-receipt.json`.

Sync dry run and application untracked **zero files**. Root `.gitignore` managed exclusions and `assets/archive.gitignore` were updated only through the verified sync. All five new working media files remain present and were rehashed after sync. Generator originals were not touched. Historical production restoration was unchanged because no production file was removed or untracked.

Focused asset tests: 48 passed, zero failed, one skipped. Release recipe is prepared on the mini at `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-unified-release-20260922/`, pending the release owner’s committed source SHA. It checks all 527 prior public media files and PDF catalog bytes unchanged, with only v2 added. No Git commit, source push, or official selection was performed.
