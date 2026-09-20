const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const vm = require('node:vm');

const PLAN_NAMES = ['title', 'covers', 'story', 'environments', 'corrections', 'family'];
const LANGUAGES = ['en', 'es', 'ru'];
const ART = 'docs/storyboard/images/standalone/timber-tractor';
const KNOWN_FAILURES = ['scene-08-failed-01.json', 'scene-13-failed-01.json', 'scene-18-v2-failed-01.json'];
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function timestamp(value, label) {
  assert.equal(typeof value, 'string', `${label}: expected UTC timestamp`);
  const time = Date.parse(value);
  assert(Number.isFinite(time) && value.endsWith('Z'), `${label}: invalid UTC timestamp`);
  assert.equal(new Date(time).toISOString(), value, `${label}: expected canonical ISO UTC`);
  return time;
}

function png(bytes, label) {
  assert(bytes.length >= 33 && bytes.subarray(0, 8).equals(PNG_SIGNATURE), `${label}: invalid PNG`);
  assert.equal(bytes.readUInt32BE(8), 13, `${label}: invalid IHDR length`);
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR', `${label}: missing IHDR`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function audit(root = path.resolve(__dirname, '..')) {
  const resolve = file => {
    assert(typeof file === 'string' && file.trim(), 'Expected nonempty repository-relative path');
    assert(!path.isAbsolute(file), `Absolute repository path: ${file}`);
    const resolved = path.resolve(root, file);
    assert(resolved.startsWith(path.resolve(root) + path.sep), `Path escapes repository: ${file}`);
    return resolved;
  };
  const read = file => fs.readFileSync(resolve(file), 'utf8');
  const json = file => JSON.parse(read(file));
  const references = (refs, label) => {
    assert(Array.isArray(refs) && refs.length > 0, `${label}: missing references`);
    for (const ref of refs) {
      assert(fs.statSync(resolve(ref.path)).isFile(), `${label}: missing reference ${ref.path}`);
      assert(typeof ref.role === 'string' && ref.role.trim(), `${label}: missing reference role`);
    }
  };
  const records = [];
  const ids = new Set();
  const outputs = new Map();
  const plans = [];
  let totalMilliseconds = 0;

  for (const name of PLAN_NAMES) {
    const file = `docs/storyboard/production/timber-tractor-${name}.json`;
    const plan = json(file);
    assert(Array.isArray(plan.shots) && plan.shots.length > 0, `${file}: missing shots`);
    let milliseconds = 0;
    for (const shot of plan.shots) {
      const label = `${name}/${shot.id}`;
      assert(typeof shot.id === 'string' && shot.id.trim(), `${file}: missing shot id`);
      assert(!ids.has(shot.id), `${label}: duplicate id across plans`);
      ids.add(shot.id);
      const output = resolve(shot.output);
      assert(shot.output.startsWith(ART + '/') && shot.output.endsWith('.png'), `${label}: invalid output`);
      assert(!outputs.has(output), `${label}: duplicate output across plans`);
      const stem = shot.output.slice(0, -4);
      const record = json(stem + '.json');
      const md = read(stem + '.md');
      const bytes = fs.readFileSync(output);
      const dimensions = png(bytes, label);
      const expected = ['title', 'covers'].includes(name) ? [1024, 1536] : [1536, 1024];
      assert.deepEqual(dimensions, expected, `${label}: unexpected PNG dimensions`);
      assert.deepEqual([record.width, record.height], dimensions, `${label}: JSON dimensions mismatch`);
      assert.equal(record.id, shot.id, `${label}: record id mismatch`);
      assert.equal(record.output, shot.output, `${label}: record output mismatch`);
      assert.equal(record.tool, 'built-in imagegen', `${label}: unexpected image tool`);
      assert(typeof shot.prompt === 'string' && shot.prompt.trim(), `${label}: missing prompt`);
      assert.equal(record.prompt, shot.prompt, `${label}: commission prompt mismatch`);
      assert.deepEqual(record.references, shot.references, `${label}: commission references mismatch`);
      references(record.references, label);
      assert.equal(record.sha256, createHash('sha256').update(bytes).digest('hex'), `${label}: SHA-256 mismatch`);
      const start = timestamp(record.startedAt, label + ' start');
      const end = timestamp(record.finishedAt, label + ' finish');
      assert(end > start, `${label}: nonpositive duration`);
      assert.equal(record.seconds, (end - start) / 1000, `${label}: duration mismatch`);
      assert(timestamp(record.reviewedAt, label + ' review') >= end, `${label}: review precedes completion`);
      assert(typeof record.review === 'string' && record.review.trim(), `${label}: missing review`);
      assert(md.includes(`\n\x60\x60\x60text\n${record.prompt}\n\x60\x60\x60\n`), `${label}: Markdown prompt mismatch`);
      const reviewMarker = '## Visual Review\n\n';
      assert.equal(md.split(reviewMarker).length, 2, `${label}: missing/duplicate Markdown review`);
      assert.equal(md.split(reviewMarker)[1], `${record.review}\n\nReviewed (UTC): ${record.reviewedAt}\n`,
        `${label}: Markdown review mismatch`);
      for (const line of [
        `- Started (UTC): ${record.startedAt}`, `- Completed (UTC): ${record.finishedAt}`,
        `- Wall time: ${record.seconds} seconds`, `- Saved image: ${record.output}`,
        `- Size: ${record.width} x ${record.height}`, `- SHA-256: ${record.sha256}`
      ]) assert(md.split('\n').includes(line), `${label}: Markdown metadata mismatch: ${line}`);
      outputs.set(output, {shot, record, dimensions});
      records.push({plan: name, id: shot.id, output: shot.output, startedAt: record.startedAt,
        finishedAt: record.finishedAt, seconds: record.seconds});
      milliseconds += end - start;
    }
    totalMilliseconds += milliseconds;
    plans.push({name, successfulImages: plan.shots.length, summedSuccessfulCallSeconds: milliseconds / 1000});
  }

  const failureFiles = fs.readdirSync(resolve(ART)).filter(file => /-failed-\d+\.(?:json|md|png)$/.test(file));
  assert.deepEqual(failureFiles.sort(), KNOWN_FAILURES.flatMap(file => [file, file.replace(/\.json$/, '.md')]).sort(),
    'Expected exactly three retained failure JSON/Markdown pairs and no failure PNG');
  const failures = KNOWN_FAILURES.map(file => {
    const record = json(`${ART}/${file}`);
    const md = read(`${ART}/${file.replace(/\.json$/, '.md')}`);
    assert.equal(file, `${record.id}-failed-01.json`, `${file}: failure id mismatch`);
    const commissioned = outputs.get(resolve(record.output));
    assert(commissioned && commissioned.shot.id === record.id, `${file}: unknown intended output`);
    assert.equal(record.status, 'tool-error-no-output', `${file}: incorrect failure status`);
    assert.equal(record.result, null, `${file}: fabricated failure result`);
    assert.equal(record.tool, 'built-in imagegen', `${file}: incorrect failure tool`);
    assert(typeof record.error === 'string' && /network/i.test(record.error), `${file}: expected network error`);
    const observed = timestamp(record.observedAt, file + ' observed');
    if (file === 'scene-13-failed-01.json') {
      assert.equal(record.startedAt, null, `${file}: retain unknown start; do not reconstruct it`);
      assert(/start timestamp was not retained/i.test(record.error), `${file}: unknown-start explanation missing`);
    } else assert(timestamp(record.startedAt, file + ' start') <= observed, `${file}: invalid failure interval`);
    for (const field of ['sha256', 'width', 'height', 'seconds', 'finishedAt', 'generatedFile']) {
      assert(!(field in record), `${file}: invented success metadata: ${field}`);
    }
    assert(typeof record.prompt === 'string' && record.prompt.trim(), `${file}: missing historical prompt`);
    references(record.references, file);
    for (const text of [record.error, `- Started UTC: ${record.startedAt}`,
      `- Failure observed UTC: ${record.observedAt}`, `- Intended output: ${record.output}`,
      `\x60\x60\x60text\n${record.prompt}\n\x60\x60\x60`, '- No image was produced.']) {
      assert(md.includes(text), `${file}: failure Markdown/JSON mismatch`);
    }
    const matchesCurrentCommission = record.prompt === commissioned.shot.prompt;
    assert(matchesCurrentCommission, `${file}: failure commission prompt mismatch; preserve history when investigating`);
    assert.deepEqual(record.references, commissioned.shot.references, `${file}: failure references mismatch`);
    for (const ref of record.references) {
      assert(md.includes(`- ${ref.path}: ${ref.role}`), `${file}: failure Markdown references mismatch`);
    }
    return {file: `${ART}/${file}`, id: record.id, startedAt: record.startedAt,
      observedAt: record.observedAt, promptMatchesCurrentCommission: matchesCurrentCommission};
  });

  const story = json('docs/storyboard/stories/timber-tractor.json');
  const context = {window: {}};
  vm.runInNewContext(read('docs/storyboard/standalone-stories.js'), context, {timeout: 1000});
  const reader = context.window.standaloneStories;
  assert(reader.complete(story), 'Reader story contract is incomplete');
  const selected = new Set();
  const editions = LANGUAGES.map(lang => {
    const images = reader.edition(story, lang).images;
    assert.equal(images.length, 20, `${lang}: expected 20 reader images`);
    const selections = Array.from(images, (image, index) => {
      const expectedSrc = index === 0 ? story.cover[lang] : story.scenes[index].image;
      assert.equal(image.src, expectedSrc, `${lang}/${index}: reader selection mismatch`);
      const file = path.posix.join('docs/storyboard', image.src);
      const output = resolve(file);
      const audited = outputs.get(output);
      assert(audited, `${lang}/${index}: reader image lacks an audited commission: ${image.src}`);
      const expected = index === 0 ? [1024, 1536] : [1536, 1024];
      assert.deepEqual(audited.dimensions, expected, `${lang}/${index}: reader PNG dimensions mismatch`);
      assert.deepEqual([image.width, image.height], expected, `${lang}/${index}: reader dimensions mismatch`);
      selected.add(output);
      return {id: story.scenes[index].id, image: image.src};
    });
    return {language: lang, count: selections.length, selections};
  });

  assert.equal(records.length, 33, 'Expected 29 historical outputs plus four family outputs');
  assert.equal(selected.size, 22, 'Expected 19 shared reading images and three localized covers');
  const aggregate = json('docs/storyboard/production/timber-tractor-production.json');
  assert.equal(aggregate.shots.length, records.length, 'Aggregate journal omits or duplicates commissions');
  assert.deepEqual(aggregate.shots.slice(-4).map(shot => shot.id),
    ['scene-19', 'scene-20', 'scene-15-v2', 'scene-18-v2'], 'Family commissions must append to the historical journal');
  for (const shot of aggregate.shots) {
    assert.deepEqual(shot, outputs.get(resolve(shot.output))?.shot,
      `${shot.id}: aggregate commission differs from its source plan`);
  }
  assert.equal(new Set(aggregate.shots.map(shot => shot.id)).size, records.length,
    'Aggregate journal contains duplicate commissions');
  const familySequence = story.scenes.slice(13).map(scene => path.posix.basename(scene.image, '.png'));
  assert.deepEqual(familySequence,
    ['scene-14', 'scene-19', 'scene-20', 'scene-15-v2', 'scene-16', 'scene-17', 'scene-18-v2'],
    'Expected two family insertions before the picnic and two replacement picnic images');
  const superseded = ['scene-06', 'scene-07', 'scene-09', 'scene-11', 'scene-15', 'scene-18'];
  for (const id of superseded) {
    const output = resolve(`${ART}/${id}.png`);
    assert(outputs.has(output) && !selected.has(output), `${id}: retain superseded candidate outside reader selection`);
  }

  // Calls from independent agents can overlap. Sorting is presentation, not a serialization assertion.
  records.sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
  return {result: 'PASS', plans, successfulImages: records.length, failedRequests: failures.length,
    pngMarkdownJsonTriplets: records.length, summedSuccessfulCallSeconds: totalMilliseconds / 1000,
    timingMeaning: 'Sum of successful image-call wall durations; not elapsed project time, throughput, model-only time or cost. Failed requests excluded.',
    failures, supersededCandidates: superseded, reader: {languages: LANGUAGES.length, selections: editions.reduce((sum, edition) => sum + edition.count, 0),
      uniqueImages: selected.size, editions}, chronologicalCalls: records};
}

if (require.main === module) {
  try { console.log(JSON.stringify(audit(), null, 2)); }
  catch (error) { console.error('FAIL: ' + error.message); process.exitCode = 1; }
}

module.exports = {audit};
