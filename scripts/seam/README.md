# Bounded Sprite Seam Audit

Read-only evidence for the 25-frame, 24fps, 1280x720 atlas top-down trial.
Uses existing mini Pillow/numpy/scipy; no new dependencies or paid calls.

```sh
python audit.py --native /external/native.mp4 --rgba /external/rgba-frames \
  --output /external/seam-audit-v01
python -m unittest discover -s . -p 'test_*.py'
```

Output directory must be new. Inputs are hashed before/after. The utility writes
metrics only; it neither retimes nor interpolates, drops, or repairs frames.
Compare actual 25-sample wrap 24->0 with hypothetical 24-sample wrap 23->0.
At 24fps these last 1.041667s and 1s respectively. Dropping a redundant endpoint
is only a proposal until endpoint pose AND boundary motion are reviewed.

Metrics exclude white-background dilution. Silhouette/alpha differences measure
shape changes; native low/high-frequency interior differences provide limited
evidence of broad appearance/detail changes. These cannot perfectly separate
texture flicker from real motion. Signed alpha derivatives are not tracked leg
velocities. Inspect native all-frame and boundary contact sheets, especially
paws and body heading, before judging gait, contact, or seamlessness.

No automatic accept threshold. Report uncertain or occluded paw motion honestly.
An identical first/last pose does not establish matching incoming/outgoing speed.
Interpolation is not warranted solely because RGB error improves; propose any
derivative before modifying media. Source media, runtime, and prior trials stay
untouched.

## Authorized Candidate24

After explicit approval, `python candidate24.py --trial /external/trial` creates
a new `candidate24-v01/` with dark/green MP4 previews from original RGBA frames
0-23 at 24fps. It references rather than copies PNGs, verifies their hashes against
the seam audit before/after encoding, and records commands/probes in a manifest.
The output is a one-second candidate, not a seamlessness certification. Originals
are never resized, warped, blended, or overwritten; preview H264 encoding is lossy.
