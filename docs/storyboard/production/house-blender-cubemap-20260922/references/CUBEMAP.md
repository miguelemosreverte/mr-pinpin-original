# Direct Blender cubemap references

Two sets of six 1024 × 1024 grayscale perspective renders come directly from the same corrected cottage `.blend`, at one locked camera origin `(0, 0, 1.15)` metres. `faces-90/` contains canonical 90° horizontal/vertical views; `faces-110/` contains matching 110° overscan views for image generation, with ten degrees of extra coverage on each side. These are new geometric camera renders, not reprojections of generated artwork. The room, outward-opening door, furniture, lighting and neutral materials are identical in every face.

Blender 4.5.14 on the Mac mini, Cycles CPU, 24 samples per canonical face, 16 samples per overscan face, denoising, seed 0. Existing dependencies only. No repository runtime, asset policy, or generated chapter artwork was changed.

## Orientation contract

World axes: **front +Y, right +X, up +Z**. PNG UV starts at the upper-left. The image-right and image-up vectors are explicit below.

| File | Camera forward | Image right | Image up |
|---|---|---|---|
| `front.png` | +Y | +X | +Z |
| `back.png` | −Y | −X | +Z |
| `right.png` | +X | −Y | +Z |
| `left.png` | −X | +Y | +Z |
| `up.png` | +Z | +X | −Y |
| `down.png` | −Z | +X | +Y |

A compatible unfolded cross (no face rotation needed in this arrangement):

```text
          up
  left   front   right   back
         down
```

For a pixel centre, `u=(x+0.5)/1024`, `v=(y+0.5)/1024`:

```text
worldRay = normalize(forward + (2*u-1)*imageRight + (1-2*v)*imageUp)
```

The ray starts at the same camera origin for all six faces. `orientation.json` records every face basis, camera rotation matrix, Euler angles, pixel dimensions, source-scene hash and image hashes. Blender camera local −Z is forward, +X is image-right, and +Y is image-up. Rotations are built from those basis vectors and checked before rendering; no guessed Euler conventions.

To convert a Blender world direction to the current browser panorama shader convention, map `(x,y,z)` to `(x,z,y)`. Browser +Z is front, while Blender +Y is front. `back.png` corresponds to the earlier browser repair input named `rear.png`. These new cubemap faces are 90°; earlier artistic-repair inputs were 110° and must not share a FOV label.

## Reproduction and retained outputs

`render_cubemap.py` opens the corrected source `.blend`, creates the six cameras, saves `room-cubemap-rig.blend`, and renders all faces. The rig preserves the full scene and six selectable cameras. `render.log` records each completed render. The source scene is retained unchanged in the sibling `blockout/` folder.

```sh
/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/MacOS/Blender -b -t 8 --python /Volumes/TB4/mac-mini-storage/shared/pinpin-house-panorama-20260922/blender-cubemap-reference/render_cubemap.py
```

`validate_cubemap.py` checks all six output hashes and the 12 shared cube-edge ray correspondences. A geometric cube seam is shared exactly; independent sampling and denoising can still produce small pixel-value differences. Future stylization should preserve face boundaries and use this locked scene as the common geometric reference.


## Overscan image-generation inputs

`faces-110/{front,back,right,left,up,down}.png` uses exactly the same scene and camera basis as `faces-90/`, with FOV widened to 110°. The corresponding ray formula multiplies both image-plane terms by `tan(55°)`. `faces-110/orientation.json` explicitly records this FOV and the correct formula, with all six final image hashes. Run `render_overscan.py` after building the canonical rig to reproduce it.

All 12 PNGs have been checked for correct 1024² dimensions and matching recorded hashes. All six canonical faces were visually reviewed. The 12 canonical geometric edge correspondences passed validation. All output is retained externally on TB4; no official preview or asset role was changed.
