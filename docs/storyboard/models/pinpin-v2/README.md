# Mr. PinPin: multi-view study

Prepared 2026-09-21. Status: **generated and published** (2026-09-22 UTC).

**Visual review: rejected as a usable character reconstruction.** Browser views show a second face/nose at the opposite end of the body, with spines crossing that duplicate face. The delivered artifact is preserved as generation evidence, not an approved character asset.

Exactly one request was submitted after connectivity was restored. The PBR GLB was collected and finalized on the mini's TB4 SSD, then copied here with hash verification. No substitute model or automatic paid retry was used.

## Inputs

The three images were generated with the built-in image tool from the original full-body reference and inspected visually. Exact prompts are stored beside each image:

1. [Front](reference-front.png), [prompt](reference-front.md).
2. [Anatomical left, nose pointing right](reference-left.png), [prompt](reference-left.md).
3. [Rear](reference-back.png), [prompt](reference-back.md).

These are separate generated views, not geometrically calibrated renders. Broad identity, proportions and stance appear consistent; exact cross-view correspondence is not guaranteed. They are candidates for reconstruction, not user-approved final designs.

## Reconstruction

- Endpoint: `tripo3d/h3.1/multiview-to-3d`.
- Explicit image order: front, left, back.
- Detailed geometry and textures; PBR enabled; requested face limit 150,000; quad output disabled for a GLB study.
- Published estimate: USD 0.60, excluding reference-image generation. This is not a billed charge.
- [Exact configuration](../../production/pinpin-3d-v2.json).
- [Provider API](https://fal.ai/models/tripo3d/h3.1/multiview-to-3d/api).
- [Provider pricing](https://fal.ai/models/tripo3d/h3.1/multiview-to-3d).

The runner hashes and uploads the three local references in the documented order, records the request ID and parameters, and collects the PBR GLB preferentially. It refuses automatic paid retries. If SMB cannot perform the final hard link, the verified partial can be finalized on the mini using the same resolved configuration without another generation.

## Result

- [Model GLB](model.glb), [structured provenance](model.json), [readable provenance](model.md).
- Request ID: `01a0c692-b95d-7382-9942-fc8dd436f7b9`.
- Selected provider result: `model_urls.pbr_model`.
- Submitted: `2026-09-22T00:44:59.539Z`; completion observed: `2026-09-22T00:50:00.693Z`; finalized: `2026-09-22T00:50:03.850Z`.
- 8,624,888 bytes; SHA-256 `0df04ecc28278fe6506ae78664711f7674e058a9d205dd518a0d4982032622a9`.
- One mesh, 147,575 triangles, one material, three embedded images, no skins or animation clips.
- Provenance retains the original TB4 output path and reference hashes. No mesh conversion or cleanup was applied.

## Review

[Reference review](../../review/pinpin-multiview.html) and [v2 model viewer](../../review/pinpin-3d.html?model=v2). Chrome loaded the published model and verified its served hash. The unchanged viewer test passed on retry at desktop and mobile sizes, including orbit, zoom, nonblank canvas and framing. The first run stopped at the camera-rotation timing assertion. These technical checks do not override the visual rejection above. Camera preset labels describe world axes: the actual main face points toward +X, not the viewer's +Z front preset. The first Trellis model remains untouched, with its original hash verified after publication.

This comparison changes both provider and reference count, so any difference cannot be attributed solely to multi-view conditioning. Inspect the actual generated face, four limbs, underside, textures and topology before considering a skeleton. No rig, independent eye controls or animation has been produced for v2.
