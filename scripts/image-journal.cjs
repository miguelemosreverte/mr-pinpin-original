const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const resolve = file => path.resolve(root, file);
const json = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const recordPath = shot => resolve(shot.output.replace(/\.png$/, '.json'));

function writeRecord(record, file) {
  json(file, record);
  const md = `# ${record.title}\n\nStatus: review candidate, not approved\n\n` +
    `- Reading order: ${record.order}\n- Tool: ${record.tool}\n- Started (UTC): ${record.startedAt}\n- Completed (UTC): ${record.finishedAt}\n- Wall time: ${record.seconds} seconds\n- Saved image: ${record.output}\n- Size: ${record.width} x ${record.height}\n- SHA-256: ${record.sha256}\n- Original tool output: ${record.generatedFile}\n\n` +
    `## Source Beat\n\n${record.beat}\n\n## Camera Direction\n\n${record.camera}\n\n## Future Character Space\n\n${record.staging}\n\n## References\n\n` +
    record.references.map(ref => `- ${ref.path}: ${ref.role}`).join('\n') +
    `\n\n## Exact Tool Prompt\n\n\`\`\`text\n${record.prompt}\n\`\`\`\n\n## Visual Review\n\n${record.review || 'Pending visual inspection.'}\n\nReviewed (UTC): ${record.reviewedAt || 'Pending'}\n`;
  fs.writeFileSync(file.replace(/\.json$/, '.md'), md);
}

function capture(plan, id, generatedFile, startedAt, finishedAt) {
  const shot = plan.shots.find(shot => shot.id === id);
  if (!shot) throw new Error('Unknown shot: ' + id);
  const start = Date.parse(startedAt), finish = Date.parse(finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) throw new Error('Invalid timestamps');
  if (!shot.output.endsWith('.png')) throw new Error('Expected PNG output');
  const file = resolve(shot.output), recordFile = recordPath(shot);
  for (const existing of [file, recordFile, file.replace(/\.png$/, '.md')]) {
    if (fs.existsSync(existing)) throw new Error('Refusing to overwrite: ' + existing);
  }
  const bytes = fs.readFileSync(generatedFile);
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.length < 24) throw new Error('Expected PNG input');
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.copyFileSync(generatedFile, file, fs.constants.COPYFILE_EXCL);
  const record = {...shot, tool:'built-in imagegen', generatedFile,
    startedAt:new Date(start).toISOString(), finishedAt:new Date(finish).toISOString(), seconds:(finish-start)/1000,
    width:bytes.readUInt32BE(16), height:bytes.readUInt32BE(20), sha256:crypto.createHash('sha256').update(bytes).digest('hex'), review:null};
  writeRecord(record, recordFile);
  return record;
}

function build(plan) {
  const report = resolve(plan.report);
  const href = file => esc(path.relative(path.dirname(report), resolve(file)).split(path.sep).join('/'));
  const records = plan.shots.filter(shot => fs.existsSync(recordPath(shot))).map(shot => read(recordPath(shot)))
    .sort((a,b) => a.startedAt.localeCompare(b.startedAt));
  for (const record of records) writeRecord(record, recordPath(record));
  const seconds = records.reduce((sum,record) => sum + record.seconds, 0);
  const sections = records.map((record,index) => `<section id="${esc(record.id)}" class="shot">
    <header class="copy"><p class="eyebrow">Generation ${index+1} / Reading position ${record.order}</p><h2>${esc(record.title)}</h2><p>${esc(record.beat)}</p><p><strong>Camera.</strong> ${esc(record.camera)}</p></header>
    <figure><img src="${href(record.output)}" width="${record.width}" height="${record.height}" alt="${esc(record.alt)}" loading="${index ? 'lazy':'eager'}"><figcaption>${esc(record.staging)}</figcaption></figure>
    <div class="copy"><h3>What I See</h3><p>${esc(record.review || 'Pending visual inspection.')}</p><p class="meta">${esc(record.startedAt)} to ${esc(record.finishedAt)} / ${record.seconds.toFixed(1)} seconds / ${record.width} x ${record.height}</p>
    <p><a href="${href(record.output.replace(/\.png$/, '.md'))}">Markdown record</a> · <a href="${href(record.output)}">Full-resolution image</a></p>
    <h3>Exact Prompt</h3><pre>${esc(record.prompt)}</pre><h3>References</h3><ul>${record.references.map(ref => `<li><a href="${href(ref.path)}">${esc(path.basename(ref.path))}</a>: ${esc(ref.role)}</li>`).join('')}</ul></div></section>`).join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(plan.title)} | Mr. PinPin</title><link rel="stylesheet" href="image-journal.css"></head><body><main>
    <header class="intro copy"><nav><a href="../library.html?lang=en">Chapter library</a><a href="../?chapter=1&amp;lang=en">Chapter 1</a><a href="${href(plan.workflow)}">Workflow / Markdown</a></nav><p class="eyebrow">Mr. PinPin / Chapter 02 / Camera notebook</p><h1>${esc(plan.title)}</h1><p class="lead">Five landscapes before the characters arrive.</p><p class="status">${records.length} of ${plan.shots.length} images generated. Review candidates, not an approved chapter.</p></header>
    ${sections}
    <section class="copy context"><h2>Source and Process</h2><p>${esc(plan.scope)}</p><h3>Reading the Original</h3>${plan.sourceNotes.map(note => `<p>${esc(note)}</p>`).join('')}<p><a href="../../images/image58.png">Original illustration 1</a> · <a href="../../images/image96.png">Original illustration 2</a> · <a href="../book.json">Original chapter text</a></p>
    <h2>The Method, in Order</h2><ol>${plan.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>${plan.planAdjustment ? `<h3>A Brief Adjustment</h3><p>${esc(plan.planAdjustment)}</p>` : ''}<h3>The Five-Shot Plan</h3><ol>${plan.shots.map(shot => `<li><a href="#${esc(shot.id)}">${esc(shot.title)}</a> ${esc(shot.camera)}</li>`).join('')}</ol>
    <h3>Measured, Not Estimated</h3><p>${seconds.toFixed(1)} seconds summed image-call wall time across ${records.length} registered calls. This includes tool waiting, not just model computation. It excludes preparation, review, publishing and any undocumented earlier work. No monetary cost is exposed by these calls.</p><p>Records above follow actual generation time. Reading positions are recorded separately. Each image is a single attempt in this study; future revisions get a new filename and record.</p>
    <h3>What Carries Forward from Chapter 1</h3><p>Miguel's successful camera directions specified physical travel and relationships: the lake below the path, two retreats of 50 metres, underwater views looking up, and a wet return to the surface. This pass reuses that spatial approach, with deliberate foreground parallax and a reverse view.</p><p>The colored-leg blocking experiment did not reliably preserve facial quality or body posture. It is not part of this pass. Future character renders should begin from the clean landscape, place the whole cast together, and receive a separate visual check of faces, scale, gaze and each fore/hind limb attachment.</p><p>Repeated edits appeared to brighten highlights; the cause remains unverified. Short reference chains reduce repeated processing but do not guarantee identical exposure. The later rabbit corrections also show that a convincing image can still contain anatomy errors. Prompt compliance must be inspected, not assumed.</p></section>
    <footer class="copy"><h2>Review Before Characters</h2><p>${esc(plan.conclusion)}</p><p>The camera coordinates and lens values are directions, not measurements recovered from a 3D scene. A plausible new view is not proof of exact geometry.</p><a href="${href(plan.workflow)}">Repeatable workflow and Chapter 1 lessons</a></footer></main></body></html>\n`;
  fs.mkdirSync(path.dirname(report), {recursive:true});
  fs.writeFileSync(report, html);
  return {report:plan.report, completed:records.length, imageCallSeconds:seconds};
}

if (require.main === module) {
  const [command, planFile, id, ...args] = process.argv.slice(2);
  const plan = read(resolve(planFile));
  if (command === 'capture') capture(plan, id, ...args);
  else if (command === 'review') {
    const shot = plan.shots.find(shot => shot.id === id);
    if (!shot || !args[0]) throw new Error('Expected shot and review text');
    const file = recordPath(shot), record = read(file);
    record.review = args[0]; record.reviewedAt = new Date().toISOString(); writeRecord(record, file);
  } else if (command !== 'build') throw new Error('Use capture, review, or build');
  console.log(JSON.stringify(build(plan)));
}
module.exports = {capture, build, esc};
