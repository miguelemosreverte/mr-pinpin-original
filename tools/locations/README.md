# Location workflow

Build a pinned measured scene, render camera jobs, and prepare a built-in-imagegen handoff. All geometry and assets come from a location package; no dated external `.blend` is required. The current package is `docs/storyboard/locations/pinpin-house/`.

Use Python3.9+ and Blender4.5.14. Runtime Python uses only the standard library. Blender supplies its own Python API. PNG atlas assembly is byte-preserving and needs no Pillow. Heavy work belongs on the mini/TB4.

## Run from the source repository

```sh
python3 tools/locations/cli.py build \
  --location docs/storyboard/locations/pinpin-house/location.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/build \
  --host mini

python3 tools/locations/cli.py render \
  --job docs/storyboard/locations/pinpin-house/examples/common-room.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/common-still \
  --host mini

python3 tools/locations/cli.py cubemap \
  --job docs/storyboard/locations/pinpin-house/examples/cubemap-common.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/common-cubemap \
  --host mini
```

`--host mini` copies only the scripts and required pinned scene/job files into `OUT/.source/`, then runs them with `/opt/homebrew/bin/python3` through SSH. It requires the shared `/Volumes/TB4` mount and `ssh mini`. Omit the host flag when already on the mini. Use `--blender PATH` or `PINPIN_BLENDER` for another Blender installation. Use `--root PATH` for a relocated source checkout.

`--build PATH` optionally reuses a `build-manifest.json` and `base.blend` after verifying their source and artifact checksums. A stale cache fails explicitly; use a fresh build/output path after changing the recipe. Every execution records the exact location, job and script hashes.

A still accepts `position` and exactly one of `target`, world XYZ `eulerDegrees`, or normalized `quaternionWXYZ`. Blender camera local axes are forward−Z/up+Y. Specify either `lensMm` with36mm sensor or `horizontalFovDegrees`, plus pixel dimensions. An interior camera must be inside a named room, above floor/below ceiling, and clear of modeled solid surfaces. Explicit exterior jobs use `camera.allowOutside:true`.

Door states are opening angles in degrees,0..120, keyed by the actual hinged opening ID. The immutable authored hinge rotation and swing sign are retained separately from the current angle; repeated closed/open commands are idempotent. The exterior leaf keeps its authored outward swing. No scene geometry is hidden to show through a closed door.

## Cubemap contract

A cubemap job uses one fixed camera position and one loaded scene. Six square90° views are rendered in order front/right/back/left/up/down. Default directions are world+Y/+X/−Y/−X/+Z/−Z; optional camera orientation rotates the whole frame consistently. Atlas layout is top[front,right,back], bottom[left,up,down]. Each face has explicit forward/right/up vectors in the manifest. The PNG atlas directly copies decoded source pixels, with no color conversion or blending, and verifies every tile pixel after assembly.

The ceiling, exterior ground/tree markers and interior fill lights are in the separate `05 Inferred panorama supplement` collection. They are reversible rendering assumptions recorded in the build manifest. Original floor/walls/furniture stay in their own collections. The ceiling is a simple closure, not a claim that the book roof is flat.

## Built-in image generation handoff

```sh
python3 tools/locations/cli.py prepare \
  --job docs/storyboard/locations/pinpin-house/examples/common-room.json \
  --from-manifest /Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/common-still/render-manifest.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/common-prepared
```

This writes `prompt.txt`, `geometry-reference.png`, `imagegen-job.json` and `prepared-manifest.json`. The current render is the first reference; the appropriate approved room image supplies style. Legacy geometry is excluded. The exact job and source render must match; unresolved prompt placeholders and changed reference hashes fail.

The CLI **does not call an image-generation API**. An operator/agent inspects the references and invokes the available built-in imagegen tool using the emitted job. Preserve the original returned image. Record the completed call in a JSON file with `tool:"image_gen__imagegen"`, the exact emitted `promptSha256`, an explicit `generatedAt` timestamp, and any available call/session metadata. Then import it:

```sh
python3 tools/locations/cli.py import \
  --prepared /Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/common-prepared/prepared-manifest.json \
  --image /absolute/path/to/generated.png \
  --record /absolute/path/to/generation-record.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/common-generated
```

Import preserves bytes and records provenance. It marks the result `proposal-needs-visual-review`; it does not approve it or prove that an illustration preserves geometry. The recorded tool metadata is supplied by the operator, not a cryptographic attestation.

## Validation

```sh
python3 tools/locations/cli.py validate --manifest /absolute/output/render-manifest.json
python3 -m unittest discover -s tools/locations/tests -v
```

Validation rejects missing/unknown stages, empty artifact sets, escaped paths, changed source inputs and mismatched output hashes. It is a reproducibility check, not a visual-quality verdict. Door-state integration is tested in Blender with `tests/blender_door_state.py -- BASE.BLEND RESULT.JSON`.

Software/content licensing follows the repository notices. Copied geometry recipes and creative scene definitions are not automatically relicensed by residing under `tools/`.
