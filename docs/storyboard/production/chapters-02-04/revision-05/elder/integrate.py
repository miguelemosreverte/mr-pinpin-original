#!/usr/bin/env python3
"""Assemble explicit r5 lane selections; preserve r4 comparisons and source attribution."""
import copy,hashlib,json,pathlib,collections
P=pathlib.Path(__file__).resolve().parent
B=next(p for p in P.parents if p.name=='storyboard')
OLD=P.parent.parent/'revision-04'/'elder'
old=json.loads((OLD/'chapter.json').read_text())
oldmap={int(s['id'].rsplit('-',1)[1]):s for s in old['scenes']}
required={1,3,5,6,7,8,9,*range(11,26),*range(93,103),104,105,106}
order=[1,4,2,3,5,*range(6,107)]
def read(p,default):return json.loads(p.read_text()) if p.exists() else default
def info(src):
 p=B/src
 if not p.exists():return {'width':1536,'height':1024,'sha256':None}
 raw=p.read_bytes();return {'width':int.from_bytes(raw[16:20],'big'),'height':int.from_bytes(raw[20:24],'big'),'sha256':hashlib.sha256(raw).hexdigest()}
def normalize_transform(row):
 c=row['camera']; actors=row['actors']
 if isinstance(actors,dict):actors=[{'name':name,**a} for name,a in actors.items()]
 record={'schemaVersion':1,'purpose':row['purpose'],'frameId':row.get('frameId',row.get('frame')),'units':'Approximate PinPin standing heights; illustrative, not measured geometry.',
 'camera':{'positionXYZ':c['positionXYZ'],'targetXYZ':c['targetXYZ'],'height':c['height'],'framing':c['framing'],'fieldOfViewDegrees':c.get('approximateFieldOfViewDegrees',c.get('fieldOfView',c.get('approximateFieldOfView'))),'axisSide':c['axisSide']},
 'actors':[{'name':a.get('name',a.get('id')),'positionXYZ':a['positionXYZ'],'bodyFacingTarget':a.get('bodyFacingTarget',a.get('bodyFacing')),'headFacingTarget':a.get('headFacingTarget',a.get('headFacing')),'eyeTarget':a['eyeTarget'],'pose':a['pose'],'limbsContactSupport':a.get('limbsContactSupport',a.get('contacts')),'visibility':a['visibility']} for a in actors],
 'staticLandmarks':row.get('staticLandmarks',row.get('landmarks')),
 'objectStates':row.get('objectStates',row.get('state',{'before':row.get('objectStateBefore'),'after':row.get('objectStateAfter')})),
 'transition':row.get('transition',{'previousAction':row.get('previousAction'),'nextAction':row.get('nextAction'),'reasonForShotChange':row.get('reasonForShotChange')})}
 for key in ['objectStates','transition']:
  if isinstance(record[key],str):record[key]={'description':record[key]}
 assert isinstance(record['camera']['fieldOfViewDegrees'],(int,float)),row
 for a in record['actors']:
  assert all(a.get(k) for k in ['name','bodyFacingTarget','headFacingTarget','eyeTarget','pose','limbsContactSupport','visibility']),a
  assert len(a['positionXYZ'])==3,a
 return record
selections={};transforms={}
for lane in ['opening','outward','return']:
 result=read(P/lane/'results.json',{})
 for row in result.get('selected',result.get('selections',result.get('scenes',[]))):
  if row.get('status','ready') in ('rejected','pending','superseded'):continue
  n=row['previousNumber'];assert n not in selections,n;selections[n]=row
 cp=read(P/lane/'camera-plan.json',{})
 for row in cp.get('scenes',cp.get('shots',[])):transforms[row['previousNumber']]=normalize_transform(row)
reviews={r['previousNumber']:r for r in read(P/'root-reviews.json',{}).get('selected',[])}
changes=read(P/'text-amendments.json',{})
out=copy.deepcopy(old);out['scenes']=[]
out['editorialNotes']=[
'Fifth proposal: approved Papa/Scooby style, character-specific camera/eyeline plans and deliberate shot variation. Same continuous family visit, 106 images.',
'Opening order now shows PinPin at the window before the closer Papa reveal and dismount. Before comparisons map exact revision04 source IDs, not page positions.',
'Camera/actor transforms are authored illustration directions, not measured3D geometry. Inherited images retain observational descriptions; no fabricated camera coordinates.',
'All new selected illustrations require creator inspection and a root full-image review matching their SHA. Old character/contact plates used only for their documented role.',
'Local draft for user review; official reader and GitHub Pages unchanged.']
out['continuityNotes']=copy.deepcopy(old['continuityNotes'])
out['continuityNotes'].append('Warm cream Papa eye surrounds/readable hazel irises and soft animated Scooby design are user-approved. Preserve adult/child scale and each scene’s actual gaze target.')
out['preproduction']=[copy.deepcopy(x) for x in old['preproduction'] if x['id'] not in ('papa-cast-v1','family-scale-v3','scooby-approved-v2')]
for x in out['preproduction']:
 if x['id'].startswith(('riding-','meal-seating')):x['description']+=' Geometry/contact authority only; new approved Papa/Scooby style overrides old character materials.'
for id,title,src,description in [
 ('family-style-v3','Family scale and approved style','images/chapter-02-expanded/revision-05/preproduction/family-style-v3.png','Reviewed shared family identity/scale: Papa, Mama holding infant PomPom, PinPin and Scooby. Story gaze must be directed separately.'),
 ('papa-style-v1','Papa isolated identity','images/chapter-02-expanded/revision-05/preproduction/papa-style-v1.png','Bright cream adult hedgehog face and readable hazel eyes. Identity only; dark vignette is not scene lighting authority.'),
 ('papa-scooby-approved-style','Approved Papa and Scooby style','images/chapter-02-expanded/revision-04/style-tests/papa-scooby-style-study-v2.png','User-approved softer character design and attentive shared study; individual scene geometry/scale comes from its own plan.')]:
 out['preproduction'].append({'id':id,'title':title,'src':src,'description':description,'width':1536,'height':1024})
selected=[];pending=[];plan=[]
for n in order:
 earlier=oldmap[n];s=copy.deepcopy(earlier);s['id']=f'elder-r5-{n:03d}'
 s.update(before=earlier['src'],beforeText=copy.deepcopy(earlier['text']),beforeNote={'en':f'Exact revision04 scene {n:03d}; page order may differ in this proposal.','ru':f'Точная сцена {n:03d} версии04; порядок страниц в предложении может отличаться.','es':f'Escena exacta {n:03d} de la versión04; el orden puede cambiar en esta propuesta.'})
 row=selections.get(n);mode='reuse';review=earlier['review'];ind='Prior reviews apply to unchanged pixels; final ordered review is a separate gate.'
 if n==2:
  s['src']='images/chapter-02-expanded/revision-04/style-tests/scene-002-style-v1.png';mode='edit';review='User-approved style correction: lighter Papa face/hazel eyes, softer Scooby materials, reciprocal attention. Root and independent full-image reviews recorded in revision04/style-correction.';ind='User approved after root/independent full-image review.'
  s['alt']={'en':'Papa sits securely on Scooby beside the garden stone; they share an attentive glance.','ru':'Папа сидит на спине Скуби у садового камня; они внимательно смотрят друг на друга.','es':'Papá está sentado sobre Scooby junto a la piedra del jardín; se miran con atención.'}
 if n in required:
  mode='edit';s['src']=row['src'] if row else f'images/chapter-02-expanded/revision-05/scenes/scene-{n:03d}-v1.png'
  if row:
   s['alt']=row['alt'];review=row['review'];cam=row.get('camera');s['camera']=cam if isinstance(cam,str) else transforms[n]['camera']['framing']
  root=reviews.get(n);meta=info(s['src'])
  if not row or not root or root['src']!=s['src'] or root['sha256']!=meta['sha256'] or root['status']!='pass':
   pending.append(n);review='Pending generated image, creator review or matching root independent full-image review.'
  else:ind=root['review'];review=review+' '+ind
  s['cameraTransform']=transforms.get(n,{})
 if str(n) in changes:s.update(copy.deepcopy(changes[str(n)]))
 s.update(review=review,reused=mode=='reuse',assetMode=mode)
 meta=info(s['src']);s.update(width=meta['width'],height=meta['height']);out['scenes'].append(s)
 selected.append({'id':s['id'],'previousNumber':n,'src':s['src'],'mode':mode,**meta,'review':review,'independentReview':ind,'status':'pending' if n in pending else 'ready','provenance':str(pathlib.Path(s['src']).with_suffix('.json'))})
 plan.append({'id':s['id'],'previousNumber':n,'previousID':earlier['id'],'sequence':s['sequence'],'purpose':transforms.get(n,{}).get('purpose','Retain reviewed story beat'), 'cameraRecord':transforms.get(n,{'mode':'observed-inherited','framing':s['camera'],'note':'No exact numeric camera/actor transforms invented for existing pixels.'}), 'selection':selected[-1], 'text':s['text'],'continuity':s['continuity']})
out['productionState']='integration' if pending else 'review-ready'
(P/'chapter.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
(P/'selected-images.json').write_text(json.dumps({'status':'integration' if pending else 'complete','pending':pending,'counts':dict(collections.Counter(x['mode'] for x in selected)),'selected':selected},ensure_ascii=False,indent=2)+'\n')
(P/'shot-plan.json').write_text(json.dumps({'revision':5,'status':out['productionState'],'scenes':plan},ensure_ascii=False,indent=2)+'\n')
(P/'translations.json').write_text(json.dumps({s['id']:s['text'] for s in out['scenes']},ensure_ascii=False,indent=2)+'\n')
(P/'dialogue_EN.md').write_text('# Elder revision05 — English\n\n'+'\n\n'.join(f"{i+1:03d} · {s['id']}\n\n"+'\n\n'.join(s['text']['en']) for i,s in enumerate(out['scenes']))+'\n')
print(json.dumps({'scenes':len(selected),'pending':pending,'counts':dict(collections.Counter(x['mode'] for x in selected))}))
