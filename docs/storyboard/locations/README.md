# Reusable story locations

[PinPin’s house](pinpin-house/README.md) is the first location pack: one measured three-room plan, a reproducible Blender recipe, named cameras, book references with explicit roles, and prompts for individual stills or a complete cubemap.

The geometry is reusable across camera positions. Illustrated output remains a reviewed derivative; a generated image is not a replacement for the 3D scene.

| File | Purpose |
|---|---|
| [pinpin-house/location.json](pinpin-house/location.json) | Pinned scene inputs and stable defaults |
| [pinpin-house/scene/house-plan.json](pinpin-house/scene/house-plan.json) | Editable measured geometry |
| [pinpin-house/cameras.json](pinpin-house/cameras.json) | Room and doorway camera presets |
| [pinpin-house/references.json](pinpin-house/references.json) | Book images and permitted reference roles |
| [pinpin-house/examples/](pinpin-house/examples/) | Saved executable camera jobs and selected evidence |
| [CLI documentation](../../../tools/locations/README.md) | CLI interface (also accessible at repository `tools/locations/README.md`) |

Use the Python environment with `tools/assets/requirements.txt` installed (the configured mini already has it). From repository root, restore this workflow’s scoped media before using a fresh checkout:

```sh
python3 tools/assets/hf_store.py pull \
  --manifest assets/locations.json --root . --profile all \
  --cache /Volumes/TB4/mac-mini-storage/shared/pinpin-asset-cache
```

The root operator maintains the scope manifest and verified archive receipts. It includes the current scene underlay, selected review media and the book reference paths needed by this pack; restoring them does not select a public release. Keep source JSON, recipes and prompts in Git. [WORKFLOW-REPORT.md](WORKFLOW-REPORT.md) records what was actually exercised; [REVIEW.md](REVIEW.md) records the browser review.

Rights follow the repository [content notice](../../../CONTENT-LICENSE.md) and [license scope](../../../LICENSE). Technical tooling and creative configuration have different licensing scopes.
