"""Native-rate opaque-background previews from the lossless RGBA sequence."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent
outputs = []
for name, color in [('dark', '0x18181c'), ('green', '0x289b46')]:
    output = ROOT / f'matte-{name}.mp4'
    command = ['/opt/homebrew/bin/ffmpeg', '-v', 'error', '-n', '-f', 'lavfi', '-i',
        f'color=c={color}:s=1280x720:r=24', '-framerate', '24', '-i',
        str(ROOT / 'rgba-frames/%03d.png'), '-filter_complex',
        '[0:v][1:v]overlay=shortest=1:format=auto,format=yuv420p[v]',
        '-map', '[v]', '-frames:v', '25', '-an', '-c:v', 'libx264', '-crf', '18',
        '-movflags', '+faststart', str(output)]
    subprocess.run(command, check=True)
    probe = json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe', '-v', 'error',
        '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(output)]))
    video = probe['streams'][0]
    assert len(probe['streams']) == 1
    assert video['nb_read_frames'] == '25' and video['r_frame_rate'] == '24/1'
    outputs.append({'path': output.name, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'bytes': output.stat().st_size, 'command': command, 'probe': probe})
(ROOT / 'render.json').write_text(json.dumps(outputs, indent=2)+'\n')
print('Ready: matte-dark.mp4 and matte-green.mp4, each 25 frames / 24 fps / no audio')
