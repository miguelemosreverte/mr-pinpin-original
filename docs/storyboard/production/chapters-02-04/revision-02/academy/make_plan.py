import json
from pathlib import Path
p=Path(__file__).parent
# English dialogue and concrete visual actions, not final multilingual copy.
# mode, old scene reference, sequence, action, dialogue/narration
rows=[
('new',None,'morning','Mama carries PomPom out of familiar cottage; PinPin steps onto morning path.','Morning light touched the cottage. “Ready, PinPin?” asked Mama. “Ready!”'),
('new',None,'morning','Wide family walking through fern-lined morning mist, baby supported at Mama chest.','Mist drifted between the trees. PomPom peeped over Mama’s arm. “There’s the path,” said PinPin.'),
('new',None,'morning','Low dew-leaf view with PinPin observing and Mama/PomPom supported behind.','“Look! Tiny drops!” “Dew,” said Mama. “The grass is wet this morning.”'),
('new',None,'morning','One drop lands on PinPin nose as he leans near leaf; baby laughs from Mama arms.','Plip! A drop landed on PinPin’s nose. PomPom giggled. PinPin laughed too.'),
('new',None,'morning','School arrival wide; three familiar children and two new pupils approach with adult relatives.','The school clearing was waking up too. Families followed the little paths toward the pavilion.'),
('new',None,'morning','Five pupil introduction at child height, adults outside this closer frame.','Lulu and Tutu were waiting with Mila the mouse and Bruno the badger. “Come with us, PinPin!”'),
('new',None,'morning','Mama/PomPom say goodbye at path edge; PinPin faces them then turns toward friends.','“See you after school,” said Mama. PomPom waved a tiny paw. “Bye!” said PinPin.'),
('new',None,'welcome','Elder arrives; five pupils and owl turn to greet him; staff visible in Elder paw.','“Master Shipostav!” called PinPin. “Good morning, everyone,” said the Elder.'),
('new',None,'welcome','Staff visibly parked by root; Elder stoops toward pinecone on low stump as if greeting it.','The Elder gave the children a little wink. Then he bowed to a pinecone. “Good morning, little one.”'),
('new',None,'welcome','Mila and Bruno react with friendly giggles; Elder and pinecone visible at edge for eye target.','“It’s a pinecone!” said Mila. “It hasn’t got feet!” said Bruno.'),
('new',None,'welcome','Elder passes pinecone to PinPin with a deliberate playful smile; staff remains visibly parked against root for next departure shot.','“Then our quiet little guest needs some help,” said the Elder. “Will you look after it?” “Yes!” said PinPin.'),
('new',2,'listening','PinPin visibly places gifted pinecone into low workbench tray in foreground; owl gathers five pupils while Elder departs with staff in background.','PinPin put the pinecone on the tray. The Elder waved goodbye. “Now, let’s listen,” said their owl teacher.'),
('reuse',4,'listening','Lulu close low upward listening, other pupils assigned off-camera where not in old frame.','Lulu lifted her ears. “The leaves! I can hear the leaves!”'),
('reuse',5,'listening','Upward canopy and windborne oak leaves, no cast.','Shhh… The leaves moved together. Then the breeze grew quiet.'),
('edit',7,'listening','All five pupils follow owl along dry stream-bank path.','“I hear water,” said Mila. They followed the path toward the stream.'),
('edit',8,'listening','All five pupils on dry bank with owl overseeing; varied crouched listening positions.','The water slipped around the stones. “It goes blub-blub,” said Bruno. “And shhh,” said Lulu.'),
('new',10,'listening','Tutu and Mila turn toward tapping beyond bank, point/gaze target aligned.','Tap-tap-tap! Tutu turned her head. “What’s making that sound?”'),
('edit',11,'listening','All five follow owl on path toward pale snag, no river crossing; correct species tails.','They left the water behind and followed the tapping around the bend.'),
('reuse',12,'listening','Close natural woodpecker braced on pale trunk, no students.','A woodpecker was working on the old trunk. Tap-tap-tap!'),
('edit',13,'listening','Bird-height downward view, owl and all five students look up from ground.','They watched without touching the tree. “He’s busy,” whispered PinPin.'),
('new',20,'snack','Bruno pauses with two paws on tummy while nearby friends react to gentle rumble.','Grrr-rum! “What was that?” asked Tutu. Bruno looked down. “My tummy!” Everyone giggled.'),
('new',None,'snack','Five children share apple wedges and five cups at low table; owl nearby.','“Snack time,” said their teacher. Crunch! “Apples make a sound too!” said PinPin.'),
('new',None,'snack','Children return five cups and food tray to low shelf, leaving work surface ready.','They put the cups back on the tray and made room on the table. There was something to build.'),
('new',None,'building','Owl indicates familiar gifted pinecone and simple kit on clear low workbench.','“Our little guest needs a roof,” said the teacher. “Can you make one that stays up?”'),
('new',None,'building','Lulu/Tutu position two blocks too far apart on table; others watch; no one under model.','Lulu put down one block. Tutu put down the other. “Now the roof,” said PinPin.'),
('new',None,'building','Light bark board slips between widely spaced supports onto table, paws safely clear.','Plop! The roof slipped between the blocks and landed on the table.'),
('new',None,'building','Children look at failed arrangement; Mila points at wide gap, PinPin cheerful puzzled expression.','“Oops!” said PinPin. Mila pointed. “The blocks are too far apart!”'),
('new',None,'building','Lulu/Tutu each move their block closer; layout clearly changes.','“Closer?” asked Lulu. “Closer,” said Tutu. They moved the blocks toward each other.'),
('new',None,'building','Lulu/Tutu brace one support each; PinPin prepares board; other two stand clear.','“I’ll hold this one.” “I’ll hold that one.” “Ready?” asked PinPin.'),
('new',None,'building','PinPin lays light bark board over both stable supports; no magical levitation.','PinPin lowered the roof slowly. This time, both ends stayed on the blocks.'),
('new',None,'building','After supports released, Mila slides pinecone on leaf into completed shelter.','Mila carried their little guest underneath. “In you go.” The pinecone fitted neatly.'),
('new',None,'building','Bruno pours small amount of water from small cup onto roof with two forepaws; all pupils watch.','“A little rain,” said Bruno. He tipped the cup gently. Water ran off the roof.'),
('new',None,'building','Low model-level reveal: pinecone dry under roof, damp edge outside, five faces or subset behind looking at target.','PinPin bent down to look. “Dry!” “We did it!” said Tutu.'),
('new',None,'building','Five pupils and owl enjoy completed little model, no long speech; hands relaxed after job.','“You held it. I placed it,” said PinPin. Mila patted the table. “And our guest stayed dry.”'),
('edit',17,'friends','Five pupils move from workbench/lawn toward oak, model remains behind on bench.','After the lesson, they went to the old oak. There was room in the shade for everyone.'),
('edit',23,'friends','Lulu gathers small bunch of daisies; all five friends have planned resting positions around same oak.','Lulu found a few daisies beside the roots. “I’m making a crown.”'),
('reuse',24,'friends','Close Lulu weaving short flower chain, other pupils explicitly off-frame.','She crossed one stem over the next. PinPin watched her paws. “Like that?” “Like that.”'),
('reuse',26,'friends','Close Lulu holds completed modest ring before chest.','Lulu joined the two ends. “A circle!” said PinPin.'),
('edit',27,'friends','Lulu wears small crown, close reactions include existing trio; new pupils remain established nearby/off-frame.','She put it between her ears. “It fits!” said Tutu.'),
('edit',30,'friends','Bright afternoon quiet group at oak, all five pupils visible, Lulu retains crown, no sunset.','They sat together for a moment. “I like it here,” said Lulu. “Me too,” said PinPin.'),
('new',31,'pickup','Five adult relatives approach in afternoon; Mama carries PomPom; children visible in clearing distance.','Then the families came along the path. Mama brought PomPom, and the other parents came too.'),
('new',33,'pickup','PinPin greets Mama eye-to-eye; she safely supports PomPom at left chest; he points toward bench.','“Mama! We made a little house!” “Show me,” she said. PomPom looked where PinPin pointed.'),
('new',None,'pickup','Lulu and rabbit mother face one another, adult admires crown without taking it.','“Look, Mama!” said Lulu. Her mother bent close. “You made that?” Lulu nodded.'),
('new',None,'pickup','Tutu meets squirrel father, both look toward model then one another.','“Our roof fell down,” Tutu told her father. “Then we fixed it!” “Show me how,” he said.'),
('new',None,'pickup','Mila meets mouse father and Bruno meets badger mother in one shared pickup space, two clear family pairs.','“I carried our guest,” said Mila. “I made the rain,” said Bruno. Their parents came to see.'),
('new',None,'pickup','Whole group at workbench: five children show model to all five parents, Mama carries baby; owl nearby.','The families gathered around the little roof. “Dry!” said PinPin again. PomPom clapped his tiny paws.'),
('new',34,'pickup','Families turn toward exit and say goodbye to owl at school boundary, all child-parent pairings clear.','“Goodbye!” called the children. “See you tomorrow,” said their teacher.'),
('new',35,'pickup','All five families walk together along sunny meadow-edge path; baby remains carried; no home door/night.','They set off together in the warm afternoon. There was still so much to tell.'),
]
rows.insert(41,('new',None,'pickup','Mama carrying PomPom and Lulu’s mother meet eyes and greet on the school path; other families remain spaced behind.','“Good afternoon,” said Mama to Lulu’s mother. “What have they been making?” “Let’s go and see!”'))
assert len(rows)==49
versions={4:2,11:2,13:2,17:2,20:1,23:1,24:1,26:1,27:1,30:2,31:1,33:1,34:2,35:1}
shots=[]
for n,(mode,old,seq,action,copy) in enumerate(rows,1):
 oldpath=f'images/chapter-04-academy/scenes/scene-{old:02}-v{versions.get(old,1)}.png' if old else None
 shots.append({'id':f'academy-r02-{n:02}','sequence':seq,'action':action,'dialogue_en':copy,'proposedAssetMode':mode,'before':oldpath,'sourceBoundary':'Source-inspired friendship/crown/listening expanded for new user direction' if seq=='friends' else 'User-requested adaptation/addition','status':'planned, not rendered','castNote':'Whole class = five pupils; owl regular teacher; Elder morning guest only. Baby remains with Mama, not a pupil.','cameraGate':'Assign exact camera target, visible cast and off-camera partner positions after root coherence gate; no final render before preproduction review.'})
(p/'draft-beat-plan.json').write_text(json.dumps({'schemaVersion':1,'revision':'academy-r02','status':'internal draft for coherence gate','plannedBeats':len(shots),'quotaNote':'48 action/reaction/transition beats follow current scope; this is not a target quota. Root may merge repetitive beats or split unclear handling steps.','gates':{'source':'Root passed complete38-chapter source map','dialogueAndStructure':'passed by root, with explicit parent-greeting beat and pinecone placement added','castAndSites':'planned, no new reference render yet','storyRendering':'not started'},'shots':shots},ensure_ascii=False,indent=2)+'\n')
md='# Academy revision02 — English reading draft\n\nInternal draft for root review; no story images rendered. One short exchange/action per beat.\n\n'
for s in shots:md+=f"## {s['id']} — {s['sequence']}\n\n{s['dialogue_en']}\n\n*Visible action:* {s['action']}\n\n"
(p/'dialogue-en.md').write_text(md)
md='# Academy revision02 — reuse/edit map\n\nOriginal proposal remains read-only. Reuse is conditional on visible light, cast and props fitting the new day; image metadata retains original generation history. Whole-class wides with only the old three pupils must be regenerated with all five. No night or sunset image may be recaptioned as daylight.\n\n| New beat | Plan | Prior reference | Action |\n|---|---|---|---|\n'
for s in shots:md+=f"|{s['id']}|{s['proposedAssetMode']}|{s['before'] or 'New scene'}|{s['action']}|\n"
md+='\nRetire old honey-jar telling/punchline scenes19–21 from the reading sequence. Their images remain preserved, with old20 a before reference for the replaced humor beat only, not a required generation reference. Retire old dark/night house-door finale36 from this edition. Old pretty portraits are not retained where they hide a missing action or pupil.\n'
(p/'reuse-edit-map.md').write_text(md)
print(len(shots),'planned beats;',sum(s['proposedAssetMode']=='reuse' for s in shots),'conditional reuses;',sum(s['proposedAssetMode']=='edit' for s in shots),'recompositions;',sum(s['proposedAssetMode']=='new' for s in shots),'new scene plans')
