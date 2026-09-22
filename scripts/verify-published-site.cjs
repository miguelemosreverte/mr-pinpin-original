#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');
const {values} = parseArgs({options:{base:{type:'string'},out:{type:'string'},help:{type:'boolean'}}});
if (values.help || !values.base || !values.out) {
  console.log('Usage: node scripts/verify-published-site.cjs --base https://host/project/ --out /external/audit-dir\nOptional: PLAYWRIGHT_MODULE=/path/to/playwright');
  process.exit(values.help ? 0 : 2);
}
const base = new URL(values.base);
assert(['http:', 'https:'].includes(base.protocol), 'HTTP(S) base required');
base.search = ''; base.hash = '';
if (!base.pathname.endsWith('/')) base.pathname += '/';
const readerBase = new URL(base.pathname.endsWith('/storyboard/') ? './' : 'storyboard/', base);
const readerPath = url => url.pathname.replace(/\/index\.html$/, '/');
const root = fs.realpathSync(path.resolve(__dirname, '..'));
const out = path.resolve(values.out);
function outside(file) { const relative = path.relative(root, file); return relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative); }
assert(outside(out), '--out must be outside the checkout');
fs.mkdirSync(out, {recursive:true});
assert(outside(fs.realpathSync(out)), '--out must not symlink into the checkout');
function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
  }
}
const legacy = [
  {id:'chapter-1',query:'chapter=1',count:15}, {id:'chapter-2',query:'chapter=2',count:16},
  {id:'timber-tractor',query:'story=timber-tractor',count:34}, {id:'home-sweet-home',query:'story=home-sweet-home',count:21}
];
const elder = ['one-day-in-the-forest','elder-papa-home','elder-family-morning','elder-forest-path','elder-elder-house','elder-beneath-roots']
  .map((id,i) => ({id,query:'story='+id,count:[166,16,21,23,36,70][i]}));
const report = {base:base.href,readerBase:readerBase.href,started:new Date().toISOString(),checks:[],pageErrors:[],consoleErrors:[],httpErrors:[],requestFailures:[],expectedNoise:[],screenshots:[]};
const save = () => fs.writeFileSync(path.join(out,'results.json'), JSON.stringify(report,null,2)+'\n');
let phase = 'startup';
async function check(name, fn) {
  phase = name;
  try { report.checks.push({name,pass:true,details:await fn()}); console.log('PASS '+name); }
  catch (error) { report.checks.push({name,pass:false,error:error.message}); console.error('FAIL '+name+': '+error.message.split('\n')[0]); }
  save();
}
async function shot(page, name, locator = page) {
  const filename = path.join(out,name+'.png');
  const buffer = await locator.screenshot({path:filename});
  report.screenshots.push(filename); return buffer;
}
async function paint(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function layout(page, width) {
  const result = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert.equal(result.width,width,'Viewport width');
  assert(result.scrollWidth <= width+1,'Horizontal overflow: '+JSON.stringify(result)); return result;
}
async function goto(page, relative) {
  const url = new URL(relative,readerBase);
  const response = await page.goto(url.href,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200,url.href);
  assert.equal(new URL(page.url()).pathname,url.pathname,'No cross-project redirect');
}
async function decode(locator) {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate(async image => {
    await Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Image decode timeout: '+image.src)),20000))]);
    if (!image.naturalWidth) throw new Error('Empty image: '+image.src);
    return {src:image.currentSrc,width:image.naturalWidth,height:image.naturalHeight};
  });
}
async function reader(page, route, lang, view) {
  await goto(page,'?'+route.query+'&lang='+lang);
  await page.locator('#reader[aria-busy="false"]').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  const images = page.locator('.scene-art img');
  assert.equal(await page.locator('.scene .scene-art img').count(),route.count,route.id+' scene count');
  const imageCount = await images.count();
  assert.equal(imageCount,route.count+(route.query.startsWith('chapter=')?1:0),'Scene images plus separate chapter title');
  if (route.query.startsWith('story=')) assert.equal(await page.locator('#reader article').getAttribute('data-story'),route.id);
  const first = await decode(images.first()); await paint(page);
  await layout(page,view.width); await shot(page,`${view.name}-${route.id}-${lang}-first`);
  const last = await decode(images.last()); await paint(page);
  await layout(page,view.width); await shot(page,`${view.name}-${route.id}-${lang}-last`);
  const broken = await images.evaluateAll(nodes => nodes.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));
  assert.deepEqual(broken,[],'No broken completed scene images');
  return {count:route.count,imageCount,first,last};
}
async function ready(page) {
  await page.waitForFunction(() => window.atlasGpuDebug?.renderer && atlasGpuDebug.renderCount>1 &&
    document.getElementById('map-viewport').dataset.mask==='ready' &&
    document.getElementById('map-viewport').dataset.coversLoaded==='true' &&
    atlasGpuDebug.motionCanvas.dataset.sprite==='ready',null,{timeout:60000});
}
async function focus(page,id) {
  await page.evaluate(id => {
    if (!atlasGpuDebug.motion.paused) atlasGpuDebug.motion.toggle();
    atlasGpuDebug.motion.placeAtLocation(id); atlasGpuDebug.focusDestination(id);
  },id);
  await page.waitForFunction(id=>!atlasGpuDebug.moving&&atlasGpuDebug.covers.selected===id,id);
  await page.locator(`.atlas-book[data-destination="${id}"]`).waitFor({state:'visible'});
}
async function atlas(page, view) {
  await page.evaluate(() => {localStorage.removeItem('pinpin.atlas.v1');sessionStorage.clear();});
  await goto(page,'atlas-webgpu.html?lang=en'); await ready(page);
  assert.equal(await page.evaluate(()=>atlasGpuDebug.renderer.backend),'webgpu','Actual WebGPU backend');
  await layout(page,view.width);
  const bounds = await page.locator('#world-canvas').boundingBox();
  assert(Math.abs(bounds.x)<1 && Math.abs(bounds.width-view.width)<1 && bounds.height>600,'Canvas fills viewport');
  const png = await shot(page,view.name+'-atlas-canvas',page.locator('#world-canvas'));
  const pixels = await page.evaluate(async png => {
    const image = new Image(); image.src='data:image/png;base64,'+png; await image.decode();
    const canvas=document.createElement('canvas'); canvas.width=96; canvas.height=64;
    const ctx=canvas.getContext('2d'); ctx.drawImage(image,0,0,96,64);
    const data=ctx.getImageData(0,0,96,64).data, colors=new Set(); let opaque=0;
    for(let i=0;i<data.length;i+=4) { if(data[i+3]>240) opaque++; colors.add([data[i]>>4,data[i+1]>>4,data[i+2]>>4].join(',')); }
    return {opaque,colors:colors.size};
  },png.toString('base64'));
  assert(pixels.opaque>5000&&pixels.colors>40,'Nonblank rendered canvas: '+JSON.stringify(pixels));
  const before = await page.evaluate(()=>({x:atlasGpuDebug.camera.snapshot.x,count:atlasGpuDebug.renderCount}));
  if (view.name==='mobile') {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:260,y:500}]});
    for(const x of [240,220,200]) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:500}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await cdp.detach();
  } else {
    await page.mouse.move(900,500); await page.mouse.down(); await page.mouse.move(780,500,{steps:8}); await page.mouse.up();
  }
  await page.waitForFunction(before=>atlasGpuDebug.renderCount>before.count&&Math.abs(atlasGpuDebug.camera.snapshot.x-before.x)>5,before);
  await shot(page,view.name+'-atlas');
  return {backend:'webgpu',bounds,pixels,nativePan:true};
}
async function elderNavigation(page,view) {
  await ready(page); await focus(page,'elder');
  const book=page.locator('.atlas-book[data-destination="elder"]');
  assert.equal(await book.getAttribute('aria-disabled'),'true','Fresh Elder locked');
  await focus(page,'lake'); await page.locator('.atlas-book[data-destination="lake"]').click();
  await page.locator('#story-preview[open]').waitFor(); await page.locator('#preview-open').click();
  await page.waitForURL(url=>url.searchParams.get('chapter')==='1');
  await page.locator('#reader[aria-busy="false"]').waitFor();
  await page.locator('#reader-map').click(); await ready(page); await focus(page,'elder');
  assert.notEqual(await book.getAttribute('aria-disabled'),'true','Lake unlocks Elder');
  await book.click(); await page.locator('#story-preview[open]').waitFor();
  await decode(page.locator('#preview-image')); await paint(page);
  const href = new URL(await page.locator('#preview-open').getAttribute('href'),page.url());
  assert.equal(readerPath(href),readerBase.pathname); assert.equal(href.origin,readerBase.origin);
  for (const [key,value] of Object.entries({story:'one-day-in-the-forest',lang:'en',returnTo:'atlas-webgpu.html',returnPlace:'elder'})) assert.equal(href.searchParams.get(key),value,key);
  const preview=await page.locator('#story-preview').boundingBox();
  assert(preview.x>=-1&&preview.x+preview.width<=view.width+1,'Preview fits viewport');
  await shot(page,view.name+'-elder-preview');
  await page.locator('#preview-open').click(); await page.waitForURL(href.href);
  await page.locator('#reader[aria-busy="false"]').waitFor();
  assert.equal(await page.locator('article[data-story="one-day-in-the-forest"] .scene-art img').count(),166);
  // Exercise query preservation through a real language change and map-return click.
  await page.locator('#language-toggle').click(); await page.locator('#reader-languages [data-lang="es"]').click();
  await page.waitForFunction(()=>document.documentElement.lang==='es'&&document.getElementById('reader').getAttribute('aria-busy')==='false');
  const returnHref=new URL(await page.locator('#reader-map').getAttribute('href'),page.url());
  assert.equal(returnHref.pathname,new URL('atlas-webgpu.html',readerBase).pathname);
  assert.equal(returnHref.searchParams.get('returnPlace'),'elder'); assert.equal(returnHref.searchParams.get('lang'),'es');
  await page.locator('#reader-map').click(); await page.waitForURL(returnHref.href); await ready(page);
  await page.waitForFunction(()=>atlasGpuDebug.covers.selected==='elder');
  await layout(page,view.width); await shot(page,view.name+'-elder-return');
  return {href:href.href,returnHref:returnHref.href,preview,returnedSelection:'elder'};
}
async function main() {
  const browser=await playwright().chromium.launch({channel:'chrome',headless:true});
  try {
    for (const view of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:1000}]) {
      const context=await browser.newContext({viewport:{width:view.width,height:view.height},deviceScaleFactor:1,isMobile:view.name==='mobile',hasTouch:view.name==='mobile'});
      await context.addInitScript(()=>localStorage.setItem('pinpin.atlas.motion.v1','paused'));
      const page=await context.newPage(); page.setDefaultTimeout(25000); page.setDefaultNavigationTimeout(45000);
      page.on('pageerror',e=>report.pageErrors.push({phase,message:e.message}));
      page.on('console',m=>{if(m.type()==='error') {
        const entry={phase,text:m.text(),location:m.location()};
        // Only the known origin-root favicon 404 is cosmetic; all other console errors fail.
        const favicon=m.location().url===new URL('/favicon.ico',base).href&&m.text().includes('404');
        (favicon?report.expectedNoise:report.consoleErrors).push(entry);
      }});
      page.on('response',r=>{if(r.status()>=400) {
        const entry={phase,status:r.status(),url:r.url()};
        (r.status()===404&&r.url()===new URL('/favicon.ico',base).href?report.expectedNoise:report.httpErrors).push(entry);
      }});
      page.on('requestfailed',r=>{
        const entry={phase,url:r.url(),error:r.failure()?.errorText};
        (entry.error==='net::ERR_ABORTED'?report.expectedNoise:report.requestFailures).push(entry);
      });
      for (const route of legacy) await check(`${view.name} ${route.id} en`,()=>reader(page,route,'en',view));
      if (view.name==='mobile') for (const route of elder) for (const lang of ['en','es','ru']) await check(`${view.name} ${route.id} ${lang}`,()=>reader(page,route,lang,view));
      await check(view.name+' library',async()=>{
        await goto(page,'library.html?lang=en');
        await page.locator('[data-story="one-day-in-the-forest"] a').waitFor();
        const links=await page.locator('.adventure-cover a,.chapter-cover.published a').evaluateAll(nodes=>nodes.map(a=>a.href));
        for (const route of [...legacy,elder[0]]) {
          const [key,value]=route.query.split('=');
          assert(links.some(href=>{const u=new URL(href);return u.origin===readerBase.origin&&readerPath(u)===readerBase.pathname&&u.searchParams.get(key)===value;}),route.id+' library link');
        }
        for (const image of await page.locator('.adventure-cover img').all()) await decode(image);
        await page.evaluate(()=>scrollTo(0,0)); await paint(page); await layout(page,view.width);
        await shot(page,view.name+'-library'); await page.locator('#chapter-library').scrollIntoViewIfNeeded();
        await shot(page,view.name+'-library-chapters'); return {links};
      });
      await check(view.name+' atlas',()=>atlas(page,view));
      await check(view.name+' Elder navigation and query return',()=>elderNavigation(page,view));
      await context.close(); save();
    }
  } finally { await browser.close(); }
  await check('Runtime and network errors',async()=>{
    for(const key of ['pageErrors','consoleErrors','httpErrors','requestFailures']) assert.equal(report[key].length,0,key+': '+JSON.stringify(report[key]));
    return {expectedNoise:report.expectedNoise.length};
  });
}
main().catch(error=>{report.fatal=error.stack;console.error(error);}).finally(()=>{
  report.finished=new Date().toISOString();
  report.pass=!report.fatal&&report.checks.every(c=>c.pass); save();
  console.log(`${report.pass?'PASS':'FAIL'} ${report.checks.filter(c=>c.pass).length}/${report.checks.length}: ${path.join(out,'results.json')}`);
  process.exitCode=report.pass?0:1;
});
