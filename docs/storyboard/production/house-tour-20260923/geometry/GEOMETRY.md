# Connected house camera geometry

The tour uses three discrete camera stations in the same pinned Blender house. Clicking an interior door changes station; this is not continuous 3D locomotion. No floor, wall, window, furniture, door hinge, or leaf geometry changed. The existing reversible ceiling, lighting and exterior supplement remains in place.

All three jobs use front door 0°, bath door 75°, bedroom door 75°. They reuse the verified source-built base scene SHA256 `b1f0108066e974dadbc07a36dcadf50a30d91ee9650bbd5ca0eb838b27176e03`, plan SHA256 `cab510b31c13e85beaa689edb54005223412a988f640724e56b9d95dba20c28c`. The reusable tools were not changed.

## Camera stations and actual visibility

World units are meters, +Y forward/north, +X right/east, +Z up. Camera origins:

- Common: [−1.3, −1.3, 1.15].
- Bath: [−2.4, 2, 1.15].
- Bedroom: [1.45, 1.2, 1.15].

The earlier common station [1.1, −1.8, 1.15] was unsuitable: its bedroom doorway was occluded by the real leaf. Moving the camera to the chosen common station clears both openings without modifying the model or opening angles.

`check_portals.py` loads the actual base scene, applies the exact reusable door-state function, and uses the actual evaluated geometry for camera clearance and ray casts. All four directed links pass nine opening samples each: **36/36 clear rays**, including leaves and walls. Each ray extends 3 cm beyond the far wall plane, accounting for its incidence angle. The sampled positions cover three lateral fractions and three heights. This verifies visible clickable anchors, not a full accessibility or walkable-body clearance claim.

`portals.json` contains the real arched aperture profiles sampled with the same builder function, the four directed links, their visible anchors and per-destination arrival views. Yaw/pitch are radians; FOV is degrees. There is no bath↔bedroom shortcut. `portal-probe.json` records rejected and selected camera candidates. The bathroom door remains approximately 0.531 m wide; this work does not claim adult accessibility.

## Rendering and reproduction

Jobs are `jobs/cubemap-{common,bath,bedroom}.json`. Run from the repository root:

```sh
python3 tools/locations/cli.py cubemap \
  --job docs/storyboard/production/house-tour-20260923/geometry/jobs/cubemap-common.json \
  --out /Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/rooms/common \
  --host mini
```

The executed jobs reused a hash-verified base cache with `--build /Volumes/TB4/mac-mini-storage/shared/pinpin-location-workflow-20260923/common-still/build`; the command above can rebuild from the pinned source recipe without that cache. Heavy outputs remain under `shared/pinpin-house-tour-20260923/rooms/` on TB4.

Each atlas contains six true 90° perspectives from one scene and one origin, 1024×1024 each, arranged top front/right/back and bottom left/up/down. All six orientations and camera matrices are recorded. The full atlas is 3072×2048. `finalize_outputs.py` independently checks the twelve geometric edge pairings, each decoded tile against its source PNG, all door states, and lossless WebP RGB equality. Compact source provenance retains the full original render manifest and its external location; the raw atlas and individual face masters remain on TB4; only the lossless WebP derivative is copied into source.

Generated illustrations must be reviewed separately for doorway/adjacent-room consistency. The geometry checks do not establish that later imagegen output obeys these constraints. Art direction and browser UI are separate lanes.

## Final result

All three renders completed and passed source/artifact validation. `render-checks.json` records successful 18-face pixel comparisons, twelve paired cube edges per room, common source scene, and lossless review derivatives. All four links retain 36/36 unobstructed aperture samples. The three standard CLI prepared bundles also validate; `prepared-jobs.json` records their external manifests and prompt hashes. Final imagegen art direction remains separately supervised and may add the selected style references without changing these geometric source jobs.

Ready source images: `rooms/common/cube-atlas.webp`, `rooms/bath/cube-atlas.webp`, `rooms/bedroom/cube-atlas.webp`. The raw guides for whole-atlas imagegen are external `rooms/<room>/cube-atlas.png`. No tool runtime or previous location examples were changed.
