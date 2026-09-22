'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {build, readManifest} = require('./build-video-sprite-review.cjs');
const {createBoundaryState, queueAngle, advanceBoundary} = require('./video-sprite-boundary.cjs');

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'video-review-')));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const trial = path.join(root, 'trial'); fs.mkdirSync(trial);
  const manifest = {version: 1, angles: [105, 120].map(degrees => ({degrees, nativeVideo: null, cycle: null}))};
  const save = () => fs.writeFileSync(path.join(trial, 'review-manifest.json'), JSON.stringify(manifest));
  save(); return {root, trial, data: manifest, save, out: path.join(root, 'review')};
}

test('switch waits for the next cycle boundary and records actual wall latency', () => {
  let state = advanceBoundary(createBoundaryState(), 250, 250);
  state = queueAngle(state, 1, 250);
  state = advanceBoundary(state, 999, 999);
  assert.equal(state.active, 0); assert.equal(state.pending, 1);
  state = advanceBoundary(state, 1005, 1005);
  assert.equal(state.active, 1); assert.equal(state.pending, null);
  assert.equal(state.lastLatencyMs, 755);
  assert.equal(state.playbackMs, 1005);
});

test('paused requests cannot switch, current-angle request cancels, repeated queue keeps latency origin', () => {
  let state = advanceBoundary(createBoundaryState(), 400, 400);
  state = queueAngle(state, 1, 400);
  assert.equal(queueAngle(state, 1, 800).requestedAt, 400);
  state = advanceBoundary(state, 400, 3400);
  assert.equal(state.active, 0);
  assert.equal(queueAngle(state, 0, 3400).pending, null);
  state = advanceBoundary(state, 1000, 4000);
  assert.equal(state.lastLatencyMs, 3600);
  state = queueAngle(state, 0, 4001);
  state = advanceBoundary(state, 1999, 4999);
  assert.equal(state.active, 1);
  state = advanceBoundary(state, 2000, 5000);
  assert.equal(state.active, 0);
});

test('boundary helper rejects invalid indices, durations and backwards clocks', () => {
  assert.throws(() => createBoundaryState(0));
  assert.throws(() => queueAngle(createBoundaryState(), 2, 0));
  assert.throws(() => queueAngle(createBoundaryState(), 1, NaN));
  assert.throws(() => advanceBoundary(advanceBoundary(createBoundaryState(), 20, 20), 19, 21));
  assert.throws(() => advanceBoundary(queueAngle(createBoundaryState(), 1, 5000), 1000, 1));
});

test('pending native and cycle state builds without pretending media exist', t => {
  const f = fixture(t); const output = build(f);
  const html = fs.readFileSync(output, 'utf8');
  assert(html.includes('Native video pending'));
  assert(html.includes('Cycles pending / native outputs remain available'));
  assert(html.includes('disabled'));
  assert(!html.includes('autoplay'));
  assert.deepEqual(fs.readdirSync(f.out).sort(), ['assets', 'boundary.js', 'index.html', 'review-provenance.json']);
  assert.throws(() => build(f), /EEXIST/);
});

test('native videos and ordered extracted frames are copied and hashed; data cannot inject scripts', t => {
  const f = fixture(t);
  for (const name of ['native.mp4', 'first.png', 'second.png']) fs.writeFileSync(path.join(f.trial, name), 'fixture-' + name);
  f.data.title = '</script><img src=x onerror=alert(1)>';
  for (const angle of f.data.angles) {
    angle.nativeVideo = 'native.mp4';
    angle.contacts = ['first.png'];
    angle.cycle = {frames: ['first.png', 'second.png'], durationSeconds: 1, certified: false, boundaryPose: 'stance'};
  }
  f.save(); build(f);
  const receipt = JSON.parse(fs.readFileSync(path.join(f.out, 'review-provenance.json')));
  assert.equal(receipt.assets.length, 3);
  assert(receipt.assets.every(asset => /^[a-f0-9]{64}$/.test(asset.sha256)));
  assert(fs.readFileSync(path.join(f.out, receipt.assets[0].output)).equals(fs.readFileSync(path.join(f.trial, 'native.mp4'))));
  const html = fs.readFileSync(path.join(f.out, 'index.html'), 'utf8');
  assert(!html.includes('</script><img'));
  assert(html.includes('UNCERTIFIED CYCLES'));
});

test('invalid timing, certification, angle, duplicate frames and missing files fail without outputs', t => {
  const f = fixture(t);
  for (const name of ['first.png', 'second.png']) fs.writeFileSync(path.join(f.trial, name), 'fixture');
  const valid = {frames: ['first.png', 'second.png'], durationSeconds: 1, certified: false, boundaryPose: null};
  for (const change of [{durationSeconds: 5}, {certified: 'true'}, {certified: true},
    {frames: ['first.png', 'first.png']}, {frames: ['missing.png']}, {frames: [null]}]) {
    f.data.angles[0].cycle = {...valid, ...change}; f.save();
    assert.throws(() => build(f)); assert(!fs.existsSync(f.out));
  }
  f.data.angles[0].cycle = null; f.data.angles[0].degrees = 90; f.save();
  assert.throws(() => readManifest(f.trial, 'review-manifest.json'), /105 then 120/);
});

test('trial and output containment reject traversal, escaping input links and output aliases', t => {
  const f = fixture(t), external = path.join(f.root, 'outside.mp4'); fs.writeFileSync(external, 'fixture');
  fs.symlinkSync(external, path.join(f.trial, 'link.mp4'));
  for (const nativeVideo of ['../outside.mp4', external, 'link.mp4']) {
    f.data.angles[0].nativeVideo = nativeVideo; f.save(); assert.throws(() => build(f));
  }
  f.data.angles[0].nativeVideo = null; f.save();
  fs.symlinkSync(f.root, path.join(f.root, 'alias'));
  assert.throws(() => build({...f, out: path.join(f.root, 'alias', 'review')}), /canonical/);
  assert.throws(() => build({...f, out: path.join(__dirname, 'forbidden-review')}), /outside/);
  fs.symlinkSync(path.join(f.root, 'missing'), f.out);
  assert.throws(() => build(f), /EEXIST/);
});

test('rejected gait remains explicit and cannot claim cycle certification', t => {
  const f = fixture(t);
  f.data.verdict = 'rejected-gait'; f.data.reviewNotes = 'Diagnostic only; not accepted motion.'; f.save();
  build(f);
  assert(fs.readFileSync(path.join(f.out, 'index.html'), 'utf8').includes('REJECTED GAIT / PROVISIONAL TIMING ONLY'));
  f.data.angles[0].cycle = {durationSeconds: 1, certified: true, boundaryPose: 'stance', frames: []}; f.save();
  assert.throws(() => readManifest(f.trial, 'review-manifest.json'), /Rejected gait cannot be certified/);
});

test('exact submission provenance validates anchor hash and omits remote transport URLs', t => {
  const f = fixture(t), anchor = Buffer.alloc(24);
  anchor.write('PNG', 1); anchor.writeUInt32BE(887, 16); anchor.writeUInt32BE(887, 20);
  fs.writeFileSync(path.join(f.trial, 'anchor.png'), anchor);
  const hash = require('node:crypto').createHash('sha256').update(anchor).digest('hex');
  const saved = {sourceHash: hash, model: 'test/endpoint', input: {prompt: 'Exact recorded prompt.',
    image_url: 'https://private.invalid/transport', end_image_url: 'https://private.invalid/transport',
    duration: 6, fps: 24, resolution: '1080p', aspect_ratio: 'auto', generate_audio: false},
    metadata: {width: 1920, height: 1080}, priceEstimate: {amount: 0.36}};
  fs.writeFileSync(path.join(f.trial, 'submission.json'), JSON.stringify(saved));
  f.data.angles[0].anchor = 'anchor.png'; f.data.angles[0].submission = 'submission.json'; f.save();
  build(f); const html = fs.readFileSync(path.join(f.out, 'index.html'), 'utf8');
  assert(html.includes('Exact recorded prompt.')); assert(html.includes('887 x 887'));
  assert(html.includes('BOTH start and end')); assert(!html.includes('private.invalid'));
  fs.writeFileSync(path.join(f.trial, 'anchor.png'), 'changed');
  assert.throws(() => readManifest(f.trial, 'review-manifest.json'), /anchor hash differs/);
});

test('book-only section leads without a rig and validates both original reference hashes', t => {
  const f = fixture(t), digest = name => require('node:crypto').createHash('sha256').update(name).digest('hex');
  for (const name of ['book-face.png', 'book-body.png', 'fresh.png']) fs.writeFileSync(path.join(f.trial, name), name);
  fs.writeFileSync(path.join(f.trial, 'fresh.md'), 'Exact submitted prompt\nOnly original book inputs.\n' + digest('book-face.png') + '\n' + digest('book-body.png'));
  f.data.angles = [];
  f.data.bookOnly = {image: 'fresh.png', record: 'fresh.md', references: ['book-face.png', 'book-body.png']};
  f.save(); build(f);
  const html = fs.readFileSync(path.join(f.out, 'index.html'), 'utf8');
  assert(html.includes('id="book-only-image" style="background:#fff"'));
  assert(html.includes('Only original book inputs.'));
  assert.equal(readManifest(f.trial, 'review-manifest.json').guidePair, null);
  assert(html.indexOf('id="book-only"') < html.indexOf('Selected-cycle preview'));
  fs.writeFileSync(path.join(f.trial, 'clip.mp4'), 'clip');
  fs.writeFileSync(path.join(f.trial, 'pixverse.json'), JSON.stringify({sourceHash: digest('fresh.png'),
    status: 'complete', model: 'fal-ai/pixverse/v6/transition', input: {prompt: 'One view only.',
      first_image_url: 'https://private.invalid/keyframe', last_image_url: 'https://private.invalid/keyframe',
      duration: 1, resolution: '720p', generate_audio_switch: false}, metadata: {sha256: digest('clip')}}));
  f.data.bookOnly.video = 'clip.mp4'; f.data.bookOnly.submission = 'pixverse.json'; f.save();
  const parsed = readManifest(f.trial, 'review-manifest.json');
  assert(parsed.bookOnly.submission.sameStartEnd);
  assert.deepEqual(parsed.bookOnly.submission.inputFields, ['first_image_url', 'last_image_url']);
  assert.equal(parsed.bookOnly.submission.parameters.duration, 1);
  const second = build({...f, out: path.join(f.root, 'single-view')});
  const secondHTML = fs.readFileSync(second, 'utf8');
  assert(secondHTML.includes('One view only.')); assert(!secondHTML.includes('private.invalid'));
  fs.writeFileSync(path.join(f.trial, 'clip.mp4'), 'changed');
  assert.throws(() => readManifest(f.trial, 'review-manifest.json'), /native video hash differs/);
  fs.writeFileSync(path.join(f.trial, 'book-body.png'), 'changed');
  assert.throws(() => readManifest(f.trial, 'review-manifest.json'), /match hashes/);
});
