const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = (process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/').replace(/\/?$/, '/');
const storageKey = 'pinpin.atlas.v1';
const dwell = 850;

async function instrument(context) {
  await context.addInitScript(key => {
    localStorage.setItem('pinpin.atlas.motion.v1', 'paused');
    const probe = window.languageMenuProbe = { writes: 0, events: 0, closes: 0, pointers: [] };
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      if (this === localStorage && name === key) probe.writes++;
      return setItem.call(this, name, value);
    };
    addEventListener('storage', event => {
      if (event.key === key || event.key === null) probe.events++;
    });
    document.addEventListener('pointerdown', event => {
      if (event.target.closest('#atlas-language-toggle, #atlas-languages')) probe.pointers.push(event.pointerType);
    }, true);
    document.addEventListener('DOMContentLoaded', () => {
      const popup = document.getElementById('atlas-languages');
      // oldValue catches a close even if another handler immediately reopens the menu.
      new MutationObserver(records => {
        for (const record of records) if (record.oldValue === null) probe.closes++;
      }).observe(popup, { attributes: true, attributeFilter: ['hidden'], attributeOldValue: true });
    });
  }, storageKey);
}

async function ready(page, file) {
  await page.waitForFunction(gpu => gpu
    ? window.atlasGpuDebug?.renderer && atlasGpuDebug.renderer.stats.draws >= 1
    : window.atlasDebug?.map, file === 'atlas-webgpu.html');
  await page.waitForFunction(() => document.querySelector('#map-regions [data-place="lake"]')?.dataset.state === 'available');
  await page.locator('#atlas-language-toggle').waitFor({ state: 'visible' });
}

async function snapshot(page) {
  return page.evaluate(() => ({ ...languageMenuProbe, pointers: [...languageMenuProbe.pointers] }));
}

async function menu(page, open, label) {
  assert.equal(await page.locator('#atlas-languages').evaluate(el => !el.hidden), open, `${label}: popup hidden state`);
  assert.equal(await page.locator('#atlas-languages').isVisible(), open, `${label}: popup visibility`);
  assert.equal(await page.locator('#atlas-language-toggle').getAttribute('aria-expanded'), String(open), `${label}: aria-expanded`);
}

async function activate(page, selector, mobile) {
  const target = page.locator(selector);
  if (mobile) await target.tap();
  else await target.click();
}

async function open(page, mobile) {
  await menu(page, false, 'Before opening');
  await activate(page, '#atlas-language-toggle', mobile);
  await menu(page, true, 'After opening');
}

async function quiet(pages, watched, label) {
  const before = await Promise.all(pages.map(snapshot));
  await pages[0].waitForTimeout(dwell);
  const after = await Promise.all(pages.map(snapshot));
  for (let i = 0; i < pages.length; i++) {
    assert.equal(after[i].writes, before[i].writes, `${label}: tab ${i} must not write during idle`);
    assert.equal(after[i].events, before[i].events, `${label}: tab ${i} has no storage feedback`);
    if (watched.includes(i)) {
      assert.equal(after[i].closes, before[i].closes, `${label}: tab ${i} never flickers closed`);
      await menu(pages[i], true, label);
    }
  }
}

async function language(page, lang) {
  assert.equal(await page.locator('html').getAttribute('lang'), lang);
  assert.equal(new URL(page.url()).searchParams.get('lang'), lang);
  assert.deepEqual(await page.locator('#atlas-languages [aria-pressed="true"]').evaluateAll(nodes => nodes.map(el => el.dataset.lang)), [lang]);
}

async function choose(pages, index, lang, mobile) {
  const page = pages[index], peer = pages[1 - index];
  const peerLang = new URL(peer.url()).searchParams.get('lang');
  const stored = await page.evaluate(key => localStorage.getItem(key), storageKey);
  const before = await Promise.all(pages.map(snapshot));
  await activate(page, `#atlas-languages [data-lang="${lang}"]`, mobile);
  await menu(page, false, 'Selection closes');
  await language(page, lang);
  const saved = await page.evaluate(key => localStorage.getItem(key), storageKey);
  assert.equal(JSON.parse(saved).lang, lang, 'Explicit selection persists language');
  if (saved !== stored) await peer.waitForFunction(count => languageMenuProbe.events > count, before[1 - index].events);
  const after = await Promise.all(pages.map(snapshot));
  assert.equal(after[index].writes - before[index].writes, 1, 'Selection makes one explicit save');
  assert.equal(after[1 - index].writes - before[1 - index].writes, 0, 'Peer refresh never saves');
  assert.equal(after[1 - index].events - before[1 - index].events, Number(saved !== stored), 'One event per changed value');
  assert.equal(after[index].events - before[index].events, 0, 'No feedback event to selecting tab');
  assert.equal(after[1 - index].closes, before[1 - index].closes, 'Peer menu survives language storage event');
  await language(peer, peerLang);
  await open(page, mobile);
  await quiet(pages, [0, 1], `Reopen after ${lang}`);
}

async function progress(pages, writer, opened) {
  const before = await Promise.all(pages.map(snapshot));
  const receiver = 1 - writer;
  await pages[writer].evaluate(({ key, opened }) => {
    const state = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify({ ...state, opened }));
  }, { key: storageKey, opened });
  await pages[receiver].waitForFunction(({ count, place }) => languageMenuProbe.events > count &&
    document.querySelector(`#map-regions [data-place="${place}"]`)?.dataset.state === 'opened',
  { count: before[receiver].events, place: opened.at(-1) });
  const after = await Promise.all(pages.map(snapshot));
  assert.equal(after[writer].writes - before[writer].writes, 1, 'One simulated reader progress write');
  assert.equal(after[receiver].writes - before[receiver].writes, 0, 'Progress refresh never writes back');
  assert.equal(after[receiver].events - before[receiver].events, 1, 'Progress delivers exactly one event');
  assert.equal(after[receiver].closes, before[receiver].closes, 'Same-language progress refresh never closes popup');
  await quiet(pages, [0, 1], 'Other-tab progress');
}

async function dismissals(page, mobile) {
  await activate(page, '#atlas-language-toggle', mobile);
  await menu(page, false, 'Toggle closes');
  await open(page, mobile);
  await page.keyboard.press('Escape');
  await menu(page, false, 'Escape closes');
  assert(await page.locator('#atlas-language-toggle').evaluate(el => document.activeElement === el), 'Escape restores focus');
  await open(page, mobile);
  await activate(page, '#atlas-title', mobile);
  await menu(page, false, 'Outside pointer closes');
  await open(page, mobile);
}

async function scenario(browser, file, width) {
  const mobile = width < 600;
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, isMobile: mobile, hasTouch: mobile });
  const errors = [];
  try {
    await instrument(context);
    const pages = [await context.newPage(), await context.newPage()];
    for (const page of pages) {
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push(error.message));
    }
    for (let i = 0; i < pages.length; i++) {
      await pages[i].goto(base + file + '?lang=' + ['en', 'es'][i]);
      await ready(pages[i], file);
      await language(pages[i], ['en', 'es'][i]);
      await open(pages[i], mobile);
    }
    await quiet(pages, [0, 1], 'Fresh two-tab startup');
    for (const page of pages) {
      const initial = await snapshot(page);
      assert.equal(initial.writes, 0, 'Initial renders do not save');
      assert.equal(initial.events, 0, 'Fresh context has no unsolicited storage events');
    }
    // Each round finishes at EN/ES again, preserving the original conflicting URL setup.
    for (let round = 0; round < 2; round++) {
      for (const lang of ['es', 'ru', 'en']) await choose(pages, 0, lang, mobile);
      for (const lang of ['ru', 'en', 'es']) await choose(pages, 1, lang, mobile);
    }
    await progress(pages, 1, ['lake']);
    await progress(pages, 0, ['lake', 'home']);
    for (const page of pages) await dismissals(page, mobile);
    await quiet(pages, [0, 1], 'Reopen after dismissals');
    const probes = await Promise.all(pages.map(snapshot));
    for (const probe of probes) {
      assert(probe.pointers.length > 0);
      assert(probe.pointers.every(type => type === (mobile ? 'touch' : 'mouse')), 'Trusted expected pointer input');
    }
    assert.deepEqual(errors, [], 'No browser runtime errors');
    return { file, width, input: mobile ? 'native touch (emulated phone)' : 'mouse', selections: 12,
      progressRefreshes: 2, dwellMs: dwell, dismissals: ['toggle', 'Escape', 'outside', 'selection'],
      writes: probes.map(p => p.writes), storageEvents: probes.map(p => p.events), status: 'PASS' };
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let failed = false;
  try {
    const files = process.env.ATLAS_LANGUAGE_PAGE ? [process.env.ATLAS_LANGUAGE_PAGE] : ['atlas-webgpu.html', 'atlas.html'];
    const widths = process.env.ATLAS_LANGUAGE_WIDTH ? [Number(process.env.ATLAS_LANGUAGE_WIDTH)] : [1440, 390];
    for (const file of files) for (const width of widths) {
      try { console.log(JSON.stringify(await scenario(browser, file, width))); }
      catch (error) {
        failed = true;
        console.error(JSON.stringify({ file, width, status: 'FAIL', error: error.stack }));
      }
    }
  } finally {
    await browser.close();
  }
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
