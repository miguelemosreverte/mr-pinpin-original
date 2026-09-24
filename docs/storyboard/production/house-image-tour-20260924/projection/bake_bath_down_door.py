"""Registered deterministic front correction in downward repair; outside mask exact."""
from pathlib import Path
import json,math
import numpy as np
from trusted_reproject import load,save,bilinear
from project import sha,smooth
root=Path(__file__).resolve().parents[1];original=root/'bath/down-v1.png';front=root/'bath/front-v1.png';output=root/'bath/down-door-v2.png'
a=load(original)[...,:3];p=load(front)[...,:3];h,w=a.shape[:2]
assert h==w
T=math.tan(math.radians(55));yy,xx=np.meshgrid(np.arange(h),np.arange(w),indexing='ij');dx=(2*(xx+.5)/w-1)*T;dz=(1-2*(yy+.5)/h)*T
# Down view renderer rays [x,up,front] = [dx,-1,dz].
fx=dx/(np.where(dz>0,dz,1)*T);fy=-1/(np.where(dz>0,dz,1)*T)
edge=np.maximum(abs(fx),abs(fy));alpha=(1-smooth(edge,.94,.995))*(dz>0)*(edge<.995)
patch=bilinear(p,(fx+1)*p.shape[1]/2-.5,(1-fy)*p.shape[0]/2-.5)
result=np.rint(np.clip(a*(1-alpha[...,None])+patch*alpha[...,None],0,255)).astype(np.uint8);outside=alpha==0;assert np.array_equal(a[outside],result[outside]);save(output,result)
record={'schemaVersion':1,'operation':'registered front repair reprojected into downward repair','original':{'path':str(original),'sha256':sha(original)},'front':{'path':str(front),'sha256':sha(front)},'output':{'path':str(output),'sha256':sha(output),'size':[w,h]},'camera':{'downYawDegrees':0,'downPitchDegrees':-90,'frontYawDegrees':0,'frontPitchDegrees':0,'bothFovDegrees':110},'mask':{'frontFullWeightMaxAbsQ':.94,'frontZeroWeightMaxAbsQ':.995,'forwardRaysOnly':True},'supportedPixels':int(np.sum(~outside)),'changedPixels':int(np.any(a!=result,axis=2).sum()),'outsideMaskDecodedRGBIdentical':True,'sourceOriginalsUnchanged':True,'scriptSha256':sha(__file__),'note':'No artistic paint or new generation. Same existing front priority mask, evaluated in registered front-ray coordinates.'}
output.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record['output']))
