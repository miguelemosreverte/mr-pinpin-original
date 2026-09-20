const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
const captures = process.env.CAPTURE_DIR || '/tmp/pinpin-timber-home';
const output = process.env.EXPORT_DIR || path.join(os.homedir(), 'Downloads/Mr-PinPin-Timber-Tractor-Complete');
const languages = ['en', 'es', 'ru'];
const groups = [[0,1],[2,3],[4],[5],[6],[7],[8],[9]];
const prefix = 'images/standalone/timber-tractor/chapter-02/';
const first = JSON.parse(fs.readFileSync(path.join(__dirname, 'stories/timber-tractor.json')));
const homePath = path.join(__dirname, 'stories/timber-tractor-chapter-02.json');
const fixture = Boolean(process.env.FIXTURE_ONLY);
const localized = value => Object.fromEntries(languages.map(lang => [lang, value]));
const url = (chapter = '2', lang = 'en', extra = '') => base + '?story=timber-tractor&chapter=' + chapter + '&lang=' + lang + extra;
const compact = text => text.replace(/\s/gu, '');

function readStory() {
  if (fs.existsSync(homePath)) return JSON.parse(fs.readFileSync(homePath));
  assert(fixture, 'PENDING: chapter 2 story JSON is not ready');
  return {
    id:'timber-tractor', number:2,
    title:{en:'The Way Home', es:'El camino a casa', ru:'Дорога домой'},
    cover:localized(prefix + 'scene-05.png'),
    scenes:Array.from({length:10}, (_, index) => {
      const id = 'scene-' + String(index + 1).padStart(2, '0');
      return {...structuredClone(first.scenes[index + 1]), id, image:prefix + id + '.png'};
    }),
    spreads:groups.map((scenes, index) => ({style:'home', paper:index < 2 ? 'portrait' : 'landscape', scenes}))
  };
}

async function contract(story) {
  const requests = [];
  let responses = {'stories/timber-tractor.json':first, 'stories/timber-tractor-chapter-02.json':story};
  const context = {window:{}, fetch:async file => {
    requests.push(file);
    return {ok:true, json:async () => responses[file]};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'standalone-stories.js'), 'utf8'), context);
  const adapter = context.window.standaloneStories;
  assert(adapter.complete(first, 1));
  assert(adapter.complete(story, 2));
  assert(!adapter.complete(first, 2));
  assert(!adapter.complete(story, 1));
  assert.equal(story.number, 2);
  assert.deepEqual(story.spreads.map(spread => spread.scenes), groups);
  assert.deepEqual(story.title, {en:'The Way Home',es:'El camino a casa',ru:'Дорога домой'});
  for (const lang of languages) {
    assert.equal(adapter.edition(story, lang).images[0].src, story.scenes[0].image);
    assert.equal(story.cover[lang], prefix + 'scene-05.png');
  }
  const revised = structuredClone(story);
  for (const index of [0,4,7,8]) revised.scenes[index].image = prefix + revised.scenes[index].id + '-v2.png';
  assert(adapter.complete(revised, 2), 'Reviewed versioned scenes must be supported');
  for (const lang of languages) {
    assert.equal(adapter.edition(revised, lang).images[0].src, revised.scenes[0].image);
    assert.equal(revised.cover[lang], prefix + 'scene-05.png', 'Library cover must remain stable');
  }
  for (const mutate of [
    data => { delete data.number; }, data => { data.number = '2'; }, data => { data.id = 'timber-tractor-chapter-02'; },
    data => { delete data.title.ru; }, data => { data.cover.en = data.scenes[0].image; },
    data => { data.scenes.pop(); }, data => { data.scenes[0].image = first.cover.en; },
    data => { data.scenes[0].width = 1024; data.scenes[0].height = 1536; },
    data => { data.scenes[0].paragraphs.es = []; }, data => { data.scenes[0].paragraphs.ru = [' ']; },
    data => { delete data.scenes[5].alt.en; }, data => { data.scenes[3] = null; },
    data => { data.scenes[3].image = prefix + '../scene-04.png'; },
    data => { data.scenes[3].image = 'https://example.com/scene-04.png'; },
    data => { data.scenes[3].image += '\n'; },
    data => { data.scenes[3].image = prefix + 'scene-05.png'; },
    data => { delete data.scenes[3].image; },
    data => { data.scenes[7].image = prefix + 'scene-09-v2.png'; },
    data => { data.scenes[7].image = prefix + 'scene-08-v0.png'; },
    data => { data.scenes[7].image = prefix + 'scene-08-v02.png'; },
    data => { data.scenes[7].image = prefix + 'scene-08-v-1.png'; },
    data => { data.scenes[7].image = prefix + 'scene-08-v2.1.png'; },
    data => { data.scenes[7].image = prefix + 'scene-08-v2.png\n'; },
    data => { data.scenes[7].image = prefix + '../scene-08-v2.png'; },
    data => { data.cover.en = prefix + 'scene-05-v2.png'; },
    data => { [data.scenes[3],data.scenes[4]] = [data.scenes[4],data.scenes[3]]; },
    data => { data.spreads[0].style = 'cover'; }, data => { data.spreads[0].style += '\n'; },
    data => { data.spreads[0].paper = 'landscape'; }, data => { data.spreads[4].paper = 'portrait'; },
    data => { data.spreads[0].scenes.reverse(); }, data => { data.spreads[2].scenes = ['4']; },
    data => { data.spreads[2].scenes = [3]; }, data => { data.spreads[2] = null; }
  ]) {
    const broken = structuredClone(story); mutate(broken);
    assert(!adapter.complete(broken, 2), 'Invalid chapter 2 contract accepted');
  }
  for (const chapter of ['', '0', '3', '02', '2.0', '2x', ' 2', '2\n', -1, false, {}, []]) {
    assert.equal(await adapter.load('timber-tractor', chapter), null);
  }
  assert.equal(await adapter.load('unknown', 2), null);
  assert.deepEqual(requests, [], 'Unsupported routes fetched a fallback');
  const combined = adapter.compose(first, story);
  assert.equal(combined.scenes.length, 30);
  assert.equal(combined.spreads.length, 22);
  assert.equal(new Set(combined.scenes.map(scene => scene.id)).size, 30);
  assert.deepEqual(JSON.parse(JSON.stringify(combined.scenes.slice(0,20))), first.scenes);
  assert.deepEqual(JSON.parse(JSON.stringify(combined.scenes.slice(20))),
    story.scenes.map(scene => ({...scene, id:'home-' + scene.id})));
  assert.deepEqual(JSON.parse(JSON.stringify(combined.spreads.slice(14))),
    story.spreads.map(spread => ({...spread, scenes:spread.scenes.map(index => index + 20)})));
  assert.equal(combined.number, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(combined.title)), first.title);
  assert.equal(adapter.compose(story, first), null, 'Reversed parts accepted');
  assert.equal(adapter.compose(first, {...story, scenes:story.scenes.slice(1)}), null, 'Truncated home accepted');
  for (const legacy of [undefined, '1', '2']) {
    requests.length = 0;
    assert.deepEqual(await adapter.load('timber-tractor', legacy), combined);
    assert.deepEqual(requests.sort(), Object.keys(responses).sort(), 'Fetch each part once');
  }
  assert.equal((await adapter.available()).length, 1, 'Continuation must not become another library card');
  responses['stories/timber-tractor-chapter-02.json'] = first;
  assert.equal(await adapter.load('timber-tractor'), null, 'Wrong continuation accepted');
  console.log(JSON.stringify({contract:true,negativeContracts:true,fixture,scenes:30,pages:22}));
  return JSON.parse(JSON.stringify(combined));
}

async function loaded(page) {
  await page.waitForSelector('#reader[aria-busy=false] article[data-story="timber-tractor"]');
  assert.equal(new URL(page.url()).searchParams.get('story'), 'timber-tractor');
  assert.equal(new URL(page.url()).searchParams.has('chapter'), false);
  assert.equal(await page.locator('.scene').count(), 30);
}

async function control(page, selector) {
  if (await page.locator('#controls-toggle').isVisible() &&
      await page.locator('#controls-toggle').getAttribute('aria-expanded') === 'false') await page.locator('#controls-toggle').click();
  await page.locator(selector).click();
}

async function layout(page, paper = false) {
  const issues = await page.locator('.spread').evaluateAll((sheets, paper) => sheets.flatMap(sheet => {
    const issues = [];
    const bounds = sheet.getBoundingClientRect();
    const folio = sheet.querySelector('.folio');
    const limit = paper && getComputedStyle(folio).display !== 'none' ? folio.getBoundingClientRect().top : bounds.bottom;
    let bottom = bounds.top;
    for (const scene of sheet.querySelectorAll('.scene')) {
      const box = scene.getBoundingClientRect();
      const image = scene.querySelector('img').getBoundingClientRect();
      const prose = scene.querySelector('.prose')?.getBoundingClientRect();
      if (box.top < bottom - 1 || box.bottom > limit + 1) issues.push(scene.id + ': scene collision');
      if (image.width < 20 || image.height < 20 || (prose && (prose.top < image.bottom - 1 || prose.bottom > box.bottom + 1))) issues.push(scene.id + ': art/text collision');
      for (const node of scene.querySelectorAll('img,.prose,.prose > p,h1')) {
        const rect = node.getBoundingClientRect();
        if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.bottom > limit + 1) issues.push(scene.id + ': overflow');
      }
      bottom = box.bottom;
    }
    return issues;
  }), paper);
  assert.deepEqual(issues, [], 'Artwork and prose must fit');
  if (!paper) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}

async function negativeRoutes(browser) {
  const page = await browser.newPage();
  for (const chapter of ['', '0', '3', '02', '2.0', '2x', '%202']) {
    await page.goto(url(chapter));
    await page.waitForSelector('#reader[aria-busy=false] .error');
    assert.equal(await page.locator('#reader article').count(), 0);
    assert(await page.locator('#print').isDisabled());
    assert.equal(new URL(page.url()).searchParams.get('chapter'), decodeURIComponent(chapter));
  }
  await page.route('**/stories/timber-tractor-chapter-02.json', route => route.fulfill({json:first}));
  await page.goto(url());
  await page.waitForSelector('#reader[aria-busy=false] .error');
  await page.goto(base + 'library.html?lang=en');
  await page.waitForSelector('#chapter-library[aria-busy=false]');
  assert.equal(await page.locator('.adventure-cover').count(), 0, 'Incomplete continuation must hide the full adventure');
  assert.equal(await page.locator('.chapter-cover').count(), 38);
  await page.route('**/stories/timber-tractor-chapter-02.json', route => route.fulfill({status:404,body:'Unavailable'}));
  await page.goto(url());
  await page.waitForSelector('#reader[aria-busy=false] .error');
  await page.close();
}

async function libraryAndHistory(page, story, width) {
  await page.goto(base + 'library.html?lang=en&view=print&keep=home');
  await page.waitForSelector('#chapter-library[aria-busy=false]');
  assert.equal(await page.locator('.chapter-cover').count(), 38);
  assert.equal(await page.locator('.adventure-cover').count(), 1);
  assert.equal(await page.locator('.chapter-cover[data-chapter="2"] > a').first().getAttribute('href'), './?chapter=2&lang=en');
  const adventure = page.locator('.adventure-cover');
  assert.equal(await adventure.locator('img').getAttribute('src'), first.cover.en);
  assert.equal(await adventure.locator('.cover-number').count(), 0);
  for (const query of [first.title.en, story.continuationTitles.en]) {
    await page.locator('#chapter-search').fill(query);
    assert.equal(await page.locator('.adventure-cover').count(), 1);
  }
  await page.locator('#chapter-search').fill('');
  await page.locator('#chapter-filter').selectOption('upcoming');
  assert.equal(await page.locator('.adventure-cover').count(), 0);
  await page.locator('#chapter-filter').selectOption('all');
  await page.screenshot({path:path.join(captures, `library-${width}.png`)});
  await adventure.locator('a').click(); await loaded(page);
  const state = () => new URL(page.url()).searchParams;
  assert.equal(state().get('keep'), 'home');
  assert.equal(state().get('view'), 'print');
  assert.equal(await page.locator('#story-chapters').count(), 0);
  await control(page, '[data-lang="es"]');
  assert.equal(state().has('chapter'), false);
  await page.goBack(); await loaded(page);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.goForward(); await loaded(page);
  assert.equal(await page.locator('html').getAttribute('lang'), 'es');
  await page.locator('.reader-footer .library-link').click();
  await page.waitForSelector('#chapter-library[aria-busy=false]');
  assert.equal(state().get('keep'), 'home');
  assert.equal(state().get('lang'), 'es');
  for (const chapter of ['1', '2']) {
    await page.goto(url(chapter, 'ru', '&keep=legacy')); await loaded(page);
    assert.equal(state().get('keep'), 'legacy');
    assert.equal(state().has('chapter'), false);
    assert.equal(await page.locator('.spread-cover').count(), 1);
  }
  // Main-book chapter routes retain their independent reader and history.
  await page.evaluate(() => { history.pushState(null, '', '?chapter=2&lang=ru'); dispatchEvent(new PopStateEvent('popstate')); });
  await page.waitForSelector('article[data-chapter="chapter-02"]');
  assert.equal(await page.locator('.scene').count(), 16);
  await page.goBack(); await loaded(page);
  await page.evaluate(() => { history.pushState(null, '', '?story=timber-tractor&chapter=3&lang=en'); dispatchEvent(new PopStateEvent('popstate')); });
  await page.waitForSelector('#reader[aria-busy=false] .error');
  assert(await page.locator('#print').isDisabled());
  await page.goBack(); await loaded(page);
}

async function delayedNavigation(context, story) {
  const page = await context.newPage();
  await page.goto(url('1')); await loaded(page, 1);
  let started;
  const requested = new Promise(resolve => { started = resolve; });
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  await page.route('**/stories/timber-tractor-chapter-02.json', async route => {
    started();
    await delayed;
    await route.fulfill({json:story});
  });
  await page.evaluate(() => {
    history.pushState(null, '', '?story=timber-tractor&chapter=2&lang=es');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await requested;
  await page.evaluate(() => {
    history.pushState(null, '', '?chapter=2&lang=ru');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForSelector('article[data-chapter="chapter-02"]');
  release();
  await page.waitForTimeout(250);
  assert.equal(await page.locator('article[data-chapter="chapter-02"]').count(), 1);
  assert.equal(await page.locator('html').getAttribute('lang'), 'ru');
  assert.equal(new URL(page.url()).searchParams.has('story'), false);
  await page.close();
}

async function pdf(page, story, lang) {
  fs.mkdirSync(output, {recursive:true});
  const file = path.join(output, 'Mr-PinPin-Timber-Tractor-Complete-' + lang + '.pdf');
  await page.pdf({path:file,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});
  const info = execFileSync('pdfinfo', ['-f','1','-l',String(story.spreads.length),file], {encoding:'utf8'});
  assert.match(info, /Pages:\s+22\b/);
  const sizes = [...info.matchAll(/Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+)/g)];
  assert.equal(sizes.length, 22);
  sizes.forEach((size, index) => assert.equal(Number(size[2]) > Number(size[3]), story.spreads[index].paper === 'landscape'));
  const imagePages = story.scenes.map((_, index) => story.spreads.findIndex(spread => spread.scenes.includes(index)) + 1);
  const rows = execFileSync('pdfimages', ['-list',file], {encoding:'utf8'}).split('\n').filter(line => /^\s*\d+\s+\d+\s+image\s/.test(line));
  assert.equal(rows.length, 30);
  rows.forEach((row, index) => {
    const fields = row.trim().split(/\s+/);
    assert.equal(Number(fields[0]), imagePages[index]);
    assert.deepEqual(fields.slice(3,5).map(Number), [story.scenes[index].width,story.scenes[index].height]);
  });
  const text = execFileSync('pdftotext', ['-layout',file,'-'], {encoding:'utf8'});
  const pages = text.split('\f');
  if (!pages.at(-1).trim()) pages.pop();
  assert.equal(pages.length, 22);
  story.scenes.forEach((scene, index) => scene.paragraphs[lang].forEach(paragraph =>
    assert(compact(pages[imagePages[index] - 1]).includes(compact(paragraph)), 'Prose on wrong PDF page: ' + scene.id)));
  assert(!/Previous chapter|Capítulo anterior|Предыдущая глава/.test(text), 'Navigation leaked into print');
  execFileSync('pdftoppm', ['-scale-to','1000','-png',file,path.join(captures,'print-' + lang)], {stdio:'pipe'});
  console.log(JSON.stringify({pdf:file,pages:22,originalResolutionImages:30,textOnMatchingPages:true}));
}

async function main() {
  const home = readStory();
  const story = await contract(home);
  if (process.env.CONTRACT_ONLY) return;
  assert(!process.env.EXPORT_PDFS || (process.env.ART_READY === '1' && !fixture), 'PDF export requires ART_READY=1 and final artwork');
  fs.mkdirSync(captures, {recursive:true});
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const context = await browser.newContext();
  if (fixture) {
    await context.route('**/stories/timber-tractor-chapter-02.json', route => route.fulfill({json:home}));
    await context.route('**/images/standalone/timber-tractor/chapter-02/*.png', route => route.fulfill({
      path:path.join(__dirname, first.scenes[3].image),contentType:'image/png'
    }));
  }
  const errors = [];
  const methods = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  context.on('request', request => methods.push(request.method()));
  try {
    await negativeRoutes(context);
    await delayedNavigation(context, home);
    for (const width of [1440,390,320]) {
      const page = await context.newPage();
      await page.setViewportSize({width,height:950});
      await libraryAndHistory(page, story, width);
      for (const lang of languages) {
        await page.goto(url('2', lang)); await loaded(page);
        await page.evaluate(() => window.prepareChapterPrint());
        assert.equal(await page.title(), story.title[lang]);
        assert.equal(await page.locator('.scene').count(), 30);
        assert.equal(await page.locator('.spread-cover').count(), 1);
        assert.equal(await page.locator('article h1,#story-chapters,[data-story-chapter]').count(), 0);
        assert.deepEqual(await page.locator('.page-number').allTextContents(), Array.from({length:22}, (_, i) => String(i + 1).padStart(2,'0')));
        assert.deepEqual(await page.locator('.scene').evaluateAll(scenes => scenes.map(scene => scene.dataset.sceneId)), story.scenes.map(scene => scene.id));
        assert.deepEqual(await page.locator('.scene img').evaluateAll(images => images.map(image => ({src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight}))),
          story.scenes.map((scene,index) => ({src:index === 0 ? story.cover[lang] : scene.image,width:scene.width,height:scene.height})));
        assert.deepEqual(await page.locator('.scene').evaluateAll(scenes => scenes.map(scene => [...scene.querySelectorAll('.prose > p')].map(p => p.textContent))),
          story.scenes.map(scene => scene.paragraphs[lang]));
        await layout(page);
        if (width < 600) {
          assert.equal(await page.locator('.toolbar').isVisible(), false);
          assert(await page.locator('.scene img').evaluateAll(images => images.every(image => Math.abs(image.getBoundingClientRect().width - innerWidth) < 1)));
        }
        await page.screenshot({path:path.join(captures, `reader-${lang}-${width}.png`)});
        await control(page, '#preview');
        await page.evaluate(() => window.prepareChapterPrint());
        await page.waitForTimeout(80);
        await layout(page, true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({path:path.join(captures, `preview-${lang}-${width}.png`)});
        const geometry = () => [...document.querySelectorAll('.spread,.scene,img,.prose')].map(node => [node.offsetWidth,node.offsetHeight]);
        const preview = await page.evaluate(geometry);
        await page.emulateMedia({media:'print'});
        await layout(page, true);
        assert.deepEqual(await page.evaluate(geometry), preview);
        assert.equal(await page.locator('.reader-footer').isVisible(), false);
        if (process.env.EXPORT_PDFS && width === 1440) await pdf(page, story, lang);
        await page.emulateMedia({media:'screen'});
        await control(page, '#preview');
        await page.emulateMedia({media:'print'});
        assert.deepEqual(await page.evaluate(geometry), preview);
        await page.emulateMedia({media:'screen'});
      }
      await page.waitForTimeout(150);
      await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.45));
      await page.waitForTimeout(80);
      await control(page, '[data-lang="en"]');
      await page.waitForTimeout(80);
      const fraction = await page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight));
      assert(Math.abs(fraction - 0.45) < 0.04, 'Language switch lost reading position: ' + fraction);
      await page.evaluate(() => { window.print = () => { window.printCalled = true; }; });
      await control(page, '#print');
      await page.waitForFunction(() => window.printCalled);
      await page.evaluate(() => { window.printCalled = false; document.querySelector('.scene img').src = 'data:image/png;base64,eA=='; });
      await control(page, '#print');
      await page.waitForFunction(() => document.getElementById('export-status').textContent.includes('PDF'));
      assert.equal(await page.evaluate(() => window.printCalled), false);
      assert.equal(await page.locator('.toolbar button:disabled').count(), 0);
      await page.close();
      console.log(JSON.stringify({width,languages:3,layout:true,history:true,seriesPreserved:true,printButton:true}));
    }
    for (const width of [320,390]) {
      const page = await context.newPage();
      await page.setViewportSize({width,height:844});
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setDeviceMetricsOverride', {width,height:844,deviceScaleFactor:1,mobile:true});
      await cdp.send('Emulation.setTouchEmulationEnabled', {enabled:true});
      await page.goto(url()); await loaded(page);
      await page.evaluate(() => window.prepareChapterPrint());
      await cdp.send('Input.synthesizeScrollGesture', {x:width / 2,y:600,yDistance:-300,gestureSourceType:'touch'});
      assert(await page.evaluate(() => scrollY > 100));
      await page.evaluate(() => scrollTo(0,0));
      await cdp.send('Input.synthesizePinchGesture', {x:width / 2,y:200,scaleFactor:2,relativeSpeed:400,gestureSourceType:'touch'});
      assert(await page.evaluate(() => visualViewport.scale > 1.5));
      const left = await page.evaluate(() => visualViewport.offsetLeft);
      await cdp.send('Input.synthesizeScrollGesture', {x:100,y:150,xDistance:-45,yDistance:0,gestureSourceType:'touch'});
      assert(await page.evaluate(left => Math.abs(visualViewport.offsetLeft - left) > 10, left));
      await page.close();
    }
    assert.deepEqual(errors, []);
    assert(!methods.includes('HEAD'));
    console.log(JSON.stringify({passed:true,fixture,nativeGestures:true,noHeadRequests:true,exports:Boolean(process.env.EXPORT_PDFS)}));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
