"""Authorized 0..23 preview trim, referencing original PNGs without copying them."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def identity(path):
    return {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'bytes': path.stat().st_size}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--trial', type=Path, required=True)
    args = parser.parse_args()
    root = args.trial.resolve()
    output = root/'candidate24-v01'
    if output.exists():
        raise ValueError('Refusing existing output')
    frames = [root/'matte-v01/rgba-frames'/f'{i:03d}.png' for i in range(25)]
    before = [identity(p) for p in frames]
    audit = json.loads((root/'seam-audit-v01/metrics.json').read_text())
    if [h['sha256'] for h in before] != audit['rgba_sha256']:
        raise ValueError('Frames differ from audited inputs')
    output.mkdir()
    previews, comparisons = [], []
    for name, color in [('dark', '0x18181c'), ('green', '0x289b46')]:
        target = output/f'candidate24-{name}.mp4'
        command = ['/opt/homebrew/bin/ffmpeg', '-v', 'error', '-n', '-f', 'lavfi',
            '-i', f'color=c={color}:s=1280x720:r=24', '-framerate', '24',
            '-start_number', '0', '-i', str(root/'matte-v01/rgba-frames/%03d.png'),
            '-filter_complex', '[0:v][1:v]overlay=shortest=1:format=auto,format=yuv420p[v]',
            '-map', '[v]', '-frames:v', '24', '-an', '-c:v', 'libx264', '-crf', '18',
            '-movflags', '+faststart', str(target)]
        subprocess.run(command, check=True)
        probe = json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe',
            '-v', 'error', '-count_frames', '-show_streams', '-of', 'json', str(target)]))
        stream = probe['streams'][0]
        if (len(probe['streams']) != 1 or stream['nb_read_frames'] != '24'
                or stream['r_frame_rate'] != '24/1' or float(stream['duration']) != 1
                or (stream['width'], stream['height']) != (1280, 720)):
            raise ValueError('Unexpected candidate preview timing/dimensions')
        previews.append({'path': str(target.relative_to(root)), **identity(target),
                         'command': command, 'probe': probe})
        original = root/'matte-v01'/f'matte-{name}.mp4'
        comparisons.append({'path': str(original.relative_to(root)), **identity(original),
                            'frames': 25, 'fps': 24, 'duration_seconds': 25/24})
    if [identity(p) for p in frames] != before:
        raise ValueError('Original PNGs changed during encoding')
    manifest = {
        'version': 1, 'status': 'candidate24_not_certified_seamless',
        'path_base': 'parent trial directory', 'frames': 24, 'fps': 24,
        'duration_seconds': 1, 'native_frames': 25, 'native_duration_seconds': 25/24,
        'selection': 'Original indices 0 through 23 inclusive; omit 24 only.',
        'authorization': 'Main authorized bounded software candidate on 2026-09-23.',
        'source_frames': [{'index': i, 'path': str(p.relative_to(root)),
                           'timestamp_seconds': i/24, **before[i]}
                          for i, p in enumerate(frames[:24])],
        'omitted_frame': {'index': 24, 'path': str(frames[24].relative_to(root)), **before[24]},
        'previews': previews, 'raw25_comparisons': comparisons,
        'source_pngs_unchanged': True, 'duplicated_pngs': 0,
        'resize_warp_crossfade_interpolation': False,
        'preview_encoding': 'Opaque background compositing and lossy H264 yuv420p preview only; original RGBA bytes retained.',
        'limits': 'Local seam direction improves; variable foot speed and gait/contact uncertainty remain.',
        'code_sha256': identity(Path(__file__))['sha256'],
    }
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(output/'manifest.json')


if __name__ == '__main__':
    main()
