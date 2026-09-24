# Current room exports for separate image-led variants

Each input is a **3072×1536 continuous equirectangular bake of the complete current runtime stack**, not its base image alone. No Blender invocation, new geometry, camera translation or image generation occurred in this export lane. The source panorama orientation and existing selected repairs are retained.

| Room | Full input | SHA-256 |
|---|---|---|
| Common | `common-current.png` | `285ecb4fd4d2c92a1aff4c936aa47607f8d7db14100e34abace6f17db995e1f2` |
| Bath | `bath-current.png` | `7e7f6866fd5e5289ffca86329cd5807bb32071f0c508087658184b0f3e624eec` |
| Bedroom | `bedroom-current.png` | `908e2426a0dec0756c1c3eb5904e0c1af6a7c36088e11bd5ac41cb738a371a85` |

The matching `*-level-reference.png` files are 1024×1024 perspective proofs at pitch zero and 100° square FOV. Their yaws are the current room defaults: common 3.1415927 radians, bath 1.9, bedroom 1.35. They are optional diagnostic references; the full panoramas are the actual variant inputs. Full files live on TB4 at `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-variants-20260924/`; source entries are specific links.

## Included layers

- Common: historical base, calibrated front repair, updated rear with both private-room doors, ceiling repair and floor repair.
- Bath: widened corrected-door base, front/rear/down repairs, selected down mask `[0,.08]`, and the final registered rug detail at yaw 3, pitch −.95, 90° FOV, mask `[.04,.08,.25,.26]`.
- Bedroom: current base, rear repair and downward repair.

`projection/input-config.json` identifies every texture by repository path and hash. The per-room `projection/*-current.json` records output identities, layer configuration, script/helper hashes and level-proof cameras. Frozen runtime shader/config copies are retained in the same directory. Existing repairs blend with their original normalized weights; the bath detail then mixes over that result with its original registered mask. No layer was approximated by showing only a base image.

World forward +Y is panorama center `(u=.5,v=.5)`, right +X is `u=.75`, rear −Y is the left/right wrap, and up +Z is the top. Pixels are sampled at their centers with the same encoded-RGB linear filtering and clamp/wrap conventions as the runtime. The larger raster preserves available detail through deterministic resampling; it does not manufacture new detail.

## Independent renderer check

Ten 256×256 views were compared against the actual frozen WebGL renderer: level/up/down for each room, plus the bath’s registered detail direction. Every channel differed by at most **one 8-bit value**; mean absolute error ranged from 0.022 to 0.030. Results are in `projection/runtime-comparison.json`. This verifies the CPU/GPU mapping and blend, including the final bath detail, within their filtering/rounding differences. It does not approve generated variants or prove every seam artistically perfect.

## Reproduction

Restore missing existing room inputs through the earlier scoped manifests (`assets/house-image-tour.json`, `assets/house-bath-join.json`) and verified historical A dependencies. Do not replace the recorded hashes with another version. From a Python environment with NumPy:

```sh
python3 projection/prepare_inputs.py --repo /path/to/restored/mr-pinpin-source --out /external/work
python3 /external/work/projection/export_rooms.py --config /external/work/projection/input-config.json --out /external/work
```

Optional `--room common`, `--room bath` or `--room bedroom` restricts the export. WebP source decoding uses existing `/opt/homebrew/bin/ffmpeg`; PNG inputs pass through the retained lossless PNG helper. On this mini, the available NumPy Python is `/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/Resources/4.5/python/bin/python3.11`. Calling that Python does not invoke Blender.

The runtime comparisons used `verify-runtime.cjs` with the installed Playwright module and Chrome, followed by `compare_runtime.py` on the mini. Full comparison frames remain in external `runtime-check/`.

A future lower-eye-height illustration is an image-led artistic proposal. These panoramas provide no recovered metric eye height or hidden geometry from which to calculate an exact camera translation. Variant prompts, generated outputs and browser review are recorded by their respective lanes; the existing tour remains unchanged.

## Common table downward repair input

`common-table-down-input.png` is a deterministic 1400×1400 extraction of the separate generated `common-table-v1.png`, centered at yaw 0°, pitch −90°, FOV 110°. This matches the runtime’s cardinal down-repair orientation: view forward −Z, image right +X, image up +Y. `projection/common-table-down-input.json` pins source/output hashes and camera values; `extract_perspective.py` is the reusable extraction recipe. It exposes the generated stool-leg/rug convergence for a later image-model correction; the extraction itself does not fix it or alter the original table panorama.

## Child-room repair inputs

Each child candidate also has a 1400×1400 rear input at yaw 180°, pitch 0°, FOV 110°, extracted by `extract_perspective.py`. After its generated rear repair was selected, `extract_with_rear.py` sampled the **candidate base plus that repair** into `*-child-down-input.png` at yaw 0°, pitch −90°, FOV 110°. This deliberately carries the repaired rear into the downward overlap instead of reverting to the unrepaired base. It uses the unchanged `.70→.96` edge falloff and normalized runtime blend. Sibling manifests pin both source hashes, output hash and camera basis. All original exported room inputs and candidate masters remain unchanged; generated repairs have separate prompt and generation records.

The later bath child rug-detail input, `bath-child-join-input.png`, samples the full candidate base plus selected rear and down repairs at yaw **π radians**, pitch **−0.7 radians**, square **90° FOV**, **1400×1400**. The child candidate has no directional down mask. `extract_child_detail.py` and the sibling input manifest preserve this exact state for the separately generated local repair. The detail overlay must use this same camera basis; this is not the earlier adult-bath detail pose.
