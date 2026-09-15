const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
  const output = process.env.EXPORT_DIR || path.join(os.tmpdir(), 'pinpin-chapter-one-margin-preview');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const lang of ['en', 'es', 'ru']) {
        await page.goto(base + '?chapter=1&lang=' + lang + '&view=print');
        await page.waitForSelector('.page-frame');
        await page.evaluate(() => window.prepareChapterPrint());
        await page.waitForTimeout(100);
        assert.equal(await page.locator('#preview').getAttribute('aria-pressed'), 'true');
        assert(await page.evaluate(() => {
          const rail = document.querySelector('.toolbar').getBoundingClientRect();
          return document.documentElement.scrollWidth <= innerWidth &&
            [...document.querySelectorAll('.page-slot')].every(slot => {
              const box = slot.getBoundingClientRect();
              const frame = slot.firstElementChild.getBoundingClientRect();
              const spread = slot.querySelector('.spread').getBoundingClientRect();
              const ratio = slot.dataset.paper === 'landscape' ? 297 / 210 : 210 / 297;
              return box.right <= rail.left && Math.abs(box.width / box.height - ratio) < 0.01 &&
                Math.abs(box.width - frame.width) < 1 && Math.abs(box.height - frame.height) < 1 &&
                spread.bottom <= frame.bottom && [...slot.querySelectorAll('.scene')].every(scene => {
                  const image = scene.querySelector('img').getBoundingClientRect();
                  const prose = scene.querySelector('.prose')?.getBoundingClientRect();
                  return image.height > 20 && (!prose || prose.top >= image.bottom - 1);
                });
            });
        }), 'Paper frames overlap, overflow, or lose their physical proportions');
        // Compare unscaled typesetting geometry, not the screen-size page transform.
        const geometry = () => [...document.querySelectorAll('.spread,.scene,img,.prose')].map(node =>
          [node.offsetWidth, node.offsetHeight]);
        const previewGeometry = await page.evaluate(geometry);
        await page.emulateMedia({ media: 'print' });
        assert.deepEqual(await page.evaluate(geometry), previewGeometry, 'Preview differs from print typesetting');
        await page.emulateMedia({ media: 'screen' });
        if (lang === 'en') {
          await page.screenshot({ path: path.join(output, 'paper-preview-' + width + '.png') });
          await page.locator('#spread-10').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, 'paper-ending-' + width + '.png') });
        }
      }
      if (width === 1440) {
        const pdf = path.join(output, 'preview-check-ru.pdf');
        await page.emulateMedia({ media: 'print' });
        await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
        await page.emulateMedia({ media: 'screen' });
        const baseline = path.join(output, 'Mr-PinPin-Chapter-1-ru.pdf');
        const content = file => execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
        assert.equal(content(pdf), content(baseline), 'Printing from preview changes text or pagination');
        const images = file => execFileSync('pdfimages', ['-list', file], { encoding: 'utf8' })
          .split('\n').filter(line => /^\s*\d+\s+\d+\s+image\s/.test(line))
          .map(line => line.trim().split(/\s+/).slice(0, 5));
        assert.deepEqual(images(pdf), images(baseline));
        fs.unlinkSync(pdf);
      }
      await page.locator('[data-lang="en"]').click();
      assert.equal(new URL(page.url()).searchParams.get('view'), 'print');
      await page.locator('#preview').click();
      assert.equal(new URL(page.url()).searchParams.has('view'), false);
      assert.equal(await page.locator('#preview').getAttribute('aria-pressed'), 'false');
      await page.goBack();
      await page.waitForFunction(() => document.documentElement.classList.contains('print-preview'));
      assert.equal(new URL(page.url()).searchParams.get('lang'), 'en');
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, previewLanguages: 3, physicalLayoutMatchesPrint: true, passed: true }));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
