const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../docs/storyboard");
const plan = JSON.parse(fs.readFileSync(path.join(root, "production/chapter-01-v3/plan.json")));
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let finished = 0;
const sections = plan.scenes.map(scene => {
  const file = path.join(root, "production/chapter-01-v3", scene.id + ".json");
  const record = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : null;
  if (record?.final) finished++;
  const image = (src, label) => '<figure><figcaption>' + esc(label) + '</figcaption><img src="../' + esc(src) + '" width="1536" height="1024" alt="' + esc(scene.title + ": " + label) + '" loading="lazy"></figure>';
  return '<section id="shot-' + scene.id + '"><header><h2>' + esc(scene.id + ". " + scene.title) + '</h2><p>' + esc(scene.action) + '</p></header>' +
    (record?.final ? image(record.final, "Finished candidate") : image(scene.plate, "Landscape / Characters pending")) +
    (record?.block ? image(record.block, "Anatomy blocking") : "") +
    '<div class="notes">' + scene.cast.map(c => '<h3>' + esc(c.name) + '</h3><dl><dt>Placement</dt><dd>' + esc(c.placement) + '</dd><dt>Pose</dt><dd>' + esc(c.pose) + '</dd><dt>Gaze</dt><dd>' + esc(c.gaze) + '</dd></dl>').join("") +
    (record ? '<h3>Review</h3><ul>' + record.notes.map(n => '<li>' + esc(n) + '</li>').join("") + '</ul>' : '') + '</div></section>';
}).join("");
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mr. PinPin / Chapter 1 Production</title><style>' +
  '*{box-sizing:border-box}body{margin:0;color:#252525;background:#fff;font-family:system-ui,sans-serif;line-height:1.5}main{max-width:1536px;margin:auto}header,.notes{padding:20px}h1{font-size:24px;margin:0}h2{font-size:21px;margin:0}h3{font-size:16px;margin:16px 0 6px}p{margin:8px 0}a{color:#246a59}section{border-top:1px solid #ccc}figure{margin:0}figcaption{padding:10px 20px;background:#f2f3f2;font-size:14px}img{display:block;width:100%;height:auto}dl{display:grid;grid-template-columns:85px minmax(0,1fr);gap:6px 16px;margin:0;max-width:980px}dt{font-weight:600}dd{margin:0}li{max-width:980px}.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:14px}.legend i{display:inline-block;width:14px;height:14px;margin-right:6px;vertical-align:middle}nav{display:flex;gap:20px;flex-wrap:wrap;margin:12px 0}' +
  '</style></head><body><main><header><h1>Mr. PinPin / Chapter 1</h1><p>Production review / ' + finished + ' of ' + plan.scenes.length + ' character scenes finished</p><nav><a href="../?chapter=1&amp;lang=en">Chapter reader</a><a href="chapter-01-landscapes.html">Landscape sequence</a></nav><p>Diagnostic limb colors, from attachment to paw. Left and right are the animal\'s own sides.</p><div class="legend"><span><i style="background:#e85b58"></i>Left foreleg</span><span><i style="background:#32b9db"></i>Right foreleg</span><span><i style="background:#aa77d4"></i>Left hindleg</span><span><i style="background:#e6bd3c"></i>Right hindleg</span></div></header>' + sections + '</main></body></html>';
fs.writeFileSync(path.join(root, "review/chapter-01-production.html"), html + "\n");
console.log(JSON.stringify({finished, total: plan.scenes.length}));
