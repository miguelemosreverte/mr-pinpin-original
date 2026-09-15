const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
const output = process.env.EXPORT_DIR || '/tmp/pinpin-chapter-two';
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name + '.json')));
const compact = text => text.replace(/\s/gu, '');
const groups = [[0],[1,2],[3,4],[5],[6,7],[8],[9,10],[11,12],[13],[14],[15]];
const landscapePages = [4,6,9,10,11];
const imagePages = [1,2,2,3,3,4,5,5,6,7,7,8,8,9,10,11];

async function loaded(page, chapter) {
  await page.waitForSelector('#reader[aria-busy=false] article[data-chapter="chapter-0' + chapter + '"]');
  assert.equal(new URL(page.url()).searchParams.get('chapter'), String(chapter));
}

async function control(page, selector) {
  if (await page.locator('#controls-toggle').isVisible() &&
      await page.locator('#controls-toggle').getAttribute('aria-expanded') === 'false') {
    await page.locator('#controls-toggle').click();
  }
  await page.locator(selector).click();
}

async function layout(page) {
  const problems = await page.locator('.spread').evaluateAll(sheets => {
    const issues = [];
    for (const sheet of sheets) {
      const bounds = sheet.getBoundingClientRect();
      const folio = sheet.querySelector('.folio').getBoundingClientRect();
      let bottom = bounds.top;
      for (const scene of sheet.querySelectorAll('.scene')) {
        const rect = scene.getBoundingClientRect();
        const image = scene.querySelector('img').getBoundingClientRect();
        const prose = scene.querySelector('.prose')?.getBoundingClientRect();
        if (rect.top < bottom - 1 || rect.bottom > folio.top + 1) issues.push(scene.id + ': scene collision');
        if (image.width < 20 || image.height < 20) issues.push(scene.id + ': art collapsed');
        if (image.top < rect.top - 1 || image.bottom > rect.bottom + 1) issues.push(scene.id + ': image outside scene');
        if (prose && (prose.top < image.bottom - 1 || prose.bottom > rect.bottom + 1)) issues.push(scene.id + ': prose outside scene');
        for (const node of scene.querySelectorAll('img,.prose,h1,.prose > p')) {
          const box = node.getBoundingClientRect();
          if (box.left < bounds.left - 1 || box.right > bounds.right + 1 || box.bottom > bounds.bottom + 1) {
            issues.push(scene.id + ': content outside page');
          }
        }
        bottom = rect.bottom;
      }
      if (folio.bottom > bounds.bottom + 1) issues.push(sheet.id + ': folio outside page');
    }
    return issues;
  });
  assert.deepEqual(problems, [], 'Page composition overflow');
}

async function verifyPdf(page, lang, assets, scenes) {
  const painted = await page.locator('.spread').evaluateAll(sheets => sheets.map(sheet => {
    const bounds = sheet.getBoundingClientRect();
    let area = 0, top = Infinity;
    for (const image of sheet.querySelectorAll('img')) {
      const box = image.getBoundingClientRect();
      const ratio = image.naturalWidth / image.naturalHeight;
      const width = Math.min(box.width, box.height * ratio), height = width / ratio;
      area += width * height;
      top = Math.min(top, box.top + (box.height - height) / 2 - bounds.top);
    }
    return {percent:Math.round(100 * area / (bounds.width * bounds.height)), top};
  }));
  painted.forEach((art, i) => assert(art.percent >= 45, 'Low painted-image usage on page ' + (i + 1)));
  assert(painted[0].top < 1, 'Opening artwork must start at the top of the page');
  const pdf = path.join(output, 'Mr-PinPin-Chapter-2-' + lang + '.pdf');
  await page.pdf({path:pdf, preferCSSPageSize:true, printBackground:true, displayHeaderFooter:false});
  const info = execFileSync('pdfinfo', ['-f','1','-l','11',pdf], {encoding:'utf8'});
  assert.match(info, /Pages:\s+11\b/, 'Expected eleven pages with no blank overflow pages');
  const sizes = [...info.matchAll(/Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+)/g)];
  assert.equal(sizes.length, 11);
  sizes.forEach((size, i) => assert.equal(Number(size[2]) > Number(size[3]), landscapePages.includes(i + 1)));
  const rows = execFileSync('pdfimages', ['-list',pdf], {encoding:'utf8'})
    .split('\n').filter(line => /^\s*\d+\s+\d+\s+image\s/.test(line));
  assert.equal(rows.length, 16, 'All sixteen illustrations must be embedded');
  rows.forEach((row, i) => {
    const fields = row.trim().split(/\s+/);
    assert.equal(Number(fields[0]), imagePages[i], 'Illustration on wrong PDF page');
    assert.deepEqual(fields.slice(3,5).map(Number), [assets[i].width, assets[i].height], 'Original image resolution lost');
  });
  const text = execFileSync('pdftotext', ['-layout',pdf,'-'], {encoding:'utf8'});
  const pages = text.split('\f');
  if (!pages.at(-1).trim()) pages.pop();
  assert.equal(pages.length, 11);
  pages.forEach((content, i) => assert(content.includes(String(i + 1).padStart(2,'0')), 'Missing folio'));
  scenes.forEach((scene, i) => scene.paragraphs.forEach(paragraph =>
    assert(compact(pages[imagePages[i] - 1]).includes(compact(paragraph)), 'Text missing from image page: scene ' + (i + 1))));
  assert(!text.includes('Print / Save PDF'), 'Controls leaked into PDF');
  console.log(JSON.stringify({pdf, pages:11, originalResolutionImages:16, matchingText:true,
    paintedAreaPercent:painted.map(art => art.percent)}));
}

async function verifyNativeGestures(browser) {
  for (const lang of ['en','es','ru']) {
    const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await page.goto(base + '?chapter=2&lang=' + lang);
    await loaded(page, 2);
    await page.evaluate(() => window.prepareChapterPrint());
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.synthesizeScrollGesture',{x:195,y:600,yDistance:-300,gestureSourceType:'touch'});
    await page.waitForTimeout(150);
    const scroll = await page.evaluate(() => scrollY);
    assert(scroll > 100, 'Native touch scrolling failed');
    await page.evaluate(() => scrollTo(0,0));
    await cdp.send('Input.synthesizePinchGesture',{x:195,y:200,scaleFactor:2,relativeSpeed:400,gestureSourceType:'touch'});
    await page.waitForTimeout(150);
    const zoom = await page.evaluate(() => ({scale:visualViewport.scale,left:visualViewport.offsetLeft}));
    assert(zoom.scale > 1.5, 'Native pinch zoom failed');
    await cdp.send('Input.synthesizeScrollGesture',{x:100,y:150,xDistance:-45,yDistance:0,gestureSourceType:'touch'});
    await page.waitForTimeout(150);
    const pan = await page.evaluate(() => visualViewport.offsetLeft);
    assert(Math.abs(pan - zoom.left) > 10, 'Zoomed horizontal pan failed');
    assert.equal(new URL(page.url()).searchParams.get('chapter'),'2');
    assert.equal(await page.locator('.scene').count(),16);
    await page.screenshot({path:path.join(output,'native-zoom-' + lang + '.png')});
    console.log(JSON.stringify({lang,nativeScroll:scroll,pinchScale:zoom.scale,panDistance:pan - zoom.left}));
    await page.close();
  }
}

async function main() {
  fs.mkdirSync(output, {recursive:true});
  const art = read('illustrations'), translations = read('translations');
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'book.json'))).digest('hex'),
    read('production/chapter-01-copy-edit').originalBookSha256, 'Original book.json changed');
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'chapter-editions.js'),'utf8'), context);
  const config = context.window.chapterEditions;
  assert.deepEqual(JSON.parse(JSON.stringify(config.editions['2'].spreads.map(s => s.scenes))), groups);
  assert(!config.editions['2'].spreads.some(s => s.style === 'walk'));
  assert.deepEqual(config.editions['2'].spreads.map(s => s.paper).join(','),
    groups.map((_, i) => landscapePages.includes(i + 1) ? 'landscape' : 'portrait').join(','));
  const available = await config.available(art, translations);
  const ready = available.has('2');
  if (art.chapters['chapter-02']?.length === 16 && translations['chapter-02']) {
    // Publication is metadata-only; asset existence and decoding belong to this verifier.
    assert((await config.available(art, translations)).has('2'), 'Finished data rejected by publication gate');
    const incomplete = structuredClone(translations);
    delete incomplete['chapter-02'].es;
    assert(!(await config.available(art, incomplete)).has('2'), 'Incomplete translations must keep chapter unpublished');
    for (const scene of [14,15]) {
      const nonsilent = structuredClone(art);
      nonsilent.scenes['chapter-02'][scene].paragraphs = ['Unexpected closing narration'];
      assert(!(await config.available(nonsilent, translations)).has('2'), 'Both closing scenes must remain silent');
    }
  }
  if (ready) for (const asset of art.chapters['chapter-02']) {
    assert(fs.existsSync(path.join(__dirname,asset.src)), 'Missing publication asset: ' + asset.src);
  }
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    // Exercise unpublished behavior even after chapter two has been published.
    const fallback = await browser.newPage();
    await fallback.route('**/illustrations.json', async route => {
      const incomplete = structuredClone(art);
      delete incomplete.chapters['chapter-02'];
      await route.fulfill({json:incomplete});
    });
    for (const lang of ['en','es','ru']) {
      await fallback.goto(base + '?chapter=2&lang=' + lang + '&view=print');
      await loaded(fallback, 1);
      assert.equal(await fallback.locator('html').getAttribute('lang'), lang);
      assert.equal(await fallback.locator('.spread').count(), 10);
      await control(fallback, '#preview');
      await loaded(fallback, 1);
      await fallback.goBack();
      await loaded(fallback, 1);
      assert.equal(new URL(fallback.url()).searchParams.get('view'), 'print');
    }
    await fallback.goto(base + 'library.html?lang=en');
    await fallback.waitForSelector('.chapter-cover[data-chapter="2"]');
    assert.equal(await fallback.locator('.chapter-cover[data-chapter="2"].published').count(), 0);
    await fallback.close();

    const routes = await browser.newPage();
    for (const chapter of ['', '0', '3', '38', '-1', '02', '2.0', 'garbage', 'toString']) {
      await routes.goto(base + '?chapter=' + chapter + '&lang=invalid');
      await loaded(routes, 1);
      assert.equal(await routes.locator('html').getAttribute('lang'), 'ru');
    }
    await routes.close();
    if (!ready) {
      console.log(JSON.stringify({configuration:true, unpublishedFallback:true, invalidRoutes:true,
        missingFiles:(art.chapters['chapter-02'] || []).filter(asset => !fs.existsSync(path.join(__dirname,asset.src))).map(asset => asset.src),
        pending:'Chapter two needs complete trilingual metadata. Finished mobile, preview and PDF checks have not run.'}));
      if (process.env.REQUIRE_PUBLISHED) throw new Error('Chapter two is not yet published');
      return;
    }

    const assets = [...art.chapters['chapter-02']].sort((a,b) => a.scene - b.scene);
    const scenesFor = lang => translations['chapter-02']?.[lang]?.scenes || art.scenes['chapter-02'];
    for (const width of [1440,768,390,320]) {
      const page = await browser.newPage({viewport:{width,height:950}, hasTouch:width <= 390});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const lang of ['en','es','ru']) {
        await page.goto(base + '?chapter=2&lang=' + lang);
        await loaded(page, 2);
        await page.evaluate(() => window.prepareChapterPrint());
        assert.equal(await page.locator('html').getAttribute('lang'), lang);
        assert.equal(await page.locator('.scene').count(), 16);
        assert.equal(await page.locator('.spread').count(), 11);
        assert.deepEqual(await page.locator('.spread').evaluateAll(sheets => sheets.map(sheet =>
          [...sheet.querySelectorAll('.scene')].map(scene => Number(scene.id.slice(6)) - 1))), groups);
        assert.deepEqual(await page.locator('.scene').evaluateAll(scenes => scenes.map(scene =>
          [...scene.querySelectorAll('.prose > p')].map(p => p.textContent))), scenesFor(lang).map(scene => scene.paragraphs));
        assert.equal(await page.locator('.opening-lead').count(),1, 'Only one opening drop cap');
        assert.equal(await page.locator('.opening-lead').textContent(),scenesFor(lang)[0].paragraphs[0],
          'Opening paragraph must remain whole, including abbreviations');
        assert.equal(await page.locator('#scene-1 .prose > p + p > *').count(),0,
          'Later opening paragraphs must be continuous prose without sentence-splitting spans');
        assert.equal(await page.locator('#scene-15 .prose').count(), 0);
        assert.equal(await page.locator('#spread-11 #scene-16 .prose').count(), scenesFor(lang)[15].paragraphs.length ? 1 : 0);
        assert.equal(await page.locator('.page-number').last().textContent(), '11');
        assert(await page.locator('img').evaluateAll((images, expected) => images.every((image, i) =>
          image.getAttribute('src') === expected[i].src && image.naturalWidth === expected[i].width &&
          image.naturalHeight === expected[i].height), assets));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction === 'auto' &&
          !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/.test(document.querySelector('meta[name=viewport]').content)));
        if (width <= 390) {
          assert.equal(await page.locator('.toolbar').isVisible(), false);
          assert(await page.locator('.scene-art img').evaluateAll(images => images.every(image => {
            const rect = image.getBoundingClientRect();
            return Math.abs(rect.width - innerWidth) < 1 && Math.abs(rect.height - rect.width * image.naturalHeight / image.naturalWidth) < 1;
          })), 'Mobile artwork must be full width and uncropped');
        }
        await layout(page);
        if (lang === 'en') {
          await page.screenshot({path:path.join(output,'opening-' + width + '.png')});
          await page.locator('#scene-16').scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(output,'reveal-' + width + '.png')});
          await page.evaluate(() => scrollTo(0,0));
        }
        await control(page, '#preview');
        await page.waitForFunction(() => document.documentElement.classList.contains('print-preview'));
        await page.evaluate(() => window.prepareChapterPrint());
        await page.waitForTimeout(100);
        await loaded(page, 2);
        await layout(page);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (lang === 'en') await page.screenshot({path:path.join(output,'preview-' + width + '.png')});
        const geometry = () => [...document.querySelectorAll('.spread,.scene,img,.prose')]
          .map(node => [node.offsetWidth,node.offsetHeight]);
        const previewGeometry = await page.evaluate(geometry);
        await page.emulateMedia({media:'print'});
        await layout(page);
        assert.deepEqual(await page.evaluate(geometry), previewGeometry, 'Preview and print typesetting differ');
        if (width === 1440 && !process.env.LIVE_CHECK) await verifyPdf(page, lang, assets, scenesFor(lang));
        await page.emulateMedia({media:'screen'});
        await control(page, '#preview');
        await page.waitForFunction(() => !document.documentElement.classList.contains('print-preview'));
        await page.emulateMedia({media:'print'});
        assert.deepEqual(await page.evaluate(geometry), previewGeometry, 'Printing from the reader changes typesetting');
        await page.emulateMedia({media:'screen'});
      }
      await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.45));
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight));
      await control(page, '[data-lang="en"]');
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      await page.waitForTimeout(100);
      const after = await page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight));
      assert(Math.abs(after - before) < 0.04, 'Language switch lost position: ' + JSON.stringify({width,before,after}));
      await control(page, '#preview');
      await control(page, '[data-lang="es"]');
      await loaded(page, 2);
      assert.equal(new URL(page.url()).searchParams.get('view'), 'print');
      await page.goBack();
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      await loaded(page, 2);
      assert.equal(new URL(page.url()).searchParams.get('view'), 'print');
      await page.goBack();
      await page.waitForFunction(() => !document.documentElement.classList.contains('print-preview'));
      await loaded(page, 2);
      await page.goBack();
      await page.waitForFunction(() => document.documentElement.lang === 'ru');
      await loaded(page, 2);
      await page.goto(base + '?chapter=1&lang=en');
      await loaded(page, 1);
      await page.goBack();
      await loaded(page, 2);
      await page.evaluate(() => { window.print = () => { window.printCalled = true; }; });
      await control(page, '#print');
      await page.waitForFunction(() => window.printCalled);
      assert.equal(await page.locator('.toolbar button:disabled').count(), 0);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({width, languages:3, scenes:16, spreads:11, layout:true, history:true, printButton:true}));
      await page.close();
    }
    await verifyNativeGestures(browser);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
