const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../docs/storyboard/gpu/occlusion.js'), 'utf8');
const modulePromise = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('calibrated ground and foot depth preserve clear ground and minor shading', async () => {
  const { groundDepth, visibility, GROUND_SAMPLES } = await modulePromise;
  for (const [y, depth] of GROUND_SAMPLES) assert.equal(groundDepth(y), depth);
  assert.equal(groundDepth(-100), GROUND_SAMPLES[0][1]);
  assert.equal(groundDepth(1500), GROUND_SAMPLES.at(-1)[1]);
  for (let y = 200; y <= 640; y++) {
    const foot = groundDepth(y);
    assert.equal(visibility(foot, foot), 1);
    assert.equal(visibility(foot - 0.11, foot), 1, 'small artistic shading must not perforate overlays');
    assert.equal(visibility(foot - 0.18, foot), 0, 'strong foreground hides overlays');
    const feather = visibility(foot - 0.145, foot);
    assert(Math.abs(feather - 0.5) < 1e-10);
  }
  const foot = groundDepth(600);
  assert.equal(visibility(0.1, foot), 0, 'canopy hides head using foot depth');
  assert.equal(visibility(0.38, foot), 1, 'feet on exposed ground remain visible');
  assert.equal(visibility(0.1, groundDepth(550)), 0, 'trail behind canopy is hidden');
  assert.equal(visibility(0.1, 0.1), 1, 'self-depth comparison would incorrectly keep the canopy overlay');
});

test('compressed foreground range hides woodland without erasing road or doors', async () => {
  const { groundDepth, visibility } = await modulePromise;
  for (const [x, y, red] of [[650,860,21],[700,875,37],[860,910,30.6],
    [900,910,26.1],[940,910,28.9],[980,910,35],[1020,908,44.3],
    [1060,900,38.9],[1100,890,18.4],[1140,875,17.6],
    [1240,740,42.1],[1240,700,32.7],[1240,660,33.3]]) {
    assert.equal(visibility(red / 255, groundDepth(y)), 0, `canopy ${x},${y}`);
  }
  for (const [x, y, red] of [[500,825,58],[575,845,66.4],[780,905,63.4],
    [1248,820,83.6],[1240,780,63.4],[300,695,61.4],[1212,205,109.9]]) {
    assert.equal(visibility(red / 255, groundDepth(y)), 1, `clear road/door ${x},${y}`);
  }
  assert.equal(visibility(26 / 255, 26 / 255), 1, 'sampling canopy as foot depth is invalid');
  assert.equal(visibility(26 / 255, groundDepth(910)), 0, 'independent ground depth hides character');
});

test('ground texture and sprite allocation stay bounded and match calibration metadata', async () => {
  const { createOcclusionLayer, GROUND_SAMPLES } = await modulePromise;
  const calibration = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/storyboard/gpu/occlusion-calibration.json')));
  assert.deepEqual(GROUND_SAMPLES, calibration.clearPathSamples.map(({ point, red }) => [point[1], red / 255]));
  const prior = global.document;
  let uploaded;
  global.document = { createElement: () => ({ getContext: () => ({
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: pixels => { uploaded = pixels; }
  }) }) };
  try {
    const layer = createOcclusionLayer(1024);
    assert.equal(layer.canvas.width * layer.canvas.height * 4, 65536);
    assert.equal(layer.ground.width * layer.ground.height * 4, 4096);
    assert.equal(uploaded.data.length, 4096);
    assert.equal(layer.ready, false);
  } finally { if (prior === undefined) delete global.document; else global.document = prior; }
});
