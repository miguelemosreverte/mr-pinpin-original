import json,pathlib,datetime,sys
D=pathlib.Path(__file__).parent
R=next(p for p in D.parents if (p/'docs/storyboard').is_dir());SB=R/'docs/storyboard'
n=int(sys.argv[1]);v=int(sys.argv[2]);review=sys.argv[3];stem=f'scene-{n:03}-v{v}'
p=SB/'images/chapter-02-expanded/revision-06/forest'/f'{stem}.json';m=json.loads(p.read_text());m.update(status='ready',review=review,reviewedAt=datetime.datetime.now(datetime.timezone.utc).isoformat());p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
plan=json.loads((D/'story-plan.json').read_text());s=plan['scenes'][n-1].copy();s.update(src=m['output'],width=m['width'],height=m['height'],sha256=m['sha256'],review=review,status='ready',assetMode='new',reused=False)
a=json.loads((D/'results.json').read_text());ss=a['parts'][0]['scenes'];ss[:]=[x for x in ss if x['id']!=s['id']]+[s];ss.sort(key=lambda x:x['id']);a['status']='ready-for-root-review' if len(ss)==22 else 'in-progress';(D/'results.json').write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n');print(s['id'])
