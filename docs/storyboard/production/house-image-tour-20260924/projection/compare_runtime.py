from pathlib import Path
import json,math
import numpy as np
from project import load,patched,perspective,NAMES,sha
root=Path(__file__).resolve().parents[1];folder=root/'runtime-check'
images={name:load(root/'inputs'/filename.replace('.webp','.png'))[...,:3] for name,filename in NAMES.items()};results=[]
for name,yaw,pitch in json.loads((folder/'cases.json').read_text()):
 actual=np.frombuffer((folder/(name+'.rgba')).read_bytes(),np.uint8).reshape(256,256,4)[::-1,:,:3]
 expected=np.rint(np.clip(patched(images,perspective(256,math.radians(yaw),math.radians(pitch),110)),0,255)).astype(np.uint8)
 diff=abs(actual.astype(float)-expected.astype(float));results.append({'view':name,'meanAbsoluteChannelError':float(diff.mean()),'p99AbsoluteChannelError':float(np.percentile(diff,99)),'maxAbsoluteChannelError':float(diff.max())})
record={'cases':results,'interpretation':'Same orientations, blend formula, texture filtering and masks; GPU float/texture filtering versus float64 CPU may differ by quantization. Not an art-quality check.','pass':all(v['meanAbsoluteChannelError']<.6 and v['p99AbsoluteChannelError']<=2 for v in results),'projectScriptSha256':sha(Path(__file__).with_name('project.py'))}
(folder/'comparison.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record));assert record['pass']
