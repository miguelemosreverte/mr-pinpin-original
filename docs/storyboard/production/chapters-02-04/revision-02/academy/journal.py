import json,sys,datetime,hashlib,struct,shutil
from pathlib import Path
base=Path(__file__).parent

def write(r,p):
 p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
 lines=['# '+r['id'],'','Status: '+r.get('status','proposed'),'','Tool: built-in imagegen','', 'Started UTC: '+r.get('startedAt',''), 'Finished UTC: '+r.get('finishedAt',''),'', 'Dimensions: '+str(r.get('width',''))+' x '+str(r.get('height','')),'SHA-256: '+r.get('sha256',''),'', '## Exact prompt','',r['prompt'],'','## References','']
 lines += [x['path']+': '+x.get('role','See prompt') for x in r.get('references',[])]
 lines += ['','## Visual review','',r.get('review') or 'Pending inspection.','', 'Reviewed UTC: '+r.get('reviewedAt','')]
 p.with_suffix('.md').write_text('\n'.join(lines)+'\n')
mode=sys.argv[1]
if mode=='prepare':
 r=json.loads(sys.argv[2]);folder=base/'requests';folder.mkdir(exist_ok=True);p=folder/(r['id']+'.json');assert not p.exists(),str(p);p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
elif mode=='capture':
 r=json.load(open(base/'requests'/(sys.argv[2]+'.json')));r['generatedFile']=sys.argv[3];r['finishedAt']=sys.argv[4];dest=Path(r['output']);dest.parent.mkdir(exist_ok=True,parents=True);assert not dest.exists();shutil.copyfile(r['generatedFile'],dest);raw=dest.read_bytes();r['width'],r['height']=struct.unpack('>II',raw[16:24]);r['sha256']=hashlib.sha256(raw).hexdigest();r['tool']='built-in imagegen';r['status']='proposed';r['review']=None;r['references']=[{'path':p,'role':'Identity/style/geometry or target as specified in exact prompt'} for p in r.pop('refs')];r['seconds']=(datetime.datetime.fromisoformat(r['finishedAt'])-datetime.datetime.fromisoformat(r['startedAt'])).total_seconds();write(r,dest.with_suffix('.json'));print(dest)
elif mode=='review':
 p=Path(sys.argv[2]);r=json.load(open(p));r['review']=sys.argv[3];r['reviewedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();write(r,p)
