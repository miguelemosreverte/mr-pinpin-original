const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
const output = process.env.EXPORT_DIR || path.join(os.homedir(), 'Downloads/Mr-PinPin-Timber-Tractor');
const captures = process.env.CAPTURE_DIR || '/tmp/pinpin-timber-tractor';
const languages = ['en', 'es', 'ru'];
const compact = text => text.replace(/\s/gu, '');
const url = lang => base + '?story=timber-tractor&lang=' + lang;

async function loaded(page) {
  await page.waitForSelector('#reader[aria-busy=false] article[data-story="timber-tractor"]');
  assert.equal(new URL(page.url()).searchParams.get('story'), 'timber-tractor');
  assert.equal(new URL(page.url()).searchParams.has('chapter'), false);
}

async function control(page, selector) {
  if (await page.locator('#controls-toggle').isVisible() &&
      await page.locator('#controls-toggle').getAttribute('aria-expanded') === 'false') {
    await page.locator('#controls-toggle').click();
  }
  await page.locator(selector).click();
}

async function layout(page, paper = false) {
  const issues = await page.locator('.spread').evaluateAll((sheets, paper) => {
    const issues = [];
    for (const sheet of sheets) {
      const bounds = sheet.getBoundingClientRect();
      const folio = sheet.querySelector('.folio');
      const limit = paper && getComputedStyle(folio).display !== 'none' ? folio.getBoundingClientRect().top : bounds.bottom;
      let bottom = bounds.top;
      for (const scene of sheet.querySelectorAll('.scene')) {
        const box = scene.getBoundingClientRect();
        const image = scene.querySelector('img').getBoundingClientRect();
        const prose = scene.querySelector('.prose')?.getBoundingClientRect();
        if (box.top < bottom - 1 || box.bottom > limit + 1) issues.push(scene.id + ': scene collision');
        if (image.width < 20 || image.height < 20) issues.push(scene.id + ': collapsed art');
        if (prose && (prose.top < image.bottom - 1 || prose.bottom > box.bottom + 1)) issues.push(scene.id + ': text collision');
        for (const node of scene.querySelectorAll('img,.prose,.prose > p')) {
          const rect = node.getBoundingClientRect();
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.bottom > limit + 1) issues.push(scene.id + ': overflow');
        }
        bottom = box.bottom;
      }
    }
    return issues;
  }, paper);
  assert.deepEqual(issues, [], 'Artwork/text layout');
  if (!paper) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}

async function pdf(page, story, lang) {
  const painted = await page.locator('.spread').evaluateAll(sheets => sheets.map(sheet => {
    const bounds = sheet.getBoundingClientRect();
    const area = [...sheet.querySelectorAll('img')].reduce((sum,image) => {
      const box = image.getBoundingClientRect();
      const ratio = image.naturalWidth / image.naturalHeight;
      const width = Math.min(box.width,box.height * ratio);
      return sum + width * width / ratio;
    },0);
    return Math.round(100 * area / (bounds.width * bounds.height));
  }));
  painted.forEach((percent,index) => assert(percent >= 45, 'Excessive blank area on page ' + (index + 1)));
  const file = path.join(output, 'Mr-PinPin-Timber-Tractor-' + lang + '.pdf');
  await page.pdf({path:file, preferCSSPageSize:true, printBackground:true, displayHeaderFooter:false});
  const count = story.spreads.length;
  const info = execFileSync('pdfinfo', ['-f','1','-l',String(count),file], {encoding:'utf8'});
  assert.match(info, new RegExp('Pages:\\s+' + count + '\\b'), 'Extra/missing print pages');
  const sizes = [...info.matchAll(/Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+)/g)];
  assert.equal(sizes.length, count);
  sizes.forEach((size, i) => assert.equal(Number(size[2]) > Number(size[3]), story.spreads[i].paper === 'landscape'));
  const imagePages = story.scenes.map((_, index) => story.spreads.findIndex(spread => spread.scenes.includes(index)) + 1);
  const rows = execFileSync('pdfimages', ['-list',file], {encoding:'utf8'})
    .split('\n').filter(line => /^\s*\d+\s+\d+\s+image\s/.test(line));
  assert.equal(rows.length, story.scenes.length, 'Every illustration must be embedded');
  rows.forEach((row, i) => {
    const fields = row.trim().split(/\s+/);
    assert.equal(Number(fields[0]), imagePages[i], 'Image on wrong PDF page');
    assert.deepEqual(fields.slice(3,5).map(Number), [story.scenes[i].width,story.scenes[i].height], 'Image resolution lost');
  });
  const text = execFileSync('pdftotext', ['-layout',file,'-'], {encoding:'utf8'});
  const pages = text.split('\f');
  if (!pages.at(-1).trim()) pages.pop();
  assert.equal(pages.length, count);
  story.scenes.forEach((scene, i) => scene.paragraphs[lang].forEach(paragraph =>
    assert(compact(pages[imagePages[i] - 1]).includes(compact(paragraph)), 'Narration missing or on wrong page: ' + scene.id)));
  const revealPage = imagePages[story.scenes.findIndex(scene => scene.id === 'scene-18')];
  for (const id of ['scene-16', 'scene-17']) {
    assert(imagePages[story.scenes.findIndex(scene => scene.id === id)] < revealPage, 'Joke setup and reveal need separate pages');
  }
  assert(!/Print \/ Save PDF|Read adventure/.test(text), 'Controls leaked into PDF');
  // Rasterize the actual PDF, not a browser approximation of its pagination.
  execFileSync('pdftoppm', ['-scale-to','1100','-png',file,path.join(captures,'print-' + lang)], {stdio:'pipe'});
  console.log(JSON.stringify({pdf:file,pages:count,originalResolutionImages:story.scenes.length,textOnMatchingPages:true,
    paintedAreaPercent:painted,allPagesRasterized:true}));
}

async function unavailable(browser) {
  const page = await browser.newPage();
  await page.route('**/stories/timber-tractor.json', route => route.fulfill({status:404,body:'Not ready'}));
  await page.goto(url('en'));
  await page.waitForSelector('#reader[aria-busy=false] .error');
  assert.equal(await page.locator('#reader article').count(), 0);
  assert(await page.locator('#print').isDisabled());
  await page.goto(base + 'library.html?lang=en');
  await page.waitForSelector('#chapter-library[aria-busy=false]');
  assert.equal(await page.locator('.adventure-cover').count(), 0, 'Unfinished story was published');
  assert.equal(await page.locator('.chapter-cover').count(), 38);
  await page.close();
  console.log(JSON.stringify({missingStoryHidden:true,mainChapters:38}));
}

async function missingImage(browser) {
  const page = await browser.newPage();
  const requests = [];
  page.on('request', request => requests.push({method:request.method(),url:request.url()}));
  await page.route(/\/images\/standalone\/timber-tractor\/scene-18(?:-v\d+)?\.png$/,
    route => route.fulfill({status:404,body:'Transient asset failure'}));
  await page.goto(url('en'));
  await loaded(page);
  await page.evaluate(() => {window.print = () => {window.printCalled = true;};});
  await control(page,'#print');
  await page.waitForFunction(() => document.getElementById('export-status').textContent.includes('PDF'));
  assert.equal(await page.evaluate(() => Boolean(window.printCalled)),false,'Printed with missing image');
  assert.equal(await page.locator('.toolbar button:disabled').count(),0);
  await page.goto(base + 'library.html?lang=en');
  await page.waitForSelector('#chapter-library[aria-busy=false]');
  assert.equal(await page.locator('.adventure-cover').count(),1,'Transient image failure hid a published story');
  assert.equal(requests.filter(request => request.method === 'HEAD').length,0,'Runtime asset probing is forbidden');
  assert.equal(requests.filter(request => request.url.endsWith('/stories/timber-tractor.json')).length,2,
    'Each page must fetch story metadata exactly once');
  await page.close();
  console.log(JSON.stringify({metadataOnlyPublication:true,noHeadRequests:true,missingImageBlocksPrint:true}));
}

async function library(browser, story) {
  for (const width of [1440,768,390,320]) {
    const page = await browser.newPage({viewport:{width,height:900}});
    for (const lang of languages) {
      await page.goto(base + 'library.html?lang=' + lang);
      await page.waitForSelector('#chapter-library[aria-busy=false]');
      assert.equal(await page.locator('.chapter-cover').count(), 38);
      const firstChapter = page.locator('.adventure-cover');
      assert.equal(await firstChapter.count(), 1);
      assert.equal(await firstChapter.locator('img').getAttribute('src'), story.cover[lang]);
      await firstChapter.locator('img').evaluate(image => image.decode());
      await page.screenshot({path:path.join(captures,`library-${lang}-${width}.png`)});
      await page.locator('#chapter-filter').selectOption('upcoming');
      assert.equal(await page.locator('.adventure-cover').count(), 0);
      await page.locator('#chapter-filter').selectOption('published');
      assert.equal(await firstChapter.count(), 1);
      await page.locator('#chapter-search').fill(story.title[lang]);
      assert.equal(await firstChapter.count(), 1);
      assert.equal(await page.locator('.chapter-cover').count(), 0);
      assert.equal(await page.locator('#library-status').textContent(), '');
      await page.locator('#chapter-search').fill('zzzzzz');
      assert.equal(await page.locator('.adventure-cover').count(), 0);
      assert((await page.locator('#library-status').textContent()).length > 0);
      await page.locator('#chapter-search').fill('');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await firstChapter.locator('a').click();
      await loaded(page);
      assert.equal(await page.locator('html').getAttribute('lang'), lang);
      await page.locator('.reader-footer .library-link').click();
      await page.waitForSelector('.adventure-cover');
      assert.equal(new URL(page.url()).searchParams.get('lang'), lang);
    }
    await page.close();
  }
}

async function gestures(browser) {
  for (const width of [320,390,768]) for (const lang of languages) {
    const page = await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
    await page.goto(url(lang)); await loaded(page);
    await page.evaluate(() => window.prepareChapterPrint());
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.synthesizeScrollGesture',{x:width / 2,y:600,yDistance:-300,gestureSourceType:'touch'});
    await page.waitForTimeout(150);
    assert(await page.evaluate(() => scrollY > 100), 'Native scrolling failed');
    await page.evaluate(() => scrollTo(0,0));
    await cdp.send('Input.synthesizePinchGesture',{x:width / 2,y:200,scaleFactor:2,relativeSpeed:400,gestureSourceType:'touch'});
    await page.waitForTimeout(150);
    const zoom = await page.evaluate(() => ({scale:visualViewport.scale,left:visualViewport.offsetLeft}));
    assert(zoom.scale > 1.5, 'Native pinch failed');
    await cdp.send('Input.synthesizeScrollGesture',{x:100,y:150,xDistance:-45,yDistance:0,gestureSourceType:'touch'});
    await page.waitForTimeout(150);
    assert(await page.evaluate(left => Math.abs(visualViewport.offsetLeft - left) > 10, zoom.left), 'Zoom pan failed');
    await loaded(page);
    await page.screenshot({path:path.join(captures,`native-zoom-${lang}-${width}.png`)});
    await page.close();
  }
}

function verifyContract() {
    const storyPath = path.join(__dirname,'stories/timber-tractor.json');
    assert(fs.existsSync(storyPath), 'PENDING: story JSON is not ready; final rendering/PDF tests have not run');
    const story = JSON.parse(fs.readFileSync(storyPath));
    const context = {window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'standalone-stories.js'),'utf8'),context);
    assert(context.window.standaloneStories.complete(story), 'Story contract is incomplete');
    assert.deepEqual(story.scenes.map(scene => scene.id), [
      ...Array.from({length:14}, (_, i) => 'scene-' + String(i + 1).padStart(2, '0')),
      'scene-19', 'scene-20', 'scene-15', 'scene-16', 'scene-17', 'scene-18'
    ], 'Stable scene IDs must retain reading order');
    assert.equal(story.spreads.length,14);
    assert.deepEqual(story.spreads.map(spread => spread.scenes),
      [[0],[1,2],[3,4],[5,6],[7,8],[9],[10],[11,12],[13],[14],[15],[16],[17,18],[19]]);
    for (const [id, version] of [['scene-05',4],['scene-06',2],['scene-07',4],['scene-08',2],['scene-09',4],['scene-10',3],['scene-11',3],['scene-15',2],['scene-18',3],['scene-20',2]]) {
      assert.equal(story.scenes.find(scene => scene.id === id).image, `images/standalone/timber-tractor/${id}-v${version}.png`);
    }
    const revised = structuredClone(story);
    revised.scenes[14].image = 'images/standalone/timber-tractor/scene-19-v2.png';
    assert(context.window.standaloneStories.complete(revised), 'Reviewed versioned images must be supported');
    for (const mutate of [
      data => { delete data.cover.es; },
      data => { data.scenes[5].paragraphs.ru = []; },
      data => { data.scenes[14].id = 'scene-15'; },
      data => { [data.scenes[14],data.scenes[15]] = [data.scenes[15],data.scenes[14]]; },
      data => { data.scenes[14].image = 'images/standalone/timber-tractor/scene-20.png'; },
      data => { data.scenes[14].image = 'https://example.com/scene-19.png'; },
      data => { data.scenes[14].image = 'images/standalone/timber-tractor/../scene-19.png'; },
      data => { data.scenes[14].image += '\n'; },
      data => { data.scenes[14] = null; },
      data => { data.spreads[9] = null; },
      data => { data.spreads[9].style += '\n'; },
      data => { data.spreads[9].paper = 'portrait'; },
      data => { data.spreads[10].scenes.push(...data.spreads.splice(11,1)[0].scenes); },
      data => { data.spreads[1].scenes.reverse(); },
      data => {
        data.spreads.at(-2).scenes.push(...data.spreads.pop().scenes);
        data.spreads.splice(1,1,
          {style:'arrival',paper:'landscape',scenes:[1]},
          {style:'meeting',paper:'landscape',scenes:[2]});
      }
    ]) {
      const incomplete = structuredClone(story);
      mutate(incomplete);
      assert(!context.window.standaloneStories.complete(incomplete), 'Incomplete or mistimed edition must stay unpublished');
    }
    console.log(JSON.stringify({storyContract:true,stableSceneOrder:true,scenes:story.scenes.length,printPages:story.spreads.length}));
    const home = JSON.parse(fs.readFileSync(path.join(__dirname,'stories/timber-tractor-chapter-02.json')));
    const combined = context.window.standaloneStories.compose(story, home);
    assert.equal(combined.scenes.length, 30);
    assert.equal(combined.spreads.length, 22);
    return JSON.parse(JSON.stringify(combined));
}

async function main() {
  const story = verifyContract();
  if (process.env.CONTRACT_ONLY) return;
  fs.mkdirSync(captures,{recursive:true});
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    await unavailable(browser);
    const missing = [...new Set([...Object.values(story.cover),...story.scenes.map(scene => scene.image)])]
      .filter(file => !fs.existsSync(path.join(__dirname,file)));
    assert.deepEqual(missing, [], 'PENDING: final artwork is missing; no PDFs exported');
    if (!process.env.LIVE_CHECK) fs.mkdirSync(output,{recursive:true});
    await missingImage(browser);
    await library(browser,story);
    const groups = story.spreads.map(spread => spread.scenes);
    for (const width of [1440,768,390,320]) {
      const page = await browser.newPage({viewport:{width,height:950},hasTouch:width <= 390});
      const errors = []; page.on('pageerror',error => errors.push(error.message));
      for (const lang of languages) {
        await page.goto(url(lang)); await loaded(page);
        await page.evaluate(() => window.prepareChapterPrint());
        assert.equal(await page.title(),story.title[lang]);
        assert.equal(await page.locator('.scene').count(),story.scenes.length);
        assert.equal(await page.locator('.eyebrow,[data-chapter]').count(),0, 'Chapter labels leaked into standalone');
        assert.deepEqual(await page.locator('.spread').evaluateAll(sheets => sheets.map(sheet =>
          [...sheet.querySelectorAll('.scene')].map(scene => Number(scene.id.slice(6)) - 1))),groups);
        assert.deepEqual(await page.locator('.scene').evaluateAll(scenes => scenes.map(scene =>
          [...scene.querySelectorAll('.prose > p')].map(p => p.textContent))),story.scenes.map(scene => scene.paragraphs[lang]));
        const images = await page.locator('.scene-art img').evaluateAll(images => images.map(image =>
          ({src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight})));
        assert.deepEqual(images,story.scenes.map((scene,i) => ({src:i === 0 ? story.cover[lang] : scene.image,width:scene.width,height:scene.height})));
        assert(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction === 'auto' &&
          !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/.test(document.querySelector('meta[name=viewport]').content)));
        if (width <= 390) {
          assert.equal(await page.locator('.toolbar').isVisible(),false);
          assert(await page.locator('.scene-art img').evaluateAll(images => images.every(image => {
            const box = image.getBoundingClientRect();
            return Math.abs(box.width - innerWidth) < 1 && Math.abs(box.height - box.width * image.naturalHeight / image.naturalWidth) < 1;
          })), 'Mobile art must be full width and uncropped');
        }
        await layout(page);
        await page.screenshot({path:path.join(captures,`reader-${lang}-${width}.png`)});
        await control(page,'#preview');
        await page.evaluate(() => window.prepareChapterPrint());
        await page.waitForTimeout(100);
        await layout(page,true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({path:path.join(captures,`preview-${lang}-${width}.png`)});
        const geometry = () => [...document.querySelectorAll('.spread,.scene,img,.prose')].map(node => [node.offsetWidth,node.offsetHeight]);
        const previewGeometry = await page.evaluate(geometry);
        await page.emulateMedia({media:'print'});
        await layout(page,true);
        assert.deepEqual(await page.evaluate(geometry),previewGeometry,'Preview and PDF geometry differ');
        assert(await page.locator('.spread-cover').evaluate(sheet => {
          const image = sheet.querySelector('img');
          return getComputedStyle(sheet).padding === '0px' && getComputedStyle(image).objectFit === 'contain' &&
            Math.abs(image.getBoundingClientRect().height - sheet.getBoundingClientRect().height) < 1;
        }), 'Cover must occupy an uncropped full page');
        await page.emulateMedia({media:'screen'});
        await control(page,'#preview');
        await page.emulateMedia({media:'print'});
        assert.deepEqual(await page.evaluate(geometry),previewGeometry,'Printing from reader changes geometry');
        await page.emulateMedia({media:'screen'});
      }
      await page.evaluate(() => scrollTo(0,(document.documentElement.scrollHeight - innerHeight) * 0.45));
      await page.waitForTimeout(100);
      const position = () => scrollY / (document.documentElement.scrollHeight - innerHeight);
      const before = await page.evaluate(position);
      await control(page,'[data-lang="en"]');
      await page.waitForTimeout(150);
      assert(Math.abs(await page.evaluate(position) - before) < 0.04,'Language switch lost position');
      await control(page,'#preview');
      await control(page,'[data-lang="es"]');
      await page.goBack(); await loaded(page);
      assert.equal(await page.locator('html').getAttribute('lang'),'en');
      assert.equal(new URL(page.url()).searchParams.get('view'),'print');
      await page.goBack(); await loaded(page);
      assert.equal(new URL(page.url()).searchParams.has('view'),false);
      await page.goBack(); await loaded(page);
      assert.equal(await page.locator('html').getAttribute('lang'),'ru');
      await page.goto(base + '?chapter=1&lang=en');
      await page.waitForSelector('article[data-chapter="chapter-01"]');
      await page.goBack(); await loaded(page);
      await page.evaluate(() => {window.print = () => {window.printCalled = true;};});
      await control(page,'#print');
      await page.waitForFunction(() => window.printCalled);
      assert.equal(await page.locator('.toolbar button:disabled').count(),0);
      await page.evaluate(() => {
        window.printCalled = false;
        document.querySelector('.scene-art img').src = 'data:image/png;base64,eA==';
      });
      await control(page,'#print');
      await page.waitForFunction(() => document.getElementById('export-status').textContent.includes('PDF'));
      assert.equal(await page.evaluate(() => window.printCalled),false,'Printed missing artwork');
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({width,languages:3,layout:true,history:true,printButton:true}));
      await page.close();
    }
    await gestures(browser);
    if (!process.env.LIVE_CHECK) for (const lang of languages) {
      const page = await browser.newPage({viewport:{width:1440,height:950}});
      await page.goto(url(lang) + '&view=print');
      await loaded(page);
      await page.evaluate(() => window.prepareChapterPrint());
      await page.emulateMedia({media:'print'});
      await layout(page,true);
      await pdf(page,story,lang);
      await page.close();
    }
    console.log(JSON.stringify({nativeGestures:true,librarySearchAndFilters:true,passed:true}));
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode = 1;});
