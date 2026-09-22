const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const output = process.env.ATLAS_HIDPI_OUTPUT || '/tmp/atlas-hidpi';

async function pixels(page) {
  return page.evaluate(() => {
    const d = atlasGpuDebug, layer = d.motion.spriteLayer, count = layer.members?.length || 1;
    const copy = document.createElement('canvas');
    copy.width = layer.canvas.width; copy.height = layer.canvas.height;
    const ctx = copy.getContext('2d'); ctx.drawImage(layer.canvas, 0, 0);
    const cell = copy.height, cells = [];
    for (let slot = 0; slot < count; slot++) {
      const rgba = ctx.getImageData(slot * cell, 0, cell, cell).data;
      let opaque = 0, minX = cell, maxX = -1, minY = cell, maxY = -1;
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        if (rgba[(y * cell + x) * 4 + 3] <= 200) continue;
        opaque++; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      cells.push({ opaque, bounds: [minX, minY, maxX + 1, maxY + 1].map(v => v / layer.rasterScale) });
    }
    return { backend: d.renderer.backend, error: d.rendererError, scale: layer.rasterScale,
      rasterRevision: layer.rasterRevision, callback: typeof layer.onRasterScaleChange,
      canvas: [copy.width, copy.height], cells, stats: d.renderer.stats.occlusion,
      members: (layer.members || [layer]).map(m => ({ x: m.x, y: m.y, footY: m.footY, anchor: m.anchor, ready: m.ready })) };
  });
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [1280, 390]) for (const family of [false, true]) {
      const dpr = width === 390 ? 3 : 1;
      const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: dpr,
        isMobile: width === 390, hasTouch: width === 390 });
      const result = { width, dpr, family, states: [], errors: [] };
      const stem = `${width}-${family ? 'family' : 'normal'}`;
      page.on('pageerror', error => result.errors.push(error.message));
      try {
        await page.addInitScript(() => localStorage.setItem('pinpin.atlas.motion.v1', 'paused'));
        await page.goto(base + 'atlas-webgpu.html?spriteMode=crisp' + (family ? '&family=1' : ''));
        await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.draws > 0 && atlasGpuDebug.motion.spriteLayer?.ready);
        await page.evaluate(() => {
          const d = atlasGpuDebug;
          if (!d.motion.paused) d.motion.toggle();
          d.motion.placeAtLocation('bridge');
          d.renderer.setBokehStrength(0); d.renderer.setOcclusion(false);
        });
        const initial = await pixels(page);
        result.initial = initial;
        for (const scale of [1, 2, 4, 2, 1]) {
          await page.evaluate(({ scale, dpr }) => {
            const d = atlasGpuDebug, layer = d.motion.spriteLayer;
            d.camera.focus([layer.x + 64, layer.footY - 40], scale / dpr);
          }, { scale, dpr });
          await page.waitForTimeout(150);
          const state = await pixels(page);
          result.states.push(state);
          await page.screenshot({ path: path.join(output, `${stem}-${scale}x.png`) });
        }
        assert.equal(initial.callback, 'function', 'Parent painter must attach onRasterScaleChange before adaptive resizing');
        const count = family ? 3 : 1;
        for (const state of result.states) {
          assert.equal(state.backend, 'webgpu'); assert.equal(state.error, null);
          assert.equal(state.canvas[0], 128 * count * state.scale);
          assert.equal(state.canvas[1], 128 * state.scale);
          assert(state.cells.every(cell => cell.opaque > 20 * state.scale ** 2), 'all physical cells contain their own sprite');
          assert.deepEqual(state.members, initial.members, 'camera zoom preserves world anchors and paused poses');
        }
        const high = result.states[2], low = result.states[4];
        assert.equal(high.scale, 4);
        assert(high.stats.extraTextureBytes <= 3149824);
        high.cells.forEach((cell, i) => {
          const ratio = high.scale / low.scale;
          assert(cell.opaque > low.cells[i].opaque * ratio ** 2 * 0.75, 'opaque area grows with physical resolution');
          cell.bounds.forEach((value, j) => assert(Math.abs(value - low.cells[i].bounds[j]) <= 2,
            'logical sprite silhouette stays fixed'));
        });
        const before = await pixels(page);
        await page.evaluate(() => {
          const d = atlasGpuDebug;
          for (let i = 0; i < 100; i++) d.renderer.render(d.camera.snapshot, { overlayDirty: false, now: performance.now() + i });
        });
        const after = await pixels(page);
        assert.equal(after.stats.spriteAllocations, before.stats.spriteAllocations);
        assert.equal(after.rasterRevision, before.rasterRevision);
        assert.deepEqual(result.errors, []);
        result.passed = true;
      } catch (error) {
        result.passed = false; result.failure = error.message;
        process.exitCode = 1;
      } finally {
        results.push(result); await page.close();
        console.log(JSON.stringify({ width, family, passed: result.passed, failure: result.failure,
          scales: result.states.map(state => state.scale) }));
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
