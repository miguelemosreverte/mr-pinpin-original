'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base=(process.env.ATLAS_BASE_URL || 'http://localhost:8767/storyboard/').replace(/\/?$/,'/');
const output=process.env.ATLAS_PRODUCTION_OUTPUT || '/tmp/atlas-production-family';
const ids=['pinpin','mr-pompom','mama'],sizes=[56,28,84];
const headings=Array.from({length:24},(_,i)=>i*15);

function checkCache(state) {
  for(const key of ['cache','faces']) {
    const cache=state[key];
    assert(cache,`${key} exposes bounds`);
    assert(cache.entries<=cache.maxEntries,`${key} entry budget exceeded: ${JSON.stringify(cache)}`);
    assert(cache.bytes<=cache.maxBytes,`${key} byte budget exceeded: ${JSON.stringify(cache)}`);
    if(key==='cache')assert(cache.pending<=3,'At most three simultaneous sprite decodes');
  }
  assert(state.historyLength<=state.historyLimit,'Bounded path history');
}

function checkMembers(state) {
  assert.equal(state.error,null);
  assert.equal(state.art,'production-trial');
  assert.deepEqual(state.members.map(m=>m.id),ids);
  assert.deepEqual(state.members.map(m=>m.displayWidth),sizes,'World sizes retained');
  for(const member of state.members) {
    assert.equal(member.spriteSource,'family-production');
    assert(member.sourceResolution?.every(n=>n>=1000),'Full-resolution production art decoded');
    assert(member.point.every(Number.isFinite));
  }
  checkCache(state);
}

async function snapshot(page) {
  return page.evaluate(()=>{
    const d=atlasGpuDebug,l=d.motion.spriteLayer;
    return {family:d.motion.familyState,backend:d.renderer.backend,error:d.rendererError,
      renderer:d.renderer.stats,camera:d.camera.snapshot,paused:d.motion.paused,
      raster:{scale:l.rasterScale,width:l.canvas.width,height:l.canvas.height,
        anchors:l.members.map(m=>m.anchor),positions:l.members.map(m=>[m.x,m.y,m.footY])}};
  });
}

async function screenProof(page,name) {
  const filename=path.join(output,name+'.png');
  await page.screenshot({path:filename});
  const buffer=await page.locator('#world-canvas').screenshot();
  const pixels=await page.evaluate(async encoded=>{
    const img=new Image();img.src='data:image/png;base64,'+encoded;await img.decode();
    const c=document.createElement('canvas');c.width=64;c.height=64;
    const ctx=c.getContext('2d');ctx.drawImage(img,0,0,64,64);
    const rgba=ctx.getImageData(0,0,64,64).data,colors=new Set();
    let min=255,max=0,opaque=0;
    for(let i=0;i<rgba.length;i+=4) {
      const l=(rgba[i]+rgba[i+1]+rgba[i+2])/3;min=Math.min(min,l);max=Math.max(max,l);
      opaque+=Number(rgba[i+3]>240);colors.add((rgba[i]>>3)+','+(rgba[i+1]>>3)+','+(rgba[i+2]>>3));
    }
    return {distinctColors:colors.size,lumaRange:max-min,opaqueSamples:opaque};
  },buffer.toString('base64'));
  assert(pixels.distinctColors>50 && pixels.lumaRange>40 && pixels.opaqueSamples>4000,
    'WebGPU screen pixels are nonblank: '+JSON.stringify(pixels));
  return {filename,pixels};
}

async function inventory(page) {
  const result=await page.evaluate(async()=>{
    const response=await fetch('family-production.json');
    if(!response.ok)throw Error('Production manifest HTTP '+response.status);
    const manifest=await response.json();
    return manifest.characters.map(c=>({id:c.id,fullCircle:c.fullCircle,displayWidth:c.displayWidth,
      angles:c.directions.map(d=>d.angle).sort((a,b)=>a-b),
      frameCounts:c.directions.map(d=>d.frames.length),
      sources:[...new Set(c.directions.map(d=>d.runtimeSrc || c.runtimeSrc || d.src || c.src))]}));
  });
  assert.deepEqual(result.map(c=>c.id).sort(),[...ids].sort());
  result.forEach(c=>{
    assert(c.fullCircle);assert.equal(c.displayWidth,sizes[ids.indexOf(c.id)]);
    assert.deepEqual(c.angles,headings);assert(c.frameCounts.every(n=>n===4));
    assert.equal(c.sources.length,6);
  });
  return result;
}

// A detached production-family instance exercises every heading using real Chrome
// image decoding and the actual renderer, without changing the live demo's route.
async function allHeadings(page) {
  await page.evaluate(async()=>{
    const {createOcclusionLayer}=await import('./gpu/occlusion.js');
    const family=AtlasFamily.create();await family.ready;
    if(!family.loaded)throw Error(family.error);
    window.productionVerification={family,layer:createOcclusionLayer(1024,3),elapsed:0};
  });
  const samples=[];
  for(const heading of headings) {
    const result=await page.evaluate(async heading=>{
      const p=productionVerification,r=heading*Math.PI/180,point=[800,600];
      p.family.seed([[point[0]-400*Math.cos(r),point[1]-400*Math.sin(r)],point]);
      let state;
      for(let attempt=0;attempt<120;attempt++) {
        p.elapsed+=100;
        p.family.draw(p.layer,{point,heading,elapsed:p.elapsed,walkTime:p.elapsed,moving:true});
        state=p.family.state;
        if(state.members.every(m=>m.renderedHeading===heading) && state.cache.pending===0)break;
        await new Promise(resolve=>setTimeout(resolve,25));
      }
      const ctx=p.layer.canvas.getContext('2d'),cells=[];
      for(let member=0;member<3;member++) {
        const rgba=ctx.getImageData(member*128,0,128,128).data;
        let solid=0;
        for(let i=3;i<rgba.length;i+=4)solid+=Number(rgba[i]>200);
        cells.push(solid);
      }
      return {heading,state,cells};
    },heading);
    checkMembers(result.state);
    assert(result.state.members.every(m=>m.renderedHeading===heading),
      'Every character actually renders heading '+heading);
    assert(result.cells.every(n=>n>100),'Every character has nonblank sprite pixels');
    samples.push(result);
  }
  return samples;
}

async function gaitArtwork(page,width) {
  const proof=await page.evaluate(async()=>{
    const manifest=await (await fetch('family-production.json')).json();
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=6*220;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#e6edf0';ctx.fillRect(0,0,canvas.width,canvas.height);
    const fingerprints=[];
    for(let member=0;member<3;member++)for(let side=0;side<2;side++) {
      const spec=manifest.characters[member],angle=side*180;
      const direction=spec.directions.find(d=>d.angle===angle),image=new Image();
      image.src=direction.runtimeSrc || spec.runtimeSrc || direction.src || spec.src;await image.decode();
      const hashes=[];
      for(let phase=0;phase<4;phase++) {
        const frame=direction.frames[phase],y=(member*2+side)*220;
        const scale=Math.min(230/frame.rect[2],185/frame.rect[3]);
        ctx.fillStyle='#18232b';ctx.font='14px sans-serif';
        ctx.fillText(spec.id+' '+angle+' deg / frame '+phase,phase*256+10,y+18);
        ctx.drawImage(image,...frame.rect,phase*256+128-frame.anchor[0]*scale,
          y+212-frame.anchor[1]*scale,frame.rect[2]*scale,frame.rect[3]*scale);
        const cell=document.createElement('canvas');cell.width=frame.rect[2];cell.height=frame.rect[3];
        const cellCtx=cell.getContext('2d');cellCtx.drawImage(image,...frame.rect,0,0,cell.width,cell.height);
        const bytes=cellCtx.getImageData(0,0,cell.width,cell.height).data;
        let hash=2166136261;for(const b of bytes)hash=Math.imul(hash^b,16777619);
        hashes.push(hash>>>0);
      }
      fingerprints.push({id:spec.id,angle,hashes});
    }
    return {data:canvas.toDataURL('image/png').split(',')[1],fingerprints};
  });
  const filename=path.join(output,width+'-gait-artwork.png');
  fs.writeFileSync(filename,Buffer.from(proof.data,'base64'));
  for(const row of proof.fingerprints)assert.equal(new Set(row.hashes).size,4,'Four distinct source frames: '+row.id+'/'+row.angle);
  return {filename,fingerprints:proof.fingerprints,
    limitation:'Distinct pixels do not prove correct forward foot-contact timing; inspect this contact sheet visually.'};
}

async function verify(browser,width) {
  const result={width,checks:[],screenshots:[],errors:[],consoleErrors:[],failedRequests:[],httpErrors:[],abortedHeadProbes:[]};
  const context=await browser.newContext({viewport:{width,height:width<600?844:1000},
    deviceScaleFactor:width<600?2:1,isMobile:width<600,hasTouch:width<600});
  const page=await context.newPage();
  page.on('pageerror',e=>result.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});
  const responseStatus=new WeakMap();
  page.on('requestfailed',r=>{
    const failure={url:r.url(),method:r.method(),status:responseStatus.get(r),error:r.failure()?.errorText};
    // The existing story availability checks finish HEAD 200 responses with an
    // aborted-body event in Chrome. Keep these visible without treating them as asset failures.
    if(failure.method==='HEAD' && failure.status===200 && failure.error==='net::ERR_ABORTED' &&
        new URL(failure.url).pathname.includes('/images/standalone/'))result.abortedHeadProbes.push(failure);
    else result.failedRequests.push(failure);
  });
  page.on('response',r=>{
    responseStatus.set(r.request(),r.status());
    if(r.status()>=400)result.httpErrors.push({url:r.url(),status:r.status()});
  });
  async function check(name,fn) {
    try {await fn();result.checks.push({name,passed:true});}
    catch(error){result.checks.push({name,passed:false,error:error.message});}
  }
  try {
    await page.goto(base+'atlas-webgpu.html?family=1&familyPreview=1&familyArt=production');
    await page.waitForFunction(()=>window.atlasGpuDebug?.renderer?.stats.draws>2 && atlasGpuDebug.motion.spriteLayer?.ready,
      null,{timeout:30000});
    await check('production inventory: three members, 24 headings, four frames',async()=>{result.inventory=await inventory(page);});
    await check('live WebGPU members and full-resolution sources',async()=>{
      result.initial=await snapshot(page);checkMembers(result.initial.family);
      assert.equal(result.initial.backend,'webgpu');assert.equal(result.initial.error,null);
      assert.equal(result.initial.renderer.occlusion.memberReady,3);
    });
    await check('live four-frame gait for each member',async()=>{
      await page.evaluate(()=>atlasGpuDebug.motion.startFamilyPreview());
      const frames=[new Set(),new Set(),new Set()];
      for(let i=0;i<85;i++) {
        await page.waitForTimeout(20);
        const state=await page.evaluate(()=>atlasGpuDebug.motion.familyState);
        checkMembers(state);state.members.forEach((m,j)=>frames[j].add(m.gaitFrame));
        if(i===15)result.screenshots.push(await screenProof(page,width+'-demo'));
      }
      result.gaitFrames=frames.map(s=>[...s].sort());
      assert(result.gaitFrames.every(a=>JSON.stringify(a)==='[0,1,2,3]'));
    });
    await page.evaluate(()=>{if(!atlasGpuDebug.motion.paused)atlasGpuDebug.motion.toggle();});
    await check('zoom-adaptive 4x raster retains world geometry while paused',async()=>{
      const before=await snapshot(page);result.zoom=[];
      for(const scale of [1,4,1,4]) {
        await page.evaluate(scale=>{
          const d=atlasGpuDebug,m=d.motion.familyState.members[1];
          d.camera.focus(m.point,scale);
        },scale);
        await page.waitForTimeout(250);
        const current=await snapshot(page);checkMembers(current.family);result.zoom.push(current);
        assert.deepEqual(current.raster.positions,before.raster.positions);
        assert.deepEqual(current.raster.anchors,[[64,112],[64,112],[64,112]]);
        assert.equal(current.raster.width,384*current.raster.scale);
        assert.equal(current.raster.height,128*current.raster.scale);
        assert.equal(current.renderer.occlusion.memberReady,3);
        if(scale===4)assert.equal(current.raster.scale,4);
      }
      assert(result.zoom.some(z=>z.raster.scale<4),'Raster adapts downward as well as upward');
      result.screenshots.push(await screenProof(page,width+'-zoom4'));
    });
    await check('all 24 headings decode and render for all three characters with bounded caches',async()=>{
      result.headingSamples=await allHeadings(page);
    });
    await check('four distinct source frames and forward-walk contact sheet',async()=>{
      result.artwork=await gaitArtwork(page,width);
    });
    await check('no browser, console, HTTP, or asset-load errors (successful story HEAD aborts recorded)',async()=>{
      assert.deepEqual(result.errors,[]);assert.deepEqual(result.consoleErrors,[]);
      assert.deepEqual(result.httpErrors,[]);assert.deepEqual(result.failedRequests,[]);
    });
  } catch(error) {
    result.checks.push({name:'page readiness',passed:false,error:error.message});
    await page.screenshot({path:path.join(output,width+'-failure.png')}).catch(()=>{});
  } finally {await context.close();}
  result.passed=result.checks.every(c=>c.passed);
  console.log(JSON.stringify({width,passed:result.passed,checks:result.checks}));
  return result;
}

async function main() {
  fs.mkdirSync(output,{recursive:true});const results=[];
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {for(const width of [1440,390])results.push(await verify(browser,width));}
  finally {await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');}
  if(results.some(r=>!r.passed))process.exitCode=1;
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
