"""Deterministic final exports for C-owned stops; never calls image generation."""
import argparse, hashlib, json, pathlib, shutil, subprocess, sys
p=argparse.ArgumentParser();p.add_argument('stop',type=int);a=p.parse_args()
assert a.stop in [13,15,20,21,22,23]
root=pathlib.Path(__file__).resolve().parent; d=root/'stops'/f'stop-{a.stop:02d}'; v='v2' if a.stop==13 else 'v1'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
write=lambda p,x:p.write_text(json.dumps(x,indent=2)+'\n')
run=lambda *args:subprocess.run([sys.executable,*map(str,args)],check=True,stdout=subprocess.DEVNULL)
for face in ['up','down']:
 inp=f'{face}-input-v2.png' if a.stop==13 else f'{face}-input.png'
 prompt=f'{face}-v2-prompt.txt' if a.stop==13 else f'{face}-prompt.txt'
 record=f'{face}-v2-generation.json' if a.stop==13 else f'{face}-generation.json'
 run(root/'record_13_23.py','--directory',d,'--output',f'{face}-{v}.png','--prompt',prompt,'--record',record,'--original','Exact returned PNG data URL decoded unchanged','--inputs',json.dumps([{'path':inp,'role':'Exact registered 110-degree pole view; camera and outer edges preserved.'}]))
stack={'schemaVersion':1,'id':d.name,'inputs':{},'repairs':{'fovDegrees':110,'frontMask':[0,0,2,2],'assets':{k:k for k in ['rear','up','down']}}}
for k in ['base','rear','up','down']:
 f=f'panorama-{v}.png' if k=='base' else f'{k}-{v}.png';stack['inputs'][k]={'file':f,'sha256':sha(d/f)}
stackname='selected-stack-v2.json' if a.stop==13 else 'selected-stack.json';write(d/stackname,stack)
camera=json.loads((d/f'camera-{v}.json').read_text()); cam=json.dumps(camera)
background=d/f'panorama-assembled-{v}.png'; anchored=d/f'panorama-source-locked-{v}.png'; forward=d/f'forward-source-locked-{v}.png'; exports=d/f'source-locked-exports-{v}'
if not background.exists():run(root/'projection-tools/project.py','assemble','--config',d/stackname,'--output',background,'--width',3072)
if not anchored.exists():run(root/'source_anchor.py','--panorama',background,'--source',d/'source-display.png','--camera',cam,'--output',anchored,'--width',4096)
if not forward.exists():run(root/'extract_forward.py','--panorama',anchored,'--camera',cam,'--output',forward,'--helpers',root/'projection-tools')
if not (exports/'exports-v1.json').exists():run(root/'projection-tools/project.py','export','--input',anchored,'--output',exports,'--width',4096,'--face-size',1024)
run(root/'review_directions_13_23.py','--panorama',anchored,'--out',d/f'review-final-{v}','--camera',cam)
run(root/'review_anchor_edges_c.py','--panorama',anchored,'--out',d/f'review-edges-final-{v}','--camera',cam)
rel=lambda p:str(p.relative_to(root))
s={'schemaVersion':1,'id':d.name,'status':'candidate-awaiting-final-review','sourceLockStatus':'pending','panorama':rel(background),'camera':camera,'sourceAnchor':{'asset':rel(d/'source-display.png'),'camera':camera,'aspect':16/9,'featherStart':.94},'anchoredPanorama':rel(anchored),'anchoredCube':rel(exports/'cube-atlas-v1.png'),'forward':rel(forward),'stack':rel(d/stackname),'exports':rel(exports/'exports-v1.json'),'prompt':rel(d/('panorama-v2-prompt.txt' if a.stop==13 else 'panorama-prompt.txt')),'record':rel(d/('panorama-v2-generation.json' if a.stop==13 else 'panorama-generation.json')),'review':rel(d/'review.md'),'sourceLockReview':rel(d/'review.md')}
write(d/f'selected-pending-{v}.json',s)
print(json.dumps({'stop':d.name,'pending':rel(d/f'selected-pending-{v}.json'),'anchoredSha256':sha(anchored),'cubeSha256':sha(exports/'cube-atlas-v1.png')}))
