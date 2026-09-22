#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');
const {pathToFileURL} = require('node:url');
const {createHash} = require('node:crypto');
const ROOT = fs.realpathSync(path.resolve(__dirname, '..'));
const inside = (root, name) => name === root || name.startsWith(root + path.sep);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const embeddedJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function identity(filename) {
  const hash = createHash('sha256'), buffer = Buffer.alloc(1024 * 1024), fd = fs.openSync(filename, 'r');
  let bytes = 0;
  try { for (let count; (count = fs.readSync(fd, buffer, 0, buffer.length, null));) {hash.update(buffer.subarray(0, count)); bytes += count;} }
  finally {fs.closeSync(fd);}
  return {bytes, sha256: hash.digest('hex')};
}

function readManifest(trial, filename) {
  const root = fs.realpathSync(trial);
  assert(!inside(ROOT, root), 'Trial must be outside the checkout');
  const source = fs.realpathSync(path.resolve(root, filename));
  assert(inside(root, source), 'Manifest must be inside trial');
  const manifest = JSON.parse(fs.readFileSync(source, 'utf8'));
  assert(manifest.version === 1 && Array.isArray(manifest.angles) &&
    (manifest.angles.length === 2 || (manifest.bookOnly && manifest.angles.length === 0)),
    'Expected version 1 and two historical angles, or an empty array for a book-only report');
  if (manifest.angles.length) assert(manifest.angles[0].degrees === 105 && manifest.angles[1].degrees === 120, 'Expected angles 105 then 120');
  const verdict = manifest.verdict || 'uncertified';
  assert(['uncertified', 'rejected-gait'].includes(verdict), 'Unsupported review verdict');
  assert(manifest.reviewNotes === undefined || (typeof manifest.reviewNotes === 'string' && manifest.reviewNotes.length <= 4000), 'Invalid review notes');
  function asset(name, extensions) {
    if (name === null || name === undefined) return null;
    assert(typeof name === 'string' && name && !path.isAbsolute(name) && !name.includes('\\') &&
      name.split('/').every(part => part && part !== '.' && part !== '..'), 'Expected safe trial-relative asset');
    const resolved = fs.realpathSync(path.join(root, name));
    assert(inside(root, resolved) && fs.statSync(resolved).isFile(), 'Asset escapes trial or is not a file');
    assert(extensions.includes(path.extname(name).toLowerCase()), 'Unsupported asset extension');
    return resolved;
  }
  const pictures = ['.png', '.webp', '.jpg', '.jpeg'];
  const videos = ['.mp4', '.webm', '.mov'];
  const angles = manifest.angles.map(record => {
    const nativeVideo = asset(record.nativeVideo, videos);
    assert(record.contacts === undefined || Array.isArray(record.contacts), 'contacts must be an array');
    const contacts = (record.contacts || []).map(name => {
      const file = asset(name, pictures); assert(file, 'Contact path cannot be null'); return file;
    });
    assert(contacts.length <= 64, 'Too many contact sheets');
    let cycle = null;
    if (record.cycle != null) {
      const input = record.cycle;
      assert(typeof input === 'object' && input.durationSeconds === 1, 'Selected cycle must target exactly one second');
      assert(typeof input.certified === 'boolean', 'Cycle certification must be explicit');
      assert(verdict !== 'rejected-gait' || !input.certified, 'Rejected gait cannot be certified');
      assert(input.boundaryPose === null || (typeof input.boundaryPose === 'string' && input.boundaryPose.length <= 200), 'Specify boundaryPose string or null');
      assert(Array.isArray(input.frames) && input.frames.length <= 120, 'Expected at most 120 ordered cycle frames');
      const frames = input.frames.map(name => {const file = asset(name, pictures); assert(file, 'Frame path cannot be null'); return file;});
      assert(new Set(frames).size === frames.length, 'Cycle frame paths must be distinct; do not duplicate endpoint');
      if (input.certified) assert(frames.length >= 2 && input.boundaryPose, 'Certification requires frames and boundary pose');
      cycle = {durationSeconds: 1, certified: input.certified, boundaryPose: input.boundaryPose,
        frames, video: asset(input.video, videos)};
    }
    const anchor = asset(record.anchor, pictures);
    let submission = null;
    if (record.submission) {
      const saved = JSON.parse(fs.readFileSync(asset(record.submission, ['.json']), 'utf8'));
      assert(anchor && identity(anchor).sha256 === saved.sourceHash, 'Submitted anchor hash differs');
      const input = saved.input;
      assert(typeof input.prompt === 'string', 'Saved submission needs exact prompt');
      const header = fs.readFileSync(anchor).subarray(0, 24);
      submission = {prompt: input.prompt, endpoint: saved.model, sourceHash: saved.sourceHash,
        sameStartEnd: Boolean(input.image_url && input.image_url === input.end_image_url),
        parameters: Object.fromEntries(['duration', 'fps', 'resolution', 'aspect_ratio', 'generate_audio'].map(key => [key, input[key]])),
        estimate: saved.priceEstimate?.amount, createdAt: saved.createdAt, updatedAt: saved.updatedAt,
        events: (saved.events || []).map(({at, type}) => ({at, type})),
        anchorDimensions: header.subarray(1,4).toString() === 'PNG' ? `${header.readUInt32BE(16)} x ${header.readUInt32BE(20)}` : 'See source image',
        outputDimensions: `${saved.metadata?.width} x ${saved.metadata?.height}`};
    }
    return {degrees: record.degrees, nativeVideo, anchor, contacts, cycle, submission};
  });
  const appearanceRecord = asset(manifest.appearanceRecord, ['.md']);
  let bookOnly = null;
  if (manifest.bookOnly) {
    const input = manifest.bookOnly;
    assert(Array.isArray(input.references) && input.references.length === 2, 'Book-only trial requires exactly two original references');
    const record = asset(input.record, ['.md']), image = asset(input.image, pictures);
    assert(record && image, 'Book-only image and exact-prompt record required');
    const text = fs.readFileSync(record, 'utf8'), references = input.references.map(name => asset(name, pictures));
    assert(references.every(file => file && text.includes(identity(file).sha256)), 'Book references must match hashes in exact-prompt record');
    const video = asset(input.video, videos);
    let submission = null;
    if (input.submission) {
      const saved = JSON.parse(fs.readFileSync(asset(input.submission, ['.json']), 'utf8'));
      assert(saved.sourceHash === identity(image).sha256, 'Book-only video must use the unchanged original reference');
      const keys = ['image_url', 'first_image_url', 'end_image_url', 'last_image_url'].filter(key => saved.input[key]);
      if (video) assert(saved.metadata?.sha256 === identity(video).sha256, 'Book-only native video hash differs');
      submission = {status: saved.status, prompt: saved.input.prompt, endpoint: saved.model,
        sourceHash: saved.sourceHash, inputFields: keys,
        sameStartEnd: keys.length >= 2 && keys.every(key => saved.input[key] === saved.input[keys[0]]),
        parameters: Object.fromEntries(['duration', 'fps', 'resolution', 'aspect_ratio', 'generate_audio',
          'generate_audio_switch', 'generate_multi_clip_switch', 'thinking_type', 'seed'].filter(key => key in saved.input).map(key => [key, saved.input[key]])),
        estimate: saved.priceEstimate?.amount, metadata: saved.metadata || null,
        events: (saved.events || []).map(({at, type}) => ({at, type}))};
    }
    assert(input.reviewNotes === undefined || typeof input.reviewNotes === 'string', 'Invalid book-only review notes');
    bookOnly = {image, record, text, references, video, submission, reviewNotes: input.reviewNotes || ''};
  }
  return {version: 1, title: typeof manifest.title === 'string' ? manifest.title : 'Mr. PinPin / video sprite trial',
    bookOnly,
    verdict, reviewNotes: manifest.reviewNotes || '', guidePair: asset(manifest.guidePair, pictures),
    appearancePair: asset(manifest.appearancePair, pictures), appearanceRecord,
    appearanceText: appearanceRecord ? fs.readFileSync(appearanceRecord, 'utf8') : '',
    bookReferences: (manifest.bookReferences || []).map(name => asset(name, pictures)), angles};
}

function build({trial, manifest = 'review-manifest.json', out}) {
  assert(trial && out, 'Specify --trial and --out');
  const data = readManifest(trial, manifest);
  const requested = path.resolve(out), parent = fs.realpathSync(path.dirname(requested));
  assert(parent === path.dirname(requested), 'Use canonical output parent, not a symlink');
  assert(!inside(ROOT, requested), 'Output must be outside the checkout');
  const copies = new Map();
  function copy(source) {
    if (!source) return null;
    if (!copies.has(source)) copies.set(source, `assets/${String(copies.size).padStart(3, '0')}${path.extname(source).toLowerCase()}`);
    return copies.get(source);
  }
  for (const angle of data.angles) {
    angle.nativeVideo = copy(angle.nativeVideo);
    angle.anchor = copy(angle.anchor);
    angle.contacts = angle.contacts.map(copy);
    if (angle.cycle) {
      angle.cycle.video = copy(angle.cycle.video);
      angle.cycle.frames = angle.cycle.frames.map(copy);
    }
  }
  data.guidePair = copy(data.guidePair);
  data.appearancePair = copy(data.appearancePair);
  data.appearanceRecord = copy(data.appearanceRecord);
  data.bookReferences = data.bookReferences.map(copy);
  if (data.bookOnly) {
    data.bookOnly.image = copy(data.bookOnly.image);
    data.bookOnly.record = copy(data.bookOnly.record);
    data.bookOnly.video = copy(data.bookOnly.video);
    data.bookOnly.references = data.bookOnly.references.map(copy);
  }
  const e = escapeHTML;
  const video = (url, label, loop = false) => url ? `<video controls playsinline ${loop ? 'loop muted' : ''} preload="metadata" aria-label="${label}" src="${url}"></video><output class="duration">Duration pending metadata</output><br><a href="${url}">Open original file</a>` : '<p class="pending">Native video pending</p>';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(data.title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#20242b;font:15px/1.5 system-ui,sans-serif;letter-spacing:0}main{max-width:1180px;margin:auto;padding:24px}h1{font-size:26px;line-height:1.2;margin:0 0 12px}h2{font-size:20px;margin:0 0 12px}h3{font-size:16px}p{margin:8px 0}header,section{padding:20px 0;border-bottom:1px solid #ccd2da}.native-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}figure{margin:0;min-width:0}video{display:block;width:100%;aspect-ratio:1;object-fit:contain;background:#17191c}a{color:#166d65;overflow-wrap:anywhere}figcaption{font-weight:650;margin:8px 0}.pending,.warning{color:#a12e43}.preview{position:relative;max-width:640px;width:100%;aspect-ratio:1;background:#e5e9ee;overflow:hidden}.preview img{position:absolute;width:100%;height:100%;object-fit:contain;inset:0;visibility:hidden}.preview img.active{visibility:visible}.placeholder{padding:24px}.controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:16px 0}button{width:44px;height:44px;border:1px solid #86939f;border-radius:4px;background:white;color:#174b44;font-size:22px;cursor:pointer}button:disabled{opacity:.45;cursor:default}button:focus-visible{outline:3px solid #167b6c;outline-offset:3px}button[aria-pressed=true]{background:#d4e9e0}output{font-variant-numeric:tabular-nums;overflow-wrap:anywhere}dl{display:grid;grid-template-columns:140px minmax(0,1fr);gap:8px;margin:12px 0}dt{color:#56616a}dd{margin:0;overflow-wrap:anywhere}.contacts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.contacts img{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:contain;background:#e5e9ee}.contacts figcaption{font-size:12px}.error{color:#a12e43;overflow-wrap:anywhere}small{color:#56616a}
video{aspect-ratio:16/9;max-height:70vh}.contact-sheets{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}.contact-sheets img{display:block;width:100%;height:auto}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 ui-monospace,monospace}.anchor{display:block;width:100%;max-height:70vh;object-fit:contain}.lineage img{display:block;width:100%;height:auto}.pipeline{font-weight:650;color:#235c51}
@media(max-width:650px){main{padding:16px}.native-grid{grid-template-columns:minmax(0,1fr)}h1{font-size:23px}.contacts{grid-template-columns:repeat(2,minmax(0,1fr))}dl{grid-template-columns:112px minmax(0,1fr)}}
</style></head><body><main><header><h1>${e(data.title)}</h1><p class="warning">${data.bookOnly ? (data.bookOnly.submission ? 'BOOK-ONLY VIDEO TRIAL / AWAITING REVIEW' : 'NEW BOOK-ONLY REFERENCE / NOT YET APPROVED') : data.verdict === 'rejected-gait' ? 'REJECTED GAIT / PROVISIONAL TIMING ONLY' : 'EXPERIMENTAL / NOT PRODUCTION APPROVED'}</p>${!data.bookOnly && data.reviewNotes ? `<p>Reviewer notes: ${e(data.reviewNotes)}</p>` : ''}</header>
${data.bookOnly ? `<section id="book-only" class="lineage"><h2>Fresh walking reference / original book inputs only</h2><p class="pipeline">Only the two original book illustrations below were input. No rig, pose guide, prior generated image, rig-derived anchor, or video was supplied.</p><p>Reference candidate only; not approved. Four paws are visible, but this still establishes no motion or gait. The view is front-three-quarter rather than the requested rearward side view; no exact angle is claimed.</p><div class="native-grid"><figure><img id="book-only-image" style="background:#fff" src="${data.bookOnly.image}" alt="Fresh book-only walking reference, original alpha shown against white"><figcaption>Original delivered image / alpha preserved, displayed on white</figcaption></figure>${data.bookOnly.submission ? `<figure><figcaption>Native single-view video / original timing</figcaption>${video(data.bookOnly.video, 'Book-only single-view native video', true)}</figure>` : ''}</div>${data.bookOnly.submission ? `<h3>One-view video retry / no angle transition</h3><p>Endpoint: ${e(data.bookOnly.submission.endpoint)}. Recorded status: ${e(data.bookOnly.submission.status)}. Estimate: USD ${e(data.bookOnly.submission.estimate)}, not an invoice.</p><p>Original reference used unchanged. Submitted image fields: ${e(data.bookOnly.submission.inputFields.join(', '))}. Same start/end image: ${data.bookOnly.submission.sameStartEnd ? 'yes' : 'not confirmed'}.</p><p>No accepted gait or seamless-loop certification. Model, reference, and duration changed together; this is not a controlled proof that the rig caused all earlier failures.</p>${data.bookOnly.reviewNotes ? `<p class="warning" id="native-review">${e(data.bookOnly.reviewNotes)}</p>` : ''}<h3>Exact submitted video prompt</h3><pre id="book-only-video-prompt">${e(data.bookOnly.submission.prompt)}</pre><h3>Actual video parameters</h3><pre>${e(JSON.stringify(data.bookOnly.submission.parameters, null, 2))}</pre><p>Original input SHA-256:</p><pre>${e(data.bookOnly.submission.sourceHash)}</pre><p>Recorded submission events:</p><pre>${e(JSON.stringify(data.bookOnly.submission.events, null, 2))}</pre>` : '<p>No video submission is included in this report edition.</p>'}<h3>The only two input images</h3><div class="native-grid">${data.bookOnly.references.map((url,i)=>`<figure><figcaption>Original book ${i===0?'face':'body'} reference</figcaption><img src="${url}" alt="Book-only trial input ${i+1}: original ${i===0?'face':'body'} illustration"></figure>`).join('')}</div><h3>Exact submitted prompt and generation record</h3><pre id="book-only-prompt">${e(data.bookOnly.text)}</pre><a href="${data.bookOnly.record}">Original book-only provenance Markdown</a></section>${data.angles.length ? `<section><h2>Historical rig-derived trial / rejected by the user</h2><p class="warning">REJECTED GAIT / RETAINED AS EVIDENCE ONLY</p><p>The sections below describe the earlier, rejected workflow. None of these rig-derived images were inputs to the fresh book-only reference above.</p><p>${e(data.reviewNotes)}</p></section>` : ''}` : ''}
${data.angles.map(angle => `<section class="input-output"><h2>Nominal ${angle.degrees}&deg; / exact input and native output</h2><div class="native-grid"><figure><figcaption>Actual cropped still / START and END input</figcaption>${angle.anchor ? `<img class="anchor" src="${angle.anchor}" alt="Actual video input anchor for nominal ${angle.degrees} degrees">` : '<p>Anchor not supplied</p>'}</figure><figure><figcaption>Native video / original timing</figcaption>${video(angle.nativeVideo, `${angle.degrees} degrees native video`)}</figure></div>${angle.submission ? `<h3>Exact submitted video prompt</h3><pre class="video-prompt">${e(angle.submission.prompt)}</pre><h3>Actual submitted parameters</h3><pre>${e(JSON.stringify(angle.submission.parameters, null, 2))}</pre><p>Endpoint: ${e(angle.submission.endpoint)}. Estimate: USD ${e(angle.submission.estimate)} for this call, not an invoice.</p><p class="pipeline">${angle.submission.sameStartEnd ? 'The exact same cropped still was supplied as BOTH start and end image.' : 'Start/end identity was not confirmed.'} No rig video or pose-frame sequence was submitted to the video model.</p><p>Input: ${e(angle.submission.anchorDimensions)} pixels. Native output: ${e(angle.submission.outputDimensions)} pixels. Square input became a wide output; framing is not preserved by an identical aspect ratio.</p><p>Source SHA-256:</p><pre>${e(angle.submission.sourceHash)}</pre><p>Provider workflow timestamps (UTC):</p><pre>${e(JSON.stringify(angle.submission.events, null, 2))}</pre>` : '<p>Submission provenance pending.</p>'}</section>`).join('')}
${data.appearanceRecord ? `<section class="lineage"><h2>Whole input lineage / before the video calls</h2><p class="pipeline">1. Neutral rig phase-zero pair + book face/body references to image generation. 2. Deterministic equal-half crops of its paired appearance output. 3. Each cropped still used unchanged as that video\'s start AND end image.</p><p>The 15-degree difference is exact only in the rig cameras. Generated appearance/video views are nominal, not calibrated. Anchor leg anatomy is unapproved and some far-side feet are occluded.</p>${data.guidePair ? `<figure><figcaption>Input 1 / neutral rig, phase zero, two exact camera angles</figcaption><img src="${data.guidePair}" alt="Actual neutral rig pair input"></figure>` : ''}<div class="native-grid">${data.bookReferences.map((url,i)=>`<figure><figcaption>Input ${i+2} / book ${i===0?'face':'body'} reference</figcaption><img src="${url}" alt="Actual book ${i===0?'face':'body'} reference input"></figure>`).join('')}</div>${data.appearancePair ? `<figure><figcaption>Image-generation output / paired appearance anchors before cropping</figcaption><img src="${data.appearancePair}" alt="Actual paired appearance output"></figure>` : ''}<h3>Exact image-generation prompt and execution record</h3><pre>${e(data.appearanceText)}</pre><a href="${data.appearanceRecord}">Original appearance provenance Markdown</a></section>` : ''}
<section${data.angles.length ? '' : ' hidden'}><h2>Selected-cycle preview</h2><p id="certification" class="warning">Cycles pending</p><div id="preview" class="preview"><p class="placeholder" id="placeholder">Selected cycle frames pending</p></div><div class="controls"><button id="left" title="Queue 105 degrees" aria-label="Queue 105 degrees" disabled>&#8592;</button><output id="angle">105 degrees</output><button id="right" title="Queue 120 degrees" aria-label="Queue 120 degrees" disabled>&#8594;</button><button id="play" title="Play selected cycle" aria-label="Play selected cycle" disabled>&#9654;</button></div><dl><dt>Playback</dt><dd id="playback">Pending</dd><dt>Target cycle</dt><dd>1.000 seconds</dd><dt>Phase / frame</dt><dd id="phase">Pending</dd><dt>Queued angle</dt><dd id="queued">None</dd><dt>Current wait</dt><dd id="wait">0 ms</dd><dt>Last switch wait</dt><dd id="latency">No switch yet</dd><dt>Shared boundary</dt><dd id="boundary">Not supplied</dd></dl><p id="error" class="error" role="alert"></p></section>
${data.angles.map(angle => `<section><h2>Nominal ${angle.degrees}&deg; / selected frames and contacts</h2>${angle.cycle?.video ? `<h3>Retimed candidate / not automatically a seamless cycle</h3>${video(angle.cycle.video, `${angle.degrees} degrees extracted clip`)}` : ''}<div class="contacts">${(angle.cycle?.frames || []).map((url, i) => `<figure><img loading="lazy" src="${url}" alt="${angle.degrees} degree frame ${i + 1}"><figcaption>Frame ${i + 1}</figcaption></figure>`).join('')}</div><div class="contact-sheets">${angle.contacts.map(url=>`<figure><figcaption>Native contact sheet</figcaption><img loading="lazy" src="${url}" alt="${angle.degrees} degree native contact sheet"></figure>`).join('')}</div>${!angle.cycle ? '<p class="pending">Extraction pending</p>' : ''}</section>`).join('')}
${data.angles.some(angle=>angle.anchor)||data.guidePair?`<section><h2>Appearance anchors / rig guide</h2><div class="native-grid">${data.angles.filter(angle=>angle.anchor).map(angle=>`<figure><figcaption>Nominal ${angle.degrees}&deg; appearance anchor</figcaption><img style="width:100%;height:auto" src="${angle.anchor}" alt="Appearance anchor for nominal ${angle.degrees} degrees"></figure>`).join('')}</div>${data.guidePair?`<figure><figcaption>Rig guide pair</figcaption><img style="width:100%;height:auto" src="${data.guidePair}" alt="Supplied rig guide pair"></figure>`:''}</section>`:''}
</main><script id="review-data" type="application/json">${embeddedJSON(data)}</script><script src="boundary.js"></script><script>
'use strict';
const data=JSON.parse(document.getElementById('review-data').textContent), el=id=>document.getElementById(id);
let state=createBoundaryState(1000), elapsed=0, previous=null, running=false, ready=false, visible=false, raf=0, lastPaint='';
const images=[[],[]], cycles=data.angles.map(a=>a.cycle);
const shared=cycles.length===2&&cycles.every(c=>c&&c.boundaryPose)&&cycles[0].boundaryPose===cycles[1].boundaryPose;
el('boundary').textContent=shared?cycles[0].boundaryPose:'Not matched / not certified';
el('certification').textContent=cycles.length===2&&cycles.every(c=>c&&c.frames.length>=2)?
 (data.verdict==='rejected-gait'?'REJECTED GAIT / provisional one-second timing only':shared&&cycles.every(c=>c.certified)?'Cycle and shared boundary certified by supplied manifest; not independently certified here':'UNCERTIFIED CYCLES / experimental timed playback only'):'Cycles pending / native outputs remain available';
function draw(){const index=Math.min(images[state.active].length-1,Math.floor((elapsed%1000)/1000*images[state.active].length));const key=state.active+':'+index;if(key!==lastPaint&&index>=0){document.querySelectorAll('.preview img.active').forEach(img=>img.classList.remove('active'));images[state.active][index].classList.add('active');lastPaint=key;}el('angle').textContent=data.angles[state.active].degrees+' degrees';el('phase').textContent=((elapsed%1000)/1000).toFixed(3)+' / '+(index+1)+' of '+images[state.active].length;el('queued').textContent=state.pending===null?'None':data.angles[state.pending].degrees+' degrees';el('latency').textContent=state.lastLatencyMs===null?'No switch yet':Math.round(state.lastLatencyMs)+' ms';el('preview').dataset.angle=data.angles[state.active].degrees;el('preview').dataset.frame=index;el('left').setAttribute('aria-pressed',state.active===0);el('right').setAttribute('aria-pressed',state.active===1);}
function active(){return ready&&running&&visible&&!document.hidden;}
function waitStatus(now){el('wait').textContent=state.requestedAt===null?'0 ms':active()?Math.round(now-state.requestedAt)+' ms':'Pending / playback paused';}
function tick(now){raf=0;if(!active()){previous=null;return;}if(previous!==null)elapsed+=now-previous;previous=now;state=advanceBoundary(state,elapsed,now);draw();waitStatus(now);raf=requestAnimationFrame(tick);}
function sync(){if(active()){if(!raf)raf=requestAnimationFrame(tick);}else{cancelAnimationFrame(raf);raf=0;previous=null;}el('playback').textContent=!ready?'Pending':document.hidden?'Paused while hidden':!visible?'Paused while offscreen':running?'Playing forward':'Paused';waitStatus(performance.now());}
function queue(index){if(!ready)return;state=queueAngle(state,index,performance.now());draw();waitStatus(performance.now());}
el('left').onclick=()=>queue(0);el('right').onclick=()=>queue(1);
el('play').onclick=()=>{if(!ready)return;running=!running;previous=null;el('play').innerHTML=running?'&#10074;&#10074;':'&#9654;';el('play').title=el('play').ariaLabel=running?'Pause selected cycle':'Play selected cycle';sync();};
document.addEventListener('visibilitychange',()=>{previous=null;if(document.hidden)document.querySelectorAll('video').forEach(video=>video.pause());sync();});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0.01}).observe(el('preview'));
const videoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)entry.target.pause();}),{threshold:0.01});document.querySelectorAll('video').forEach(video=>videoObserver.observe(video));
async function prepare(){if(cycles.length!==2||!cycles.every(c=>c&&c.frames.length>=2))return;try{for(let a=0;a<2;a++){for(const url of cycles[a].frames){const img=new Image();img.alt=data.angles[a].degrees+' degree selected cycle';img.src=url;await img.decode();if(images[a].length&&(img.naturalWidth!==images[a][0].naturalWidth||img.naturalHeight!==images[a][0].naturalHeight))throw Error('Inconsistent frame dimensions');images[a].push(img);}}if(images[0][0].naturalWidth!==images[1][0].naturalWidth||images[0][0].naturalHeight!==images[1][0].naturalHeight)throw Error('Angle frame dimensions differ');images.flat().forEach(img=>el('preview').append(img));el('placeholder').hidden=true;ready=true;['left','right','play'].forEach(id=>el(id).disabled=false);el('playback').textContent='Paused';draw();}catch(error){el('error').textContent='Selected-cycle preview unavailable: '+error.message;el('playback').textContent='Decode failed';}}
document.querySelectorAll('video').forEach(video=>{video.addEventListener('loadedmetadata',()=>{video.nextElementSibling.textContent=Number.isFinite(video.duration)?video.duration.toFixed(3)+' seconds / decoded duration':'Duration unavailable';});video.addEventListener('error',()=>{el('error').textContent='A video could not be decoded by this browser. Its original file link remains available.';});});
prepare();
</script></body></html>`;
  fs.mkdirSync(requested);
  fs.mkdirSync(path.join(requested, 'assets'));
  const provenance = [];
  for (const [source, relative] of copies) {
    const destination = path.join(requested, relative);
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    const original = identity(source), copied = identity(destination);
    assert(original.bytes === copied.bytes && original.sha256 === copied.sha256, 'Source changed while copying');
    provenance.push({source, output: relative, ...copied});
  }
  fs.copyFileSync(path.join(__dirname, 'video-sprite-boundary.cjs'), path.join(requested, 'boundary.js'), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(requested, 'index.html'), html, {flag: 'wx'});
  fs.writeFileSync(path.join(requested, 'review-provenance.json'), JSON.stringify({version: 1, trial: fs.realpathSync(trial), assets: provenance, manifest: data}, null, 2) + '\n', {flag: 'wx'});
  return path.join(requested, 'index.html');
}

if (require.main === module) {
  try {
    const {values} = parseArgs({options: {trial: {type: 'string'}, manifest: {type: 'string'}, out: {type: 'string'}, help: {type: 'boolean'}}});
    if (values.help) console.log('node scripts/build-video-sprite-review.cjs --trial EXTERNAL_TRIAL --manifest review-manifest.json --out NEW_EXTERNAL_REVIEW\nNo media generation or paid calls. Paths in manifest are trial-relative. Native clips may be null while pending.');
    else console.log(pathToFileURL(build(values)).href);
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
module.exports = {build, readManifest, embeddedJSON};
