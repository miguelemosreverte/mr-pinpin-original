#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {parseArgs} = require('node:util');
const {pathToFileURL} = require('node:url');
const ROOT = fs.realpathSync(path.resolve(__dirname, '..'));
const within = (root, name) => name === root || name.startsWith(root + path.sep);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function identity(filename) {
  const fd = fs.openSync(filename, 'r'), buffer = Buffer.alloc(1024 * 1024), hash = createHash('sha256');
  let bytes = 0;
  try {for (let n; (n = fs.readSync(fd, buffer, 0, buffer.length, null));) {bytes += n; hash.update(buffer.subarray(0,n));}}
  finally {fs.closeSync(fd);}
  return {bytes, sha256: hash.digest('hex')};
}

function exactPrompt(markdown) {
  const match = /^## Exact (?:submitted )?(?:image[- ]edit |edit )?prompt\s*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/im.exec(markdown);
  assert(match && match[1].trim(), 'Image-edit record needs an Exact submitted prompt section');
  return match[1].trim();
}

function load(trial, manifest) {
  trial = fs.realpathSync(trial);
  assert(!within(ROOT, trial), 'Trial must be outside checkout');
  function source(name, extensions) {
    if (name == null) return null;
    assert(typeof name === 'string' && name && !path.isAbsolute(name) && !name.includes('\\') &&
      name.split('/').every(p => p && p !== '.' && p !== '..'), 'Expected trial-relative path');
    const resolved = fs.realpathSync(path.join(trial, name));
    assert(within(trial, resolved) && fs.statSync(resolved).isFile(), 'Source escapes trial or is not regular');
    assert(extensions.includes(path.extname(resolved).toLowerCase()), 'Unsupported file type');
    return resolved;
  }
  const manifestPath = source(manifest, ['.json']);
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(data.version === 1 && data.previous && data.current, 'Expected version 1, previous and current');
  assert(Array.isArray(data.bookReferences) && data.bookReferences.length === 2, 'Expected two original book references');
  const pictures = ['.png','.webp','.jpg','.jpeg'];
  const rows = ['previous','current'].map(key => {
    const input = data[key], image = source(input.image, pictures), video = source(input.video, ['.mp4','.webm','.mov']);
    let submission = null;
    if (input.submission) {
      const saved = JSON.parse(fs.readFileSync(source(input.submission, ['.json']), 'utf8'));
      assert(image && saved.sourceHash === identity(image).sha256, 'Video input hash differs from submitted source');
      if (video) assert(saved.metadata?.sha256 === identity(video).sha256, 'Native video hash differs');
      assert(typeof saved.input?.prompt === 'string', 'Exact submitted video prompt missing');
      const fields = ['image_url','first_image_url','end_image_url','last_image_url'].filter(k => saved.input[k]);
      submission = {prompt: saved.input.prompt, endpoint: saved.model, status: saved.status,
        sourceHash: saved.sourceHash, estimateUSD: saved.priceEstimate?.amount,
        imageFields: fields, sameStartEnd: fields.length >= 2 && fields.every(k => saved.input[k] === saved.input[fields[0]]),
        parameters: Object.fromEntries(['duration','fps','resolution','aspect_ratio','generate_audio','generate_audio_switch',
          'generate_multi_clip_switch','thinking_type','seed'].filter(k => k in saved.input).map(k => [k,saved.input[k]])),
        events: (saved.events || []).map(({at,type}) => ({at,type}))};
    }
    const editRecord = source(input.editRecord, ['.md']);
    const opacityAudit = source(input.opacityAudit, ['.json']);
    const audit = opacityAudit ? JSON.parse(fs.readFileSync(opacityAudit, 'utf8')) : null;
    if (audit) {
      assert(image && audit.sha256 === identity(image).sha256, 'Opacity audit image hash differs');
      const a = audit.alpha;
      assert(Number.isSafeInteger(audit.width) && audit.width > 0 && Number.isSafeInteger(audit.height) && audit.height > 0 &&
        a && typeof a.all_255 === 'boolean' && a.all_255 === (a.opaque_pixels === audit.width * audit.height) &&
        [a.opaque_pixels,a.fully_transparent_pixels,a.partially_transparent_pixels].every(n => Number.isSafeInteger(n) && n >= 0) &&
        a.opaque_pixels + a.fully_transparent_pixels + a.partially_transparent_pixels === audit.width * audit.height, 'Invalid audited pixel counts');
    }
    const contacts = (input.contacts || []).map(name => source(name, pictures));
    assert(contacts.every(Boolean) && contacts.length <= 8, 'Expected up to eight contact images');
    assert(input.notes === undefined || typeof input.notes === 'string', 'Review notes must be text');
    return {key, image, video, submission, editRecord, editPrompt: editRecord ? exactPrompt(fs.readFileSync(editRecord,'utf8')) : null,
      opacityAudit, audit, contacts, notes: input.notes || ''};
  });
  return {trial, rows, references: data.bookReferences.map(name => source(name, pictures))};
}

function build({trial, manifest = 'review-manifest.json', out}) {
  assert(trial && out, 'Specify --trial and --out');
  const data = load(trial, manifest), destination = path.resolve(out);
  assert(fs.realpathSync(path.dirname(destination)) === path.dirname(destination), 'Use canonical output parent');
  assert(!within(ROOT, destination), 'Output must be outside checkout');
  const copies = new Map();
  function asset(source) {
    if (!source) return null;
    if (!copies.has(source)) copies.set(source, `assets/${String(copies.size).padStart(3,'0')}${path.extname(source)}`);
    return copies.get(source);
  }
  const image = (file, alt) => file ? `<img src="${asset(file)}" alt="${escape(alt)}">` : '<p class="pending">Image pending</p>';
  const video = (file, alt) => file ? `<video controls loop muted playsinline preload="metadata" src="${asset(file)}" aria-label="${escape(alt)}"></video><output class="duration">Duration pending metadata</output><p><a href="${asset(file)}">Unchanged native file</a></p>` : '<p class="pending">Native video pending</p>';
  function opacity(row) {
    if (!row.audit) return '<p class="pending">Pixel-opacity audit pending</p>';
    const a = row.audit, n = value => value.toLocaleString('en-US');
    const border = a.border_band_16px;
    const detail = a.alpha.all_255 ? `${n(a.alpha.opaque_pixels)} opaque pixels; no transparent or partially transparent pixels.` :
      `${n(a.alpha.fully_transparent_pixels)} fully transparent, ${n(a.alpha.partially_transparent_pixels)} partially transparent, ${n(a.alpha.opaque_pixels)} opaque pixels.`;
    return `<p class="opacity-summary">${a.width}x${a.height} ${escape(a.source_pixel_format)}: ${detail} ${a.alpha.all_255 && border ? `Outer 16px border RGB ${Math.min(...border.min_rgba.slice(0,3))}-${Math.max(...border.max_rgba.slice(0,3))}, near-white rather than uniformly pure white.` : ''}</p><a href="${asset(row.opacityAudit)}">Full pixel audit</a>`;
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mr. PinPin / white-background test</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f8fa;color:#20252b;font:15px/1.55 system-ui,sans-serif;letter-spacing:0}main{max-width:1180px;margin:auto;padding:24px}header,section{padding:22px 0;border-bottom:1px solid #cbd3da}h1{font-size:27px;line-height:1.2;margin:0 0 12px}h2{font-size:21px;margin:0 0 14px}h3{font-size:17px}p{margin:10px 0}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}figure{margin:0;min-width:0}figcaption{font-weight:650;margin-bottom:8px}img{display:block;width:100%;height:auto;object-fit:contain;background:white}video{display:block;width:100%;aspect-ratio:16/9;max-height:70vh;object-fit:contain;background:#111}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 ui-monospace,monospace}a{color:#176b5b;overflow-wrap:anywhere}.pending,.status{color:#9b3044}.contacts{display:grid;gap:18px;margin-top:20px}output{font-variant-numeric:tabular-nums}#errors{color:#9b3044;overflow-wrap:anywhere}@media(max-width:650px){main{padding:16px}.pair{grid-template-columns:minmax(0,1fr)}h1{font-size:23px}}
code,.parameters{overflow-wrap:anywhere}
</style></head><body><main><header><h1>Mr. PinPin / white-background test</h1><p class="status">Single-view comparison / no accepted gait or seamless-loop certification</p><p>Exact input images and unchanged native outputs. A white CSS viewing surface does not prove image opacity; the pixel audit is recorded separately.</p><p id="errors" role="alert"></p></header>
<section id="comparison"><h2>Input and native-output comparison</h2>${data.rows.map(row => `<div id="${row.key}"><h3>${row.key === 'previous' ? 'Previous RGBA input / previous native output' : 'New opaque edit / new native output'}</h3><div class="pair"><figure><figcaption>Actual video input / unchanged image</figcaption>${image(row.image, `${row.key} actual video input`)}</figure><figure><figcaption>Native output / original timing</figcaption>${video(row.video, `${row.key} native video`)}</figure></div>${opacity(row)}${row.notes ? `<p class="status">${escape(row.notes)}</p>` : ''}<div class="contacts">${row.contacts.map(file=>image(file,`${row.key} native frame contact sheet`)).join('')}</div></div>`).join('')}<p>This single-view comparison is not an angle expansion. The image edit can change fine details, and video generation is stochastic; any improvement does not isolate alpha as the sole cause.</p></section>
<section id="provenance"><h2>Exact inputs and provenance</h2><p>The white-background image edit used ONLY the previous book-only RGBA reference. Previous video: RGBA still as first/end. New video: edited opaque still as first/end when confirmed by its record. The two book illustrations below are earlier identity lineage, not direct inputs to this edit.</p>${data.rows.filter(row=>row.key==='current').map(row=>row.editPrompt ? `<h3>Exact submitted image-edit prompt</h3><pre class="edit-prompt">${escape(row.editPrompt)}</pre><a href="${asset(row.editRecord)}">Original image-edit provenance record</a>` : '<p class="pending">Image-edit prompt pending</p>').join('')}${data.rows.map(row=>`<h3>${row.key==='previous'?'Previous':'New'} video / exact submitted prompt</h3>${row.submission ? `<pre class="video-prompt">${escape(row.submission.prompt)}</pre><p class="parameters">${escape(Object.entries(row.submission.parameters).map(([key,value])=>key+': '+JSON.stringify(value)).join('; '))}</p><p>Endpoint: ${escape(row.submission.endpoint)}. Status: ${escape(row.submission.status)}. Estimate: USD ${escape(row.submission.estimateUSD)}, not an invoice.</p><p>Image fields: ${escape(row.submission.imageFields.join(', '))}; same start/end still: ${row.submission.sameStartEnd?'yes':'not established'}.</p><p>Input SHA-256: <code>${escape(row.submission.sourceHash)}</code></p><p>Submitted: ${escape(row.submission.events.find(event=>event.type==='submitted')?.at || 'not recorded')}; completed: ${escape(row.submission.events.find(event=>event.type==='complete')?.at || 'not recorded')}.</p>` : '<p class="pending">Video submission record pending</p>'}`).join('')}<h3>Earlier identity lineage / original book references</h3><div class="pair">${data.references.map((file,i)=>`<figure><figcaption>Original book ${i===0?'face':'body'} reference</figcaption>${image(file,`Original book ${i===0?'face':'body'} reference`)}</figure>`).join('')}</div></section></main><script>
'use strict';
const videos=[...document.querySelectorAll('video')];
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)entry.target.pause();}),{threshold:0.01});
videos.forEach(video=>{observer.observe(video);video.addEventListener('loadedmetadata',()=>{video.nextElementSibling.textContent=Number.isFinite(video.duration)?video.duration.toFixed(6)+' seconds / decoded native duration':'Duration unavailable';});video.addEventListener('error',()=>{document.getElementById('errors').textContent='A native clip could not be decoded in this browser; its original file remains linked.';});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)videos.forEach(video=>video.pause());});
</script></body></html>`;
  fs.mkdirSync(destination); fs.mkdirSync(path.join(destination,'assets'));
  const provenance=[];
  for (const [source,relative] of copies) {
    const target=path.join(destination,relative);
    fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
    const original=identity(source), copied=identity(target);
    assert.deepEqual(copied,original,'Source changed during copy');
    provenance.push({source,output:relative,...copied});
  }
  fs.writeFileSync(path.join(destination,'index.html'),html,{flag:'wx'});
  fs.writeFileSync(path.join(destination,'review-provenance.json'),JSON.stringify({version:1,trial:data.trial,assets:provenance},null,2)+'\n',{flag:'wx'});
  return path.join(destination,'index.html');
}

if (require.main === module) {
  try {
    const {values}=parseArgs({options:{trial:{type:'string'},manifest:{type:'string'},out:{type:'string'},help:{type:'boolean'}}});
    if(values.help) console.log('node scripts/build-white-background-review.cjs --trial EXTERNAL_TRIAL --manifest review-manifest.json --out NEW_EXTERNAL_REVIEW\nPlanning/review only. No image or video calls. Existing output is never replaced.');
    else console.log(pathToFileURL(build(values)).href);
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
module.exports={build,load,exactPrompt};
