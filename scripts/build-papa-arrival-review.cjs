#!/usr/bin/env node
'use strict';

// Local review only: never changes a selected story manifest or release.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const storyboard = path.join(root, 'docs/storyboard');
const production = path.join(storyboard, 'production/papa-arrival-expansion-20260922');
const destination = path.join(storyboard, 'review/papa-arrival-expansion.html');
// Immutable pre-expansion snapshot: official integration must not rewrite "before".
const story = JSON.parse(fs.readFileSync(path.join(production, 'original-elder-papa-home.json'), 'utf8'));
const planPath = path.join(production, 'story-plan.json');
if (!fs.existsSync(planPath)) throw new Error('Create production/papa-arrival-expansion-20260922/story-plan.json first.');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const generationPath = path.join(production, 'generation-plan.json');
const generation = fs.existsSync(generationPath) ? JSON.parse(fs.readFileSync(generationPath, 'utf8')) : { shots: [] };
const generationById = new Map((generation.shots || []).map(shot => [shot.id, shot]));
const originals = story.scenes.filter(scene => scene.role !== 'title');
const beats = plan.beats;
if (!Array.isArray(beats) || beats.length < 10) throw new Error('The arrival expansion requires at least ten proposed beats.');
const ids = new Set();
function repoFile(filename, base) {
  const absolute = path.resolve(base, filename);
  if (!absolute.startsWith(root + path.sep)) throw new Error(`Review assets must be inside the repository: ${filename}`);
  return absolute;
}
function asset(filename, base = storyboard) {
  const absolute = repoFile(filename, base);
  return { url: path.relative(path.dirname(destination), absolute).split(path.sep).join('/'), available: fs.existsSync(absolute) && fs.statSync(absolute).size > 0 };
}
function originalData(scene) {
  const images = Object.fromEntries(['en', 'ru', 'es'].map(lang => [lang, asset(scene.images?.[lang] || scene.image)]));
  for (const image of Object.values(images)) if (!image.available) throw new Error(`Restore original artwork before building: ${image.url}`);
  return { id: scene.id, kind: 'original', title: scene.role === 'title', width: scene.width, height: scene.height, images, captions: scene.paragraphs, alt: scene.alt };
}
const originalById = new Map(story.scenes.map(scene => [scene.id, originalData(scene)]));
const additions = beats.map((beat, index) => {
  if (!/^arrival-\d{2}$/.test(beat.id) || ids.has(beat.id)) throw new Error(`Invalid or duplicate arrival ID: ${beat.id}`);
  ids.add(beat.id);
  for (const lang of ['en', 'ru', 'es']) if (!beat.captions?.[lang]) throw new Error(`Missing ${lang} caption for ${beat.id}`);
  const context = originals[(beat.contextScene || beat.afterScene) - 1];
  if (!context) throw new Error(`Missing original context for ${beat.id}`);
  let output = generationById.get(beat.id)?.output || `images/${beat.id}.png`;
  const outputBase = output.startsWith('docs/') ? root : production;
  return { id: beat.id, kind: 'addition', number: index + 1, titles: beat.titles || {}, captions: beat.captions, image: asset(output, outputBase), contextId: context.id, contextNumber: originals.indexOf(context) + 1 };
});
const additionsById = new Map(additions.map(beat => [beat.id, beat]));
const proposedIds = plan.sequence || originals.flatMap((scene, index) => [scene.id, ...beats.filter(beat => beat.afterScene === index + 1).map(beat => beat.id)]);
const sequenceIds = proposedIds.map(item => typeof item === 'string' ? item : item.id);
const titleId = story.scenes.find(scene => scene.role === 'title')?.id;
if (titleId && !sequenceIds.includes(titleId)) sequenceIds.unshift(titleId);
if (new Set(sequenceIds).size !== sequenceIds.length) throw new Error('The reading sequence contains duplicate IDs.');
const bridges = (plan.proposedTextBridges || []).map(bridge => {
  const original = originalById.get(bridge.sceneId);
  if (!original) throw new Error(`Unknown caption bridge: ${bridge.sceneId}`);
  for (const lang of ['en', 'ru', 'es']) if (!bridge.captions?.[lang]) throw new Error(`Missing ${lang} caption bridge for ${bridge.sceneId}`);
  return { ...original, captions: bridge.captions, contextNumber: originals.findIndex(scene => scene.id === bridge.sceneId) + 1 };
});
const bridgesById = new Map(bridges.map(bridge => [bridge.id, bridge]));
const originalImageOverrides = plan.originalImageOverrides || {};
if (typeof originalImageOverrides !== 'object' || Array.isArray(originalImageOverrides)) throw new Error('originalImageOverrides must map original scene IDs to repository-relative image paths.');
const overrideImages = new Map(Object.entries(originalImageOverrides).map(([id, filename]) => {
  if (!originalById.has(id)) throw new Error(`Unknown original image override: ${id}`);
  if (typeof filename !== 'string' || !filename || path.isAbsolute(filename)) throw new Error(`Original image override must be repository-relative: ${id}`);
  const image = asset(filename, root);
  if (!image.available) throw new Error(`Restore the proposed original image override before building: ${filename}`);
  return [id, Object.fromEntries(['en', 'ru', 'es'].map(lang => [lang, image]))];
}));
const sequence = sequenceIds.map(id => {
  const scene = bridgesById.get(id) || originalById.get(id) || additionsById.get(id);
  if (!scene) throw new Error(`Unknown reading sequence ID: ${id}`);
  // Override the continuous local draft only; comparison originals stay untouched.
  return overrideImages.has(id) ? { ...scene, images: overrideImages.get(id) } : scene;
});
const retained = sequence.filter(scene => scene.kind === 'original' && !scene.title).map(scene => scene.id);
if (JSON.stringify(retained) !== JSON.stringify(originals.map(scene => scene.id))) throw new Error('The draft must preserve every original scene in its existing order.');
if (sequence.filter(scene => scene.kind === 'addition').length !== additions.length) throw new Error('The reading sequence must contain every addition exactly once.');
const ready = additions.filter(beat => beat.image.available).length;
if (process.argv.includes('--require-complete') && ready !== additions.length) throw new Error(`Only ${ready}/${additions.length} proposed images are available.`);
const data = { title: story.title, originalCount: originals.length, additions, bridges, originals: Object.fromEntries(originalById), sequence, ready };
const embedded = JSON.stringify(data).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Papa Comes Home — arrival review</title>
<style>
:root{color-scheme:light;--ink:#253c31;--muted:#627166;--paper:#faf8f0;--line:#d9dfd4;--green:#345a42;--gold:#fff0cd}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,-apple-system,sans-serif;line-height:1.55}a{color:var(--green)}header{max-width:1450px;margin:auto;padding:36px 28px 20px}nav{display:flex;gap:18px;flex-wrap:wrap;font-size:.92rem}h1{font-family:Georgia,serif;font-weight:normal;font-size:clamp(2rem,4vw,3.2rem);line-height:1.15;margin:22px 0 14px}h2{font-size:1.15rem;margin:0}.intro{max-width:850px;margin:12px 0}.badge{display:inline-block;padding:5px 12px;border-radius:20px;background:var(--gold);color:#72501e;font-size:.85rem;font-weight:650}.toolbar{position:sticky;top:0;z-index:5;background:#faf8f0f5;backdrop-filter:blur(12px);border-block:1px solid var(--line);padding:12px 28px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}.modes{display:flex;gap:8px}button,select{font:inherit;min-height:44px;border:1px solid var(--line);border-radius:8px;padding:8px 14px;background:white;color:var(--ink)}button{cursor:pointer}button[aria-pressed=true]{background:var(--green);color:white;border-color:var(--green)}label{display:flex;align-items:center;gap:10px}main{max-width:1450px;margin:auto;padding:24px 28px 70px}.row{margin-bottom:34px;border:1px solid var(--line);border-radius:13px;overflow:hidden;background:white}.row-head{padding:16px 20px;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:baseline}.number{color:var(--muted);font-size:.85rem;font-variant-numeric:tabular-nums}.pair{display:grid;grid-template-columns:1fr 1fr}.panel{min-width:0}.panel+.panel{border-left:1px solid var(--line)}.panel-label{font-size:.8rem;letter-spacing:.025em;padding:12px 18px;background:#f3f5ed;color:var(--muted);margin:0}.panel.proposal .panel-label{background:#eaf2e8;color:#315536}figure{margin:0}img{display:block;width:100%;height:auto;object-fit:contain}figcaption{padding:18px 22px;font-family:Georgia,serif;font-size:clamp(1.1rem,1.6vw,1.35rem);line-height:1.6}figcaption p{margin:0 0 .5em}figcaption p:last-child{margin:0}.pending{aspect-ratio:3/2;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f4f1e7;color:#73756b;padding:28px;text-align:center;gap:12px}.pending span{font-size:2rem;color:#a8b5a0}.progress{color:var(--muted);font-size:.9rem}#reader{max-width:1040px;margin:auto}.page{background:white;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin:0 auto 42px}.page.cover{max-width:560px}.page figcaption{padding:22px 30px;font-size:clamp(1.25rem,2.3vw,1.7rem)}.reader-intro{margin:0 0 26px;color:var(--muted)}footer{text-align:center;color:var(--muted);font-size:.88rem;padding:0 24px 36px}[hidden]{display:none!important}@media(max-width:720px){header{padding:24px 16px 16px}main{padding:20px 12px 45px}.toolbar{padding:10px 14px}.pair{grid-template-columns:1fr}.panel+.panel{border-left:0;border-top:1px solid var(--line)}.row-head{padding:12px 16px}figcaption{padding:16px}.page figcaption{padding:20px}.modes{flex:1}button{flex:1}}
</style></head><body>
<header><nav><a id="library" href="../library.html?lang=ru"></a><a id="current" href="../?story=elder-papa-home&amp;lang=ru"></a></nav><h1 id="title"></h1><span id="badge" class="badge"></span><p class="intro" id="intro"></p><p id="progress" class="progress" aria-live="polite"></p></header>
<div class="toolbar"><div class="modes" role="group" aria-label="View"><button id="compare-button" aria-pressed="true"></button><button id="reader-button" aria-pressed="false"></button></div><label><span id="language-label"></span><select id="language" aria-label="Language"><option value="ru">Русский</option><option value="en">English</option><option value="es">Español</option></select></label></div>
<main><div id="comparison"></div><div id="reader" hidden></div></main><footer id="footer"></footer>
<script id="review-data" type="application/json">${embedded}</script>
<script>
'use strict';
const data=JSON.parse(document.getElementById('review-data').textContent);
const ui={
ru:{library:'Библиотека',current:'Опубликованная глава',title:'Папа возвращается · новая встреча',badge:'Архив просмотра · одобрено к публикации',intro:'Останемся с Пин-Пином: он замечает Папу, машет ему и бежит рассказать Маме. Ниже каждый новый момент показан рядом с кадром из опубликованной главы.',compare:'До и после',reader:'Читать черновик',language:'Язык',before:'До · контекст из опубликованной главы',after:'После · предлагаемый новый кадр',bridge:'Переход в тексте',afterText:'После · тот же рисунок, новый текст',moment:'Новый момент',scene:'кадр',pending:'Иллюстрация готовится',count:'новых иллюстраций готово',original:'сохранённых сцен',draft:'Полная глава с одобренными новыми моментами. Сохранённая версия для просмотра.',footer:'Архив просмотра: исходные кадры сохранены для сравнения независимо от текущей опубликованной версии.'},
en:{library:'Story library',current:'Published chapter',title:'Papa Comes Home · a fuller welcome',badge:'Review archive · approved for publication',intro:'Stay with PinPin as he spots Papa, waves to him, and hurries to tell Mama. Each added moment below sits beside its context from the published chapter.',compare:'Before and after',reader:'Read the draft',language:'Language',before:'Before · published context',after:'After · proposed additional image',bridge:'Caption transition',afterText:'After · same illustration, revised caption',moment:'Added moment',scene:'scene',pending:'Illustration in progress',count:'new illustrations ready',original:'preserved scenes',draft:'The complete chapter with the approved additions, preserved for review.',footer:'A review archive: original images are preserved for comparison independently of the current public release.'},
es:{library:'Biblioteca',current:'Capítulo publicado',title:'Papá vuelve a casa · una bienvenida más larga',badge:'Archivo de revisión · aprobado para publicar',intro:'Seguimos a PinPin: ve a Papá, lo saluda y corre a contárselo a Mamá. Cada momento nuevo aparece junto a su contexto del capítulo publicado.',compare:'Antes y después',reader:'Leer el borrador',language:'Idioma',before:'Antes · contexto publicado',after:'Después · ilustración adicional propuesta',bridge:'Transición del texto',afterText:'Después · misma ilustración, texto revisado',moment:'Momento añadido',scene:'escena',pending:'Ilustración en preparación',count:'ilustraciones nuevas listas',original:'escenas conservadas',draft:'El capítulo completo con los momentos nuevos aprobados, conservado para revisión.',footer:'Archivo de revisión: las imágenes originales se conservan para comparar, independientemente de la publicación actual.'}};
const parameters=new URLSearchParams(location.search);let lang=ui[parameters.get('lang')]?parameters.get('lang'):'ru';let mode=parameters.get('view')==='reader'?'reader':'compare';
const el=id=>document.getElementById(id);function node(tag,className,text){const value=document.createElement(tag);if(className)value.className=className;if(text!==undefined)value.textContent=text;return value;}
function figure(scene){const fig=node('figure');const media=scene.kind==='original'?scene.images[lang]:scene.image;if(media.available){const img=node('img');img.width=scene.width||1536;img.height=scene.height||1024;img.src=media.url;img.alt=scene.alt?.[lang]||scene.titles?.[lang]||[].concat(scene.captions?.[lang]||'').join(' ');img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>img.replaceWith(placeholder()),{once:true});fig.append(img);}else fig.append(placeholder());const paragraphs=[].concat(scene.captions?.[lang]||[]);if(paragraphs.length){const cap=node('figcaption');for(const text of paragraphs)cap.append(node('p','',text));fig.append(cap);}return fig;}
function placeholder(){const pending=node('div','pending');pending.setAttribute('role','status');pending.append(node('span','','◌'),node('p','',ui[lang].pending));return pending;}
function panel(scene,label,proposal){const section=node('section','panel'+(proposal?' proposal':''));section.append(node('p','panel-label',label),figure(scene));return section;}
function render(){const t=ui[lang];document.documentElement.lang=lang;document.title=t.title;el('language').value=lang;for(const key of ['title','badge','intro','footer'])el(key).textContent=t[key];el('library').textContent=t.library;el('library').href='../library.html?lang='+lang;el('current').textContent=t.current;el('current').href='../?story=elder-papa-home&lang='+lang;el('compare-button').textContent=t.compare;el('reader-button').textContent=t.reader;el('language-label').textContent=t.language;el('progress').textContent=data.ready+' / '+data.additions.length+' '+t.count+' · '+data.originalCount+' '+t.original;
const comparisons=document.createDocumentFragment();for(const beat of data.additions){const row=node('article','row');row.id=beat.id;const head=node('div','row-head');head.append(node('span','number',String(beat.number).padStart(2,'0')),node('h2','',beat.titles[lang]||t.moment+' '+beat.number));const pair=node('div','pair');pair.append(panel(data.originals[beat.contextId],t.before+' · '+t.scene+' '+beat.contextNumber,false),panel(beat,t.after,true));row.append(head,pair);comparisons.append(row);}for(const bridge of data.bridges){const row=node('article','row');const head=node('div','row-head');head.append(node('h2','',t.bridge+' · '+t.scene+' '+bridge.contextNumber));const pair=node('div','pair');pair.append(panel(data.originals[bridge.id],t.before,false),panel(bridge,t.afterText,true));row.append(head,pair);comparisons.append(row);}el('comparison').replaceChildren(comparisons);
const pages=document.createDocumentFragment();pages.append(node('p','reader-intro',t.draft));for(const scene of data.sequence){const page=node('article','page'+(scene.title?' cover':''));page.append(figure(scene));pages.append(page);}el('reader').replaceChildren(pages);setMode(mode,false);}
function setMode(value,update=true){mode=value;el('comparison').hidden=mode!=='compare';el('reader').hidden=mode!=='reader';el('compare-button').setAttribute('aria-pressed',String(mode==='compare'));el('reader-button').setAttribute('aria-pressed',String(mode==='reader'));if(update)updateURL();}
function updateURL(){const url=new URL(location.href);url.searchParams.set('lang',lang);url.searchParams.set('view',mode);history.replaceState(null,'',url);}
el('language').addEventListener('change',event=>{lang=event.target.value;render();updateURL();});el('compare-button').addEventListener('click',()=>setMode('compare'));el('reader-button').addEventListener('click',()=>setMode('reader'));render();
</script></body></html>\n`;
if (!process.argv.includes('--check')) fs.writeFileSync(destination, html);
console.log(JSON.stringify({ review: path.relative(root, destination), proposedImages: additions.length, ready, pending: additions.length - ready, originalScenes: originals.length, readingPagesIncludingTitle: sequence.length, mode: process.argv.includes('--check') ? 'checked' : 'written' }, null, 2));
