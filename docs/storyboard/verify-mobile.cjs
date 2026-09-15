const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
async function main() {
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
  try {
    for (const [width,height] of [[320,568],[390,844],[430,932],[844,390]]) {
      const page = await browser.newPage({ viewport:{width,height}, isMobile:true, hasTouch:true });
      await page.goto(base + '?chapter=1&lang=en');
      await page.waitForSelector('.scene');
      await page.evaluate(() => prepareChapterPrint());
      assert(await page.locator('.scene-art img').evaluateAll(images => images.every(image => {
        const r = image.getBoundingClientRect();
        return Math.abs(r.width - innerWidth) < 1 && Math.abs(r.height / r.width - image.naturalHeight / image.naturalWidth) < .001;
      })), 'Pictures must be full-width, uncropped, and undistorted');
      assert.equal(await page.locator('.toolbar').isVisible(), false);
      assert.equal(await page.locator('#controls-toggle').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('reader')).scrollSnapType), 'none');
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).touchAction), 'auto');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      const client = await page.context().newCDPSession(page);
      await client.send('Input.synthesizeScrollGesture', { x:width/2, y:height/2, yDistance:-250, gestureSourceType:'touch' });
      assert(await page.evaluate(() => scrollY > 100), 'Native finger scroll failed');
      await page.evaluate(() => scrollTo(0,0));
      await client.send('Input.synthesizePinchGesture', { x:width/2, y:Math.min(height/3,180), scaleFactor:2, relativeSpeed:800, gestureSourceType:'touch' });
      assert(await page.evaluate(() => visualViewport.scale > 1.5), 'Native pinch zoom failed');
      const before = await page.evaluate(() => visualViewport.pageLeft);
      const touch = await page.evaluate(() => ({x:visualViewport.width/2,y:visualViewport.height/3}));
      await client.send('Input.synthesizeScrollGesture', { ...touch, xDistance:-40, gestureSourceType:'touch' });
      assert(await page.evaluate(old => visualViewport.pageLeft !== old, before), 'Zoomed image cannot be panned');
      await page.screenshot({ path:'/tmp/pinpin-native-zoom-' + width + '.png' });
      await page.close();
      console.log(JSON.stringify({width,height,fullWidth:true,nativeScroll:true,pinchAndPan:true}));
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
