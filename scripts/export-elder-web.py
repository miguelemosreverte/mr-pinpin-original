#!/usr/bin/env python3
"""Encode selected full-resolution art as WebP; retain source PNGs in production."""
import concurrent.futures,hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'docs/storyboard';P=BASE/'production/chapters-02-04/revision-06/elder';OUT=BASE/'images/published/elder-cycle';OUT.mkdir(parents=True,exist_ok=True)
chapter=json.loads((P/'chapter.json').read_text());record=OUT/'export-manifest.json';old={r['target']:r for r in json.loads(record.read_text()).get('assets',[])} if record.exists() else {}
jobs=[(s['src'],s['id']+'.webp') for s in chapter['scenes']]
for part in chapter['parts']:
 jobs += [(part['cover'][lang],part['id']+'-title-'+lang+'.webp') for lang in ['en','ru','es']]
 mini=part['miniature'];jobs.append((mini if isinstance(mini,str) else mini['src'],part['id']+'-miniature.webp'))
def export(job):
 src,name=job;source=BASE/src
 if not source.exists():source=ROOT.parent/'mr-pinpin-original/docs/storyboard'/src
 if not source.exists():return {'missing':src}
 sha=hashlib.sha256(source.read_bytes()).hexdigest();target=OUT/name;previous=old.get(name)
 if previous and previous['sourceSHA256']==sha and target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==previous['webSHA256']:return previous
 subprocess.run(['cwebp','-quiet','-q','92','-m','4',str(source),'-o',str(target)],check=True)
 from PIL import Image
 with Image.open(source) as im: dimensions=im.size
 with Image.open(target) as im:assert im.size==dimensions
 return {'source':src,'sourceSHA256':sha,'target':name,'webSHA256':hashlib.sha256(target.read_bytes()).hexdigest(),'width':dimensions[0],'height':dimensions[1],'bytes':target.stat().st_size}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(export,jobs))
missing=[r['missing'] for r in results if 'missing' in r];assets=[r for r in results if 'missing' not in r]
record.write_text(json.dumps({'encoder':'cwebp -q 92 -m 4; full resolution; no crop, retouch or compositional change','assets':assets,'missing':missing},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'assets':len(assets),'missing':missing,'MiB':round(sum(r['bytes'] for r in assets)/1048576,2)}))
