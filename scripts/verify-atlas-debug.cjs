const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = (process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/').replace(/\/?$/, '/');
const fixture = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${base}atlas-debug.css"><title>Atlas debug fixture</title>
<body style="margin:0;background:#eef4f0;font-family:system-ui">
<main id="map-viewport"><canvas id="world-canvas" tabindex="0" aria-label="Map" width="480" height="260"></canvas><p id="map-label">Map</p></main>
<button id="button">Action</button><a id="link" href="#">Link</a>
<input id="typing" aria-label="Text"><textarea id="textarea" aria-label="Notes"></textarea>
<div id="editable" contenteditable="true">Editable</div><div id="custom" role="button" tabindex="0">Custom control</div>
<input id="other-range" type="range" aria-label="Other range">
<div id="atlas-languages" hidden><button id="language">English</button></div>
<dialog id="story-preview"><button id="dialog-first">First</button><button id="dialog-next">Next</button></dialog>
<script type="module">
import { createAtlasDebug } from '${base}atlas-debug.js';
window.calls = [];
window.strength = 1;
window.makePanel = () => createAtlasDebug({getStrength: () => window.strength,
  onStrengthChange: value => { window.strength = value; window.calls.push(value); }});
window.debugPanel = window.makePanel();
const after = document.createElement('button'); after.id = 'after'; after.textContent = 'After panel'; document.body.append(after);
window.ready = true;
</script></body></html>`;

async function setup(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/__atlas-debug-fixture__.html', route => route.fulfill({ contentType: 'text/html', body: fixture }));
  await page.goto(base + '__atlas-debug-fixture__.html');
  await page.waitForFunction(() => window.ready);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  return { context, page, errors };
}

async function mapTab(page) {
  await page.locator('#world-canvas').focus();
  await page.keyboard.press('Tab');
}
async function visible(page, value) {
  assert.equal(await page.locator('.atlas-debug').isVisible(), value);
}
async function sendInput(page, value, change = false) {
  await page.locator('.atlas-debug input').evaluate((range, { value, change }) => {
    range.value = String(value);
    range.dispatchEvent(new Event(change ? 'change' : 'input', { bubbles: true }));
  }, { value, change });
}
async function calls(page, expected) { assert.deepEqual(await page.evaluate(() => window.calls), expected); }

async function keyboard(browser) {
  const { context, page, errors } = await setup(browser);
  try {
    await visible(page, false);
    assert(await page.getByRole('slider', { name: 'Bokeh strength', includeHidden: true }).isDisabled());
    await mapTab(page);
    await visible(page, true);
    assert.equal(await page.locator('.atlas-debug-status').textContent(), 'Waiting for WebGPU');
    await page.evaluate(() => debugPanel.setAvailable(false));
    assert.equal(await page.locator('.atlas-debug-status').textContent(), 'WebGPU unavailable');
    await page.keyboard.press('Escape');
    await visible(page, false);
    assert(await page.locator('#world-canvas').evaluate(el => el === document.activeElement));
    await page.evaluate(() => debugPanel.setAvailable(true));
    await mapTab(page);
    const range = page.getByRole('slider', { name: 'Bokeh strength' });
    assert(await range.isEnabled());
    assert.equal(await range.inputValue(), '1');
    assert.equal(await page.locator('.atlas-debug output').textContent(), '100%');
    assert(await range.evaluate(el => el === document.activeElement));
    await page.keyboard.press('ArrowRight');
    assert.equal(await range.inputValue(), '1.01');
    assert.equal(await range.getAttribute('aria-valuetext'), '101%');
    await page.keyboard.press('Home');
    assert.equal(await range.inputValue(), '0');
    await page.keyboard.press('End');
    assert.equal(await range.inputValue(), '4');
    await page.keyboard.press('Tab');
    await visible(page, true);
    assert(await page.locator('#after').evaluate(el => el === document.activeElement), 'Tab exits panel');
    await page.keyboard.press('Shift+Tab');
    assert(await range.evaluate(el => el === document.activeElement), 'Shift+Tab enters panel normally');
    await page.keyboard.press('Shift+Tab');
    assert(await page.locator('#other-range').evaluate(el => el === document.activeElement), 'Shift+Tab exits panel backwards');
    await mapTab(page);
    await visible(page, false);
    for (const selector of ['#button', '#link', '#typing', '#textarea', '#editable', '#custom', '#other-range']) {
      await page.locator(selector).focus();
      await page.keyboard.press('Tab');
      await visible(page, false);
    }
    for (const key of ['Shift+Tab', 'Control+Tab', 'Alt+Tab', 'Meta+Tab']) {
      await page.locator('#world-canvas').focus();
      await page.keyboard.press(key);
      await visible(page, false);
    }
    await page.evaluate(() => document.getElementById('atlas-languages').hidden = false);
    await mapTab(page);
    await visible(page, false);
    await page.locator('#language').focus();
    await page.keyboard.press('Tab');
    await visible(page, false);
    await page.evaluate(() => { document.getElementById('atlas-languages').hidden = true; document.getElementById('story-preview').showModal(); });
    await page.locator('#dialog-first').focus();
    await page.keyboard.press('Tab');
    assert(await page.locator('#dialog-next').evaluate(el => el === document.activeElement));
    await visible(page, false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').evaluate(el => el.open), false);
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('Tab');
    await visible(page, true);
    await page.keyboard.press('Escape');
    await visible(page, false);
    await page.locator('#world-canvas').evaluate(el => {
      el.addEventListener('keydown', event => event.preventDefault(), { once: true });
      el.focus();
    });
    await page.keyboard.press('Tab');
    await visible(page, false);
    await mapTab(page);
    await page.screenshot({ path: '/tmp/pinpin-debug-desktop.png' });
    const bounds = await page.locator('.atlas-debug').boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 1280 && bounds.y >= 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}

async function updates(browser) {
  const { context, page, errors } = await setup(browser);
  try {
    await page.evaluate(() => debugPanel.setAvailable(true));
    await mapTab(page);
    await sendInput(page, 1.5);
    assert.equal(await page.locator('.atlas-debug output').textContent(), '150%');
    await calls(page, []);
    await page.clock.runFor(80);
    await sendInput(page, 2.75);
    await page.clock.runFor(119);
    await calls(page, []);
    await page.clock.runFor(1);
    await calls(page, [2.75]);
    await sendInput(page, 2.75, true);
    await calls(page, [2.75]);
    await sendInput(page, 3);
    await sendInput(page, 3, true);
    await calls(page, [2.75, 3]);
    await page.clock.runFor(200);
    await calls(page, [2.75, 3]);
    await sendInput(page, 0.5);
    await page.keyboard.press('Escape');
    await calls(page, [2.75, 3, 0.5]);
    await mapTab(page);
    await sendInput(page, 2);
    await page.evaluate(() => debugPanel.setAvailable(false));
    await page.clock.runFor(200);
    await calls(page, [2.75, 3, 0.5]);
    assert(await page.locator('.atlas-debug input').isDisabled());
    assert.equal(await page.locator('.atlas-debug input').inputValue(), '0.5', 'Unavailable panel discards pending value');
    assert(await page.locator('.atlas-debug-status').isVisible());
    await page.evaluate(() => debugPanel.setAvailable(true));
    await sendInput(page, 3.5);
    await page.setViewportSize({ width: 767, height: 800 });
    await page.clock.runFor(200);
    await visible(page, false);
    await calls(page, [2.75, 3, 0.5]);
    await page.setViewportSize({ width: 768, height: 800 });
    await page.clock.runFor(40);
    await visible(page, false);
    await mapTab(page);
    assert(await page.locator('.atlas-debug input').isEnabled());
    assert.equal(await page.locator('.atlas-debug input').inputValue(), '0.5', 'Reopen reads parent committed value');
    await page.screenshot({ path: '/tmp/pinpin-debug-768.png' });
    assert(await page.locator('.atlas-debug').evaluate(el => el.scrollWidth <= el.clientWidth));
    await sendInput(page, 4);
    await page.evaluate(() => { debugPanel.destroy(); debugPanel.destroy(); debugPanel.setAvailable(true); });
    await page.clock.runFor(200);
    await calls(page, [2.75, 3, 0.5]);
    assert.equal(await page.locator('.atlas-debug').count(), 0);
    await mapTab(page);
    assert.equal(await page.locator('.atlas-debug').count(), 0);
    await page.evaluate(() => { window.strength = 2.25; window.debugPanel = makePanel(); debugPanel.setAvailable(true); });
    await mapTab(page);
    assert.equal(await page.locator('.atlas-debug input').inputValue(), '2.25');
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.strength = NaN);
    await mapTab(page);
    assert.equal(await page.locator('.atlas-debug input').inputValue(), '1');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}

async function touch(browser, width) {
  const { context, page, errors } = await setup(browser, { viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
  try {
    await page.evaluate(() => debugPanel.setAvailable(true));
    await mapTab(page);
    await visible(page, false);
    assert(await page.locator('.atlas-debug input').isDisabled());
    await sendInput(page, 4);
    await page.clock.runFor(200);
    await calls(page, []);
    await page.screenshot({ path: `/tmp/pinpin-debug-touch-${width}.png` });
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.CHROME_CHANNEL || 'chrome' });
  try {
    for (const [name, run] of [['keyboard and availability', keyboard], ['debounce, lifecycle and responsive boundary', updates],
      ['touch phone', browser => touch(browser, 390)], ['touch tablet', browser => touch(browser, 1024)]]) {
      await run(browser);
      console.log(`PASS ${name}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
