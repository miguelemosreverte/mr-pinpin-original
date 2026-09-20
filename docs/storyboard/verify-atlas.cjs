const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
const key = 'pinpin.atlas.v1';
const output = '/tmp/pinpin-atlas';
const pin = (page, id) => page.locator('[data-place="' + id + '"]');
async function layout(page, width) {
  const result = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.pin-label')].filter(el => getComputedStyle(el).visibility !== 'hidden').map(el => {
      const rect = el.getBoundingClientRect();
      return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,fits:el.scrollWidth <= el.clientWidth};
    });
    return {
      width:document.documentElement.scrollWidth,
      labels,
      targets:[...document.querySelectorAll('.map-pin,.icon-button,[data-lang]')].every(el => el.offsetWidth >= 44 && el.offsetHeight >= 44)
    };
  });
  assert.equal(result.width,width);
  assert(result.targets);
  assert(result.labels.every(label => label.fits));
  for (let i = 0; i < result.labels.length; i++) for (let j = i + 1; j < result.labels.length; j++) {
    const a = result.labels[i], b = result.labels[j];
    assert(!(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top),'Labels overlap');
  }
}
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const width of [1440,390,320]) for (const lang of ['en','es','ru']) {
      const context = await browser.newContext({viewport:{width,height:width > 600 ? 1000 : 844},hasTouch:width < 600,isMobile:width < 600});
      const page = await context.newPage();
      const errors = []; page.on('pageerror',error => errors.push(error.message));
      await page.goto(base + 'atlas.html?lang=' + lang);
      await page.locator('#map-art').evaluate(image => image.decode());
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      assert.equal(await pin(page,'elder').getAttribute('aria-disabled'),'true');
      assert.equal(await pin(page,'home').getAttribute('aria-disabled'),'true');
      assert.equal(await pin(page,'home').getAttribute('href'),null);
      assert.equal(await pin(page,'bridge').getAttribute('href'),'./?story=timber-tractor&lang=' + lang);
      await layout(page,width);
      await page.screenshot({path:output + '/' + width + '-' + lang + '.png'});
      const startingWidth = await page.locator('#map-scene').evaluate(el => el.clientWidth);
      await page.locator('#zoom-in').click();
      assert(await page.locator('#map-scene').evaluate(el => el.clientWidth) > startingWidth);
      await page.locator('#zoom-out').click();
      await page.locator('#zoom-fit').click();
      const fit = await page.locator('#map-scene').boundingBox();
      assert(fit.x >= -1 && fit.x + fit.width <= width + 1);
      await layout(page,width);
      await page.screenshot({path:output + '/' + width + '-' + lang + '-fit.png'});
      if (width < 600) {
        assert.equal(await page.locator('.pin-label:visible').count(),0);
        await page.keyboard.press('Tab');
        await pin(page,'home').focus();
        const tooltip = await pin(page,'home').locator('.pin-label').boundingBox();
        const home = await pin(page,'home').boundingBox();
        assert(tooltip && tooltip.y + tooltip.height <= home.y,'Overview tooltip stays above the home pin');
        await page.reload();
        const panned = await page.locator('#map-viewport').evaluate(el => {
          el.scrollLeft = el.scrollWidth; el.scrollTop = el.scrollHeight;
          const end = {x:el.scrollLeft,y:el.scrollTop};
          el.scrollLeft = 0; el.scrollTop = 0;
          return end.x > 0 && el.scrollLeft === 0 && el.scrollTop === 0;
        });
        assert(panned);
      }
      await pin(page,'lake').click();
      await page.waitForURL('**/?chapter=1&lang=' + lang);
      await page.waitForSelector('article[data-chapter="chapter-01"]');
      await page.goBack();
      await page.waitForSelector('[data-place="elder"][href]');
      assert.equal(await pin(page,'lake').getAttribute('data-state'),'opened');
      assert.equal(await pin(page,'lake').locator('.pin-status svg').count(),1);
      await pin(page,'elder').click();
      await page.waitForURL('**/?chapter=2&lang=' + lang);
      await page.waitForSelector('article[data-chapter="chapter-02"]');
      await page.goBack();
      assert.equal(await pin(page,'home').getAttribute('aria-disabled'),'true');
      await page.reload();
      assert.equal(await pin(page,'elder').getAttribute('data-state'),'opened');
      await pin(page,'bridge').click();
      await page.waitForURL('**/?story=timber-tractor&lang=' + lang);
      await page.waitForSelector('.scene');
      assert.equal(await page.locator('.scene').count(),30);
      await page.goBack();
      await page.locator('#atlas-library').click();
      await page.waitForSelector('#chapter-library[aria-busy="false"]');
      assert.equal(await page.locator('#library-atlas').getAttribute('href'),'atlas.html?lang=' + lang);
      await page.locator('#library-atlas').click();
      assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
      await page.goto(base + 'atlas.html');
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      await page.evaluate(key => localStorage.setItem(key,'{broken'),key);
      await page.reload();
      assert.equal(await pin(page,'elder').getAttribute('aria-disabled'),'true');
      await page.evaluate(key => localStorage.setItem(key,JSON.stringify({version:1,lang:'xx',opened:['elder',{},'home','unknown']})),key);
      await page.reload();
      assert.equal(await pin(page,'elder').getAttribute('aria-disabled'),'true');
      assert.equal(await page.locator('html').getAttribute('lang'),'en');
      await page.locator('[data-lang="es"]').click();
      await page.locator('[data-lang="ru"]').click();
      await page.goBack();
      assert.equal(await page.locator('html').getAttribute('lang'),'es');
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({width,lang,layout:true,navigation:true,storage:true}));
      await context.close();
    }
    const page = await browser.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(window,'localStorage',{get() { throw new DOMException('Blocked','SecurityError'); }});
    });
    await page.goto(base + 'atlas.html?lang=ru');
    assert.equal(await pin(page,'lake').getAttribute('href'),'./?chapter=1&lang=ru');
    await page.locator('[data-lang="es"]').click();
    assert.equal(await pin(page,'bridge').getAttribute('href'),'./?story=timber-tractor&lang=es');
    await page.locator('#zoom-fit').click();
    await page.close();
    console.log('Unavailable storage: controls and routes work.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
