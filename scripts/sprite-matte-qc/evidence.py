"""Small marked crops and native-rate preview encoding."""
import subprocess

import numpy as np
from PIL import Image, ImageDraw


def composite(frame, color):
    return Image.alpha_composite(Image.new('RGBA', (frame.shape[1], frame.shape[0]), (*color, 255)),
                                 Image.fromarray(frame)).convert('RGB')


def crop_evidence(native, before, after, record, output):
    x0, y0, x1, y1 = record['bbox_xyxy']
    box = (max(0, x0-45), max(0, y0-35), min(before.shape[1], x1+45), min(before.shape[0], y1+35))
    changed = np.any(before != after, axis=2).astype(np.uint8)*255
    panels = [('Native RGB', Image.fromarray(native)),
              ('Before: dark', composite(before, (24, 24, 28))),
              ('After: dark', composite(after, (24, 24, 28))),
              ('Exact changed-pixel mask', Image.fromarray(changed).convert('RGB')),
              ('Before: green', composite(before, (40, 155, 70))),
              ('After: green', composite(after, (40, 155, 70)))]
    width, height = (box[2]-box[0])*3, (box[3]-box[1])*3
    sheet = Image.new('RGB', (width*3, (height+24)*2), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, (label, image) in enumerate(panels):
        x, y = i%3*width, i//3*(height+24)
        draw.text((x+4, y+6), label, fill='black')
        crop = image.crop(box).resize((width, height), Image.Resampling.NEAREST)
        sheet.paste(crop, (x, y+24))
        if i in (1, 2, 4, 5):
            draw.rectangle((x+(x0-box[0])*3-3, y+24+(y0-box[1])*3-3,
                            x+(x1-box[0])*3+3, y+24+(y1-box[1])*3+3), outline='#d93535', width=2)
    sheet.save(output)


def encode(frames, color, output, ffmpeg):
    height, width = frames.shape[1:3]
    command = [ffmpeg, '-v', 'error', '-n', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
        '-s', f'{width}x{height}', '-r', '24', '-i', '-', '-an', '-c:v', 'libx264',
        '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for frame in frames:
            process.stdin.write(composite(frame, color).tobytes())
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError('Preview encoding failed')
