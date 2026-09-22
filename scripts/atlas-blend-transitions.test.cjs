const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {assessPair, features} = require('./build-atlas-blend-transitions.cjs');

function mask(x, y, width, height) {
  const result = new Uint8Array(128 * 128);
  for (let row = y; row < y + height; row++) for (let column = x; column < x + width; column++) result[row * 128 + column] = 1;
  return result;
}
const frame = (bodyX = 40, faceX = 55) => ({alpha: mask(bodyX, 60, 40, 40), face: mask(faceX, 80, 8, 8)});
const phases = value => Array(4).fill(value);

test('permission is symmetric and permits the nominal 345/0 neighbor but never larger turns', () => {
  const frames = phases(frame());
  for (const [from, to] of [[120, 135], [135, 120], [345, 0], [0, 345]]) {
    assert.equal(assessPair(from, to, frames, frames).allowed, true);
  }
  for (const to of [0, 30, 180, 330]) assert.equal(assessPair(0, to, frames, frames).allowed, false);
});

test('one incompatible gait phase rejects the pair even when most comparisons are identical', () => {
  const a = phases(frame()), b = [frame(), frame(), frame(), frame(47)];
  const pair = assessPair(0, 15, a, b);
  assert.equal(pair.comparisons.length, 16);
  assert.equal(pair.allowed, false);
  assert(pair.reasons.includes('silhouette-displacement'));
  assert.equal(pair.allowed, assessPair(15, 0, b, a).allowed);
});

test('matching silhouette cannot hide displaced face detail or changed visibility', () => {
  const original = phases(frame()), displaced = phases(frame(40, 59));
  const pair = assessPair(0, 15, original, displaced);
  assert.equal(pair.score, 1);
  assert.equal(pair.allowed, false);
  assert(pair.reasons.includes('face-displacement'));
  const missing = phases({alpha: frame().alpha, face: new Uint8Array(128 * 128)});
  assert(assessPair(0, 15, original, missing).reasons.includes('face-visibility'));
});

test('empty images never qualify and invisible colored fringe creates no false face region', () => {
  const rgba = new Uint8Array(128 * 128 * 4);
  for (let i = 0; i < rgba.length; i += 4) rgba.set([255, 240, 220, 3], i);
  const empty = features(rgba);
  assert.equal(empty.alpha.reduce((sum, value) => sum + value, 0), 0);
  assert.equal(empty.face.reduce((sum, value) => sum + value, 0), 0);
  assert.equal(assessPair(0, 15, phases(empty), phases(empty)).allowed, false);
});

test('live metadata provides exactly one hash-bound record per undirected neighbor', () => {
  const root = path.resolve(__dirname, '../docs/storyboard'), context = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'atlas-directions.js'), 'utf8'), context);
  const metadata = JSON.parse(JSON.stringify(context.window.atlasDirections));
  assert.equal(metadata.displayWidth, 56);
  assert.equal(metadata.blendTransitions.length, 24);
  const keys = new Set();
  for (const pair of metadata.blendTransitions) {
    assert.equal((pair.to - pair.from + 360) % 360, 15);
    assert.equal(pair.durationMs, 80);
    assert.equal(typeof pair.allowed, 'boolean');
    assert(pair.score >= 0 && pair.score <= 1);
    if (pair.allowed) assert(pair.score >= metadata.blendTransitionProvenance.rules.minAlphaIoU);
    keys.add([pair.from, pair.to].sort((a, b) => a - b).join(':'));
  }
  assert.equal(keys.size, 24);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const source of metadata.blendTransitionProvenance.sources) {
    assert.equal(hash(fs.readFileSync(path.join(root, source.src))), source.sha256, source.src + ': stale source');
  }
  assert.equal(hash(JSON.stringify({displayWidth: metadata.displayWidth,
    directions: [...metadata.directions].sort((a, b) => a.angle - b.angle)})), metadata.blendTransitionProvenance.geometrySha256);
});
