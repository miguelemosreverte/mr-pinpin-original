const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base=(process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/').replace(/\/?$/,'/');
const destinations=['home','lake','elder','bridge'];
const book=(page,id)=>page.locator(`.atlas-book[data-destination="${id}"]`);
const near=(a,b,label,tolerance=1.2)=>assert(Math.abs(a-b)<tolerance,`${label}: ${a} vs ${b}`);

async function ready(page) {
  await page.waitForFunction(()=>window.atlasGpuDebug?.renderer && atlasGpuDebug.detector && atlasGpuDebug.renderCount>1 && document.getElementById('map-viewport').dataset.coversLoaded==='true');
  assert.equal(await page.evaluate(()=>typeof atlasGpuDebug.detector.nearestRegionAt),'function','Position detector API is integrated');
  assert(await page.evaluate(()=>atlasGpuDebug.motion.paused),'Character starts paused');
  await settled(page);
}
async function settled(page) {
  await page.waitForFunction(()=>!atlasGpuDebug.moving);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function state(page) {
  return page.evaluate(()=>{
    const d=atlasGpuDebug, data=d.motionCanvas.dataset;
    const point=[Number(data.x)/atlasGeometry.width,Number(data.y)/atlasGeometry.height];
    const rect=document.querySelector(`.atlas-book[data-destination="${d.covers.selected}"]`)?.getBoundingClientRect();
    return {point,nearest:d.detector.nearestRegionAt(point),active:document.getElementById('map-viewport').dataset.activeCover,
      selected:d.covers.selected,camera:d.camera.snapshot,arrived:data.arrived==='true',target:JSON.parse(data.target),
      coverBox:rect ? {x:rect.x,y:rect.y,width:rect.width,height:rect.height} : null,
      visible:[...document.querySelectorAll('.atlas-book')].filter(el=>!el.hidden && getComputedStyle(el).display!=='none' && getComputedStyle(el).visibility!=='hidden').map(el=>el.dataset.destination)};
  });
}
async function selected(page,id,{visible=false}={}) {
  await page.waitForFunction(id=>document.getElementById('map-viewport').dataset.activeCover===id && atlasGpuDebug.covers.selected===id,id);
  const s=await state(page);
  assert.equal(s.nearest,id,`${id}: actual normalized position selects nearest segment`);
  assert(s.visible.length<=1 && s.visible.every(value=>value===id),`Only ${id} is eligible to appear: ${s.visible}`);
  if(visible)assert.deepEqual(s.visible,[id],`${id}: exactly one cover visible`);
  return s;
}
async function place(page,id,options) {
  assert(await page.evaluate(id=>atlasGpuDebug.motion.placeAtLocation(id),id));
  return selected(page,id,options);
}
async function focusCamera(page,id) {
  await page.evaluate(id=>{
    const d=atlasGpuDebug,s=d.camera.snapshot;
    d.camera.focus(d.world(atlasGeometry.regions.find(r=>r.id===id).center),2*Math.max(s.width/atlasGeometry.width,s.height/atlasGeometry.height));
  },id);
  await settled(page);
}
async function anchored(page,id) {
  const value=await book(page,id).evaluate((el,id)=>{
    const r=el.getBoundingClientRect(),v=document.getElementById('map-viewport').getBoundingClientRect();
    const p=atlasGpuDebug.camera.worldToScreen(atlasGpuDebug.world(atlasGeometry.regions.find(r=>r.id===id).center));
    return {dx:r.x+r.width/2-v.x-p[0],dy:r.y+r.height/2-v.y-p[1]};
  },id);
  near(value.dx,0,`${id} world anchor X`);near(value.dy,0,`${id} world anchor Y`);
}
async function beginWatch(page) {
  const urls=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('.atlas-book')];
    const p=window.characterCoverProbe={nodes: nodes.map(button=>({button,image:button.querySelector('img'),src:button.querySelector('img').getAttribute('src')})),
      added:0,removed:0,srcChanges:0,loads:0,previewCalls:0,badFrames:0,frames:0,running:true};
    const original=AtlasStories.preview;
    p.restore=()=>{AtlasStories.preview=original;};
    AtlasStories.preview=function(...args){p.previewCalls++;return original.apply(this,args);};
    p.onLoad=()=>{p.loads++;};p.nodes.forEach(({image})=>image.addEventListener('load',p.onLoad));
    const hasCover=node=>node.nodeType===1 && (node.matches('.atlas-book') || node.querySelector('.atlas-book'));
    p.observer=new MutationObserver(records=>{
      for(const r of records) {
        if(r.type==='attributes' && p.nodes.some(t=>t.image===r.target))p.srcChanges++;
        p.added+=[...r.addedNodes].filter(hasCover).length;
        p.removed+=[...r.removedNodes].filter(hasCover).length;
      }
    });
    p.observer.observe(document.getElementById('map-viewport'),{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset']});
    function sample() {
      if(!p.running)return;
      p.frames++;
      const visible=p.nodes.filter(({button})=>!button.hidden && getComputedStyle(button).display!=='none');
      if(visible.length>1 || visible.some(({button})=>button.dataset.destination!==atlasGpuDebug.covers.selected))p.badFrames++;
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
    return p.nodes.map(({image})=>image.src);
  });
  const assets=new Set(urls),requests=[];
  const onRequest=request=>{if(assets.has(request.url()))requests.push(request.url());};
  page.on('request',onRequest);
  return async()=>{
    page.off('request',onRequest);
    const result=await page.evaluate(()=>{
      const p=characterCoverProbe;p.running=false;p.observer.disconnect();p.restore();
      p.nodes.forEach(({image})=>image.removeEventListener('load',p.onLoad));
      return {added:p.added,removed:p.removed,srcChanges:p.srcChanges,loads:p.loads,previewCalls:p.previewCalls,badFrames:p.badFrames,frames:p.frames,
        sameNodes:p.nodes.every(({button,image,src})=>button.isConnected && document.querySelector(`.atlas-book[data-destination="${button.dataset.destination}"]`)===button && button.querySelector('img')===image && image.getAttribute('src')===src)};
    });
    for(const key of ['added','removed','srcChanges','loads','previewCalls','badFrames'])assert.equal(result[key],0,key);
    assert(result.sameNodes && result.frames>5,'Four persistent cover/image nodes across interaction');
    assert.deepEqual(requests,[],'No cover asset requests during character or camera changes');
    return result;
  };
}
async function overview(page) {
  await page.evaluate(()=>atlasGpuDebug.camera.fit());await settled(page);
  assert(await page.evaluate(()=>{
    const d=atlasGpuDebug,s=d.camera.snapshot;
    return atlasGeometry.regions.every(r=>{const [x,y]=d.camera.worldToScreen(d.world(r.center));return x>=0 && y>=0 && x<=s.width && y<=s.height;});
  }),'Fit overview puts all four world anchors in view');
}
async function placements(page) {
  await selected(page,'home');
  assert.deepEqual(await page.locator('.atlas-book').evaluateAll(nodes=>nodes.map(el=>el.dataset.destination).sort()),[...destinations].sort());
  await overview(page);
  const camera=(await state(page)).camera;
  for(const id of destinations) {
    const s=await place(page,id,{visible:true});
    assert.deepEqual(s.camera,camera,'placeAtLocation does not move camera');
    await anchored(page,id);
  }
  await place(page,'home');
  for(const id of ['lake','elder','bridge']) {
    await focusCamera(page,id);await selected(page,'home');
    const before=(await state(page)).point;
    const p=await page.evaluate(()=>{
      const r=document.getElementById('world-canvas').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
    });
    await page.mouse.move(p.x,p.y);await page.waitForTimeout(180);
    assert.deepEqual((await selected(page,'home')).point,before,'Hover cannot switch a paused character cover');
  }
}
async function pan(page,mobile) {
  await place(page,'home');await focusCamera(page,'home');await selected(page,'home',{visible:true});
  const before=await state(page),box=before.coverBox;
  const point={x:box.x+box.width/2,y:box.y+box.height/2};
  let cdp;
  if(mobile) {
    cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...point}]});
    for(let step=1;step<=4;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:point.x+step*8,y:point.y+step*6}]});
  } else {
    await page.mouse.move(point.x,point.y);await page.mouse.down();
    await page.mouse.move(point.x+32,point.y+24,{steps:6});
  }
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const during=await selected(page,'home',{visible:true}),after=during.coverBox;
  assert(Math.abs(during.camera.x-before.camera.x)>1 && Math.abs(during.camera.y-before.camera.y)>1,'Native drag moves camera on both axes');
  assert.deepEqual(during.point,before.point,'Paused character stays in place during pan');
  near(after.x-box.x,-(during.camera.x-before.camera.x)*before.camera.scale,'Same cover moves with world X');
  near(after.y-box.y,-(during.camera.y-before.camera.y)*before.camera.scale,'Same cover moves with world Y');
  await anchored(page,'home');
  if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  else await page.mouse.up();
  await settled(page);await selected(page,'home',{visible:true});
  assert(!await page.locator('#story-preview').evaluate(d=>d.open),'Pan never opens preview');
  if(mobile) {
    await focusCamera(page,'home');
    const b=await book(page,'home').boundingBox(),center={x:b.x+b.width/2,y:b.y+b.height/2},initial=await state(page);
    const touches=offset=>[{id:1,x:center.x-offset,y:center.y},{id:2,x:center.x+offset,y:center.y}];
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(40)});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(60)});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const pinched=await selected(page,'home',{visible:true});
    near(pinched.camera.scale/initial.camera.scale,1.5,'Native pinch zoom ratio',.03);
    assert.deepEqual(pinched.point,initial.point,'Pinch does not move paused character');
    await anchored(page,'home');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await settled(page);
    assert(!await page.locator('#story-preview').evaluate(d=>d.open),'Pinch never opens preview');
    near(await page.evaluate(()=>visualViewport.scale),1,'Browser viewport does not pinch zoom',.01);
    await cdp.detach();
  }
}
async function walking(page) {
  await overview(page);await place(page,'home',{visible:true});
  const before=await state(page);
  await page.evaluate(()=>atlasGpuDebug.motion.setTarget(atlasGeometry.routes.find(r=>r.id==='home-to-lake').points.at(-1)));
  await page.waitForTimeout(200);
  const targeted=await selected(page,'home',{visible:true});
  assert.deepEqual(targeted.point,before.point,'setTarget does not teleport the character');
  assert(!targeted.arrived,'A real journey is pending');
  await page.evaluate(()=>atlasGpuDebug.motion.toggle());
  let crossing;
  try {
    await page.waitForFunction(()=>{
      const d=atlasGpuDebug,data=d.motionCanvas.dataset,p=[Number(data.x)/atlasGeometry.width,Number(data.y)/atlasGeometry.height];
      const nearest=d.detector.nearestRegionAt(p);
      if(nearest && nearest!=='home' && data.arrived!=='true' && d.covers.selected===nearest && document.getElementById('map-viewport').dataset.activeCover===nearest) {
        window.characterCoverCrossing={point:p,nearest,arrived:false,progress:Number(data.progress)};return true;
      }
      return false;
    },null,{timeout:30000,polling:'raf'});
    crossing=await page.evaluate(()=>characterCoverCrossing);
    assert(crossing.progress>0 && crossing.progress<1,'Actual walking changes cover before arrival');
    assert.notDeepEqual(crossing.point,before.point);
    assert.deepEqual((await state(page)).camera,before.camera,'Walking changes cover without moving camera');
    await selected(page,crossing.nearest,{visible:true});
  } finally {
    await page.evaluate(()=>{if(!atlasGpuDebug.motion.paused)atlasGpuDebug.motion.toggle();});
  }
  return crossing;
}
async function returns(page) {
  for(const id of destinations) {
    await page.evaluate(()=>sessionStorage.removeItem('pinpin.atlas.return.v1'));
    await page.goto(base+'atlas-webgpu.html?lang=en&returnPlace='+id);await ready(page);
    await selected(page,id);
  }
  await page.evaluate(()=>sessionStorage.setItem('pinpin.atlas.return.v1',JSON.stringify({place:'lake',pending:true})));
  await page.goto(base+'atlas-webgpu.html?lang=en&returnPlace=home');await ready(page);await selected(page,'lake');
  assert.equal(new URL(page.url()).searchParams.get('returnPlace'),'lake','Pending reader return wins over stale URL');
  await page.reload();await ready(page);await selected(page,'lake');
}
async function twoTap(page) {
  await place(page,'bridge');await focusCamera(page,'bridge');await selected(page,'bridge',{visible:true});
  await book(page,'bridge').tap();await page.waitForSelector('#story-preview[open]');
  assert(new URL(page.url()).pathname.endsWith('/atlas-webgpu.html'),'First native tap opens preview on atlas');
  assert.equal(await page.locator('.atlas-book:visible').count(),0,'Preview hides cover layer');
  await page.locator('#preview-image').tap();
  await page.waitForURL(url=>url.searchParams.get('story')==='timber-tractor');
  await page.waitForSelector('article[data-story="timber-tractor"]');
  assert.equal(new URL(page.url()).searchParams.get('returnPlace'),'bridge');
  await page.locator('#reader-map').tap();
  await page.waitForURL(url=>url.pathname.endsWith('/atlas-webgpu.html'));await ready(page);
  await selected(page,'bridge',{visible:true});
}

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const widths=process.env.ATLAS_CHARACTER_WIDTH ? [Number(process.env.ATLAS_CHARACTER_WIDTH)] : [1440,390];
    for(const width of widths) {
      const mobile=width<600,context=await browser.newContext({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile});
      try {
        await context.addInitScript(()=>localStorage.setItem('pinpin.atlas.motion.v1','paused'));
        const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
        page.setDefaultTimeout(30000);
        await page.goto(base+'atlas-webgpu.html?lang=en');await ready(page);
        const stopWatch=await beginWatch(page);
        await placements(page);await pan(page,mobile);
        const crossing=await walking(page),stability=await stopWatch();
        await returns(page);
        if(mobile)await twoTap(page);
        assert.deepEqual(errors,[],'No browser runtime errors');
        console.log(JSON.stringify({width,pausedPlacements:4,overviewVisible:1,cameraIndependent:true,hoverIndependent:true,walkingCrossing:crossing,
          stability,returnPlaces:4,pendingReturn:true,reloadReturn:true,nativePan:true,nativePinch:mobile,twoTapReaderReturn:mobile}));
      } finally {await context.close();}
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
