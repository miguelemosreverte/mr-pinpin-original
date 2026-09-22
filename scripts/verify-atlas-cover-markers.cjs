const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base=process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const output='/tmp/pinpin-cover-markers';
const destinations=['bridge','elder','home','lake'];
const book=(page,id)=>page.locator(`.atlas-book[data-destination="${id}"]`);
async function focus(page,id) {
  await page.evaluate(id=>{
    if(!atlasGpuDebug.motion.paused)atlasGpuDebug.motion.toggle();
    atlasGpuDebug.motion.placeAtLocation(id);
    atlasGpuDebug.focusDestination(id);
  },id);
  await page.waitForFunction(id=>!atlasGpuDebug.moving && document.querySelector(`.atlas-book[data-destination="${id}"] img`)?.naturalWidth>0,id);
  await book(page,id).waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>atlasGpuDebug.covers.selected),id);
  assert.equal(await page.locator('.atlas-book:visible').count(),1,'Only the character-nearest cover is visible');
}
async function anchored(page,id) {
  const value=await book(page,id).evaluate((el,id)=>{
    const rect=el.getBoundingClientRect(), viewport=document.getElementById('map-viewport').getBoundingClientRect();
    const p=atlasGpuDebug.camera.worldToScreen(atlasGpuDebug.world(atlasGeometry.regions.find(r=>r.id===id).center));
    return {dx:rect.x+rect.width/2-viewport.x-p[0],dy:rect.y+rect.height/2-viewport.y-p[1]};
  },id);
  assert(Math.abs(value.dx)<1 && Math.abs(value.dy)<1,`${id}: cover follows its world anchor`);
}
async function persistent(page) {
  assert.deepEqual(await page.locator('.atlas-book').evaluateAll(nodes=>nodes.map(el=>el.dataset.destination).sort()),destinations);
  assert(await page.evaluate(()=>window.markerNodes.every(el=>el.isConnected && document.querySelector(`.atlas-book[data-destination="${el.dataset.destination}"]`)===el)),'Panning and focusing preserve marker nodes');
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for(const width of process.env.ATLAS_MARKER_WIDTH ? [Number(process.env.ATLAS_MARKER_WIDTH)] : [320,390,1440]) {
      const context=await browser.newContext({viewport:{width,height:width<600?844:1000},isMobile:width<600,hasTouch:width<600});
      await context.addInitScript(()=>localStorage.setItem('pinpin.atlas.motion.v1','paused'));
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      for(const lang of ['en','es','ru']) {
        await page.goto(base+'atlas-webgpu.html?lang='+lang);
        await page.waitForFunction(()=>window.atlasGpuDebug?.renderer && window.atlasGpuDebug?.detector && document.getElementById('map-viewport').dataset.coversLoaded==='true');
        await page.evaluate(()=>{window.markerNodes=[...document.querySelectorAll('.atlas-book')];});
        await persistent(page);
        for(const id of ['lake','elder','bridge','home']) {
          await focus(page,id);
          const marker=book(page,id);
          const expected=await page.evaluate(async({id,lang})=>await AtlasStories.preview(id,lang),{id,lang});
          assert.equal(await marker.locator('img').getAttribute('src'),expected.src);
          assert.equal(await marker.locator('svg').count(),0);
          const box=await marker.boundingBox();
          const viewport=await page.locator('#map-viewport').boundingBox();
          assert(box.width>=160 && box.height>=240,'Cover has a readable 160x240 minimum');
          assert(box.x>=viewport.x && box.x+box.width<=viewport.x+viewport.width+1);
          assert(box.y>=viewport.y && box.y+box.height<=viewport.y+viewport.height+1);
          await anchored(page,id);
          assert.equal(await marker.locator('img').evaluate(img=>getComputedStyle(img).objectFit),'contain','Full artwork, no cropping');
          if(id==='elder') {
            assert.equal(await marker.getAttribute('aria-disabled'),'true');
            await marker.click({force:true});
            assert(!await page.locator('#story-preview').evaluate(d=>d.open));
          } else {
            await marker.click();await page.waitForSelector('#story-preview[open]');
            assert.equal(await page.locator('#preview-image').getAttribute('src'),expected.src,'Thumbnail and full preview agree');
            await page.locator('#preview-close').click();
            await page.waitForFunction(()=>!document.getElementById('story-preview').open);
            await page.waitForTimeout(200);
          }
          await persistent(page);
          if(id==='home')await page.screenshot({path:`${output}/home-${width}-${lang}.png`});
        }
      }
      // All anchors are in view; only the paused character's nearest cover appears.
      await page.evaluate(()=>atlasGpuDebug.camera.fit());
      await page.waitForTimeout(250);
      await persistent(page);
      assert.equal(await page.locator('.atlas-book:visible').count(),1,'Overview exposes only the character-nearest cover');
      assert.equal(await page.evaluate(()=>atlasGpuDebug.covers.selected),'home');
      for(const id of destinations)if(await book(page,id).isVisible())await anchored(page,id);
      await focus(page,'bridge');
      await page.evaluate(()=>{
        const s=atlasGpuDebug.camera.snapshot;
        const center=atlasGpuDebug.world(atlasGeometry.regions.find(r=>r.id==='bridge').center);
        atlasGpuDebug.camera.focus(center,2*Math.max(s.width/1536,s.height/1024));
      });
      await page.waitForTimeout(650);
      const marker=book(page,'bridge'), small=await marker.locator('img').boundingBox();
      assert(Math.abs(small.width-160)<1 && Math.abs(small.height-240)<1,'Opening cover is 160x240 at 2x initial cover scale');
      const center={x:small.x+small.width/2,y:small.y+small.height/2};
      await page.screenshot({path:`${output}/compact-${width}.png`});
      await page.mouse.move(center.x,center.y);await page.mouse.wheel(0,-1/.0022);
      await page.waitForTimeout(40);
      assert(await marker.isVisible(),'Cover stays visible during wheel zoom');
      const larger=await marker.locator('img').boundingBox(), viewport=await page.locator('#map-viewport').boundingBox();
      const ratio=Math.min(2,(viewport.width-16)/160,(viewport.height-16)/240);
      assert(Math.abs(larger.width-small.width*ratio)<1 && Math.abs(larger.height-small.height*ratio)<1,'Cover grows with map scale up to its viewport cap');
      assert(Math.abs(larger.x+larger.width/2-center.x)<1 && Math.abs(larger.y+larger.height/2-center.y)<1,'Growth is centered at the zoom anchor');
      await anchored(page,'bridge');
      await page.waitForTimeout(650);
      await page.screenshot({path:`${output}/zoomed-${width}.png`});
      if(width===390) {
        const cdp=await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x-80,y:center.y},{x:center.x+80,y:center.y}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x-120,y:center.y},{x:center.x+120,y:center.y}]});
        await page.waitForTimeout(40);
        assert(await marker.isVisible(),'Cover stays visible during native touch pinch');
        const pinched=await marker.locator('img').boundingBox();
        const pinchRatio=Math.min(3,(viewport.width-16)/160,(viewport.height-16)/240);
        assert(Math.abs(pinched.width-small.width*pinchRatio)<1 && Math.abs(pinched.height-small.height*pinchRatio)<1,'Pinch scales the cover with a viewport cap');
        assert(Math.abs(pinched.x+pinched.width/2-center.x)<1,'Pinch keeps cover centered');
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await page.waitForTimeout(650);
      }
      await focus(page,'bridge');
      const beforePan=await marker.boundingBox();
      const c=await page.locator('#world-canvas').boundingBox();
      await page.mouse.move(c.x+16,c.y+20);await page.mouse.down();
      await page.mouse.move(c.x+86,c.y+70,{steps:8});
      assert(await marker.isVisible(),'In-view cover stays visible while dragging');
      const duringPan=await marker.boundingBox();
      assert(Math.abs(duringPan.x-beforePan.x-70)<1 && Math.abs(duringPan.y-beforePan.y-50)<1,'Cover moves with the dragged world');
      await anchored(page,'bridge');await persistent(page);
      await page.mouse.up();
      assert(!await page.locator('#story-preview').evaluate(d=>d.open),'Dragging does not open a preview');
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({width,localizedCovers:12,uncropped:true,locked:true,persistentMarkers:4,oneCharacterCover:true,minimumCover:true,zoomGrowthCentered:true,panAnchored:true}));
      await context.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
