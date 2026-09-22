'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const report = process.env.ATLAS_VIDEO_REPORT || '/tmp/atlas-video-integration.json';
const results = [];

async function state(page) {
  return page.evaluate(() => ({ time: performance.now(), backend: atlasGpuDebug.renderer.backend,
    renderer: atlasGpuDebug.renderer.stats, scenery: { enabled: atlasGpuDebug.scenery.enabled, reason: atlasGpuDebug.scenery.reason },
    textureAllocations: window.videoTextureAllocations, error: atlasGpuDebug.rendererError }));
}
async function freezeCheck(page, action, resume) {
  await action();
  await page.waitForTimeout(250);
  const before = await state(page);
  await page.waitForTimeout(400);
  const after = await state(page);
  assert.equal(after.renderer.scenery.uploads, before.renderer.scenery.uploads, 'No video uploads while suspended');
  assert.equal(after.renderer.scenery.media?.currentTime, before.renderer.scenery.media?.currentTime, 'Decoder pauses');
  assert.equal(after.renderer.draws, before.renderer.draws, 'GPU sleeps');
  await resume();
  await page.waitForFunction(n => atlasGpuDebug.renderer.stats.scenery.uploads > n, after.renderer.scenery.uploads);
  return { uploads: after.renderer.scenery.uploads, time: after.renderer.scenery.media?.currentTime };
}
async function pixels(page) {
  const png = await page.locator('#world-canvas').screenshot();
  return page.evaluate(async encoded => {
    const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
    const c = Object.assign(document.createElement('canvas'), { width: 96, height: 64 });
    const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0, 96, 64);
    return Array.from(ctx.getImageData(0, 0, 96, 64).data);
  }, png.toString('base64'));
}
async function actual(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 },
    isMobile: width < 600, hasTouch: width < 600 });
  const page = await context.newPage(), errors = [], requests = [];
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push(r.url()));
  await page.addInitScript(() => {
    window.videoTextureAllocations = 0;
    const create = window.GPUDevice?.prototype.createTexture;
    if (create) GPUDevice.prototype.createTexture = function (...args) { videoTextureAllocations++; return create.apply(this, args); };
  });
  try {
    await page.goto(base + 'atlas-webgpu.html?returnPlace=home');
    await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.scenery.kind === 'video' &&
      atlasGpuDebug.renderer.stats.scenery.uploads > 3 && atlasGpuDebug.detector &&
      document.getElementById('map-viewport').dataset.coversLoaded === 'true');
    assert.equal((await state(page)).backend, 'webgpu');
    await page.evaluate(() => { atlasGpuDebug.camera.fit(); atlasGpuDebug.motion.placeAtLocation('home'); });
    await page.waitForTimeout(800);
    const session = await context.newCDPSession(page);
    await session.send('Performance.enable');
    const metrics = async () => Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    const m0 = await metrics(), before = await state(page), networkBefore = requests.length;
    await page.waitForTimeout(2000);
    const after = await state(page), m1 = await metrics(), seconds = (after.time - before.time) / 1000;
    const uploads = after.renderer.scenery.uploads - before.renderer.scenery.uploads;
    assert(uploads >= 20 && uploads <= Math.ceil(seconds * 24) + 4, `Bounded decoded-frame uploads: ${uploads}`);
    assert.equal(after.textureAllocations, before.textureAllocations, 'No steady-state texture allocation');
    assert.equal(requests.length, networkBefore, 'No steady-state network requests');
    assert(after.renderer.scenery.textureBytes <= 1536 * 1024 * 4 + 1024, 'One reusable video texture');
    assert.equal(after.renderer.bokehStrength, 4);
    assert(after.renderer.dof && after.renderer.occlusion.enabled && after.renderer.banner.ready);
    const mp4 = [...new Set(requests.filter(url => /\.mp4(?:\?|$)/.test(url)))];
    assert.equal(mp4.length, 1, 'Only one video variant fetched');
    assert(mp4[0].includes(width < 600 ? 'mobile' : 'desktop'), mp4[0]);
    assert(!requests.some(url => /shire-motion-(strip|mask)/.test(url)), 'Old animation assets not fetched');
    const a = await pixels(page); await page.waitForTimeout(700); const b = await pixels(page);
    let delta = 0, opaque = 0; const colors = new Set();
    for (let i = 0; i < a.length; i += 4) {
      delta += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      if (b[i + 3] > 240) opaque++;
      colors.add([b[i] >> 4, b[i + 1] >> 4, b[i + 2] >> 4].join(','));
    }
    assert(opaque > 5000 && colors.size > 40 && delta > 100, 'Nonblank animated GPU canvas');
    const screenshot = `/tmp/atlas-integrated-video-${width}.png`;
    await page.screenshot({ path: screenshot });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const pauses = {};
    pauses.user = await freezeCheck(page,
      () => page.evaluate(() => atlasGpuDebug.motion.toggle()),
      () => page.evaluate(() => atlasGpuDebug.motion.toggle()));
    pauses.hidden = await freezeCheck(page, () => page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
    }), () => page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }));
    pauses.pagehide = await freezeCheck(page,
      () => page.evaluate(() => dispatchEvent(new Event('pagehide'))),
      () => page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))));
    await page.evaluate(() => { atlasGpuDebug.motion.placeAtLocation('home'); atlasGpuDebug.camera.fit(); });
    await page.waitForFunction(() => !atlasGpuDebug.moving && atlasGpuDebug.covers.selected === 'home');
    pauses.preview = await freezeCheck(page, async () => {
      await page.locator('.atlas-book[data-destination="home"]').click();
      await page.waitForSelector('#story-preview[open]');
    }, async () => {
      await page.locator('#preview-close').click();
      await page.waitForSelector('#story-preview[open]', { state: 'hidden' });
    });
    const camera = await page.evaluate(() => atlasGpuDebug.camera.snapshot);
    await page.locator('#world-canvas').hover({ position: { x: width / 2, y: 300 } });
    await page.mouse.wheel(0, -150);
    await page.waitForTimeout(300);
    assert((await page.evaluate(() => atlasGpuDebug.camera.snapshot.scale)) > camera.scale, 'Zoom remains interactive');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    const reduced0 = await state(page); await page.waitForTimeout(350); const reduced1 = await state(page);
    assert.equal(reduced1.renderer.scenery.uploads, reduced0.renderer.scenery.uploads, 'Live reduced motion stops uploads');
    assert.deepEqual(errors, []);
    return { width, mp4, seconds, uploads, draws: after.renderer.draws - before.renderer.draws,
      mainThreadCpuPercent: 100 * (m1.TaskDuration - m0.TaskDuration) / seconds,
      jsHeapMiB: m1.JSHeapUsedSize / 1048576, textureBytes: after.renderer.scenery.textureBytes,
      pixels: { opaque, colors: colors.size, delta }, pauses, screenshot, errors };
  } finally { await context.close(); }
}
async function fallback(browser, mode) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
  const page = await context.newPage(), requests = [], errors = [];
  page.on('request', r => requests.push(r.url())); page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(mode => {
    if (mode === 'save-data') Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
    if (mode === 'canvas2d') Object.defineProperty(navigator, 'gpu', { value: undefined });
    if (mode === 'paused') localStorage.setItem('pinpin.atlas.motion.v1', 'paused');
    if (mode === 'autoplay') HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Test denial', 'NotAllowedError'));
  }, mode);
  if (mode === 'missing') await page.route('**/videos/shire-atlas-loop-*.mp4', route => route.abort());
  try {
    await page.goto(base + 'atlas-webgpu.html?returnPlace=home');
    await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.draws > 0);
    await page.waitForTimeout(mode === 'missing' || mode === 'autoplay' ? 2000 : 500);
    const result = await state(page);
    const mp4 = requests.filter(url => /\.mp4(?:\?|$)/.test(url));
    if (!['missing', 'autoplay'].includes(mode)) assert.equal(mp4.length, 0, `${mode}: no media network`);
    assert(!result.renderer.scenery.ready, `${mode}: still-art fallback`);
    if (mode !== 'canvas2d') assert.equal(result.backend, 'webgpu', 'Media failure must not disable the GPU renderer');
    const image = await pixels(page);
    assert(image.some((v, i) => i % 4 !== 3 && v > 40), 'Fallback remains visible');
    assert.deepEqual(errors, []);
    return { mode, backend: result.backend, reason: result.scenery.reason, mediaRequests: mp4.length, errors };
  } finally { await context.close(); }
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1440, 390]) { const result = await actual(browser, width); results.push(result); console.log(JSON.stringify(result)); }
    for (const mode of ['reduced', 'save-data', 'canvas2d', 'paused', 'autoplay', 'missing']) {
      const result = await fallback(browser, mode); results.push(result); console.log(JSON.stringify(result));
    }
  } finally { await browser.close(); fs.writeFileSync(report, JSON.stringify(results, null, 2) + '\n'); }
})().catch(error => { console.error(error); process.exitCode = 1; });
