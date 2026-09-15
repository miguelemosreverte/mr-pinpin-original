const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
async function main() {
  const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const width of [1440,390,320]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      const errors = []; page.on('pageerror',error => errors.push(error.message));
      for (const lang of ['en','es','ru']) {
        await page.goto(base + 'library.html?lang=' + lang);
        await page.waitForSelector('#chapter-library[aria-busy=false] .chapter-cover');
        assert.equal(await page.locator('.chapter-cover').count(),38);
        assert.equal(await page.locator('.chapter-cover a').count(),1);
        assert.equal(await page.locator('html').getAttribute('lang'),lang);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
        assert(await page.locator('.chapter-cover a').first().getAttribute('href').then(href => href.endsWith('lang=' + lang)));
        await page.evaluate(async () => {
          const images = [...document.querySelectorAll('.chapter-cover img')];
          images.forEach(image => { image.loading = 'eager'; });
          await Promise.all(images.map(image => image.decode()));
        });
        if (lang === 'en') await page.screenshot({path:'/tmp/pinpin-library-' + width + '.png'});
        await page.locator('#chapter-filter').selectOption('published');
        assert.equal(await page.locator('.chapter-cover').count(),1);
        await page.locator('#chapter-filter').selectOption('upcoming');
        assert.equal(await page.locator('.chapter-cover').count(),37);
        await page.locator('#chapter-search').fill('zzzzzz');
        assert.equal(await page.locator('.chapter-cover').count(),0);
        assert((await page.locator('#library-status').textContent()).length > 0);
        await page.locator('#chapter-search').fill('');
        await page.locator('#chapter-filter').selectOption('published');
        await page.locator('.chapter-cover a').click();
        await page.waitForSelector('.scene');
        assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
        await page.locator('.reader-footer a').click();
        await page.waitForSelector('.chapter-cover');
        assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
      }
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({width,languages:3,covers:38,published:1,search:true,chapterNavigation:true}));
      await page.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
