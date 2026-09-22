const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const output = '/tmp/atlas-family-production-review';
const base = process.env.ATLAS_REVIEW_URL || 'http://127.0.0.1:8767/storyboard/review/atlas-family-production.html';
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), results = [];
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: width === 390 ? 3 : 1, reducedMotion: 'no-preference' });
      const result = { width, errors: [], rows: 0, samples: 0 };
      page.on('pageerror', error => result.errors.push(error.message));
      try {
        await page.goto(base);
        await page.waitForFunction(() => document.body.dataset.ready === 'true' && document.getElementById('walking-canvas').dataset.ready === 'true' && familyProductionReview.stats.cache.pending === 0);
        assert.equal(await page.locator('.heading-row').count(), 72);
        assert.equal(await page.locator('.character').count(), 3);
        assert.equal(await page.locator('.heading-row canvas').count(), 192);
        assert.equal(await page.locator('#stage-angle').textContent(), '90\u00b0');
        assert.equal(await page.locator('#animation-controls').evaluate(element => element.open), false);
        result.stageTop = await page.locator('#walking-canvas').evaluate(element => element.getBoundingClientRect().top);
        assert(result.stageTop < 220, 'artwork begins near the top on desktop and mobile');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        result.initial = await page.evaluate(() => familyProductionReview.stats);
        await page.screenshot({ path: `${output}/${width}-opening.png` });
        await page.clock.install();
        const frames = [new Set(), new Set(), new Set()], blinkTimes = [[], [], []];
        for (let i = 0; i < 150; i++) {
          await page.clock.runFor(50);
          const state = await page.evaluate(() => familyProductionReview.stats.stage);
          state.members.forEach((member, index) => {
            frames[index].add(member.frame);
            if (member.expression?.blink > .5 && member.capabilities?.blink) blinkTimes[index].push(Math.round(state.elapsed));
            assert.equal(member.capabilities?.yaw, false);
            if (member.blinkCoverage?.requireAllEyes && member.capabilities.blink) {
              assert.equal(member.blinkCoverage.accepted, member.blinkCoverage.authored);
              assert(member.blinkCoverage.accepted >= (member.blinkCoverage.expected || 0));
            }
          });
        }
        assert(frames.every(values => values.size === 4), 'all characters use all four gait frames');
        assert(blinkTimes.some(times => times.length), 'at least one genuinely registered blink renders');
        result.frames = frames.map(values => [...values]); result.blinkTimes = blinkTimes;
        await page.locator('#animation-controls > summary').click();
        await page.locator('#play').click();
        const paused = await page.evaluate(() => ({ elapsed: familyProductionReview.stats.elapsed, frame: familyProductionReview.stats.frame, members: familyProductionReview.stats.stage.members.map(m => m.frame) }));
        await page.clock.runFor(600);
        assert.deepEqual(await page.evaluate(() => ({ elapsed: familyProductionReview.stats.elapsed, frame: familyProductionReview.stats.frame, members: familyProductionReview.stats.stage.members.map(m => m.frame) })), paused);
        await page.locator('.frames label').nth(2).click();
        assert.equal(await page.evaluate(() => familyProductionReview.stats.frame), 2);
        assert((await page.evaluate(() => familyProductionReview.stats.stage.members)).every(member => member.frame === 2));
        await page.clock.resume();
        await page.locator('#face-diagnostics summary').click();
        await page.waitForFunction(() => document.getElementById('face-data').textContent.includes('blinkCoverage'));
        assert((await page.locator('#face-data').textContent()).includes('blinkCoverage'));
        await page.locator('#face-diagnostics summary').click();
        const selector = width === 1440 ? '.heading-row' : '.heading-row[data-angle="0"], .heading-row[data-angle="90"], .heading-row[data-angle="180"], .heading-row[data-angle="270"], .heading-row[data-angle="345"]';
        const rows = page.locator(selector);
        for (let i = 0; i < await rows.count(); i++) {
          const row = rows.nth(i);
          const previews = width === 1440 ? row.locator('canvas') : row.locator('canvas[data-cohort="production"][data-zoom="4"]');
          for (let j = 0; j < await previews.count(); j++) {
            const canvas = previews.nth(j); await canvas.scrollIntoViewIfNeeded();
            await page.waitForFunction(element => element.dataset.ready === 'true', await canvas.elementHandle());
            const pixels = await canvas.evaluate(canvas => {
              const copy = document.createElement('canvas'); copy.width = 80; copy.height = 80;
              const ctx = copy.getContext('2d'); ctx.drawImage(canvas, 0, 0, 80, 80);
              const data = ctx.getImageData(0, 0, 80, 80).data;
              let colorful = 0;
              for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 100 && Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 30) colorful++;
              return colorful;
            });
            assert(pixels > 12, 'sprite canvas contains colored artwork'); result.samples++;
          }
          result.rows++;
          if (['pinpin-90', 'mama-90', 'mr-pompom-90'].includes(await row.getAttribute('id'))) await page.screenshot({ path: `${output}/${width}-${await row.getAttribute('id')}.png` });
        }
        result.final = await page.evaluate(() => familyProductionReview.stats);
        assert(result.final.cache.entries <= 10); assert(result.final.cache.bytes <= 64 * 1024 * 1024);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(result.final.failed, []); assert.deepEqual(result.errors, []);
        result.passed = true;
      } finally { results.push(result); await page.close(); console.log(JSON.stringify({ width, passed: result.passed, rows: result.rows, samples: result.samples, blinkTimes: result.blinkTimes })); }
    }
  } finally { await browser.close(); fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2) + '\n'); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
