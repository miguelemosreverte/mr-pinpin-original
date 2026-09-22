'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = (process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/').replace(/\/?$/, '/');
const output = process.env.ATLAS_CRISP_OUTPUT || '/tmp/atlas-crisp-sprites';
const center = [1380, 807.5];
const results = [];

async function waitForMetadata() {
  const deadline = Date.now() + Number(process.env.ATLAS_METADATA_WAIT_MS || 600000);
  let previous;
  while (Date.now() < deadline) {
    const response = await fetch(base + 'atlas-directions.js', {cache: 'no-store'});
    assert(response.ok, 'metadata response succeeds');
    const context = {window: {}};
    vm.runInNewContext(await response.text(), context);
    const metadata = context.window.atlasDirections;
    if (metadata.directions.length !== previous) {
      previous = metadata.directions.length;
      console.log(`Metadata: ${previous}/24 headings`);
    }
    if (previous === 24 && metadata.directions.some(d => d.runtimeSrc?.endsWith('pinpin-directions-intermediate-a-v2.webp'))) {
      assert.deepEqual(Array.from(metadata.directions, d => d.angle).sort((a, b) => a - b),
        Array.from({length: 24}, (_, i) => i * 15));
      const sheets = [...new Set(metadata.directions.map(d => d.runtimeSrc))];
      assert.equal(sheets.length, 6, 'six distinct runtime sheets');
      assert(sheets.every(src => src?.endsWith('.webp')), 'runtime sheets use WebP');
      return sheets;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw Error('Timed out waiting for all 24 production headings');
}

async function readSprite(page) {
  return page.evaluate(async () => {
    const d = atlasGpuDebug, layer = d.motion.spriteLayer, state = {...d.motionCanvas.dataset};
    const imageKey = layer.imageKey, bitmapUrl = layer.canvas.toDataURL().split(',')[1];
    // Read a copy so Chrome's repeated-readback heuristic cannot change the live canvas backend.
    const snapshot = document.createElement('canvas'); snapshot.width = snapshot.height = 128;
    const snapshotContext = snapshot.getContext('2d'); snapshotContext.drawImage(layer.canvas, 0, 0);
    const bitmap = snapshotContext.getImageData(0, 0, 128, 128);
    const [keyDirection, ...parts] = imageKey.split(';');
    const samples = parts.map(part => {
      const fields = part.split(',');
      return {source: fields[0], crop: fields.slice(1, 5).map(Number),
        anchor: fields.slice(5, 7).map(Number), scale: Number(fields[7]), opacity: Number(fields[8])};
    });
    let opaquePixels = 0, alphaPixels = 0, mismatchPixels = null, expectedBitmap;
    for (let i = 3; i < bitmap.data.length; i += 4) {
      if (bitmap.data[i] > 0) alphaPixels++;
      if (bitmap.data[i] > 240) opaquePixels++;
    }
    if (state.spriteMode === 'crisp') {
      const spec = atlasDirections.directions.find(item => item.angle === Number(state.direction));
      const frame = spec.frames[Number(state.frame)];
      const image = new Image(); image.src = spec.runtimeSrc; await image.decode();
      const expected = document.createElement('canvas'); expected.width = expected.height = 128;
      const ctx = expected.getContext('2d'), scale = atlasDirections.displayWidth / spec.referenceWidth;
      ctx.translate(...layer.anchor);
      ctx.drawImage(image, ...frame.rect, -frame.anchor[0] * scale, -frame.anchor[1] * scale,
        frame.rect[2] * scale, frame.rect[3] * scale);
      const pixels = ctx.getImageData(0, 0, 128, 128).data;
      mismatchPixels = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels.slice(i, i + 4).some((value, channel) => value !== bitmap.data[i + channel])) mismatchPixels++;
      if (mismatchPixels) expectedBitmap = expected.toDataURL().split(',')[1];
    }
    return {point: [Number(state.x), Number(state.y)], heading: Number(state.heading),
      direction: Number(state.direction), frame: Number(state.frame), mode: state.spriteMode,
      arrived: state.arrived === 'true', imageKey, keyDirection, samples,
      opaquePixels, alphaPixels, mismatchPixels, bitmap: bitmapUrl, expectedBitmap,
      backend: d.renderer.backend, rendererError: d.rendererError || null};
  });
}

async function walkTo(page, target) {
  await page.evaluate(target => atlasGpuDebug.motion.setTarget([target[0] / 1536, target[1] / 1024]), target);
  for (let i = 0; i < 160; i++) {
    await page.clock.fastForward(1000);
    const arrived = await page.evaluate(target => {
      const data = atlasGpuDebug.motionCanvas.dataset;
      return data.arrived === 'true' && Math.hypot(Number(data.x) - target[0], Number(data.y) - target[1]) < .01;
    }, target);
    if (arrived) return;
  }
  throw Error('Production route did not reach ' + JSON.stringify(target));
}

async function checkWorldPixels(page, png) {
  return page.evaluate(async encoded => {
    const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 100;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 160, 100);
    const pixels = ctx.getImageData(0, 0, 160, 100).data, colors = new Set();
    let opaque = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      colors.add([pixels[i] >> 4, pixels[i + 1] >> 4, pixels[i + 2] >> 4].join(','));
      if (pixels[i + 3] > 240) opaque++;
    }
    return {colors: colors.size, opaque};
  }, png.toString('base64'));
}

async function verifyView(browser, sheets, width, mode) {
  const context = await browser.newContext({viewport: {width, height: width === 390 ? 844 : 1000},
    isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'no-preference', serviceWorkers: 'block'});
  try {
    await context.addInitScript(() => localStorage.setItem('pinpin.atlas.motion.v1', 'paused'));
    const page = await context.newPage(), errors = [], requests = [], responses = new Map();
    page.on('pageerror', error => errors.push(error.message));
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', {cacheDisabled: true});
    session.on('Network.responseReceived', ({response}) => {
      if (sheets.some(src => response.url === new URL(src, base).href))
        responses.set(response.url, {status: response.status, diskCache: Boolean(response.fromDiskCache),
          serviceWorker: Boolean(response.fromServiceWorker)});
    });
    page.on('requestfailed', request => requests.push({url: request.url(), error: request.failure()?.errorText}));
    await page.goto(base + `atlas-webgpu.html?tractor=v13&spriteMode=${mode}&returnPlace=bridge`);
    await page.waitForFunction(() => window.atlasDirections?.directions.length === 24 &&
      window.atlasGpuDebug?.renderer?.stats.draws > 0 && atlasGpuDebug.motion.spriteLayer?.ready && atlasGpuDebug.covers.loaded);
    assert.equal(await page.evaluate(() => atlasGpuDebug.renderer.backend), 'webgpu', 'actual Chrome WebGPU backend');
    const expectedSheets = mode === 'crisp' ? sheets : await page.evaluate(() =>
      [...new Set(atlasDirections.directions.filter(d => d.angle % 30 === 0).map(d => d.runtimeSrc))]);
    await page.waitForLoadState('networkidle');
    for (const src of expectedSheets) {
      const response = responses.get(new URL(src, base).href);
      assert(response, 'fresh browser loaded ' + src);
      assert.equal(response.status, 200, src); assert.equal(response.diskCache, false, src);
      assert.equal(response.serviceWorker, false, src);
    }
    await page.evaluate(() => {
      atlasGpuDebug.camera.focus([1380, 785], atlasGpuDebug.camera.snapshot.width / (innerWidth < 600 ? 300 : 480));
      atlasGpuDebug.renderer.setBokehStrength(0);
    });
    await page.waitForTimeout(250);
    await page.clock.install({time: new Date('2026-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.evaluate(() => atlasGpuDebug.motion.toggle());
    const journeys = [{name: 'east', start: [1340, 814.5], end: [1420, 800.5], heading: 350, direction: 345},
      {name: 'west', start: [1420, 800.5], end: [1340, 814.5], heading: 170, direction: 165}];
    for (const journey of journeys) {
      await walkTo(page, journey.start);
      await page.evaluate(target => atlasGpuDebug.motion.setTarget([target[0] / 1536, target[1] / 1024]), journey.end);
      await page.clock.runFor(32);
      const point = await page.evaluate(() => [Number(atlasGpuDebug.motionCanvas.dataset.x), Number(atlasGpuDebug.motionCanvas.dataset.y)]);
      const milliseconds = Math.hypot(point[0] - center[0], point[1] - center[1]) / 44 * 1000;
      await page.clock.runFor(Math.round(milliseconds / 16) * 16);
      const frames = new Set();
      for (let phase = 0; phase < 4; phase++) {
        if (phase) await page.clock.runFor(190);
        const data = await readSprite(page);
        if (data.mismatchPixels) {
          fs.writeFileSync(path.join(output, 'mismatch.json'), JSON.stringify({...data, bitmap: undefined}, null, 2));
          fs.writeFileSync(path.join(output, 'mismatch.png'), Buffer.from(data.bitmap, 'base64'));
          fs.writeFileSync(path.join(output, 'expected.png'), Buffer.from(data.expectedBitmap, 'base64'));
        }
        assert.equal(data.backend, 'webgpu'); assert.equal(data.rendererError, null);
        assert.equal(data.arrived, false, 'sample is actual walking, not an arrival pose');
        assert(Math.abs(data.heading - journey.heading) < .1, 'actual lower-road heading');
        assert(data.opaquePixels > 100 && data.alphaPixels > 200, 'nonblank sprite bitmap');
        if (!phase) assert(Math.hypot(data.point[0] - center[0], data.point[1] - center[1]) < 1, 'near exact tractor foot point');
        assert.equal(data.mode, mode); assert.equal(Number(data.keyDirection), data.direction);
        if (mode === 'crisp') {
          assert.equal(data.direction, journey.direction); assert.equal(data.samples.length, 1);
          assert.equal(data.samples[0].opacity, 1); assert.equal(data.mismatchPixels, 0, 'exact single atlas crop: no blended silhouette');
          frames.add(data.frame);
        } else {
          assert(data.samples.length > 1, 'legacy blends multiple samples');
          assert(Math.abs(data.samples.reduce((sum, sample) => sum + sample.opacity, 0) - 1) < 1e-10);
          assert(data.samples.every(sample => sample.opacity < 1));
          const match = results.find(result => result.width === width && result.mode === 'crisp' &&
            result.journey === journey.name && result.phase === phase);
          assert(match && Math.hypot(...data.point.map((v, i) => v - match.point[i])) < .01, 'legacy and crisp share the exact walking point');
        }
        const stem = `${width}-${journey.name}-${mode}-phase-${phase}`;
        fs.writeFileSync(path.join(output, stem + '-sprite.png'), Buffer.from(data.bitmap, 'base64'));
        delete data.bitmap;
        await page.screenshot({path: path.join(output, stem + '.png')});
        const png = await page.locator('#world-canvas').screenshot();
        const worldPixels = await checkWorldPixels(page, png);
        assert(worldPixels.colors > 50 && worldPixels.opaque > 15000, 'nonblank rendered world');
        const result = {width, mode, journey: journey.name, phase, ...data, worldPixels,
          screenshot: stem + '.png', sprite: stem + '-sprite.png'};
        results.push(result);
        console.log(JSON.stringify({width, mode, journey: journey.name, phase, point: data.point,
          direction: data.direction, frame: data.frame, samples: data.samples.length, mismatchPixels: data.mismatchPixels}));
      }
      if (mode === 'crisp') assert.equal(frames.size, 4, 'four distinct crisp gait crops captured');
    }
    assert.deepEqual(errors, [], 'no page errors');
    assert.deepEqual(requests.filter(request => sheets.some(src => request.url === new URL(src, base).href)),
      [], 'no failed sprite sheet requests');
    fs.writeFileSync(path.join(output, `${width}-${mode}-network.json`), JSON.stringify({errors, requests,
      loadedSheets: [...responses].map(([url, response]) => ({url, ...response}))}, null, 2) + '\n');
  } finally { await context.close(); }
}

function writeComparison() {
  const rows = results.filter(result => result.mode === 'crisp').map(crisp => {
    const legacy = results.find(item => item.width === crisp.width && item.journey === crisp.journey &&
      item.phase === crisp.phase && item.mode === 'legacy');
    return `<section><h2>${crisp.width}px / ${crisp.journey} / phase ${crisp.phase} / heading ${crisp.heading.toFixed(2)}</h2>` +
      `<div class="pair">${[crisp, legacy].filter(Boolean).map(item => `<figure><figcaption>${item.mode}: direction ${item.direction}, gait ${item.frame}, ${item.samples.length} sample(s)</figcaption><a href="${item.screenshot}"><img src="${item.screenshot}"></a><img class="sprite" src="${item.sprite}"></figure>`).join('')}</div></section>`;
  }).join('\n');
  fs.writeFileSync(path.join(output, 'comparison.html'), '<!doctype html><html lang="en"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas crisp sprite comparison</title>' +
    '<style>body{margin:24px;font:16px system-ui;background:#f2f4f6;color:#17202b}h1{font-size:24px}h2{font-size:18px}' +
    'section{border-top:1px solid #aab2bb;padding:20px 0}.pair{display:flex;gap:16px;align-items:start}figure{margin:0;flex:1;min-width:0}' +
    'img{max-width:100%;height:auto}figcaption{margin-bottom:8px}.sprite{display:block;width:256px;background:#d6dce1}' +
    '@media(max-width:650px){.pair{display:block}figure{margin-bottom:20px}}</style><h1>Actual Chrome WebGPU: crisp / legacy</h1>' + rows + '</html>');
}

async function main() {
  fs.mkdirSync(output, {recursive: true});
  const sheets = await waitForMetadata();
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    for (const width of [1440, 390]) for (const mode of ['crisp', 'legacy'])
      await verifyView(browser, sheets, width, mode);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
    writeComparison();
  }
  console.log(`PASS: ${results.length} actual walking samples; comparison ${path.join(output, 'comparison.html')}`);
}
main().catch(error => {console.error(error); process.exitCode = 1;});
