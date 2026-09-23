"""Reuse generic detection only on the new clip; never call the repair function."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
TOOLS = ROOT.parent/'pinpin-white-background-trial-20260923/matte-qc-tools-v01'
sys.path.insert(0, str(TOOLS))
from detector import detect, settings_record

source = ROOT/'atlas-topdown-walk-pixverse-v01.mp4'
expected = '7688f1ee5030de0385d5e9a77017a127591f010c5bd304bc6a91160b1ad732bf'
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
paths = sorted((ROOT/'matte-v01/rgba-frames').glob('*.png'))
assert len(paths) == 25
hashes = [hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]
rgba = np.stack([np.asarray(Image.open(p).convert('RGBA')) for p in paths])
raw = subprocess.check_output(['/opt/homebrew/bin/ffmpeg', '-v', 'error', '-i', str(source),
    '-frames:v', '26', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
assert len(raw) == 25*1280*720*3
native = np.frombuffer(raw, np.uint8).reshape(25, 720, 1280, 3)
records, candidates = detect(native, rgba)
for record, _ in candidates:
    i = record['frame']
    x0, y0, x1, y1 = record['bbox_xyxy']
    box = (max(0, x0-25), max(0, y0-25), min(1280, x1+25), min(720, y1+25))
    image = Image.fromarray(rgba[i])
    matte = Image.alpha_composite(Image.new('RGBA', (1280, 720), (24, 24, 28, 255)), image)
    width, height = (box[2]-box[0])*3, (box[3]-box[1])*3
    sheet = Image.new('RGB', (width*3, height+24), 'white')
    draw = ImageDraw.Draw(sheet)
    for k, (label, panel) in enumerate((('Native RGB', Image.fromarray(native[i])),
                                       ('Current matte: review only', matte.convert('RGB')),
                                       ('Unchanged alpha', image.getchannel('A').convert('RGB')))):
        draw.text((k*width+3, 5), label, fill='black')
        sheet.paste(panel.crop(box).resize((width, height), Image.Resampling.NEAREST), (k*width, 24))
    sheet.save(ROOT/'matte-v01'/f'review-{record["id"]}.png')
assert [hashlib.sha256(p.read_bytes()).hexdigest() for p in paths] == hashes
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
record = {'native_sha256': expected, 'input_frame_sha256': hashes,
    'detector_sha256': hashlib.sha256((TOOLS/'detector.py').read_bytes()).hexdigest(),
    'detector_source': str(TOOLS/'detector.py'), 'settings': settings_record(),
    'candidates': records, 'review_candidate_ids': [r['id'] for r, _ in candidates],
    'applied_repairs': [], 'inputs_unchanged': True, 'paid_api_calls': 0,
    'limitations': 'Read-only heuristic, not semantic certainty. Lower-body profile may miss new-view defects. No automatic deletion.'}
(ROOT/'matte-v01/detection-only.json').write_text(json.dumps(record, indent=2)+'\n')
print(json.dumps({'candidates': len(records), 'review_candidate_ids': record['review_candidate_ids'],
                  'applied_repairs': []}), flush=True)
