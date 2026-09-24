"""Deterministic image-stack assembly, perspective extraction and cube delivery."""
from pathlib import Path
import argparse,json,math
import numpy as np
from export_rooms import render,load_images
from stack_math import rays,load,save,sha
from trusted_reproject import FACES,ray,pano_sample,edge_check

def write(path,values):
 save(path,np.rint(np.clip(values,0,255)).astype(np.uint8))
 a=load(path)
 return {'path':str(path),'sha256':sha(path),'bytes':path.stat().st_size,'size':[a.shape[1],a.shape[0]]}

def main():
 p=argparse.ArgumentParser();p.add_argument('operation',choices=['assemble','extract','export']);p.add_argument('--config',type=Path);p.add_argument('--input',type=Path);p.add_argument('--output',type=Path,required=True);p.add_argument('--width',type=int,default=3072);p.add_argument('--size',type=int,default=1400);p.add_argument('--face-size',type=int,default=1024);p.add_argument('--yaw',type=float,default=0);p.add_argument('--pitch',type=float,default=0);p.add_argument('--fov',type=float,default=110);a=p.parse_args()
 if bool(a.config)==bool(a.input):p.error('Exactly one of --config or --input is required')
 record={'schemaVersion':1,'operation':a.operation,'scriptSha256':sha(__file__),'helpers':{n:sha(Path(__file__).with_name(n)) for n in ['export_rooms.py','stack_math.py','trusted_reproject.py','png_io.py']},'orientation':{'worldAxes':'X right, Y front, Z up','panorama':'front u=.5; right u=.75; rear wraps u=0/1; up v=0','cubeLayout':[['front','right','back'],['left','up','down']],'faceBases':[{'id':n,'forward':f,'right':r,'up':u} for n,f,r,u in FACES]},'noNewArtOrGeometry':True,'outputs':[]}
 if a.config:
  c=json.loads(a.config.read_text());images=load_images(c,a.config.parent);sampler=lambda w:render(images,c,w);record['config']=c;record['configSha256']=sha(a.config)
 else:
  pano=load(a.input)[...,:3];assert pano.shape[1]==pano.shape[0]*2;sampler=lambda w:pano_sample(pano,w[...,[0,2,1]]);record['input']={'path':str(a.input),'sha256':sha(a.input),'size':[pano.shape[1],pano.shape[0]]}
 if a.operation=='extract':
  a.output.parent.mkdir(parents=True,exist_ok=True);record['camera']={'yawDegrees':a.yaw,'pitchDegrees':a.pitch,'fovDegrees':a.fov};record['outputs'].append(write(a.output,sampler(rays(a.size,math.radians(a.yaw),math.radians(a.pitch),a.fov))));meta=a.output.with_suffix('.json')
 else:
  assert a.width%2==0;w,h=a.width,a.width//2;result=np.empty((h,w,3),np.uint8)
  for start in range(0,h,48):
   yy,xx=np.meshgrid(np.arange(start,min(start+48,h)),np.arange(w),indexing='ij');yaw=((xx+.5)/w-.5)*2*np.pi;pitch=(.5-(yy+.5)/h)*np.pi;dirs=np.stack((np.sin(yaw)*np.cos(pitch),np.sin(pitch),np.cos(yaw)*np.cos(pitch)),-1);result[start:start+len(yy)]=np.rint(np.clip(sampler(dirs),0,255)).astype(np.uint8)
  if a.operation=='assemble':a.output.parent.mkdir(parents=True,exist_ok=True);record['outputs'].append(write(a.output,result));meta=a.output.with_suffix('.json')
  else:
   a.output.mkdir(parents=True,exist_ok=True);record['outputs'].append(write(a.output/'panorama-assembled-v1.png',result));n=a.face_size;atlas=np.empty((2*n,3*n,3),np.uint8);yy,xx=np.meshgrid(np.arange(n),np.arange(n),indexing='ij');x=2*(xx+.5)/n-1;y=1-2*(yy+.5)/n;(a.output/'faces-v1').mkdir(exist_ok=True)
   for i,(name,f,r,u) in enumerate(FACES):
    face=np.rint(np.clip(pano_sample(result,ray(f,r,u,x,y)),0,255)).astype(np.uint8);atlas[(i//3)*n:(i//3+1)*n,(i%3)*n:(i%3+1)*n]=face;record['outputs'].append(write(a.output/'faces-v1'/(name+'.png'),face))
   record['outputs'].append(write(a.output/'cube-atlas-v1.png',atlas));record['verification']=edge_check(result);record['verification']['allSixAtlasTilesEqualFaceFiles']=all(np.array_equal(atlas[(i//3)*n:(i//3+1)*n,(i%3)*n:(i%3+1)*n],load(a.output/'faces-v1'/(name+'.png'))) for i,(name,*_) in enumerate(FACES));meta=a.output/'exports-v1.json'
 record['sampling']='Same runtime normalized cardinal patch blend and optional registered detail; encoded RGB bilinear interpolation. Cube derived from final assembled panorama; no artistic seam repair. Same-ray boundary equality verifies projection only, not source visual continuity.';meta.write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'manifest':str(meta),'outputs':record['outputs']}),flush=True)
if __name__=='__main__':main()
