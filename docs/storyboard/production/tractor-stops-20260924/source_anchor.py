#!/usr/bin/env python3
"""Bake the registered rectangular source projection used by tractor-panorama-anchor.js.
No artistic edits: bilinear sample the panorama and source, then apply the shader's
rectangular smoothstep feather. Runtime can retain the native source separately.
"""
import argparse, hashlib, json, math
from pathlib import Path
import cv2
import numpy as np

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def bilinear(image, x, y):
    h, w = image.shape[:2]
    x = np.clip(x, 0, w-1); y = np.clip(y, 0, h-1)
    x0 = np.floor(x).astype(np.int32); y0 = np.floor(y).astype(np.int32)
    x1 = np.minimum(x0+1, w-1); y1 = np.minimum(y0+1, h-1)
    fx = (x-x0)[..., None]; fy = (y-y0)[..., None]
    return ((image[y0,x0]*(1-fx)+image[y0,x1]*fx)*(1-fy)
            +(image[y1,x0]*(1-fx)+image[y1,x1]*fx)*fy)

def read_camera(value, source_aspect):
    data = json.loads(value) if value.lstrip().startswith('{') else json.loads(Path(value).read_text())
    c = data.get('camera', data)
    result = dict(yaw=c.get('yaw',c.get('yawRadians')), pitch=c.get('pitch',c.get('pitchRadians')),
                  fov=c.get('fov',c.get('verticalFovDegrees')), aspect=c.get('aspect',source_aspect),
                  featherStart=c.get('featherStart',.94))
    if any(v is None or not math.isfinite(v) for v in result.values()):
        raise ValueError('Finite yaw/pitch radians, vertical fov degrees, aspect and featherStart required')
    if not 0 < result['fov'] < 180 or result['aspect'] <= 0 or not 0 <= result['featherStart'] < 1:
        raise ValueError('Invalid camera frustum or feather')
    return result

def assemble(panorama, source, camera, width):
    height=width//2; output=np.empty((height,width,3),dtype=np.uint8)
    theta=((np.arange(width,dtype=np.float64)+.5)/width-.5)*2*np.pi
    cy,sy=np.cos(camera['yaw']),np.sin(camera['yaw'])
    cp,sp=np.cos(camera['pitch']),np.sin(camera['pitch'])
    tan=math.tan(math.radians(camera['fov'])/2)
    for start in range(0,height,128):
        end=min(height,start+128)
        v=(np.arange(start,end,dtype=np.float64)+.5)/height
        phi=(.5-v)*np.pi; cosphi=np.cos(phi)[:,None]
        wx=cosphi*np.sin(theta)[None,:]; wy=np.broadcast_to(np.sin(phi)[:,None],wx.shape)
        wz=cosphi*np.cos(theta)[None,:]
        ax=wx*cy-wz*sy; az=wx*sy+wz*cy
        ly=wy*cp-az*sp; lz=wy*sp+az*cp
        safe=np.where(lz>1e-12,lz,1)
        qx=ax/(safe*tan*camera['aspect']); qy=ly/(safe*tan)
        edge=np.maximum(np.abs(qx),np.abs(qy))
        t=np.clip((edge-camera['featherStart'])/(1-camera['featherStart']),0,1)
        weight=np.where(lz>0,1-t*t*(3-2*t),0)[...,None]
        px=np.broadcast_to((np.arange(width)+.5)/width*panorama.shape[1]-.5,wx.shape)
        py=np.broadcast_to(v[:,None]*panorama.shape[0]-.5,wx.shape)
        base=bilinear(panorama,px,py)
        detail=bilinear(source,(.5+.5*qx)*source.shape[1]-.5,(.5-.5*qy)*source.shape[0]-.5)
        output[start:end]=np.clip(np.rint(base*(1-weight)+detail*weight),0,255).astype(np.uint8)
    return output

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--panorama',required=True); ap.add_argument('--source',required=True)
    ap.add_argument('--camera',required=True,help='JSON filename or JSON object; yaw/pitch radians and vertical fov degrees')
    ap.add_argument('--output',required=True); ap.add_argument('--width',type=int,choices=[3072,4096],default=3072)
    args=ap.parse_args(); p=cv2.imread(args.panorama,cv2.IMREAD_COLOR); s=cv2.imread(args.source,cv2.IMREAD_COLOR)
    if p is None or s is None: raise ValueError('Both images must decode')
    if p.shape[1]!=2*p.shape[0]: raise ValueError('Background panorama must be2:1 equirectangular')
    camera=read_camera(args.camera,s.shape[1]/s.shape[0]); out=Path(args.output)
    if out.exists(): raise FileExistsError(f'Refusing to overwrite {out}')
    out.parent.mkdir(parents=True,exist_ok=True)
    image=assemble(p,s,camera,args.width)
    if not cv2.imwrite(str(out),image): raise OSError('Image encoding failed')
    record={'schemaVersion':1,'operation':'Same ray projection and rectangular smoothstep mask as tractor-panorama-anchor.js; bilinear sampling, no art edits',
            'inputs':{k:{'path':str(v),'sha256':digest(v)} for k,v in [('panorama',args.panorama),('source',args.source)]},
            'camera':camera,'output':{'path':str(out),'width':args.width,'height':args.width//2,'sha256':digest(out)},
            'sampling':'Pixel centers; clamp-to-edge bilinear; encoded RGB mix; source full weight to edge .94, smoothstep to zero at1.0',
            'limitations':'Baked sphere resamples the source; it is not byte-identical to native source or a second runtime projection. Generated scenery boundary mismatch is preserved.',
            'software':{'opencv':cv2.__version__,'numpy':np.__version__},'scriptSha256':digest(__file__)}
    out.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps(record['output']))
if __name__=='__main__':main()
