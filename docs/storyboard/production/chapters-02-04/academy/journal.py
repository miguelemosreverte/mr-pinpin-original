import json,sys,datetime,hashlib,struct,shutil
from pathlib import Path
base=Path(__file__).parent
mode=sys.argv[1]
if mode=='prepare':
 r=json.loads(sys.argv[2]); (base/'active-request.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)); p=base/'production-log.json';d=json.load(open(p));d['requests'].append(r);p.write_text(json.dumps(d,ensure_ascii=False,indent=2))
elif mode=='capture':
 r=json.load(open(base/'active-request.json'));r['generatedFile']=sys.argv[2];r['finishedAt']=sys.argv[3];dest=Path(r['output']);assert not dest.exists();shutil.copyfile(r['generatedFile'],dest);b=dest.read_bytes();r['width'],r['height']=struct.unpack('>II',b[16:24]);r['sha256']=hashlib.sha256(b).hexdigest();r['tool']='built-in imagegen';r['status']='proposed';r['review']=None;r['references']=[{'path':p,'role':'Identity, environment or edit target as specified by exact prompt'} for p in r.pop('refs')];r['seconds']=(datetime.datetime.fromisoformat(r['finishedAt'])-datetime.datetime.fromisoformat(r['startedAt'])).total_seconds();dest.with_suffix('.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));dest.with_suffix('.md').write_text('# '+r['id']+'\n\nStatus: proposed, not user-approved.\n\nTool: '+r['tool']+'\n\nUTC: '+r['startedAt']+' — '+r['finishedAt']+'\n\nDimensions: '+str(r['width'])+' x '+str(r['height'])+'\n\nSHA-256: '+r['sha256']+'\n\nExact prompt:\n\n'+r['prompt']+'\n\nReferences:\n'+ '\n'.join(x['path'] for x in r['references'])+'\n\nVisual review: pending.\n');print(dest)
elif mode=='review':
 p=Path(sys.argv[2]);r=json.load(open(p));r['review']=sys.argv[3];r['reviewedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();p.write_text(json.dumps(r,ensure_ascii=False,indent=2));m=p.with_suffix('.md');t=m.read_text();t=t.replace('Visual review: pending.','Visual review: '+r['review']+'\n\nReviewed UTC: '+r['reviewedAt']);m.write_text(t)
