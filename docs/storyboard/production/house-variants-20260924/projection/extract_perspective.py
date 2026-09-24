"""Deterministic square perspective from a new panorama, using renderer orientation."""
from pathlib import Path
import argparse,json,math
import numpy as np
from stack_math import rays,sha,load,save
from trusted_reproject import pano_sample
p=argparse.ArgumentParser();p.add_argument('--input',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--yaw',type=float,default=0);p.add_argument('--pitch',type=float,default=0);p.add_argument('--fov',type=float,default=110);p.add_argument('--size',type=int,default=1400);a=p.parse_args();image=load(a.input)[...,:3]
assert image.shape[1]==image.shape[0]*2 and 0<a.fov<180 and -90<=a.pitch<=90
w=rays(a.size,math.radians(a.yaw),math.radians(a.pitch),a.fov);result=np.rint(np.clip(pano_sample(image,w[...,[0,2,1]]),0,255)).astype(np.uint8);save(a.output,result)
record={'schemaVersion':1,'operation':'deterministic equirectangular to perspective extraction','input':{'path':str(a.input),'sha256':sha(a.input),'dimensions':[image.shape[1],image.shape[0]]},'output':{'path':str(a.output),'sha256':sha(a.output),'dimensions':[a.size,a.size]},'camera':{'yawDegrees':a.yaw,'pitchDegrees':a.pitch,'horizontalFovDegrees':a.fov,'verticalFovDegrees':a.fov},'sampling':'EncodedRGB bilinear, pixel-center rays, panorama longitude wraps and latitude clamps','orientation':'Renderer[x,up,forward]=world[X,Z,Y]; down at yaw0/pitch-90 uses right+X, imageup+Y, viewforward-Z; compatible with repairs.down','scriptSha256':sha(__file__),'stackMathSha256':sha(Path(__file__).with_name('stack_math.py')),'helperSha256':sha(Path(__file__).with_name('trusted_reproject.py')),'noArtisticEditing':True};a.output.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record['output']))
