#!/usr/bin/env python3
"""Triangular monotone inverse projection. Every color comes from generated V2."""
import argparse,hashlib,json,pathlib,math
import cv2,numpy as np
from scipy.interpolate import PchipInterpolator
ap=argparse.ArgumentParser();ap.add_argument('--registration',required=True);ap.add_argument('--out',required=True);ap.add_argument('--width',type=int,default=3072);a=ap.parse_args();out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True);r=json.loads(pathlib.Path(a.registration).read_text());pano=cv2.imread(r['panorama']['path']);sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();assert sha(r['panorama']['path'])==r['panorama']['sha256'];H=np.array(r['matrixRawXYToFlatPanoramaXY']);rw,rh=r['reference']['width'],r['reference']['height'];aspect=rw/rh;t=math.tan(math.radians(32.5));half=math.atan(t*aspect)
def hxy(x,y):
 den=H[2,0]*x+H[2,1]*y+H[2,2];return (H[0,0]*x+H[0,1]*y+H[0,2])/den,(H[1,0]*x+H[1,1]*y+H[1,2])/den
def min_derivative(p):
 c=p.c;dt=np.diff(p.x);vals=[c[2],3*c[0]*dt*dt+2*c[1]*dt+c[2]]
 z=np.divide(-c[1],3*c[0],out=np.full_like(c[0],np.nan),where=abs(c[0])>1e-20);ok=(z>0)&(z<dt);q=3*c[0]*z*z+2*c[1]*z+c[2];vals.append(np.where(ok,q,np.inf));return float(np.nanmin(np.stack(vals)))
# Positive-derivative C1 bridge; integrated exponentials match both endpoint values and slopes.
bridgeRecords=[]
def bridge(x0,x1,y0,y1,d0,d1,label):
 L=x1-x0;selected=None
 for fraction in [.22,.20,.18,.16,.14,.12,.10,.08,.06,.04]:
  tau=L*fraction;e=math.exp(-L/tau);mat=np.array([[1,1,e],[1,e,1],[L,tau*(1-e),tau*(1-e)]]);m,A,B=np.linalg.solve(mat,np.array([d0,d1,y1-y0]))
  if min(m,A,B)>0:selected=(tau,m,A,B);break
 if selected is None:raise ValueError('No positive C1 bridge '+label)
 tau,m,A,B=selected;bridgeRecords.append({'label':label,'targetSpan':L,'transitionScale':tau,'minimumDerivativeBound':float(m),'endpointDerivatives':[float(d0),float(d1)]})
 def evaluate(x):
  q=np.asarray(x)-x0;return y0+m*q+A*tau*(1-np.exp(-q/tau))+B*tau*(np.exp(-(L-q)/tau)-math.exp(-L/tau))
 return evaluate,float(m)
def core_u(angle):
 rx=(np.tan(angle)/(t*aspect)+1)*rw/2-.5;px,_=hxy(rx,np.full_like(np.asarray(rx),(rh-1)/2));return ((px+.5)/pano.shape[1]-.5)*2*np.pi
def core_du(angle):
 rx=(math.tan(angle)/(t*aspect)+1)*rw/2-.5;y=(rh-1)/2;aa=H[0,0];bb=H[0,1]*y+H[0,2];cc=H[2,0];dd=H[2,1]*y+H[2,2];return 2*np.pi/pano.shape[1]*(aa*dd-bb*cc)/(cc*rx+dd)**2*rw/2/(t*aspect)/(math.cos(angle)**2)
end=math.radians(160);left,leftmin=bridge(half,end,float(-core_u(-half)),end,core_du(-half),1,'left longitude');right,rightmin=bridge(half,end,float(core_u(half)),end,core_du(half),1,'right longitude')
def gx(angle):
 angle=np.asarray(angle);z=core_u(np.clip(angle,-half,half));l=(angle<-half)&(angle>-end);r=(angle>half)&(angle<end);z=np.where(l,-left(-angle),z);z=np.where(r,right(angle),z);return np.where(abs(angle)>=end,angle,z)
y=(rh-1)/2;aa=H[0,0];bb=H[0,1]*y+H[0,2];cc=H[2,0];dd=H[2,1]*y+H[2,2];coremin=2*np.pi/pano.shape[1]*(aa*dd-bb*cc)/max((cc*(-.5)+dd)**2,(cc*(rw-.5)+dd)**2)*rw/2/(t*aspect);minx=min(1,leftmin,rightmin,coremin);assert minx>0
w=a.width;hh=w//2;u=(np.arange(w)+.5)/w;v=(np.arange(hh)+.5)/hh;theta=(u-.5)*2*np.pi;mappedu=gx(theta)/(2*np.pi)+.5;mapv=np.empty((hh,w),np.float32);miny=1.;rawys=np.linspace(-.5,rh-.5,49)
for i,angle in enumerate(theta):
 extra=max(abs(angle)-half,0);ac=math.copysign(min(abs(angle),half)+math.radians(10)*math.tanh(extra/math.radians(10)),angle);rx=(math.tan(ac)/(t*aspect)+1)*rw/2-.5;cosa=math.cos(ac)
 def core_v(value):
  ry=(1-np.tan((.5-np.asarray(value))*np.pi)/(cosa*t))*rh/2-.5;_,sy=hxy(np.full_like(np.asarray(ry),rx),ry);return (sy+.5)/pano.shape[0]
 def core_dv(value):
  phi=(.5-value)*np.pi;ry=(1-math.tan(phi)/(cosa*t))*rh/2-.5;aa=H[1,1];bb=H[1,0]*rx+H[1,2];cc=H[2,1];dd=H[2,0]*rx+H[2,2];return (aa*dd-bb*cc)/(cc*ry+dd)**2*rh*np.pi/(2*cosa*t)/(math.cos(phi)**2)/pano.shape[0]
 edge=math.atan(t*cosa)/np.pi;top,bottom=.5-edge,.5+edge;upper,uppermin=bridge(.075,top,.075,float(core_v(top)),1,core_dv(top),'upper');lower,lowermin=bridge(bottom,.925,float(core_v(bottom)),.925,core_dv(bottom),1,'lower');value=core_v(np.clip(v,top,bottom));value=np.where(v<top,upper(v),value);value=np.where(v>bottom,lower(v),value);value=np.where((v<=.075)|(v>=.925),v,value)
 q=np.clip((abs(angle)-half)/(end-half),0,1);weight=1-q*q*(3-2*q);aa=H[1,1];bb=H[1,0]*rx+H[1,2];cc=H[2,1];dd=H[2,0]*rx+H[2,2];corebound=(aa*dd-bb*cc)/max((cc*(-.5)+dd)**2,(cc*(rh-.5)+dd)**2)*rh*np.pi/(2*cosa*t)/pano.shape[0];miny=min(miny,(1-weight)+weight*min(1,uppermin,lowermin,corebound));mapv[:,i]=(1-weight)*v+weight*value
assert miny>0;mapu=np.broadcast_to(mappedu,(hh,w)).astype(np.float32);assert np.all(np.diff(mapu,axis=1)>0) and np.all(np.diff(mapv,axis=0)>0)
# Polar blend occurs only where latitude mapping is exactly identity, so its cross term cannot fold the map.
polar_distance=np.minimum(v,1-v);pw=np.clip((polar_distance-.025)/.025,0,1);pw=pw*pw*(3-2*pw);original_u=np.broadcast_to(u,(hh,w)).astype(np.float32);mapu=(original_u+pw[:,None]*(mapu-original_u)).astype(np.float32);assert np.all(np.diff(mapu,axis=1)>0)
result=cv2.remap(pano,mapu*pano.shape[1]-.5,mapv*pano.shape[0]-.5,cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP);name='panorama-projection-v3.png';cv2.imwrite(str(out/name),result)
# Exact coordinate identity near rear and true pole caps; compare against same-resolution identity sampling.
baseu=np.broadcast_to(u,(hh,w)).astype(np.float32);basev=np.broadcast_to(v[:,None],(hh,w)).astype(np.float32);identity=cv2.remap(pano,baseu*pano.shape[1]-.5,basev*pano.shape[0]-.5,cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP);rear=np.broadcast_to((abs(theta)>=math.radians(160)),(hh,w));poles=np.broadcast_to(((v<=.05)|(v>=.95))[:,None],(hh,w));fixed=rear|poles
# Longitude compression necessarily also affects polar azimuth, but true pole latitude remains fixed.
check={'positiveJacobianLowerBound':minx*miny,'minimumLongitudeDerivative':minx,'minimumLatitudeDerivative':miny,'longitudeStrictlyIncreasingEveryOutputRow':bool(np.all(np.diff(mapu,axis=1)>0)),'latitudeStrictlyIncreasingEveryOutputColumn':bool(np.all(np.diff(mapv,axis=0)>0)),'rearPixelMaxDiffVsIdentity':int(np.max(abs(result[rear].astype(int)-identity[rear].astype(int)))),'polarLatitudeCoordinateMaxError':float(np.max(abs(mapv[poles]-basev[poles]))),'rearUVMaxError':float(max(np.max(abs(mapu[rear]-baseu[rear])),np.max(abs(mapv[rear]-basev[rear]))))};assert check['rearPixelMaxDiffVsIdentity']==0
truecaps=np.broadcast_to(((v<=.025)|(v>=.975))[:,None],(hh,w));check['polarCapPixelMaxDiffVsIdentity']=int(np.max(abs(result[truecaps].astype(int)-identity[truecaps].astype(int))));assert check['polarCapPixelMaxDiffVsIdentity']==0
check['polarBlendProof']='Longitude becomes identity inside4.5-degree polar caps via smooth transition within9-degree latitude-identity caps. There latitude derivative wrt longitude is zero; determinant remains positive.'
# Preserve both coordinates at polar caps by a latitude-dependent longitude blend would break triangular proof.
# Retain the monotone azimuth relabeling at poles; no crossing/holes or newly painted caps.
yy,xx=np.mgrid[:rh,:rw];px=(2*(xx+.5)/rw-1)*t*aspect;py=(1-2*(yy+.5)/rh)*t;norm=np.sqrt(1+px*px+py*py);yaw=np.arctan2(px,1);pitch=np.arcsin(py/norm);vx=((yaw/(2*np.pi)+.5)*w-.5).astype(np.float32);vy=((.5-pitch/np.pi)*hh-.5).astype(np.float32);front=cv2.remap(result,vx,vy,cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP);cv2.imwrite(str(out/'forward65-v3.png'),front);ref=cv2.imread(r['reference']['path']);cv2.imwrite(str(out/'forward-overlay-v3.png'),cv2.addWeighted(ref,.5,front,.5,0))
record={'schemaVersion':1,'operation':'Generated-V2-only triangular monotone inverse projection; no original-frame texture, color blending or painting','input':r['panorama'],'registrationSha256':sha(a.registration),'camera':{'yawRadians':0,'pitchRadians':0,'verticalFovDegrees':65,'aspect':aspect,'status':'Authored display lens; not measured video lens'},'output':{'path':name,'sha256':sha(out/name),'width':w,'height':hh},'mapping':{'longitude':'Raw-frame x at mid-row mapped by homography into V2, composed with tan(target longitude), positive-derivative integrated-exponential C1 bridges to unchanged rear20-degree bands','latitude':'Full homography y for current source column, composed with perspective tan(latitude)/cos(longitude); per-column positive-derivative C1 bridges to identity13.5-degree polar latitude caps; smooth weight to identity rear','omission':'Small homography x/y cross-coupling omitted to keep longitude independent of latitude and guarantee positive determinant','horizon':'Perspective center row maps continuously through homography; no detached rectangular overlay','checks':check,'longitudeBridgeRecords':bridgeRecords[:2],'verticalBridgeMinimumScale':float(min(b['transitionScale'] for b in bridgeRecords[2:])),'proof':'Triangular map away from polar transition; within the transition latitude is identity, so the extra longitude/latitude cross term has no determinant contribution. Core rational/tangent derivatives have positive analytic bounds; bridge derivatives are a positive constant plus two positive exponentials with recorded lower bounds.'},'scriptSha256':sha(__file__),'limits':'Image-model redraw differences remain. Rear20-degree bands and true4.5-degree polar caps are coordinate/pixel identical to identity resampling. The9-degree polar transition changes azimuth continuously, not source art. Surroundings have changed angular spacing. This is not recovery of a physical camera.'};(out/'projection-v3.json').write_text(json.dumps(record,indent=2)+'\n');np.savez_compressed(out/'monotone-coordinate-map-v3.npz',u=mapu[::4,::4],v=mapv[::4,::4]);print(json.dumps(check));print(json.dumps(record['output']))
