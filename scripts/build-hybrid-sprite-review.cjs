#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { pathToFileURL } = require('node:url');
const root = fs.realpathSync(path.resolve(__dirname, '..'));
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const embeddedJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function readStudy(directory, count) {
  const base = fs.realpathSync(directory);
  const study = JSON.parse(fs.readFileSync(path.join(base, 'study.json'), 'utf8'));
  if (study.frames !== count || !Array.isArray(study.renders) || study.renders.length !== count) {
    throw new Error(`Expected exactly ${count} renders in ${directory}`);
  }
  if (!Number.isInteger(study.size) || study.size < 1 || study.size > 4096) throw new Error('Invalid study size');
  const renders = [...study.renders].sort((a, b) => a.frame - b.frame);
  for (const [i, render] of renders.entries()) {
    if (render.frame !== i || !Number.isFinite(render.t) || Math.abs(render.t - i / count) > 1e-6 ||
        !Number.isFinite(render.angle_degrees) || render.angle_degrees !== renders[0].angle_degrees) {
      throw new Error('Expected one heading and evenly spaced, zero-based cycle frames');
    }
    const source = fs.realpathSync(path.resolve(base, render.path));
    if (!source.startsWith(base + path.sep) || !fs.statSync(source).isFile()) throw new Error('Frame outside study directory');
    render.source = source;
  }
  return { directory: base, frames: count, size: study.size, angle: renders[0].angle_degrees,
    description: study.description || '', coordinates: study.coordinates || study.coords || '', renders };
}

function build(options) {
  for (const key of ['four', 'eight', 'reference', 'out']) if (!options[key]) throw new Error(`Missing --${key}`);
  const studies = [readStudy(options.four, 4), readStudy(options.eight, 8)];
  if (studies[0].angle !== studies[1].angle || studies[0].size !== studies[1].size) throw new Error('Study heading and size must match');
  const requested = path.resolve(options.out);
  const out = path.join(fs.realpathSync(path.dirname(requested)), path.basename(requested));
  if (out === root || out.startsWith(root + path.sep)) throw new Error('--out must be outside the checkout');
  if (fs.existsSync(out)) throw new Error('--out must be a NEW directory');
  const copies = [];
  function asset(source, name) {
    const absolute = fs.realpathSync(source);
    const extension = path.extname(absolute).toLowerCase();
    if (!['.png', '.webp', '.jpg', '.jpeg'].includes(extension) || !fs.statSync(absolute).isFile()) throw new Error(`Expected raster image: ${source}`);
    const relative = `assets/${name}${extension}`;
    copies.push([absolute, relative]);
    return relative;
  }
  for (const study of studies) {
    for (const render of study.renders) render.url = asset(render.source, `${study.frames}-${render.frame}`);
    const plate = path.join(study.directory, 'control-2x2.png');
    if (fs.existsSync(plate)) study.plate = asset(plate, `plate-${study.frames}`);
  }
  const reference = asset(options.reference, 'reference');
  const candidate = options.candidate ? asset(options.candidate, 'candidate') : null;
  const promptPath = options.candidate && [`${options.candidate}.prompt.txt`, path.join(path.dirname(options.candidate), path.parse(options.candidate).name + '.md')].find(filename => fs.existsSync(filename));
  const prompt = promptPath ? fs.readFileSync(promptPath, 'utf8') : 'Generation prompt not supplied. No generated art is approved by this report.';
  const e = escapeHTML;
  const previews = studies.map(s => `<figure><figcaption>${s.frames} frames / 1 second</figcaption><div class="preview" data-loop data-count="${s.frames}"><img width="${s.size}" height="${s.size}" alt="${s.frames}-frame control study" src="${s.renders[0].url}"></div><output>Frame 1 / ${s.frames}</output></figure>`).join('');
  const loops = studies.map(s => ({ frames: s.frames, renders: s.renders.map(r => ({ url: r.url, t: r.t })) }));
  if (candidate) loops.push({ frames: 4, crop: true, renders: Array.from({ length: 4 }, (_, i) => ({ url: candidate, t: i / 4 })) });
  const strips = studies.map(s => `<section><h2>${s.frames}-frame sequence</h2><div class="strip">${s.renders.map(r => `<figure><img loading="lazy" decoding="async" width="${s.size}" height="${s.size}" src="${r.url}" alt="Control frame ${r.frame + 1}"><figcaption>${r.frame + 1} / t=${r.t}</figcaption></figure>`).join('')}</div>${s.plate ? `<img class="plate" loading="lazy" src="${s.plate}" alt="Complete supplied control plate">` : ''}</section>`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mr. PinPin - hybrid sprite study</title><style>
*{box-sizing:border-box}body{margin:0;background:#fafafa;color:#202322;font:15px/1.5 system-ui,sans-serif;letter-spacing:0}
main{max-width:1100px;margin:auto;padding:24px}h1{font-size:26px;line-height:1.2;margin:0 0 8px}h2{font-size:19px;margin:0 0 16px}p{margin:8px 0}header{border-bottom:1px solid #ccd2cf;padding-bottom:20px}.status{color:#9c263e;font-weight:650}label{display:inline-flex;align-items:center;gap:8px;margin-top:12px}input{width:18px;height:18px;accent-color:#19785d}
section{padding:24px 0;border-bottom:1px solid #ccd2cf}figure{margin:0;min-width:0}figcaption{font-weight:600;margin:6px 0}.previews{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.preview{width:100%;max-width:380px;aspect-ratio:1;background:#e8edeb}.preview img{display:block;width:100%;height:100%;object-fit:contain}output{display:block;font-variant-numeric:tabular-nums;min-height:24px;color:#58645e}
.strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.strip img{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:contain;background:#e8edeb}.strip figcaption{font-size:13px;font-weight:400}.plate,.reference,.candidate{display:block;width:100%;height:auto;max-width:760px;margin-top:20px}.reference{max-width:640px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.5 ui-monospace,monospace}details{margin-top:18px}summary{cursor:pointer}a{color:#146b53}small{color:#58645e}
.crop{position:relative;overflow:hidden;width:100%;max-width:380px;aspect-ratio:1;background:#e8edeb}.crop img{position:absolute;top:0;left:0;width:200%;height:200%;max-width:none}.crop.small{width:56px;height:56px;margin-top:12px}
@media(max-width:600px){main{padding:18px}h1{font-size:23px}.previews{gap:12px}.strip{grid-template-columns:repeat(2,minmax(0,1fr))}figcaption{font-size:13px}}
</style></head><body><main>
<header><h1>Mr. PinPin / hybrid sprite study</h1><p class="status">CONTROL STUDY / NOT APPROVED / NOT FINAL ART</p><p>${e(studies[0].angle)} degrees &middot; identical one-second cycles</p><label><input id="animate" type="checkbox" checked> Animate</label><p id="error" role="alert"></p></header>
<section class="previews">${previews}</section>
${candidate ? `<section><h2>Candidate / raw 4-cell loop</h2><p class="status">UNVERIFIED CROP / NOT PRODUCTION READY</p><div data-loop><div class="crop"><img src="${candidate}" alt="Unverified candidate cell, enlarged"></div><div class="crop small"><img src="${candidate}" alt="Unverified candidate cell, 56 pixels"></div></div><output>Frame 1 / 4</output><p>56px cell below enlarged view. Equal quarters: top-left, top-right, bottom-left, bottom-right; one second total. Original framing retained, without anchor or scale normalization.</p><p>Appearance study only. Body proportions, camera and feet shift relative to the control; occluded limbs and pose fidelity are not certified.</p></section>` : ''}
${strips}
${candidate ? `<section><h2>Generated candidate / whole sheet</h2><img class="candidate" loading="lazy" src="${candidate}" alt="Unapproved candidate sheet, shown whole"></section>` : ''}
<section><h2>Book reference / prompt</h2><img class="reference" loading="lazy" src="${reference}" alt="Selected book reference for PinPin face and eyes"><p>Face identity reference, not a walk-cycle approval.</p><pre>${e(prompt)}</pre><details><summary>Study provenance</summary>${studies.map(s => `<h3>${s.frames} frames</h3><p>${e(s.description)}</p><pre>${e(s.directory)}\n${e(typeof s.coordinates === 'string' ? s.coordinates : JSON.stringify(s.coordinates))}</pre>`).join('')}<p>Reference: ${e(path.resolve(options.reference))}</p></details></section>
</main><script id="study-data" type="application/json">${embeddedJSON(loops)}</script>
<script>
'use strict';
const data=JSON.parse(document.getElementById('study-data').textContent);
const toggle=document.getElementById('animate'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
toggle.checked=!reduced.matches;
let raf=0, elapsed=0, previous=null;
const states=data.map((study,i)=>({study, box:document.querySelectorAll('[data-loop]')[i], visible:false, ready:false, loading:false, failed:false, frame:-1}));
function paint(state,index){if(state.frame===index)return;state.box.querySelectorAll('img').forEach(img=>{img.src=state.study.renders[index].url;if(state.study.crop)img.style.transform='translate('+(-50*(index%2))+'%, '+(-50*Math.floor(index/2))+'%)';});state.frame=index;state.box.dataset.frame=index;state.box.nextElementSibling.textContent='Frame '+(index+1)+' / '+state.study.frames;}
function active(){return toggle.checked&&!document.hidden&&states.some(s=>s.visible&&s.ready);}
function tick(now){raf=0;if(!active()){previous=null;return;}if(previous!==null)elapsed+=now-previous;previous=now;const phase=(elapsed%1000)/1000;states.forEach(s=>{if(s.visible&&s.ready)paint(s,Math.min(s.study.frames-1,Math.floor(phase*s.study.frames)));});raf=requestAnimationFrame(tick);}
function sync(){if(active()){if(!raf)raf=requestAnimationFrame(tick);}else{cancelAnimationFrame(raf);raf=0;previous=null;}}
async function prepare(state){if(state.loading||state.ready||state.failed)return;state.loading=true;try{state.images=await Promise.all(state.study.renders.map(async r=>{const image=new Image();image.src=r.url;await image.decode();return image;}));if(state.study.crop&&state.images.some(img=>img.naturalWidth!==img.naturalHeight||img.naturalWidth%2))throw new Error('Candidate requires an even square 2x2 plate');state.ready=true;paint(state,0);}catch(error){state.failed=true;document.getElementById('error').textContent='A study image failed validation or decoding: '+error.message;console.error(error);}finally{state.loading=false;sync();}}
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{const state=states.find(s=>s.box===entry.target);state.visible=entry.isIntersecting;if(state.visible)prepare(state);});sync();});
states.forEach(s=>observer.observe(s.box));toggle.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',()=>{toggle.checked=!reduced.matches;sync();});
</script></body></html>`;
  fs.mkdirSync(out);
  fs.mkdirSync(path.join(out, 'assets'));
  for (const [source, relative] of copies) fs.copyFileSync(source, path.join(out, relative), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(out, 'index.html'), html, { flag: 'wx' });
  return path.join(out, 'index.html');
}

if (require.main === module) {
  try {
    const { values } = parseArgs({ options: Object.fromEntries(['four', 'eight', 'reference', 'out', 'candidate'].map(key => [key, { type: 'string' }])) });
    console.log(pathToFileURL(build(values)).href);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { build, readStudy, embeddedJSON };
