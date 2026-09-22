const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../docs/storyboard/atlas-face-layer.js'), 'utf8');
function harness({ sourceAlpha = 255, ...options } = {}) {
  const canvases = [], window = {};
  vm.runInNewContext(source, { window });
  const createCanvas = () => {
    const ctx = { drawImage() {}, clearRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, putImageData() {},
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: (x, y, w, h) => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 3; i < data.length; i += 4) data[i] = sourceAlpha;
        return { data };
      } };
    const canvas = { width: 0, height: 0, getContext: () => ctx };
    canvases.push(canvas); return canvas;
  };
  return { api: window.AtlasFaceLayer, faces: window.AtlasFaceLayer.create({ createCanvas, ...options }), canvases };
}
const image = { width: 128, height: 128 };
function frame(id = 'heading-0-frame-0') {
  return { id, rect: [0, 0, 128, 128], anchor: [64, 112], face: {
    enabled: true, registration: id, bounds: [20, 20, 88, 88], pivot: [64, 64], features: [40, 40, 48, 48], feather: 4
  } };
}

test('unconfigured frames draw the exact body crop with no face allocations or transforms', () => {
  const h = harness(), spec = frame(); delete spec.face;
  const entry = h.faces.prepare({ image, frame: spec }), calls = [];
  assert.equal(entry.enabled, false); assert.equal(entry.reason, 'unconfigured');
  assert.equal(entry.capabilities.yaw, false); assert.equal(h.faces.stats.bytes, 0);
  assert.equal(h.faces.draw({ drawImage: (...args) => calls.push(args) }, entry, { scale: 2, lift: 3, tiltDegrees: 2, blink: true }), false);
  assert.deepEqual(calls, [[image, 0, 0, 128, 128, -128, -227, 256, 256]]);
});

test('bad registration, incomplete landmarks and unsafe feature margins remain body-only', () => {
  const h = harness();
  for (const alter of [f => { f.face.registration = 'different-frame'; }, f => { delete f.face.features; },
    f => { f.face.pivot = [0, 0]; }, f => { f.face.features = [21, 21, 84, 84]; },
    f => { f.face.bounds = [0, 0, 100, 100]; f.face.pivot = [50, 50]; }]) {
    const spec = frame(); alter(spec);
    const entry = h.faces.prepare({ image, frame: spec });
    assert.equal(entry.enabled, false); assert.notEqual(entry.reason, null); assert.equal(entry.bytes, 0);
  }
});

test('cache reuses source-resolution surfaces, bounds memory and releases evicted handles', () => {
  const h = harness({ maxEntries: 2 }), first = frame(), second = frame('second'), third = frame('third');
  const a = h.faces.prepare({ image, frame: first });
  assert.equal(a.enabled, true); assert.equal(a.tilt, 2); assert.equal(a.capabilities.yaw, false);
  assert.equal(a.capabilities.blink, false); assert.equal(a.capabilities.gaze, false);
  const allocated = h.faces.stats.allocations;
  for (let i = 0; i < 100; i++) {
    assert.equal(h.faces.prepare({ image, frame: first }), a);
    h.faces.draw({ drawImage() {} }, a, { tiltDegrees: 999 });
  }
  assert.equal(h.faces.stats.allocations, allocated);
  assert.equal(h.faces.stats.hits, 100);
  h.faces.prepare({ image, frame: second }); h.faces.prepare({ image, frame: first });
  const b = h.faces.prepare({ image, frame: second }); h.faces.prepare({ image, frame: third });
  assert.equal(a.disposed, true); assert.equal(b.disposed, false);
  assert.equal(h.faces.stats.entries, 2); assert(h.faces.stats.bytes <= h.faces.stats.maxBytes);
  const calls = []; h.faces.draw({ drawImage: (...args) => calls.push(args) }, a, { tiltDegrees: 2 });
  assert.equal(calls[0][0], image, 'evicted handles safely fall back to original art');
  h.faces.clear(); assert.equal(h.faces.stats.bytes, 0); assert.equal(h.faces.stats.entries, 0);
  assert(h.canvases.every(canvas => canvas.width === 1 && canvas.height === 1));
});

test('budget failures and explicit revision invalidation cannot leave a partial facial layer', () => {
  const small = harness({ maxBytes: 16 }), spec = frame();
  const rejected = small.faces.prepare({ image, frame: spec });
  assert.equal(rejected.enabled, false); assert.equal(rejected.reason, 'budget'); assert.equal(small.faces.stats.bytes, 0);
  const h = harness(), entry = h.faces.prepare({ image, frame: spec });
  spec.revision = 1;
  const next = h.faces.prepare({ image, frame: spec });
  assert.notEqual(next, entry); assert.equal(entry.disposed, true); assert.equal(next.enabled, true);
  h.faces.invalidate(spec); assert.equal(next.disposed, true); assert.equal(h.faces.stats.bytes, 0);
});

test('matching blink/gaze metadata is required and neither yaw nor invented eye movement exists', () => {
  const h = harness(), spec = frame();
  spec.face.eyes = [{ bounds: [46, 46, 20, 20], blink: { image, rect: spec.rect, registration: 'wrong' },
    gaze: { left: { image, rect: [0, 0, 64, 64], registration: spec.id } } }];
  const missing = h.faces.prepare({ image, frame: spec });
  assert.equal(missing.capabilities.blink, false); assert.equal(missing.capabilities.gaze, false);
  spec.face.eyes[0].blink.registration = spec.id;
  spec.face.eyes[0].gaze.left.rect = spec.rect; spec.revision = 1;
  const ready = h.faces.prepare({ image, frame: spec });
  assert.equal(ready.capabilities.blink, true); assert.equal(ready.capabilities.gaze, true);
  assert.equal(ready.capabilities.yaw, false);
  const calls = [];
  h.faces.draw({ drawImage: (...args) => calls.push(args) }, ready, { blink: true, gaze: 'left' });
  assert.equal(calls.length, 1, 'all layers compose before applying caller opacity');
});

test('eyes-only metadata accepts bounded explicit tolerance and reports measured band errors', () => {
  const h = harness(), spec = frame(); spec.face.maxTiltDegrees = 0;
  const blink = { image, rect: spec.rect, registration: spec.id, registrationTolerance: { meanError: 12, maxError: 60 } };
  spec.face.eyes = [{ bounds: [46, 46, 20, 20], blink }];
  const entry = h.faces.prepare({ image, frame: spec });
  assert.equal(entry.enabled, true); assert.equal(entry.capabilities.headTilt, false);
  assert.equal(entry.capabilities.blink, true); assert.equal(entry.capabilities.yaw, false);
  const diagnostic = entry.diagnostics[0];
  assert.equal(diagnostic.accepted, true); assert.equal(diagnostic.meanError, 0); assert.equal(diagnostic.maxError, 0);
  assert(diagnostic.samples > 0); assert.equal(diagnostic.tolerance.meanError, 12);
  for (const tolerance of [{ meanError: 13, maxError: 60 }, { meanError: 12, maxError: 61 },
    { meanError: -1, maxError: 0 }, { meanError: NaN, maxError: 20 }, { meanError: 12, maxError: 5 }]) {
    blink.registrationTolerance = tolerance; spec.revision = (spec.revision || 0) + 1;
    const rejected = h.faces.prepare({ image, frame: spec });
    assert.equal(rejected.capabilities.blink, false);
    assert.equal(rejected.diagnostics[0].reason, 'invalid-registration-tolerance');
  }
});

test('independently registered eyes survive missing or unsafe head landmarks', () => {
  const h = harness(), spec = frame();
  const blink = { image, rect: spec.rect, registration: spec.id };
  spec.face = { enabled: true, registration: spec.id, maxTiltDegrees: 0,
    eyes: [{ bounds: [46, 46, 20, 20], blink }] };
  const eyesOnly = h.faces.prepare({ image, frame: spec });
  assert.equal(eyesOnly.enabled, true); assert.equal(eyesOnly.capabilities.blink, true);
  assert.equal(eyesOnly.capabilities.headTilt, false); assert.equal(eyesOnly.headReason, 'disabled');
  const calls = [];
  assert.equal(h.faces.draw({ drawImage: (...args) => calls.push(args) }, eyesOnly, { blink: true, tiltDegrees: 2 }), true);
  assert.equal(calls.length, 1);
  spec.face.maxTiltDegrees = 2; spec.revision = 1;
  const noHead = h.faces.prepare({ image, frame: spec });
  assert.equal(noHead.capabilities.blink, true); assert.equal(noHead.capabilities.headTilt, false);
  assert.equal(noHead.headReason, 'landmarks');
  Object.assign(spec.face, { bounds: [0, 0, 128, 128], pivot: [64, 64], features: [40, 40, 48, 48] }); spec.revision++;
  const unsafeHead = h.faces.prepare({ image, frame: spec });
  assert.equal(unsafeHead.capabilities.blink, true); assert.equal(unsafeHead.capabilities.headTilt, false);
  assert.equal(unsafeHead.headReason, 'tilt-guard');
});

test('unreadable overlay does not disable a valid head layer', () => {
  const h = harness({ resolveImage() { throw Error('Image not decoded'); } }), spec = frame();
  spec.face.eyes = [{ bounds: [46, 46, 20, 20], blink: { src: 'missing.webp', rect: spec.rect, registration: spec.id } }];
  const entry = h.faces.prepare({ image, frame: spec });
  assert.equal(entry.enabled, true); assert.equal(entry.capabilities.headTilt, true);
  assert.equal(entry.capabilities.blink, false); assert.equal(entry.diagnostics[0].reason, 'Image not decoded');
});

test('near-opaque production samples accept alpha 245 through 255 but reject lower alpha', () => {
  for (const sourceAlpha of [244, 245, 252, 253, 255]) {
    const h = harness({ sourceAlpha }), spec = frame();
    spec.face.eyes = [{ bounds: [46, 46, 20, 20], blink: { image, rect: spec.rect, registration: spec.id } }];
    const entry = h.faces.prepare({ image, frame: spec });
    assert.equal(entry.capabilities.headTilt, sourceAlpha >= 245);
    assert.equal(entry.capabilities.blink, sourceAlpha >= 245);
  }
});

test('opt-in blink coverage requires every authored eye and the expected count, leaving gaze independent', () => {
  const h = harness(), spec = frame(); spec.face.maxTiltDegrees = 0;
  const asset = { image, rect: spec.rect, registration: spec.id };
  spec.face.requireAllEyes = true; spec.face.expectedEyes = 2;
  spec.face.eyes = [{ bounds: [44, 44, 16, 16], blink: asset, gaze: { left: asset } },
    { bounds: [66, 44, 16, 16], blink: { ...asset, registration: 'wrong' } }];
  const partial = h.faces.prepare({ image, frame: spec });
  assert.equal(partial.capabilities.blink, false); assert.equal(partial.capabilities.gaze, true);
  assert.equal(partial.blinkCoverage.accepted, 1); assert.equal(partial.blinkReason, 'incomplete-eye-coverage');
  const calls = [];
  assert.equal(h.faces.draw({ drawImage: (...args) => calls.push(args) }, partial, { blink: true }), false);
  assert.equal(calls[0][0], image, 'partial blink remains exact neutral art');
  assert.equal(h.faces.draw({ drawImage() {} }, partial, { blink: true, gaze: 'left' }), true, 'valid gaze remains independent');
  spec.face.eyes[1].blink = asset; spec.revision = 1;
  assert.equal(h.faces.prepare({ image, frame: spec }).capabilities.blink, true);
  spec.face.eyes.pop(); spec.revision++;
  assert.equal(h.faces.prepare({ image, frame: spec }).capabilities.blink, false, 'one authored eye cannot satisfy expected two');
  delete spec.face.expectedEyes; spec.revision++;
  assert.equal(h.faces.prepare({ image, frame: spec }).capabilities.blink, true, 'absent expected count uses authored coverage');
  spec.face.expectedEyes = NaN; spec.revision++;
  assert.equal(h.faces.prepare({ image, frame: spec }).capabilities.blink, false);
  spec.face.requireAllEyes = false; spec.revision++;
  assert.equal(h.faces.prepare({ image, frame: spec }).capabilities.blink, true, 'coverage policy is explicitly opt-in');
});
