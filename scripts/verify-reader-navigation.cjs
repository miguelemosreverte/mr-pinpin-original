const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');

const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const output = '/tmp/pinpin-reader-navigation';
fs.mkdirSync(output, {recursive:true});

async function readerReady(page) {
  await page.waitForSelector('#reader article');
  await page.waitForFunction(() => document.getElementById('reader').getAttribute('aria-busy') === 'false');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.scene-art img').first().evaluate(image => image.decode());
}

async function controls(page, width) {
  const info = await page.evaluate(() => {
    const visible = el => !!(el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    const bar = document.getElementById('reader-controls');
    return {
      actions:[...bar.querySelectorAll('a,button')].filter(visible).map(el => ({id:el.id, width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})),
      overflow:document.documentElement.scrollWidth > innerWidth,
      zoomDisabled:document.querySelector('meta[name=viewport]').content.includes('user-scalable=no')
    };
  });
  assert.deepEqual(info.actions.map(x => x.id).sort(), ['language-toggle','reader-map']);
  for (const action of info.actions) {
    assert(action.width >= 48 && action.height >= 48, `${width}: large ${action.id} hit target`);
  }
  assert(!info.overflow, `${width}: no horizontal overflow`);
  assert(!info.zoomDisabled, 'Native reader pinch zoom remains enabled');
}

async function scenePosition(page) {
  return page.locator('#scene-4').evaluate(el => {
    const r = el.getBoundingClientRect();
    return {top:r.top, height:r.height, ratio:-r.top/r.height};
  });
}

(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    for (const width of [320,390,1440]) {
      const context = await browser.newContext({viewport:{width,height:width < 600 ? 844 : 1000},isMobile:width < 600,hasTouch:width < 600});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base+'atlas-webgpu.html?lang=en');
      await page.waitForFunction(() => window.atlasGpuDebug?.renderer && window.atlasGpuDebug?.detector);
      const atlasActions = await page.locator('button:not(.atlas-book),a:not(.atlas-book)').evaluateAll(elements => elements.filter(el => {
        const r=el.getBoundingClientRect();
        return r.width>=40 && r.height>=40 && getComputedStyle(el).visibility!=='hidden';
      }).map(el => el.id));
      assert.deepEqual(atlasActions,['atlas-language-toggle'],'Atlas has only the approved language control outside contextual destination covers');
      await page.locator('#atlas-language-toggle').click();
      assert.equal(await page.locator('#atlas-languages button:visible').count(),3);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#atlas-language-toggle').getAttribute('aria-expanded'),'false');
      await page.evaluate(() => {
        if (!atlasGpuDebug.motion.paused) atlasGpuDebug.motion.toggle();
        atlasGpuDebug.motion.placeAtLocation('lake');
        atlasGpuDebug.focusDestination('lake');
      });
      await page.waitForFunction(() => !atlasGpuDebug.moving && atlasGpuDebug.covers.selected==='lake' && document.getElementById('map-viewport').dataset.activeCover==='lake');
      assert.equal(await page.locator('.atlas-book:visible').count(),1,'Only the cover nearest PinPin is visible');
      const camera = await page.evaluate(() => atlasGpuDebug.camera.snapshot);
      await page.locator('.atlas-book[data-destination=lake]').click();
      await page.waitForSelector('#story-preview[open]');
      const close = page.locator('#preview-close');
      assert((await close.innerText()).trim().length > 3, 'Preview has a clear text dismissal');
      assert((await close.boundingBox()).height >= 48, 'Preview dismissal has a large target');
      await page.mouse.click(2,2);
      await page.waitForFunction(() => !document.getElementById('story-preview').open);
      await page.waitForTimeout(200);
      await page.locator('.atlas-book[data-destination=lake]').click();
      await page.waitForSelector('#story-preview[open]');
      await close.click();
      await page.waitForFunction(() => !document.getElementById('story-preview').open);
      await page.waitForTimeout(200);
      await page.locator('.atlas-book[data-destination=lake]').click();
      await page.waitForSelector('#story-preview[open]');
      await page.locator('#preview-open').click();
      await readerReady(page);
      assert.equal(new URL(page.url()).searchParams.get('returnTo'), 'atlas-webgpu.html');
      await controls(page,width);
      await page.screenshot({path:`${output}/reader-${width}.png`});
      await page.locator('#scene-4').evaluate(el => {
        const r = el.getBoundingClientRect();
        window.scrollTo(0, scrollY+r.top+r.height*.15);
      });
      await page.waitForTimeout(200);
      const before = await scenePosition(page);
      await page.locator('#language-toggle').click();
      const choices = page.locator('#reader-languages button');
      assert.equal(await choices.count(),3);
      for (const choice of await choices.all()) {
        const box = await choice.boundingBox();
        assert(box.width >= 48 && box.height >= 48,'Large language choices');
      }
      await page.screenshot({path:`${output}/languages-${width}.png`});
      await page.locator('#reader-languages [data-lang=es]').click();
      await page.waitForFunction(() => document.documentElement.lang === 'es');
      await page.waitForTimeout(250);
      const after = await scenePosition(page);
      assert(Math.abs(after.ratio-before.ratio) < .05,'Language keeps the current scene position');
      await controls(page,width);
      await page.locator('#language-toggle').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#language-toggle').getAttribute('aria-expanded'),'false');
      await page.locator('#language-toggle').click();
      await page.locator('#scene-4 .scene-art').click({position:{x:10,y:10},force:true});
      assert.equal(await page.locator('#language-toggle').getAttribute('aria-expanded'),'false');
      await page.emulateMedia({media:'print'});
      assert(!await page.locator('#reader-controls').isVisible(),'No controls on printed pages');
      assert(!await page.locator('#reader-map-end').isVisible(),'No return button on printed pages');
      await page.emulateMedia({media:'screen'});
      await page.locator('#reader-map').click();
      await page.waitForURL(url => url.pathname.endsWith('/atlas-webgpu.html') && url.searchParams.get('lang')==='es');
      await page.waitForFunction(() => window.atlasGpuDebug?.renderer);
      const returned = await page.evaluate(() => atlasGpuDebug.camera.snapshot);
      for (const key of ['x','y','scale']) assert(Math.abs(returned[key]-camera[key]) < .01,`${key}: map camera restored`);
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({width,controls:2,languageAnchor:true,cameraRestored:true,errors}));
      await context.close();
    }
    const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    for (const query of ['chapter=2&lang=ru','story=timber-tractor&lang=en','chapter=1&lang=en&view=print']) {
      await page.goto(base+'?'+query);
      await readerReady(page);
      await controls(page,390);
      assert.equal(new URL(await page.locator('#reader-map').getAttribute('href'),page.url()).pathname.split('/').at(-1),'atlas-webgpu.html');
      await page.locator('#reader-map-end').scrollIntoViewIfNeeded();
      const footer = await page.locator('#reader-map-end').boundingBox();
      const bar = await page.locator('#reader-controls').boundingBox();
      assert(footer.y+footer.height <= bar.y+1,'Footer return is not obscured by bottom bar');
      console.log(JSON.stringify({reader:query,footerVisible:true}));
    }
    await page.goto(base+'?chapter=1&lang=en&returnTo=https://example.com');
    await readerReady(page);
    const safeReturn = new URL(await page.locator('#reader-map').getAttribute('href'),page.url());
    assert.equal(safeReturn.origin,new URL(base).origin,'Return cannot navigate to external origin');
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
