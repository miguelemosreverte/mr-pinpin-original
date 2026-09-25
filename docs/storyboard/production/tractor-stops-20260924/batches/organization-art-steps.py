#!/usr/bin/env python3
"""Record and project this artwork lane's immutable model outputs; never calls an image model."""
import argparse,concurrent.futures,datetime,hashlib,json,struct,subprocess
from pathlib import Path
a=argparse.ArgumentParser();a.add_argument('--root',required=True);a.add_argument('--stop',type=int,required=True);a.add_argument('--stage',choices=['base','rear','final'],required=True);a.add_argument('--source',nargs='+',required=True);args=a.parse_args()
assert args.stop in {6,7,8,9,16,17,18,19}
b=Path(args.root);s=b/f'stops/stop-{args.stop:02d}';py=str(b/'fit-env/bin/python');helpers=Path('/Volumes/TB4/mac-mini-storage/shared/pinpin-story-worlds-20260924/projection');tool=str(helpers/'project.py')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def record(kind,src,inputfiles,roles,camera=None):
 image=s/f'{kind}-v1.png';prompt=s/f'{kind}-prompt.txt'
 r={'schemaVersion':1,'tool':'built-in image_gen','calls':1,'status':'candidate-until-source-anchor-reviewed','recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exactPrompt':{'file':prompt.name,'sha256':sha(prompt)},'inputs':[{'path':str(p.relative_to(b)),'sha256':sha(p),'role':role} for p,role in zip(inputfiles,roles)],'output':{'file':image.name,'sha256':sha(image),'bytes':image.stat().st_size,'dimensions':list(struct.unpack('>II',image.read_bytes()[16:24]))},'generatedSource':src,'note':'Unmodified returned master. Authored guide is65degrees; final fitted camera is recorded separately.'}
 if camera:r['camera']=camera
 (s/f'{kind}-generation.json').write_text(json.dumps(r,indent=2)+'\n')
def stack(keys,name):
 r={'schemaVersion':1,'id':f'stop{args.stop:02d}-{name}','inputs':{k:{'file':v,'sha256':sha(s/v)} for k,v in [('base','panorama-v1.png')]+[(k,f'{k}-v1.png') for k in keys]}}
 r['repairs']={'fovDegrees':110,'frontMask':[0,0,2,2],'assets':{k:k for k in keys}}
 p=s/name;p.write_text(json.dumps(r,indent=2)+'\n');return p
def extract(config,name,yaw,pitch,fov=110,size=1400):
 subprocess.run([py,tool,'extract','--config',str(config),'--output',str(s/name),'--yaw',str(yaw),'--pitch',str(pitch),'--fov',str(fov),'--size',str(size)],check=True,stdout=subprocess.DEVNULL)
if args.stage=='base':
 record('panorama',args.source[0],[s/'raw-guide65-v1/guide-equirect.png',s/'source.png',b/'pilot/fov-correction/accepted-reference.png'],['literal projected edit target65degree','raw source camera/material/light authority','sphere continuity only'])
 subprocess.run([py,str(b/'fit_camera.py'),'--reference',str(s/'source.png'),'--panorama',str(s/'panorama-v1.png'),'--out',str(s/'fit-v1')],check=True)
 p=stack([],'base-stack.json')
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as e:list(e.map(lambda v:extract(p,*v),[('rear-input-v1.png',180,0),('up-input-v1.png',0,90),('down-input-v1.png',0,-90)]))
elif args.stage=='rear':
 record('rear',args.source[0],[s/'rear-input-v1.png'],['current base rear perspective110degree'],{'yawDegrees':180,'pitchDegrees':0,'fovDegrees':110})
 p=stack(['rear'],'after-rear-stack.json')
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as e:list(e.map(lambda v:extract(p,*v),[('up-input-v2.png',0,90),('down-input-v2.png',0,-90)]))
else:
 for key,src,pitch in zip(['up','down'],args.source,[90,-90]):record(key,src,[s/f'{key}-input-v2.png'],['current base+rear perspective110degree'],{'yawDegrees':0,'pitchDegrees':pitch,'fovDegrees':110})
 p=stack(['rear','up','down'],'selected-stack.json')
 subprocess.run([py,tool,'export','--config',str(p),'--output',str(s),'--width','3072','--face-size','1024'],check=True,stdout=subprocess.DEVNULL)
 c=json.loads((s/'fit-v1/fit.json').read_text())['camera'];camera={'yaw':c['yawRadians'],'pitch':c['pitchRadians'],'fov':c['verticalFovDegrees']}
 subprocess.run([py,str(b/'extract_forward.py'),'--panorama',str(s/'panorama-assembled-v1.png'),'--camera',json.dumps(camera),'--output',str(s/'forward.png'),'--helpers',str(helpers)],check=True,stdout=subprocess.DEVNULL)
 pre=f'stops/stop-{args.stop:02d}/';r={'schemaVersion':1,'id':f'stop-{args.stop:02d}','status':'candidate-until-source-anchor-reviewed','panorama':pre+'panorama-assembled-v1.png','camera':camera,'sourceCamera':camera,'authoredGuideCamera':{'yaw':0,'pitch':0,'fov':65},'forward':pre+'forward.png','stack':pre+'selected-stack.json','exports':pre+'exports-v1.json','prompt':pre+'panorama-prompt.txt','record':pre+'panorama-generation.json','review':pre+'review.md','forwardSha256':sha(s/'forward.png'),'panoramaSha256':sha(s/'panorama-assembled-v1.png')}
 (s/'candidate-selection.json').write_text(json.dumps(r,indent=2)+'\n')
 for name,yaw,pitch in [('rear-up',180,45),('rear-down',180,-45),('front-down',0,-45)]:extract(p,f'review-{name}.png',yaw,pitch,90,900)
print(json.dumps({'stop':args.stop,'stage':args.stage,'complete':True}))
