"""One native-25-frame software key, with no segmentation-model input."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

from key import FFMPEG, SIMILARITY, BLEND, filter_string


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--native',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--verify-existing',action='store_true',help='Finish verification only; never rewrite PNGs')
    args=p.parse_args()
    if args.out.exists() and not args.verify_existing:
        raise ValueError('New output directory required')
    if args.verify_existing and (not args.out.exists() or (args.out/'key.json').exists()):
        raise ValueError('Expected existing frames without a completed key record')
    before=digest(args.native)
    probe=json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe','-v','error',
        '-select_streams','v:0','-show_frames','-show_entries',
        'frame=best_effort_timestamp_time','-of','json',str(args.native)]))
    times=[float(f['best_effort_timestamp_time']) for f in probe['frames']]
    if len(times)!=25 or not np.allclose(times,np.arange(25)/24,atol=0.00001):
        raise ValueError('Expected 25 native samples at 24fps')
    raw=subprocess.check_output([FFMPEG,'-v','error','-i',str(args.native),'-frames:v','26',
        '-vf','format=rgba','-f','rawvideo','-pix_fmt','rgba','-'])
    native=np.frombuffer(raw,np.uint8).reshape(25,720,1280,4)[:,:,:,:3]
    border=np.zeros((720,1280),bool)
    border[:16]=True;border[-16:]=True;border[:,:16]=True;border[:,-16:]=True
    key_rgb=np.median(native[0][border],axis=0).astype(int).tolist()
    if not (key_rgb[1]>200 and key_rgb[0]<40 and key_rgb[2]<40):
        raise ValueError('Measured background is not the expected saturated green')
    if not args.verify_existing:
        args.out.mkdir(parents=True)
        (args.out/'rgba-frames').mkdir()
    command=[FFMPEG,'-v','error','-n','-i',str(args.native),'-vf',filter_string(key_rgb),
        '-fps_mode','passthrough','-frames:v','25','-start_number','0',
        str(args.out/'rgba-frames/%03d.png')]
    if not args.verify_existing:
        subprocess.run(command,check=True)
    records=[]
    for i in range(25):
        path=args.out/'rgba-frames'/f'{i:03d}.png'
        with Image.open(path) as im:
            assert im.mode=='RGBA' and im.size==(1280,720)
            rgba=np.array(im)
        assert np.array_equal(native[i],rgba[:,:,:3]), 'Unexpected RGB alteration'
        rgb=native[i].astype(int);alpha=rgba[:,:,3]
        cream=(rgb[:,:,0]>200)&(rgb[:,:,1]>170)&(rgb[:,:,2]>130)
        cream &= (rgb[:,:,0]>=rgb[:,:,1])&(rgb[:,:,1]>=rgb[:,:,2])
        records.append({'frame':i,'path':str(path.relative_to(args.out)),
            'sha256':digest(path),'bytes':path.stat().st_size,
            'border_clear_fraction':float((alpha[border]==0).mean()),
            'warm_cream_color_pixels':int(cream.sum()),
            'warm_cream_opaque_fraction':float((alpha[cream]==255).mean()) if cream.any() else None,
            'partial_alpha_pixels':int(((alpha>0)&(alpha<255)).sum())})
    assert digest(args.native)==before
    record={'native':str(args.native),'native_sha256':before,'key_rgb':key_rgb,
        'key_sampling':'Median RGB of native frame000 16px border; fixed across all frames',
        'filter':'FFmpeg colorkey (RGB)','similarity':SIMILARITY,'blend':BLEND,
        'command':command,'timestamps_seconds':times,'frames':records,'rgb_unchanged':True,
        'rgb_reference':'FFmpeg format=rgba decode; RGB24 conversion may round differently',
        'input_unchanged':True,'segmentation_model_used':False,'despill_or_painting':False,
        'limits':'Color tests are not anatomical masks. Mixed green edges can retain spill; no automatic repair.',
        'code_sha256':{n:digest(Path(__file__).with_name(n)) for n in ['run.py','key.py']}}
    (args.out/'key.json').write_text(json.dumps(record,indent=2)+'\n')
    print(args.out/'key.json')


if __name__=='__main__':
    main()
