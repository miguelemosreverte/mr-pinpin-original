#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {parseArgs} = require('node:util');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const within = (root, file) => file === root || file.startsWith(root + path.sep);

function timeline({label, samples}) {
  assert(typeof label === 'string' && label.trim(), 'Score needs its actual definition/units');
  assert(Array.isArray(samples) && samples.length > 1 && samples.every((s, i) =>
    Number.isSafeInteger(s.frame) && s.frame >= 0 && (!i || s.frame > samples[i-1].frame) &&
    [s.before,s.after].every(n => Number.isFinite(n) && n >= 0)), 'Invalid timeline samples');
  const max = Math.max(1, ...samples.flatMap(s => [s.before,s.after]));
  const first = samples[0].frame, last = samples.at(-1).frame;
  const points = key => samples.map(s => `${60 + (s.frame-first)/(last-first)*620},${180-s[key]/max*150}`).join(' ');
  return `<p>${escape(label)}</p><p><span class="before">Before (solid)</span> / <span class="after">After (dashed)</span></p><svg viewBox="0 0 720 225" role="img" aria-label="Before and after local white-opacity score by frame"><path d="M60 25V180H685" fill="none" stroke="#66717b"/><polyline points="${points('before')}" fill="none" stroke="#ac4053" stroke-width="3"/><polyline points="${points('after')}" fill="none" stroke="#12765f" stroke-width="3" stroke-dasharray="7 4"/><g fill="#28333b" font-size="15"><text x="4" y="35">${Number(max.toPrecision(3))}</text><text x="30" y="183">0</text><text x="60" y="211">${first}</text><text x="320" y="211">Frame index</text><text x="660" y="211">${last}</text></g></svg>`;
}

function build({trial, manifest, out}) {
  assert(trial && manifest && out, 'Specify --trial, --manifest and --out');
  trial = fs.realpathSync(trial); out = path.resolve(out);
  const repo = fs.realpathSync(path.join(__dirname,'..'));
  assert(!within(repo,trial) && !within(repo,out), 'Keep trial/output outside checkout');
  assert(fs.realpathSync(path.dirname(out)) === path.dirname(out), 'Use canonical output parent');
  const source = name => {
    assert(typeof name === 'string' && name && !path.isAbsolute(name) && !name.includes('\\') && name.split('/').every(p => p && p !== '.' && p !== '..'), 'Expected trial-relative source');
    const file = fs.realpathSync(path.join(trial,name));
    assert(within(trial,file) && fs.statSync(file).isFile(), 'Source escapes trial or is not a file');
    return file;
  };
  const data = JSON.parse(fs.readFileSync(source(manifest),'utf8'));
  assert(data.version === 1 && typeof data.summary === 'string' && typeof data.method === 'string' &&
    typeof data.limitations === 'string' && typeof data.timing === 'string' && typeof data.decision === 'string', 'Missing review facts or review decision');
  assert(Array.isArray(data.flagged) && data.flagged.length && data.flagged.every(f => Number.isSafeInteger(f.frame) && f.frame >= 0 && typeof f.note === 'string'), 'Expected flagged-frame evidence');
  const records = new Map();
  function asset(name, extensions) {
    const file = source(name);
    assert(extensions.includes(path.extname(file).toLowerCase()), 'Unsupported asset type');
    if (!records.has(name)) records.set(name,{source:name,output:`assets/${String(records.size).padStart(3,'0')}${path.extname(file)}`,sha256:hash(file)});
    return records.get(name).output;
  }
  const picture = (name,label,crop) => {
    const url = asset(name,['.png','.jpg','.webp']);
    if (!crop) return `<a href="${url}"><img src="${url}" alt="${escape(label)}"></a>`;
    assert(Array.isArray(crop) && crop.length === 4 && crop.every(Number.isSafeInteger) && crop[0]>=0 && crop[1]>=0 && crop[2]>crop[0] && crop[3]>crop[1] && crop[2]<=1280 && crop[3]<=720, 'Crop must fit the native 1280x720 frame');
    const [x,y,right,bottom]=crop, w=right-x, h=bottom-y;
    return `<a href="${url}" style="display:block;position:relative;overflow:hidden;background:#18181c;aspect-ratio:${w}/${h}"><img src="${url}" alt="${escape(label)}" style="position:absolute;max-width:none;width:${1280/w*100}%;left:${-x/w*100}%;top:${-y/h*100}%"></a>`;
  };
  const video = (name,label) => `<figure><figcaption>${escape(label)}</figcaption><video controls loop muted playsinline preload="metadata" src="${asset(name,['.mp4','.webm'])}" aria-label="${escape(label)}"></video></figure>`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mr. PinPin / white-patch repair review</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f7f8;color:#20252b;font:16px/1.55 system-ui;letter-spacing:0}main{max-width:1200px;margin:auto;padding:24px}h1{font-size:27px;line-height:1.2}h2{font-size:21px}h3{font-size:18px}section{padding:20px 0;border-top:1px solid #c9d0d5}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0;min-width:0}figcaption{font-weight:650;margin-bottom:8px}video{display:block;width:100%;aspect-ratio:16/9;max-height:70vh;background:#18181c}img{display:block;width:100%;height:auto}svg{display:block;width:100%;max-width:900px}a{color:#176b5b;overflow-wrap:anywhere}.before,.status{color:#ac4053}.after{color:#12765f}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 ui-monospace,monospace}@media(max-width:650px){main{padding:16px}.pair{grid-template-columns:minmax(0,1fr)}h1{font-size:23px}}
</style><main><header><h1>Mr. PinPin / white-patch repair review</h1><p>${escape(data.summary)}</p><p class="status">${escape(data.decision)}</p><p>Local software experiment. No paid generation; not gait or seamless-loop certification.</p></header>
<section><h2>Before and after / dark background</h2><div class="pair">${video(data.before,'Before / original matte')}${video(data.after,'After / reviewed local correction')}</div><p>${escape(data.timing)}</p><h3>Unchanged native / face and fur reference</h3>${video(data.native,'Original white native / unchanged')}</section>
<section><h2>Original gap versus opacity error</h2><div class="pair"><figure><figcaption>Frame 14 / original white gap</figcaption>${picture(data.evidence.native,'Frame 14 original hind-leg gap')}</figure><figure><figcaption>Frame 14 / original alpha, white means opaque</figcaption>${picture(data.evidence.alpha,'Frame 14 alpha wrongly retains the opening')}</figure></div><p>${escape(data.evidence.note)}</p></section>
<section><h2>Flagged frames / visible defect and repair</h2>${data.flagged.map(f=>`<article><h3>Frame ${f.frame}</h3><p>${escape(f.note)}</p><div class="pair"><figure><figcaption>Before / closeup</figcaption>${picture(f.before,`Frame ${f.frame} before closeup`,f.crop)}</figure><figure><figcaption>After / same region</figcaption>${picture(f.after,`Frame ${f.frame} after closeup`,f.crop)}</figure></div>${f.overlay?`<figure><figcaption>Detector / repair-region overlay</figcaption>${picture(f.overlay,`Frame ${f.frame} detection overlay`)}</figure>`:''}</article>`).join('')}</section>
<section><h2>Local white-opacity score</h2>${timeline(data.timeline)}<p>A lower local score alone does not prove a better matte: pale fur and legitimate highlights can also be removed. Compare the same-region closeups above.</p></section>
<section><h2>Method, limits and logs</h2><p>${escape(data.method)}</p><p>${escape(data.limitations)}</p><p>${(data.logs||[]).map(name=>`<a href="${asset(name,['.json','.md','.txt','.log','.py'])}">${escape(path.basename(name))}</a>`).join(' / ')}</p></section><p id="error" role="alert"></p></main><script>
const videos=[...document.querySelectorAll('video')];
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)entry.target.pause();}));
videos.forEach(video=>{observer.observe(video);video.addEventListener('error',()=>{document.getElementById('error').textContent='A clip could not be decoded.';});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)videos.forEach(video=>video.pause());});
</script></html>`;
  asset(manifest,['.json']);
  fs.mkdirSync(out); fs.mkdirSync(path.join(out,'assets'));
  for(const record of records.values()) {
    const target=path.join(out,record.output);
    fs.copyFileSync(source(record.source),target,fs.constants.COPYFILE_EXCL);
    assert(hash(target)===record.sha256,'Source changed during copy');
  }
  fs.writeFileSync(path.join(out,'index.html'),html,{flag:'wx'});
  fs.writeFileSync(path.join(out,'review-provenance.json'),JSON.stringify({version:1,manifest,assets:[...records.values()]},null,2)+'\n',{flag:'wx'});
  return path.join(out,'index.html');
}
if(require.main===module) {
  try {const {values}=parseArgs({options:{trial:{type:'string'},manifest:{type:'string'},out:{type:'string'}}});console.log(pathToFileURL(build(values)).href);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={build,timeline};
