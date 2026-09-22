# Panorama and Blender cubemap asset preservation

Preserved the complete pre-experiment catalog: all **767 prior entries** retain their exact path, role, bytes, SHA-256 and content object identity. Added **11 production WebPs** for the two explicitly selected review/public experiments, plus **34 archive originals and references**. This production classification makes the experiments eligible for the release artifact; it does not claim user approval of either artistic treatment.

Final catalog: **530 production assets**, 798,797,835 bytes; **282 archive assets**, 933,366,788 bytes; **812 assets total**. Older room runtime versions remain production without removals. The historical production-restoration manifest remains unchanged because no production working files were removed or untracked.

## Selected runtime derivatives

All paths below are under `docs/storyboard/images/house-menu/`.

| File | Bytes | SHA-256 |
|---|---:|---|
| `room-blender-back-v1.webp` | 1,602,754 | `89b3b3c35b5efd27b40278a11a00edf68ea96a7ce1adec229a51a19d8245638a` |
| `room-blender-down-v1.webp` | 1,989,026 | `5c06134077fce148cae2cb5fd8286c48b2b441742bcc0efc0ee3f7749598304d` |
| `room-blender-front-v1.webp` | 1,817,856 | `2cd1e34812c3e25b17e7f2dbd9a99e35deee88ae7ad49f1ad5aa8cd5e9a7614b` |
| `room-blender-left-v1.webp` | 1,599,640 | `2b1a0c74734bda5c90c63ba2647df106e349edb5a1a84ced8d14a52c27b3a92d` |
| `room-blender-right-v1.webp` | 1,590,872 | `b82aa663133573cca151f1d9147bc87cc91d8fcc5697a9cfd42a48846cd80b4c` |
| `room-blender-up-v1.webp` | 1,476,022 | `1e3c2b000bfa320810f7703aaa168a39f388769ee8e71ed202b130113eae2de6` |
| `room-cube-down-v1.webp` | 1,608,808 | `a49c2550009e354f14ea03225695001a48f915153c5bdb624eb46c6ba403121a` |
| `room-cube-front-v1.webp` | 1,391,254 | `109a9aa49599c197c5f8878792b8a0d7a8da1e2654ee781cace1769be5ee175c` |
| `room-cube-rear-v1.webp` | 1,241,870 | `0bb26a9090fbb8fd9cb132d7ea3669b18c4bab0c786e121912168c970d3cc08f` |
| `room-cube-up-v1.webp` | 1,231,868 | `32edeea516f3bbc15341372dcf7cd9238210eb0575df13595d4342269b5a7d79` |
| `room-panorama-v3.webp` | 2,020,370 | `efc3a9ddf626ce3cd411e1cfd57945854f220eea3b0cf29d5117a7bfa80d1187` |

Experiment A uses panorama v3 plus four repaired perspective faces. Rejected panorama v1/v2 WebPs are archived. Experiment B uses six independently styled faces derived from the locked Blender room geometry.

## Preserved originals and references

- Panorama pack: 15 archive files—three panorama PNG masters; four repaired-face PNG masters; four exact perspective input PNGs; the grayscale blockout PNG and editable Blender file; and two rejected panorama WebPs.
- Blender cubemap pack: 19 archive files—six styled PNG masters, six canonical 90° reference PNGs, six 110° overscan reference PNGs, and the editable six-camera Blender rig.
- Recipes, prompts, generation provenance, orientation matrices, validation and reports stay in source control. The reference scripts can resolve the sibling panorama blockout in the repository. No duplicate `.blend1` files or render logs were copied into the source pack.

Only these 34 new archive objects were uploaded: batches of 7, 21, and 6. All passed fresh authenticated remote download, exact byte-count and SHA-256 validation, then independent anonymous HTTPS GET validation. No prior archive object was reuploaded. All source PNGs, WebPs and Blender files remain present, with unchanged hashes; generator originals were not touched.

External evidence root: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-panorama-20260922/archive/`:

- `manifest-before.json`: original 519-production / 248-archive baseline.
- `delta-manifest.json`, `delta-stage2-manifest.json`, `delta-stage3-manifest.json`: the three upload batches.
- Corresponding `delta-upload-receipt.json`, `delta-stage2-upload-receipt.json`, `delta-stage3-upload-receipt.json`: fresh exact readback proofs.
- `anonymous-verification.json`, `anonymous-stage2-verification.json`, `anonymous-stage3-verification.json`: anonymous proofs for all 34 new archive objects.
- `complete-archive-receipt.json`: 282 matching proofs, combining the 34 fresh proofs with 248 unchanged exact proofs from `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-expanded-20260922/archive/complete-archive-receipt.json`.
- `asset-tests.log`: 48 tests passed, zero failed, one skipped.
- `reference-validation.log`: six canonical reference hashes/dimensions and 12 shared geometric cube-edge correspondences passed.

Sync dry run and application both reported **zero paths to untrack**. Only the existing managed block in root `.gitignore` was updated; `assets/archive.gitignore` is the generated proposal. All 45 newly cataloged working files were rehashed after sync. No Git commit or deployment was performed. The release owner handles the final production build and serving selection.
