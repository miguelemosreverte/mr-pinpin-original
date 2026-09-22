'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const root = path.join(__dirname, '../docs/storyboard');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'covers.json'), 'utf8'));
const results = [];
const ready = page => page.waitForFunction(() => window.atlasGpuDebug?.covers.loaded && atlasGpuDebug.renderer);
const noTitles = requests => assert.equal(requests.filter(r => r.method === 'GET' &&
  /\/title-[^/]+\.png$/.test(r.url)).length, 0, 'No full title downloads before preview');

async function focus(page, id, zoom) {
  await page.evaluate(({id,zoom}) => {
    const d = atlasGpuDebug, entry = d.covers.entries.find(e => e.id === id);
    d.motion.placeAtLocation(id);
    const s = d.camera.snapshot;
    d.camera.focus(d.world(entry.placement.anchor), zoom*Math.max(s.width/atlasGeometry.width,s.height/atlasGeometry.height));
  }, {id,zoom});
  await page.waitForFunction(id => atlasGpuDebug.covers.selected === id && !atlasGpuDebug.moving, id);
  await page.waitForTimeout(150);
  await page.locator(`.atlas-book[data-destination="${id}"] img`).evaluate(image => image.decode());
}

async function main() {
  for (const cover of Object.values(registry.covers)) {
    const src = path.join(root, cover.miniature.asset);
    for (const derivative of cover.miniature.derivatives) {
      const resize = derivative.width === 1024 ? [] : ['-filter','Lanczos','-resize',`${derivative.width}x${derivative.height}!`];
      const original = execFileSync('magick', [src,...resize,'-depth','8','rgba:-'], {maxBuffer:8*1024*1024});
      const decoded = execFileSync('magick', [path.join(root, derivative.src),'-depth','8','rgba:-'], {maxBuffer:8*1024*1024});
      assert.equal(original.length,decoded.length,'Derivative keeps target dimensions and alpha channels');
      let squaredError=0;
      for (let i=0;i<original.length;i++) {
        if (i%4===3) assert.equal(decoded[i],original[i],'Alpha remains lossless');
        else squaredError+=(original[i]-decoded[i])**2;
      }
      const psnr=10*Math.log10(255**2/(squaredError/(original.length*3/4)));
      assert(Number.isFinite(psnr),'Compression comparison produces a measurable RGB error');
      results.push({asset:derivative.src,bytes:fs.statSync(path.join(root,derivative.src)).size,psnr});
    }
  }
  results.push({test:'all 12 q92 derivatives retain dimensions and exact alpha; RGB PSNR recorded for visual review', pass:true});
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const device of [{width:1440,height:1000,dpr:1},{width:390,height:844,dpr:3}]) {
      const context = await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:device.dpr,reducedMotion:'reduce'});
      await context.addInitScript(() => localStorage.setItem('pinpin.atlas.motion.v1','paused'));
      const page = await context.newPage(), requests = [];
      page.on('request', r => requests.push({method:r.method(),url:r.url()}));
      await page.goto(base+'atlas-webgpu.html?coverPreview=1'); await ready(page);
      noTitles(requests);
      const baseline = requests.length;
      await page.evaluate(async () => {
        await Promise.all([AtlasStories.available(),AtlasStories.available()]);
        await Promise.all(['en','es','ru'].map(lang => atlasGpuDebug.covers.update(lang,{})));
      });
      await page.waitForTimeout(100);
      assert.equal(requests.length,baseline,'Availability and rapid language updates cause no network requests');
      for (const id of ['home','lake','elder','bridge']) {
        await focus(page,id,2);
        const normal = await page.locator(`.atlas-book[data-destination="${id}"] img`).boundingBox();
        await focus(page,id,16);
        const detail = await page.locator(`.atlas-book[data-destination="${id}"] img`).evaluate(async image => {
          const rect=image.getBoundingClientRect(), bitmap=await createImageBitmap(image);
          const result={src:image.currentSrc,cssWidth:rect.width,pixelWidth:bitmap.width}; bitmap.close();return result;
        });
        assert(detail.src.endsWith('.webp'));
        assert(detail.pixelWidth>=Math.min(1024,Math.floor(detail.cssWidth*device.dpr)), 'Zoom retains original-resolution detail');
        assert(normal.width>40);
        results.push({device,id,zoom:detail});
      }
      noTitles(requests);
      await page.screenshot({path:`/tmp/pinpin-assets-zoom-${device.width}.png`});
      for (const lang of ['en','es','ru']) for (const id of ['home','lake','elder','bridge']) {
        const asset = await page.evaluate(({id,lang}) => AtlasStories.preview(id,lang),{id,lang});
        assert(asset.src.endsWith(`title-${lang}-v1.png`));
      }
      results.push({device,test:'12 full localized previews load only on request',pass:true});
      await context.close();
    }
    for (const failAtZoom of [false,true]) {
      const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2,reducedMotion:'reduce'}), requests=[];
      await page.addInitScript(() => localStorage.setItem('pinpin.atlas.motion.v1','paused'));
      page.on('request',r => requests.push({method:r.method(),url:r.url()}));
      await page.route('**/miniature/*.webp', route => !failAtZoom || route.request().url().endsWith('-1024.webp') ? route.abort() : route.continue());
      await page.goto(base+'atlas-webgpu.html'); await ready(page);
      await focus(page,'home',16);
      await page.waitForFunction(() => {
        const image=document.querySelector('.atlas-book[data-destination="home"] img');
        return image.complete && image.naturalWidth>0 && image.currentSrc.endsWith('.png');
      });
      noTitles(requests);
      results.push({test:failAtZoom ? 'failed zoom derivative falls back to original miniature' : 'missing WebP falls back to original miniature',pass:true});
      await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync('/tmp/pinpin-asset-loading-results.json',JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
}
main().catch(error => {console.error(error); process.exitCode=1;});
