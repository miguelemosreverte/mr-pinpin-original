'use strict';
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';

async function main() {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  const results = [];
  try {
    for (const device of [{width:1440,height:1000,dpr:1}, {width:390,height:844,dpr:3}]) {
      const context = await browser.newContext({viewport:{width:device.width,height:device.height}, deviceScaleFactor:device.dpr, reducedMotion:'reduce'});
      await context.addInitScript(() => {
        localStorage.setItem('pinpin.atlas.motion.v1', 'paused');
        window.assetDecodes = [];
        const decode = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = function(...args) {
          const start = performance.now(), src = this.src;
          return decode.apply(this, args).finally(() => assetDecodes.push({src, ms:performance.now()-start}));
        };
      });
      const page = await context.newPage(), requests = [];
      page.on('request', request => requests.push({method:request.method(), url:request.url()}));
      const cdp = await context.newCDPSession(page);
      await cdp.send('Performance.enable');
      await page.goto(base + 'atlas-webgpu.html?lang=en&coverPreview=1');
      await page.waitForFunction(() => window.atlasGpuDebug?.covers.loaded && atlasGpuDebug.renderer);
      await page.waitForTimeout(500);
      const opening = await page.evaluate(async () => {
        const imgs = [...document.querySelectorAll('.atlas-book img')];
        const images = await Promise.all(imgs.map(async img => {
          const bitmap = await createImageBitmap(img);
          const result = {src:img.currentSrc,width:bitmap.width,height:bitmap.height,rgbaBytes:bitmap.width*bitmap.height*4};
          bitmap.close(); return result;
        }));
        return {images, resources:performance.getEntriesByType('resource').map(r => ({url:r.name,bytes:r.encodedBodySize,transfer:r.transferSize})), decodes:assetDecodes};
      });
      const performanceMetrics = (await cdp.send('Performance.getMetrics')).metrics.filter(m => /TaskDuration|ScriptDuration|JSHeapUsedSize/.test(m.name));
      const openingRequests = [...requests];
      await page.evaluate(async () => {
        await AtlasStories.available();
        for (const lang of ['es','ru','en']) await atlasGpuDebug.covers.update(lang, {});
      });
      const repeatRequests = requests.slice(openingRequests.length);
      await page.evaluate(async () => { await AtlasStories.preview('home','es'); });
      results.push({device, opening, performanceMetrics, openingRequests, repeatRequests,
        previewRequests:requests.slice(openingRequests.length + repeatRequests.length)});
      await page.screenshot({path:`/tmp/pinpin-assets-${process.argv[2] || 'measure'}-${device.width}.png`});
      await context.close();
    }
  } finally { await browser.close(); }
  const output = '/tmp/pinpin-assets-' + (process.argv[2] || 'measure') + '.json';
  fs.writeFileSync(output, JSON.stringify(results,null,2) + '\n');
  console.log(output);
  for (const result of results) console.log(JSON.stringify({device:result.device,
    requests:result.openingRequests.length,heads:result.openingRequests.filter(r => r.method==='HEAD').length,
    miniatureBytes:result.opening.resources.filter(r => r.url.includes('/miniature/')).reduce((n,r) => n+r.bytes,0),
    miniatureDecodedBytes:result.opening.images.reduce((n,r) => n+r.rgbaBytes,0),
    miniatureDecodeCalls:result.opening.decodes.filter(r => r.src.includes('/miniature/')).length,
    repeatRequests:result.repeatRequests.length,performanceMetrics:result.performanceMetrics}));
}
main().catch(error => {console.error(error); process.exitCode=1;});
