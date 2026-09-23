"""Bounded native contact/endpoints and diagnostic image-motion audit; no edits."""
import hashlib
import json
from pathlib import Path
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
source = ROOT/'atlas-topdown-walk-pixverse-v01.mp4'
expected = '7688f1ee5030de0385d5e9a77017a127591f010c5bd304bc6a91160b1ad732bf'
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
data = subprocess.check_output(['/opt/homebrew/bin/ffmpeg', '-v', 'error', '-i', str(source),
    '-frames:v', '26', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
assert len(data) == 25*1280*720*3
frames = np.frombuffer(data, np.uint8).reshape(25, 720, 1280, 3)
sheet = Image.new('RGB', (1280, 800), 'white')
draw = ImageDraw.Draw(sheet)
for i, frame in enumerate(frames):
    x, y = i%5*256, i//5*160
    draw.text((x+3, y+2), f'{i:02d} | {i/24:.3f}s', fill='black')
    sheet.paste(Image.fromarray(frame).resize((256, 144), Image.Resampling.LANCZOS), (x, y+16))
sheet.save(ROOT/'native-all25.png')
sheet = Image.new('RGB', (1280, 768), 'white')
draw = ImageDraw.Draw(sheet)
for k, i in enumerate((0, 1, 23, 24)):
    x, y = k%2*640, k//2*384
    draw.text((x+4, y+6), f'Native frame {i} | {i/24:.6f}s', fill='black')
    sheet.paste(Image.fromarray(frames[i]).resize((640, 360), Image.Resampling.LANCZOS), (x, y+24))
sheet.save(ROOT/'native-boundary-four.png')
mask = (frames[0].min(2) < 245) | (frames[-1].min(2) < 245)
difference = abs(frames[0].astype(float)-frames[-1].astype(float))
flows, intervals = {}, []
for first, last in ((0, 1), (1, 2), (22, 23), (23, 24), (24, 0)):
    a = cv2.cvtColor(frames[first], cv2.COLOR_RGB2GRAY)
    b = cv2.cvtColor(frames[last], cv2.COLOR_RGB2GRAY)
    flow = cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 3, 15, 3, 5, 1.2, 0)
    flows[(first, last)] = flow
    magnitude = np.linalg.norm(flow, axis=2)[mask]
    delta = abs(frames[first].astype(float)-frames[last].astype(float))[mask]
    intervals.append({'from': first, 'to': last, 'foreground_rgb_mae': float(delta.mean()),
        'flow_median_pixels_per_frame': float(np.median(magnitude)),
        'flow_p95_pixels_per_frame': float(np.percentile(magnitude, 95)),
        'flow_mean_xy_pixels_per_frame': flow[mask].mean(0).tolist()})
incoming, outgoing = flows[(23, 24)], flows[(0, 1)]
am, bm = np.linalg.norm(incoming, axis=2), np.linalg.norm(outgoing, axis=2)
moving = mask & (am > 0.5) & (bm > 0.5)
cosine = (incoming[moving]*outgoing[moving]).sum(1)/(am[moving]*bm[moving])
record = {'source_sha256': expected, 'frames': 25, 'fps': 24, 'no_native_edits': True,
    'endpoints_pixel_identical': bool(np.array_equal(frames[0], frames[-1])),
    'endpoint_fullframe_mae': float(difference.mean()),
    'endpoint_foreground_union_mae': float(difference[mask].mean()),
    'foreground_union_definition': 'Any channel <245 in first or last native frame; includes shadow, not anatomy',
    'foreground_union_pixels': int(mask.sum()), 'intervals': intervals,
    'boundary_incoming_outgoing': {'compared_moving_pixels': int(moving.sum()),
        'mean_vector_cosine': float(cosine.mean()) if len(cosine) else None,
        'opposing_direction_fraction': float((cosine < 0).mean()) if len(cosine) else None},
    'opencv': cv2.__version__, 'flow': {'method': 'Farneback', 'pyr_scale': 0.5,
        'levels': 3, 'winsize': 15, 'iterations': 3, 'poly_n': 5, 'poly_sigma': 1.2, 'flags': 0},
    'limitations': 'Dense image flow and same-coordinate comparison are diagnostics, not anatomical or physical paw velocity. Texture, occlusion, generation and compression affect them. No seamless-loop certification.',
    'artifacts': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
        for p in (ROOT/'native-all25.png', ROOT/'native-boundary-four.png')}}
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
(ROOT/'native-loop-audit.json').write_text(json.dumps(record, indent=2)+'\n')
print(json.dumps(record), flush=True)
