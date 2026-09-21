#!/usr/bin/env python3
"""Assemble explicit revision04 selections without altering earlier proposals.

Workers supply selected rows in *-results.json: {id, src (or selected), alt:{en,ru,es},
review, independentReview}. Pending/rejected rows are not selected. The integrator
never guesses the highest image version. New prose/alt review remains required.
"""
import collections,copy,hashlib,json,pathlib
P=pathlib.Path(__file__).resolve().parent
B=next(p for p in P.parents if p.name=='storyboard')
LEGACY=B.parents[2]/'mr-pinpin-original'/'docs'/'storyboard'
old=json.loads((P.parent.parent/'revision-03/elder/chapter.json').read_text())
oldmap={s['id']:s for s in old['scenes']}
plan=json.loads((P/'shot-plan.json').read_text())
tr=json.loads((P/'translations.json').read_text())
selections={}; newprep=[]
for f in sorted(P.glob('*-results.json')):
 if f.name=='selected-images.json':continue
 x=json.loads(f.read_text())
 for row in x.get('selected',[]):
  if not isinstance(row,dict) or not row.get('id'):continue
  if row.get('status','').lower() in ('pending','rejected','superseded'):continue
  src=row.get('src') or row.get('selected')
  if src and isinstance(src,str):
   if row['id'] in selections and selections[row['id']].get('src',selections[row['id']].get('selected'))!=src:
    raise ValueError('Conflicting selection records for '+row['id'])
   selections[row['id']]=row
 for ref in x.get('preproduction',[]):
  if ref.get('status','') not in ('pending','rejected','superseded'):newprep.append(ref)
def asset(src,legacy=False):
 f=B/src
 if not f.exists() and legacy:f=LEGACY/src
 return f
def info(src,legacy=False):
 f=asset(src,legacy)
 if not f.exists():return {'width':1536,'height':1024,'sha256':None},{}
 raw=f.read_bytes(); assert raw.startswith(b'\x89PNG'),src
 m=json.loads(f.with_suffix('.json').read_text()) if f.with_suffix('.json').exists() else {}
 return {'width':int.from_bytes(raw[16:20],'big'),'height':int.from_bytes(raw[20:24],'big'),'sha256':hashlib.sha256(raw).hexdigest()},m
seqnames={
'morning':('Papa comes home','Папа возвращается','Papá vuelve a casa'),
'breakfast':('News at breakfast','Новости за завтраком','Noticias durante el desayuno'),
'outward-boarding':('All aboard','Пора в путь','A subir'),
'journey':('Through the morning woods','Через утренний лес','Por el bosque de la mañana'),
'arrival':('An old friend','Старый друг','Un viejo amigo'),
'outside-rest':('A sunny place to rest','Отдых на солнышке','Un descanso al sol'),
'garden-pause':('Room to grow','Место для роста','Espacio para crecer'),
'study':('Books and questions','Книги и вопросы','Libros y preguntas'),
'root-discovery':('A little draft','Маленький сквозняк','Una pequeña corriente de aire'),
'sanctuary-discovery':('Pictures under the ground','Картины под землёй','Pinturas bajo tierra'),
'sanctuary-stories':('Stories on the walls','Истории на стенах','Historias en las paredes'),
'return-through-roots':('The same way back','Обратно тем же путём','De vuelta por el mismo camino'),
'learning':('One letter at a time','По одной букве','Una letra cada vez'),
'reunion':('Papa is waiting','Папа ждёт','Papá está esperando'),
'homeward-boarding':('Time to go home','Пора домой','Hora de volver a casa'),
'homeward-journey':('The path home','Дорога домой','El camino a casa'),
'home-arrival':('Just in time','Как раз вовремя','Justo a tiempo'),
'lunch':('A story at lunch','История за обедом','Una historia durante el almuerzo')}
out={k:copy.deepcopy(old[k]) for k in ('schemaVersion','id','sourceChapter','status','title','cover')}
out.update(revision=4,productionState='integration',summary={
'en':'Papa brings PinPin to an old friend. A hidden passage leads to mysterious pictures, new questions and a wish to learn reading and writing—then home for lunch.',
'ru':'Папа везёт Пин-Пина к старому другу. Тайный проход ведёт к загадочным картинам, новым вопросам и желанию научиться читать и писать. А потом — домой обедать.',
'es':'Papá lleva a PinPin a visitar a un viejo amigo. Un pasadizo oculto conduce a pinturas misteriosas, nuevas preguntas y el deseo de aprender a leer y escribir. Después, a casa para almorzar.'})
out['preproduction']=copy.deepcopy(old['preproduction'])
out['preproduction'].append({'id':'scooby-approved-v2','title':'Scooby — approved appearance','src':'images/chapter-02-expanded/revision-04/preproduction/scooby-proposal-v2.png','description':'User-approved face/body identity. Riding scale and actual contacts require separate inspected studies.'})
for ref in newprep:
 clean={k:v for k,v in ref.items() if k in ('id','title','src','description')}
 existing=next((r for r in out['preproduction'] if r['id']==clean.get('id')),None)
 if existing is None:out['preproduction'].append(clean)
 else:existing.update({k:v for k,v in clean.items() if v})
out['sequences']=[{'id':k,'title':dict(zip(('en','ru','es'),seqnames[k])),'purpose':'Continuous family morning visit; see bible and shot plan for physical contacts, time and object states.'} for k in dict.fromkeys(s['sequence'] for s in plan['scenes'])]
out['scenes']=[];selected=[];pending=[]
for s in plan['scenes']:
 n=s['number']; earlier=oldmap.get(s.get('r3Scene')); chosen=selections.get(s['id'],s.get('selection',{}))
 mode='reuse' if earlier else 'new'
 src=chosen.get('src') or chosen.get('selected') or (earlier['src'] if earlier else f'images/chapter-02-expanded/revision-04/scenes/scene-{n:03d}-v1.png')
 if earlier and src!=earlier['src']:mode='edit'
 inf,m=info(src,mode=='reuse')
 review=chosen.get('review') or m.get('review')
 if mode=='reuse':review='Unchanged selected revision03 image; prior full-image QA retained. Revision04 ordered compatibility review is recorded separately. '+earlier['review']
 alt=chosen.get('alt') or s.get('altOverride') or (copy.deepcopy(earlier['alt']) if mode=='reuse' else None)
 valid=bool(inf['sha256'] and review and isinstance(review,str) and not review.lower().startswith(('pending','rejected','superseded')) and alt and all(alt.get(k) for k in ('en','ru','es')))
 if not valid:pending.append(n);review='Pending new image, actual full-image review or complete trilingual alt text.'
 texts={'en':s['dialogue_en'],**tr[s['id']]}
 scene={'id':s['id'],'sequence':s['sequence'],'src':src,'width':inf['width'],'height':inf['height'],'alt':alt or {'en':'Image pending.','ru':'Рисунок готовится.','es':'Imagen pendiente.'},'text':{k:[v] for k,v in texts.items()},'source':{'kind':s['sourceKind'],'blocks':s['sourceBlocks'],'note':'Original first-visit/lake context where specifically indexed; family outing, Scooby, sanctuary and literacy ending are user-authorized adaptation. See source-adaptation-map.md.'},'camera':chosen.get('camera') or s['shot'],'continuity':s['continuity'],'review':review,'reused':mode=='reuse','assetMode':mode}
 if earlier:scene.update(before=earlier['src'],beforeText=copy.deepcopy(earlier['text']),beforeNote={'en':'Exact revision03 scene and narration. New family/travel actions have no fabricated earlier image.','ru':'Точный рисунок и текст версии03. У новых семейных сцен и поездок нет выдуманного прежнего рисунка.','es':'Escena y narración exactas de la versión03. Las nuevas acciones familiares y viajes no tienen una imagen anterior inventada.'})
 out['scenes'].append(scene)
 selected.append({'id':s['id'],'src':src,'mode':mode,**inf,'review':review,'status':'ready' if valid else 'pending','provenance':str(pathlib.Path(src).with_suffix('.json')),'independentReview':chosen.get('independentReview','Prior revision03 reviews for unchanged pixels; revision04 final ordered review pending.' if mode=='reuse' else 'New image creator reviewed; root independent/final ordered review pending.')})
out['productionState']='review-ready' if not pending else 'integration'
out['editorialNotes']=[
'Fourth proposal: family-authorized daytime first visit. Original chapter02 quill-origin/dawn-training ending intentionally replaced at user request.',
'Sacred human paintings, offerings, Mother of Life, Shield Keeper and animal community frieze are commissioned adaptations. No early Elder identity reveal.',
'Comparison text and images are exact selected revision03 passages. Brand-new actions have no invented before image.',
'All proposed dimensions and contacts are artistic planning constraints, not calibrated geometry. Actual image reviews and reference provenance accompany selected generated files.',
'Local proposal only; official reader and GitHub Pages remain unchanged. Final visual/browser evidence is recorded separately.']
out['continuityNotes']=[
'Morning after lake: Papa arrives, family breakfast, Papa/PinPin ride Scooby, Papa/dog nap outside, Elder dozes inside, child explores, reunion and lunch at home.',
'Mama and infant PomPom stay home throughout. Scooby stays outdoors during both meals.',
'Child rides in front, Papa immediately behind supporting torso; crouched dog and low stone for boarding/dismount, Papa first down.',
'Natural home-root route, actual low opening, displaced/restored small mat/stool/earth and cave light/wall geometry remain unchanged from selected revision03.',
'No chosen-one/ancestral payoff, quill training or private dawn promise. PinPin asks for reading/writing; future visits include Papa.',
'Restful night distinguished from painted threatening cold storm. No explicit death/burial or abstract religious taxonomy lecture.']
(P/'chapter.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
(P/'selected-images.json').write_text(json.dumps({'status':'complete' if not pending else 'integration','pending':pending,'counts':dict(collections.Counter(s['mode'] for s in selected)),'selected':selected},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'scenes':len(out['scenes']),'pending':pending,'counts':dict(collections.Counter(s['mode'] for s in selected))}))
