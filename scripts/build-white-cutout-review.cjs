#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function build(trial, out) {
  trial = fs.realpathSync(trial); out = path.resolve(out);
  const repo = fs.realpathSync(path.join(__dirname, '..'));
  const inside = (root, name) => name === root || name.startsWith(root + path.sep);
  assert(!inside(repo, trial) && !inside(repo, out), 'Use external trial/output directories');
  assert(fs.realpathSync(path.dirname(out)) === path.dirname(out), 'Use canonical output parent');
  const source = name => {
    const file = fs.realpathSync(path.join(trial, name));
    assert(inside(trial, file) && fs.statSync(file).isFile(), 'Source must stay within trial');
    return file;
  };
  const read = name => JSON.parse(fs.readFileSync(source(name), 'utf8'));
  const batch = read('matte-v01/batch.json'), probe = read('matte-v01/frame-000.json');
  const metrics = read('endpoint-audit-v01/metrics.json'), renders = read('matte-v01/render.json');
  const submission = read('white-walk-pixverse-v01.json');
  const native = digest(source('white-walk-pixverse-v01.mp4'));
  assert([batch.source_sha256, probe.source_sha256, metrics.native_mp4_sha256, submission.metadata.sha256].every(h => h === native), 'Native provenance mismatch');
  assert(batch.frames === 25 && batch.fps === 24 && batch.retiming_or_endpoint_removal === false, 'Expected unchanged 25-frame timing');
  for (const name of ['matte-dark.mp4','matte-green.mp4']) {
    const record = renders.find(r => r.path === name);
    assert(record && record.sha256 === digest(source('matte-v01/' + name)), 'Composite hash mismatch');
  }
  const names = ['white-walk-pixverse-v01.mp4','matte-v01/matte-dark.mp4','matte-v01/matte-green.mp4',
    'endpoint-audit-v01/first-last-native.png','endpoint-audit-v01/report.md','endpoint-audit-v01/metrics.json',
    'matte-v01/batch.json','matte-v01/frame-000.json','matte-v01/render.json',
    'matte-v01/batch.py','matte-v01/preview.py','matte-v01/render.py','matte-v01/all-25-dark-contact.png'];
  const records = names.map(name => ({source:name, output:'assets/' + path.basename(name), sha256:digest(source(name))}));
  const url = name => records.find(r => r.source === name).output;
  const video = (name, label) => `<figure><figcaption>${esc(label)}</figcaption><video controls loop muted playsinline preload="metadata" aria-label="${esc(label)}" src="${url(name)}"></video><a href="${url(name)}">Open clip</a></figure>`;
  const n = value => Number(value).toFixed(3);
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mr. PinPin / software cutout review</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f7f8;color:#20252b;font:16px/1.55 system-ui;letter-spacing:0}main{max-width:1360px;margin:auto;padding:24px}h1{font-size:27px;line-height:1.2}h2{font-size:21px}section{border-top:1px solid #c9d0d5;padding:20px 0}.clips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}figure{margin:0;min-width:0}figcaption{font-weight:650;margin:0 0 8px}video{display:block;width:100%;aspect-ratio:16/9;max-height:70vh;background:#18181c}img{display:block;width:100%;height:auto}a{color:#176b5b;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 ui-monospace,monospace}.status{color:#953d4b}code{overflow-wrap:anywhere}@media(max-width:750px){main{padding:16px}.clips{grid-template-columns:minmax(0,1fr)}h1{font-size:23px}}
</style><main><header><h1>Mr. PinPin / software cutout review</h1><p>White native clip and software-matted derivatives. All 25 frames retained at 24 fps (${batch.duration_seconds.toFixed(6)} seconds); no retiming, endpoint replacement, or loop repair.</p><p class="status">Experimental cutout, not a certified gait or seamless loop. No new generation or paid API calls for this step.</p></header>
<section><h2>Native and cutout comparison</h2><div class="clips">${video('white-walk-pixverse-v01.mp4','Original white native')}${video('matte-v01/matte-dark.mp4','Cutout on dark')}${video('matte-v01/matte-green.mp4','Cutout on green')}</div><p>Initial visual review: promising separation, with slight pale face fringe and some whisker loss. The head turns during the cycle; background removal does not correct heading or limb motion. Independent frame masks can flicker; constant settings do not guarantee temporal stability.</p><p>The two composite MP4s have baked backgrounds, not transparency. The source cutouts are RGBA PNG frames.</p></section>
<section><h2>Were the first and last frames identical?</h2><p><strong>No.</strong> The recorded request supplied the same first/end still with <code>matchEndFrame: true</code>. This confirms the submitted configuration, not pixel-exact enforcement inside the provider.</p><img src="${url('endpoint-audit-v01/first-last-native.png')}" alt="First native frame 0 at zero seconds, left; last native frame 24 at one second, right"><p>RGB mean absolute difference (0-255): full frame <strong>${n(metrics.full_frame.mae_rgb_0_255)}</strong>; foreground mask <strong>${n(metrics.foreground_mask.mae_rgb_0_255)}</strong>. Only ${(metrics.foreground_mask.exact_pixel_fraction * 100).toFixed(2)}% of foreground pixels match exactly. Near-white background occupies ${(metrics.background_mask_fraction * 100).toFixed(2)}% and dilutes the full-frame score.</p><p>Approximate pose closure, not frame lock. Differences include paws, fur and shadows; the metric includes generated variation and H.264 compression, and is not a gait score. Replacing the last frame would impose a new endpoint without repairing motion approaching it. That has not been done.</p><p><a href="${url('endpoint-audit-v01/report.md')}">Endpoint audit</a> / <a href="${url('endpoint-audit-v01/metrics.json')}">Measured values</a></p></section>
<section><h2>Software and exact provenance</h2><p>${esc(probe.method)}. Foreground threshold ${probe.foreground_threshold}, background threshold ${probe.background_threshold}, erosion size ${probe.erode_size}. Same local settings across ${batch.frames} frames; no temporal filter. ${esc(batch.temporal_warning)}</p><p>Native input SHA-256: <code>${native}</code></p><h3>Original video prompt / unchanged by matting</h3><pre>${esc(submission.input.prompt)}</pre><p>Endpoint: ${esc(submission.model)}. Requested duration ${esc(submission.input.duration)} second; resolution ${esc(submission.input.resolution)}. The software step supplied decoded native frames to a local segmentation/matting model, not to a generative image/video API.</p><p>${['matte-v01/frame-000.json','matte-v01/batch.json','matte-v01/render.json','matte-v01/preview.py','matte-v01/batch.py','matte-v01/render.py'].map(name=>`<a href="${url(name)}">${esc(path.basename(name))}</a>`).join(' / ')}</p><h3>All 25 cutout frames on dark</h3><img src="${url('matte-v01/all-25-dark-contact.png')}" alt="All 25 software cutout frames on dark background"></section><p id="error" role="alert"></p></main><script>
const videos=[...document.querySelectorAll('video')];
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)entry.target.pause();}));
videos.forEach(video=>{observer.observe(video);video.addEventListener('error',()=>{document.getElementById('error').textContent='A clip failed to decode.';});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)videos.forEach(video=>video.pause());});
</script></html>`;
  fs.mkdirSync(out); fs.mkdirSync(path.join(out,'assets'));
  for (const record of records) {
    fs.copyFileSync(source(record.source), path.join(out,record.output), fs.constants.COPYFILE_EXCL);
    assert(digest(path.join(out,record.output)) === record.sha256, 'Source changed during copy');
  }
  fs.writeFileSync(path.join(out,'index.html'),html,{flag:'wx'});
  fs.writeFileSync(path.join(out,'review-provenance.json'),JSON.stringify({version:1,assets:records},null,2)+'\n',{flag:'wx'});
  return path.join(out,'index.html');
}
if(require.main === module) {
  try {assert(process.argv.length === 4, 'Usage: node scripts/build-white-cutout-review.cjs EXTERNAL_TRIAL NEW_EXTERNAL_OUTPUT'); console.log(pathToFileURL(build(...process.argv.slice(2))).href);}
  catch(error) {console.error(error.message);process.exitCode=1;}
}
module.exports={build};
