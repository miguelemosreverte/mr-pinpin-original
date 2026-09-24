# Per-stop production handoff

The canonical per-stop namespace is `stops/stop-XX/`. All 24 `source.png` files already exist on the mini as hardlinks to exact immutable extractions; source checkout links point to those originals. `source.json` supplies timestamp, frame index and hash. Files named in the descriptor reserve destinations and do not imply completed art.

Assigned ranges after pilot approval: B `stop-00`–`stop-07`, C `stop-08`–`stop-15`, A `stop-16`–`stop-23`. **Pilot is stop-04.** Copy selected pilot bytes into its canonical folder with a provenance record pointing to the pilot; do not regenerate the same approved pilot.

For each stop, preserve:

- `source.png` / `source.json`: exact original frame.
- `restored-v1.png`, `restore-prompt.txt`, `restore-generation.json`: unmodified returned restoration, exact prompt and ordered inputs/hashes.
- `guide-v1.png` / `guide-v1.json` plus `guide-v1/`: deterministic registration guide, mask and roundtrip proof.
- `panorama-v1.png`, `panorama-prompt.txt`, `panorama-generation.json`: unmodified returned spherical master and actual provenance.
- Any later repairs and review remain separate versions, generated only for a demonstrated defect within the authorized budget.

Use built-in image generation as directed by the coordinating agent, after inspecting local inputs. The scripts below never call an image model or a paid API. Do not mark a panorama ready before the file exists and its generation record is saved. The UI maintains a separate available-panorama map rather than assuming all 24 are ready.

On the mini, after a stop's restoration is retained at its canonical path:

```sh
/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/Resources/4.5/python/bin/python3.11 /Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/prepare_stops.py --root /Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924 --ids 8 --guide --helpers /Volumes/TB4/mac-mini-storage/shared/pinpin-story-worlds-20260924/projection
```

The command uses the bundled Python interpreter for NumPy; it does not invoke Blender. Multiple restored stops can be listed as `--ids 8,9,10`. Missing restorations stop the operation. Existing guides must match their pinned input/script/output hashes; use a new version rather than overwrite changed inputs. From a restored checkout, `--helpers /repo/tools/panoramas` provides the same checked-in utilities.

Guide camera: yaw 0, pitch 0, vertical FOV 45°, actual restored-image aspect retained. The guide establishes an authored correspondence, not a measured lens or recovered 3D camera. Native restoration stays a separate image-model input so the small projected core does not become its only source of detail. Ordered panorama inputs follow the pilot: guide first, exact restored rectangle second, successful tractor sphere third. Surrounding scenery is inferred and must be reviewed.

All heavy outputs stay under `/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924` on the mini. Use SCP for small local tool inputs while SMB is stalled. Preserve returned masters before making derivatives. No original video, previous pack or global asset policy changes are part of these commands.
