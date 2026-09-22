'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const report = '/tmp/pinpin-global-lens-verification.md';
const results = [], screenshots = [], retries = [];
const historyTraceEnabled = process.env.ATLAS_HISTORY_TRACE === '1';
const historyTraces = [];
const started = Date.now();

async function check(name, run) {
  try {
    const detail = await run();
    results.push({ name, pass: true, detail });
    console.log('PASS ' + name);
    return detail;
  } catch (error) {
    results.push({ name, pass: false, error: error.stack || String(error) });
    console.error('FAIL ' + name + ': ' + error.message);
  }
}

function writeReport() {
  fs.writeFileSync(report, ['# Global lens verification', '',
    `${results.filter(r => r.pass).length}/${results.length} checks passed in ${((Date.now() - started) / 1000).toFixed(1)} seconds.`,
    `URL: ${base}`, `Command: ${historyTraceEnabled ? 'ATLAS_HISTORY_TRACE=1 ' : ''}node scripts/verify-atlas-global-lens.cjs`, '',
    'Real Chrome WebGPU, deterministic synthetic color/depth fixtures, and desktop/mobile browser interaction. No renderer edits.', '',
    '## Failures', '',
    ...(results.some(r => !r.pass) ? results.filter(r => !r.pass).map(r => `- ${r.name}: ${r.error.split('\n')[0]}`) : ['None.']), '',
    ...(historyTraceEnabled ? ['## History diagnosis', '',
      ...historyTraces.map(({ label, events }) => {
        const reentrant = events.filter(event => event.type === 'preview.dismiss' && !event.dialogOpen && event.state?.atlasPreview &&
          event.stack?.some(frame => frame.includes('Object.startMove')));
        const back = events.filter(event => event.type === 'history.back').length;
        const go = events.filter(event => event.type === 'history.go').length;
        const pops = events.filter(event => event.type === 'popstate').length;
        return `- ${label}: ${reentrant.length} camera-triggered dismiss call(s) with the dialog closed and preview history still current; ${back} back, ${go} go, ${pops} popstate.`;
      }), '',
      'The captured mobile stack runs from dialog.close() through restored map-link focus, focusDestination, camera.focus, startMove, and preview.dismiss before the outer history.back(). The permanent probe additionally invokes one duplicate close click and two dismiss calls before popstate; exactly one traversal must occur.', ''] : []),
    ...results.flatMap(r => [`## ${r.pass ? 'PASS' : 'FAIL'} ${r.name}`, '', '```json',
      JSON.stringify(r.pass ? r.detail ?? {} : { error: r.error }, null, 2), '```', '']),
    '## History traces', '', historyTraceEnabled ? 'Events captured outside the page survive navigation. Stack traces identify the caller of each history operation.' : 'Disabled; enable with ATLAS_HISTORY_TRACE=1.', '',
    ...historyTraces.flatMap(trace => [`### ${trace.label}`, '', '```json', JSON.stringify(trace.events, null, 2), '```', '']),
    '## Startup retries', '', JSON.stringify(retries), '', '## Screenshots', '',
    ...screenshots.map(file => `- ${file}`), '',
    'Scope limits: CPU counters verify upload stability, not GPU timings. Parent owns overall performance and artistic visual review.', ''].join('\n'));
}

async function traceHistory(page, label) {
  if (!historyTraceEnabled) return null;
  const trace = { label, events: [] };
  historyTraces.push(trace);
  page.on('console', message => {
    const prefix = '[global-lens-history]';
    if (message.text().startsWith(prefix)) trace.events.push(JSON.parse(message.text().slice(prefix.length)));
  });
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) trace.events.push({ type: 'navigation', url: frame.url() });
  });
  await page.addInitScript(() => {
    const emit = (type, detail = {}) => console.debug('[global-lens-history]' + JSON.stringify({
      type, time: performance.now(), url: location.href, length: history.length, state: history.state,
      dialogOpen: document.querySelector('#story-preview')?.open ?? null, ...detail
    }));
    window.globalLensHistoryTrace = emit;
    for (const method of ['back', 'go', 'pushState', 'replaceState']) {
      const original = history[method];
      history[method] = function (...args) {
        emit('history.' + method, { args, stack: new Error().stack.split('\n').slice(1, 9) });
        return Reflect.apply(original, this, args);
      };
    }
    for (const type of ['popstate', 'pageshow', 'pagehide']) addEventListener(type,
      event => emit(type, { eventState: event.state, persisted: event.persisted }));
    document.addEventListener('close', event => {
      if (event.target.id === 'story-preview') emit('dialog.close');
    }, true);
    for (const type of ['pointerdown', 'pointerup', 'click']) document.addEventListener(type, event => {
      const target = event.target.closest?.('#preview-close, .atlas-book');
      if (target) emit(type, { target: target.id || target.dataset.destination, pointerType: event.pointerType });
    }, true);
  });
  return trace;
}

async function synthetic(browser) {
  const page = await browser.newPage({ viewport: { width: 768, height: 512 } });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/global-lens-probe.html', route => route.fulfill({ contentType: 'text/html', body:
    '<style>body{margin:0}canvas{display:block;width:768px;height:512px}</style><canvas id="world"></canvas>' }));
  try {
    await page.goto(base + 'global-lens-probe.html');
    const data = await page.evaluate(async () => {
      const { createRenderer, miniatureGroundDepth } = await import('./gpu/renderer.js');
      const { groundDepth } = await import('./gpu/occlusion.js');
      const make = (w = 1536, h = 1024) => Object.assign(document.createElement('canvas'), { width: w, height: h });
      const art = make(), depth = make(), overlay = make(), banner = make(768, 512), bannerDepth = make(768, 512);
      const ac = art.getContext('2d'); ac.fillStyle = '#204060'; ac.fillRect(0, 0, 1536, 1024);
      const dc = depth.getContext('2d');
      for (let y = 0; y < 1024; y++) {
        const d = Math.round(groundDepth(y) * 255); dc.fillStyle = `rgb(${d},${d},${d})`; dc.fillRect(0, y, 1536, 1);
      }
      const clearDepth = depth.toDataURL();
      dc.fillStyle = '#000'; dc.fillRect(390, 475, 750, 150);
      const objects = [
        { name: 'cover', x: 460, y: 540, radius: 22 },
        { name: 'dots', x: 590, y: 550, radius: 22 },
        { name: 'ring', x: 720, y: 550, radius: 24 },
        { name: 'sprite', x: 850, y: 536, radius: 24 },
        { name: 'trail', x: 1000, y: 550, radius: 30 }
      ];
      const bc = banner.getContext('2d'), oc = overlay.getContext('2d');
      bc.fillStyle = '#fff'; bc.fillRect(460 - 384 - 16, 540 - 256 - 20, 32, 40);
      for (const x of [578, 590, 602]) { bc.beginPath(); bc.arc(x - 384, 550 - 256, 4, 0, Math.PI * 2); bc.fill(); }
      bc.strokeStyle = '#fff'; bc.lineWidth = 4; bc.beginPath(); bc.arc(720 - 384, 550 - 256, 15, 0, Math.PI * 2); bc.stroke();
      const bd = bannerDepth.getContext('2d'); bd.drawImage(banner, 0, 0); bd.globalCompositeOperation = 'source-in';
      const objectDepth = Math.round(groundDepth(550) * 255);
      bd.fillStyle = `rgb(${objectDepth},${objectDepth},${objectDepth})`; bd.fillRect(0, 0, 768, 512);
      oc.strokeStyle = '#fff'; oc.lineWidth = 6; oc.setLineDash([8, 6]); oc.beginPath(); oc.moveTo(978, 550); oc.lineTo(1024, 550); oc.stroke();
      const trailPixels = oc.getImageData(0, 0, 1536, 1024);
      let sprite;
      overlay.atlasSetSpriteLayer = layer => {
        if (!layer) return;
        sprite = layer; layer.x = 850 - layer.anchor[0]; layer.y = 550 - layer.anchor[1]; layer.footY = 550; layer.ready = true;
        const ctx = layer.canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(layer.anchor[0] - 8, layer.anchor[1] - 30, 16, 30); layer.revision++;
      };
      const gpuErrors = [];
      let r = await createRenderer({ canvas: document.querySelector('#world'), artSrc: art.toDataURL(), depthSrc: depth.toDataURL(),
        overlayCanvas: overlay, borderSrc: null, onError: error => gpuErrors.push(String(error.message || error)) });
      if (r.backend !== 'webgpu') throw new Error('WebGPU startup: ' + gpuErrors.join('; '));
      const layer = { canvas: banner, depthCanvas: bannerDepth, revision: 1, ready: true, lensDepth: miniatureGroundDepth(550) };
      r.setBannerLayer(layer); r.setLensOptions({ focusOffset: 0, highlights: 0 });
      const camera = { x: 768, y: 512, scale: 1, width: 768, height: 512 };
      const capture = make(768, 512), cc = capture.getContext('2d', { willReadFrequently: true });
      let now = 1000;
      const draw = (options = {}, step = 100) => {
        now += step; r.render(camera, { overlayDirty: false, animate: false, focusDepth: layer.lensDepth, now, ...options });
      };
      const read = () => { cc.clearRect(0, 0, 768, 512); cc.drawImage(document.querySelector('#world'), 0, 0); return cc.getImageData(0, 0, 768, 512).data; };
      const shot = (options, settle = 1) => { for (let i = 0; i < settle; i++) draw(options); return read(); };
      const pngs = {};
      r.setOcclusion(false); r.setDof(false);
      let sharp = shot({ overlayDirty: true });
      r.setDof(true);
      r.setLensOptions({ focusOffset: 0.25, highlights: 0 });
      shot({}, 24);
      r.setOcclusion(true);
      const hiddenBlurred = shot({}); pngs.occluded = capture.toDataURL();
      r.setDof(false); const hiddenSharp = shot({});
      // Remove every object while retaining the exact foreground and lens inputs.
      r.setBannerLayer(null); oc.clearRect(0, 0, 1536, 1024);
      sprite.ready = false; sprite.canvas.getContext('2d').clearRect(0, 0, 128, 128); sprite.revision++;
      const emptySharp = shot({ overlayDirty: true });
      r.setDof(true); const emptyBlurred = shot({});
      // A separate clear ground field isolates focus from foreground near-blur coverage.
      r.destroy(); oc.putImageData(trailPixels, 0, 0);
      r = await createRenderer({ canvas: document.querySelector('#world'), artSrc: art.toDataURL(), depthSrc: clearDepth,
        overlayCanvas: overlay, borderSrc: null, onError: error => gpuErrors.push(String(error.message || error)) });
      if (r.backend !== 'webgpu') throw new Error('WebGPU startup: ' + gpuErrors.join('; '));
      r.setBannerLayer(layer); r.setLensOptions({ focusOffset: 0, highlights: 0 }); r.setDof(false);
      sharp = shot({ overlayDirty: true }); pngs.sharp = capture.toDataURL();
      r.setDof(true); const focused = shot({}, 24); pngs.focused = capture.toDataURL();
      r.setLensOptions({ focusOffset: 0.25, highlights: 0 });
      const blurred = shot({}, 24); pngs.defocused = capture.toDataURL();
      const metrics = objects.map(object => {
        let sharpSignal = 0, focusError = 0, blurChange = 0, occludedSharpError = 0, occludedBlurError = 0;
        let sharpPeak = 0, blurredPeak = 0, focusedPeak = 0, focusedEdge = 0, blurredEdge = 0, spread = 0, pixels = 0;
        const x0 = object.x - 384, y0 = object.y - 256;
        for (let y = y0 - 48; y <= y0 + 48; y++) for (let x = x0 - 48; x <= x0 + 48; x++) {
          const i = (y * 768 + x) * 4, signal = sharp[i] - emptySharp[i];
          sharpPeak = Math.max(sharpPeak, sharp[i]); focusedPeak = Math.max(focusedPeak, focused[i]); blurredPeak = Math.max(blurredPeak, blurred[i]);
          focusedEdge = Math.max(focusedEdge, Math.abs(focused[i] - focused[i - 4]));
          blurredEdge = Math.max(blurredEdge, Math.abs(blurred[i] - blurred[i - 4]));
          sharpSignal += Math.abs(signal); focusError += Math.abs(sharp[i] - focused[i]); blurChange += Math.abs(sharp[i] - blurred[i]);
          occludedSharpError = Math.max(occludedSharpError, Math.abs(hiddenSharp[i] - emptySharp[i]));
          occludedBlurError = Math.max(occludedBlurError, Math.abs(hiddenBlurred[i] - emptyBlurred[i]));
          if (Math.abs(signal) < 2 && blurred[i] - emptyBlurred[i] > 8) spread++;
          pixels++;
        }
        return { name: object.name, sharpSignal, focusedRelativeError: focusError / sharpSignal, blurRelativeChange: blurChange / sharpSignal,
          sharpPeak, focusedPeak, blurredPeak, focusedEdge, blurredEdge, spread, occludedSharpError, occludedBlurError, pixels };
      });
      const objectStats = r.stats;
      // Five 512x342 frames, a water rectangle, and a black static island inside it.
      r.setDof(false); r.setLensOptions({ focusOffset: 0, highlights: 0 });
      r.setBannerLayer(null); oc.clearRect(0, 0, 1536, 1024); sprite.ready = false;
      sprite.canvas.getContext('2d').clearRect(0, 0, 128, 128); sprite.revision++;
      const staticBaseline = shot({ overlayDirty: true });
      const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [0, 255, 255]];
      const frames = [];
      for (const color of colors) {
        const c = make(512, 342), ctx = c.getContext('2d'); ctx.fillStyle = `rgb(${color})`; ctx.fillRect(0, 0, 512, 342);
        frames.push(await createImageBitmap(c));
      }
      const mask = make(512, 342), mc = mask.getContext('2d'); mc.fillStyle = '#000'; mc.fillRect(0, 0, 512, 342);
      mc.fillStyle = '#fff'; mc.fillRect(230, 140, 80, 70); mc.fillStyle = '#000'; mc.fillRect(260, 170, 15, 15);
      const maskBitmap = await createImageBitmap(mask);
      r.setSceneryFrames({ frames, mask: maskBitmap, duration: 12000 });
      frames.forEach(frame => frame.close()); maskBitmap.close();
      const sample = bytes => Array.from(bytes.slice(((450 - 256) * 768 + 720 - 384) * 4, ((450 - 256) * 768 + 720 - 384) * 4 + 3));
      const samples = []; let leakedPixels = 0, maxLeak = 0, staticPixelComparisons = 0;
      const baselineCounters = { ...r.stats, scenery: { ...r.stats.scenery } };
      for (let step = 0; step <= 120; step++) {
        draw({ animate: true });
        if (step % 6 !== 0) continue;
        const bytes = read();
        samples.push({ milliseconds: step * 100, phase: r.stats.scenery.phase, rgb: sample(bytes) });
        for (let y = 0; y < 512; y++) for (let x = 0; x < 768; x++) {
          // Texture coordinates include pixel centers and the half-texel linear-filter footprint.
          const mx = (x + 384.5) / 1536 * 512, my = (y + 256.5) / 1024 * 342;
          const outside = mx < 229.5 || mx > 310.5 || my < 139.5 || my > 210.5;
          const island = mx > 260.5 && mx < 274.5 && my > 170.5 && my < 184.5;
          if (!outside && !island) continue;
          const i = (y * 768 + x) * 4;
          const delta = Math.max(Math.abs(bytes[i] - staticBaseline[i]), Math.abs(bytes[i + 1] - staticBaseline[i + 1]), Math.abs(bytes[i + 2] - staticBaseline[i + 2]));
          staticPixelComparisons++;
          maxLeak = Math.max(maxLeak, delta); if (delta > 0) leakedPixels++;
        }
      }
      pngs.scenery = capture.toDataURL();
      for (let i = 0; i < 23; i++) draw({ animate: true });
      const phaseBeforePause = r.stats.scenery.phase;
      draw({ animate: false }); const pausedBefore = read();
      for (let i = 0; i < 8; i++) draw({ animate: false });
      const pausedAfter = read(), phaseAfterPause = r.stats.scenery.phase;
      let pausedPixelChanges = 0;
      for (let i = 0; i < pausedBefore.length; i++) if (pausedBefore[i] !== pausedAfter[i]) pausedPixelChanges++;
      const afterCounters = r.stats;
      r.destroy();
      return { metrics, objectStats, gpuErrors, pngs, scenery: { colors, samples, leakedPixels, maxLeak, staticPixelComparisons, phaseBeforePause, phaseAfterPause,
        pausedPixelChanges, before: baselineCounters, after: afterCounters } };
    });
    for (const [name, url] of Object.entries(data.pngs)) {
      const file = `/tmp/pinpin-global-lens-${name}.png`; fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); screenshots.push(file);
    }
    delete data.pngs;
    await check('synthetic real WebGPU and default global lens', () => {
      assert.equal(data.objectStats.backend, 'webgpu'); assert.equal(data.objectStats.bokehStrength, 4);
      assert.equal(data.objectStats.dof.model, 'global-miniature-aperture'); assert.deepEqual(data.gpuErrors, []); assert.deepEqual(errors, []);
      return data.objectStats;
    });
    for (const metric of data.metrics) {
      await check(`${metric.name}: foreground occlusion before global DOF`, () => {
        assert(metric.sharpSignal > 5000, 'Unoccluded object must be visible');
        assert(metric.occludedSharpError <= 1, 'Occluded object must match empty scene with DOF off');
        assert(metric.occludedBlurError <= 1, 'Occluded object must match empty scene after global DOF'); return metric;
      });
      await check(`${metric.name}: sharp at focus, blurred with lens offset`, () => {
        assert(metric.focusedRelativeError < 0.08, 'Focused object must retain sharp detail');
        assert(metric.blurRelativeChange > 0.2, 'Defocus must visibly affect the object');
        assert(metric.spread > 20, 'Defocused object must spread outside its original silhouette');
        assert(metric.blurredEdge < metric.focusedEdge * .9, 'Defocus must soften object boundaries'); return metric;
      });
    }
    await check('scenery five-frame endpoints and cyclic interpolation', () => {
      const { samples, colors } = data.scenery;
      const linear = value => value / 255 <= .04045 ? value / 255 / 12.92 : ((value / 255 + .055) / 1.055) ** 2.4;
      const srgb = value => 255 * (value <= .0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - .055);
      for (const sample of samples) {
        const phase = sample.milliseconds / 12000 % 1;
        assert(Math.abs(sample.phase - phase) < 1e-8, `Unexpected phase at ${sample.milliseconds}ms`);
        const position = phase * 5, a = Math.floor(position), t = position - a, blend = t * t * (3 - 2 * t);
        const expected = [32, 64, 96].map((value, c) => Math.round(srgb(linear(value) * .65 + .35 *
          (linear(colors[a][c]) * (1 - blend) + linear(colors[(a + 1) % 5][c]) * blend))));
        assert(sample.rgb.every((value, c) => Math.abs(value - expected[c]) <= 2), `${sample.milliseconds}ms expected ${expected}; got ${sample.rgb}`);
      }
      assert.equal(data.scenery.after.scenery.frames, 5); return samples;
    });
    await check('scenery zero leakage and paused phase/pixels', () => {
      const s = data.scenery; assert.equal(s.leakedPixels, 0); assert.equal(s.maxLeak, 0);
      assert(s.phaseBeforePause > .1 && s.phaseBeforePause < .9, 'Pause starts away from cycle endpoints');
      assert.equal(s.phaseBeforePause, s.phaseAfterPause); assert.equal(s.pausedPixelChanges, 0);
      return { leakedPixels: s.leakedPixels, maxLeak: s.maxLeak, staticPixelComparisons: s.staticPixelComparisons,
        phaseBeforePause: s.phaseBeforePause, phaseAfterPause: s.phaseAfterPause, pausedPixelChanges: s.pausedPixelChanges };
    });
    await check('scenery no per-frame texture uploads', () => {
      const s = data.scenery;
      for (const key of ['overlayUploads', 'spriteUploads']) assert.equal(s.after[key], s.before[key], key);
      assert.equal(s.after.banner.uploads, s.before.banner.uploads); assert.equal(s.after.scenery.uploads, s.before.scenery.uploads);
      assert.equal(s.after.scenery.uploads, 5); assert(s.after.draws - s.before.draws >= 120);
      return { before: s.before, after: s.after };
    });
  } finally { await page.close(); }
}

async function actual(browser, size, fallback = false) {
  const mobile = size.width < 768, label = `${size.width}x${size.height}${fallback ? ' fallback' : ''}`;
  const context = await browser.newContext({ viewport: size, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  const historyTrace = await traceHistory(page, label);
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(() => { if (location.protocol.startsWith('http')) localStorage.setItem('pinpin.atlas.motion.v1', 'paused'); });
  if (fallback) await context.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
  try {
    await page.goto(base + 'atlas-webgpu.html?lang=en&returnPlace=home');
    await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.draws > 0 && atlasGpuDebug.covers.loaded && atlasGpuDebug.detector);
    if (historyTraceEnabled) await page.evaluate(() => {
      const preview = atlasGpuDebug.preview, original = preview.dismiss;
      preview.dismiss = function (...args) {
        globalLensHistoryTrace('preview.dismiss', { args, stack: new Error().stack.split('\n').slice(1, 9) });
        return Reflect.apply(original, this, args);
      };
    });
    await check(label + ' canvas dimensions, nonblank artwork, default four', async () => {
      const stats = await page.evaluate(() => atlasGpuDebug.renderer.stats);
      assert.equal(stats.backend, fallback ? 'canvas2d' : 'webgpu'); assert.equal(stats.bokehStrength, 4);
      const file = `/tmp/pinpin-global-lens-atlas-${size.width}${fallback ? '-fallback' : ''}.png`;
      await page.screenshot({ path: file }); screenshots.push(file);
      const png = await page.locator('#world-canvas').screenshot();
      const pixels = await page.evaluate(async encoded => {
        const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
        const c = Object.assign(document.createElement('canvas'), { width: 96, height: 64 }), ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0, 96, 64);
        const bytes = ctx.getImageData(0, 0, 96, 64).data, colors = new Set(); let opaque = 0;
        for (let i = 0; i < bytes.length; i += 4) { if (bytes[i + 3] > 240) opaque++; colors.add([bytes[i] >> 4, bytes[i + 1] >> 4, bytes[i + 2] >> 4].join(',')); }
        const world = document.querySelector('#world-canvas'), rect = world.getBoundingClientRect();
        return { opaque, colors: colors.size, canvas: [world.width, world.height], rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          overflow: document.documentElement.scrollWidth > innerWidth };
      }, png.toString('base64'));
      assert(pixels.opaque > 5000 && pixels.colors > 40, JSON.stringify(pixels));
      assert(pixels.rect.width > size.width * .8 && pixels.rect.height > size.height * .5);
      assert(!pixels.overflow, 'No horizontal page overflow');
      assert.equal(pixels.canvas[0], Math.floor(pixels.rect.width)); assert.equal(pixels.canvas[1], Math.floor(pixels.rect.height));
      return { stats, pixels };
    });
    await check(label + ' debug controls', async () => {
      await page.locator('#world-canvas').focus(); await page.keyboard.press('Tab');
      const controls = page.locator('.atlas-debug input[type=range]'); assert.equal(await controls.count(), 3);
      if (mobile) { assert.equal(await page.locator('.atlas-debug').isVisible(), false); return { hidden: true }; }
      assert(await page.locator('.atlas-debug').isVisible());
      for (let i = 0; i < 3; i++) assert.equal(await controls.nth(i).isDisabled(), fallback);
      if (!fallback) {
        await controls.nth(0).focus(); await page.keyboard.press('ArrowLeft');
        await page.waitForFunction(() => atlasGpuDebug.renderer.stats.bokehStrength < 4);
        await controls.nth(1).focus(); await page.keyboard.press('ArrowRight');
        await controls.nth(2).focus(); await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => atlasGpuDebug.renderer.stats.dof.focusOffset > 0 && atlasGpuDebug.renderer.stats.dof.highlights > 1);
      }
      await page.keyboard.press('Escape'); return page.evaluate(() => atlasGpuDebug.renderer.stats.dof);
    });
    await check(label + ' banner native input and fallback artwork restoration', async () => {
      await page.evaluate(() => {
        const d = atlasGpuDebug, e = d.covers.entries.find(entry => entry.id === 'home'), s = d.camera.snapshot;
        if (!d.motion.paused) d.motion.toggle(); d.motion.placeAtLocation('home');
        d.camera.focus(d.world(e.placement.anchor), 2 * Math.max(s.width / atlasGeometry.width, s.height / atlasGeometry.height));
      });
      await page.waitForFunction(() => !atlasGpuDebug.moving && atlasGpuDebug.covers.selected === 'home');
      const marker = page.locator('.atlas-book[data-destination="home"]'); await marker.waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
      const bridge = await marker.evaluate(button => {
        const image = button.querySelector('img'), rect = button.getBoundingClientRect();
        window.globalLensBannerNode = button;
        return { gpu: button.dataset.gpuRendering, opacity: getComputedStyle(image).opacity, tag: button.tagName,
          hit: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('.atlas-book') === button };
      });
      assert.equal(bridge.tag, 'BUTTON'); assert(bridge.hit); assert.equal(bridge.gpu, String(!fallback));
      assert.equal(bridge.opacity, fallback ? '1' : '0');
      if (mobile) await marker.tap(); else { await marker.focus(); await page.keyboard.press('Enter'); }
      await page.waitForSelector('#story-preview[open]');
      const previewHistory = await page.evaluate(() => ({ url: location.href, length: history.length, state: history.state }));
      await page.evaluate(() => {
        const probe = window.globalLensDismissProbe = { traversals: [], duplicateClose: 0, duplicateDismiss: 0, pops: 0 };
        const originals = { back: history.back, go: history.go };
        for (const method of ['back', 'go']) history[method] = function (...args) {
          probe.traversals.push({ method, args }); return Reflect.apply(originals[method], this, args);
        };
        window.globalLensDismissRestore = () => Object.assign(history, originals);
        addEventListener('popstate', event => { probe.pops++; probe.finalState = event.state; }, { once: true });
        // Run after the native close handler, before its asynchronous history traversal.
        const button = document.querySelector('#preview-close');
        button.addEventListener('click', () => {
          probe.pendingState = history.state; probe.dialogOpen = document.querySelector('#story-preview').open;
          window.globalLensHistoryTrace?.('test.duplicateDismiss.begin');
          probe.duplicateClose++; button.click();
          for (let i = 0; i < 2; i++) { probe.duplicateDismiss++; atlasGpuDebug.preview.dismiss(); }
          window.globalLensHistoryTrace?.('test.duplicateDismiss.end');
        }, { once: true });
      });
      if (mobile) await page.locator('#preview-close').tap(); else await page.locator('#preview-close').click();
      await page.waitForTimeout(200);
      const retained = await page.evaluate(() => {
        window.globalLensDismissRestore?.();
        return { sameNode: Boolean(window.globalLensBannerNode) &&
          document.querySelector('.atlas-book[data-destination="home"]') === window.globalLensBannerNode,
          url: location.href, length: history.length, state: history.state, dismissal: window.globalLensDismissProbe };
      });
      assert(retained.sameNode, 'Banner DOM node persists after native dismissal: ' + JSON.stringify({ previewHistory, retained }));
      const dismissal = retained.dismissal;
      assert.equal(dismissal.pendingState?.atlasPreview, 'home', 'Duplicate dismissals execute before history traversal finishes');
      assert.equal(dismissal.dialogOpen, false); assert.equal(dismissal.duplicateClose, 1); assert.equal(dismissal.duplicateDismiss, 2);
      assert.equal(dismissal.traversals.length, 1, 'Repeated close/dismiss must not traverse history twice');
      assert.equal(dismissal.pops, 1); assert.equal(dismissal.finalState, null);
      if (historyTrace) {
        const traversals = historyTrace.events.filter(event => event.type === 'history.back' || event.type === 'history.go');
        assert.equal(traversals.length, 1, 'One history traversal per native dismissal: ' + JSON.stringify(traversals));
        assert(historyTrace.events.some(event => event.type === 'popstate' && !event.state?.atlasPreview), 'Dismissal restores map history entry');
      }
      if (!fallback) {
        const restored = await page.evaluate(() => {
          const d = atlasGpuDebug, e = d.covers.entries.find(entry => entry.id === 'home');
          d.covers.setGpuRendering(false);
          const fallback = { opacity: getComputedStyle(e.image).opacity, gpu: e.button.dataset.gpuRendering,
            objects: [e.object.ring, ...e.object.dots].map(o => getComputedStyle(o.element).opacity) };
          d.covers.setGpuRendering(true);
          return { fallback, gpuOpacity: getComputedStyle(e.image).opacity, sameNode: e.button === window.globalLensBannerNode };
        });
        assert.equal(restored.fallback.opacity, '1'); assert.equal(restored.fallback.gpu, 'false');
        assert(restored.fallback.objects.every(value => value === '1')); assert.equal(restored.gpuOpacity, '0'); assert(restored.sameNode);
        return { bridge, restored, dismissal };
      }
      return { bridge, dismissal };
    });
    if (!mobile && !fallback) await check(label + ' strength persists on reload', async () => {
      const before = await page.evaluate(() => atlasGpuDebug.renderer.stats.bokehStrength);
      await page.reload(); await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.draws > 0);
      const after = await page.evaluate(() => atlasGpuDebug.renderer.stats.bokehStrength); assert.equal(after, before); return { before, after };
    });
    await check(label + ' browser errors', () => { assert.deepEqual(errors, []); return errors; });
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const deadline = setTimeout(() => { console.error('Verification exceeded 115 seconds'); writeReport(); browser.close(); process.exitCode = 1; }, 115000);
  try {
    await check('synthetic fixture completed', async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try { await synthetic(browser); return { attempts: attempt + 1 }; }
        catch (error) {
          if (attempt || !/WebGPU startup|shader|pipeline|validation/i.test(error.message)) throw error;
          retries.push(error.message); await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    });
    for (const size of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
      await check(`${size.width} browser suite completed`, () => actual(browser, size));
    }
    await check('fallback browser suite completed', () => actual(browser, { width: 390, height: 844 }, true));
  } finally { clearTimeout(deadline); await browser.close(); writeReport(); }
  if (results.some(result => !result.pass)) process.exitCode = 1;
  console.log('Report: ' + report);
})().catch(error => { console.error(error); results.push({ name: 'runner', pass: false, error: error.stack }); writeReport(); process.exitCode = 1; });
