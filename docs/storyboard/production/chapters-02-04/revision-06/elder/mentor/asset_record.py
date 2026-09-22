"""Persist built-in image requests/results; never generates images itself."""
import json, pathlib, hashlib, shutil, struct, sys
BASE = pathlib.Path(__file__).resolve().parents[5]
LANE = pathlib.Path(__file__).resolve().parent
ART = BASE / 'images/chapter-02-expanded/revision-06/mentor'
def sha(p): return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
data = json.loads(sys.stdin.read())
mode = sys.argv[1]
if mode == 'request':
    data['references'] = [dict(r, sha256=sha(r['path'])) for r in data['references']]
    (ART / (data['id'] + '.request.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(data,ensure_ascii=False))
elif mode == 'finish':
    req = json.loads((ART / (data['id']+'.request.json')).read_text())
    out = ART / (data['id']+'.png')
    if out.exists(): raise RuntimeError('Refusing to overwrite existing version')
    shutil.copy2(data['generatedFile'],out)
    width,height=struct.unpack('>II',out.read_bytes()[16:24])
    rec=dict(req,**data,output=str(out.relative_to(BASE)),sha256=sha(out),width=width,height=height)
    rec['status']=data.get('status','ready')
    (ART / (data['id']+'.json')).write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n')
    (ART / (data['id']+'.md')).write_text('# '+data['id']+'\n\n'+req['prompt']+'\n\n'+data['review']+'\n\nSHA-256: '+rec['sha256']+'\n')
    result=json.loads((LANE/'results.json').read_text())
    sid=data['id'].rsplit('-v',1)[0]
    for part in result['parts']:
        for scene in part['scenes']:
            if scene['id']==sid and rec['status']=='ready':
                scene.update(src=rec['output'],width=width,height=height,review=data['review'],status='ready',provenance='docs/storyboard/'+str((ART/(data['id']+'.json')).relative_to(BASE)))
    (LANE/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:rec[k] for k in ['id','output','sha256','width','height']}))
