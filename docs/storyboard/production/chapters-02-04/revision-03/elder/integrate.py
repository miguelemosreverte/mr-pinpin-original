#!/usr/bin/env python3
"""Assemble revision03 from explicit selections; never alter earlier proposals."""
import copy,json,pathlib,hashlib,struct,collections
P=pathlib.Path(__file__).resolve().parent
B=next(x for x in P.parents if x.name=='storyboard')
LEGACY=B.parents[2]/'mr-pinpin-original'/'docs'/'storyboard'
old=json.loads((P.parent.parent/'revision-02'/'elder'/'chapter.json').read_text())
plan=json.loads((P/'shot-plan.json').read_text())
tr=json.loads((P/'translations.json').read_text())
alts=json.loads((P/'alt-new.json').read_text())
A='images/chapter-02-expanded/revision-03'
versions={32:3,33:2,34:3,36:2,65:2,66:6,67:2,69:5,70:2}
edits={13:'home-13',14:'home-14',16:'home-16',56:'cave-37',64:'cave-45',76:'home-50',77:'home-51'}
new=set(range(17,41))|set(range(65,76))|{43,44}
returns=json.loads((P/'return-results.json').read_text())
returnmap={x['id']:x['selected'] for x in returns['selected']}
discovery=json.loads((P/'discovery-results.json').read_text())
returnmap.update({x['id']:x['selected'] for x in discovery['selected']})
independent={x['id']:x.get('independentReview','') for x in returns['selected']+discovery['selected']}
def asset(src):
 f=B/src
 if not f.exists():f=LEGACY/src
 return f
def metadata(src):
 f=asset(src).with_suffix('.json')
 return json.loads(f.read_text()) if f.exists() else {}
def info(src):
 f=asset(src)
 if not f.exists():return {'width':1536,'height':1024,'sha256':None}
 raw=f.read_bytes()
 return {'width':int.from_bytes(raw[16:20],'big'),'height':int.from_bytes(raw[20:24],'big'),'sha256':hashlib.sha256(raw).hexdigest()}
out={k:copy.deepcopy(old[k]) for k in ['schemaVersion','id','sourceChapter','status','title','cover']}
out.update(revision=3,productionState='integration',planningDiagram='space-plan.svg',summary={
'en':'PinPin studies at the Elder’s home, discovers a hidden root passage and a human sanctuary, and returns with new questions about life, protection and his own gift.',
'ru':'Пин-Пин занимается у Старейшины, находит тайный проход и святилище людей и возвращается с вопросами о жизни, защите и своём даре.',
'es':'PinPin estudia en casa del anciano, descubre un pasadizo oculto y un santuario humano, y regresa con preguntas sobre la vida, la protección y su don.'})
out['preproduction']=[copy.deepcopy(x) for x in old['preproduction'] if x['id'] in ['cast','environment','murals-v1','cave-south-v1','gaze-shared-v2']]
out['preproduction'] += [
{'id':n,'title':title,'src':A+'/preproduction/'+n+'.png','description':desc}
for n,title,desc in [
('home-root-nook-v1','Home and concealed root nook','Furnished home; low northeast root gap replaces formal door. Small mat separate from fixed central rug.'),
('root-opening-states-v1','Concealed and cleared states','Small mat rolls southwest, loose soil/leaves move east, light stool west; structural roots stay fixed. Study labels are not story art.'),
('root-fit-v1','Child and Elder body fit','Qualitative crouched clearance; depicted outward pose is not entry direction authority.'),
('passage-route-v3','Connected natural route','Schematic continuous gentle floor from home to cave, no stairs or drops. Simplified rooms not furniture/mural authority.'),
('cave-root-arrival-v1','Sanctuary and natural arrival','West mother, north defender and bench, east light, southwest daylight shaft, northeast natural rock/root mouth. Human-scale cave ceiling.')
]]
seq=[
('arrival',1,7,'The path to the Elder','Дорога к Старейшине','El camino al anciano'),
('small-help',8,10,'Room to grow','Место для роста','Espacio para crecer'),
('study',11,19,'Books and a little rest','Книги и короткий отдых','Libros y un pequeño descanso'),
('discovery',20,31,'The draft between the roots','Сквозняк между корнями','La corriente entre las raíces'),
('passage',32,40,'A hidden place','Тайное место','Un lugar escondido'),
('sacred-pictures',41,64,'Questions beside the pictures','Вопросы у картин','Preguntas junto a las pinturas'),
('return',65,77,'The same way home','Тем же путём домой','El mismo camino de vuelta'),
('farewell',78,83,'Bring your questions','Приноси свои вопросы','Trae tus preguntas')]
out['sequences']=[{'id':i,'title':{'en':en,'ru':ru,'es':es},'purpose':'Continuous first mentor visit; physical actions, dialogue and object states follow the detailed shot plan.'} for i,l,h,en,ru,es in seq]
out['scenes']=[];selected=[];pending=[]
for s in plan['scenes']:
 n=s['order'];oldn=s.get('revision02Scene');earlier=old['scenes'][oldn-1] if oldn else None
 if n==12:src=A+'/preproduction/home-root-nook-v1.png';mode='preproduction'
 elif n in edits:src=A+'/home-edits/'+edits[n]+'-v1.png';mode='edit'
 elif n in new:src=A+f'/scenes/scene-{n:02d}-v{versions.get(n,1)}.png';mode='new'
 else:src=s['selectedSrc'];mode='reuse'
 if s['id'] in returnmap:src=returnmap[s['id']]
 m=metadata(src);inf=info(src);review=m.get('review') if mode!='reuse' else 'Retained compatible revision02 image after full-image review; revised narration checked against its visible action and route geography. Original full-image evidence remains in revision02 records; see revision03 source-adaptation-map.md for retention audit.'
 if n in returns.get('pending',[]) or not asset(src).exists() or not review or review.lower().startswith(('rejected','superseded','pending')):
  pending.append(n);review='Pending generation or accepted full-image review.'
 alt=alts.get(s['id']) or copy.deepcopy(earlier['alt'])
 camera=s.get('camera') or (('H1 low study desk' if n<=20 else 'H0 room level' if n<=22 else 'N0/N1 low root nook' if n<=31 else 'P1 enclosed natural passage' if n<=34 else 'C0/C1 solitary sanctuary' if n<=40 else 'C2 mural dialogue' if n<=64 else 'P2 same-route return' if n<=69 else 'N1/H0 restoration') if mode!='reuse' else earlier['camera'])
 if mode!='reuse' and m.get('prompt'):
  s['actualPromptSidecar']=str(pathlib.Path(src).with_suffix('.json'));s['cameraAndBlocking']=m['prompt'];s['references']=m.get('references',[])
 s['camera']=camera
 source=copy.deepcopy(earlier['source']) if s['sourceKind']=='source-adapted' and earlier and earlier['source']['kind'] in ['original','expanded'] else {'kind':'new','blocks':[],'note':'User-authorized new adaptation. Hidden root route, human sanctuary and sacred deity conversation are not original chapter02 canon. Later books/artifacts, light/winter and communal protection supply thematic support only; see source-adaptation-map.md.'}
 if n==81:source={'kind':'expanded','blocks':[13],'note':'Original departure action retained; hidden-place reflection is new commissioned adaptation.'}
 if n>=82:source={'kind':'silent','blocks':earlier['source']['blocks'],'note':'Retained silent leaf-window ending from the original first-visit sequence.'}
 scene={'id':s['id'],'sequence':next(i for i,l,h,*_ in seq if l<=n<=h),'src':src,'width':inf['width'],'height':inf['height'],'alt':alt,'text':{lang:([text] if text else []) for lang,text in {'en':s['dialogue_en'],**tr[s['id']]}.items()},'source':source,'camera':camera,'continuity':s.get('continuity','Same first visit; '+('PinPin alone until Elder appears in40. ' if 20<=n<=40 else '')+'Follow the root-route/prop states in bible.md; visible selected image review below.'),'review':review,'reused':mode=='reuse','assetMode':mode}
 if earlier:
  scene.update(before=earlier['src'],beforeText=earlier['text'],beforeNote={'en':'Revision02 passage context; retained or replaced as indicated. New inserted actions have no earlier counterpart.','ru':'Контекст эпизода версии02: рисунок сохранён или заменён. У новых вставок нет прежнего аналога.','es':'Contexto del pasaje de la versión02: imagen conservada o sustituida. Las acciones nuevas no tienen equivalente anterior.'})
 out['scenes'].append(scene);s['selectedSrc']=src;s['assetMode']=mode
 selected.append({'id':s['id'],'src':src,'mode':mode,**inf,'review':review,'provenance':str(pathlib.Path(src).with_suffix('.json')),'independentReview':independent.get(s['id'],'See ROOT-REVIEW.md and lane independent review for current selected-image gate.')})
out['productionState']='review-ready' if not pending else 'integration'
out['editorialNotes']=[
'Third proposal:83 visual beats. Retained sacred paintings and compatible conversations; new solo discovery and complete same-route return.',
'Human sanctuary, humans portrayed as gods, prayer and forest-protector community are explicitly commissioned new worldbuilding, not recovered original chapter02.',
'Pregnant fertility goddess, male war defender, threatened homes and communal work are explored through concrete child-led questions.',
'No explicit death/burial discussion; later Elder/Tarin identity reveal remains concealed.',
'Before images show actual revision02 passage context where available; inserted actions with no previous counterpart have no invented before image.',
'Planning geometry is qualitative, not a measured reconstruction. Detailed exact prompts, reference hashes, output hashes and reviews accompany all newly generated assets.',
'Status remains proposed. No official chapter changes, commit or publication. Final root browser and ordered review are recorded separately.'
]
out['continuityNotes']=[
'First visit the day after the lake; ancestral golden quill remains a future learning thread; next dawn hilltop lesson is promised, not shown.',
'Staff parked outside left throughout; rescued plant and moved twig stay right on return.',
'Home study → unplanned doze → draft investigation → small mat/stool/loose soil → solo natural passage → human sacred cave → Elder follows → same natural passage back.',
'Opening states persist: stool west, rolled small mat southwest, soil/leaves east.73 tidies earth;74 unrolls small mat;75 restores stool.76/77 use restored home state.',
'Large central rug stays fixed. No selected formal basement door or staircase. Cave natural entrance at northeast, daylight shaft southwest; fixed wall lamps and human-painted animal community frieze.',
'Ordinary restful night is distinguished from the destructive cold storm depicted threatening homes.'
]
(P/'chapter.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
(P/'selected-images.json').write_text(json.dumps({'status':'complete' if not pending else 'integration','pending':pending,'counts':dict(collections.Counter(x['mode'] for x in selected)),'selected':selected},ensure_ascii=False,indent=2)+'\n')
plan['status']='All selected assets integrated; final review gates separately recorded' if not pending else 'English story gate passed; integration in progress'
(P/'shot-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'scenes':len(out['scenes']),'pending':pending,'counts':dict(collections.Counter(x['mode'] for x in selected))}))
