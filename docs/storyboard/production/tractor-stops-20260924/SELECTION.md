# Orbit frame selection

Selected **24 sampled stops**, extracted from the preserved provider video, before restoration or panorama generation. These are visually distributed viewpoints, **not measured 15° camera positions**. The video has nonuniform motion, changing detail and some machinery deformation, so timestamps do not establish true orbit angles.

The original half-second contact sheet showed almost stationary front-quarter views through the opening two seconds and again near the end. Selection removes most of those holds and samples the faster rear/opposite-side circuit more densely. The final 24-frame contact sheet was inspected: it follows the near side, trailer rear, opposite side, front, and back toward the starting quarter. Spacing remains approximate; restoration cannot make these a calibrated reconstruction.

`selection.json` pins explicit zero-based frame indices; `frames-manifest.json` records actual timestamps at 24 fps, exact extraction commands, source SHA, output hashes, sizes and dimensions. Every original PNG is 1280×720, decoded without scaling, sharpening or regeneration. Source media are links to originals on the mini. They total 30,491,557 bytes. The JPEG contact sheet contains review thumbnails only.

**Pilot: stop-04, frame 96, t=4.000 seconds.** It is the exact same blurry near-side frame previously retained as the near exploration input. The selection index is organizational, not an angle. Pilot work lives separately in `pilot/`; frame originals must stay unchanged. There are no 24 ready panoramas at this stage.

```sh
python3 extract_frames.py --video /external/tractor-orbit-20260924/orbit-v1.mp4 --selection selection.json --out /external/tractor-stops-20260924
python3 make_contact_sheet.py --root /external/tractor-stops-20260924
```

The first command requires FFmpeg/FFprobe and uses the script defaults installed on the mini. The second uses Pillow only for review thumbnails. All heavy work runs directly on the mini SSD; SCP transfers metadata and temporary reference copies while SMB is stalled. No new video was requested.

## Pilot registration guide

`perspective_guide.py` places the restored native rectangle into a neutral 4096×2048 equirectangular guide. The chosen camera is yaw 0, pitch 0 and vertical FOV 45°. It retains the actual 1672×941 restored-image aspect, giving horizontal FOV 72.70527373°; this is a reconstruction convention, not a measured video lens. Unknown directions are neutral gray and a separate binary mask marks the supported rays.

`pilot/guide/guide.json` pins source/output/helper hashes and the projection. The inverse perspective proof retains the tractor framing. Its interior mean absolute RGB error is 5.415/255 after two bilinear resamplings (95th percentile 22/255); the unmodified restoration stays separate for detail. Mathematical registration of this guide does not force the image model to preserve the core or produce continuous new scenery.

```sh
python3 perspective_guide.py --input /external/pilot/restored-v1.png --out /external/pilot/guide --helpers /repo/tools/panoramas
```

The helper requires NumPy and uses the existing repository PNG/projection utilities. No Blender process is invoked.

## Pilot camera fit — review pending

The generated sphere did not retain the guide's 45° framing: its tractor is enlarged, and that entry crops the machinery. `compare_pilot.py` records the unchanged-camera comparison. `fit_camera.py` then matches SIFT features to an 80° search view, filters with a RANSAC homography, and robustly fits yaw/pitch/vertical FOV to the corresponding spherical rays. This fits camera parameters only; it neither warps nor paints the panorama.

The pilot fit is yaw +3.171°, pitch +0.217°, vertical FOV 65.1134°. It has 185 RANSAC inliers (177 below an 8-pixel physical-fit residual), median 3.12 pixels and 90th percentile 5.98 pixels at a 1280-pixel reference width. **Those features concentrate on the cab and crane (reference x 25–69%), so this score does not prove whole-frame correspondence.** The saved half-opacity overlay shows drift in peripheral wheels and scenery; the far trailer edge remains cropped. Camera fitting improves scale but does not establish an exact transition or justify a completed batch.

Evidence: `pilot/fit/fit.json`, `fitted-view.png`, `overlay.png` and `matches.jpg`. The isolated mini `fit-env` contains NumPy, SciPy and OpenCV; existing project environments were not changed. This remains a bounded pilot, with no generation in the projection lane.
