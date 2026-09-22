#!/usr/bin/env node
'use strict';

// Separate local proposals: never mutates the arrival draft or selected artwork.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const production = 'docs/storyboard/production/papa-arrival-expansion-20260922';
const planPath = path.join(root, production, 'corrections-plan.json');
const destination = path.join(root, 'docs/storyboard/review/papa-arrival-corrections.html');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const baselinePath = path.join(root, production, 'original-elder-papa-home.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const originalSceneCount = baseline.scenes.filter(scene => scene.role !== 'title').length;
if (!Array.isArray(plan.shots) || !plan.shots.length) throw new Error('The corrections plan must contain shots.');
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const ids = new Set();
function media(filename) {
  if (typeof filename !== 'string' || !filename || path.isAbsolute(filename)) throw new Error('Image paths must be repository-relative.');
  const absolute = path.resolve(root, filename);
  if (!absolute.startsWith(root + path.sep)) throw new Error(`Image path leaves repository: ${filename}`);
  const available = fs.existsSync(absolute) && fs.statSync(absolute).isFile() && fs.statSync(absolute).size > 0;
  const url = path.relative(path.dirname(destination), absolute).split(path.sep).map(encodeURIComponent).join('/');
  return { filename, url, available };
}
const shots = plan.shots.map(shot => {
  if (typeof shot.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(shot.id) || ids.has(shot.id)) throw new Error(`Invalid or duplicate shot ID: ${shot.id}`);
  ids.add(shot.id);
  if (typeof shot.title !== 'string' || !shot.title.trim() || typeof shot.issue !== 'string' || !shot.issue.trim()) throw new Error(`Missing title or issue for ${shot.id}`);
  const before = media(shot.before);
  const after = media(shot.output);
  if (!before.available) throw new Error(`Restore the original image before building: ${before.filename}`);
  if (before.filename === after.filename) throw new Error(`Preserve the before image separately: ${shot.id}`);
  return { ...shot, before, after };
});
const ready = shots.filter(shot => shot.after.available).length;
if (process.argv.includes('--require-complete') && ready !== shots.length) throw new Error(`Only ${ready}/${shots.length} correction candidates are available.`);
function figure(image, title, label) {
  const picture = image.available
    ? `<a class="image-link" href="${escape(image.url)}" target="_blank" rel="noopener" aria-label="Open full image: ${escape(title)} — ${escape(label)}"><img src="${escape(image.url)}" alt="${escape(title)} — ${escape(label)}" loading="lazy" decoding="async"></a>`
    : '<div class="pending" role="status"><p>Correction in progress</p><span>The original remains available on the left.</span></div>';
  return `<figure><figcaption>${escape(label)}</figcaption>${picture}</figure>`;
}
const rows = shots.map((shot, index) => `<article class="row" id="${escape(shot.id)}">
<div class="row-heading"><div class="heading-line"><span class="number">${String(index + 1).padStart(2, '0')}</span><h2>${escape(shot.title)}</h2><span class="status">${shot.after.available ? 'Proposed correction' : 'Pending'}</span></div><p>${escape(shot.issue)}</p></div>
<div class="pair">${figure(shot.before, shot.title, 'Before · current draft')}${figure(shot.after, shot.title, 'After · correction candidate')}</div>
</article>`).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Papa’s arrival · illustration corrections</title><link rel="icon" href="data:,">
<style>
:root{color-scheme:light;--ink:#253c31;--muted:#627166;--paper:#faf8f0;--line:#d9dfd4;--green:#345a42}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,-apple-system,sans-serif;line-height:1.55}a{color:var(--green)}a:focus-visible{outline:3px solid #bb7530;outline-offset:4px}header,main{max-width:1550px;margin:auto;padding:30px 28px}header{padding-bottom:12px}nav{display:flex;gap:12px 24px;flex-wrap:wrap;font-size:.94rem}h1{font-family:Georgia,serif;font-weight:normal;font-size:clamp(2rem,4vw,3rem);line-height:1.15;margin:24px 0 16px}h2{font-size:1.16rem;margin:0}.intro{max-width:860px}.badge,.status{display:inline-block;border-radius:18px;padding:5px 12px;background:#fff0cd;color:#72501e;font-size:.82rem;font-weight:650}.progress{color:var(--muted);font-size:.94rem}.row{margin:0 0 36px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:white;scroll-margin-top:18px}.row-heading{padding:18px 22px;border-bottom:1px solid var(--line)}.heading-line{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.row-heading p{margin:10px 0 0;max-width:1050px}.number{font-variant-numeric:tabular-nums;color:var(--muted)}.status{margin-left:auto;font-weight:500}.pair{display:grid;grid-template-columns:1fr 1fr;align-items:start}.pair figure+figure{border-left:1px solid var(--line)}figure{min-width:0;margin:0}figcaption{padding:12px 18px;background:#f3f5ed;color:var(--muted);font-size:.87rem}figure+figure figcaption{background:#eaf2e8;color:#315536}.image-link{display:block}img{display:block;width:100%;height:auto;object-fit:contain}.pending{aspect-ratio:3/2;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;background:#f4f1e7;text-align:center;color:var(--muted)}.pending p{font-size:1.15rem;margin:0 0 10px}.pending span{font-size:.88rem}footer{max-width:1100px;margin:auto;padding:0 28px 40px;color:var(--muted);text-align:center;font-size:.9rem}@media(max-width:720px){header{padding:24px 16px 8px}main{padding:20px 12px}.pair{grid-template-columns:1fr}.pair figure+figure{border-left:0;border-top:1px solid var(--line)}.row-heading{padding:16px}.status{margin-left:0}.heading-line{gap:8px 12px}}
</style></head><body>
<header><nav><a href="papa-arrival-expansion.html?lang=ru&amp;view=reader">Read the expanded draft · Русский</a><a href="papa-arrival-expansion.html?lang=ru">Original expansion report</a><a href="../library.html?lang=ru">Story library</a></nav>
<h1>Papa’s arrival · illustration corrections</h1><span class="badge">Review archive · approved for publication</span>
<p class="intro">The welcome and camera sequence stay the same. These focused corrections address physical details such as window glass, separate bodies, and believable contact between characters. Compare each current draft image with its proposed replacement.</p>
<p class="progress">${ready} / ${shots.length} corrections available. The preserved original chapter contains ${originalSceneCount} story images plus its cover. Images are shown in full; select an image to inspect it at its original size.</p></header>
<main>${rows}</main>
<footer><p>The expanded reading draft includes these corrections. Original images remain here for historical comparison, independently of the current public release.</p><a href="../production/papa-arrival-expansion-20260922/corrections-plan.json">Correction plan and exact prompts</a> · <a href="../production/papa-arrival-expansion-20260922/original-elder-papa-home.json">Preserved original chapter</a></footer>
</body></html>\n`;
if (!process.argv.includes('--check')) fs.writeFileSync(destination, html);
console.log(JSON.stringify({ review: path.relative(root, destination), proposedCorrections: shots.length, ready, pending: shots.length - ready, mode: process.argv.includes('--check') ? 'checked' : 'written' }, null, 2));
