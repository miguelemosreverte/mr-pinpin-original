const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
async function main() {
  const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const output = '/tmp/pinpin-chapter-two-review'; fs.mkdirSync(output,{recursive:true});
  try {
    for (const width of [1440,390,320]) {
      const page = await browser.newPage({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600});
      const errors=[]; page.on('pageerror',error=>errors.push(error.message));
      const response=await page.goto(base+'review/chapter-02-landscapes.html'); assert.equal(response.status(),200);
      assert.equal(await page.locator('.shot').count(),5);
      await page.evaluate(async()=>{for(const image of document.images){image.loading='eager';await image.decode();}});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      for(const image of await page.locator('.shot img').all()) {
        const box=await image.boundingBox(); assert(Math.abs(box.width-width)<2);
        assert(Math.abs(box.width/box.height-1.5)<0.01);
      }
      assert(!(await page.locator('meta[name=viewport]').getAttribute('content')).includes('maximum-scale'));
      await page.screenshot({path:output+'/intro-'+width+'.png'});
      await page.locator('#shot-03 figure').scrollIntoViewIfNeeded();
      await page.screenshot({path:output+'/clearing-'+width+'.png'});
      if(width===1440) for(const link of await page.locator('a[href$=".md"]').all()) {
        const url = new URL(await link.getAttribute('href'),page.url());
        assert.equal((await page.request.get(url.href)).status(),200);
      }
      assert.deepEqual(errors,[]); await page.close();
      console.log(JSON.stringify({width,images:5,fullWidth:true,aspectRatioPreserved:true,noOverflow:true}));
    }
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
