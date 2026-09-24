# Image-led 360° scenes and cubemaps

This is the reusable workflow established with PinPin’s house and tested on the Elder’s home and outdoor story settings. It produces illustrated fixed viewpoints that can be explored in any direction. It is separate from the measured Blender location workflow: changing a camera’s physical position with the image model is an artistic reconstruction, not a recovered 3D translation.

## What worked

Start with strong illustrated references, generate **one continuous equirectangular image**, inspect it in the real viewer, and correct visible defects through registered perspective views. Export a cubemap from the **final assembled image stack**. The six cube faces are samples of that one scene; they are not six separately generated illustrations.

Successful examples are retained in the [image-led house tour](../production/house-image-tour-20260924/README.md), [bath edge repair](../production/house-bath-join-20260924/README.md), and [table/child-height variants](../production/house-variants-20260924/README.md). The house variants took nine image calls: three whole panoramas and six targeted repairs. This demonstrates a repeatable process, not a guarantee of a flawless single call. Historical house reference A itself had a Blender guide; later image-led variants needed no new Blender render.

## 1. Establish the scene before generating

Read the actual published story registry and inspect the selected illustrations. Pick the story moment and viewpoint. Write a short scene specification with visible landmarks, important object anatomy, light direction, floor/ground material, openings and camera intention. Mark unseen scenery as an inferred continuation; do not describe it as recovered book geography.

Supply the successful panorama and the new location illustrations as separate input images. A combined half-and-half sheet is unnecessary and reduces the area available to each reference. Assign every input a role. A book illustration establishes place and object design. An already successful panorama can demonstrate projection and visual finish without donating its room layout. Explicitly prevent a kitchen reference from bringing doors, floors or furniture into a forest. Prefer a few complementary references to many contradictory ones. Empty environments usually make better reusable locations than characters frozen into a spherical image. The lake v2 trial retained the outdoor identity with the house panorama as an additional reference, but still needed rear and pole repairs. A reference demonstrates the desired result; it does not impose a mathematical continuity constraint on generation.

Record the paths and SHA-256 hashes. Keep a new scene/version directory. Never overwrite a selected original to make the new experiment easier.

## 2. Generate one spherical image

Use the built-in image-generation tool and its imagegen skill. Inspect every local reference before supplying it. Use [the scene prompt template](templates/scene.txt), replacing only scene-specific information and reference roles. Save the **exact submitted prompt** and the unmodified returned master, including its actual dimensions and hash. Requested resolution is not proof of returned resolution.

The panorama covers 360° longitude and 180° latitude on a 2:1 canvas. A level camera has its horizon at the middle row. Front is longitude center; rear crosses the left/right boundary. Those outer edges must agree, and the ceiling/sky and ground poles must be coherent. This layout has one wrap boundary and two poles; it is not inherently seam-free.

The output is a candidate. A changed eye height must change occlusion: for example, a low bathroom viewpoint hides the water behind the tub rim. Tilting or cropping the old image does not lower the camera. Check for unintended changes to furnishings, proportions, bedding, lighting and openings.

## 3. Inspect the actual spherical view

Load the candidate into the same renderer used for delivery. Inspect front, right, back, left, up and down; then inspect oblique directions between them, especially where repair images overlap. Turn across the rear wrap. Look at hard edges, repeating weave, straight floorboards, shelf outlines, machinery mounts and the underside of furniture.

The flat panorama can hide bad geometry: the kitchen looked plausible flat but its stool legs converged unnaturally at the nadir. The bathroom’s cardinal views passed before an oblique view exposed a doubled rug. A valid checksum or cube-edge calculation does not replace this visual inspection. Retain the failing camera yaw, pitch, FOV and screenshot.

## 4. Repair only the demonstrated defect

Use [the projection CLI](../../../tools/panoramas/README.md) to extract a conventional square perspective from the **current assembled stack**, not an obsolete base image. The usual repair is 110° square for useful overlap; a localized detail can use 90°. CLI angles are degrees; browser configuration uses radians.

```sh
python3 tools/panoramas/project.py extract \
  --config path/to/stack.json --output /external/rear-input.png \
  --yaw 180 --pitch 0 --fov 110 --size 1400
```

For a downward cardinal repair use yaw 0, pitch −90; upward uses yaw 0, pitch 90. Save the extraction job and hashes. Pass the extracted image to the image model with [the repair template](templates/repair.txt): correct the visible defect while preserving camera, perimeter, objects and style. Keep each returned repair as a separate immutable master.

The runtime uses base+front/rear/up/down perspective layers. Their normal square feather is fully active through normalized edge 0.70 and fades to zero at 0.96; overlapping layers are normalized together. This overlap can reintroduce competing outlines. A directional mask helped keep the old floor repair off the tub. When masks traded one defect for another, a narrow registered detail applied **after** the assembled layers solved the remaining rug ghost. Do not solve an artistic edge by repeatedly moving generic masks without inspecting the actual result.

For that last case, extract a view centered on the bad join, edit it once, and register a bounded detail with its exact yaw/pitch/FOV and soft rectangular mask. Fully replace the bad core; place feathered edges on unchanged surrounding surfaces. The existing `details` contract in `home-panorama-gl.js` supports this. Recheck the failed angle, nearby yaw/pitch, previous good views, and mobile interaction. More repair images are not automatically better.

## 5. Freeze, assemble and export actual cubes

Create a hash-pinned stack job using the actual selected inputs, repair settings and optional detail. The CLI documents its complete schema and validates hashes before sampling. Keep the geometry/projection operation distinct from image generation.

```sh
python3 tools/panoramas/project.py export \
  --config path/to/selected-stack.json --output /external/scene \
  --width 3072 --face-size 1024
```

This writes an assembled 2:1 image, six 90° square face PNGs, a 3×2 atlas and an export manifest. Atlas order is `[front,right,back; left,up,down]`. World axes are +X right, +Y front, +Z up; the manifest supplies each face’s basis. Do not rotate up/down tiles to look upright in a thumbnail. Exporting at higher resolution resamples pixels; it does not recover new detail.

The tool checks the twelve shared angular boundaries and that every atlas tile matches its face. Inspect the **exported cube in a real cube renderer** too, preserving the camera while switching from the live panorama. Math checks establish orientation/sampling; visual checks establish whether the art looks continuous. Preserve the image-model master even when the assembled export becomes the runtime asset.

## 6. Keep the workflow reproducible

Keep prompts, scene specification, reference roles/hashes, generation records, projection jobs, masks, final configuration and review notes in Git. Heavy PNGs, cubes, screenshots and caches belong on TB4 and in the verified scoped media archive, following [asset policy](../../../assets/README.md). No paid API fallback is implied by the CLI: it only projects existing pixels.

Provide a browser scene picker, free pan/zoom, flat inputs and outputs, exact prompts, source illustrations and cube downloads. Keep comparisons or old versions when changing established scenery. Cache-version the entry script and configuration after selecting new media; a stale module can otherwise show an older mask or asset. Record candidate, reviewed and user-selected status separately. Local review does not publish the official reader site.

Use Blender when the task requires measured dimensions, verified sightlines, precise door geometry, or repeatable translated cameras. Use this image-led route when the user requests illustrated variations or new environments from visual references. Neither route removes the need to check the final image.

Prompts and illustrated scene specifications remain creative content under the repository’s content notices; technical projection utilities do not relicense their inputs.
