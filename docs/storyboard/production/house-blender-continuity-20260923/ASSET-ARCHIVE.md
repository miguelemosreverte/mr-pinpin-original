# Continuity experiment asset preservation

Status: retained experiment; publication stopped on user direction. The seven runtime selections in the working catalog are provisional experiment assets, not approval of the final house design. No release build, release package, source commit, push, or official selector change was performed.

All 818 previous catalog entries retain their exact path, role, size, SHA-256 and object identity. The catalog now contains 539 production assets (810,136,681 bytes) and 300 archive assets (977,579,346 bytes). This adds seven runtime WebPs and fourteen archive assets.

The fourteen new archive objects passed authenticated remote readback and fresh anonymous HTTP GET size/SHA-256 verification. The combined receipt retains the previous 286 exact proofs; those previous objects were not redundantly downloaded. Receipt-backed sync updated exact ignore rules and untracked zero files. All 21 new working files remain present and hash-verified.

## Retained runtime experiment assets

- room-blender-camera-center-v1.webp — 634074 bytes; SHA-256 2e37c789d9568485076dcd38671aa1f7bca6e87428d3ca2e8530bceebbfdfd45
- room-blender-camera-shift-v1.webp — 654350 bytes; SHA-256 e93bf508a3c7adc71f41e04fd2ca4a083d0b016fbfbea6d8f156644f56579616
- room-blender-illustrated-v2.webp — 1856040 bytes; SHA-256 3b7cd157da093a815076ccd6a2af7b24daffe50e1f6b58abc28e4790580c8751
- room-blender-materials-v1.webp — 1274780 bytes; SHA-256 c728020c60d711eb1d4c83311d7a2c076b271be720e02ebb36c9240325154d3f
- room-blender-rear-repair-v1.webp — 1293120 bytes; SHA-256 bc5e0c21ab71259a1c2df56d3a75bab20b56e539597c078a829e7c318bee21ad
- room-projected-camera-center-v1.webp — 748622 bytes; SHA-256 3f2744691a09de124ab333516caf5b347da58e41bdc825b1c6f2f715ce8b3bda
- room-projected-camera-shift-v1.webp — 783456 bytes; SHA-256 19fc92a77a9270a1ee8c920d89b043229a3a3a8d6b8bb1766c0ecd7e00d58d92

The original F1 illustrated WebP is archived; F2 is the provisional selected illustration. The selected projection scene is room-illustration-projected-f2.blend. Its translated-camera disocclusion failures remain documented in IMPLEMENTATION.md; preservation does not certify geometry or visual quality.

## Evidence

External evidence root: /Volumes/TB4/mac-mini-storage/shared/pinpin-house-blender-continuity-20260923/archive

- manifest-before.json: exact 818-entry baseline.
- final-inventory.json: complete 21-asset delta.
- delta-initial-upload-receipt.json, delta-style2-upload-receipt.json, delta-final-upload-receipt.json: 7 + 2 + 5 fresh remote proofs.
- anonymous-initial-verification.json, anonymous-style2-verification.json, anonymous-final-verification.json: matching unsigned download proofs.
- complete-archive-receipt.json: all 300 archive entries with proof-source history.
- preservation-checks.json: baseline equality, working-byte hashes and ignore-role checks.
- asset-tests.log: focused asset tooling tests.

The original source PNGs, gray and color references, portable base Blender scene, selected editable/projection Blender scenes, rear repair input and master, and literal prompts remain recoverable through the catalog. No image was resized or creatively modified during preservation.

## Release hold

An inert recipe is prepared at /Volumes/TB4/mac-mini-storage/shared/pinpin-house-continuity-release-20260923/. It requires the current public baseline of 529 media files and PDF catalog to remain byte-identical, with exactly seven additional runtime images. It has not received a source commit or started any build. Resume only when the parent supplies the intended final snapshot after the new design review.
