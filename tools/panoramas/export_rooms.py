"""Bake frozen current room stacks with registered detail into equirectangular PNGs."""
from pathlib import Path
import argparse,json,math,subprocess
import numpy as np
from stack_math import load,save,sha,sample,rays,texture,smooth

def render(images,config,w):
 color,_=sample(images,config['repairs'],w,list(config['repairs']['assets']))
 if 'details' in config:
  d=config['details'];yaw,pitch=d['yaw'],d['pitch'];dc,ds,pc,ps=math.cos(yaw),math.sin(yaw),math.cos(pitch),math.sin(pitch)
  dx=w[...,0]*dc-w[...,2]*ds;dz=w[...,0]*ds+w[...,2]*dc;ly=w[...,1]*pc-dz*ps;lz=w[...,1]*ps+dz*pc
  t=math.tan(math.radians(d['fov']/2));q=np.stack((dx,ly),-1)/(np.where(lz>0,lz,1)[...,None]*t);mask=np.array(d['mask']);m=np.max(abs((q-mask[:2])/mask[2:]),axis=-1)
  a=(1-smooth(m,.60,1))*(1-smooth(np.max(abs(q),axis=-1),.98,1))*(lz>0)
  detail=texture(images['detail'],.5+.5*q[...,0],.5-.5*q[...,1]);color=color*(1-a[...,None])+detail*a[...,None]
 return color

def load_images(config,folder):
 images={}
 for role,record in config['inputs'].items():
  p=folder/record['file']
  if not p.exists() and record.get('sourcePath'):p=Path(record['sourcePath'])
  assert sha(p)==record['sha256'];decoded=p
  if p.suffix=='.webp':
   decoded=p.with_suffix('.png')
   if not decoded.exists():subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(p),'-pix_fmt','rgb24',str(decoded)],check=True)
  images[role]=load(decoded)[...,:3]
 return images

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--config',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--room',choices=['common','bath','bedroom']);a=ap.parse_args();manifest=json.loads(a.config.read_text());folder=a.config.parent;a.out.mkdir(parents=True,exist_ok=True)
 for room,c in manifest['rooms'].items():
  if a.room and room!=a.room:continue
  images=load_images(c,folder);w,h=3072,1536;result=np.empty((h,w,3),np.uint8)
  for start in range(0,h,48):
   yy,xx=np.meshgrid(np.arange(start,min(start+48,h)),np.arange(w),indexing='ij');yaw=((xx+.5)/w-.5)*2*np.pi;pitch=(.5-(yy+.5)/h)*np.pi;directions=np.stack((np.sin(yaw)*np.cos(pitch),np.sin(pitch),np.cos(yaw)*np.cos(pitch)),-1)
   result[start:start+len(yy)]=np.rint(np.clip(render(images,c,directions),0,255)).astype(np.uint8)
  p=a.out/(room+'-current.png');save(p,result)
  camera={'yawRadians':c['initialView']['yaw'],'pitchRadians':0,'fovDegrees':100,'size':1024};proof=np.rint(np.clip(render(images,c,rays(camera['size'],camera['yawRadians'],0,camera['fovDegrees'])),0,255)).astype(np.uint8);proofpath=a.out/(room+'-level-reference.png');save(proofpath,proof)
  record={'schemaVersion':1,'operation':'deterministic current runtime stack bake, including optional final registered detail','room':room,'config':c,'configSha256':sha(a.config),'scriptSha256':sha(__file__),'stackMathSha256':sha(folder/'stack_math.py'),'samplingHelperSha256':sha(folder/'trusted_reproject.py'),'pngHelperSha256':sha(folder/'png_io.py'),'runtimeShaderSha256':sha(folder/'runtime-panorama-gl.js'),'runtimeConfigSha256':sha(folder/'runtime-room-config.js'),'output':{'path':str(p),'sha256':sha(p),'size':[w,h]},'levelProof':{'path':str(proofpath),'sha256':sha(proofpath),'size':[1024,1024],'camera':camera},'orientation':'World+Yfront u=.5; +Xrightu=.75; −Yrearwrap; +Zupv=0. Rendererinternalaxes[X,Z,Y].','sampling':'Pixel-center rays, encoded RGB linear filtering, source textures clamp-to-edge; base longitude fract before sampling. Same normalized repair blend and registered detail mix as frozen shader.','noNewGeometryOrArt':True,'noCameraTranslation':True,'note':'This preserves the current image-led view; lowering a future generated view is an artistic proposal, not a recovered metric camera move.'}
  p.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record['output']),flush=True)
if __name__=='__main__':main()
