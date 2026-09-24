# Rear-wrap perspective repair: projection recipe

The input is the untouched native experiment panorama, 1774×887, SHA-256 `5299c3fe2c6791bf556e9cdcdd7caec379a747b4bc0113ab972d04c8632b1f00`. This lane only extracts a perspective image and projects a separately generated repair back into a bounded region. It does not generate artwork, redesign the room, or repair the poles.

## Ordinary view supplied to imagegen

`repair-view-before.png` is a 1400×1400 perspective extraction centered directly on the original longitude wrap: yaw π, pitch 0°, horizontal and vertical FOV 110°. Forward is world−Y, screen-right−X, screen-up+Z. Thus the left/right panorama borders become adjacent content at the center of an ordinary image. The view includes the entry, neighboring window, and visible wall/floor/ceiling around their discontinuity.

The exact output SHA is `028548c4536ca9b3e720838ee91de086d93632849a4f648b5a930892a6689c2c`. `repair-view-before.json` records orientation, input/output/script hashes and pixel-center sampling. Sampling reuses the unchanged `pano_sample`/`bilinear` implementation copied as `trusted_reproject.py`, with the original PNG helper. The two trusted copies retain the prior implementation byte-for-byte.

Heavy artifacts and scripts live under `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/`. Source media paths currently point to those specific working files. They are not production assets or proof of remote archival.

## Bounded inverse projection

After the built-in image tool returns a square RGB patch, `composite` evaluates each original panorama pixel's ray in that perspective camera. The patch can have a different square resolution; normalized camera coordinates stay unchanged. Non-square results are rejected rather than cropped or silently reframed.

Let x/y be normalized perspective coordinates, with image bounds at ±1. Alpha is the product of two smoothstep falloffs:

- Horizontal: fully opaque through |x|≤0.45, smoothly fading to zero at |x|≥0.80.
- Vertical: fully opaque through |y|≤0.75, smoothly fading to zero at |y|≥0.98.
- Forward-facing rays only. Smoothstep is `1−t²(3−2t)`, with t clamped to 0…1 between those limits.

This yields rear-longitude support of ±48.805657° and a maximum latitude of ±54.454289° at the seam. The footprint narrows vertically toward its side edges because it is a perspective frustum, not a latitude rectangle. It is broad enough to blend a coherent wall section, with nearly the full extracted image height available; true poles remain untouched.

On the 1774×887 original, nonzero support is 241,226 pixels (about 15.3%). Inclusive bounding boxes are x 0…240 and x 1533…1773, y 175…711. The actual analytic mask is smaller than these two rectangles. `repair-mask.png` is its quantized grayscale preview. `mask-support-proof.png` tints the original with cyan according to that preview; it is **diagnostic only**, never a repair input or final artwork.

The final original-size image is `panorama-v1.png`; composite metadata and the generated analytic-mask preview are `panorama-v1.json` and `panorama-v1-alpha.png`. Outside nonzero support, decoded RGB is asserted byte-identical to the original. The top/bottom rows and opposite meridian are explicitly checked. Existing pole defects and other rooms/fixtures outside this region are not fixed by this operation.

## Commands actually supported

Run on the mini with its existing Blender-bundled NumPy interpreter:

```sh
/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/Resources/4.5/python/bin/python3.11 \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/project_wrap.py extract \
  --input /Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-20260923/panorama-v1.png \
  --output /Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/repair-view-before.png \
  --size 1400

# After imagegen supplies repair-view-after.png:
/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/Resources/4.5/python/bin/python3.11 \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/project_wrap.py composite \
  --input /Volumes/TB4/mac-mini-storage/shared/pinpin-house-native-panorama-20260923/panorama-v1.png \
  --patch /Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/repair-view-after.png \
  --output /Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/panorama-v1.png
```

Then the unchanged prior `reproject.py pano-to-cube --face-size 512` can derive the standard 1536×1024 atlas. Cube conversion does not upscale the original 1774×887 sphere or perform further art repair.

## Checks and scope

Perspective ray/inverse checks pass with maximum normalized error 1.11×10⁻¹⁶; the center is exactly −Y. `projection-test.json` records a test composite using the **unmodified extracted view**, not a generated repair. Resampling can change pixels inside its support; decoded RGB outside the support is exactly retained. This verifies mechanics, not artistic quality.

A generated patch can shift a door, window or beam. Inspect its inverse-projected center and feather boundaries in the actual viewer, not merely its attractive flat center. Preserve the original and report visible ghosts, mismatched silhouettes or wrap lines honestly. Mathematical consistency is separate from successful artwork. Poles are explicitly deferred by this experiment.

The composite also records before/after first-versus-last-column RGB differences over latitude ±40°, which is fully opaque at the rear seam. Mean and 95th-percentile absolute per-channel differences are measured on the 8-bit scale. Adjacent columns have slightly different rays; a lower number is supporting evidence, not proof of zero full-sphere seam or unchanged detail. All pixels at |latitude|≥55° are additionally asserted unchanged.

## Executed repair and composite

One externally generated repair was supplied as `repair-view-after-v1.png`, 1254×1254, SHA-256 `1e0591216df7312f18efb19249d5225c7c11df5dc2172bcda6b84c155aa0c1f6`. It was sampled directly using the same normalized 110° perspective; it was not resized or cropped first. The composite ran on the mini with the frozen script.

The final 1774×887 panorama SHA is `11b29c3163c73305ac0d19545af1e1fb674be1bf4420e6659cb02d06555cd4c1`. Exactly 225,568 pixels (14.3351%) changed within the 241,226-pixel support. Every decoded RGB sample outside alpha support remained identical, as did all pixels at |latitude|≥55° and the opposite meridian. Inclusive support bounds remain the two regions above. See `panorama-v1.json` for the actual patch identity, analytic mask and checks.

Across 395 rows in the fully opaque ±40° rear-seam band, adjacent-column mean absolute RGB-channel difference decreased from 42.9907 to 5.9882; p95 decreased from 127 to 26 on the 0…255 scale. For comparison, resampling the unedited extraction alone already lowered the mean to 31.5688 and p95 to 92.8. The generated patch therefore improves this bounded metric beyond that roundtrip, but neither number certifies feature alignment or the untouched poles.

The unchanged cube converter produced 1536×1024 (`cube-atlas-v1.png`) with 512-pixel faces and all 12 shared-ray checks passing. The lossless WebP SHA is `3e45663beaf6cdabb13369b1213869210668a699a24426a8c7325a450749e891`; decoded RGB exactly matches the derived PNG. Mini ffmpeg lacked a WebP encoder, so this single small encoding used existing Air Pillow while reading/writing TB4 only; extraction, composite and sphere/cube projection ran on the mini. `cube-atlas-v1.json` records the actual derivative details.

The repaired perspective removes the obvious central image cut in its flat view. Actual projected center and feather-boundary review belongs to the before/after browser report; these mechanical results do not claim that the whole sphere or old semantic mistakes are now fixed.
