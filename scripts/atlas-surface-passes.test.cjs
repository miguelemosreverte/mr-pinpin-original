const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { SETTINGS, OLD_GROUND, smoothDepth, calibrateDepth, normalField, linearLuminance, motionMask } = require('./build-atlas-surface-passes.cjs');
const root = path.resolve(__dirname, '../docs/storyboard');
const samplerModule = import(pathToFileURL(path.join(root, 'gpu/surface.js')).href);
const decode = (rgb, i) => {
  const n = [rgb[i] / 127.5 - 1, rgb[i + 1] / 127.5 - 1, rgb[i + 2] / 127.5 - 1];
  const length = Math.hypot(...n);
  assert(Math.abs(length - 1) < 0.014, 'RGB quantization stays near unit length');
  return n.map(v => v / length);
};

test('bilateral depth preserves a continuous slope and a strong occluder step', () => {
  const w = 49, h = 25, d = Float32Array.from({ length: w * h }, (_, i) => (i % w < 24 ? 0.1 : 0.75) + Math.floor(i / w) * 0.003);
  const result = smoothDepth(d, w, h);
  for (let y = 9; y < h - 9; y++) {
    assert(result[y * w + 24] - result[y * w + 23] > 0.6, 'silhouette survives');
    assert(result[y * w + 10] > result[(y - 1) * w + 10] + 0.0029, 'surface retains gradient');
  }
  const noisy = Float32Array.from({ length: w * h }, (_, i) => 0.4 + (i % 2 ? 0.01 : -0.01));
  const smooth = smoothDepth(noisy, w, h);
  assert(Math.abs(smooth[12 * w + 24] - 0.4) < 0.001, 'fine noise attenuated');
});

test('v2 lake follows monotonic ground, with bounded local occluders and matching focus', async () => {
  const { groundDepthV2 } = await samplerModule;
  const w = 12, h = 1024;
  const source = Float32Array.from({ length: w * h }, (_, i) => i % w < 6 ? 0.95 : 0.01);
  const result = calibrateDepth(source, w, h);
  for (let y = 0; y < h; y++) {
    const ground = groundDepthV2((y + 0.5) / h), lake = result[y * w], canopy = result[y * w + 9];
    assert(Math.abs(lake - ground) < 1e-6, 'bright lake matches lens ground focus');
    assert(canopy <= lake && lake - canopy <= 0.120001, 'tree lift bounded at every row');
    if (y) assert(result[(y - 1) * w] > lake, 'lake distance varies monotonically across plane');
  }
  assert(result[200 * w + 9] > result[700 * w], 'distant trees remain farther than foreground lake');
});

test('exported v2 calibration matches generator, sidecar and texel-center lens values', async () => {
  const { DEPTH_CALIBRATION_V2: calibration, groundDepthV2, lensDepthV2 } = await samplerModule;
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'images/atlas/shire-depth-continuous-v2.json')));
  for (const key of ['groundFar', 'groundSpan', 'occluderGain', 'maxOccluderLift']) {
    assert.equal(calibration[key], SETTINGS[key]);
    assert.equal(calibration[key], manifest.settings[key]);
  }
  assert.deepEqual(calibration.oldGroundReference, OLD_GROUND);
  assert.deepEqual(calibration.oldGroundReference, manifest.oldGroundReference);
  assert(Object.isFrozen(calibration) && Object.isFrozen(calibration.oldGroundReference));
  assert(calibration.oldGroundReference.every(Object.isFrozen));
  const width = 17, height = 1024;
  const source = Float32Array.from({ length: width * height }, (_, i) => (i % width) / (width - 1));
  const field = calibrateDepth(source, width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x;
    assert.equal(Math.fround(lensDepthV2(source[index], (y + 0.5) / height)), field[index]);
  }
  for (const [y, reference] of OLD_GROUND) {
    assert.equal(lensDepthV2(reference, y / 1024), groundDepthV2(y / 1024));
    assert(Math.abs(lensDepthV2(reference - 0.2, y / 1024) - (groundDepthV2(y / 1024) - 0.06)) < 1e-12);
  }
  assert.equal(lensDepthV2(0, -1), lensDepthV2(0, 0));
  assert.equal(lensDepthV2(0, 2), lensDepthV2(0, 1));
  assert.throws(() => lensDepthV2(NaN, 0.5), /finite/);
});

test('normal handedness matches right-handed camera axes and receding ground', () => {
  const w = 31, h = 25;
  for (const [dx, dy] of [[0, 0], [0.004, 0], [0, -0.004], [-0.003, 0.002]]) {
    const depth = Float32Array.from({ length: w * h }, (_, i) => 0.5 + (i % w) * dx + Math.floor(i / w) * dy);
    const rgb = normalField(depth, w, h), n = decode(rgb, (12 * w + 15) * 3);
    const expected = [SETTINGS.depthScale * h * dx, -SETTINGS.depthScale * h * dy, 1];
    const norm = Math.hypot(...expected);
    expected.forEach((v, c) => assert(Math.abs(n[c] - v / norm) < 0.006));
  }
  const step = Float32Array.from({ length: w * h }, (_, i) => i % w < 15 ? 0.1 : 0.9);
  const n = decode(normalField(step, w, h), (12 * w + 14) * 3);
  assert(n[2] > 0.999, 'occluder boundary is not treated as a connecting ramp');
});

test('brightness uses linear Rec.709 luminance, never gamma-coded grayscale', () => {
  assert.deepEqual([...linearLuminance(Buffer.from([255,255,255, 0,0,0, 128,128,128, 255,0,0, 0,255,0, 0,0,255]))],
    [255, 0, 55, 54, 182, 18]);
});

test('compact sampler clamps UVs, handles optional inputs and renormalizes interpolation', async () => {
  const { createSurfaceSampler } = await samplerModule;
  assert.deepEqual(createSurfaceSampler().sample(0, 0), { depth: 0.5, normal: [0,0,1] });
  const depth = { width: 2, height: 1, channels: 1, data: Uint8Array.of(0, 255) };
  const normal = { width: 2, height: 1, channels: 3, data: Uint8Array.of(218,128,218, 37,128,218) };
  const sampler = createSurfaceSampler(depth, normal);
  assert.equal(sampler.byteLength, 256 * 171 * 4);
  assert.equal(sampler.depthAt(-20, -1), 0);
  assert.equal(sampler.depthAt(20, 2), 1);
  assert.equal(sampler.depthAt(0.5, 0.5), 0.5);
  const n = sampler.normalAt(0.5, 0.5);
  assert(Math.abs(Math.hypot(...n) - 1) < 1e-12);
  assert(n[2] > 0.999);
  assert.deepEqual(sampler.sampleWorld(768, 512), sampler.sample(0.5, 0.5));
  assert.throws(() => createSurfaceSampler(null, { ...normal, data: Uint8Array.of(0) }), /packed/);
});

test('motion mask leaves buildings, bridge and trunks still, with feathered water and subtle canopy', () => {
  const w = 512, h = 342, rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) rgb.set([60, 160, 160], i * 3);
  const mask = motionMask(rgb, w, h), at = (x, y) => mask[Math.floor(y / 1024 * h) * w + Math.floor(x / 1536 * w)];
  assert.equal(at(640, 370), 255);
  for (const p of [[956,609],[315,661],[323,322],[1220,135],[1390,753],[605,486],[852,305]]) assert.equal(at(...p), 0, `static at ${p}`);
  assert(mask.some(v => v > 0 && v < 255), 'feather coverage exists');
  for (let i = 0; i < w * h; i++) rgb.set([100, 150, 40], i * 3);
  const leaves = motionMask(rgb, w, h);
  const canopy = leaves[Math.floor(183 / 1024 * h) * w + Math.floor(340 / 1536 * w)];
  assert(canopy > 0 && canopy <= Math.round(255 * 0.22));
});

test('generated assets match source provenance and compact data stays unit length', () => {
  for (const name of ['shire-depth-continuous-v2','shire-normal-v2','shire-highlight-v2','shire-motion-mask-v1']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'images/atlas', name + '.json')));
    assert(manifest.estimated);
    assert(Number.isFinite(Date.parse(manifest.generatedAt)));
    for (const record of [...manifest.sources, ...manifest.outputs, ...(manifest.compact ? [manifest.compact] : [])]) {
      const bytes = fs.readFileSync(path.join(root, 'images/atlas', record.file));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
    }
  }
  const bytes = fs.readFileSync(path.join(root, 'images/atlas/shire-normal-v2.rgb.bin'));
  assert.equal(bytes.length, 256 * 171 * 3);
  for (let i = 0; i < bytes.length; i += 3) assert(decode(bytes, i)[2] > 0);
});
