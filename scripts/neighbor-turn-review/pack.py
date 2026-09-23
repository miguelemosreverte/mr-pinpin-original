"""Pack explicit, unchanged-index RGBA frame selections into compact review sheets."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


def pack(trial, spec_path, out):
    trial = trial.resolve(strict=True)
    spec = json.loads(spec_path.read_text())
    out = out.resolve()
    if out.exists():
        raise ValueError('Output must be new')
    plans = []
    for clip in spec['clips']:
        if clip['id'] not in ('loop000', 'loop015', 'turn000015', 'turn015000'):
            raise ValueError('Unknown clip')
        frames = []
        for name in clip['frames']:
            source = (trial / name).resolve(strict=True)
            if not source.is_relative_to(trial):
                raise ValueError('Frame escapes trial')
            with Image.open(source) as image:
                if image.mode != 'RGBA' or image.size != (1280, 720):
                    raise ValueError('Expected native 1280x720 RGBA')
            frames.append((source, hashlib.sha256(source.read_bytes()).hexdigest()))
        if len(frames) != 24 or len({p for p, _ in frames}) != 24 or clip['durationMs'] != 1000:
            raise ValueError('Playback requires 24 distinct samples at 24fps, exactly 1000ms')
        plans.append((clip, frames))
    if len({c['id'] for c, _ in plans}) != 4:
        raise ValueError('Need both loops and both directed turns')
    out.mkdir(parents=True)
    records = []
    for clip, frames in plans:
        sheet = Image.new('RGBA', (480 * 6, 270 * ((len(frames) + 5) // 6)))
        rects, inputs = [], []
        for i, (source, before_hash) in enumerate(frames):
            with Image.open(source) as image:
                proxy = image.resize((480, 270), Image.Resampling.LANCZOS)
            rect = [i % 6 * 480, i // 6 * 270, 480, 270]
            sheet.paste(proxy, tuple(rect[:2]))
            assert hashlib.sha256(source.read_bytes()).hexdigest() == before_hash
            rects.append(rect)
            inputs.append({'path': str(source.relative_to(trial)), 'sha256': before_hash})
        target = out / (clip['id'] + '.webp')
        sheet.save(target, lossless=True, exact=True, method=4)
        records.append({'id': clip['id'], 'sheet': target.name, 'frames': rects,
                        'size': list(sheet.size), 'bytes': target.stat().st_size,
                        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'inputs': inputs,
                        'durationMs': clip['durationMs'], 'fps': 24})
    result = {'version': 1, 'method': 'Fixed 480x270 display proxies; lossless RGBA WebP sheet. No per-frame alignment, warp, crossfade or reversal.',
              'source_size': [1280, 720], 'display_size': [480, 270], 'clips': records}
    (out / 'sheets.json').write_text(json.dumps(result, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--trial', type=Path, required=True)
    parser.add_argument('--spec', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    pack(args.trial, args.spec, args.out)
