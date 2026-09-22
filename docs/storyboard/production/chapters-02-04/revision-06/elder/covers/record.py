#!/usr/bin/env python3
"""Record built-in generation requests and actual outputs; never generate assets."""
import datetime, hashlib, json, shutil, sys
from pathlib import Path
ROOT=next(p for p in Path(__file__).resolve().parents if p.name=='storyboard')
def utc(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def dump(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
mode=sys.argv[1]
if mode=='prepare':
 d=json.loads(sys.stdin.read());p=ROOT/d['output'];p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists() or p.with_suffix('.request.json').exists(): raise SystemExit('Version already exists')
 for r in d['references']: r['sha256']=hashlib.sha256(Path(r['path']).read_bytes()).hexdigest()
 d.update(startedAt=utc(),tool='built-in imagegen',status='proposed',review='Pending actual image inspection')
 dump(p.with_suffix('.request.json'),d);print(p.with_suffix('.request.json'))
elif mode=='finish':
 p=Path(sys.argv[2]);d=json.loads(p.read_text());out=ROOT/d['output'];shutil.copyfile(sys.argv[3],out);b=out.read_bytes()
 d.update(finishedAt=utc(),generatedFile=sys.argv[3],sha256=hashlib.sha256(b).hexdigest(),width=int.from_bytes(b[16:20],'big'),height=int.from_bytes(b[20:24],'big'))
 if len(sys.argv)>4: d.update(review=sys.argv[4],reviewedAt=utc())
 dump(out.with_suffix('.json'),d);out.with_suffix('.md').write_text('# '+d['id']+'\n\n'+d['prompt']+'\n\n'+d['review']+'\n');print(out)
elif mode=='review':
 p=Path(sys.argv[2]);d=json.loads(p.read_text());d.update(review=sys.stdin.read().strip(),reviewedAt=utc());dump(p,d)
 p.with_suffix('.md').write_text('# '+d['id']+'\n\n'+d['prompt']+'\n\n'+d['review']+'\n')
