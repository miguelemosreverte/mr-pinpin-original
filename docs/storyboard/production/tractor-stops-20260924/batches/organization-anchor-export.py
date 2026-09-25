#!/usr/bin/env python3
"""Export this lane's source-anchored candidates without marking them reviewed."""
import argparse,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--stop',type=int,required=True);a=p.parse_args()
assert a.stop in {6,7,8,9,16,17,18,19}
b=Path(a.root);s=b/f'stops/stop-{a.stop:02d}';py=str(b/'fit-env/bin/python');h=Path('/Volumes/TB4/mac-mini-storage/shared/pinpin-story-worlds-20260924/projection');d=json.loads((s/'candidate-selection.json').read_text());out=s/'panorama-source-locked-v1.png'
if not out.exists():subprocess.run([py,str(b/'source_anchor.py'),'--panorama',str(s/'panorama-assembled-v1.png'),'--source',str(s/'source-display.png'),'--camera',str(s/'candidate-selection.json'),'--output',str(out),'--width','4096'],check=True)
subprocess.run([py,str(h/'project.py'),'export','--input',str(out),'--output',str(s/'source-locked-exports-v1'),'--width','3072','--face-size','1024'],check=True,stdout=subprocess.DEVNULL)
pre=f'stops/stop-{a.stop:02d}/';d.update(sourceLockStatus='pending',sourceLockReview=pre+'source-lock-review.md',sourceAnchor={'asset':pre+'source-display.png','camera':d['camera'],'aspect':16/9,'featherStart':.94},anchoredPanorama=pre+out.name,anchoredCube=pre+'source-locked-exports-v1/cube-atlas-v1.png',anchoredExports=pre+'source-locked-exports-v1/exports-v1.json')
(s/'candidate-selection.json').write_text(json.dumps(d,indent=2)+'\n')
subprocess.run([py,str(b/'extract_forward.py'),'--panorama',str(out),'--camera',json.dumps(d['camera']),'--output',str(s/'forward-source-locked.png'),'--helpers',str(h)],check=True,stdout=subprocess.DEVNULL)
print(json.dumps({'stop':a.stop,'anchoredExportsReady':True}))
