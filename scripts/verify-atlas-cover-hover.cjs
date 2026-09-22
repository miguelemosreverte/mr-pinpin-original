const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base=process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const destinations=['home','lake','elder','bridge'];
const book=(page,id)=>page.locator(`.atlas-book[data-destination="${id}"]`);

async function ready(page) {
  await page.waitForFunction(()=>window.atlasGpuDebug?.renderer && window.atlasGpuDebug?.detector && atlasGpuDebug.renderCount>1);
  await page.waitForSelector('#map-viewport[data-covers-loaded="true"]');
  await page.evaluate(()=>{
    const preview=AtlasStories.preview;
    coverProbe.publicCalls=[];
    AtlasStories.preview=function(...args){coverProbe.publicCalls.push(args);return preview.apply(this,args);};
  });
}
async function settled(page) {
  await page.waitForFunction(()=>!atlasGpuDebug.moving);
  await page.waitForTimeout(220);
}
async function loaded(page,id) {
  await page.waitForFunction(id=>{
    const book=document.querySelector(`.atlas-book[data-destination="${id}"]`),img=book?.querySelector('img');
    return book?.dataset.destination===id && !book.hidden && img?.complete && img.naturalWidth>0;
  },id);
}
async function focus(page,id) {
  await page.evaluate(id=>{
    const d=atlasGpuDebug,s=d.camera.snapshot;
    if(!d.motion.paused)d.motion.toggle();
    d.motion.placeAtLocation(id);
    d.camera.focus(d.world(atlasGeometry.regions.find(r=>r.id===id).center),2*Math.max(s.width/1536,s.height/1024));
  },id);
  await settled(page); await loaded(page,id);
}
function center(box) { return {x:box.x+box.width/2,y:box.y+box.height/2}; }
function near(actual,expected,message,tolerance=1.2) {
  assert(Math.abs(actual-expected)<tolerance,`${message}: ${actual} vs ${expected}`);
}
async function imageBox(page,id='home') { return book(page,id).locator('img').boundingBox(); }
async function measure(page,id='home') {
  const box=await imageBox(page,id),viewport=await page.locator('#map-viewport').boundingBox();
  assert(box && box.width>=159.9 && box.height>=239.9,`Visible artwork minimum 160x240: ${JSON.stringify(box)}`);
  assert(box.x>=viewport.x && box.y>=viewport.y && box.x+box.width<=viewport.x+viewport.width+1 && box.y+box.height<=viewport.y+viewport.height+1,'Cover stays inside map viewport');
  near(box.width/box.height,2/3,'Portrait proportions',.01);
  assert.equal(await book(page,id).locator('img').evaluate(img=>getComputedStyle(img).objectFit),'contain');
  return box;
}
async function instrument(page) {
  await page.addInitScript(()=>{
    localStorage.setItem('pinpin.atlas.motion.v1','paused');
    const probe=window.coverProbe={arrivals:[],calls:[],assets:{},fetches:0,originalPreview:null};
    const originalFetch=window.fetch;
    window.fetch=function(...args){probe.fetches++;return originalFetch.apply(this,args);};
    let motion,stories;
    // Observe production callbacks without synthesizing arrivals or replacing navigation.
    Object.defineProperty(window,'AtlasMotion',{configurable:true,get:()=>motion,set(value){
      const original=value.create;
      value.create=function(canvas,geometry,onChange){
        return original.call(this,canvas,geometry,event=>{
          if(event?.type==='arrival') probe.arrivals.push({point:event.point,selection:window.atlasGpuDebug?.selection || null});
          return onChange(event);
        });
      };
      motion=value;
    }});
    Object.defineProperty(window,'AtlasStories',{configurable:true,get:()=>stories,set(value){
      const original=value.preview;
      probe.originalPreview=(...args)=>original.apply(value,args);
      value.preview=async function(...args){
        probe.calls.push(args);
        const asset=await original.apply(this,args);
        probe.assets[args.join(':')]=asset;
        return asset;
      };
      stories=value;
    }});
  });
}
async function startWatch(page,ids=destinations) {
  await page.evaluate(ids=>{
    const p=coverProbe;
    p.tracked=ids.map(id=>{
      const book=document.querySelector(`.atlas-book[data-destination="${id}"]`),img=book.querySelector('img');
      return {id,book,img,src:img.getAttribute('src'),naturalWidth:img.naturalWidth};
    });
    p.watch={removed:0,added:0,srcChanges:0,badFrames:0,frames:0,calls:p.publicCalls.length,loads:p.calls.length,fetches:p.fetches,arrivals:p.arrivals.length};
    p.watching=true;
    p.observer=new MutationObserver(records=>{
      for(const record of records) {
        if(record.type==='attributes' && p.tracked.some(t=>record.target===t.img)) p.watch.srcChanges++;
        for(const node of record.removedNodes) if(node.nodeType===1 && (node.matches('.atlas-book') || p.tracked.some(t=>node.contains(t.book)))) p.watch.removed++;
        for(const node of record.addedNodes) if(node.nodeType===1 && (node.matches('.atlas-book') || node.querySelector('.atlas-book'))) p.watch.added++;
      }
    });
    p.observer.observe(document.getElementById('map-viewport'),{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    function sample(){
      if(!p.watching)return;
      p.watch.frames++;
      const d=atlasGpuDebug,selected=d.covers.selected;
      const nearest=d.detector.nearestRegionAt([Number(d.motionCanvas.dataset.x)/atlasGeometry.width,Number(d.motionCanvas.dataset.y)/atlasGeometry.height]);
      const visible=[...document.querySelectorAll('.atlas-book')].filter(book=>!book.hidden);
      if(selected!==nearest || document.getElementById('map-viewport').dataset.activeCover!==selected || visible.length>1 || visible.some(book=>book.dataset.destination!==selected))p.watch.badFrames++;
      for(const {id,book,img,src,naturalWidth} of p.tracked) {
        const style=getComputedStyle(img),rect=img.getBoundingClientRect();
        if(document.querySelector(`.atlas-book[data-destination="${id}"]`)!==book || !book.isConnected || img.naturalWidth!==naturalWidth || img.getAttribute('src')!==src) p.watch.badFrames++;
        if(!book.hidden && (!rect.width || !rect.height || style.visibility!=='visible' || style.display==='none' || Number(style.opacity)===0))p.watch.badFrames++;
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  },ids);
}
async function stopWatch(page) {
  return page.evaluate(()=>{
    const p=coverProbe;p.watching=false;p.observer.disconnect();
    return {...p.watch,extraCalls:p.publicCalls.length-p.watch.calls,extraLoads:p.calls.length-p.watch.loads,extraFetches:p.fetches-p.watch.fetches,newArrivals:p.arrivals.slice(p.watch.arrivals),sameNodes:p.tracked.every(t=>document.querySelector(`.atlas-book[data-destination="${t.id}"]`)===t.book && t.book.querySelector('img')===t.img),selection:atlasGpuDebug.selection};
  });
}
function stable(result) {
  assert.equal(result.removed,0,'Landmark covers are never removed');
  assert.equal(result.added,0,'Landmark covers are never recreated');
  assert.equal(result.extraCalls,0,'Pointer motion and pan never reload previews');
  assert.equal(result.extraLoads,0,'Pointer motion and pan never invoke the underlying preview loader');
  assert.equal(result.extraFetches,0,'Pointer motion and pan never fetch assets');
  assert.equal(result.srcChanges,0);assert.equal(result.badFrames,0);
  assert(result.sameNodes && result.frames>5);
}
async function overview(page) {
  await page.evaluate(()=>atlasGpuDebug.camera.fit());await settled(page);
  await page.waitForFunction(()=>atlasGpuDebug.covers.selected!==null);
  assert.equal(await page.locator('.atlas-book').count(),4,'All four cover nodes remain cached');
  assert.equal(await page.locator('.atlas-book:visible').count(),1,'Only the character-region cover is visible in overview');
}
async function pan(page) {
  await page.evaluate(()=>atlasGpuDebug.motion.placeAtLocation('home'));
  await overview(page);
  await measure(page,'home');
  await startWatch(page);
  for(const [dx,dy,coverId] of [[32,24],[-64,-48],[32,24],[24,18,'home'],[-24,-18,'elder']]) {
    const active=coverId || 'home';
    await page.evaluate(id=>atlasGpuDebug.motion.placeAtLocation(id),active);
    await loaded(page,active);
    const before=await page.evaluate(()=>atlasGpuDebug.camera.snapshot);
    const box=await imageBox(page,active);
    const point=coverId ? center(await book(page,coverId).boundingBox()) : await page.evaluate(()=>{
      const r=document.getElementById('world-canvas').getBoundingClientRect();
      for(const [x,y] of [[.25,.3],[.15,.3],[.5,.8],[.85,.8]]) {
        const p={x:r.x+r.width*x,y:r.y+r.height*y};
        if(document.elementFromPoint(p.x,p.y)?.id==='world-canvas')return p;
      }
      return null;
    });
    assert(point,'Uncovered map coordinate available for drag');
    if(coverId)assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.dataset.destination,point),coverId,'Drag starts directly over cover');
    if(coverId==='elder')assert.equal(await book(page,'elder').getAttribute('aria-disabled'),'true');
    await page.mouse.move(point.x,point.y);await page.mouse.down();
    await page.mouse.move(point.x+dx,point.y+dy,{steps:8});await page.waitForTimeout(100);
    const during=await page.evaluate(()=>({moving:atlasGpuDebug.moving,camera:atlasGpuDebug.camera.snapshot}));
    assert(during.moving,`Mouse pan starts on ${coverId || 'canvas'}, before release`);
    assert(Math.abs(during.camera.x-before.x)>1 && Math.abs(during.camera.y-before.y)>1,`Dragging ${coverId || 'canvas'} moves the map`);
    assert.equal(await page.locator('.atlas-book:visible').count(),1,'Active cover persists during paused-character pan');
    assert.equal(await page.evaluate(()=>atlasGpuDebug.covers.selected),active,'Camera pan does not select a different cover while PinPin is paused');
    const after=await imageBox(page,active);
    near(after.x-box.x,-(during.camera.x-before.x)*before.scale,`${active} follows camera X`);
    near(after.y-box.y,-(during.camera.y-before.y)*before.scale,`${active} follows camera Y`);
    await page.mouse.up();await settled(page);
    assert.equal(await page.locator('#story-preview').evaluate(dialog=>dialog.open),false,`Dragging ${coverId || 'canvas'} must not open preview`);
  }
  const result=await stopWatch(page);stable(result);
  console.log(JSON.stringify({suite:'desktop-landmark-pan',canvasDrags:3,coverDrags:['home','locked elder'],...result}));
}
async function hover(page) {
  await overview(page);
  await startWatch(page);
  for(let cycle=0;cycle<2;cycle++) {
    for(const id of destinations) {
      await page.evaluate(id=>atlasGpuDebug.motion.placeAtLocation(id),id);
      await loaded(page,id);
      const b=await book(page,id).boundingBox();
      for(const [x,y] of [[b.x-3,b.y-3],[b.x+3,b.y+3],[b.x+b.width+3,b.y-3],[b.x+b.width-3,b.y+3],[b.x+b.width+3,b.y+b.height+3],[b.x+b.width-3,b.y+b.height-3],[b.x-3,b.y+b.height+3],[b.x+3,b.y+b.height-3]]) {
        await page.mouse.move(x,y,{steps:3});await page.waitForTimeout(60);
      }
      assert.equal(await page.evaluate(()=>atlasGpuDebug.covers.selected),id,'Hover leaves the paused character-region cover active');
    }
  }
  const result=await stopWatch(page);stable(result);
  console.log(JSON.stringify({suite:'desktop-character-cover-hover',...result}));
}
async function quarter(page) {
  await page.evaluate(()=>{
    const d=atlasGpuDebug,s=d.camera.snapshot,p=d.world(atlasGeometry.regions.find(r=>r.id==='bridge').center);
    const scale=2*Math.max(s.width/1536,s.height/1024);
    d.camera.focus([p[0]+s.width/(4*scale),p[1]],scale);
    d.motion.placeAtLocation('bridge');
  });
  await settled(page);await loaded(page,'bridge');
  const box=await measure(page,'bridge'),viewport=await page.locator('#map-viewport').boundingBox();
  near(center(box).x,viewport.x+viewport.width/4,'Bridge cover appears at quarter viewport');
  assert.equal(await page.evaluate(()=>atlasGpuDebug.covers.selected),'bridge');
  const before=await imageBox(page,'bridge');await startWatch(page,['bridge']);
  const anchor=await book(page,'bridge').getAttribute('style');
  for(const id of destinations) {
    await page.evaluate(id=>atlasGpuDebug.motion.placeAtLocation(id),id);await page.waitForTimeout(100);
    await page.waitForFunction(id=>atlasGpuDebug.covers.selected===id,id);
    assert.equal(await book(page,'bridge').getAttribute('style'),anchor,'Selection changes preserve the regional Bridge anchor');
    assert.equal(await book(page,'bridge').isVisible(),id==='bridge','Bridge is visible only when nearest to PinPin');
  }
  assert.deepEqual(await imageBox(page,'bridge'),before,'Reactivated Bridge returns to its original regional anchor');
  const result=await stopWatch(page);stable(result);
  console.log(JSON.stringify({suite:'off-center-bridge',box,...result}));
}
async function sizing(page,mobile) {
  await focus(page,'home');
  await page.evaluate(()=>{if(!atlasGpuDebug.motion.paused)atlasGpuDebug.motion.toggle();atlasGpuDebug.camera.zoomBy(.125);});
  await settled(page);
  const minimum=await measure(page);
  near(minimum.width,160,'Zoomed-out artwork width');near(minimum.height,240,'Zoomed-out artwork height');
  await page.evaluate(()=>{
    const d=atlasGpuDebug,s=d.camera.snapshot;
    d.camera.focus(d.world(atlasGeometry.regions.find(r=>r.id==='home').center),2*Math.max(s.width/1536,s.height/1024));
  });
  await settled(page);await loaded(page,'home');
  const small=await measure(page),anchor=center(small);
  await page.mouse.move(anchor.x,anchor.y);await page.mouse.wheel(0,-1/.0022);
  await page.waitForTimeout(50);
  const large=await measure(page);
  assert(await book(page,'home').isVisible(),'Cover remains visible during wheel');
  const viewport=await page.locator('#map-viewport').boundingBox();
  const maxWidth=Math.min(viewport.width-16,(viewport.height-16)*2/3);
  near(large.width,Math.min(small.width*2,maxWidth),'Wheel scales artwork up to viewport cap');
  near(center(large).x,anchor.x,'Wheel centered X');near(center(large).y,anchor.y,'Wheel centered Y');
  await settled(page);
  const pinched=[];
  if(mobile) {
    const cdp=await page.context().newCDPSession(page);
    for(const distance of [90,40]) {
      await focus(page,'home');
      const baseline=await measure(page),pinchAnchor=center(baseline);
      const touches=offset=>[{x:pinchAnchor.x-offset,y:pinchAnchor.y},{x:pinchAnchor.x+offset,y:pinchAnchor.y}];
      for(const point of touches(distance)) {
        const hit=await page.evaluate(p=>{const hit=document.elementFromPoint(p.x,p.y);return hit?.dataset.destination || hit?.id;},point);
        assert.equal(hit,distance===90?'world-canvas':'home','Native pinch begins on requested surface');
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(distance)});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(distance*1.4)});
      await page.waitForTimeout(50);
      const box=await measure(page);
      near(box.width,Math.min(baseline.width*1.4,maxWidth),'Native touch pinch scales artwork');
      near(center(box).x,pinchAnchor.x,'Pinch centered X');near(center(box).y,pinchAnchor.y,'Pinch centered Y');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled(page);
      assert.equal(await page.locator('#story-preview').evaluate(dialog=>dialog.open),false,'Pinch must not open preview');
      pinched.push({surface:distance===90?'canvas':'cover',...box});
    }
  }
  await focus(page,'home');
  await page.evaluate(()=>atlasGpuDebug.camera.zoomBy(100));await settled(page);
  const capped=await measure(page);
  near(capped.width,Math.min(160*8,maxWidth),'Maximum size respects viewport cap');
  console.log(JSON.stringify({suite:'sizing',width:page.viewportSize().width,minimum,wheel:large,pinch:pinched,capped}));
}
async function stories(page) {
  for(const lang of ['es','ru','en']) {
    await page.locator('#atlas-language-toggle').click();await page.locator(`[data-lang="${lang}"]`).click();
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    for(const id of ['home','bridge','lake','elder']) {
      await focus(page,id);
      const expected=await page.evaluate(({id,lang})=>coverProbe.originalPreview(id,lang),{id,lang});
      assert(expected,`${id}/${lang} has cover`);
      assert.equal(await book(page,id).locator('img').getAttribute('src'),expected.src);
      if(id==='elder') {
        assert.equal(await book(page,id).getAttribute('aria-disabled'),'true');
        continue;
      }
      await book(page,id).click();await page.waitForSelector('#story-preview[open]');
      assert.equal(await page.locator('#preview-image').getAttribute('src'),expected.src);
      await page.locator('#preview-image').evaluate(img=>img.decode());
      await page.locator('#preview-close').click();
      await page.waitForFunction(()=>!document.getElementById('story-preview').open);
      await loaded(page,id);
    }
  }
  console.log(JSON.stringify({suite:'stories',width:page.viewportSize().width,languages:3,destinations:4,previewOpenClose:9}));
}
async function pixels(page) {
  const png=await page.locator('#world-canvas').screenshot();
  const result=await page.evaluate(async data=>{
    const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,96,64);
    const rgba=ctx.getImageData(0,0,96,64).data,colors=new Set();let opaque=0;
    for(let i=0;i<rgba.length;i+=4){if(rgba[i+3]>240)opaque++;colors.add([rgba[i]>>4,rgba[i+1]>>4,rgba[i+2]>>4].join(','));}
    return {opaque,colors:colors.size,backend:atlasGpuDebug.renderer.backend};
  },png.toString('base64'));
  assert(result.opaque>5000 && result.colors>40,'Rendered map has varied visible image pixels');
  assert.equal(result.backend,'webgpu','Verify actual Chrome WebGPU rendering');
  console.log(JSON.stringify({suite:'render',width:page.viewportSize().width,...result}));
}
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const widths=process.env.ATLAS_HOVER_WIDTH ? [Number(process.env.ATLAS_HOVER_WIDTH)] : [1440,390,320];
    for(const width of widths) {
      const mobile=width<600,context=await browser.newContext({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile});
      const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
      page.setDefaultTimeout(30000);await instrument(page);
      await page.goto(base+'atlas-webgpu.html?lang=en');await ready(page);
      if(!mobile){await pan(page);await hover(page);await quarter(page);}
      await pixels(page);await sizing(page,mobile);await stories(page);
      assert.deepEqual(errors,[],'No browser runtime errors');await context.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
