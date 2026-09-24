#!/usr/bin/env python3
"""Fit yaw/pitch/VFOV to feature correspondences; does not modify panorama pixels."""
import argparse,hashlib,json,math,pathlib
import cv2,numpy as np
from scipy.optimize import least_squares
ap=argparse.ArgumentParser();ap.add_argument('--reference',required=True);ap.add_argument('--panorama',required=True);ap.add_argument('--out',required=True);a=ap.parse_args();out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
ref=cv2.imread(a.reference);pano=cv2.imread(a.panorama);ih,iw=ref.shape[:2];aspect=iw/ih;w=1280;h=round(w/aspect);small=cv2.resize(ref,(w,h),interpolation=cv2.INTER_AREA)
def basis(yaw,pitch):
 y,p=np.radians([yaw,pitch]);return np.array([np.sin(y)*np.cos(p),np.cos(y)*np.cos(p),np.sin(p)]),np.array([np.cos(y),-np.sin(y),0]),np.array([-np.sin(y)*np.sin(p),-np.cos(y)*np.sin(p),np.cos(p)])
def rays(camera,width,height):
 f,r,u=basis(*camera[:2]);yy,xx=np.mgrid[:height,:width];t=np.tan(np.radians(camera[2]/2));x=(2*(xx+.5)/width-1)*t*aspect;y=(1-2*(yy+.5)/height)*t;return f+x[...,None]*r+y[...,None]*u
def sample(q):
 q=q/np.linalg.norm(q,axis=-1,keepdims=True);px=((np.arctan2(q[...,0],q[...,1])/(2*np.pi)+.5)*pano.shape[1]-.5).astype(np.float32);py=((.5-np.arcsin(q[...,2])/np.pi)*pano.shape[0]-.5).astype(np.float32);return cv2.remap(pano,px,py,cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP)
broad_camera=[0,0,80];broad_rays=rays(broad_camera,w,h);broad=sample(broad_rays);cv2.imwrite(str(out/'search-view.png'),broad)
sift=cv2.SIFT_create(nfeatures=10000,contrastThreshold=.02);k1,d1=sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_BGR2GRAY),None);k2,d2=sift.detectAndCompute(cv2.cvtColor(broad,cv2.COLOR_BGR2GRAY),None);pairs=cv2.BFMatcher().knnMatch(d1,d2,k=2);good=[m for m,n in pairs if m.distance<.72*n.distance]
if len(good)<8:raise SystemExit(f'Insufficient SIFT matches: {len(good)}')
p1=np.array([k1[m.queryIdx].pt for m in good]);p2=np.array([k2[m.trainIdx].pt for m in good]);H,mask=cv2.findHomography(p1,p2,cv2.RANSAC,5);use=mask.ravel().astype(bool);p1i,p2i=p1[use],p2[use]
# Subpixel matched search-view rays, without quantizing correspondence coordinates.
f,r,u=basis(0,0);t=np.tan(np.radians(40));q=f+(2*(p2i[:,0]+.5)/w-1)[:,None]*t*aspect*r+(1-2*(p2i[:,1]+.5)/h)[:,None]*t*u
q/=np.linalg.norm(q,axis=-1,keepdims=True)
def residual(cam):
 f,r,u=basis(*cam[:2]);z=q@f;t=np.tan(np.radians(cam[2]/2));px=((q@r)/z/(t*aspect)+1)*w/2-.5;py=(1-(q@u)/z/t)*h/2-.5;return np.stack((px,py),1)-p1i
fit=least_squares(lambda c:residual(c).ravel(),[5,-5,63],bounds=([-30,-25,25],[30,25,110]),loss='soft_l1',f_scale=3)
error=np.linalg.norm(residual(fit.x),axis=1);inliers=error<8;camera=fit.x.tolist();rendered=sample(rays(camera,iw,ih));cv2.imwrite(str(out/'fitted-view.png'),rendered);cv2.imwrite(str(out/'overlay.png'),cv2.addWeighted(ref,.5,rendered,.5,0));matches=cv2.drawMatches(small,k1,broad,k2,[m for m,ok in zip(good,use) if ok],None,flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS);cv2.imwrite(str(out/'matches.jpg'),matches)
r={'schemaVersion':1,'operation':'SIFT ratio matches, RANSAC homography filtering, robust3-parameter spherical pinhole fit; no image warp or edits','inputs':{'reference':{'path':a.reference,'sha256':sha(a.reference)},'panorama':{'path':a.panorama,'sha256':sha(a.panorama)}},'camera':{'yawRadians':math.radians(camera[0]),'pitchRadians':math.radians(camera[1]),'verticalFovDegrees':camera[2],'aspect':aspect},'features':{'ratioMatches':len(good),'ransacInliers':int(use.sum()),'physicalFitInliersBelow8px':int(inliers.sum()),'medianResidualPixelsAt1280':float(np.median(error)),'p90ResidualPixelsAt1280':float(np.percentile(error,90)),'referenceInlierBoundsNormalized':[float(p1i[:,0].min()/w),float(p1i[:,1].min()/h),float(p1i[:,0].max()/w),float(p1i[:,1].max()/h)]},'correspondences':[{'referenceXY':x.tolist(),'searchXY':y.tolist(),'fitErrorPixels':float(e)} for x,y,e in zip(p1i,p2i,error)],'scriptSha256':sha(__file__),'software':{'opencv':cv2.__version__,'numpy':np.__version__},'status':'candidate fit; visual registration and boundary review required','note':'Feature inliers can cluster on one object and do not guarantee whole-scene registration. Generation can change machinery geometry.'}
(out/'fit.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'camera':r['camera'],'features':r['features']}))
