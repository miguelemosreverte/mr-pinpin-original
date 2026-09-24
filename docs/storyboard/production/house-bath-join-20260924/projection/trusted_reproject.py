"""Deterministic spherical reprojection. Requires NumPy; no paint/edit operation."""
import argparse,hashlib,json,math
from pathlib import Path
import numpy as np
from png_io import decode,encode
FACES=[('front',(0,1,0),(1,0,0),(0,0,1)),('right',(1,0,0),(0,-1,0),(0,0,1)),('back',(0,-1,0),(-1,0,0),(0,0,1)),('left',(-1,0,0),(0,1,0),(0,0,1)),('up',(0,0,1),(1,0,0),(0,-1,0)),('down',(0,0,-1),(1,0,0),(0,1,0))]
def load(p):
 w,h,c,rows=decode(p);return np.frombuffer(b''.join(rows),np.uint8).reshape(h,w,c)
def save(p,a):
 h,w,c=a.shape;encode(p,w,h,c,[a[y].tobytes() for y in range(h)])
def bilinear(a,x,y,wrap=False):
 h,w=a.shape[:2];x=x%w if wrap else np.clip(x,0,w-1);y=np.clip(y,0,h-1);x0=np.floor(x).astype(int);y0=np.floor(y).astype(int);x1=(x0+1)%w if wrap else np.minimum(x0+1,w-1);y1=np.minimum(y0+1,h-1);fx=(x-x0)[...,None];fy=(y-y0)[...,None]
 return (a[y0,x0]*(1-fx)*(1-fy)+a[y0,x1]*fx*(1-fy)+a[y1,x0]*(1-fx)*fy+a[y1,x1]*fx*fy)
def cube_sample(a,rays):
 h,w=a.shape[:2]
 if w%3 or h%2 or w//3!=h//2:raise ValueError('Cube atlas must be exact3x2 square tiles')
 n=w//3;flat=rays.reshape(-1,3);out=np.empty((len(flat),a.shape[2]),float);dominant=np.argmax(np.abs(flat),axis=1)
 for i,(_,f,r,u) in enumerate(FACES):
  f,r,u=map(np.array,(f,r,u));z=flat@f;axis=int(np.argmax(np.abs(f)));mask=(dominant==axis)&(z>0)
  if not np.any(mask):continue
  q=flat[mask];sx=(q@r)/z[mask];sy=(q@u)/z[mask];tile=a[(i//3)*n:(i//3+1)*n,(i%3)*n:(i%3+1)*n];out[mask]=bilinear(tile,(sx+1)*n/2-.5,(1-sy)*n/2-.5)
 return out.reshape(*rays.shape[:-1],a.shape[2])
def pano_sample(a,rays):
 q=rays/np.linalg.norm(rays,axis=-1,keepdims=True);yaw=np.arctan2(q[...,0],q[...,1]);pitch=np.arcsin(np.clip(q[...,2],-1,1));yaw=np.where(np.hypot(q[...,0],q[...,1])<1e-12,0,yaw);h,w=a.shape[:2]
 return bilinear(a,(yaw/(2*np.pi)+.5)*w-.5,(.5-pitch/np.pi)*h-.5,True)
def ray(f,r,u,x,y):return np.array(f)+x[...,None]*np.array(r)+y[...,None]*np.array(u)
def edge_check(pano):
 samples=np.linspace(-1,1,257);edges={};rows=[]
 for name,f,r,u in FACES:
  for side,x,y in [('left',np.full_like(samples,-1),samples),('right',np.full_like(samples,1),samples),('bottom',samples,np.full_like(samples,-1)),('top',samples,np.full_like(samples,1))]:
   q=ray(f,r,u,x,y);q=q/np.linalg.norm(q,axis=-1,keepdims=True);ends=[tuple(np.round(q[0],12)),tuple(np.round(q[-1],12))];rev=ends[0]>ends[1];key=tuple(sorted(ends));values=pano_sample(pano,q[::-1] if rev else q);edges.setdefault(key,[]).append((name,side,values))
 for paired in edges.values():
  assert len(paired)==2;error=float(np.max(np.abs(paired[0][2]-paired[1][2])));assert error<1e-8;rows.append({'faces':[p[0]+':'+p[1] for p in paired],'samples':257,'maxRGBErrorAtSameRay':error})
 assert len(rows)==12
 return {'pass':True,'edges':rows,'note':'Exact shared angular boundaries sample the same panorama. Neighboring output texel centers have different directions; no edge pixels are painted/copied.'}
def run():
 ap=argparse.ArgumentParser();ap.add_argument('direction',choices=['cube-to-pano','pano-to-cube']);ap.add_argument('--input',required=True,type=Path);ap.add_argument('--output',required=True,type=Path);ap.add_argument('--width',type=int,default=3072);ap.add_argument('--face-size',type=int,default=1024);args=ap.parse_args();a=load(args.input)
 if args.direction=='cube-to-pano':
  w=args.width
  if w<4 or w%2:raise ValueError('Even panorama width required')
  h=w//2;result=np.empty((h,w,a.shape[2]),np.uint8)
  for start in range(0,h,64):
   yy,xx=np.meshgrid(np.arange(start,min(start+64,h)),np.arange(w),indexing='ij');yaw=((xx+.5)/w-.5)*2*np.pi;pitch=(.5-(yy+.5)/h)*np.pi;rays=np.stack((np.sin(yaw)*np.cos(pitch),np.cos(yaw)*np.cos(pitch),np.sin(pitch)),axis=-1);result[start:start+len(yy)]=np.clip(np.rint(cube_sample(a,rays)),0,255).astype(np.uint8)
  verification={'warning':'Reprojection preserves any source face discontinuities; this does not repair illustration seams.'}
 else:
  if a.shape[1]!=a.shape[0]*2:raise ValueError('Expected2:1equirectangular input')
  n=args.face_size
  if n<2:raise ValueError('face-size must be>=2')
  result=np.empty((n*2,n*3,a.shape[2]),np.uint8);yy,xx=np.meshgrid(np.arange(n),np.arange(n),indexing='ij');x=2*(xx+.5)/n-1;y=1-2*(yy+.5)/n
  for i,(_,f,r,u) in enumerate(FACES):result[(i//3)*n:(i//3+1)*n,(i%3)*n:(i%3+1)*n]=np.clip(np.rint(pano_sample(a,ray(f,r,u,x,y))),0,255).astype(np.uint8)
  verification=edge_check(a)
 args.output.parent.mkdir(parents=True,exist_ok=True);save(args.output,result);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();record={'schemaVersion':1,'operation':args.direction,'input':str(args.input),'inputSha256':sha(args.input),'inputSize':[a.shape[1],a.shape[0]],'output':str(args.output),'outputSha256':sha(args.output),'outputSize':[result.shape[1],result.shape[0]],'scriptSha256':sha(Path(__file__)),'sampling':'Bilinear encodedRGB, pixel centers, no color grading; tile-clamped cube; longitude-wrapped and latitude-clamped panorama','panoramaConvention':'+Y front at(u=.5,v=.5); +X at u=.75; +Z top; image rows downward','cubeLayout':[['front','right','back'],['left','up','down']],'verification':verification};args.output.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'output':str(args.output),'size':record['outputSize'],'operation':args.direction,'pass':True}))
if __name__=='__main__':run()
