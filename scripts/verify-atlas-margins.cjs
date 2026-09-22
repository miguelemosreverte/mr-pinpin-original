const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base=process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const output='/tmp/pinpin-atlas-margins';
const point=page=>page.evaluate(()=>[Number(atlasGpuDebug.motionCanvas.dataset.x),Number(atlasGpuDebug.motionCanvas.dataset.y)]);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
async function ready(page) {
  await page.waitForFunction(()=>window.atlasGpuDebug?.renderer && window.atlasGpuDebug?.detector);
  await page.waitForFunction(()=>atlasGpuDebug.motionCanvas.dataset.sprite==='ready');
}
async function pixelSample(page) {
  const bytes=await page.locator('#world-canvas').screenshot();
  return page.evaluate(async data=>{
    const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
    const c=document.createElement('canvas');c.width=64;c.height=64;
    const ctx=c.getContext('2d');ctx.drawImage(image,0,0,64,64);
    const rgba=ctx.getImageData(0,0,64,64).data;let opaque=0;const colors=new Set();
    for(let i=0;i<rgba.length;i+=4){if(rgba[i+3]===255)opaque++;colors.add([rgba[i]>>4,rgba[i+1]>>4,rgba[i+2]>>4].join(','));}
    return {opaque,colors:colors.size};
  },bytes.toString('base64'));
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for(const width of [390,1440]) {
      const context=await browser.newContext({viewport:{width,height:width===390?844:1000},isMobile:width===390,hasTouch:width===390});
      await context.addInitScript(()=>{
        if(!localStorage.getItem('pinpin.atlas.v1'))localStorage.setItem('pinpin.atlas.v1',JSON.stringify({version:1,lang:'en',opened:['lake']}));
      });
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'atlas-webgpu.html?lang=en');await ready(page);
      for(const id of ['lake','elder','bridge','home']) {
        await page.evaluate(id=>{
          if(!atlasGpuDebug.motion.paused)atlasGpuDebug.motion.toggle();
          atlasGpuDebug.motion.placeAtLocation(id);
          atlasGpuDebug.focusDestination(id);
        },id);
        await page.waitForFunction(id=>!atlasGpuDebug.moving && atlasGpuDebug.covers.selected===id && document.querySelector(`.atlas-book[data-destination="${id}"] img`)?.naturalWidth>0,id);
        assert.equal(await page.locator('#map-viewport').getAttribute('data-active-cover'),id);
        assert.equal(await page.locator('.atlas-book:visible').count(),1,'Only the character-region cover is visible');
        const before=await page.evaluate(()=>atlasGpuDebug.camera.snapshot);
        const expected=await page.evaluate(id=>{
          const route=atlasGeometry.routes.find(r=>r.id===(id==='lake'||id==='home'?'home-to-lake':'lake-to-'+id));
          const p=id==='home'?route.points[0]:route.points.at(-1);
          return [p[0]*atlasGeometry.width,p[1]*atlasGeometry.height];
        },id);
        await page.locator(`.atlas-book[data-destination="${id}"]`).click();await page.waitForSelector('#story-preview[open]');
        await page.locator('#preview-image').evaluate(img=>img.decode());
        if(id==='home') {
          assert((await page.locator('#preview-image').getAttribute('src')).includes('title-en'),'Home uses English title artwork');
          await page.screenshot({path:`${output}/home-cover-${width}.png`});
        }
        await page.locator('#preview-open').click();await page.waitForSelector('#reader article');
        assert.equal(new URL(page.url()).searchParams.get('returnPlace'),id);
        if(id==='home')assert.equal(await page.locator('article').getAttribute('data-story'),'home-sweet-home');
        await page.locator('#reader-map').click();await ready(page);
        assert.equal(new URL(page.url()).searchParams.get('returnPlace'),id);
        const returned=await point(page);assert(distance(returned,expected)<.1,`${id}: correct road endpoint`);
        await page.waitForFunction(id=>atlasGpuDebug.covers.selected===id,id);
        await page.waitForTimeout(650);assert(distance(await point(page),expected)<.1,`${id}: stays at returned endpoint`);
        const after=await page.evaluate(()=>atlasGpuDebug.camera.snapshot);
        for(const key of ['x','y','scale'])assert(Math.abs(after[key]-before[key])<.01,`${id}: camera ${key} unchanged`);
        await page.screenshot({path:`${output}/${id}-return-${width}.png`});
        console.log(JSON.stringify({width,id,endpoint:returned,cameraPreserved:true,stationaryUntilInteraction:true}));
      }
      await page.evaluate(()=>atlasGpuDebug.camera.focus([0,0],3));
      await page.waitForTimeout(650);
      const canvasBox=await page.locator('#world-canvas').boundingBox();
      await page.mouse.move(width*.5,canvasBox.y+canvasBox.height*.5);
      await page.mouse.down();await page.mouse.move(width*.5+120,canvasBox.y+canvasBox.height*.5+100,{steps:12});await page.mouse.up();
      await page.waitForTimeout(650);
      const outside=await page.evaluate(()=>atlasGpuDebug.camera.snapshot);
      assert(outside.x<0 && outside.y<0,'Real pointer drag can put camera center outside original map');
      assert.deepEqual(await page.locator('#world-canvas').boundingBox(),canvasBox,'Canvas does not move');
      const samples=await pixelSample(page);assert.equal(samples.opaque,4096);assert(samples.colors>40,'Floral exterior is nonblank');
      await page.screenshot({path:`${output}/floral-edge-${width}.png`});
      await page.reload();await ready(page);
      const restored=await page.evaluate(()=>atlasGpuDebug.camera.snapshot);
      assert(Math.abs(restored.x-outside.x)<.01 && Math.abs(restored.y-outside.y)<.01,'Outside-map camera is persisted');
      await page.evaluate(()=>atlasGpuDebug.camera.focus([-1e6,-1e6],3));
      const bounded=await page.evaluate(()=>atlasGpuDebug.camera.snapshot);
      assert(bounded.x-bounded.width/(2*bounded.scale)>=-384-.01);
      assert(bounded.y-bounded.height/(2*bounded.scale)>=-256-.01);
      assert.deepEqual(errors,[]);await context.close();
    }
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.addInitScript(()=>Object.defineProperty(navigator,'gpu',{configurable:true,value:undefined}));
    await page.goto(base+'atlas-webgpu.html');await ready(page);
    await page.evaluate(()=>atlasGpuDebug.camera.focus([-120,-100],3));await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>atlasGpuDebug.renderer.backend),'canvas2d');
    const sample=await pixelSample(page);assert.equal(sample.opaque,4096);assert(sample.colors>40);
    await page.screenshot({path:output+'/floral-fallback.png'});
    console.log(JSON.stringify({canvas2dFloralFallback:true,pixels:sample}));await page.close();
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
