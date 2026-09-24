#!/usr/bin/env python3
"""Extract explicit frame indices from a hash-pinned video; no image restoration."""
import argparse, hashlib, json, pathlib, subprocess

def sha(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for b in iter(lambda:f.read(1048576),b''): h.update(b)
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--video',required=True);ap.add_argument('--selection',required=True);ap.add_argument('--out',required=True);ap.add_argument('--ffmpeg',default='/opt/homebrew/bin/ffmpeg');ap.add_argument('--ffprobe',default='/opt/homebrew/bin/ffprobe');args=ap.parse_args()
    cfg=json.loads(pathlib.Path(args.selection).read_text());video=pathlib.Path(args.video);out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
    assert sha(video)==cfg['video']['sha256'],'Video SHA mismatch'
    probe=json.loads(subprocess.check_output([args.ffprobe,'-v','error','-select_streams','v:0','-show_entries','stream=width,height,avg_frame_rate,nb_frames,duration','-of','json',str(video)]))['streams'][0]
    assert probe['avg_frame_rate']=='24/1'
    rows=[]
    for stop in cfg['stops']:
        dest=out/'frames'/stop['id']/'original.png';dest.parent.mkdir(parents=True,exist_ok=True)
        cmd=[args.ffmpeg,'-v','error','-i',str(video),'-vf',f"select=eq(n\\,{stop['frameIndex']})",'-frames:v','1','-fps_mode','vfr','-c:v','png','-y',str(dest)]
        subprocess.run(cmd,check=True)
        rows.append({**stop,'actualTimestampSeconds':stop['frameIndex']/24,'path':str(dest.relative_to(out)),'sha256':sha(dest),'bytes':dest.stat().st_size,'width':probe['width'],'height':probe['height'],'command':cmd})
    manifest={'schemaVersion':1,'operation':'Exact selected decoded frames to lossless PNG; no resize, restore, sharpen or image generation','video':cfg['video'],'videoProbe':probe,'extractorSha256':sha(__file__),'selectionSha256':sha(args.selection),'frameIndexOrigin':0,'stops':rows}
    (out/'frames-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'count':len(rows),'bytes':sum(r['bytes'] for r in rows),'manifest':str(out/'frames-manifest.json')}))
if __name__=='__main__':main()
