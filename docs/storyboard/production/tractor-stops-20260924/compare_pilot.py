#!/usr/bin/env python3
"""Extract the generated sphere using the guide camera for registration review."""
import argparse,hashlib,json,pathlib,sys,math
import numpy as np
ap=argparse.ArgumentParser();ap.add_argument('--guide',required=True);ap.add_argument('--panorama',required=True);ap.add_argument('--out',required=True);ap.add_argument('--helpers',required=True);a=ap.parse_args();sys.path.insert(0,a.helpers)
from trusted_reproject import load,save,pano_sample
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();g=json.loads(pathlib.Path(a.guide).read_text());pano=load(a.panorama)[...,:3];h=g['input']['height'];w=g['input']['width'];t=math.tan(math.radians(g['camera']['verticalFovDegrees'])/2);aspect=g['camera']['aspect'];out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True);result=np.empty((h,w,3),np.uint8)
for y0 in range(0,h,64):
 yy,xx=np.meshgrid(np.arange(y0,min(y0+64,h)),np.arange(w),indexing='ij');x=(2*(xx+.5)/w-1)*t*aspect;y=(1-2*(yy+.5)/h)*t;q=np.stack((x,np.ones_like(x),y),-1);result[y0:y0+len(yy)]=np.rint(pano_sample(pano,q)).clip(0,255).astype(np.uint8)
f=out/'panorama-forward45.png';save(f,result);r={'operation':'Generated sphere sampled at the exact authored guide camera; no alignment optimization','panorama':{'path':a.panorama,'sha256':sha(a.panorama)},'guideSha256':sha(a.guide),'camera':g['camera'],'output':{'path':f.name,'width':w,'height':h,'sha256':sha(f)},'scriptSha256':sha(__file__),'note':'Visual comparison required; this output does not assert correspondence.'};(out/'comparison.json').write_text(json.dumps(r,indent=2)+'\n')
