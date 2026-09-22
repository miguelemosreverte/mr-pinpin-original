const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
const duration = Number(process.env.ATLAS_SAMPLE_MS || 3000);
const output = process.env.ATLAS_PERF_OUTPUT || '/tmp/pinpin-runtime-performance.json';

async function instrument(page) {
  await page.addInitScript(() => {
    const counts = window.runtimeCounts = {raf: {}, mutations: 0, motionMutations: 0, bindGroups: 0, textureViews: 0, bufferWrites: 0};
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => raf.call(window, time => {
      const name = callback.name || 'anonymous';
      counts.raf[name] = (counts.raf[name] || 0) + 1;
      callback(time);
    });
    for (const [type, method, key] of [['GPUDevice', 'createBindGroup', 'bindGroups'], ['GPUTexture', 'createView', 'textureViews'], ['GPUQueue', 'writeBuffer', 'bufferWrites']]) {
      const proto = window[type]?.prototype, original = proto?.[method];
      if (original) proto[method] = function (...args) { counts[key]++; return original.apply(this, args); };
    }
    new MutationObserver(records => { counts.mutations += records.length; }).observe(document, {subtree: true, attributes: true, childList: true});
  });
}
async function snapshot(page, cdp) {
  const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(({name, value}) => [name, value]));
  return page.evaluate(metrics => {
    const d = atlasGpuDebug;
    return {time: performance.now(), counts: structuredClone(runtimeCounts), metrics, renderCount: d.controllerFrameCount ?? d.renderCount,
      stats: d.renderer.stats, position: [Number(d.motionCanvas.dataset.x), Number(d.motionCanvas.dataset.y)],
      camera: d.camera.snapshot};
  }, metrics);
}
async function sample(page, cdp, name, action) {
  await cdp.send('HeapProfiler.collectGarbage');
  const before = await snapshot(page, cdp);
  if (action) await action(); else await page.waitForTimeout(duration);
  const after = await snapshot(page, cdp), seconds = (after.time - before.time) / 1000;
  const delta = key => after.metrics[key] - before.metrics[key];
  const result = {name, seconds: +seconds.toFixed(3), mainThreadCpuPercent: +(100 * delta('TaskDuration') / seconds).toFixed(2),
    scriptMs: +(1000 * delta('ScriptDuration')).toFixed(2), layoutMs: +(1000 * delta('LayoutDuration')).toFixed(2),
    heapMiB: +(after.metrics.JSHeapUsedSize / 1048576).toFixed(2), controllerFrames: after.renderCount - before.renderCount,
    draws: after.stats.draws - before.stats.draws, overlayUploads: after.stats.overlayUploads - before.stats.overlayUploads,
    mutations: after.counts.mutations - before.counts.mutations, motionMutations: after.counts.motionMutations - before.counts.motionMutations,
    bindGroups: after.counts.bindGroups - before.counts.bindGroups, textureViews: after.counts.textureViews - before.counts.textureViews,
    bufferWrites: after.counts.bufferWrites - before.counts.bufferWrites,
    raf: Object.fromEntries(Object.entries(after.counts.raf).map(([key, value]) => [key, value - (before.counts.raf[key] || 0)])),
    movedPixels: +Math.hypot(...after.position.map((value, i) => value - before.position[i])).toFixed(3)};
  if (process.env.ATLAS_PERF_ASSERT) {
    if (name === 'paused') { assert.equal(result.draws, 0); assert.equal(result.overlayUploads, 0); assert.equal(result.motionMutations, 0); }
    if (name === 'camera') { assert.equal(result.overlayUploads, 0); assert(result.draws >= duration / 1000 * 45, 'Camera keeps display cadence'); }
    if (name === 'walking') { assert(result.movedPixels > 10); assert(result.draws >= duration / 1000 * 45, 'Walking keeps display cadence'); }
    if (name === 'animated-idle') { assert.equal(result.movedPixels, 0); assert(result.draws >= duration / 1000 * 10 && result.draws <= duration / 1000 * 17, 'Resting trails stay animated at 15 fps'); assert.equal(result.bindGroups, 0); }
  }
  return result;
}
async function run(browser, width) {
  const page = await browser.newPage({viewport: {width, height: width < 600 ? 844 : 1000}, isMobile: width < 600, hasTouch: width < 600});
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await instrument(page);
  if (process.env.ATLAS_RUNTIME_BASELINE) {
    for (const file of ['atlas-motion.js', 'atlas-webgpu.js', 'gpu/renderer.js']) {
      const body = fs.readFileSync(path.join(process.env.ATLAS_RUNTIME_BASELINE, path.basename(file)), 'utf8');
      await page.route('**/storyboard/' + file, route => route.fulfill({contentType: 'text/javascript', body}));
    }
  }
  if (process.env.ATLAS_PERF_FALLBACK) await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', {value: undefined}));
  await page.goto(base + 'atlas-webgpu.html?returnPlace=home');
  await page.waitForFunction(() => window.atlasGpuDebug?.renderer && atlasGpuDebug.detector && atlasGpuDebug.motionCanvas.dataset.sprite === 'ready' && document.getElementById('map-viewport').dataset.coversLoaded === 'true');
  await page.evaluate(() => {
    new MutationObserver(records => { runtimeCounts.motionMutations += records.length; }).observe(atlasGpuDebug.motionCanvas, {attributes: true});
  });
  await page.waitForTimeout(1800);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const steadyRequests = requests.length, samples = [];
  samples.push(await sample(page, cdp, 'animated-idle'));
  await page.evaluate(() => atlasGpuDebug.motion.setTarget(atlasGeometry.routes.find(r => r.id === 'home-to-lake').points.at(-1)));
  await page.waitForTimeout(300);
  samples.push(await sample(page, cdp, 'walking'));
  await page.evaluate(() => { if (!atlasGpuDebug.motion.paused) atlasGpuDebug.motion.toggle(); });
  await page.waitForTimeout(1800);
  samples.push(await sample(page, cdp, 'paused'));
  samples.push(await sample(page, cdp, 'camera', () => page.evaluate(duration => new Promise(resolve => {
    const camera = atlasGpuDebug.camera, s = camera.snapshot, start = performance.now();
    function cameraProbe(now) {
      const elapsed = now - start;
      camera.focus([s.x + Math.sin(elapsed / 600) * 30, s.y + Math.cos(elapsed / 600) * 20]);
      if (elapsed < duration) requestAnimationFrame(cameraProbe); else resolve();
    }
    requestAnimationFrame(cameraProbe);
  }), duration)));
  const result = {width, browser: browser.version(), backend: await page.evaluate(() => atlasGpuDebug.renderer.stats), samples,
    steadyRequests: requests.length - steadyRequests, errors};
  assert.deepEqual(errors, []);
  assert.equal(result.steadyRequests, 0, 'No new network requests during runtime sampling');
  await page.close();
  return result;
}
(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    const results = [];
    for (const width of (process.env.ATLAS_PERF_WIDTHS || '1440,390').split(',').map(Number)) results.push(await run(browser, width));
    fs.writeFileSync(output, JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify({output, results}, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
