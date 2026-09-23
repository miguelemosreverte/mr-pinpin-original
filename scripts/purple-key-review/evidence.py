"""Small native/baseline/despill comparisons; no source media changes."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw

from key import FFMPEG


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def dark(im, color=(24,24,28)):
    return Image.alpha_composite(Image.new('RGBA',im.size,(*color,255)),im).convert('RGB')


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--trial',type=Path,required=True)
    root=p.parse_args().trial;out=root/'key-evidence-v01';out.mkdir(exist_ok=False)
    native_path=root/'green-walk-pixverse-v01.mp4';native_hash=sha(native_path)
    raw=subprocess.check_output([FFMPEG,'-v','error','-i',str(native_path),'-frames:v','25',
        '-vf','format=rgba','-f','rawvideo','-pix_fmt','rgba','-'])
    native=np.frombuffer(raw,np.uint8).reshape(25,720,1280,4)
    contacts=[Image.new('RGB',(1280,25//5*168),'white') for _ in range(3)]
    noses=Image.new('RGB',(1920,5*146),'white');nd=ImageDraw.Draw(noses)
    frames=[]
    for i in range(25):
        paths=[root/name/'rgba-frames'/f'{i:03d}.png' for name in ['green-key-baseline-v01','green-key-despill-v01']]
        hashes=[sha(q) for q in paths]
        images=[Image.fromarray(native[i]).convert('RGB')]+[dark(Image.open(q).convert('RGBA')) for q in paths]
        for j,im in enumerate(images):
            x=(i%5)*256;y=(i//5)*168;ImageDraw.Draw(contacts[j]).text((x+4,y+3),f'{i:02d}',fill='black')
            contacts[j].paste(im.resize((256,144),Image.Resampling.LANCZOS),(x,y+22))
            nx=(i%5)*384+j*128;ny=(i//5)*146
            nd.text((nx+3,ny+2),f'{i:02d} '+['native','baseline','despill'][j],fill='black')
            noses.paste(im.crop((840,280,1060,490)).resize((128,122),Image.Resampling.LANCZOS),(nx,ny+22))
        if i==0:
            alpha=Image.open(paths[1]).getchannel('A').convert('RGB')
            views=images+[alpha];sheet=Image.new('RGB',(1600,410),'white');d=ImageDraw.Draw(sheet)
            for j,im in enumerate(views):
                d.text((j*400+5,4),['Native','Baseline / dark','Despill / dark','Unchanged alpha'][j],fill='black')
                sheet.paste(im.crop((840,280,1060,490)).resize((400,382),Image.Resampling.NEAREST),(j*400,25))
            sheet.save(out/'nose-frame000.png')
        assert hashes==[sha(q) for q in paths]
        frames.append({'frame':i,'baseline_sha256':hashes[0],'despill_sha256':hashes[1]})
    for name,im in zip(['native-all25.png','baseline-dark-all25.png','despill-dark-all25.png'],contacts):
        im.save(out/name)
    noses.save(out/'nose-all25.png')
    previews=[]
    for folder in ['green-key-baseline-v01','green-key-despill-v01']:
        for name,color in [('dark','0x18181c'),('green','0x289b46')]:
            target=root/folder/f'{name}.mp4'
            command=[FFMPEG,'-v','error','-n','-f','lavfi','-i',f'color=c={color}:s=1280x720:r=24',
                '-framerate','24','-i',str(root/folder/'rgba-frames/%03d.png'),'-filter_complex',
                '[0:v][1:v]overlay=shortest=1:format=auto,format=yuv420p[v]','-map','[v]',
                '-frames:v','25','-an','-c:v','libx264','-crf','18','-movflags','+faststart',str(target)]
            subprocess.run(command,check=True)
            previews.append({'path':str(target.relative_to(root)),'sha256':sha(target),'command':command})
    assert sha(native_path)==native_hash
    (out/'evidence.json').write_text(json.dumps({'native_sha256':native_hash,'frames':frames,
        'previews':previews,'nose_crop_exclusive':[840,280,1060,490],
        'preview_note':'25 native samples at 24fps; not trimmed or retimed',
        'code_sha256':sha(Path(__file__))},indent=2)+'\n')
    print(out)


if __name__=='__main__':
    main()
