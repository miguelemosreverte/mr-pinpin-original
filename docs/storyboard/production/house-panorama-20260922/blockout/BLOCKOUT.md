# Cottage 360° geometric blockout

This is a deliberately simplified grayscale structure guide, not chapter artwork. It uses only generated primitive meshes and neutral materials; no external assets, downloads, or runtime changes.

- Blender 4.5.14 on the Mac mini; Cycles CPU, 48 samples, denoised.
- Room: 6 × 6 m, eaves 2.7 m, pitched roof ridge 3.5 m.
- Camera: room centre `(0, 0, 1.15)` m, world `+Y` forward, world `+Z` up.
- True equirectangular projection: 360° longitude × 180° latitude, 2048 × 1024 pixels. Front direction at `u=0.5`; level horizon at `v=0.5`. Rear direction spans the left/right seam.
- Front wall: 1.0 m wide arched doorway, crown 2.2 m; circular windows 0.85 m in diameter centred at `x=±1.15`, height 1.4 m. Door is open 70° outward, with hinges on the viewer-right jamb.
- Kitchen counter and shelves left; stove front-right; bookcase along the right wall; rear bench, table and chest. Continuous timber floor and roof cover the nadir and zenith.
- Lighting: neutral broad exterior daylight, ceiling bounce, rear fill. Geometry is defined by surface value, illumination and occlusion.

Files: `build_room.py` is the entire scene recipe; `room-blockout.blend` preserves the editable scene; `room-blockout-equirectangular.png` is the image-generation structure reference; `scene-spec.json` records numeric settings; `render.log` records the render.

Reproduce on the mini:

```sh
/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/MacOS/Blender -b -t 8 --python /Volumes/TB4/mac-mini-storage/shared/pinpin-house-panorama-20260922/blockout/build_room.py
```

The canonical front artwork is a style/reference image, not a source of measured architectural dimensions. Rear and side arrangements here are proposed continuity geometry. This file is a structure guide for the image-generation experiment, not a claim that generated stylization will automatically preserve perfect spherical projection or seams.

Validation is reproducible with `validate.py`; `validation.json` records the actual saved camera orientation, projection, dimensions and file hashes. The camera's local forward axis maps to world `+Y` and its up axis maps to world `+Z`, both within floating-point tolerance. Visual inspection confirms the front door at horizontal centre, the back table across the left/right seam, and continuous roof and floor. Edge pixels are adjacent rays, not duplicate rays, so their colors need not be numerically identical; the geometric scene itself has no wrap cut.
