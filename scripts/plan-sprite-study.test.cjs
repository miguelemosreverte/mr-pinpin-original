'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync, spawnSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {makePlan, promptFor, writePlan} = require('./plan-sprite-study.cjs');
const script = path.join(__dirname, 'plan-sprite-study.cjs');

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sprite-plan-')));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}

test('defaults remain explicitly incomplete and never imply image generation', () => {
  const plan = makePlan();
  assert.equal(plan.imageCalls, 0);
  assert.equal(plan.provider, null);
  assert.equal(plan.model, null);
  assert.equal(plan.missingRoles.length, 2);
  assert.deepEqual(plan.phases, [0, 0.25, 0.5, 0.75]);
  assert.deepEqual(plan.stages.map(stage => stage.frames), [4, 8, 16, 30]);
  assert.match(promptFor(plan), /No files supplied yet/);
});

test('24 angles mean 15 degrees; memory scales by characters, angles, frames and area', () => {
  const base = makePlan({characters: 'pinpin,mama', frames: '8', angles: '24', resolution: '128x256'});
  assert.equal(base.angleStepDegrees, 15);
  assert.equal(base.headingDegrees.at(-1), 345);
  assert.equal(base.estimate.sprites, 384);
  assert.equal(base.estimate.rgbaBytes, 384 * 128 * 256 * 4);
  const size = options => makePlan({frames: '4', angles: '12', resolution: '128x128', ...options}).estimate.rgbaBytes;
  assert.equal(size({frames: '8'}), 2 * size({}));
  assert.equal(size({frames: '8', angles: '24'}), 4 * size({}));
  assert.equal(size({resolution: '256x256'}), 4 * size({}));
});

test('four and eight samples preserve the same cycle duration and shared poses', () => {
  const four = makePlan({cycleSeconds: '0.8'}), eight = makePlan({frames: '8', cycleSeconds: '0.8'});
  assert.equal(four.cycleSeconds, eight.cycleSeconds);
  assert.deepEqual(four.sampleSeconds, eight.sampleSeconds.filter((_, i) => i % 2 === 0));
  assert.equal(eight.samplesPerSecond, 10);
  for (const cycleSeconds of ['0', '-1', 'Infinity', '61', 'oops']) assert.throws(() => makePlan({cycleSeconds}));
});

test('single-angle trials retain their actual guide heading and wrap full rotations', () => {
  assert.deepEqual(makePlan({angleOffset: '105'}).headingDegrees, [105]);
  assert.deepEqual(makePlan({angleOffset: '330', angles: '4'}).headingDegrees, [330, 60, 150, 240]);
  for (const angleOffset of ['-1', '360', '', 'Infinity', 'oops']) assert.throws(() => makePlan({angleOffset}));
});

test('invalid dimensions, counts, stages and character identities fail before writes', () => {
  for (const options of [{frames: '5'}, {frames: '0'}, {frames: '4.0'}, {angles: '-1'},
    {angles: '361'}, {angles: 'Infinity'}, {characters: ''}, {characters: 'pinpin,pinpin'},
    {characters: '../pinpin'}, {resolution: '256'}, {resolution: '0x256'}, {resolution: '8193x1'}]) {
    assert.throws(() => makePlan(options));
  }
});

test('input roles preserve exact bytes and canonical read-only symlink sources', t => {
  const root = fixture(t), source = path.join(root, 'reference.png'), link = path.join(root, 'guide.png');
  fs.writeFileSync(source, 'small-byte-fixture');
  fs.symlinkSync(source, link);
  const plan = makePlan({reference: ['pinpin=' + source], guide: ['pinpin=' + link]});
  assert.deepEqual(plan.missingRoles, []);
  assert.equal(plan.appearanceReferences[0].sha256, createHash('sha256').update('small-byte-fixture').digest('hex'));
  assert.equal(plan.motionGuides[0].path, source);
  assert.equal(plan.motionGuides[0].role, 'rig-motion-guide');
  assert.equal(plan.motionGuides[0].visualValidation, 'not-performed');
  assert.match(promptFor(plan), /appearance-reference \| character=pinpin/);
  assert.match(promptFor(plan), /not a claim that any image tool supports exact output dimensions/);
  assert.equal(fs.readFileSync(source, 'utf8'), 'small-byte-fixture');
  for (const reference of [['mama=' + source], ['pinpin=' + root], ['pinpin='], [source]])
    assert.throws(() => makePlan({reference}));
});

test('CLI writes exactly two planning files and refuses overwrites', t => {
  const root = fixture(t), out = path.join(root, 'plan');
  const result = JSON.parse(execFileSync(process.execPath, [script, '--out-dir', out,
    '--frames', '30', '--angles', '24', '--resolution', '512x256'], {encoding: 'utf8'}));
  assert.equal(result.imageCalls, 0);
  assert.deepEqual(fs.readdirSync(out).sort(), ['plan.json', 'prompt.txt']);
  const before = fs.readFileSync(path.join(out, 'plan.json'));
  assert.throws(() => writePlan({outDir: out}));
  assert(fs.readFileSync(path.join(out, 'plan.json')).equals(before));
  assert.equal(spawnSync(process.execPath, [script, '--unknown']).status, 1);
  assert.match(execFileSync(process.execPath, [script, '--help'], {encoding: 'utf8'}), /never overwrites/);
});

test('output containment and symlink guards reject before touching destinations', t => {
  const root = fixture(t), repo = path.resolve(__dirname, '..');
  assert.throws(() => writePlan({outDir: path.join(repo, 'not-created-sprite-study')}), /outside the checkout/);
  fs.symlinkSync(repo, path.join(root, 'checkout'));
  assert.throws(() => writePlan({outDir: path.join(root, 'checkout', 'not-created')}), /outside the checkout/);
  fs.symlinkSync(path.join(root, 'absent'), path.join(root, 'dangling'));
  assert.throws(() => writePlan({outDir: path.join(root, 'dangling')}), /EEXIST/);
  fs.symlinkSync(root, path.join(root, 'alias'));
  assert.throws(() => writePlan({outDir: path.join(root, 'alias', 'not-created')}), /canonical path/);
  assert.throws(() => writePlan({outDir: path.join(root, 'missing', 'plan')}), /ENOENT/);
  assert(!fs.existsSync(path.join(root, 'not-created')));
});
