'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.ATLAS_URL || 'http://127.0.0.1:8767/storyboard/atlas-webgpu.html?lang=en&coverPreview=1';
const output = process.argv[2] || '/tmp/pinpin-performance.json';

async function snapshot(page, session) {
  const metrics = Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const state = await page.evaluate(() => ({
    frames: atlasGpuDebug.renderCount,
    renderer: atlasGpuDebug.renderer.stats,
    images: [...document.images].filter(i => i.complete && i.naturalWidth).map(i => ({
      src: i.currentSrc, width: i.naturalWidth, height: i.naturalHeight
    })),
    resources: performance.getEntriesByType('resource').map(r => ({
      name: r.name, type: r.initiatorType, encoded: r.encodedBodySize, transfer: r.transferSize
    }))
  }));
  return {metrics, ...state};
}

async function sample(page, session, duration = 3000) {
  const before = await snapshot(page, session);
  await page.waitForTimeout(duration);
  const after = await snapshot(page, session);
  const seconds = after.metrics.Timestamp - before.metrics.Timestamp;
  return {
    seconds,
    taskMilliseconds: 1000 * (after.metrics.TaskDuration - before.metrics.TaskDuration),
    scriptMilliseconds: 1000 * (after.metrics.ScriptDuration - before.metrics.ScriptDuration),
    framesPerSecond: (after.frames - before.frames) / seconds,
    drawsPerSecond: (after.renderer.draws - before.renderer.draws) / seconds,
    overlayUploadsPerSecond: (after.renderer.overlayUploads - before.renderer.overlayUploads) / seconds,
    requests: after.resources.length - before.resources.length,
    jsHeapBytes: after.metrics.JSHeapUsedSize
  };
}

(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  const results = [];
  try {
    for (const viewport of [{width:390,height:844}, {width:1440,height:1000}]) {
      const context = await browser.newContext({viewport, deviceScaleFactor:2});
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      await session.send('Performance.enable');
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const start = Date.now();
      await page.goto(url);
      await page.waitForFunction(() => window.atlasGpuDebug?.renderer && atlasGpuDebug.detector && atlasGpuDebug.covers.loaded);
      const readyMilliseconds = Date.now() - start;
      await page.waitForTimeout(1500);
      const walking = await sample(page, session);
      await page.evaluate(() => atlasGpuDebug.motion.placeAtLocation('lake'));
      // Let the focus easing finish before measuring steady resting work.
      await page.waitForTimeout(3000);
      const resting = await sample(page, session);
      await page.evaluate(() => { if (!atlasGpuDebug.motion.paused) atlasGpuDebug.motion.toggle(); });
      await page.waitForTimeout(1500);
      const paused = await sample(page, session);
      const state = await snapshot(page, session);
      await page.screenshot({path:output.replace(/\.json$/, `-${viewport.width}.png`)});
      results.push({viewport, readyMilliseconds, walking, resting, paused,
        encodedBytes:state.resources.reduce((sum,r) => sum+r.encoded,0),
        requestCount:state.resources.length, renderer:state.renderer, images:state.images,
        resources:state.resources, errors});
      await context.close();
    }
    fs.writeFileSync(output, JSON.stringify({date:new Date().toISOString(), url, results},null,2)+'\n');
    console.log(JSON.stringify(results.map(({resources,images,...summary})=>summary),null,2));
    if (process.env.ATLAS_PERF_CHECK === '1') for (const result of results) {
      assert.deepEqual(result.errors, [], 'No page errors');
      assert(result.encodedBytes < 16 * 1024 * 1024, 'Cold atlas payload stays below 16 MiB');
      assert(result.requestCount <= 80, 'Cold atlas avoids duplicate story probes');
      assert(result.walking.drawsPerSecond >= 20, 'Walking remains animated');
      assert(result.resting.drawsPerSecond <= 20, 'Resting map avoids full-rate GPU work');
      assert.equal(result.paused.drawsPerSecond, 0, 'Paused map performs no GPU draws');
      assert.equal(result.paused.overlayUploadsPerSecond, 0, 'Paused map performs no overlay uploads');
      for (const phase of ['walking','resting','paused']) assert.equal(result[phase].requests, 0, phase+' has no background requests');
      assert(result.resources.some(r => r.name.endsWith('.bin.gz')), 'Uses compressed confidence texture');
      assert(!result.resources.some(r => r.name.endsWith('/shire-focus-field-v1.bin')), 'Does not download raw field normally');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
