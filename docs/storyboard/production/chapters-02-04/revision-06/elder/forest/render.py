"""Built-in imagegen request/asset bookkeeping only. Never invokes image APIs."""
import sys,json,pathlib,datetime,hashlib,shutil,struct
ROOT=pathlib.Path(__file__).resolve().parents[8]
# ROOT resolves docs? find repository explicitly from this file.
ROOT=next(p for p in pathlib.Path(__file__).resolve().parents if (p/'docs/storyboard').is_dir())
SB=ROOT/'docs/storyboard';D=pathlib.Path(__file__).parent;OUT=SB/'images/chapter-02-expanded/revision-06/forest'
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
cmd=sys.argv[1]
if cmd=='prepare':
 spec=json.loads(pathlib.Path(sys.argv[2]).read_text());dest=OUT/spec['stem'];dest.parent.mkdir(parents=True,exist_ok=True)
 refs=[{'path':str(SB/r['path']),'role':r['role'],'sha256':sha(SB/r['path'])} for r in spec['references']]
 req={**spec,'tool':'image_gen.imagegen','mode':spec.get('mode','generate'),'requestedAt':now(),'references':refs,'status':'prepared'}
 dump(dest.with_suffix('.request.json'),req);dest.with_suffix('.md').write_text('# Exact built-in imagegen prompt\n\n'+spec['prompt']+'\n\n'+ '\n'.join(r['role']+': '+r['path'] for r in refs)+'\n')
 print(json.dumps({'prompt':req['prompt'],'referenced_image_paths':[r['path'] for r in refs],'requestPath':str(dest.with_suffix('.request.json'))}))
elif cmd=='finish':
 stem,source,start,end=sys.argv[2:6];dest=OUT/stem;req=json.loads(dest.with_suffix('.request.json').read_text());png=dest.with_suffix('.png');shutil.copyfile(source,png)
 b=png.read_bytes();w,h=struct.unpack('>II',b[16:24]);m={**req,'schemaVersion':1,'startedAt':start,'finishedAt':end,'completedAt':now(),'sourcePath':source,'output':str(png.relative_to(SB)),'sha256':sha(png),'width':w,'height':h,'review':'Pending actual full-image creator review','status':'pending-review','timingSource':{'source':'Date().toISOString immediately before and after awaited built-in tool call','scope':'observed request wall time, not model-only latency'}};dump(dest.with_suffix('.json'),m);print(str(png))
elif cmd=='review':
 stem,review=sys.argv[2:4];p=(OUT/stem).with_suffix('.json');m=json.loads(p.read_text());m.update(status='ready',review=review,reviewedAt=now());dump(p,m);print(m['output'])
