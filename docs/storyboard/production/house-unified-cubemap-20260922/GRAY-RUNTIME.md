# Pure Blender grayscale runtime derivative

The original 3072 × 2048 grayscale cubemap PNG was encoded as lossless WebP without resizing, rotation, color correction, or creative edits. Decoding the resulting WebP to RGB produces exactly the original RGB bytes.

- Runtime: `docs/storyboard/images/house-menu/room-blender-gray-v1.webp`
- Size: 2,360,464 bytes.
- WebP SHA-256: `65267888c17c2ae16027357d373a302afef9be8cbc94c464bc92d52cfc197e36`.
- Decoded RGB SHA-256: `7205e50be9bc49e05fc5951b18c30c0675ed57cde390c21dc020d1b99ba8577e`.
- Source PNG SHA-256: `8e2f7b59aab59069e59ab4ef17b40a53f3d2bc034d1950209d2f5bf564576dc4`.
- Encoder: Pillow 12.2.0, libwebp 1.6.0; lossless, quality 100, method 6.
- Full proof: [gray-runtime-derivative.json](reference/gray-runtime-derivative.json).

The catalog adds exactly one explicit production asset. All 817 prior entries retain their identities and roles: final **532 production** (802,892,239 bytes), **286 archive** (943,485,561 bytes), 818 total. The existing grayscale source PNG remains preserved by its already verified archive object. All 286 existing archive receipts still match exactly; there is no new original to upload or untrack, so no archive sync or Git index operation was needed.

The selected v2 artistic atlas and all A/B assets remain unchanged. The older C package remains unselected. The new release recipe is prepared under `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-unified-gray-release-20260922/`; it will verify all 527 current public media and PDF catalog bytes unchanged, and exactly two new media: the artistic v2 atlas and this grayscale reference.

No commit, source push, or official selection was performed.
