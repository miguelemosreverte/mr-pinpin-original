# Bath join diagnostic projection

`extract_stack.py` samples the frozen current bath stack and three diagnostic layer variants at the same square camera: yaw **1.9 radians**, pitch **−0.5 radians**, FOV **90°**, **1400×1400**. These angles share the center of the browser reproduction; the browser's wider viewport and 72° vertical FOV are deliberately not described as identical framing.

`input-config.json` records each input's repository path, exact SHA-256, external source path, and local extraction filename. Copy or link those verified originals into an external `inputs/` directory beside `projection/`; do not substitute another selected generation. On the mini, run with a Python environment containing NumPy:

```sh
python3 projection/extract_stack.py --config projection/input-config.json --out .
```

The completed run lives in `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-bath-join-20260924/`. Source PNG entries link to those outputs. `extraction.json` includes output hashes, active layer lists, camera settings and frozen shader/config hashes. The code copies the runtime local ray transforms, linear texture sampling, edge weights, front mask and normalized blend. It does not invent image pixels through painting or call Blender/imagegen.

Outputs:

- `current-stack-before.png`: base plus current front/rear/down repairs.
- `base-only-before.png`: same camera, base alone.
- `down-only-before.png`: same camera, base plus downward repair.
- `without-down-before.png`: same camera, base plus front/rear.
- `down-weight.png`: grayscale raw down alpha before normalized blending; diagnostic, not art.

Inspection confirms the downward repair has a different tub silhouette and rug placement. Its blend introduces the broken metal band and doubled rug visible in the current stack. The no-down variant restores the tub locally, but does not establish that the floor pole elsewhere can safely lose its repair. The UI lane is evaluating a bounded mask. These exports preserve the before state and do not select a fix.
