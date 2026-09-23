# Green Key Baseline And Despill

The assignment began as purple; the user changed it to green before generation.
Historical folder/root names stay unchanged. No purple media was processed.
Existing FFmpeg plus mini Pillow/numpy only; no segmentation model or rembg mask.

```sh
python -m unittest discover -s . -p 'test_*.py'
python run.py --native /external/green-walk-pixverse-v01.mp4 --out /external/green-key-baseline-v01
python despill.py --baseline /external/green-key-baseline-v01 --out /external/green-key-despill-v01
python evidence.py --trial /external/trial
```

Commands require new output directories. `run.py --verify-existing` only finishes
verification of already-created PNGs when no completed key record exists; it never
rekeys or overwrites those frames. Evidence expects the standard sibling paths
shown above and refuses existing `key-evidence-v01/` and MP4s.

Baseline: FFmpeg RGB `colorkey`, fixed median key from native frame000's 16px
border, similarity 0.08, blend 0.12. All 25 native 1280x720 frames are retained at
24fps; no resizing or temporal edits. RGB is checked against the same FFmpeg
RGBA conversion path to avoid RGB24/RGBA decoder-rounding mismatches.

Separate derivative: `despill=type=green:mix=1:expand=0:green=-1:alpha=0`.
Every alpha byte must equal the baseline. Tests verify white, cream, brown/nose,
green variation, a mixed-color edge ramp, and preservation of alpha during despill.
Report records real warm-color changes; these color classes are not anatomical masks.

No automatic painting, mask erosion/dilation, or nose reconstruction. Spill can
be reduced without making fine edges perfect; dark/gray/yellow fringe may remain.
White and green generated clips are different media, not pixel-matched A/B input.
See `docs/storyboard/production/atlas-purple-key-v01/REVIEW-key.md` for results.
