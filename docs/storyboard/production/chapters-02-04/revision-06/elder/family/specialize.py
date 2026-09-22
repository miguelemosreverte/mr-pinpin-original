import json
from pathlib import Path
D=Path(__file__).parent;p=json.loads((D/'story-plan.json').read_text());allsc=[s for x in p['parts'] for s in x['scenes']]+p['coda']
def actor(n,pos,body,head,eye,pose,support,vis='visible'):return dict(name=n,positionXYZ=pos,bodyFacingTarget=body,headFacingTarget=head,eyeTarget=eye,pose=pose,limbsContactSupport=support,visibility=vis)
for idx,s in enumerate(allsc):
 if s['reused']:continue
 slug=s['slug'];t=s['cameraTransform'];loc=s['location'];t['transition']['previousAction']=allsc[idx-1]['text']['en'][0] if idx else 'Previous lake adventure';t['transition']['nextAction']=allsc[idx+1]['text']['en'][0] if idx+1<len(allsc) else 'End of cycle'
 table=slug in ['cups-ready','lake-news','circle-telling','everyone-water','mama-bread','little-spill','wipe-together']
 floor=slug in ['floor-settle','peekaboo','found-you','tower-build','tower-topple','build-again','ready-visit','tell-mama','home-together']
 pack=slug in ['bag-ready','wrap-bread','water-packed','bag-home']
 t['actors']=[]
 if table:
  cam={'cups-ready':[2.5,-4,2.7],'lake-news':[-2.2,-4.2,1.7],'circle-telling':[2.7,-3.4,1.15],'everyone-water':[-2.8,-2.8,1.55],'mama-bread':[0,-4.3,1.5],'little-spill':[1.1,-3,2.15],'wipe-together':[1.1,-3,2.15]}[slug]
  eyes={'Papa':'PinPin','Mama':'PinPin','PinPin':'Papa','PomPom':'Mama'}
  if slug in ['cups-ready','little-spill','wipe-together']:eyes={n:'childCup' for n in eyes}
  if slug=='mama-bread':eyes={'Papa':'PinPin','Mama':'PinPin','PinPin':'bread','PomPom':'Mama'}
  for n,pos in [('Mama',[-1.2,0,0]),('Papa',[.7,.8,0]),('PinPin',[.9,-.8,0]),('PomPom',[-1.1,0,.7])]:
   sup='Mama forearm and lap support infant; infant arms free' if n=='PomPom' else 'Mama seated on chair, one forearm securely beneath infant and other free for stated action' if n=='Mama' else 'Seated on fixed chair; two forepaws perform stated action; hindfeet supported on seat/footrest'
   t['actors'].append(actor(n,pos,'table',eyes[n],eyes[n],'Seated at fixed meal place; '+s['camera'],sup))
  t['staticLandmarks'].update(childCup=[.75,-.65,.85],bread=[-.5,-.5,.85],PapaCup=[.6,.55,.85],MamaCup=[-.85,0,.85],servingBowl=[0,0,.85]);t['objectStates']['before']='Three plain pottery cups, three individual porridge bowls, one communal serving bowl, bread platter front-left, teapot by Papa. Mama always holds infant left.';t['objectStates']['after']=s['camera']
 elif floor:
  cam={'floor-settle':[-3.8,-4.8,1.4],'peekaboo':[-3.2,-2.3,.9],'found-you':[-4,-3,.9],'tower-build':[-3.8,-3.7,.75],'tower-topple':[-3.5,-3.8,1.55],'build-again':[-3.5,-3.4,.9],'ready-visit':[-3.8,-4.3,1.2],'tell-mama':[-3.8,-4.3,1.2],'home-together':[-4.8,-5,1.6]}[slug]
  babypapa=slug in ['floor-settle','peekaboo','found-you','home-together'];holder='Papa' if babypapa else 'Mama';handoff=slug=='tell-mama'
  poses={'Papa':[-2,-.7,0],'Mama':[-3,.5,0],'PinPin':[-1.1,-1.5,0],'PomPom':[-2,-.75,.6] if babypapa else [-3,.4,.6]}
  for n,pos in poses.items():
   eye='PinPin' if n in ['Papa','Mama','PomPom'] else 'PomPom';eye='woodBlocks' if slug in ['tower-build','tower-topple'] else eye
   if slug=='ready-visit':eye={'Papa':'Mama','Mama':'Papa','PinPin':'Papa','PomPom':'woodBlocks'}[n]
   support=(holder+' lap and forearm' if n=='PomPom' else 'Seated haunches on woven rug, two hindfeet on floor; two forearms '+('securely support infant' if n==holder else 'perform described action'))
   if handoff and n in ['Papa','Mama','PomPom']:support='Infant held continuously: Mama supporting underside until Papa two forearms cradle torso and bottom; exactly two arms per adult'
   pose='Seated at floor play area'
   if slug in ['floor-settle','peekaboo','found-you'] and n=='Mama':pos=[-3,1,0];pose='standing at counter preparing bread';support='Both hindfeet on floor; two paws at bread platter';eye='PinPin' if slug=='found-you' else 'bread'
   t['actors'].append(actor(n,pos,'playRug',eye,eye,pose,support))
  t['staticLandmarks'].update(woodBlocks=[-1.8,-1.4,.1],bread=[-3,1,.85]);t['objectStates']['before']='Floor play area left of table. Infant holder explicitly specified; three wooden blocks only when block play sequence begins.';t['objectStates']['after']=s['camera']
 elif loc=='H':
  cam=[2,-5,1.25] if slug in ['handoff','papa-cradle'] else [3,-5,1.5]
  papa=[.6,-1,0];mama=[-.6,-.5,0];child=[0,-2,0];baby=[.3,-1,.9]
  t['staticLandmarks']={'threshold':[0,0,0],'stone':[-2,-2,.35],'dogBowl':[2,-2,0],'path':[0,-6,0]}
  boarding=slug in ['boarding-help','boarding-seat','departure']
  if boarding:papa=[-2.2,-2.2,0];mama=[0,.1,0];child=[-1.8,-2,1.3];baby=[0,.1,.9]
  for n,pos in [('Papa',papa),('Mama',mama),('PinPin',child),('PomPom',baby),('Scooby',[-2,-2,0])]:
   eye={'Papa':'PomPom','Mama':'PomPom','PinPin':'PomPom','PomPom':'Papa','Scooby':'Papa'}[n] if not boarding else {'Papa':'PinPin','Mama':'PinPin','PinPin':'Papa','PomPom':'PinPin','Scooby':'path'}[n]
   support='Both hindfeet on ground; two arms perform stated action'
   if n=='PomPom':support='Mama forearm and chest' if boarding else 'Papa two forearms cradle infant bottom and torso; during handoff Mama supporting until transfer complete'
   if n=='Scooby':support='Four anatomically attached legs planted or natural gait, no saddle/reins'
   if n=='Papa' and not boarding:support='Two forearms under infant bottom and torso, no extra waving arm'
   if n=='Papa' and boarding:support='Support child lower torso with one forearm; other braces dog during mounted departure; ochre bag hangs securely opposite child'
   if n=='PinPin' and boarding:support='Mountingstone then straddled dog behindwithers; never both feet on same top side'
   t['actors'].append(actor(n,pos,'family group',eye,eye,s['camera'],support))
 else:
  cam=[2.7,-4,1.6] if pack else [-3.8,-3.5,1.3]
  for n,pos in [('Papa',[.7,.8,0]),('Mama',[-1.2,0,0]),('PinPin',[.9,-.8,0]),('PomPom',[-1.1,0,.7])]:
   eye='satchel' if pack else 'bread' if slug in ['bread-helper','bread-table'] else 'PomPom' if slug=='baby-back' else 'PinPin'
   holder='Papa' if slug in ['bread-helper','bread-table'] else 'Mama'
   support=holder+' lap/forearm' if n=='PomPom' else 'Two arms only; '+('one forearm continuously beneath infant torso/bottom' if n==holder else 'two paws perform described action')+'; both hindfeet or seated haunches visibly supported'
   t['actors'].append(actor(n,pos,'table',eye,eye,s['camera'],support))
  t['staticLandmarks'].update(satchel=[0,0,.85],bread=[-.4,0,.85]);t['objectStates']['before']='Kitchen same geometry; meal clearing and baby transfers shown in prior beats; newpacking uses ochre satchel only.';t['objectStates']['after']=s['camera']
 if loc=='K':t['actors'].append(actor('Scooby',[-4,5,0],'garden','garden','garden','rests outside house','Four legs on ground','offscreen outside'))
 t['camera'].update(positionXYZ=cam,targetXYZ=[-1.8,-.8,.6] if floor else [0,0,.9],height=cam[2],fieldOfViewDegrees=58 if table else 50)
 s['cameraTransform']=t
p['status']='Full story and explicit camera/actor/state plan saved before requests; subject to actual image review.'
(D/'story-plan.json').write_text(json.dumps(p,ensure_ascii=False,indent=2))
(D/'REPORT.md').write_text('# Family lane revision06\n\nStory plan: parts1/2 plus afternoon coda;15+20+3images,30new and8reuse. Source lake01 read directly; revision05source adaptation map and fullbook arc read. All family interactions are new adaptation. Exact earlier scene mapping persisted.\n\nApproved style, family common-scale, meal master006 and arrivalhug005 inspected at full size. Papa mature cream face, Mama copperquills, infant0.5child, PinPin child. Kitchen geometry fixed: Mama left, Papa far-right, child near-right; exact4family always visible during meal.\n\nStorage hold: no generation until root clears. Babyhandoff/floor staging study and forest satchel study require actual visual review before dependent story frames.\n')
print('specialized',sum(not s['reused'] for s in allsc))
