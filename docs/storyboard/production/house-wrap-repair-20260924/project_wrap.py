"""Deterministic perspective extraction and bounded inverse projection, no painting."""
import argparse, hashlib, json, math
from pathlib import Path
import numpy as np
from trusted_reproject import load, save, bilinear, pano_sample
EXPECTED='5299c3fe2c6791bf556e9cdcdd7caec379a747b4bc0113ab972d04c8632b1f00'
F=np.array([0.,-1.,0.]); R=np.array([-1.,0.,0.]); U=np.array([0.,0.,1.])
T=math.tan(math.radians(55))
MASK={'horizontalFull':.45,'horizontalZero':.80,'verticalFull':.75,'verticalZero':.98}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def smooth(a,lo,hi):
 t=np.clip((np.abs(a)-lo)/(hi-lo),0,1);return 1-t*t*(3-2*t)
def perspective_rays(x,y):return F+T*x[...,None]*R+T*y[...,None]*U
def project(rays):
 z=rays@F;safe=np.where(z>0,z,1.);return (rays@R)/(safe*T),(rays@U)/(safe*T),z

def tests():
 x,y=np.meshgrid(np.linspace(-.99,.99,25),np.linspace(-.99,.99,25));a,b,z=project(perspective_rays(x,y));err=max(float(np.max(abs(a-x))),float(np.max(abs(b-y))));assert err<1e-12
 assert np.array_equal(perspective_rays(np.array(0.),np.array(0.)),F)
 assert smooth(np.array(.8),.45,.8)==0 and smooth(np.array(.98),.75,.98)==0
 return {'perspectiveInverseMaxError':err,'centerWorldDirection':[0,-1,0],'pass':True}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('operation',choices=['extract','composite']);ap.add_argument('--input',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--patch',type=Path);ap.add_argument('--size',type=int,default=1400);a=ap.parse_args()
 if sha(a.input)!=EXPECTED:raise ValueError('Input differs from selected native panorama; explicit recipe revision required')
 source=load(a.input)
 if source.shape[1]!=2*source.shape[0]:raise ValueError('Expected2:1 panorama')
 if source.shape[2]!=3:raise ValueError('ExpectedRGB input')
 record={'schemaVersion':1,'operation':a.operation,'input':str(a.input),'inputSha256':sha(a.input),'inputSize':[source.shape[1],source.shape[0]],'scriptSha256':sha(__file__),'helperSha256':sha(Path(__file__).with_name('trusted_reproject.py')),'pngHelperSha256':sha(Path(__file__).with_name('png_io.py')),'camera':{'yawRadians':math.pi,'pitchRadians':0,'horizontalFovDegrees':110,'verticalFovDegrees':110,'forward':F.tolist(),'right':R.tolist(),'up':U.tolist()},'sampling':'Bilinear encodedRGB; panorama longitude wraps,latitude clamps; pixel-center rays. No color correction or creative paint.','mathematicalChecks':tests()}
 if a.operation=='extract':
  n=a.size
  if n<2:raise ValueError('size>=2 required')
  yy,xx=np.meshgrid(np.arange(n),np.arange(n),indexing='ij');x=2*(xx+.5)/n-1;y=1-2*(yy+.5)/n;result=np.clip(np.rint(pano_sample(source,perspective_rays(x,y))),0,255).astype(np.uint8)
 else:
  if not a.patch:raise ValueError('--patch required')
  patch=load(a.patch)
  if patch.shape[0]!=patch.shape[1] or patch.shape[2]!=3:raise ValueError('Repair must be square RGB. No automatic crop/aspect correction.')
  h,w=source.shape[:2];yy,xx=np.meshgrid(np.arange(h),np.arange(w),indexing='ij');yaw=((xx+.5)/w-.5)*2*np.pi;pitch=(.5-(yy+.5)/h)*np.pi;rays=np.stack((np.sin(yaw)*np.cos(pitch),np.cos(yaw)*np.cos(pitch),np.sin(pitch)),axis=-1);x,y,z=project(rays)
  alpha=smooth(x,.45,.80)*smooth(y,.75,.98)*(z>0)
  repaired=bilinear(patch,(x+1)*patch.shape[1]/2-.5,(1-y)*patch.shape[0]/2-.5)
  result=np.clip(np.rint(source*(1-alpha[...,None])+repaired*alpha[...,None]),0,255).astype(np.uint8)
  support=alpha>0;changed=np.any(source!=result,axis=2);assert np.array_equal(source[~support],result[~support]);assert not np.any(support[0]) and not np.any(support[-1]);assert not np.any(support[:,w//2])
  regions=[]
  for lo,hi in [(0,w//2),(w//2,w)]:
   sy,sx=np.where(support[:,lo:hi]);regions.append({'xMin':int(sx.min()+lo),'xMax':int(sx.max()+lo),'yMin':int(sy.min()),'yMax':int(sy.max())})
  maskpath=a.output.with_name(a.output.stem+'-alpha.png');a.output.parent.mkdir(parents=True,exist_ok=True);maskbytes=np.rint(alpha*255).astype(np.uint8);save(maskpath,np.repeat(maskbytes[...,None],3,axis=2))
  band=np.abs(pitch[:,0])<=math.radians(40)
  def wrap_difference(image):
   diff=np.abs(image[band,0,:].astype(float)-image[band,-1,:].astype(float))
   return {'meanAbsoluteChannelDifference':float(diff.mean()),'p95AbsoluteChannelDifference':float(np.percentile(diff,95)),'maxAbsoluteChannelDifference':float(diff.max())}
  polar=np.abs(pitch)>=math.radians(55);assert np.array_equal(source[polar],result[polar]);assert np.all(alpha[band,0]==1) and np.all(alpha[band,-1]==1)
  record['wrapAdjacentColumnComparison']={'latitudeBandDegrees':[-40,40],'sampledRows':int(band.sum()),'units':'8-bit RGB absolute per-channel difference, flattened across rows/channels','before':wrap_difference(source),'after':wrap_difference(result),'fullyOpaqueAtBothColumnsInBand':True,'interpretation':'Adjacent raster columns sample distinct but neighboring longitudes; lower difference supports local continuity but can also reflect smoothing. This is not a full-sphere seam or artistic-quality certificate.'}
  record['unchangedPolarCapsAbsLatitudeGE55Degrees']=True
  record.update({'patch':str(a.patch),'patchSha256':sha(a.patch),'patchSize':[patch.shape[1],patch.shape[0]],'mask':dict(MASK,coordinates='Normalized perspective plane,fullinputbounds±1',formula='horizontal smoothstep falloff multiplied by vertical falloff; rear-facing rays only'),'coverage':{'supportedPixels':int(support.sum()),'changedPixels':int(changed.sum()),'totalPixels':int(h*w),'changedFraction':float(changed.mean()),'supportBoundingBoxesInclusive':regions,'maxLongitudeFromRearDegrees':math.degrees(math.atan(.8*T)),'maxLatitudeAtRearDegrees':math.degrees(math.atan(.98*T))},'unchangedOutsideMaskDecodedRGB':True,'polesAndOppositeMeridianUnchanged':True,'alphaPreviewPath':str(maskpath),'alphaPreviewSha256':sha(maskpath),'note':'AlphaPNG is quantized preview; actual compositing uses float64 analytic alpha. Projectionchecks do not certify a painted patch, feature registration or feather boundary quality.'})
 a.output.parent.mkdir(parents=True,exist_ok=True);save(a.output,result);record.update({'output':str(a.output),'outputSha256':sha(a.output),'outputSize':[result.shape[1],result.shape[0]]});a.output.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'output':str(a.output),'size':record['outputSize'],'sha256':record['outputSha256'],'checks':record['mathematicalChecks']}))
if __name__=='__main__':main()
