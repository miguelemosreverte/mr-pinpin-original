"""Compare direct native pixels against independently rendered canonical cube rays."""
import json,sys
from pathlib import Path
import numpy as np
projection,external,oldcube=map(Path,sys.argv[1:]);sys.path.insert(0,str(projection));from reproject import load,pano_sample,cube_sample
native=load(external/'native-guide.png');cube=load(oldcube)
yaw,pitch=np.meshgrid(np.linspace(-np.pi,np.pi,360,endpoint=False),np.linspace(-1.3,1.3,121));rays=np.stack((np.sin(yaw)*np.cos(pitch),np.cos(yaw)*np.cos(pitch),np.sin(pitch)),axis=-1);expected=cube_sample(cube,rays);errors={}
for label,shift,flip in [('canonical',0,False),('yaw-plus90',np.pi/2,False),('yaw-minus90',-np.pi/2,False),('yaw180',np.pi,False),('up-down-flip',0,True)]:
 q=np.stack((np.sin(yaw+shift)*np.cos(pitch),np.cos(yaw+shift)*np.cos(pitch),(-1 if flip else 1)*np.sin(pitch)),axis=-1);errors[label]=float(np.mean(np.abs(expected-pano_sample(native,q))))
assert errors['canonical']<3 and all(v>errors['canonical']*5 for k,v in errors.items() if k!='canonical'),errors
m=json.loads((external/'native-guide.json').read_text());matrix=np.array(m['camera']['matrixWorld']);assert np.allclose(-matrix[:3,2],[0,1,0],atol=1e-6);assert np.allclose(matrix[:3,0],[1,0,0],atol=1e-6);assert np.allclose(matrix[:3,1],[0,0,1],atol=1e-6)
record={'pass':True,'nativeAgainstIndependentCubeMeanRGBErrors255':errors,'raysCompared':int(yaw.size),'canonicalCameraBasisVerified':True,'yawUndoRadians':0,'note':'Direct Cycles pixels compare against separately rendered cube faces at identical world rays. Different denoising and angular sampling cause small expected differences.'};(external/'orientation-check.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))
