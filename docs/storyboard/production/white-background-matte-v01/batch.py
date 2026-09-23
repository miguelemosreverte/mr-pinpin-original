"""Bounded 25-frame local matte and comparison, preserving native timing."""
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

source = ROOT.parent / 'white-walk-pixverse-v01.mp4'
expected = '7ca187118f003e7b0d7ace3a16fa5f0bc03eead0115c4adee1f0428c92495877'
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
frames = ROOT / 'rgba-frames'
frames.mkdir()
ffmpeg = '/opt/homebrew/bin/ffmpeg'
data = subprocess.check_output([ffmpeg, '-v', 'error', '-i', str(source), '-f', 'rawvideo',
    '-pix_fmt', 'rgb24', '-'])
assert len(data) == 25 * 1280 * 720 * 3
encoder = subprocess.Popen([ffmpeg, '-v', 'error', '-n', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
    '-s', '1280x768', '-r', '24', '-i', '-', '-an', '-c:v', 'libx264', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(ROOT / 'matte-comparison.mp4')],
    stdin=subprocess.PIPE)
session = new_session('u2netp', providers=['CPUExecutionProvider'])
contact = Image.new('RGB', (1280, 800), (24, 24, 28))
contact_draw = ImageDraw.Draw(contact)
stats = []
previous = None
start = time.monotonic()
for index in range(25):
    original = Image.frombytes('RGB', (1280, 720), data[index*2764800:(index+1)*2764800])
    if index == 0:
        rgba = Image.open(ROOT / 'frame-000.rgba.png').convert('RGBA')
    else:
        mask = session.predict(original)[0]
        rgba = alpha_matting_cutout(original, mask, 240, 10, 10)
    rgba.save(frames / f'{index:03d}.png')
    panels = [('Original native frame', original)]
    for label, color in [('Matte on dark', (24, 24, 28)), ('Matte on green', (40, 155, 70)),
                         ('Matte on magenta', (175, 55, 145))]:
        bg = Image.new('RGBA', rgba.size, (*color, 255))
        panels.append((label, Image.alpha_composite(bg, rgba).convert('RGB')))
    sheet = Image.new('RGB', (1280, 768), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, (label, panel) in enumerate(panels):
        x, y = (i % 2) * 640, (i // 2) * 384
        draw.text((x + 8, y + 6), f'{label} | frame {index:02d}', fill='black')
        sheet.paste(panel.resize((640, 360), Image.Resampling.LANCZOS), (x, y + 24))
    encoder.stdin.write(sheet.tobytes())
    if index in (6, 12, 18, 24):
        sheet.save(ROOT / f'frame-{index:03d}.preview.png')
    x, y = (index % 5)*256, (index // 5)*160
    contact_draw.text((x+4, y+2), str(index), fill='white')
    contact.paste(panels[1][1].resize((256, 144), Image.Resampling.LANCZOS), (x, y+16))
    alpha = np.asarray(rgba.getchannel('A'))
    ys, xs = np.where(alpha > 127)
    stats.append({'index': index, 'timestamp_seconds': index/24,
        'alpha_zero': int((alpha == 0).sum()), 'alpha_opaque': int((alpha == 255).sum()),
        'alpha_partial': int(((alpha > 0) & (alpha < 255)).sum()),
        'bbox_alpha_gt_127': [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)],
        'alpha_mean_absolute_change_from_previous': None if previous is None else
             round(float(np.abs(alpha.astype(float)-previous).mean()), 5)})
    previous = alpha.astype(float)
    print(f'Matted frame {index+1}/25', flush=True)
encoder.stdin.close()
assert encoder.wait() == 0
contact.save(ROOT / 'all-25-dark-contact.png')
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
record = {'source_sha256': expected, 'frames': 25, 'fps': 24, 'duration_seconds': 25/24,
    'method': 'Same u2netp/PyMatting settings as frame-000.json; reused local session',
    'temporal_filter': None, 'temporal_warning': 'Independent masks; equal settings do not guarantee temporal stability. Alpha changes also include genuine motion.',
    'retiming_or_endpoint_removal': False, 'paid_api_calls': 0,
    'seconds_processing': round(time.monotonic()-start, 3), 'frame_statistics': stats,
    'outputs': [{'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size,
                 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                for p in sorted(frames.glob('*.png'))]}
(ROOT / 'batch.json').write_text(json.dumps(record, indent=2)+'\n')
print('Complete: 25 RGBA PNGs, native-rate comparison MP4, contact sheet and metrics', flush=True)
