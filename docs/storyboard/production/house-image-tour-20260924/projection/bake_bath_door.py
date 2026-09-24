"""Authorized deterministic wider bath-door patch mask; no painting."""
from pathlib import Path
import math,json
import numpy as np
from trusted_reproject import load,save,bilinear,pano_sample
from project import sha,smooth
root=Path(__file__).resolve().parents[1]
base=root/'bath/panorama-v1.png';patch=root/'bath/front-v1.png';out=root/'bath/panorama-door-v2.png'
a=load(base)[...,:3];p=load(patch)[...,:3]
w,h=3072,1536;result=np.empty((h,w,3),np.uint8);supportCount=0;outsideExact=True
for start in range(0,h,48):
 yy,xx=np.meshgrid(np.arange(start,min(start+48,h)),np.arange(w),indexing='ij')
 yaw=((xx+.5)/w-.5)*2*np.pi;pitch=(.5-(yy+.5)/h)*np.pi
 rays=np.stack((np.sin(yaw)*np.cos(pitch),np.cos(yaw)*np.cos(pitch),np.sin(pitch)),-1)
 z=rays[...,1];t=math.tan(math.radians(55));x=rays[...,0]/(np.where(z>0,z,1)*t);y=rays[...,2]/(np.where(z>0,z,1)*t)
 edge=np.maximum(abs(x),abs(y));alpha=(1-smooth(edge,.94,.995))*(z>0)*(edge<.995)
 original=pano_sample(a,rays);replacement=bilinear(p,(x+1)*p.shape[1]/2-.5,(1-y)*p.shape[0]/2-.5)
 row=np.rint(np.clip(original*(1-alpha[...,None])+replacement*alpha[...,None],0,255)).astype(np.uint8)
 outside=alpha==0;outsideExact &= np.array_equal(row[outside],np.rint(original[outside]).astype(np.uint8));supportCount+=int(np.sum(~outside))
 result[start:start+len(yy)]=row
save(out,result)
record={'schemaVersion':1,'operation':'resample base then bounded wider front-door composite','base':{'path':str(base),'sha256':sha(base),'size':[a.shape[1],a.shape[0]]},'patch':{'path':str(patch),'sha256':sha(patch),'size':[p.shape[1],p.shape[0]]},'camera':{'yawDegrees':0,'pitchDegrees':0,'fovDegrees':110},'mask':{'fullWeightMaxAbsQ':.94,'zeroWeightMaxAbsQ':.995,'feather':'1-smoothstep(.94,.995,max(abs(q)))','forwardRaysOnly':True},'output':{'path':str(out),'sha256':sha(out),'size':[w,h]},'scriptSha256':sha(__file__),'supportedPixels':supportCount,'outsideMaskMatchesSameResolutionBaseResample':bool(outsideExact),'sourceOriginalUnchanged':True,'note':'3072x1536 is deterministic resampling, not newly invented detail. Runtime front patch may remain for original patch detail. No other room edited.'}
out.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n');assert outsideExact;print(json.dumps(record['output']))
