# PinPin’s house — reusable location v1.0.0

This pack builds one three-room house from its editable plan. The common kitchen/living room sits at the front (south/−Y); the bathroom is northwest and bedroom northeast. The outdoor recess between the private rooms remains outside. The plan is copied byte-for-byte from the finalized bathroom revision, including its fitted mat, with SHA-256 `cab510b31c13e85beaa689edb54005223412a988f640724e56b9d95dba20c28c`.

The successful earlier kitchen cubemap remains linked as a **legacy style example**. It has a different layout and must not supply geometry for this house. Current Blender renders define geometry; the book stills define only their listed style, character and prop-design roles.

## Files

| File | Use |
|---|---|
| `location.json` | Version, pinned inputs, frame, door defaults, authored additions |
| `scene/house-plan.json` | Measured room/wall/opening/furniture records; editable source |
| `scene/merged-semantic-plan.png` | Registered model diagram; scale underlay, never an image texture |
| `references.json` | Verified image paths, hashes and explicit roles |
| `cameras.json` | Named positions, targets, lenses and door states |
| `cube-layout.json` | Exact six camera bases and twelve paired cube edges |
| `prompts/still.txt`, `prompts/cubemap.txt` | Stable headers; variables supplied per job |
| `examples/*.json` | Executable room, doorway and cubemap jobs |

The pack depends on the portable code in `tools/locations/`, not a dated `.blend` master or this conversation. Rebuilding produces a fresh editable scene. The copied plan retains historical extraction notes; they document origin and are not external build dependencies.

## Render a saved camera

Run from repository root, with Python and Blender available. `--host mini` stages the pinned inputs and executes Blender on the mini. Heavy results belong on its SSD. See [CLI documentation](../../../../tools/locations/README.md) for installed Blender/path overrides and validation behavior.

```sh
python3 tools/locations/cli.py build \
  --location docs/storyboard/locations/pinpin-house/location.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/base \
  --host mini

python3 tools/locations/cli.py render \
  --job docs/storyboard/locations/pinpin-house/examples/common-room.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still \
  --host mini
```

The render job provides an absolute world position in meters and exactly one of `target`, `eulerDegrees` (Blender XYZ Euler) or `quaternionWXYZ`. Supply either `lensMm` with the fixed 36mm sensor, or `horizontalFovDegrees`; never both. Width/height are explicit. To change the shot, copy a job under a new id and edit its camera. Translation changes the actual camera origin; it is not a yaw adjustment or an illustrated panorama reprojection.

Example camera block:

```json
{
  "position": [-1.97, 1.28, 1.40],
  "target": [-3.738022, 2.66629, 0.30],
  "lensMm": 16,
  "width": 1400,
  "height": 1000
}
```

This bathroom camera is inside the room beyond the open leaf and was used for the previous family blocking. Other presets provide useful starting views; consult the executed example manifests and workflow report for what has actually been rendered.

## Doors, rooms, ceiling and outside

Default door states are closed (`0`). Jobs override `door-front`, `door-bath`, and `door-bedroom` with opening angles. The original hinge and swing direction stay fixed: front opens outward; bathroom into bath; bedroom into the common room so it avoids the bed. A `75` degree angle means a real rotated leaf, not removing a wall. Closed doors block room visibility; open doors reveal only the rays that actually pass through the modeled opening. `hall-through-open-doors` is a common-room camera, not a fourth room.

The internal doors are roughly 0.53m wide. Earlier checks established opening geometry and door swing clearance, not a complete adult character walking route. Do not silently enlarge openings or claim transit is validated.

The simple ceiling slab is a removable authored addition at 2.65m, matching wall height. It provides a closed upper surface for a cubemap; it is not a final moss-roof design. A ground plane and three fixed tree markers establish outside direction. Their positions, the fill lights and the ceiling are explicitly inferred design choices, not surveyed book geography. Keep these additions stable within a comparison; put permanent changes in a new version. Scene additions stay separate from the measured architecture.

## One whole cubemap

```sh
python3 tools/locations/cli.py cubemap \
  --job docs/storyboard/locations/pinpin-house/examples/cubemap-common.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-cubemap \
  --host mini
```

The common-room cubemap job opens both private-room doors to 75° and keeps the front door closed, so the adjoining rooms can appear through their real apertures. The common-room still retains its closed-door baseline.

Every face uses the same origin, scene, door state and lights. Default axes are world front +Y, right +X, back −Y, left −X, up +Z, down −Z. Each square face has a 90° FOV. The atlas is three columns by two rows: top `[front,right,back]`, bottom `[left,up,down]`, no gutters. `cube-layout.json` records all rotations and edge correspondences. Up/down have intentionally different screen-top directions; never rotate them to make their thumbnails look upright.

Use one whole atlas as the geometry input for one imagegen call. Six independently styled faces are not this workflow. A cubemap is a fixed-origin view; to move into another room, render a new camera position from the 3D scene.

## Prepare, generate, record

```sh
python3 tools/locations/cli.py prepare \
  --job docs/storyboard/locations/pinpin-house/examples/common-room.json \
  --from-manifest /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still/render-manifest.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still/prepared
```

For a cubemap use the corresponding cubemap job and `cubemap-manifest.json`. Preparation creates `prompt.txt`, `geometry-reference.png`, `imagegen-job.json`, and `prepared-manifest.json`; it does not generate an illustration. The current guide comes first, followed by selected room-specific book references. `prompt.referenceIds` can explicitly choose known reference ids. Do not include the legacy cubemap as geometry.

The job’s `prompt` provides `template`, `intent`, `characters`, `action`, and `lighting`. Specify the cast, distinct body positions, contact/support and eyelines when adding a character. Leave the empty-location defaults for architecture studies. Changing light in the image prompt does not change the physical Blender light rig; compare the result and record this as an illustrated lighting choice, or revise the authored rig first when illumination geometry matters.

The prepared header substitutes location id/version, exact camera record, door states, guide and reference roles. Keep those structural lines stable. Read the current imagegen skill, inspect the local input images with the image viewer, then pass the prepared prompt and listed image inputs to the built-in image generation tool. The tool is an agent action, not a supported shell subcommand. Do not substitute an SDK/API call, request an API key, or claim CLI generation happened. Keep the returned master unchanged in a new external output directory, then record it through the CLI:

```sh
python3 tools/locations/cli.py import \
  --prepared /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still/prepared/prepared-manifest.json \
  --image /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still/generated-v1.png \
  --record /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still/generation-record.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-jobs/common-still/imported-v1
```

The generation record must contain `tool: "image_gen__imagegen"`, the exact `promptSha256` from the prepared manifest, and `generatedAt` with the actual generation timestamp. Add the returned output identifier and any actual tool metadata available. Create this record only after the tool ran; do not invent successful execution metadata. Preserve the image tool’s original dimensions and master. A project-selected derivative must have a durable source/archive path, not only a session cache filename.

## Review the actual result

A valid hash proves which file was used, not that a generated window stayed in place. Review the current render and candidate side by side. Check door/window count, positions, hinge sides and open/closed states; room connections; tub/bed/table placement and size; limbs, eyes and body separation when characters appear. For cubemaps look around all six directions and inspect all twelve edge joins, ceiling and floor. If the generator changes geometry, keep it marked as a candidate and correct the image; do not redefine the measured scene to fit the drift.

Keep separate statuses: rendered geometry evidence, generated candidate, reviewed candidate, and selected story illustration. Importing does not approve or publish anything. A new approved illustration can feed a chapter after its own review. Publication follows the repository release workflow.

## Restore and reproduce

Use the scoped restoration command in [the locations index](../README.md). The plan, underlay, pinned builder and selected book references are sufficient for a new build; historical `.blend` outputs are optional evidence. Run `validate --manifest <render-or-cubemap-manifest>` to check recorded output/input identities. Keep renders and caches on TB4, preserve exact prompts and original masters, and follow repository asset policy when archiving new media.

See [WORKFLOW-REPORT.md](../WORKFLOW-REPORT.md) for executed checks and [REVIEW.md](../REVIEW.md) for browser findings. Root [LICENSE](../../../../LICENSE), [CONTENT-LICENSE.md](../../../../CONTENT-LICENSE.md) and third-party notices apply; this creative configuration is not automatically MIT code.
