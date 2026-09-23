"""One separately recorded FFmpeg despill derivative; alpha must remain exact."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

from key import FFMPEG, DESPILL


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--baseline',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    args=p.parse_args()
    assert not args.out.exists(), 'New output only'
    baseline=json.loads((args.baseline/'key.json').read_text())
    for item in baseline['frames']:
        assert sha(args.baseline/item['path'])==item['sha256']
    args.out.mkdir(parents=True);(args.out/'rgba-frames').mkdir()
    command=[FFMPEG,'-v','error','-n','-framerate','24','-start_number','0','-i',
        str(args.baseline/'rgba-frames/%03d.png'),'-vf',DESPILL,'-frames:v','25',
        '-start_number','0',str(args.out/'rgba-frames/%03d.png')]
    subprocess.run(command,check=True)
    results=[]
    for item in baseline['frames']:
        a=np.array(Image.open(args.baseline/item['path']));target=args.out/item['path']
        b=np.array(Image.open(target));assert np.array_equal(a[:,:,3],b[:,:,3])
        warm=(a[:,:,0]>=a[:,:,1])&(a[:,:,1]>=a[:,:,2])&(a[:,:,3]>=240)
        delta=np.abs(a[:,:,:3].astype(int)-b[:,:,:3].astype(int))
        results.append({'frame':item['frame'],'path':item['path'],'sha256':sha(target),
            'bytes':target.stat().st_size,'alpha_exact':True,
            'changed_visible_rgb_pixels':int(((delta.max(2)>0)&(a[:,:,3]>0)).sum()),
            'warm_opaque_pixels':int(warm.sum()),'warm_opaque_changed_pixels':int(((delta.max(2)>0)&warm).sum()),
            'warm_opaque_max_channel_change':int(delta[warm].max()) if warm.any() else None})
        assert sha(args.baseline/item['path'])==item['sha256']
    record={'baseline_key_sha256':sha(args.baseline/'key.json'),'command':command,
        'filter':DESPILL,'frames':results,'alpha_identical_to_baseline':True,
        'mask_morphology_or_painting':False,'segmentation_model_used':False,
        'limitation':'Only green-channel spill suppression; gray/dark fringes may remain.',
        'code_sha256':sha(Path(__file__))}
    (args.out/'despill.json').write_text(json.dumps(record,indent=2)+'\n')
    print(args.out/'despill.json')


if __name__=='__main__':
    main()
