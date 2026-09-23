"""Read-only metrics for the bounded 25-frame, 24fps, 720p top-down trial."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

from metrics import assess


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native', type=Path, required=True)
    parser.add_argument('--rgba', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True, help='New directory only')
    parser.add_argument('--ffmpeg', default='/opt/homebrew/bin/ffmpeg')
    parser.add_argument('--ffprobe', default='/opt/homebrew/bin/ffprobe')
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Output must not exist')
    native_hash = digest(args.native)
    paths = sorted(args.rgba.glob('*.png'))
    if [p.name for p in paths] != [f'{i:03d}.png' for i in range(25)]:
        raise ValueError('Expected 000.png through 024.png only')
    hashes = [digest(p) for p in paths]
    probe = json.loads(subprocess.check_output([
        args.ffprobe, '-v', 'error', '-select_streams', 'v:0', '-show_frames',
        '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', str(args.native)]))
    times = [float(f['best_effort_timestamp_time']) for f in probe['frames']]
    if len(times) != 25 or not np.allclose(times, np.arange(25)/24, atol=0.00001):
        raise ValueError('Expected native timestamps 0 through 1 second at 24fps')
    alphas = []
    for path in paths:
        with Image.open(path) as im:
            if im.mode != 'RGBA' or im.size != (1280, 720):
                raise ValueError('Expected 1280x720 RGBA frames')
            alphas.append(np.array(im)[:, :, 3])
    raw = subprocess.check_output([args.ffmpeg, '-v', 'error', '-i', str(args.native),
        '-frames:v', '26', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    if len(raw) != 25*720*1280*3:
        raise ValueError('Unexpected decoded video dimensions/frame count')
    native = np.frombuffer(raw, dtype=np.uint8).reshape(25, 720, 1280, 3)
    result = assess(native, np.stack(alphas), 24)
    result.update(native_sha256=native_hash, rgba_sha256=hashes,
                  native_path=str(args.native.resolve()), rgba_path=str(args.rgba.resolve()),
                  timestamps_seconds=times,
                  code_sha256={name: digest(Path(__file__).with_name(name))
                               for name in ['audit.py', 'metrics.py']})
    if digest(args.native) != native_hash or [digest(p) for p in paths] != hashes:
        raise ValueError('Inputs changed during assessment')
    args.output.mkdir(parents=True, exist_ok=False)
    (args.output/'metrics.json').write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(args.output/'metrics.json')


if __name__ == '__main__':
    main()
