# Deterministic cube/panorama projection

`reproject.py` performs geometric resampling only. It never paints, heals, blends mismatched objects, or changes geometry. Original images remain untouched. NumPy is required; PNG input/output uses the copied standard-library helper `png_io.py` from the frozen location workflow. The mini's bundled Blender Python provides NumPy without installing a new environment.

The cube layout is top **front/right/back**, bottom **left/up/down**, with the exact room-render camera bases. Equirectangular output is 2:1: world +Y faces image center (u=.5), +X is u=.75, −Y is the wrapping image border, −X is u=.25, +Z is the top. Horizon v=.5; rows increase downward. Panorama width3072 produces3072×1536.

Sampling uses encoded RGB bilinear interpolation at pixel centers. Cube sampling clamps within a selected face; panorama sampling wraps longitude and clamps latitude. This changes image projection, not its artwork. Existing cube discontinuities remain visible in the panorama and require separate artistic correction.

Run on the mini with the external scripts copied beside their inputs:

```sh
/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/Resources/4.5/python/bin/python3.11 \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/projection/reproject.py \
  cube-to-pano --input /absolute/cube-atlas.png --output /absolute/panorama.png --width 3072

/Volumes/TB4/mac-mini-storage/tools/blender-4.5.14/Blender.app/Contents/Resources/4.5/python/bin/python3.11 \
  /Volumes/TB4/mac-mini-storage/shared/pinpin-house-tour-20260923/projection/reproject.py \
  pano-to-cube --input /absolute/repaired-panorama.png --output /absolute/cube-atlas.png --face-size 512
```

Each conversion emits a sibling JSON with exact input/output/script hashes, dimensions, sampling convention and verification. Reverse conversion verifies all twelve shared angular cube boundaries at257 samples each, using the same source panorama. This proves matching projection at identical rays; it cannot prove that the source panorama itself has matching left/right artwork or coherent poles. Neighboring output texel centers represent different directions, so we do not falsely claim identical edge-row pixels or copy border pixels to manufacture them.

The common gray cube→panorama→cube test has mean RGB error0.2405/255,95th percentile1, maximum59 at fine high-contrast boundaries. Six analytic cardinal-direction tests pass (maximum0.5/255), confirming yaw, pole and tile conventions. See `projection-checks.json` and `common-gray-roundtrip.json` for evidence. These are expected resampling differences; the original guide remains the geometry authority.

Prepared external inputs are `common-gray-equirect.png`, `common-v3-equirect.png`, `bath-gray-equirect.png`, `bath-v2-equirect.png`, `bedroom-gray-equirect.png`, and `bedroom-v1-equirect.png` under the external `projection/` directory. All are3072×1536. Only scripts/manifests are in source to conserve the Air's disk.

The three repaired `panorama-v1.png` originals (1774×887 each) were reverse-projected to512px faces and encoded as lossless1536×1024 runtime WebPs. Their individual conversion/provenance files are `illustrated/<room>/projection-panorama-v1.json`. These replace only the explicitly authorized tour illustration textures; previous cube candidates and new panorama originals remain external and unchanged. Painted seam/pole/door registration review belongs to the browser/art review lane.
