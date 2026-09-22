'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {capsuleClearance} = require('./atlas-roadside-contact.test.cjs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const output = process.env.ATLAS_ADJACENCY_OUTPUT || '/tmp/atlas-tractor-adjacency-v13';
const url = process.env.ATLAS_ADJACENCY_URL || 'http://127.0.0.1:8767/storyboard/atlas-webgpu.html?tractor=v13';
const south = process.env.ATLAS_ADJACENCY_LANE === 'south';
const vehicle = [[1292,745],[1322,734],[1324,726],[1341,722],[1364,682],[1381,680],[1408,700],
  [1410,724],[1456,724],[1462,748],[1458,774],[1424,786],[1380,783],[1363,796],[1332,797],[1303,786],[1292,770]];
const results = [];

async function pixels(page, checkVisibility = false) {
  return page.evaluate(async ({polygon, checkVisibility}) => {
    const d = atlasGpuDebug, layer = d.motion.spriteLayer;
    const image = layer.canvas.getContext('2d').getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const calibration = checkVisibility ? await import('./gpu/occlusion.js') : null;
    const roadside = await import('./gpu/tractor-ground.js');
    const roadsideWeight = roadside.tractorGroundWeight(layer.x + layer.anchor[0], layer.footY);
    const baseDepth = calibration && calibration.groundDepth(layer.footY);
    const footDepth = calibration && roadside.tractorGroundDepth(layer.x + layer.anchor[0], layer.footY, baseDepth);
    let overlap = 0, opaque = 0, gap = Infinity, visibleWeight = 0, totalWeight = 0;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] <= 15) continue;
      const p = [layer.x + x + .5, layer.y + y + .5];
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[j], b = polygon[i], dx = b[0] - a[0], dy = b[1] - a[1];
        if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
        gap = Math.min(gap, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
      }
      opaque++;
      if (inside) overlap++;
      if (checkVisibility) {
        let scene = 0;
        for (let sy = -1; sy <= 1; sy++) for (let sx = -1; sx <= 1; sx++) scene += d.renderer.sampleDepth(p[0] + sx * 2, p[1] + sy * 2);
        const alpha = image.data[(y * image.width + x) * 4 + 3] / 255;
        totalWeight += alpha;
        visibleWeight += alpha * calibration.visibility(scene / 9, footDepth);
      }
    }
    const state = d.motionCanvas.dataset;
    return {point: [Number(state.x), Number(state.y)], heading: Number(state.heading),
      arrived: state.arrived === 'true', opaque, overlap, gap, frame: state.frame, roadsideWeight,
      visibleFraction: checkVisibility ? visibleWeight / totalWeight : null};
  }, {polygon: vehicle, checkVisibility});
}

async function main() {
  fs.mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    for (const width of [1440,390]) {
      const context = await browser.newContext({viewport: {width, height: width === 390 ? 844 : 1000},
        isMobile: width === 390, hasTouch: width === 390});
      try {
        await context.addInitScript(() => localStorage.setItem('pinpin.atlas.motion.v1', 'paused'));
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url);
        await page.waitForFunction(() => atlasGpuDebug?.renderer?.stats.draws > 0 && atlasGpuDebug.motion.spriteLayer?.ready && atlasGpuDebug.covers.loaded);
        await page.evaluate(south => {
          const d = atlasGpuDebug;
          d.motion.placeAtLocation('bridge');
          d.camera.focus(south ? [1380,785] : [1390,745], d.camera.snapshot.width / (innerWidth < 600 ? 300 : 480));
          d.renderer.setBokehStrength(0);
        }, south);
        await page.waitForTimeout(250);
        // Use actual derived segments near three beside-the-vehicle stopping points.
        const stops = await page.evaluate(south => (south ? [[1310,819.75],[1380,807.5],[1450,795.25]] : [[1430,693],[1445,710],[1498,780]]).map(p => {
          let best, gap = Infinity;
          for (const e of atlasGpuDebug.motion.navigation.edges) {
            if (!e.route.startsWith('tractor')) continue;
            const dx = e.b[0] - e.a[0], dy = e.b[1] - e.a[1];
            const t = Math.max(0, Math.min(1, ((p[0] - e.a[0]) * dx + (p[1] - e.a[1]) * dy) / (dx * dx + dy * dy)));
            const q = [e.a[0] + t * dx, e.a[1] + t * dy], distance = Math.hypot(q[0] - p[0], q[1] - p[1]);
            if (distance < gap) { gap = distance; best = q; }
          }
          return best;
        }), south);
        await page.clock.install();
        await page.evaluate(() => atlasGpuDebug.motion.toggle());
        for (const [index, target] of [...stops, ...stops.slice(0,-1).reverse()].entries()) {
          await page.evaluate(p => atlasGpuDebug.motion.setTarget([p[0] / 1536, p[1] / 1024]), target);
          let data, count = 0, minimum = Infinity;
          do {
            await page.clock.fastForward(100);
            data = await pixels(page);
            assert(data.opaque > 100, 'rendered sprite contains visible pixels');
            const footGap = capsuleClearance({a: data.point, b: data.point}, vehicle);
            assert(footGap >= 6, `feet remain on ground outside vehicle: ${JSON.stringify(data)}`);
            if (data.roadsideWeight <= 0) assert.equal(data.overlap, 0, `outside foreground roadside no body pixels overlap vehicle: ${JSON.stringify(data)}`);
            minimum = Math.min(minimum, data.gap);
            assert(++count < 450, 'bounded connected journey');
          } while (!data.arrived || Math.hypot(data.point[0] - target[0], data.point[1] - target[1]) > 1);
          await page.clock.runFor(40);
          const screenshot = path.join(output, `${width}-stop-${index}.png`);
          await page.screenshot({path: screenshot});
          const arrival = await pixels(page, true);
          const result = {width, index, target, samples: count, minimumGap: minimum, arrival, screenshot};
          results.push(result); console.log(JSON.stringify(result));
          if (!south && (index === 1 || index === 3)) assert(arrival.visibleFraction >= .75, 'beside-trailer stopping pose must remain visible');
        }
        assert.equal(errors.length, 0, errors.join('\n'));
      } finally { await context.close(); }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
