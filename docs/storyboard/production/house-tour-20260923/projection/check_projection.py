"""Orientation/roundtrip evidence on the common gray scene and an analytic sphere."""
import json,sys
from pathlib import Path
import numpy as np
from reproject import load,FACES,pano_sample
p=Path(sys.argv[1]);original=load(p.parent/'rooms/common/cube-atlas.png').astype(float);roundtrip=load(p/'common-gray-roundtrip.png').astype(float);d=np.abs(original-roundtrip)
result={'meanRGBError255':float(d.mean()),'p95RGBError255':float(np.percentile(d,95)),'maxRGBError255':float(d.max()),'note':'Resampling loss is expected; originals preserved. This checks projection orientation across all pixels.'}
h,w=512,1024;yy,xx=np.meshgrid(np.arange(h),np.arange(w),indexing='ij');yaw=((xx+.5)/w-.5)*2*np.pi;pitch=(.5-(yy+.5)/h)*np.pi;analytic=np.stack((np.sin(yaw)*np.cos(pitch),np.cos(yaw)*np.cos(pitch),np.sin(pitch)),axis=-1);analytic=np.rint((analytic+1)*127.5).astype(np.uint8);centers=[]
for name,f,r,u in FACES:
 got=pano_sample(analytic,np.array([f],float))[0];expected=(np.array(f)+1)*127.5;err=float(np.max(abs(got-expected)));assert err<1;centers.append({'face':name,'maxRGBError':err})
result['analyticCardinalDirections']=centers;result['pass']=bool(d.mean()<3);assert result['pass'];(p/'projection-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
