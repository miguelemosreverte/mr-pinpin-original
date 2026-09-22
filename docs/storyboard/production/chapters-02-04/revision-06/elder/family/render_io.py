import json,sys,hashlib,shutil,struct
from pathlib import Path
from datetime import datetime,timezone
D=Path(__file__).parent;B=D.parents[4];I=B/'images/chapter-02-expanded/revision-06/family';I.mkdir(parents=True,exist_ok=True)
def now():return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
def hash(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(p,j):p.write_text(json.dumps(j,ensure_ascii=False,indent=2))
cmd=sys.argv[1]
if cmd=='prepare':
 slug=sys.argv[2];v=int(sys.argv[3]) if len(sys.argv)>3 else 1
 if (I/f'{slug}-v{v}.png').exists():raise SystemExit(f'Refusing existing output {slug}-v{v}; choose a new unused version.')
 plan=json.loads((D/'story-plan.json').read_text());scenes=[s for p in plan['parts'] for s in p['scenes']]+plan['coda'];s=next((s for s in scenes if s.get('slug')==slug),None)
 refs=[('images/chapter-02-expanded/revision-03/home-edits/home-51-v1.png','Sole rendering authority; never import Elder, glasses or location'),('images/chapter-02-expanded/revision-05/preproduction/family-style-v3.png','Exact four hedgehog identities/relative scale; no dog inside'),('images/chapter-02-expanded/revision-05/scenes/scene-006-v1.png','Kitchen geometry, fixed meal seats and tableware; pose changes per requested shot')]
 if s and s.get('location')=='H':refs[2]=('images/chapter-02-expanded/revision-05/scenes/scene-005-v3.png','Exterior house/identity and relative scale; requested new action')
 refs.append(('images/chapter-02-expanded/revision-05/preproduction/papa-style-v1.png','Isolated Papa mature hedgehog identity only; ignore dark studio background and lighting'))
 base='Use case: illustration-story. ONE landscape 1536x1024 image for a children’s picturebook, no text/border/panels.\nREFERENCE ROLES: 1 finished Elder scene controls dimensional animated-storybook rendering ONLY; no glasses/elder/imported room. 2 acceptedfamily controls identity and approximate scale. 3 establishedscene controls room geometry and props, not camera. Soft designed fur/quills, roundedexpressivefaces, warmfilledcreamfaces, readableirises, neverphotographic/PBR/blackbutton eyes. Papa mature broad adult HEDGEHOG creamface/hazeliris/brown-greyquills,no glasses. Mama copperquilledadult, PinPin smallchestnutchild, PomPom tinyinfant. Exactlythese FOUR hedgehogs, no duplicates. Adult1.6childheight infant0.5child. No clothing.\n'
 if s:
  action=s['camera'];trans=s['cameraTransform'];refs_extra=[]
  if slug in ['bread-helper','bread-table','baby-back']:
   action+=' PREBREAKFAST: table MUST be entirely bare except the single breadplate only once PinPin places it. NO cups/bowls/teapot/food yet. NO toys/blocks onfloor. Bread fromcounteronly. Reference mealprops must NOT be copied.'
   refs[2]=('images/chapter-02-expanded/revision-06/family/found-you-v2.png','Accepted emptytable premeal room and floorfamily placements; change action as requested')
  if slug not in ['handoff','papa-cradle'] and (I/'family-contact-study-v1.png').exists():refs_extra.append(('images/chapter-02-expanded/revision-06/family/family-contact-study-v1.png','Accepted infant/support/floor environment study; do not copy its arrangement unless requested'))
  if s.get('previousID') in ['elder-r5-012','elder-r5-013','elder-r5-015']:
   old=json.loads((D.parents[2]/'revision-05/elder/chapter.json').read_text());prev=next(x for x in old['scenes'] if x['id']==s['previousID']);refs_extra.append((prev['src'],'Exact edit target action/contacts/camera; add satchel without changing anatomy'))
  refs+=refs_extra
  if slug in ['bag-ready','wrap-bread','water-packed','goodbye-hug','bag-home','boarding-help','boarding-seat','departure']:
   refs=[refs[0],refs[1],refs[2],('images/chapter-02-expanded/revision-06/forest/preproduction/satchel-contact-v2.png','Accepted ochre linen satchel geometry and ridercontact; no extra dogs insidehouse')]+([refs_extra[-1]] if s.get('previousID') in ['elder-r5-012','elder-r5-013','elder-r5-015'] else [refs[3]])
   action+=' SATCHEL exactlyreference4 softochrelinen singleflap, broadstrap leftshoulder toRIGHT hip. No basket or leathermodernbackpack. Contents creamclothbread2apples smallcorkflask woodcupnesteddogbowl. Table clearedallbreakfastbowls/cups. NO dogindoors. Forcodaemptybag nofood.'
 else:
  action='PREPRODUCTION CONTACT / ENVIRONMENT STUDY, one coherent scene not panels: inside kitchen left-floor-rug area, Papa seated on rug right with both forearms cupped below infant torso and bottom while Mama seated left keeps one paw beneath infant during handoff and other on rug. Tiny infant between them in continuous visible support. PinPin child sits foreground observing. Exactly4hedgehogs,no dog. Two arms eachadult,2feet each, infant2arms2legs. Same roundtable beyond right, cupboardsleft stovefar-right greenrounddoorcenter rear windowsflank. No food laid yet. Establish usable open rug area left of table and baby proportions.';trans={'purpose':'Actual infant handoff/contact and new floor play zone layout reference','frameId':'K','camera':{'positionXYZ':[-4,-4,1.3],'targetXYZ':[-2,-.7,.7],'height':1.3,'fieldOfViewDegrees':55,'framing':'wide floorlevel contact reference','axisSide':'negativeY'},'actors':[]}
 prompt=base+'ALL INPUT ROLES: '+json.dumps([{'image':i+1,'role':role} for i,(_,role) in enumerate(refs)])+'\nSHOT: '+action+'\nKITCHEN RULES ifinside: greenrounddoorcenterrear hingesRIGHT knobLEFT, cupboardsLEFT stoveRIGHT, roundwoodtable. For breakfastfixed seats MamaLEFT holdinginfant, PapaFAR-RIGHT, childNEAR-RIGHT, exactly3speckledbeigecups3porridgebowls1communalbowlbreadfrontleftbrownteapot. Allfourfamilyfaces must be visible in mealframes; no crops that omitMama/baby. For floor/preparationframes follow explicit changed state rather than forcing seatedmeal. DOG staysoutside. For exteriorScooby softanimatedbrownbrindle/creamgrey muzzle/whitebib/foldedears/curledtail, dogshoulder2.7childheight. Meaningful directedpupils, no camera-facing posedportraits.\nCAMERA/ACTOR ART DIRECTION (notlabels): '+json.dumps(trans,ensure_ascii=False)+'.\nNo extra limbs, paws must visiblyattach. Infant neverfloats. Morning warmdaylight withsoftfill, no darkmask, no captions.'
 if v>1:
  refs=[]
  refs.append((f'images/chapter-02-expanded/revision-06/family/{slug}-v{v-1}.png','Exact edit target; preserve all actors/camera/lighting and change only stated correction'))
  prompt='Use case: precise-object-edit. LAST INPUT IMAGE IS EXACT EDIT TARGET. Preserve actors, expressions, anatomy, camera framing, room geometry, lighting and all other details. Change ONLY this: '+sys.argv[4]+'\nSupporting reference roles: '+json.dumps([{'image':i+1,'role':role} for i,(_,role) in enumerate(refs)])+'\nNo text. Landscape1536x1024.'
 req={'id':f'{slug}-v{v}','slug':slug,'prompt':prompt,'references':[{'path':str(B/r),'role':role,'sha256':hash(B/r)} for r,role in refs],'tool':'built-in image_gen','plannedAt':now(),'output':f'images/chapter-02-expanded/revision-06/family/{slug}-v{v}.png','cameraTransform':trans,'status':'planned'}
 write(I/f'{slug}-v{v}.request.json',req);print(json.dumps({'prompt':prompt,'referenced_image_paths':[r['path'] for r in req['references']],'requestPath':str(I/f'{slug}-v{v}.request.json')}))
elif cmd=='finish':
 a=json.loads(sys.argv[2]);reqp=Path(a['requestPath']);j=json.loads(reqp.read_text());out=B/j['output'];
 if out.exists():raise SystemExit(f'Refusing to overwrite existing output {out}')
 shutil.copy2(a['generatedFile'],out);data=out.read_bytes();w,h=struct.unpack('>II',data[16:24]);j.update(a,width=w,height=h,sha256=hash(out),status='generated-awaiting-actual-review');write(out.with_suffix('.json'),j);out.with_suffix('.md').write_text('# '+j['id']+'\n\nBuilt-in image_gen.\n\n'+j['prompt']+'\n\nGenerated: '+a['startedAt']+' to '+a['finishedAt']+'\n');print(str(out))
elif cmd=='review':
 slug=sys.argv[2];v=int(sys.argv[3]);note=sys.argv[4];p=I/f'{slug}-v{v}.json';j=json.loads(p.read_text());j.update(review='Creator actual full-image '+note,status='creator-reviewed' if note.startswith('PASS') else 'rejected');write(p,j)
 if note.startswith('PASS'):
  plan=json.loads((D/'story-plan.json').read_text());oldres=json.loads((D/'results.json').read_text()) if (D/'results.json').exists() else plan
  for s in [s for x in oldres['parts'] for s in x['scenes']]+oldres['coda']:
   if s.get('slug')==slug:s.update(src=j['output'],width=j['width'],height=j['height'],review=j['review'],sha256=j['sha256'])
  oldres['status']='in-progress';write(D/'results.json',oldres)
 print(j['status'])
