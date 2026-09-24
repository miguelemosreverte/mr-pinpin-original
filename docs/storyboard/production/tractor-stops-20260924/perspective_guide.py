#!/usr/bin/env python3
"""Map one rectangular image into a neutral spherical guide; no artistic edits."""
import argparse,hashlib,json,math,pathlib,sys
import numpy as np
ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--out',required=True);ap.add_argument('--vertical-fov',type=float,default=45);ap.add_argument('--width',type=int,default=4096);ap.add_argument('--helpers',default=str(pathlib.Path(__file__).resolve().parents[4]/'tools/panoramas'));args=ap.parse_args();sys.path.insert(0,args.helpers)
from trusted_reproject import load,save,bilinear,pano_sample
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
a=load(args.input)[...,:3];ih,iw=a.shape[:2];aspect=iw/ih;t=math.tan(math.radians(args.vertical_fov)/2);w=args.width;h=w//2
assert w%2==0 and 0<args.vertical_fov<170
out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True);guide=np.full((h,w,3),192,np.uint8);mask=np.zeros((h,w,3),np.uint8)
for y0 in range(0,h,64):
 yy,xx=np.meshgrid(np.arange(y0,min(y0+64,h)),np.arange(w),indexing='ij');yaw=((xx+.5)/w-.5)*2*np.pi;pitch=(.5-(yy+.5)/h)*np.pi
 z=np.cos(yaw)*np.cos(pitch);qx=np.sin(yaw)*np.cos(pitch)/np.maximum(z,1e-12)/(t*aspect);qy=np.sin(pitch)/np.maximum(z,1e-12)/t
 inside=(z>0)&(abs(qx)<=1)&(abs(qy)<=1);c=bilinear(a,(qx+1)*iw/2-.5,(1-qy)*ih/2-.5);sl=guide[y0:y0+len(yy)];sl[inside]=np.rint(c[inside]).astype(np.uint8);mask[y0:y0+len(yy)][inside]=255
save(out/'guide-equirect.png',guide);save(out/'guide-known-mask.png',mask)
# Return through the same pinhole model for a visible and quantitative projection check.
returned=np.empty_like(a)
for y0 in range(0,ih,64):
 yy,xx=np.meshgrid(np.arange(y0,min(y0+64,ih)),np.arange(iw),indexing='ij');x=(2*(xx+.5)/iw-1)*t*aspect;y=(1-2*(yy+.5)/ih)*t;q=np.stack((x,np.ones_like(x),y),axis=-1);returned[y0:y0+len(yy)]=np.rint(pano_sample(guide,q)).clip(0,255).astype(np.uint8)
save(out/'guide-roundtrip.png',returned);err=np.abs(returned[8:-8,8:-8].astype(float)-a[8:-8,8:-8]);rows,cols=np.where(mask[...,0]>0)
r={'schemaVersion':1,'operation':'Bilinear perspective-to-equirectangular guide; unknown region neutral RGB192; no generative fill','input':{'path':str(args.input),'sha256':sha(args.input),'width':iw,'height':ih},'camera':{'yawRadians':0,'pitchRadians':0,'verticalFovDegrees':args.vertical_fov,'aspect':aspect,'horizontalFovDegrees':math.degrees(2*math.atan(t*aspect)),'lensStatus':'Authored reconstruction convention; video lens not measured; actual source aspect retained, nominal16:9'},'panorama':{'width':w,'height':h,'convention':'+Y front at u=.5,v=.5; +X right at u=.75; +Z up at v=0'},'knownPixelBoundsInclusive':[int(cols.min()),int(rows.min()),int(cols.max()),int(rows.max())],'outputs':[{'path':f,'sha256':sha(out/f)} for f in ['guide-equirect.png','guide-known-mask.png','guide-roundtrip.png']],'roundtrip':{'meanAbsRGB255Excluding8pxBorder':float(err.mean()),'p95AbsRGB255Excluding8pxBorder':float(np.percentile(err,95)),'note':'Two bilinear resamplings soften detail; no source byte identity claimed. Native source retained separately.'},'scriptSha256':sha(__file__),'helperHashes':{n:sha(pathlib.Path(args.helpers)/n) for n in ['trusted_reproject.py','png_io.py']},'scope':'Guide anchors the visible rectangle. Unknown sphere is not reconstructed geometry; later generated background and camera alignment require review.'}
(out/'guide.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r['camera']));print(json.dumps(r['roundtrip']))
