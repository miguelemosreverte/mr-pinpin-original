#!/usr/bin/env python3
"""Continuous spherical coordinate remap around a registered rectilinear front.
Generated panorama supplies every output color; raw frame supplies calibration only.
"""
import argparse,hashlib,json,pathlib,math
import numpy as np,cv2
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve
from scipy.interpolate import LinearNDInterpolator
ap=argparse.ArgumentParser();ap.add_argument('--registration',required=True);ap.add_argument('--out',required=True);ap.add_argument('--width',type=int,default=3072);ap.add_argument('--vertical-fov',type=float,default=45);a=ap.parse_args();out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True);reg=json.loads(pathlib.Path(a.registration).read_text());pano=cv2.imread(reg['panorama']['path']);sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();assert sha(reg['panorama']['path'])==reg['panorama']['sha256'];H=np.array(reg['matrixRawXYToFlatPanoramaXY']);rw,rh=reg['reference']['width'],reg['reference']['height'];aspect=rw/rh;t=math.tan(math.radians(a.vertical_fov/2))
# Half-degree nodes; hard boundaries keep the rear meridian and9-degree polar caps unchanged.
gw,gh=721,361;vv,uu=np.meshgrid(np.linspace(0,1,gh),np.linspace(0,1,gw),indexing='ij');theta=(uu-.5)*2*np.pi;phi=(.5-vv)*np.pi
invH=np.linalg.inv(H);sx=uu*pano.shape[1]-.5;sy=vv*pano.shape[0]-.5;den=invH[2,0]*sx+invH[2,1]*sy+invH[2,2];rx=(invH[0,0]*sx+invH[0,1]*sy+invH[0,2])/den;ry=(invH[1,0]*sx+invH[1,1]*sy+invH[1,2])/den;core=(rx>=-.5)&(rx<=rw-.5)&(ry>=-.5)&(ry<=rh-.5);fixed=(abs(theta)>=math.radians(160))|(abs(phi)>=math.radians(81));assert not np.any(core&fixed);known=core|fixed
x=(2*(rx+.5)/rw-1)*t*aspect;y=(1-2*(ry+.5)/rh)*t;targetu=.5+np.arctan2(x,1)/(2*np.pi);targetv=.5-np.arctan2(y,np.sqrt(1+x*x))/np.pi;du=np.zeros_like(uu);dv=np.zeros_like(vv);du[core]=targetu[core]-uu[core];dv[core]=targetv[core]-vv[core]
unknown=~known;count=int(unknown.sum());idx=np.full((gh,gw),-1,int);idx[unknown]=np.arange(count);ys,xs=np.where(unknown);rows=[np.arange(count)];cols=[np.arange(count)];values=[np.full(count,4.)];rhs=np.zeros((count,2))
for dy,dx in [(0,-1),(0,1),(-1,0),(1,0)]:
 ny,nx=ys+dy,xs+dx;other=idx[ny,nx];inside=other>=0;rows.append(np.where(inside)[0]);cols.append(other[inside]);values.append(np.full(int(inside.sum()),-1.));outside=~inside;rhs[outside,0]+=du[ny[outside],nx[outside]];rhs[outside,1]+=dv[ny[outside],nx[outside]]
A=coo_matrix((np.concatenate(values),(np.concatenate(rows),np.concatenate(cols))),shape=(count,count)).tocsc();solution=spsolve(A,rhs);du[unknown]=solution[:,0];dv[unknown]=solution[:,1];mu=uu+du;mv=vv+dv
# Forward compression is validated before inversion.
def jac(u,v):
 dx0=np.stack((np.diff(u,axis=1)[:-1],np.diff(v,axis=1)[:-1]),-1);dx1=np.stack((np.diff(u,axis=1)[1:],np.diff(v,axis=1)[1:]),-1);dy0=np.stack((np.diff(u,axis=0)[:,:-1],np.diff(v,axis=0)[:,:-1]),-1);dy1=np.stack((np.diff(u,axis=0)[:,1:],np.diff(v,axis=0)[:,1:]),-1);cross=lambda x,y:x[...,0]*y[...,1]-x[...,1]*y[...,0];d=np.stack([cross(dx0,dy0),cross(dx0,dy1),cross(dx1,dy0),cross(dx1,dy1)])*(gw-1)*(gh-1);return {'minJacobian':float(d.min()),'nonpositiveCellCorners':int((d<=0).sum())}
forwardCheck=jac(mu,mv);print('forward',json.dumps(forwardCheck),flush=True);(out/'forward-map-check.json').write_text(json.dumps(forwardCheck,indent=2)+'\n')
if forwardCheck['nonpositiveCellCorners']:raise SystemExit('Forward map folds; no candidate emitted')
np.savez_compressed(out/'forward-coordinate-map.npz',u=mu,v=mv)
interpolator=LinearNDInterpolator(np.column_stack((mu.ravel(),mv.ravel())),np.column_stack((uu.ravel(),vv.ravel())))
back=interpolator(uu,vv);assert np.isfinite(back).all();mu,mv=back[...,0],back[...,1];du=mu-uu;dv=mv-vv
# Bilinear cell Jacobian is affine within each cell: positivity at all four corners excludes a fold inside it.
dx0=np.stack((np.diff(mu,axis=1)[:-1],np.diff(mv,axis=1)[:-1]),-1);dx1=np.stack((np.diff(mu,axis=1)[1:],np.diff(mv,axis=1)[1:]),-1);dy0=np.stack((np.diff(mu,axis=0)[:,:-1],np.diff(mv,axis=0)[:,:-1]),-1);dy1=np.stack((np.diff(mu,axis=0)[:,1:],np.diff(mv,axis=0)[:,1:]),-1)
cross=lambda x,y:x[...,0]*y[...,1]-x[...,1]*y[...,0];dets=np.stack([cross(dx0,dy0),cross(dx0,dy1),cross(dx1,dy0),cross(dx1,dy1)])*(gw-1)*(gh-1);bad=int((dets<=0).sum());check={'minJacobian':float(dets.min()),'maxJacobian':float(dets.max()),'nonpositiveCellCorners':bad,'samples':int(dets.size),'minLongitudeDerivative':float(np.diff(mu,axis=1).min()*(gw-1)),'minLatitudeDerivative':float(np.diff(mv,axis=0).min()*(gh-1)),'rearBoundaryDisplacement':float(max(abs(du[:,0]).max(),abs(du[:,-1]).max(),abs(dv[:,0]).max(),abs(dv[:,-1]).max())),'polarCapDisplacement':float(max(abs(du[fixed]).max(),abs(dv[fixed]).max()))};print(json.dumps(check),flush=True)
(out/'map-check.json').write_text(json.dumps(check,indent=2)+'\n');np.savez_compressed(out/'coordinate-map.npz',u=mu,v=mv,core=core,fixed=fixed)
if bad:raise SystemExit('Mapping folds; candidate image not emitted')
w=a.width;h=w//2;result=np.empty((h,w,3),np.uint8)
for y0 in range(0,h,64):
 yy,xx=np.meshgrid(np.arange(y0,min(y0+64,h)),np.arange(w),indexing='ij');gx=((xx+.5)/w*(gw-1)).astype(np.float32);gy=((yy+.5)/h*(gh-1)).astype(np.float32);ux=cv2.remap(mu.astype(np.float32),gx,gy,cv2.INTER_LINEAR);vy=cv2.remap(mv.astype(np.float32),gx,gy,cv2.INTER_LINEAR);result[y0:y0+len(yy)]=cv2.remap(pano,(ux*pano.shape[1]-.5).astype(np.float32),(vy*pano.shape[0]-.5).astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP)
f=out/'panorama-projection-v1.png';cv2.imwrite(str(f),result)
# Render the authored front for whole-machine comparison.
yy,xx=np.mgrid[:rh,:rw];px=(2*(xx+.5)/rw-1)*t*aspect;py=(1-2*(yy+.5)/rh)*t;norm=np.sqrt(1+px*px+py*py);yaw=np.arctan2(px,1);pitch=np.arcsin(py/norm);ux=((yaw/(2*np.pi)+.5)*w-.5).astype(np.float32);vy=((.5-pitch/np.pi)*h-.5).astype(np.float32);forward=cv2.remap(result,ux,vy,cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP);cv2.imwrite(str(out/'forward45.png'),forward);ref=cv2.imread(reg['reference']['path']);cv2.imwrite(str(out/'forward-overlay.png'),cv2.addWeighted(ref,.5,forward,.5,0))
record={'schemaVersion':1,'operation':'Generated-art-only inverse projection in front; harmonic coordinate displacement outside; no pixel/color feather or source-frame overlay','input':reg['panorama'],'registrationSha256':sha(a.registration),'camera':{'yawRadians':0,'pitchRadians':0,'verticalFovDegrees':a.vertical_fov,'aspect':aspect,'status':'Authored display lens, not measured physical video FOV'},'output':{'path':f.name,'sha256':sha(f),'width':w,'height':h},'map':{'grid':[gw,gh],'forwardCheck':forwardCheck,'knownFront':'Original frame rectangle projected to target sphere; its coordinates map by fitted homography into flat V2','outside':'Forward harmonic compression with fixed rear20-degree bands/polar9-degree caps; invert via piecewise linear triangulation, then sample inverse grid','interpolation':'Bilinear continuous coordinate field, then bilinear sampling of generated art','check':check,'sha256':sha(out/'coordinate-map.npz')},'scriptSha256':sha(__file__),'limits':'Positive Jacobian proves no coordinate folds in the sampled bilinear map, not unchanged artistic geometry or perfect scene continuity. Existing source pole/wrap defects are preserved. Surrounding angular spacing changes.'};(out/'projection-v1.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record['output']))
