"""Deterministic runtime-stack perspective export with explicit JSON configuration."""
import argparse,hashlib,json,math
from pathlib import Path
import numpy as np
from trusted_reproject import load,save,bilinear

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def smooth(x,a,b):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
def texture(a,u,v):return bilinear(a,u*a.shape[1]-.5,v*a.shape[0]-.5)
def rays(n,yaw,pitch,fov):
 yy,xx=np.meshgrid(np.arange(n),np.arange(n),indexing='ij');t=math.tan(math.radians(fov/2));x=(2*(xx+.5)/n-1)*t;y=(1-2*(yy+.5)/n)*t
 cy,sy,cp,sp=math.cos(yaw),math.sin(yaw),math.cos(pitch),math.sin(pitch);z=cp-y*sp;w=np.stack((x*cy+z*sy,y*cp+sp,z*cy-x*sy),-1);return w/np.linalg.norm(w,axis=-1,keepdims=True)
def sample(images,config,w,enabled):
 u=np.mod(.5+np.arctan2(w[...,0],w[...,2])/(2*np.pi),1);v=.5-np.arcsin(np.clip(w[...,1],-1,1))/np.pi
 baseColor=texture(images['base'],u,v);weights=[];colors=[];allWeights={};T=math.tan(math.radians(config['fovDegrees']/2));mask=np.array(config['frontMask'])
 locals={'front':w,'rear':w*np.array([-1,1,-1]),'up':np.stack((w[...,0],-w[...,2],w[...,1]),-1),'down':np.stack((w[...,0],w[...,2],-w[...,1]),-1)}
 for name in enabled:
  local=locals[name];z=local[...,2];q=local[...,:2]/(np.where(z>0,z,1)[...,None]*T);edge=np.max(abs(q),axis=-1);a=(1-smooth(edge,.70,.96))*(z>0)*(edge<.96)
  if name=='down' and 'downMaskX' in config:a*=1-smooth(q[...,0],*config['downMaskX'])
  if name=='front':a*=1-smooth(np.max(abs((q-mask[:2])/mask[2:]),axis=-1),.60,1.)
  weights.append(a);colors.append(texture(images[name],.5+.5*q[...,0],.5-.5*q[...,1]));allWeights[name]=a
 base=1-np.maximum.reduce(weights) if weights else np.ones(w.shape[:2]);color=baseColor*base[...,None];den=base.copy()
 for c,a in zip(colors,weights):color+=c*a[...,None];den+=a
 return color/den[...,None],allWeights

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--config',required=True,type=Path);ap.add_argument('--out',required=True,type=Path);a=ap.parse_args();config=json.loads(a.config.read_text());folder=a.config.parent
 images={}
 for name,item in config['inputs'].items():
  p=folder/item['file'];assert sha(p)==item['sha256'];images[name]=load(p)[...,:3]
 camera=config['camera'];w=rays(camera['size'],camera['yawRadians'],camera['pitchRadians'],camera['fovDegrees']);a.out.mkdir(parents=True,exist_ok=True);outputs=[]
 modes={'rug-repair-before':['front','rear','down']}
 for name,enabled in modes.items():
  values,weights=sample(images,config['repairs'],w,enabled);result=np.rint(np.clip(values,0,255)).astype(np.uint8);p=a.out/(name+'.png');save(p,result);outputs.append({'path':str(p),'sha256':sha(p),'size':[result.shape[1],result.shape[0]],'enabledRepairs':enabled})
  if name=='unused-alpha-diagnostic':
   alpha=np.rint(weights['down']*255).astype(np.uint8);p=a.out/'down-weight.png';save(p,np.repeat(alpha[...,None],3,axis=2));outputs.append({'path':str(p),'sha256':sha(p),'size':[alpha.shape[1],alpha.shape[0]],'role':'diagnostic raw down-patch alpha before normalized blend, not artwork'})
 record={'schemaVersion':1,'operation':'matching perspective exports of frozen runtime texture stack','config':config,'configSha256':sha(a.config),'scriptSha256':sha(__file__),'runtimeShaderSha256':sha(folder/'runtime-panorama-gl-mask-v1.js'),'runtimeConfigSha256':sha(folder/'runtime-room-config-mask-v1.js'),'helperSha256':sha(folder/'trusted_reproject.py'),'pngHelperSha256':sha(folder/'png_io.py'),'outputs':outputs,'sampling':'Encoded RGB, GL LINEAR equivalent bilinear clamp-to-edge; fract base longitude before filtering; pixel-center rays. No color grading or paint.','frame':'Renderer x right,y up,z front = world X,Z,Y; yaw radians0 front,pi rear; pitch radians positive up; square vertical and horizontal FOV equal.','caution':'Matches blend formula/orientation; float64 CPU quantization may differ from GPU by small rounding. Base-only and down-only are diagnostic layer variants, not proposed new artwork.'}
 (a.out/'rug-extraction.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(outputs))
if __name__=='__main__':main()
