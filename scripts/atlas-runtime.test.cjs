const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../docs/storyboard');
const source = fs.readFileSync(path.join(root, 'atlas-motion.js'), 'utf8');

async function motionHarness(reduced = false, directions, broken = []) {
  let now = 0, serial = 0, writes = 0, frames = 0, preference = null;
  const queue = new Map(), timers = new Map(), events = {};
  const context2d = {save() {}, restore() {}, clearRect() {}, translate() {}, drawImage() {}, setLineDash() {}, stroke() {}};
  const canvas = {dataset: new Proxy({}, {set(target, key, value) { writes++; target[key] = value; return true; }}), getContext: () => context2d};
  const geometry = {width: 1000, height: 1000, routes: [{id: 'home-to-lake', from: 'home', to: 'lake', points: [[.1, .5], [.9, .5]]}], sprite: {src: 'sprite.png', runtimeSrc: 'sprite.webp'}};
  const loaded = [];
  const context = vm.createContext({window: {atlasDirections: directions, location: {search: '?spriteMode=crisp'}}, URLSearchParams, document: {hidden: false, addEventListener(name, fn) { events[name] = fn; }},
    matchMedia: () => ({matches: reduced, addEventListener() {}}), localStorage: {getItem: () => preference, setItem: (_, v) => { preference = v; }},
    addEventListener() {}, requestAnimationFrame(fn) { queue.set(++serial, fn); return serial; }, cancelAnimationFrame(id) { queue.delete(id); },
    setTimeout(fn, ms) { timers.set(++serial, {fn, at: now + ms}); return serial; }, clearTimeout(id) { timers.delete(id); }, performance: {now: () => now},
    Path2D: class {moveTo() {} lineTo() {}}, Image: class {naturalWidth = 400; naturalHeight = 100; decode() { loaded.push(this.src); return broken.includes(this.src) ? Promise.reject(new Error('decode failed')) : Promise.resolve(); }}});
  vm.runInContext(source, context);
  const motion = context.window.AtlasMotion.create(canvas, geometry, () => {}, () => frames++);
  await Promise.resolve(); await Promise.resolve();
  return {motion, canvas, queue, timers, loaded, context, events, get frames() { return frames; }, get writes() { return writes; }, get preference() { return preference; },
    step(ms = 1000 / 60) { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(fn => fn(now)); }};
}

test('idle trail frames invalidate pixels without rewriting unchanged motion attributes', async () => {
  const h = await motionHarness();
  h.motion.placeAtLocation('home'); h.step();
  h.step(1000 / 15);
  const frames = h.frames, writes = h.writes, version = h.motion.version;
  for (let i = 0; i < 15; i++) h.step(1000 / 15 + .001);
  assert.equal(h.frames - frames, 15);
  assert.equal(h.motion.version - version, 15);
  assert.equal(h.queue.size, 0, 'Resting animation has no polling RAF');
  assert.equal(h.writes, writes);
  assert.deepEqual(h.loaded, ['sprite.webp']);
});

test('temporary suspension preserves the user preference and resumes without a time jump', async () => {
  const h = await motionHarness(); h.step(); h.step(100);
  const x = Number(h.canvas.dataset.x), version = h.motion.version;
  h.motion.suspend(true); h.step(5000);
  assert.equal(h.queue.size, 0); assert.equal(h.motion.version, version); assert.equal(h.motion.paused, false);
  assert.equal(h.preference, null); assert.equal(Number(h.canvas.dataset.x), x);
  h.motion.suspend(false); h.step(); h.step(100);
  assert(Math.abs(Number(h.canvas.dataset.x) - x - 4.4) < 1e-9);
  h.motion.toggle(); h.motion.suspend(true); h.motion.suspend(false);
  assert.equal(h.motion.paused, true); assert.equal(h.queue.size, 0); assert.equal(h.preference, 'paused');
  const reduced = await motionHarness(true);
  reduced.motion.suspend(true); reduced.motion.suspend(false);
  assert.equal(reduced.motion.paused, true); assert.equal(reduced.queue.size, 0);
});

test('hidden motion performs no drawing, including external focus updates', async () => {
  const h = await motionHarness(); h.step();
  h.context.document.hidden = true; h.events.visibilitychange();
  const version = h.motion.version;
  h.motion.update(); h.motion.focus('lake'); h.step(1000);
  assert.equal(h.motion.version, version); assert.equal(h.queue.size, 0);
  h.context.document.hidden = false; h.events.visibilitychange();
  assert(h.motion.version > version); assert.equal(h.queue.size, 1);
});

test('direction loading skips the fallback until actual decode failure, including when paused', async () => {
  const metadata = {directions: [{angle: 0, src: 'direction.png', runtimeSrc: 'direction.webp', frames: [{rect: [0, 0, 100, 100], anchor: [50, 100]}]}]};
  const healthy = await motionHarness(true, metadata);
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(healthy.loaded, ['direction.webp']);
  assert.equal(healthy.canvas.dataset.sprite, 'ready');
  const broken = await motionHarness(true, metadata, ['direction.webp']);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  assert.deepEqual(broken.loaded, ['direction.webp', 'sprite.webp']);
  assert.equal(broken.canvas.dataset.sprite, 'ready');
  assert.equal(broken.canvas.dataset.direction, 'fallback');
});

test('browser: preview, visibility and page lifecycle suspend GPU work and preserve pause state',
  {skip: !process.env.ATLAS_RUNTIME_BROWSER, timeout: 60000}, async () => {
    const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
    const browser = await chromium.launch({channel: 'chrome', headless: true});
    try {
      const page = await browser.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      if (process.env.ATLAS_PERF_FALLBACK) await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', {value: undefined}));
      await page.goto((process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/') + 'atlas-webgpu.html?returnPlace=home');
      await page.waitForFunction(() => window.atlasGpuDebug?.renderer && atlasGpuDebug.detector && atlasGpuDebug.motionCanvas.dataset.sprite === 'ready' && document.getElementById('map-viewport').dataset.coversLoaded === 'true');
      assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => /pinpin-walk-v1\.(png|webp)/.test(entry.name))), false,
        'Healthy directional sprites make no fallback sprite request');
      const state = () => page.evaluate(() => ({draws: atlasGpuDebug.renderer.stats.draws, uploads: atlasGpuDebug.renderer.stats.overlayUploads,
        version: atlasGpuDebug.motion.version, paused: atlasGpuDebug.motion.paused, preference: localStorage.getItem('pinpin.atlas.motion.v1')}));
      await page.evaluate(() => atlasGpuDebug.camera.fit());
      const camera = await page.evaluate(() => atlasGpuDebug.camera.snapshot);
      for (const id of ['home', 'lake', 'elder', 'bridge']) {
        await page.evaluate(id => atlasGpuDebug.motion.placeAtLocation(id), id);
        await page.waitForFunction(id => atlasGpuDebug.covers.selected === id, id);
        assert.deepEqual(await page.evaluate(() => atlasGpuDebug.camera.snapshot), camera, 'Character selection never recenters camera');
        assert.equal(await page.locator('.atlas-book:not([hidden])').count(), 1);
      }
      for (const paused of [false, true]) {
        await page.evaluate(paused => { const d = atlasGpuDebug; if (d.motion.paused !== paused) d.motion.toggle(); d.motion.placeAtLocation('home'); d.camera.fit(); }, paused);
        await page.waitForFunction(() => !atlasGpuDebug.moving && atlasGpuDebug.covers.selected === 'home');
        await page.locator('.atlas-book[data-destination="home"]').click();
        await page.waitForSelector('#story-preview[open]'); await page.waitForTimeout(100);
        const before = await state(); await page.waitForTimeout(350);
        assert.deepEqual(await state(), before, 'Preview freezes the background without persisting a pause');
        await page.keyboard.press('Escape'); await page.waitForTimeout(200);
        const after = await state(); assert.equal(after.paused, paused); assert.equal(after.preference, before.preference);
        if (!paused) assert(after.version > before.version, 'Closing resumes animation');
      }
      await page.evaluate(() => {
        const d = atlasGpuDebug; d.motion.toggle();
        d.renderer.setDof(false); d.renderer.setDof(true);
        Object.defineProperty(document, 'hidden', {configurable: true, value: true});
        document.dispatchEvent(new Event('visibilitychange'));
      });
      const hidden = await state(); await page.waitForTimeout(350);
      assert.deepEqual(await state(), hidden, 'Hidden page cancels motion and renderer RAF, including DOF');
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(200); assert((await state()).draws > hidden.draws);
      await page.evaluate(() => dispatchEvent(new Event('pagehide')));
      const away = await state(); await page.waitForTimeout(350); assert.deepEqual(await state(), away);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
      await page.waitForTimeout(200); assert((await state()).draws > away.draws);
      await page.evaluate(() => { if (!atlasGpuDebug.motion.paused) atlasGpuDebug.motion.toggle(); atlasGpuDebug.renderer.setDof(false); });
      await page.waitForTimeout(200);
      const submitted = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(now => {
        const d = atlasGpuDebug, before = d.renderer.stats.draws, s = d.camera.snapshot;
        d.renderer.render(s, {now, dof: false, overlayDirty: false});
        d.renderer.render({...s, x: s.x + 1}, {now, dof: false, overlayDirty: false});
        resolve(d.renderer.stats.draws - before);
      })));
      assert.equal(submitted, 1, 'DOF/controller requests in the same display frame submit once');
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });

test('browser: motion pixels match the saved pre-edit runtime at identical elapsed times',
  {skip: !process.env.ATLAS_RUNTIME_BASELINE, timeout: 60000}, async () => {
    const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
    const browser = await chromium.launch({channel: 'chrome', headless: true});
    try {
      const page = await browser.newPage();
      await page.goto((process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/') + 'images/atlas/shire-focus-field-v1.json');
      await page.setContent('<base href="' + (process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/') + '"><canvas id="before"></canvas><canvas id="after"></canvas>');
      await page.evaluate(() => {
        let serial = 0;
        window.motionClock = 0; window.motionQueue = new Map(); window.motionTimers = new Map();
        window.requestAnimationFrame = fn => { motionQueue.set(++serial, fn); return serial; };
        window.cancelAnimationFrame = id => motionQueue.delete(id);
        window.setTimeout = (fn, ms) => { motionTimers.set(++serial, {fn, at: motionClock + ms}); return serial; };
        window.clearTimeout = id => motionTimers.delete(id);
        performance.now = () => motionClock;
      });
      for (const file of ['atlas-geometry.js', 'atlas-directions.js']) await page.addScriptTag({path: path.join(root, file)});
      // Compare drawing logic with the same PNG decoder; asset parity is checked separately.
      await page.evaluate(() => { for (const direction of atlasDirections.directions) delete direction.runtimeSrc; });
      await page.addScriptTag({path: path.join(process.env.ATLAS_RUNTIME_BASELINE, 'atlas-motion.js')});
      await page.evaluate(() => { window.beforeMotion = AtlasMotion.create(document.getElementById('before'), atlasGeometry); });
      await page.addScriptTag({content: source});
      await page.evaluate(() => { window.afterMotion = AtlasMotion.create(document.getElementById('after'), atlasGeometry); });
      let ready = false;
      for (let i = 0; i < 100 && !ready; i++) {
        await page.waitForTimeout(50);
        ready = await page.evaluate(() => [...document.querySelectorAll('canvas')].every(c => c.dataset.sprite === 'ready' && c.dataset.direction !== 'fallback'));
      }
      assert(ready, 'Directional images decoded');
      const result = await page.evaluate(() => {
        const checks = [];
        function compare(label) {
          beforeMotion.update(); afterMotion.update();
          checks.push({label, same: document.getElementById('before').toDataURL() === document.getElementById('after').toDataURL()});
        }
        function step(ms) {
          motionClock += ms;
          for (const [id, timer] of [...motionTimers]) if (timer.at <= motionClock) { motionTimers.delete(id); timer.fn(); }
          const callbacks = [...motionQueue.values()]; motionQueue.clear(); callbacks.forEach(fn => fn(motionClock));
        }
        step(0); compare('initial');
        for (let i = 0; i < 120; i++) { step(1000 / 60); if (i % 20 === 0) compare('walking-' + i); }
        for (const motion of [beforeMotion, afterMotion]) motion.focus('lake');
        compare('focus');
        for (const motion of [beforeMotion, afterMotion]) { motion.toggle(); motion.placeAtLocation('bridge'); }
        compare('paused-at-bridge');
        return checks;
      });
      assert(result.every(check => check.same), JSON.stringify(result));
      console.log(JSON.stringify({pixelEquality: result}));
    } finally { await browser.close(); }
  });
