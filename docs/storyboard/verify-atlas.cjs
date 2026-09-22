const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
const output=process.env.ATLAS_TEST_OUTPUT || '/tmp/pinpin-atlas-v3';
const key='pinpin.atlas.v1';
const opened=page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).opened,key);
async function ready(page) {
  await page.waitForSelector('#map-viewport[data-mask="ready"]');
  await page.locator('#map-art').evaluate(image => image.decode());
  await page.waitForTimeout(250);
}
async function focus(page,id,keyboard=false) {
  if (keyboard) await page.locator('[data-place="'+id+'"]').focus();
  else await page.evaluate(id => atlasDebug.focusDestination(id),id);
  await page.waitForFunction(id => atlasDebug.focus.id===id && document.getElementById('map-viewport').dataset.focus===id,id);
}
async function preview(page,id) {
  await focus(page,id,true);
  await page.locator('.atlas-book').click();
  await page.waitForSelector('#story-preview[open]');
  await page.locator('#preview-image').evaluate(image => image.decode());
}
async function layout(page,width) {
  const result=await page.evaluate(() => {
    const art=document.getElementById('map-art').getBoundingClientRect();
    const motion=document.getElementById('map-motion').getBoundingClientRect();
    return {width:document.documentElement.scrollWidth,header:document.querySelector('.atlas-heading').getBoundingClientRect().height,
      leaflet:L.version,crs:atlasDebug.map.options.crs===L.CRS.Simple,
      touch:getComputedStyle(document.getElementById('map-viewport')).touchAction,
      tiles:document.querySelectorAll('.leaflet-tile').length,
      registered:['x','y','width','height'].every(k => Math.abs(art[k]-motion[k])<1),
      canvas:[document.getElementById('map-motion').width,document.getElementById('map-motion').height],
      controls:[...document.querySelectorAll('.map-controls button,.atlas-actions button,.atlas-actions a')].every(e => e.offsetWidth>=44 && e.offsetHeight>=44)};
  });
  assert.equal(result.width,width); assert.equal(result.header,61);
  assert.equal(result.leaflet,'1.9.4'); assert(result.crs && result.registered && result.controls);
  assert.equal(result.tiles,0); assert.equal(result.touch,'none'); assert.deepEqual(result.canvas,[1536,1024]);
}
async function matrix(browser) {
  for (const width of [1440,390,320]) for (const lang of ['en','es','ru']) {
    const context=await browser.newContext({viewport:{width,height:width===1440 ? 1000 : 844},hasTouch:width<600,isMobile:width<600});
    const page=await context.newPage(), errors=[];
    page.on('pageerror',error => errors.push(error.message));
    await page.goto(base+'atlas.html?lang='+lang); await ready(page);
    await layout(page,width);
    assert(await page.locator('#map-art').evaluate(image => {
      const art=image.getBoundingClientRect(), view=document.getElementById('map-viewport').getBoundingClientRect();
      return art.width>=view.width-1 && art.height>=view.height-1;
    }),'Initial image covers the viewport');
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert.equal(await page.locator('.atlas-book').count(),0,'Overview has no book');
    await page.screenshot({path:output+'/'+width+'-'+lang+'-overview.png'});
    await page.locator('#map-viewport').click({position:{x:width/2,y:300}});
    assert(page.url().includes('atlas.html')); assert.deepEqual(await opened(page),[]);
    await focus(page,'bridge',true);
    assert.equal(await page.locator('.atlas-book').count(),1);
    assert.equal(await page.evaluate(() => document.activeElement.className),'atlas-book');
    assert.equal(await page.locator('.atlas-book svg').getAttribute('data-lucide'),'book-open');
    assert.equal(await page.locator('.atlas-book').evaluate(e => getComputedStyle(e).borderRadius),'5px');
    await layout(page,width);
    await page.screenshot({path:output+'/'+width+'-'+lang+'-bridge.png'});
    await page.evaluate(() => {
      window.bookAtZoomStart=null;
      atlasDebug.map.once('zoomstart',() => { window.bookAtZoomStart=document.querySelectorAll('.atlas-book').length; });
    });
    await page.locator('#zoom-in').click();
    await page.waitForFunction(() => window.bookAtZoomStart!==null);
    assert.equal(await page.evaluate(() => window.bookAtZoomStart),0,'Hide book during zoom');
    await page.waitForSelector('.atlas-book');
    await page.locator('.atlas-book').click(); await page.waitForSelector('#story-preview[open]');
    const cover='images/standalone/timber-tractor/title'+(lang==='en' ? '' : '-'+lang)+'-v1.png';
    assert.equal(await page.locator('#preview-image').getAttribute('src'),cover);
    await page.locator('#preview-image').evaluate(image => image.decode());
    const portrait=await page.locator('#preview-image').evaluate(image => ({w:image.naturalWidth,h:image.naturalHeight,
      ratio:image.getBoundingClientRect().width/image.getBoundingClientRect().height,fit:getComputedStyle(image).objectFit}));
    assert.deepEqual([portrait.w,portrait.h],[1024,1536]); assert(Math.abs(portrait.ratio-2/3)<.01); assert.equal(portrait.fit,'contain');
    assert.deepEqual(await opened(page),[],'Preview does not count as opened');
    await page.screenshot({path:output+'/'+width+'-'+lang+'-preview.png'});
    await page.keyboard.press('Escape'); await page.waitForSelector('#story-preview:not([open])',{state:'attached'});
    await page.waitForTimeout(150); assert.deepEqual(await opened(page),[]);
    await page.locator('.atlas-book').click(); await page.waitForSelector('#story-preview[open]');
    await page.goBack(); assert.equal(await page.locator('#story-preview').evaluate(d => d.open),false);
    await page.locator('.atlas-book').click(); await page.waitForSelector('#story-preview[open]');
    await page.locator('#preview-image').click(); await page.waitForURL('**/?story=timber-tractor&lang='+lang);
    await page.waitForSelector('article[data-story="timber-tractor"]');
    assert.equal(await page.locator('.scene-art img').count(),30,'Continuous Timber edition has 30 actual scenes');
    assert.deepEqual(await opened(page),['bridge']);
    await page.goBack(); await ready(page);
    assert.equal(await page.locator('#story-preview').evaluate(d => d.open),false);
    await focus(page,'elder',true);
    assert.equal(await page.locator('.atlas-book').getAttribute('aria-disabled'),'true');
    await page.locator('.atlas-book').click({force:true}); assert.equal(await page.locator('#story-preview').evaluate(d => d.open),false);
    await focus(page,'home',true); assert.equal(await page.locator('.atlas-book').count(),0);
    await page.keyboard.press('Enter'); assert(page.url().includes('atlas.html')); assert.deepEqual(await opened(page),['bridge']);
    await preview(page,'lake');
    assert.equal(await page.locator('#preview-image').getAttribute('src'),'images/chapter-01-direct/01a.png');
    assert.deepEqual(await opened(page),['bridge']);
    await page.locator('#preview-image').click(); await page.waitForURL('**/?chapter=1&lang='+lang);
    assert.deepEqual(await opened(page),['bridge','lake']);
    await page.goBack(); await ready(page);
    await preview(page,'elder');
    assert.equal(await page.locator('#preview-image').getAttribute('src'),'images/chapter-02-direct/scene-01.png');
    await page.locator('#preview-image').click(); await page.waitForURL('**/?chapter=2&lang='+lang);
    assert.deepEqual(await opened(page),['bridge','lake','elder']);
    await page.goBack(); await ready(page);
    await page.locator('#zoom-fit').click(); await page.waitForTimeout(500);
    assert.equal(await page.locator('.atlas-book').count(),0);
    await page.locator('#atlas-library').click(); await page.waitForSelector('#library-atlas');
    assert.equal(await page.locator('#library-atlas').getAttribute('href'),'atlas.html?lang='+lang);
    await page.locator('#library-atlas').click(); await ready(page);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({width,lang,layout:true,focus:true,preview:true,story30:true,locks:true,history:true}));
    await context.close();
  }
}
async function gestures(browser) {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page=await context.newPage(); await page.goto(base+'atlas.html'); await ready(page);
  await focus(page,'bridge');
  const cdp=await context.newCDPSession(page), before=await page.evaluate(() => atlasDebug.map.getZoom());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:145,y:400},{x:245,y:400}]});
  for (let d=10;d<=65;d+=5) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:145-d,y:400},{x:245+d,y:400}]});
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(600);
  const after=await page.evaluate(() => ({zoom:atlasDebug.map.getZoom(),scale:visualViewport.scale}));
  assert(after.zoom>before+.5,'CDP pinch must change Leaflet map zoom'); assert.equal(after.scale,1,'No browser page zoom');
  const start=await page.evaluate(() => atlasDebug.normalized(atlasDebug.map.getCenter()));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:420}]});
  for (let x=280;x>=120;x-=20) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:420}]});
    await page.waitForTimeout(20);
  }
  assert.equal(await page.locator('.atlas-book').count(),0,'Hide book while dragging');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(700);
  const end=await page.evaluate(() => atlasDebug.normalized(atlasDebug.map.getCenter()));
  assert(Math.hypot(end[0]-start[0],end[1]-start[1])>.02,'One-finger drag pans Leaflet');
  assert(page.url().includes('atlas.html')); assert.deepEqual(await opened(page),[]);
  await page.screenshot({path:output+'/native-pinch-drag.png'});
  await page.evaluate(() => atlasDebug.map.setView(atlasDebug.xy([.5,.5]),atlasDebug.fitZoom+1.3));
  await page.waitForTimeout(500); assert.equal(await page.locator('.atlas-book').count(),0,'Ambiguous central view has no book');
  await page.evaluate(() => atlasDebug.map.panTo(atlasDebug.xy([-4,-4]),{animate:false}));
  await page.waitForTimeout(500);
  assert(await page.evaluate(() => { const c=atlasDebug.normalized(atlasDebug.map.getCenter()); return c.every(n=>n>=0&&n<=1); }));
  await page.evaluate(() => atlasDebug.map.setView(atlasDebug.xy([.36,.4]),2,{animate:false}));
  await page.waitForFunction(() => document.querySelector('.atlas-book')?.dataset.destination==='lake');
  const edge=await page.evaluate(() => {
    const map=atlasDebug.map, anchor=map.latLngToContainerPoint(atlasDebug.xy(atlasGeometry.regions.find(r=>r.id==='lake').center));
    const book=document.querySelector('.atlas-book').getBoundingClientRect(), viewport=document.getElementById('map-viewport').getBoundingClientRect();
    return {offscreen:anchor.x>map.getSize().x,visible:book.left>=viewport.left && book.right<=viewport.right && book.top>=viewport.top && book.bottom<=viewport.bottom};
  });
  assert(edge.offscreen && edge.visible,'Lake-edge focus keeps the book visible when the regional anchor is offscreen');
  await page.screenshot({path:output+'/lake-edge-book.png'});
  await context.close();
  const desktop=await browser.newPage({viewport:{width:1440,height:1000}});
  await desktop.goto(base+'atlas.html'); await ready(desktop); await focus(desktop,'bridge');
  const wheelBefore=await desktop.evaluate(() => atlasDebug.map.getZoom());
  await desktop.mouse.move(600,400); await desktop.mouse.wheel(0,-40); await desktop.waitForTimeout(650);
  const wheelAfter=await desktop.evaluate(() => atlasDebug.map.getZoom());
  assert(wheelAfter>wheelBefore && Math.abs(wheelAfter-Math.round(wheelAfter))>.01,'Wheel input changes fractional map zoom');
  assert(desktop.url().includes('atlas.html')); assert.deepEqual(await opened(desktop),[]);
  await desktop.close();
  console.log(JSON.stringify({nativePinch:true,leafletZoom:[before,after.zoom],browserScale:after.scale,oneFingerPan:true,ambiguity:true,bounds:true,lakeEdge:true,fractionalWheel:[wheelBefore,wheelAfter]}));
}
async function resilience(browser) {
  const page=await browser.newPage(); await page.goto(base+'atlas.html'); await ready(page);
  await page.evaluate(key => localStorage.setItem(key,'{broken'),key); await page.reload(); await ready(page);
  assert.deepEqual(await opened(page),[]);
  await page.evaluate(key => localStorage.setItem(key,JSON.stringify({version:1,lang:'xx',opened:['elder','unknown','home']})),key);
  await page.reload(); await ready(page); assert.deepEqual(await opened(page),[]);
  await page.locator('[data-lang="es"]').click(); await page.locator('[data-lang="ru"]').click();
  await page.goBack(); assert.equal(await page.locator('html').getAttribute('lang'),'es');
  await preview(page,'bridge');
  await page.locator('[data-lang="ru"]').evaluate(button => button.click());
  assert.equal(await page.locator('#story-preview').evaluate(d => d.open),false,'Language change dismisses an open preview');
  await page.locator('.atlas-book').click(); await page.waitForSelector('#story-preview[open]');
  assert.equal(await page.locator('#preview-image').getAttribute('src'),'images/standalone/timber-tractor/title-ru-v1.png');
  assert.equal(await page.locator('#preview-open').getAttribute('href'),'./?story=timber-tractor&lang=ru');
  await page.locator('#preview-close').click(); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => document.activeElement.className),'atlas-book','Close restores book focus without a fly-to loop');
  await page.locator('#motion-toggle').click(); await page.reload(); await ready(page);
  assert.equal(await page.locator('#map-motion').getAttribute('data-running'),'false');
  await page.close();
  const reduced=await browser.newContext({reducedMotion:'reduce'}), still=await reduced.newPage();
  await still.goto(base+'atlas.html'); await ready(still);
  assert.equal(await still.locator('#map-motion').getAttribute('data-running'),'false'); await reduced.close();
  const blocked=await browser.newPage();
  await blocked.addInitScript(() => Object.defineProperty(window,'localStorage',{get() { throw new DOMException('Blocked','SecurityError'); }}));
  await blocked.goto(base+'atlas.html?lang=ru'); await ready(blocked); await preview(blocked,'lake');
  await blocked.locator('#preview-image').click(); await blocked.waitForURL('**/?chapter=1&lang=ru'); await blocked.close();
  const missing=await browser.newPage(); await missing.route('**/*shire-regions*',route=>route.abort());
  await missing.goto(base+'atlas.html'); await missing.waitForSelector('#map-viewport[data-mask="unavailable"]');
  await missing.locator('#map-art').evaluate(i=>i.decode()); assert.equal(await missing.locator('.atlas-book').count(),0);
  await missing.locator('#atlas-library').click(); await missing.waitForURL('**/library.html?lang=en'); await missing.close();
  console.log('Malformed/blocked storage, pause persistence, reduced motion, missing-mask library escape passed.');
}
async function motionIntegration(browser) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(() => {
    window.motionCalls=[]; window.routeStrokes=[];
    const stroke=CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.stroke=function(...args) {
      if (this.canvas.id==='map-motion' && window.routeStrokes.length<300) window.routeStrokes.push({color:this.strokeStyle,dash:this.getLineDash()});
      return stroke.apply(this,args);
    };
    let api;
    Object.defineProperty(window,'AtlasMotion',{get() { return api; },set(value) {
      api=value; const create=value.create;
      value.create=(...args) => {
        const controller=create(...args), target=controller.setTarget;
        controller.setTarget=point => { window.motionCalls.push(point); return target(point); };
        return controller;
      };
    }});
  });
  await page.goto(base+'atlas.html'); await ready(page);
  await page.waitForSelector('#map-motion[data-sprite="ready"]');
  assert.equal(await page.evaluate(() => motionCalls.length),0,'Load/settle preserves the initial Home-to-Lake walk');
  const strokes=await page.evaluate(() => routeStrokes);
  assert(strokes.length>0 && strokes.every(s=>s.color==='#ffffff' && s.dash.join(',')==='5,11'),'Routes are white dashed strokes with no solid underlay');
  assert.equal(await page.evaluate(() => atlasDirections.directions.length),12);
  const pixels=await page.locator('#map-motion').evaluate(canvas => {
    const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let count=0; for(let i=3;i<rgba.length;i+=4) if(rgba[i]) count++; return count;
  });
  assert(pixels>1000,'Canvas contains actual route/sprite pixels');
  const position=() => page.locator('#map-motion').evaluate(c=>[Number(c.dataset.x),Number(c.dataset.y)]);
  const before=await position(); await page.waitForTimeout(350); const after=await position();
  assert(Math.hypot(after[0]-before[0],after[1]-before[1])>1,'Sprite moves');
  await page.locator('#motion-toggle').click(); const paused=await position();
  await focus(page,'bridge');
  assert.deepEqual(await position(),paused,'Changing map focus does not reset the paused sprite');
  assert.equal(await page.locator('#map-motion').getAttribute('data-focus'),'bridge');
  assert((await page.evaluate(() => motionCalls.length))>0);
  await page.screenshot({path:output+'/motion-integration.png'});
  await page.close(); console.log(JSON.stringify({initialWalk:true,whiteDashedOnly:true,directions:12,canvasPixels:pixels,spriteMovement:true,noPositionReset:true}));
}
async function main() {
  fs.mkdirSync(output,{recursive:true});
  for (const [file,hash] of [['leaflet.js','20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='],['leaflet.css','p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=']]) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'vendor/leaflet',file))).digest('base64'),hash);
  }
  const browser=await chromium.launch({headless:true,channel:process.env.CHROME_CHANNEL || 'chrome'});
  const suite=process.env.ATLAS_TEST_SUITE;
  try {
    if (!suite || suite==='matrix') await matrix(browser);
    if (!suite || suite==='gestures') await gestures(browser);
    if (!suite || suite==='resilience') await resilience(browser);
    if (!suite || suite==='motion') await motionIntegration(browser);
  }
  finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
