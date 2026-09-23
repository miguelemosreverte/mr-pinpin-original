"""FFmpeg RGB color-key baseline; historical folder name, current key is green."""
import subprocess

FFMPEG = '/opt/homebrew/bin/ffmpeg'
SIMILARITY = 0.08
BLEND = 0.12
DESPILL = 'despill=type=green:mix=1:expand=0:green=-1:alpha=0'


def filter_string(rgb):
    if len(rgb) != 3 or any(not 0 <= int(v) <= 255 for v in rgb):
        raise ValueError('Expected three byte channels')
    color = ''.join(f'{int(v):02x}' for v in rgb)
    return f'format=rgba,colorkey=0x{color}:similarity={SIMILARITY}:blend={BLEND}'


def key_raw(rgb_bytes, width, height, key_rgb):
    """Use the real installed FFmpeg filter for tiny regression fixtures."""
    result = subprocess.run([FFMPEG, '-v', 'error', '-f', 'rawvideo', '-pixel_format',
        'rgb24', '-video_size', f'{width}x{height}', '-i', '-', '-vf', filter_string(key_rgb),
        '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], input=rgb_bytes,
        capture_output=True, check=True)
    return result.stdout
