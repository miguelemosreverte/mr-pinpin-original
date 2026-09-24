"""Deterministic historical shader bake and arbitrary perspective extraction; no art edits."""
import argparse,hashlib,json,math,subprocess
from pathlib import Path
import numpy as np
from trusted_reproject import load,save,bilinear,pano_sample
NAMES={'base':'room-panorama-v3.webp','front':'room-cube-front-v1.webp','rear':'room-cube-rear-v1.webp','up':'room-cube-up-v1.webp','down':'room-cube-down-v1.webp'}
MASK=np.array([.102,-.028,.075,.075]);T=math.tan(math.radians(55))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def smooth(x,lo,hi):
 t=np.clip((x-lo)/(hi-lo),0,1);return t*t*(3-2*t)
def texture(a,u,v):return bilinear(a,u*a.shape[1]-.5,v*a.shape[0]-.5)
def patched(images,w):
 # Renderer coordinate frame: x right, y up, z forward.
 w=w/np.linalg.norm(w,axis=-1,keepdims=True)
 u=np.mod(.5+np.arctan2(w[...,0],w[...,2])/(2*np.pi),1);v=.5-np.arcsin(np.clip(w[...,1],-1,1))/np.pi
 colors=[];weights=[]
 for name,local in [('front',w),('rear',w*np.array([-1,1,-1])),('up',np.stack((w[...,0],-w[...,2],w[...,1]),-1)),('down',np.stack((w[...,0],w[...,2],-w[...,1]),-1))]:
  z=local[...,2];q=local[...,:2]/(np.where(z>0,z,1)[...,None]*T);edge=np.max(abs(q),axis=-1);weight=(1-smooth(edge,.70,.96))*(z>0)*(edge<.96)
  if name=='front':weight*=1-smooth(np.max(abs((q-MASK[:2])/MASK[2:]),axis=-1),.60,1.)
  weights.append(weight);colors.append(texture(images[name],.5+.5*q[...,0],.5-.5*q[...,1]))
 base=1-np.maximum.reduce(weights);out=texture(images['base'],u,v)*base[...,None];den=base.copy()
 for c,a in zip(colors,weights):out+=c*a[...,None];den+=a
 return out/den[...,None]
def perspective(n,yaw,pitch,fov):
 yy,xx=np.meshgrid(np.arange(n),np.arange(n),indexing='ij');t=math.tan(math.radians(fov/2));x=(2*(xx+.5)/n-1)*t;y=(1-2*(yy+.5)/n)*t
 cy,sy,cp,sp=math.cos(yaw),math.sin(yaw),math.cos(pitch),math.sin(pitch);z=cp-y*sp
 return np.stack((x*cy+z*sy,y*cp+sp,z*cy-x*sy),-1)
def main():
 a=argparse.ArgumentParser();a.add_argument('operation',choices=['bake','historical-view','extract']);a.add_argument('--input',type=Path);a.add_argument('--inputs',type=Path);a.add_argument('--output',required=True,type=Path);a.add_argument('--width',type=int,default=3072);a.add_argument('--size',type=int,default=1400);a.add_argument('--yaw',type=float,default=0);a.add_argument('--pitch',type=float,default=0);a.add_argument('--fov',type=float,default=100);args=a.parse_args()
 record={'schemaVersion':1,'operation':args.operation,'scriptSha256':sha(__file__),'pngHelperSha256':sha(Path(__file__).with_name('png_io.py')),'samplingHelperSha256':sha(Path(__file__).with_name('trusted_reproject.py')),'noCreativeEditing':True}
 if args.operation!='extract':
  if not args.inputs:raise ValueError('--inputs required')
  images={};inputs=[]
  for name,filename in NAMES.items():
   p=args.inputs/filename;decoded=p.with_suffix('.png')
   if not decoded.exists():subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(p),'-pix_fmt','rgb24',str(decoded)],check=True)
   images[name]=load(decoded)[...,:3];inputs.append({'role':name,'sourceRepoPath':'docs/storyboard/images/house-menu/'+filename,'sha256':sha(p),'decodedSha256':sha(decoded),'dimensions':[images[name].shape[1],images[name].shape[0]]})
  record.update({'inputs':inputs,'runtimeShaderSha256':sha(Path(__file__).with_name('runtime-panorama-gl.js')),'runtimeConfigSha256':sha(Path(__file__).with_name('runtime-panorama-config.js')),'patchFovDegrees':110,'frontMask':MASK.tolist(),'blend':'edge=1-smoothstep(.70,.96,max(abs(q))); front*=1-smoothstep(.60,1,max(abs((q-center)/extent))); base=1-max(patch alphas); normalized sum of encoded RGB weighted by base/alphas','textureSampling':'GL LINEAR pixel-center bilinear, CLAMP_TO_EDGE on all source textures; base longitude fract before sampling'})
 if args.operation=='bake':
  w=args.width
  if w%2 or w<4:raise ValueError('Width must be even >=4')
  h=w//2;out=np.empty((h,w,3),np.uint8)
  for start in range(0,h,48):
   yy,xx=np.meshgrid(np.arange(start,min(start+48,h)),np.arange(w),indexing='ij');yaw=((xx+.5)/w-.5)*2*np.pi;pitch=(.5-(yy+.5)/h)*np.pi;rays=np.stack((np.sin(yaw)*np.cos(pitch),np.sin(pitch),np.cos(yaw)*np.cos(pitch)),-1);out[start:start+len(yy)]=np.rint(np.clip(patched(images,rays),0,255)).astype(np.uint8)
 else:
  if not 0<args.fov<180 or not -90<=args.pitch<=90:raise ValueError('Invalid perspective')
  rays=perspective(args.size,math.radians(args.yaw),math.radians(args.pitch),args.fov)
  if args.operation=='historical-view':values=patched(images,rays)
  else:
   src=load(args.input)[...,:3]
   if src.shape[1]!=2*src.shape[0]:raise ValueError('Input must be 2:1 panorama')
   values=pano_sample(src,rays[...,[0,2,1]]);record['input']={'path':str(args.input),'sha256':sha(args.input),'dimensions':[src.shape[1],src.shape[0]]}
  out=np.rint(np.clip(values,0,255)).astype(np.uint8);record['camera']={'yawDegrees':args.yaw,'pitchDegrees':args.pitch,'horizontalFovDegrees':args.fov,'verticalFovDegrees':args.fov,'size':args.size}
 args.output.parent.mkdir(parents=True,exist_ok=True);save(args.output,out);record['output']={'path':str(args.output),'sha256':sha(args.output),'dimensions':[out.shape[1],out.shape[0]]};record['orientation']='Front +Y at panorama u=.5; right +X at u=.75; rear −Y at u=0/1; up +Z at v=0. Renderer coordinates [X,Z,Y].'
 args.output.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record['output']))
if __name__=='__main__':main()
