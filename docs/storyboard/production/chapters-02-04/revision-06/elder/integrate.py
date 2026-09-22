#!/usr/bin/env python3
"""Assemble explicit five-part lane selections without replacing earlier drafts."""
import copy,hashlib,json
from pathlib import Path
P=Path(__file__).resolve().parent
B=next(x for x in P.parents if x.name=='storyboard')
def read(p,default):return json.loads(p.read_text()) if p.exists() else default
def dump(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
old=read(P.parent.parent/'revision-05/elder/chapter.json',{})
oldmap={s['id']:s for s in old['scenes']}
reviews={}
for ledger in [P/'forest/independent-family-review.json',P/'family/independent-mentor-review.json',P/'root-reviews.json']:
 reviews.update({r['id']:r for r in read(ledger,{'selected':[]})['selected']})
parts=[];refs=copy.deepcopy(old['preproduction']);coda=[]
for lane in ['family','forest','mentor']:
 result=read(P/lane/'results.json',{});plan=read(P/lane/'story-plan.json',{})
 if lane=='forest' and 'parts' not in plan:plan={'parts':[dict(plan['part'],scenes=plan['scenes'])]}
 ready={s['id']:s for part in result.get('parts',[]) for s in part.get('scenes',[])}
 for part in plan.get('parts',result.get('parts',[])):
  p=copy.deepcopy(part);p['scenes']=[copy.deepcopy(ready.get(s['id'],s)) for s in part['scenes']];parts.append(p)
 if lane=='family':
  readycoda={s['id']:s for s in result.get('coda',[])};coda=[copy.deepcopy(readycoda.get(s['id'],s)) for s in plan.get('coda',[])]
 refs+=result.get('preproduction',[])
assert [p['id'] for p in parts]==['papa-home','family-morning','forest-path','elder-house','beneath-roots']
parts[-1]['scenes']+=coda
covers=read(P/'covers/results.json',{}).get('parts',{})
selected=[];scenes=[];pending=[];descriptors=[];sequences=[]
for number,part in enumerate(parts,1):
 pid=part['id'];descriptor={k:copy.deepcopy(part[k]) for k in ['id','title','summary'] if k in part};descriptor['number']=number
 descriptor.setdefault('summary',part['title']);descriptor.update(covers.get(pid,{}));descriptors.append(descriptor)
 sequences.append({'id':pid,'title':part['title'],'purpose':part.get('purpose','Complete authored chapter with its own action and emotional conclusion.')})
 for s in part['scenes']:
  s['part']=pid;s['sequence']=pid
  prev=oldmap.get(s.get('previousID'))
  for key in ['before','beforeText','beforeNote']:s.pop(key,None)
  if prev:
   s.update(before=prev['src'],beforeText=copy.deepcopy(prev['text']),beforeNote={'en':'Exact previous revision05 scene; new chapter placement may differ.','ru':'Точная сцена предыдущей версии05; место в новой главе может отличаться.','es':'Escena exacta de la versión05; su lugar en el nuevo capítulo puede cambiar.'})
  src=s.get('src') or f"images/chapter-02-expanded/revision-06/pending/{s['id']}.png";s['src']=src
  f=B/src;new='/revision-06/' in src;sha=hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else None
  if not new:
   s['reused']=True;s['assetMode']='reuse'
   if s.get('cameraTransform',{}).get('inherited'):s['cameraObservation']=s.pop('cameraTransform')
  else:
   s['reused']=False;s['assetMode']='edit' if prev else 'new';r=reviews.get(s['id'])
   if not f.exists() or not r or r.get('src')!=src or r.get('sha256')!=sha or r.get('status')!='pass':
    s['review']='Pending generated image, creator review or matching independent full-image review.';pending.append(s['id'])
   else:s['review']=s.get('review','')+' '+r['review']
  if f.exists():
   raw=f.read_bytes();s['width']=int.from_bytes(raw[16:20],'big');s['height']=int.from_bytes(raw[20:24],'big')
  else:s.setdefault('width',1536);s.setdefault('height',1024)
  s.setdefault('alt',part['title']);s.setdefault('continuity','See part continuity plan.');s.setdefault('camera','Pending planned camera.');s.setdefault('review','Pending review.')
  selected.append({'id':s['id'],'part':pid,'src':src,'sha256':sha,'previousID':s.get('previousID'),'mode':s['assetMode'],'status':'pending' if s['id'] in pending else 'ready'})
  scenes.append(s)
refs=list({r['src']:r for r in refs if r.get('src')}.values())
out={k:copy.deepcopy(v) for k,v in old.items() if k not in ['scenes','sequences','preproduction','cover','miniature','planningDiagram']}
out.update(revision=6,title={'en':'One Day in the Forest','ru':'Один день в лесу','es':'Un día en el bosque'},summary={'en':'Papa comes home. A happy family morning leads to a forest picnic, an old friend and a secret beneath the roots. Five chapters to read together.','ru':'Папа возвращается домой. Семейное утро сменяется лесной прогулкой, обедом на полянке, встречей со старым другом и тайной под корнями. Пять глав для совместного чтения.','es':'Papá vuelve a casa. Una mañana en familia lleva a un picnic, un viejo amigo y un secreto bajo las raíces. Cinco capítulos para leer juntos.'},parts=descriptors,scenes=scenes,sequences=sequences,preproduction=refs,cover={},productionState='integration' if pending else 'review-ready')
out['editorialNotes']=['Revision06 expands the prior Elder outing into five separately readable chapters. Both family chapters precede the forest picnic.','New family interactions, forest picnic and fuller Elder conversation are user-authorized adaptation; original book numbering remains unchanged.','Before images/text map exact revision05 scene IDs. New events have no invented earlier counterpart.','Official reader and Pages unchanged. All new selected pixels require SHA-bound independent review.']
out['continuityNotes']=['Exactly four family hedgehogs at home: Papa, Mama, PinPin and infant PomPom. Baby transfers are supported and meals preserve cast/seats/props.','Ochre shoulder satchel travels from packing through picnic, Elder rest patch and afternoon return.','Picnic replaces earlier home lunch. Afternoon homecoming has no second lunch or nightfall.','Coordinates are illustration direction, not measured3D; hidden anatomy remains unverified.']
dump(P/'chapter.json',out);dump(P/'selected-images.json',{'status':out['productionState'],'pending':pending,'selected':selected});dump(P/'shot-plan.json',{'revision':6,'parts':parts});dump(P/'translations.json',{s['id']:s['text'] for s in scenes})
(P/'dialogue_EN.md').write_text('# Five chapters — English\n\n'+'\n\n'.join('## '+part['title']['en']+'\n\n'+'\n\n'.join(s['id']+'\n\n'+' '.join(s['text']['en']) for s in scenes if s['part']==part['id']) for part in parts)+'\n')
print(json.dumps({'scenes':len(scenes),'parts':[{p['id']:sum(s['part']==p['id'] for s in scenes)} for p in parts],'pending':len(pending)}))
