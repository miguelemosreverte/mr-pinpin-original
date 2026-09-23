"""Single native-frame local matting probe; original video is read-only."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent
os.environ['U2NET_HOME'] = str(ROOT.parent.parent / 'pinpin-matting-models')
os.environ['NUMBA_CACHE_DIR'] = str(ROOT.parent.parent / 'pinpin-matting-numba-cache')
os.environ['OMP_NUM_THREADS'] = '4'

from PIL import Image, ImageDraw
import numpy as np
from rembg import new_session
from rembg.bg import alpha_matting_cutout
from importlib.metadata import version

source = ROOT.parent / 'white-walk-pixverse-v01.mp4'
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
assert source_hash == '7ca187118f003e7b0d7ace3a16fa5f0bc03eead0115c4adee1f0428c92495877'
assert not (ROOT / 'frame-000.rgba.png').exists(), 'Do not overwrite a reviewed result'
png = subprocess.check_output(['/opt/homebrew/bin/ffmpeg', '-v', 'error', '-i', str(source),
    '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'])
original = Image.open(io.BytesIO(png)).convert('RGB')
original.save(ROOT / 'frame-000.original.png')
start = time.monotonic()
session = new_session('u2netp', providers=['CPUExecutionProvider'])
print('Local u2netp session ready', flush=True)
mask = session.predict(original)[0]
mask.save(ROOT / 'frame-000.model-mask.png')
print('Mask inferred; refining with PyMatting and foreground color estimation', flush=True)
# Calling the library primitive directly makes a matting failure visible, not a silent fallback.
rgba = alpha_matting_cutout(original, mask, 240, 10, 10)
rgba.save(ROOT / 'frame-000.rgba.png')
rgba.getchannel('A').save(ROOT / 'frame-000.alpha.png')
panels = [('Original native frame', original)]
for label, color in [('Matte on dark', (24, 24, 28)), ('Matte on green', (40, 155, 70)),
                     ('Matte on magenta', (175, 55, 145))]:
    bg = Image.new('RGBA', rgba.size, (*color, 255))
    panels.append((label, Image.alpha_composite(bg, rgba).convert('RGB')))
sheet = Image.new('RGB', (1280, 768), 'white')
draw = ImageDraw.Draw(sheet)
for i, (label, panel) in enumerate(panels):
    x, y = (i % 2) * 640, (i // 2) * 384
    draw.text((x + 8, y + 6), label, fill='black')
    sheet.paste(panel.resize((640, 360), Image.Resampling.LANCZOS), (x, y + 24))
sheet.save(ROOT / 'frame-000.preview.png')
alpha = np.asarray(rgba.getchannel('A'))
models = list(Path(os.environ['U2NET_HOME']).rglob('u2netp.onnx'))
record = {'source': str(source), 'source_sha256': source_hash, 'frame_index': 0,
    'method': 'u2netp + rembg alpha_matting_cutout / PyMatting closed-form alpha and foreground ML',
    'foreground_threshold': 240, 'background_threshold': 10, 'erode_size': 10,
    'model': [{'path': str(p), 'bytes': p.stat().st_size,
               'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in models],
    'versions': {p: version(p) for p in ('rembg', 'pymatting', 'onnxruntime', 'numpy', 'pillow')},
    'seconds_including_model_setup': round(time.monotonic() - start, 3),
    'alpha_counts': {'zero': int((alpha == 0).sum()), 'opaque': int((alpha == 255).sum()),
                     'partial': int(((alpha > 0) & (alpha < 255)).sum())},
    'paid_api_calls': 0, 'temporal_consistency': 'Not assessed; one-frame probe only',
    'outputs': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.glob('frame-000.*.png')}}
assert hashlib.sha256(source.read_bytes()).hexdigest() == source_hash
(ROOT / 'frame-000.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record), flush=True)
