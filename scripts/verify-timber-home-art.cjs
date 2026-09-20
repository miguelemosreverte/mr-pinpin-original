const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const vm = require('node:vm');
const {esc} = require('./image-journal.cjs');

const ROOT = path.resolve(__dirname, '..');
const ART = 'docs/storyboard/images/standalone/timber-tractor/chapter-02/';
const PLAN = 'docs/storyboard/production/timber-tractor-home.json';
const LANGUAGES = ['en', 'es', 'ru'];
const IDS = Array.from({length: 10}, (_, i) => 'scene-' + String(i + 1).padStart(2, '0'));
const REPLACEMENTS = {'scene-08': 'scene-08-v2', 'scene-09': 'scene-09-v2'};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function audit({partial = false, root = ROOT} = {}) {
  const resolve = file => {
    assert(typeof file === 'string' && !path.isAbsolute(file), 'Expected repository-relative path');
    const result = path.resolve(root, file);
    assert(result.startsWith(path.resolve(root) + path.sep), 'Path escapes repository: ' + file);
    return result;
  };
  const read = file => fs.readFileSync(resolve(file), 'utf8');
  const json = file => JSON.parse(read(file));
  const timestamp = (value, label) => {
    const time = Date.parse(value);
    assert(Number.isFinite(time) && new Date(time).toISOString() === value, label + ': invalid ISO UTC');
    return time;
  };
  const plan = json(PLAN);
  const failedRequests = fs.readdirSync(resolve(ART)).filter(file => /-failed-\d+\.json$/.test(file)).length;
  const ids = new Set(), outputs = new Map(), pending = [], originalsUnavailable = [];
  let milliseconds = 0;
  for (const shot of plan.shots) {
    assert(!ids.has(shot.id), shot.id + ': duplicate commission');
    ids.add(shot.id);
    assert(shot.output.startsWith(ART) && shot.output.endsWith('.png'), shot.id + ': wrong output directory/type');
    assert(!outputs.has(shot.output), shot.id + ': duplicate output');
    const stem = shot.output.slice(0, -4);
    if (![shot.output, stem + '.json', stem + '.md'].every(file => fs.existsSync(resolve(file)))) {
      pending.push(shot.id);
      continue;
    }
    const record = json(stem + '.json'), md = read(stem + '.md');
    if (partial && (!record.review || !record.reviewedAt)) {
      pending.push(shot.id + ' (unreviewed)');
      continue;
    }
    const bytes = fs.readFileSync(resolve(shot.output));
    assert(bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), shot.id + ': invalid PNG');
    assert.equal(bytes.readUInt32BE(8), 13, shot.id + ': invalid IHDR length');
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR', shot.id + ': missing IHDR');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1536, 1024], shot.id + ': PNG dimensions');
    assert.deepEqual([record.width, record.height], [1536, 1024], shot.id + ': recorded dimensions');
    assert.equal(record.sha256, hash(bytes), shot.id + ': SHA-256 mismatch');
    for (const key of ['id', 'output', 'order', 'prompt']) assert.equal(record[key], shot[key], shot.id + ': ' + key + ' mismatch');
    assert(typeof shot.prompt === 'string' && shot.prompt.trim(), shot.id + ': empty prompt');
    assert.deepEqual(record.references, shot.references, shot.id + ': exact references mismatch');
    assert(Array.isArray(record.references) && record.references.length, shot.id + ': missing references');
    for (const ref of record.references) {
      assert(fs.statSync(resolve(ref.path)).isFile(), shot.id + ': missing reference');
      assert(typeof ref.role === 'string' && ref.role.trim(), shot.id + ': missing reference role');
      assert(md.includes('- ' + ref.path + ': ' + ref.role), shot.id + ': Markdown reference mismatch');
    }
    assert.equal(record.tool, 'built-in imagegen', shot.id + ': tool mismatch');
    assert(typeof record.generatedFile === 'string' && path.isAbsolute(record.generatedFile), shot.id + ': missing original output path');
    if (fs.existsSync(record.generatedFile)) assert.equal(hash(fs.readFileSync(record.generatedFile)), record.sha256, shot.id + ': original output hash mismatch');
    else originalsUnavailable.push(shot.id);
    const start = timestamp(record.startedAt, shot.id + ' start'), finish = timestamp(record.finishedAt, shot.id + ' finish');
    assert(finish > start, shot.id + ': invalid interval');
    assert.equal(record.seconds, (finish - start) / 1000, shot.id + ': duration mismatch');
    assert(timestamp(record.reviewedAt, shot.id + ' review') >= finish, shot.id + ': review precedes completion');
    assert(typeof record.review === 'string' && record.review.trim(), shot.id + ': missing actual visual review');
    assert(md.includes('```text\n' + record.prompt + '\n```'), shot.id + ': Markdown exact prompt mismatch');
    assert.equal(md.split('## Visual Review\n\n').length, 2, shot.id + ': missing/duplicate Markdown review');
    assert.equal(md.split('## Visual Review\n\n')[1], record.review + '\n\nReviewed (UTC): ' + record.reviewedAt + '\n', shot.id + ': Markdown review mismatch');
    for (const line of [
      '- Started (UTC): ' + record.startedAt, '- Completed (UTC): ' + record.finishedAt,
      '- Wall time: ' + record.seconds + ' seconds', '- Saved image: ' + record.output,
      '- Size: 1536 x 1024', '- SHA-256: ' + record.sha256, '- Original tool output: ' + record.generatedFile
    ]) assert(md.split('\n').includes(line), shot.id + ': Markdown metadata mismatch: ' + line);
    milliseconds += finish - start;
    outputs.set(shot.output, record);
  }
  const expectedIds = [...IDS, 'kitchen-plate', ...Object.values(REPLACEMENTS)];
  for (const id of expectedIds) if (!ids.has(id)) pending.push(id + ' (uncommissioned)');
  const story = json('docs/storyboard/stories/timber-tractor-chapter-02.json');
  const context = {window: {}};
  vm.runInNewContext(read('docs/storyboard/standalone-stories.js'), context, {timeout: 1000});
  const reader = context.window.standaloneStories;
  assert(reader.complete(story, 2), 'Chapter 2 reader contract incomplete');
  assert.deepEqual(story.scenes.map(scene => scene.id), IDS, 'Chapter 2 reading order');
  const selections = [];
  for (const lang of LANGUAGES) {
    assert(outputs.has('docs/storyboard/' + story.cover[lang]), lang + ': cover lacks audited art');
    const edition = reader.edition(story, lang);
    assert.equal(edition.images.length, 10, lang + ': expected ten reading images');
    edition.images.forEach((image, i) => {
      assert.equal(image.src, story.scenes[i].image, lang + ': reader selection mismatch');
      const selectedId = REPLACEMENTS[IDS[i]] || IDS[i];
      if (!partial) assert.equal(image.src, ART.slice('docs/storyboard/'.length) + selectedId + '.png', lang + ': corrected reader version not selected');
      assert.deepEqual([image.width, image.height], [1536, 1024], lang + ': reader dimensions');
      assert(!image.src.includes('kitchen-plate'), lang + ': intermediate plate selected');
      const output = 'docs/storyboard/' + image.src;
      assert(partial || outputs.has(output), lang + ': reader image not audited: ' + output);
      selections.push({language: lang, id: IDS[i], output, audited: outputs.has(output)});
    });
  }
  if (!partial) {
    assert.deepEqual(pending, [], 'Chapter art incomplete');
    assert.equal(failedRequests, 0, 'Unexpected failed attempt; retain and review its history');
    assert.deepEqual([...ids].sort(), expectedIds.sort(), 'Expected eleven initial outputs and two retained correction attempts');
    const html = read(plan.report);
    for (const record of outputs.values()) {
      assert(html.includes('id="' + esc(record.id) + '"'), record.id + ': missing journal section');
      assert(html.includes(esc(record.prompt)), record.id + ': journal exact prompt missing');
      assert(html.includes(esc(record.review)), record.id + ': journal review missing');
    }
    const unregistered = fs.readdirSync(resolve(ART)).filter(file => file.endsWith('.png') && !outputs.has(ART + file));
    assert.deepEqual(unregistered, [], 'Unregistered PNG attempts; preserve and register history');
  }
  return {result: pending.length ? 'PENDING' : 'PASS', inspectedTriplets: outputs.size, failedRequests, pending,
    summedSuccessfulCallSeconds: milliseconds / 1000,
    timingMeaning: 'Sum of successful image-call wall times, not project elapsed time or cost.',
    originalOutputHashesChecked: outputs.size - originalsUnavailable.length, originalsUnavailable,
    readerSelections: selections.length, auditedReaderSelections: selections.filter(item => item.audited).length,
    uniqueReaderImages: new Set(selections.map(item => item.output)).size,
    supersededCandidates: Object.keys(REPLACEMENTS).filter(id => outputs.has(ART + id + '.png') &&
      !selections.some(item => item.output === ART + id + '.png')),
    visualApproval: 'Independent inspection recorded; final approval remains with Miguel.'};
}

if (require.main === module) {
  try { console.log(JSON.stringify(audit({partial: process.argv.includes('--partial')}), null, 2)); }
  catch (error) { console.error('FAIL: ' + error.message); process.exitCode = 1; }
}
module.exports = {audit};
