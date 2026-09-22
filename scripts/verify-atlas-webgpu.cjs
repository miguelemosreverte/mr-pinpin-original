const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
const output=process.env.ATLAS_TEST_OUTPUT || '/tmp/pinpin-webgpu-ui';
const stateKey='pinpin.atlas.v1';
const expectedTimberScenes=Number(process.env.ATLAS_EXPECTED_TIMBER_SCENES || 34);
const camera=page => page.evaluate(() => atlasGpuDebug.camera.snapshot);
const opened=page => page.evaluate(key => JSON.parse(localStorage.getItem(key))?.opened || [],stateKey);
const book=(page,id)=>page.locator(`.atlas-book[data-destination="${id}"]`);
async function persistent(page) {
  assert.deepEqual(await page.locator('.atlas-book').evaluateAll(nodes=>nodes.map(el=>el.dataset.destination).sort()),['bridge','elder','home','lake']);
  const state=await page.evaluate(()=>{
    const d=atlasGpuDebug;
    return {selected:d.covers.selected,active:document.getElementById('map-viewport').dataset.activeCover,
      nearest:d.detector.nearestRegionAt([Number(d.motionCanvas.dataset.x)/atlasGeometry.width,Number(d.motionCanvas.dataset.y)/atlasGeometry.height]),
      visible:[...document.querySelectorAll('.atlas-book')].filter(el=>!el.hidden).map(el=>el.dataset.destination)};
  });
  assert.equal(state.selected,state.nearest,'Active cover follows actual character position');
  assert.equal(state.active,state.selected);
  assert(state.visible.length<=1,'At most one cover is visible, with offscreen clipping allowed');
  assert(state.visible.every(id=>id===state.selected));
}
async function ready(page) {
  await page.waitForFunction(() => window.atlasGpuDebug?.renderer && atlasGpuDebug.renderCount>1 && document.getElementById('map-viewport').dataset.mask==='ready');
  await page.waitForFunction(() => atlasGpuDebug.motionCanvas.dataset.sprite==='ready');
  await page.waitForFunction(() => document.getElementById('map-viewport').dataset.coversLoaded==='true');
}
async function settled(page) {
  await page.waitForFunction(() => !atlasGpuDebug.moving);
  await page.waitForTimeout(180);
}
async function layout(page) {
  const value=await page.evaluate(() => {
    const canvas=document.getElementById('world-canvas'), rect=canvas.getBoundingClientRect();
    const header=document.querySelector('.atlas-heading').getBoundingClientRect();
    return {canvas:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},header:{x:header.x,y:header.y,height:header.height},
      width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollY,scale:visualViewport.scale,
      transform:getComputedStyle(canvas).transform,touch:getComputedStyle(canvas).touchAction,
      canvases:document.querySelectorAll('canvas').length,offscreen:!atlasGpuDebug.motionCanvas.isConnected};
  });
  assert.equal(value.header.height,61); assert.equal(value.header.y,0);
  assert.deepEqual(value.canvas,{x:0,y:61,width:value.width,height:value.height-61});
  assert.equal(value.scrollWidth,value.width); assert.equal(value.scrollY,0); assert.equal(value.scale,1);
  assert.equal(value.transform,'none'); assert.equal(value.touch,'none');
  assert.equal(value.canvases,1); assert(value.offscreen);
  return value;
}
async function pixels(page,name) {
  const screenshot=await page.locator('#world-canvas').screenshot({path:path.join(output,name+'-canvas.png')});
  const result=await page.evaluate(async png => {
    // Presented WebGPU textures expire; inspect the compositor's actual canvas capture.
    const source=new Image(); source.src='data:image/png;base64,'+png; await source.decode();
    const bitmap=await createImageBitmap(source), sample=document.createElement('canvas');
    sample.width=96; sample.height=64;
    const ctx=sample.getContext('2d',{willReadFrequently:true}); ctx.drawImage(bitmap,0,0,96,64); bitmap.close();
    const data=ctx.getImageData(0,0,96,64).data, colors=new Set(); let opaque=0;
    for (let i=0;i<data.length;i+=4) {
      if (data[i+3]>240) opaque++;
      colors.add([data[i]>>4,data[i+1]>>4,data[i+2]>>4].join(','));
    }
    return {opaque,colors:colors.size};
  },screenshot.toString('base64'));
  assert(result.opaque>5000,'World canvas is opaque and nonblank');
  assert(result.colors>40,'World canvas contains varied actual art pixels');
  return result;
}
async function focus(page,id) {
  await page.evaluate(id => {
    if(!atlasGpuDebug.motion.paused)atlasGpuDebug.motion.toggle();
    atlasGpuDebug.motion.placeAtLocation(id);
    atlasGpuDebug.focusDestination(id);
  },id); await settled(page);
  await page.waitForFunction(id=>atlasGpuDebug.covers.selected===id,id);
  await book(page,id).waitFor({state:'visible'});
}
async function closePreview(page) {
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('story-preview').open);
  await page.waitForTimeout(120);
}
async function desktop(browser) {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',error => errors.push(error.message));
  await page.goto(base+'atlas-webgpu.html'); await ready(page);
  const initial=await camera(page), bounds=await layout(page);
  assert.equal(initial.scale,2*Math.max(1440/1536,939/1024),'Fresh camera is exactly 2x cover');
  const backend=await page.evaluate(async () => ({actual:atlasGpuDebug.renderer.backend,
    available:Boolean(navigator.gpu && await navigator.gpu.requestAdapter()),stats:atlasGpuDebug.renderer.stats}));
  if (backend.available) assert.equal(backend.actual,'webgpu','Use actual WebGPU when available');
  await page.mouse.move(760,480); await page.mouse.down();
  await page.mouse.move(570,340,{steps:16});
  await persistent(page);
  await page.mouse.up(); await settled(page);
  const dragged=await camera(page);
  assert(Math.abs(dragged.x-initial.x)>40,'Fresh mouse drag changes camera X before any zoom');
  assert(Math.abs(dragged.y-initial.y)>40,'Fresh mouse drag changes camera Y before any zoom');
  assert.deepEqual(await layout(page),bounds,'Dragging never moves the canvas or header');
  const canvasPixels=await pixels(page,'desktop');
  await page.screenshot({path:path.join(output,'desktop-drag.png')});
  await page.mouse.wheel(0,-75); await settled(page);
  assert((await camera(page)).scale>dragged.scale,'Wheel zooms world camera');
  await page.evaluate(() => { if (!atlasGpuDebug.motion.paused) atlasGpuDebug.motion.toggle(); });
  await page.waitForTimeout(1100);
  const count=await page.evaluate(() => atlasGpuDebug.renderCount);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => atlasGpuDebug.renderCount),count,'Paused settled controller stops rAF');
  const still=await page.evaluate(() => [atlasGpuDebug.motionCanvas.dataset.x,atlasGpuDebug.motionCanvas.dataset.y]);
  await page.locator('#world-canvas').focus(); await page.keyboard.press('ArrowRight'); await settled(page);
  assert.deepEqual(await page.evaluate(() => [atlasGpuDebug.motionCanvas.dataset.x,atlasGpuDebug.motionCanvas.dataset.y]),still);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({desktopFreshDrag:true,bothAxes:true,initial,dragged,backend,canvasPixels}));
  await page.close();
}
async function mobile(browser) {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page=await context.newPage(); await page.goto(base+'atlas-webgpu.html'); await ready(page);
  const initial=await camera(page), bounds=await layout(page), cdp=await context.newCDPSession(page);
  assert.equal(initial.scale,2*Math.max(390/1536,783/1024));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:280,y:510}]});
  for (let i=1;i<=12;i++) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:280-i*10,y:510-i*8}]});
    await page.waitForTimeout(16);
  }
  await persistent(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await settled(page);
  const dragged=await camera(page);
  assert(Math.abs(dragged.x-initial.x)>30 && Math.abs(dragged.y-initial.y)>30,'Fresh touch pan changes both axes');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:145,y:410},{x:245,y:410}]});
  for (let i=1;i<=12;i++) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:145-i*5,y:410},{x:245+i*5,y:410}]});
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await settled(page);
  assert((await camera(page)).scale>dragged.scale*1.8,'CDP pinch changes world scale');
  assert.deepEqual(await layout(page),bounds,'Touch gestures keep viewport and header fixed');
  await pixels(page,'mobile'); await page.screenshot({path:path.join(output,'mobile-pinch.png')});
  assert.deepEqual(await opened(page),[]); assert(page.url().includes('atlas-webgpu.html'));
  console.log(JSON.stringify({mobilePan:true,mobilePinch:true,fixedCanvas:true,browserScale:1}));
  await context.close();
}
async function stories(browser) {
  for (const lang of ['en','es','ru']) {
    const page=await browser.newPage({viewport:{width:lang==='en' ? 1440 : 320,height:lang==='en' ? 1000 : 740},hasTouch:lang!=='en',isMobile:lang!=='en'});
    await page.goto(base+'atlas-webgpu.html?lang='+lang); await ready(page);
    await focus(page,'bridge');
    await persistent(page);
    assert.equal(await book(page,'bridge').locator('svg').count(),0,'Location uses cover artwork, not a placeholder icon');
    await book(page,'bridge').locator('img').evaluate(image=>image.decode());
    assert.equal(await page.locator('#story-preview').evaluate(d=>d.open),false,'Focusing a destination does not open its preview');
    assert.deepEqual(await opened(page),[]);
    if(lang==='en')await book(page,'bridge').click();
    else await book(page,'bridge').tap();
    await page.waitForSelector('#story-preview[open]');
    const cover='images/covers/timber-tractor/title-'+lang+'-v1.png';
    assert.equal(await page.locator('#preview-image').getAttribute('src'),cover);
    await page.locator('#preview-image').evaluate(image=>image.decode());
    assert.deepEqual(await opened(page),[],'Cover does not count as opened');
    assert(page.url().includes('atlas-webgpu.html'),'First marker tap stays on the atlas');
    await page.screenshot({path:path.join(output,lang+'-cover.png')});
    await closePreview(page);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.destination),'bridge','Dismissal returns focus to the same destination');
    await book(page,'bridge').click(); await page.waitForSelector('#story-preview[open]');
    await page.locator('#preview-image').click();
    await page.waitForURL(url => url.searchParams.get('story')==='timber-tractor' && url.searchParams.get('lang')===lang);
    await page.waitForSelector('article[data-story="timber-tractor"]');
    const timberScenes=await page.locator('.scene-art img').count();
    assert.equal(timberScenes,expectedTimberScenes,'Shared Timber reader scene count');
    assert.deepEqual(await opened(page),['bridge']);
    await page.goBack(); await ready(page);
    await focus(page,'elder'); assert.equal(await book(page,'elder').getAttribute('aria-disabled'),'true');
    await book(page,'elder').click({force:true}); assert.equal(await page.locator('#story-preview').evaluate(d=>d.open),false);
    await focus(page,'home');
    await book(page,'home').click(); await page.waitForSelector('#story-preview[open]');
    assert((await page.locator('#preview-image').getAttribute('src')).includes('home-sweet-home/'), 'Home uses its own cover');
    assert.equal(new URL(await page.locator('#preview-open').getAttribute('href'),page.url()).searchParams.get('story'),'home-sweet-home');
    await closePreview(page);
    await focus(page,'lake'); await book(page,'lake').click(); await page.waitForSelector('#story-preview[open]');
    assert.equal(await page.locator('#preview-image').getAttribute('src'),'images/chapter-01-direct/01a.png');
    await page.locator('#preview-image').click();
    await page.waitForURL(url => url.searchParams.get('chapter')==='1' && url.searchParams.get('lang')===lang);
    assert.deepEqual(await opened(page),['bridge','lake']);
    await page.goBack(); await ready(page); await focus(page,'elder');
    assert.notEqual(await book(page,'elder').getAttribute('aria-disabled'),'true');
    assert(await book(page,'elder').isEnabled(),'Lake unlocks the persistent elder marker');
    await book(page,'elder').click(); await page.waitForSelector('#story-preview[open]');
    assert.equal(await page.locator('#preview-image').getAttribute('src'),'images/chapter-02-direct/scene-01.png');
    await closePreview(page); await layout(page);
    console.log(JSON.stringify({lang,persistentMarkers:4,twoTapReader:true,actualCover:true,timberScenes,lockUnlock:true,homeCover:true}));
    await page.close();
  }
}
async function arrival(browser) {
  for (const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:width===1440 ? 1000 : 844}});
    await page.goto(base+'atlas-webgpu.html'); await ready(page);
    await persistent(page);
    const initial=await camera(page);
    await page.evaluate(()=>{if(!atlasGpuDebug.motion.paused)atlasGpuDebug.motion.toggle();atlasGpuDebug.motion.placeAtLocation('home');});
    await page.waitForFunction(()=>atlasGpuDebug.covers.selected==='home');
    assert.equal(await page.evaluate(()=>atlasGpuDebug.covers.selected),'home');
    if (width<600) {
      assert.equal(initial.x,1536*.30,'Mobile starts at the original Home framing');
      assert.equal(initial.y,1024*.5);
      assert.equal(initial.scale,2*Math.max(initial.width/1536,initial.height/1024));
      assert(!await book(page,'lake').isVisible(),'Offscreen lake is clipped at its world position');
    }
    await page.evaluate(()=>atlasGpuDebug.motion.placeAtLocation('lake'));
    await page.waitForFunction(()=>atlasGpuDebug.covers.selected==='lake');
    assert.deepEqual(await camera(page),initial,'Changing character location never automatically moves camera');
    assert(!await book(page,'home').isVisible(),'Previous region cover is hidden after character placement');
    await persistent(page);
    await page.evaluate(()=>atlasGpuDebug.focusDestination('lake'));await settled(page);
    await book(page,'lake').waitFor({state:'visible'});
    await persistent(page);
    assert.equal(await page.locator('#story-preview').evaluate(d=>d.open),false);
    assert.deepEqual(await opened(page),[]);
    await page.screenshot({path:path.join(output,width+'-arrival.png')});
    console.log(JSON.stringify({width,persistentMarkers:4,characterSelectsCover:true,cameraPreservedOnPlacement:true})); await page.close();
  }
}
async function fallback(browser) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>Object.defineProperty(navigator,'gpu',{configurable:true,value:undefined}));
  await page.goto(base+'atlas-webgpu.html'); await ready(page);
  assert.equal(await page.evaluate(()=>atlasGpuDebug.renderer.backend),'canvas2d');
  assert.equal(await page.locator('#world-canvas').getAttribute('data-dof'),'off');
  await pixels(page,'fallback'); await focus(page,'bridge');
  await book(page,'bridge').click(); await page.waitForSelector('#story-preview[open]');
  await page.screenshot({path:path.join(output,'fallback-cover.png')});
  console.log(JSON.stringify({explicitNoGpuFallback:true,coverWorks:true})); await page.close();
}
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:process.env.CHROME_CHANNEL || 'chrome'});
  const suites={desktop,mobile,stories,arrival,fallback};
  try {
    for (const [name,run] of Object.entries(suites)) if (!process.env.ATLAS_TEST_SUITE || process.env.ATLAS_TEST_SUITE===name) await run(browser);
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
