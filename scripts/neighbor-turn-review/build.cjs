#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{parseArgs}=require('node:util');
const ROOT=fs.realpathSync(path.resolve(__dirname,'../..'));
const within=(root,file)=>file===root||file.startsWith(root+path.sep);
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function exactPrompt(markdown){const m=/^## Exact(?: submitted)?(?: Image-Edit)? prompt\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/im.exec(markdown);assert(m?.[1].trim(),'Exact prompt missing');return m[1].trim();}
function build({trial,manifest,out}){
  trial=fs.realpathSync(trial);out=path.resolve(out);
  assert(!within(ROOT,trial)&&!within(ROOT,out),'Use external trial and output');
  assert(fs.realpathSync(path.dirname(out))===path.dirname(out),'Use canonical output parent');
  const source=name=>{assert(typeof name==='string'&&!path.isAbsolute(name)&&!name.includes('\\')&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'),'Trial-relative source required');const f=fs.realpathSync(path.join(trial,name));assert(within(trial,f)&&fs.statSync(f).isFile(),'Source escapes trial');return f;};
  const read=name=>JSON.parse(fs.readFileSync(source(name),'utf8'));
  const spec=read(manifest);assert(spec.version===1&&spec.references.length===2&&spec.nativeClips.length===3,'Expected two anchors and three new native clips');
  const refs=Object.fromEntries(spec.references.map(r=>[r.heading,{...r,sha256:sha(source(r.path))}]));
  assert(refs['000']&&refs['015'],'Need nominal headings 000 and 015');
  const uploads=read(spec.uploads),records=new Map();
  const asset=name=>{const file=source(name);assert(['.png','.webp','.jpg','.mp4','.json','.md'].includes(path.extname(file).toLowerCase()),'Unsupported review asset');if(!records.has(name))records.set(name,{source:name,output:`assets/${String(records.size).padStart(3,'0')}${path.extname(file)}`,sha256:sha(file)});return records.get(name).output;};
  const sheets=read(spec.sheets),clips={};
  for(const clip of sheets.clips){
    assert(['loop000','loop015','turn000015','turn015000'].includes(clip.id)&&!clips[clip.id],'Invalid or duplicate clip ID');
    const file=path.posix.join(path.posix.dirname(spec.sheets),clip.sheet);
    assert(sha(source(file))===clip.sha256,'Sheet hash mismatch');
    assert(clip.durationMs===1000&&clip.fps===24&&clip.frames.length===24&&clip.size.length===2&&clip.size.every(n=>Number.isSafeInteger(n)&&n>0),'Expected 24 samples at 24fps; invalid sheet geometry');
    assert(clip.frames.every(r=>r.length===4&&r.every(Number.isSafeInteger)&&r[0]>=0&&r[1]>=0&&r[2]>0&&r[3]>0&&r[0]+r[2]<=clip.size[0]&&r[1]+r[3]<=clip.size[1]),'Frame outside sheet');
    clips[clip.id]={sheet:asset(file),size:clip.size,frames:clip.frames,durationMs:clip.durationMs};
  }
  assert(Object.keys(clips).length===4,'Need four real clips');
  const native=spec.nativeClips.map(c=>{
    const saved=read(c.record),from=refs[c.from],to=refs[c.to];
    assert(from&&to&&saved.status==='complete'&&saved.sourceHash===from.sha256,'Native first image/status mismatch');
    assert(saved.metadata?.sha256===sha(source(c.video)),'Native video hash mismatch');
    if(c.from===c.to)assert(saved.input.first_image_url===saved.input.end_image_url,'Loop endpoints differ');
    else {const uploaded=uploads.anchors.find(a=>a.heading===c.to);assert(uploaded?.sha256===to.sha256&&uploaded.download_sha256_verified&&saved.input.end_image_url===uploaded.url,'Turn end image binding differs');}
    assert(typeof saved.input.prompt==='string','Video prompt missing');
    return {...c,video:asset(c.video),prompt:saved.input.prompt,model:saved.model,cost:saved.priceEstimate?.amount,
      metadata:saved.metadata,parameters:Object.fromEntries(['duration','fps','resolution','aspect_ratio','generate_audio_switch','generate_multi_clip_switch','thinking_type','seed'].filter(k=>k in saved.input).map(k=>[k,saved.input[k]])),
      firstHash:from.sha256,endHash:to.sha256};
  });
  const prompt=exactPrompt(fs.readFileSync(source(spec.imagePromptRecord),'utf8'));
  const image=(r,label)=>`<figure><figcaption>${esc(label)}</figcaption><a href="${asset(r.path)}"><img src="${asset(r.path)}" alt="${esc(label)}"></a></figure>`;
  const total=native.reduce((sum,c)=>sum+(c.cost||0),0);
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mr. PinPin / neighbor turn review</title><link rel="stylesheet" href="review.css"><main><header><h1>Mr. PinPin / neighbor turn review</h1><p>Nominal headings 000 and 015. The first loop and elevated perspective were visually approved; the neighboring loop and two directed turns are new review candidates. No calibrated 15-degree claim.</p></header>
<section><h2>Actual input references</h2><div class="pair">${image(refs['000'],'000 / approved reference')}${image(refs['015'],'015 / edited neighbor reference')}</div><p>The 015 image edit used ONLY the 000 reference. No rig or software image rotation. Video conditioning uses the full images above as first/end stills, not a guide video or a sequence of pose frames.</p><h3>Exact 015 image-edit prompt</h3><pre class="image-prompt">${esc(prompt)}</pre><a href="${asset(spec.imagePromptRecord)}">Image provenance</a></section>
<section id="demo"><h2>Boundary-queued turn</h2><canvas id="sprite" width="960" height="540" aria-label="RGBA walking and directed turn preview"></canvas><div class="toolbar"><button id="play" class="icon" title="Play" aria-label="Play" disabled><i data-lucide="play" aria-hidden="true"></i></button><div class="heading-control" role="group" aria-label="Requested nominal heading"><button data-heading="000" aria-pressed="true">000</button><button data-heading="015" aria-pressed="false">015</button></div><output id="status">Loading 000</output></div><p id="timing" class="facts"></p><p id="error" class="status" role="alert"></p><p>480x270 RGBA display proxies, packed losslessly from 1280x720 native-size matte frames after fixed downscaling. ${esc(spec.playbackNote)} No crossfade or reverse playback. Only joins are being evaluated: steady loop to turn, then turn to the destination loop. Matching phase throughout the two steady loops is not required.</p><p class="status">${esc(spec.joinSummary)}</p>${spec.joinReport?`<a href="${asset(spec.joinReport)}">Join assessment</a>`:''}</section>
<section><h2>Native clips and exact submitted prompts</h2><p>Three new video requests; recorded total estimate USD ${total.toFixed(3)}, not verified billing. Each original clip is retained unchanged below. Earlier approved 000 generation is not included in this new-request total.</p>${native.map(c=>`<article class="clip"><h3>${esc(c.label)} / ${c.from} to ${c.to}</h3><p class="status">${esc(c.reviewNote||'')}</p><pre class="video-prompt">${esc(c.prompt)}</pre><pre>${esc(JSON.stringify(c.parameters,null,2))}</pre><p>${esc(c.model)}; estimate USD ${esc(c.cost)}. Native ${c.metadata.width}x${c.metadata.height}, ${c.metadata.frameCount} frames, ${c.metadata.duration} seconds.</p><video controls loop muted playsinline preload="metadata" aria-label="${esc(c.label)} native clip" src="${c.video}"></video><p>First SHA-256: <code>${c.firstHash}</code><br>End SHA-256: <code>${c.endHash}</code></p></article>`).join('')}</section><footer><a href="review-provenance.json">Review provenance</a> / <a href="CONTENT-LICENSE.md">Content permissions</a> / <a href="icons.LICENSE">Icon license</a></footer></main>
<script>window.NEIGHBOR_REVIEW=${JSON.stringify({clips}).replace(/</g,'\\u003c')};</script><script src="icons.js"></script><script src="scheduler.js"></script><script src="sheets.js"></script><script src="player.js"></script></html>`;
  asset(spec.sheets);asset(manifest);fs.mkdirSync(out);fs.mkdirSync(path.join(out,'assets'));
  for(const r of records.values()){fs.copyFileSync(source(r.source),path.join(out,r.output),fs.constants.COPYFILE_EXCL);assert(sha(path.join(out,r.output))===r.sha256,'Source changed during copy');}
  const helpers={};for(const name of ['review.css','scheduler.js','sheets.js','player.js']){fs.copyFileSync(path.join(__dirname,name),path.join(out,name));helpers[name]=sha(path.join(out,name));}
  for(const [name,from] of [['icons.js','docs/storyboard/icons.js'],['icons.LICENSE','docs/storyboard/icons.LICENSE'],['CONTENT-LICENSE.md','CONTENT-LICENSE.md']])fs.copyFileSync(path.join(ROOT,from),path.join(out,name));
  fs.writeFileSync(path.join(out,'index.html'),html,{flag:'wx'});
  fs.writeFileSync(path.join(out,'review-provenance.json'),JSON.stringify({version:1,assets:[...records.values()],helpers,native},null,2)+'\n',{flag:'wx'});
  return path.join(out,'index.html');
}
if(require.main===module){try{const {values}=parseArgs({options:{trial:{type:'string'},manifest:{type:'string'},out:{type:'string'}}});console.log(build(values));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={build,exactPrompt};
