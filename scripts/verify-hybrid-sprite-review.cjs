#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const { embeddedJSON, readStudy, build } = require('./build-hybrid-sprite-review.cjs');
const hash = buffer => createHash('sha256').update(buffer).digest('hex');

async function main() {
  if (!process.argv[2]) throw new Error('Usage: node scripts/verify-hybrid-sprite-review.cjs EXTERNAL_REVIEW_DIRECTORY');
  const out = path.resolve(process.argv[2]);
  assert(!embeddedJSON({ value: '</script>\u2028' }).includes('<'));
  assert.throws(() => build({}), /Missing/);
  assert.throws(() => readStudy(path.join(out, '..', 'control-4-angle105-v01'), 8), /exactly 8/);
  let playwright;
  try { playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
  catch { playwright = require('/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright'); }
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [375, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('requestfailed', r => errors.push(r.url()));
      await page.goto(pathToFileURL(path.join(out, 'index.html')).href);
      await page.waitForFunction(() => [...document.querySelectorAll('.preview')].every(el => el.dataset.frame !== undefined));
      const samples = await page.evaluate(async () => {
        const samples = [];
        for (let i = 0; i < 24; i++) {
          samples.push([...document.querySelectorAll('.preview')].map(el => Number(el.dataset.frame)));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        return samples;
      });
      assert.equal(new Set(samples.map(s => s[0])).size, 4);
      assert.equal(new Set(samples.map(s => s[1])).size, 8);
      assert(samples.every(([four, eight]) => four === Math.floor(eight / 2)), 'Shared cycle phase');
      const preview = page.locator('.preview').first();
      const first = hash(await preview.screenshot());
      await page.waitForTimeout(280);
      assert.notEqual(hash(await preview.screenshot()), first, 'Control pixels must change');
      await page.screenshot({ path: path.join(out, `desktop-mobile-${width}.png`) });
      await page.locator('#animate').uncheck();
      const paused = await page.locator('.preview').first().getAttribute('data-frame');
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.preview').first().getAttribute('data-frame'), paused);
      await page.locator('#animate').check();
      const candidate = page.locator('[data-loop]').nth(2);
      if (await candidate.count()) {
        await candidate.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelectorAll('[data-loop]')[2].dataset.frame !== undefined);
        const before = hash(await candidate.screenshot());
        await page.waitForTimeout(280);
        assert.notEqual(hash(await candidate.screenshot()), before, 'Candidate crop pixels must change');
        assert.equal(await page.locator('.crop.small').evaluate(el => el.getBoundingClientRect().width), 56);
        await page.screenshot({ path: path.join(out, `candidate-${width}.png`) });
      }
      await page.evaluate(async () => {
        for (const img of document.images) { img.loading = 'eager'; await img.decode(); }
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(150);
      const stopped = await page.evaluate(() => ({ frames: states.map(s => s.frame), raf }));
      await page.waitForTimeout(300);
      assert.deepEqual(await page.evaluate(() => ({ frames: states.map(s => s.frame), raf })), stopped);
      assert.equal(stopped.raf, 0, 'Offscreen animation loop stopped');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
      assert(await page.evaluate(() => [...document.images].every(img => img.complete && img.naturalWidth > 0)), 'All images decode');
      await page.screenshot({ path: path.join(out, `full-${width}.png`), fullPage: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => !document.getElementById('animate').checked);
      await page.evaluate(() => window.scrollTo(0, 0));
      assert.equal(await page.locator('#animate').isChecked(), false);
      assert.equal(await page.locator('#error').innerText(), '');
      assert.deepEqual(errors, []);
      results.push({ width, status: 'PASS', observedFrames: [4, 8], synchronized: true,
        changedPixels: true, pause: true, offscreenStopped: true, reducedMotion: true, overflow: false, errors });
      await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
