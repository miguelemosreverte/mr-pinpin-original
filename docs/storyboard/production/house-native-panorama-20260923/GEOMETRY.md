# Direct native Blender panorama experiment

`native-guide.png` is one **direct Cycles equirectangular render** at2048×1024. It was not assembled from cube faces, reprojected from a cube, or painted. The scene, camera station and door states match the verified common-room geometry; only camera projection changes.

Camera position: [−1.3, −1.3, 1.15] meters. Blender camera Euler XYZ [π/2,0,0], full longitude [−π,π] and latitude [−π/2,π/2]. World +Y maps to image center, +X to u=.75, −Y to the wrapping image border, +Z to the top. **Yaw offset and canonical undo are both zero.** No panorama rotation is necessary.

The existing −Y wrap already crosses a quiet front-wall strip between the front door and window. Three actual scene rays at wrap yaw π±.04 and π hit the structural wall, not an opening or leaf. Door states remain front0°, bath75°, bedroom75°. The pinned floor, walls and furniture are unchanged, including the prior explicitly inferred ceiling/exterior/light supplement.

`native-guide.json` records the actual camera matrix, door matrices, camera clearance, wrap hit positions, base-scene/plan/script hashes, Blender4.5.14,24samples and seed7. The editable camera scene remains external as `native-scene.blend`.

## Verification

`verify_native.py` compares the direct spherical render against independent, previously rendered cube-face pixels at43,560 identical world rays. It tests canonical orientation, ±90° yaw,180° yaw and upside-down alternatives. `orientation-check.json` records the measured errors and verifies the actual camera matrix against world +Y/+X/+Z. The canonical match passes; different denoising and sampling produce small expected pixel differences.

The separate candidate underwent exactly one imagegen edit with an actual book image. Its1774×887 original is `panorama-v1.png`; the deterministic512px-face1536×1024 review derivative is `cube-atlas-v1.webp`. `projection-v1.json` records exact hashes and conversion checks. The result was retained without repair. It changes semantic fixtures: the parent review identifies a bath/bedroom substitution and a stove turned into a flower barrel. This guide and orientation check therefore do not establish that the generated image preserves the measured architecture. Browser/art review records the remaining projection and appearance findings.

## Reproduction and final conversion

Heavy work runs on the mini. The `render_native.py` arguments are a source/staged root containing the pinned location recipe and an external output directory:

```sh
/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/MacOS/Blender -b \
  --python /Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-20260923/render_native.py -- \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/rooms/common/.source \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-20260923
```

The script verifies the cached pinned base hash. That base is reconstructable with the existing source-driven location CLI; no frozen renderer code was modified. It saves a separate camera scene and leaves previous experiments untouched.

The generated panorama was converted with this existing frozen command (canonical yaw needs no undo):

```sh
/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/Resources/4.5/python/bin/python3.11 \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/projection/reproject.py \
  pano-to-cube \
  --input /Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-20260923/panorama-v1.png \
  --output /Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-20260923/cube-atlas-v1.png \
  --face-size 512
```

The final cube uses top[front,right,back], bottom[left,up,down]. Bilinear spherical sampling is deterministic; it performs no artwork repair. All twelve shared angular boundaries are checked, and the review WebP preserves the converted PNG’s decoded RGB bytes.

Executed orientation comparison: canonical mean RGB error0.7306/255 across43,560rays; incorrect ±90°/180° yaw and inverted latitude score28.45–31.99/255. The source guide was directly rendered once; the independent old cube is used only for validation, never to construct the guide.

Preservation completed: all six experiment media, including the separate native camera `.blend`, passed remote SHA-256 verification. See `assets/house-native-panorama.json`, `assets/house-native-panorama-receipt.json` and the scoped archive instructions. The experiment remains an uncorrected visual result, not selected production artwork.
