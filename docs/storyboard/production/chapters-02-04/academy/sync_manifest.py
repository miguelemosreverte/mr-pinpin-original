import json,datetime
from pathlib import Path
here=Path(__file__).parent
board=here.parents[2]
p=here/'chapter.json';d=json.load(open(p)); versions={3:2,4:2,11:2,13:2,15:2,17:2,25:2,28:2,30:2,34:2}
for n,s in enumerate(d['scenes'],1):
 v=versions.get(n,1);rel=f'images/chapter-04-academy/scenes/scene-{n:02}-v{v}.png';f=board/rel
 if not f.exists():continue
 r=json.load(open(f.with_suffix('.json')))
 if not r.get('review'):continue
 s.update(src=rel,width=r['width'],height=r['height'],review=r['review'])
 if v>1:s['before']=f'images/chapter-04-academy/scenes/scene-{n:02}-v1.png'
 s['provenance']=str(f.with_suffix('.json').relative_to(board))
for n,c in {3:'Close low child-eye view of three attentive listeners; teacher and her stump off-camera right.',4:'Close low angle, upward listening reaction; ground landmarks out of frame.',13:'Bird-height downward view from near pale snag; woodpecker foreground and all four ground observers look up.',17:'Wide lateral left-to-right walking approach toward visibly empty oak hollows.',24:'Medium close single rabbit carefully handling the first open daisy chain.',25:'Two-shot of Lulu with short open daisy chain and PinPin watching.',26:'Close Lulu holding the completed small flower ring before her chest.',28:'Medium three-shot of crowned Lulu listening with eyes closed; sunset sky without visible sun disc.'}.items():d['scenes'][n-1]['camera']=c
updates={1:{'ru':'Однажды днём в Лесной академии учительница Сова собрала Пин-Пина, Лулу и Туту на полянке.'},6:{'ru':'У края полянки Пин-Пин услышал другой звук: тихое журчание ручья. — Давайте послушаем его поближе?', 'en':'At the edge of the clearing, PinPin heard another sound: the stream softly trickling. “Shall we listen a little closer?”', 'es':'En el borde del claro, PinPin oyó otro sonido: el suave murmullo del arroyo. —¿Lo escuchamos un poco más de cerca?'},7:{'ru':'Сова повела друзей по тропинке вдоль берега. Они шли медленно, прислушиваясь к воде.', 'en':'Their teacher led them along the path beside the bank. They walked slowly, listening to the water.', 'es':'La maestra los guio por el sendero junto a la orilla. Caminaron despacio, escuchando el agua.'}}
updates[33]={'ru':'Пин-Пин спустился с корня и подошёл к Маме. Она ласково улыбнулась ему.', 'en':'PinPin stepped down from the root and went to Mama. She smiled warmly at him.', 'es':'PinPin bajó de la raíz y se acercó a Mamá. Ella le sonrió con cariño.'}
updates[34]={'ru':'Он обернулся к друзьям. — До встречи! Лулу и Туту помахали ему. Венок остался у Лулу, а смех этого дня — у всех троих.', 'en':'He turned back to his friends. “See you soon!” Lulu and Tutu waved. Lulu kept her flower crown, and all three kept the day’s laughter.', 'es':'Se volvió hacia sus amigos. —¡Hasta pronto! Lulu y Tutu lo saludaron. Lulu se quedó con la corona, y los tres se llevaron las risas de aquel día.'}
for n,langs in updates.items():
 for lang,t in langs.items():d['scenes'][n-1]['text'][lang]=[t]
alts=[
('Сова собирает трёх друзей у пенька в лесной школе.','The owl gathers three friends beside her stump in the woodland school.','La maestra Búho reúne a tres amigos junto a su tocón en la escuela del bosque.'),
('Сова обращается к Пин-Пину, Лулу и Туту.','The owl speaks to PinPin, Lulu and Tutu.','La maestra habla con PinPin, Lulu y Tutu.'),
('Трое друзей замирают и внимательно слушают.','The three friends grow still and listen attentively.','Los tres amigos se quedan quietos y escuchan atentos.'),
('Лулу поднимает уши; друзья смотрят вверх, к листьям.','Lulu lifts her ears as the friends look up toward the leaves.','Lulu levanta las orejas y los amigos miran hacia las hojas.'),
('Солнечный свет и движущиеся листья в кроне дуба.','Sunlight and moving leaves in the oak canopy.','Luz del sol y hojas en movimiento entre las ramas del roble.'),
('Пин-Пин поворачивается к ручью у края полянки.','PinPin turns toward the stream at the clearing’s edge.','PinPin se vuelve hacia el arroyo junto al claro.'),
('Сова ведёт друзей по сухой тропинке вдоль ручья.','The owl leads the friends along the dry path beside the stream.','La maestra guía a los amigos por el sendero seco junto al arroyo.'),
('Трое друзей слушают воду с сухого берега; Сова рядом.','The three friends listen from the dry bank with the owl nearby.','Los tres amigos escuchan desde la orilla seca, cerca de la maestra.'),
('Мелкий ручей струится между гладкими камешками.','The shallow stream flows between smooth pebbles.','El arroyo poco profundo corre entre piedras lisas.'),
('Туту поворачивается на стук; Лулу и Пин-Пин прислушиваются.','Tutu turns toward a tapping sound while Lulu and PinPin listen.','Tutu se vuelve hacia unos golpecitos mientras Lulu y PinPin escuchan.'),
('Друзья идут вслед за Совой к светлому сухому стволу.','The friends follow the owl toward a pale weathered trunk.','Los amigos siguen a la maestra hacia un tronco seco y claro.'),
('Чёрно-бело-красный дятел стучит по светлому стволу.','A black, white and red woodpecker taps the pale trunk.','Un pájaro carpintero negro, blanco y rojo golpea el tronco claro.'),
('С высоты дятла видны четыре наблюдателя, смотрящие вверх.','From the woodpecker’s height, four observers look up from the ground.','Desde la altura del pájaro se ven cuatro observadores mirando hacia arriba.'),
('Сова и друзья возвращаются по тропинке через сад.','The owl and friends return along the garden path.','La maestra y los amigos regresan por el sendero del jardín.'),
('Друзья делятся воспоминаниями об услышанном возле Совы.','The friends share memories of the sounds beside their teacher.','Los amigos recuerdan los sonidos junto a la maestra.'),
('Друзья уходят к дубу, оставляя Сову у пенька.','The friends leave for the oak while the owl stays at her stump.','Los amigos van hacia el roble mientras la maestra se queda en su tocón.'),
('Трое друзей подходят к пустым уютным местам между корнями дуба.','Three friends approach empty sitting places between the oak roots.','Tres amigos se acercan a los rincones vacíos entre las raíces del roble.'),
('Лулу сидит слева, Пин-Пин в середине, Туту справа.','Lulu sits on the left, PinPin in the middle and Tutu on the right.','Lulu se sienta a la izquierda, PinPin en el centro y Tutu a la derecha.'),
('Туту рассказывает историю двум внимательным друзьям.','Tutu tells a story to her two attentive friends.','Tutu cuenta una historia a sus dos amigos atentos.'),
('Туту двумя лапками изображает, как трудно открыть воображаемую банку.','Tutu mimes struggling with an imaginary jar using her two forepaws.','Tutu imita con sus dos patitas lo difícil que es abrir un tarro imaginario.'),
('Лулу, Пин-Пин и Туту вместе смеются под дубом.','Lulu, PinPin and Tutu laugh together beneath the oak.','Lulu, PinPin y Tutu se ríen juntos bajo el roble.'),
('Лулу замечает маргаритки у левого корня.','Lulu notices daisies beside the left root.','Lulu descubre margaritas junto a la raíz de la izquierda.'),
('Лулу собирает несколько маргариток; друзья остаются на корнях.','Lulu gathers a few daisies while her friends remain on the roots.','Lulu recoge algunas margaritas mientras sus amigos siguen junto a las raíces.'),
('Лулу переплетает стебельки короткой цветочной цепочки.','Lulu weaves stems into a short flower chain.','Lulu entrelaza tallos para formar una pequeña cadena de flores.'),
('Пин-Пин смотрит, как Лулу держит незамкнутую цветочную цепочку.','PinPin watches Lulu holding an open flower chain.','PinPin observa a Lulu mientras sostiene una cadena de flores abierta.'),
('Лулу держит маленький замкнутый венок перед собой.','Lulu holds the small completed flower ring before her.','Lulu sostiene delante de sí el pequeño aro de flores terminado.'),
('Лулу примеряет венок между ушами; друзья улыбаются.','Lulu wears the flower crown at her ear bases while her friends smile.','Lulu luce la corona junto a la base de las orejas y sus amigos sonríen.'),
('Лулу в венке закрывает глаза и слушает; друзья рядом.','Crowned Lulu closes her eyes and listens beside her friends.','Lulu, con su corona, cierra los ojos y escucha junto a sus amigos.'),
('Пин-Пин задумчиво прислушивается под дубом на закате.','PinPin listens thoughtfully beneath the oak at sunset.','PinPin escucha pensativo bajo el roble al atardecer.'),
('Трое друзей тихо сидят под дубом; на Лулу цветочный венок.','Three friends sit quietly beneath the oak; Lulu wears her flower crown.','Tres amigos descansan en silencio bajo el roble; Lulu lleva su corona.'),
('Мама подходит по тропинке к друзьям под дубом.','Mama approaches the friends beneath the oak along the path.','Mamá se acerca por el sendero a los amigos bajo el roble.'),
('Пин-Пин поворачивается на знакомый голос Мамы.','PinPin turns toward Mama’s familiar voice.','PinPin se vuelve hacia la voz conocida de Mamá.'),
('Пин-Пин спускается с корней и подходит к Маме.','PinPin steps down from the roots and goes to Mama.','PinPin baja de las raíces y se acerca a Mamá.'),
('Пин-Пин с Мамой прощаются с Лулу в венке и Туту.','PinPin and Mama say goodbye to crowned Lulu and Tutu.','PinPin y Mamá se despiden de Lulu, con su corona, y Tutu.'),
('Мама и Пин-Пин идут вдвоём по лесной тропинке в сумерках.','Mama and PinPin walk together along the forest path at dusk.','Mamá y PinPin caminan juntos por el sendero del bosque al anochecer.'),
('Мама и Пин-Пин подходят к зелёной двери своего освещённого дома.','Mama and PinPin approach the green door of their warmly lit home.','Mamá y PinPin se acercan a la puerta verde de su casa iluminada.'),
]
for s,alt in zip(d['scenes'],alts):s['alt']=dict(zip(['ru','en','es'],alt))
d['cover']={lang:f'images/covers/chapter-04/title/title-{lang}-v1.png' for lang in ['ru','en','es']}
d['miniature']='images/covers/chapter-04/miniature/miniature-v1.png'
extras=[('pinpin-turnaround','PinPin shared turnaround','images/chapter-preproduction/shared/pinpin-turnaround-v1.png','Established child identity from front, right profile, rear and three-quarter; illustrative proportions.'),('family-reference','Mama and PinPin','images/chapter-04-academy/preproduction/family-reference-v1.png','Reviewed homecoming cast and relative scale; no PomPom in this episode.'),('title','Localized title cover','images/covers/chapter-04/title/title-en-v1.png','Root-generated proposed title cover; RU/EN/ES variants supplied.'),('miniature','Text-free title miniature','images/covers/chapter-04/miniature/miniature-v1.png','One proposed text-free master, shared across display sizes and languages.')]
ids={a['id'] for a in d['preproduction']}
for id,title,src,desc in extras:
 if id not in ids and (board/src).exists():d['preproduction'].append({'id':id,'title':title,'src':src,'description':desc})
d['editorialNotes']=[x for x in d['editorialNotes'] if not x.startswith('Visual-production caveat:')]
d['editorialNotes'].append('Visual-production caveat: illustrated reference sheets and planning coordinates guide continuity; these are not calibrated 3D renders. Hidden anatomy and exact real-world dimensions are not certified.')
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
planpath=here/'shot-plan.json';plan=json.load(open(planpath))
for n,(shot,s) in enumerate(zip(plan['shots'],d['scenes']),1):
 shot['selectedImage']=s['src'];shot['selectedCamera']=s['camera'];shot['status']='reviewed proposal' if s['review']!='Pending generation and visual inspection.' else 'pending';shot['cameraAnchor']='C-oak' if 17<=n<=34 else 'C-stream' if 6<=n<=10 else 'C-snag' if 11<=n<=13 else 'C-school' if n<=16 else 'Homeward exterior';shot['planningCoordinatesOnly']=True
planpath.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
print('Selected',sum(s['review']!='Pending generation and visual inspection.' for s in d['scenes']),'reviewed scenes of',len(d['scenes']))
