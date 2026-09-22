const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../docs/storyboard/atlas-motion.js'),'utf8');
const directions=angles => ({displayWidth:56,directions:angles.map(angle => ({angle,src:`heading-${angle}.png`,referenceWidth:100,
  frames:Array.from({length:4},(_,i) => ({rect:[i*100,angle,80+i,90+i],anchor:[40+i/2,85+i]}))}))});
async function harness({angle=0,metadata=directions([0,30,330]),reduced=false,broken=[],layer=true,mode='crisp',headings=null}={}) {
  const raf=new Map(), timers=new Map(), events={}, surfaces=[];
  let now=0, serial=0;
  function surface() {
    const draws=[], stack=[];
    const ctx={globalAlpha:1,globalCompositeOperation:'source-over',clears:0,draws,
      clearRect(){this.clears++;draws.length=0;},save(){stack.push([this.globalAlpha,this.globalCompositeOperation]);},
      restore(){[this.globalAlpha,this.globalCompositeOperation]=stack.pop();},translate(){},setLineDash(){},stroke(){},
      drawImage(...args){draws.push({args,alpha:this.globalAlpha,operation:this.globalCompositeOperation});}};
    const canvas={dataset:{},width:128,height:128,getContext:()=>ctx};surfaces.push(canvas);return canvas;
  }
  const document={hidden:false,createElement:()=>surface(),addEventListener:(name,fn)=>{events[name]=fn;}};
  const media={matches:reduced,addEventListener(){}};
  const context=vm.createContext({window:{atlasDirections:metadata,location:{search:mode?'?spriteMode='+mode:''}},URLSearchParams,document,matchMedia:()=>media,
    localStorage:{getItem:()=>null,setItem(){}},addEventListener(){},performance:{now:()=>now},
    requestAnimationFrame(fn){raf.set(++serial,fn);return serial;},cancelAnimationFrame:id=>raf.delete(id),
    setTimeout(fn,ms){timers.set(++serial,{fn,at:now+ms});return serial;},clearTimeout:id=>timers.delete(id),
    Path2D:class {moveTo(){}lineTo(){}},
    Image:class {naturalWidth=400;naturalHeight=100;decode(){return broken.includes(this.src)?Promise.reject(Error('missing')):Promise.resolve();}}});
  const canvas=surface(),rad=angle*Math.PI/180;
  const geometry={width:1000,height:1000,routes:[{id:'home-to-lake',from:'home',to:'lake',points:[[.5,.5],[.5+.4*Math.cos(rad),.5+.4*Math.sin(rad)]]}],
    sprite:{src:'fallback.png',columns:4,frames:4,referenceWidth:100,
      frameRects:Array.from({length:4},(_,i)=>({x:i*100,y:0,width:80+i,height:90+i,anchor:[40+i/2,85+i]}))}};
  if(headings) {
    const points=[[.2,.2]];
    for(const heading of headings) {
      const rad=heading*Math.PI/180,last=points.at(-1);
      points.push([last[0]+.044*Math.cos(rad),last[1]+.044*Math.sin(rad)]);
    }
    geometry.routes[0].points=points;
  }
  vm.runInContext(source,context);
  const motion=context.window.AtlasMotion.create(canvas,geometry);
  const spriteLayer=layer?{canvas:surface(),anchor:[64,112],revision:0,ready:false}:null;
  if (spriteLayer) canvas.atlasSetSpriteLayer(spriteLayer);
  for(let i=0;i<8;i++) await Promise.resolve();
  function step(ms=1000/60) {
    now+=ms;
    for(const [id,timer] of [...timers]) if(timer.at<=now){timers.delete(id);timer.fn();}
    const callbacks=[...raf.values()];raf.clear();callbacks.forEach(fn=>fn(now));
  }
  step(0);
  return {motion,canvas,spriteLayer,context,raf,timers,surfaces,step,
    hide(value){document.hidden=value;events.visibilitychange();},
    get sprite(){return (spriteLayer?.canvas || surfaces.at(-1)).getContext('2d');}};
}
test('60 Hz translation reuses a fixed crisp bitmap until the 190ms gait frame changes',async()=>{
  const h=await harness(),before=h.spriteLayer.revision,start=Number(h.canvas.dataset.x),positions=new Set();
  for(let i=0;i<120;i++){h.step();positions.add(h.spriteLayer.x);}
  assert.equal(positions.size,120);
  assert.equal(h.spriteLayer.revision-before,10);
  assert(Math.abs(Number(h.canvas.dataset.x)-start-88)<1e-8);
  const clears=h.sprite.clears,revision=h.spriteLayer.revision;
  for(let i=0;i<10;i++)h.motion.update();
  assert.equal(h.sprite.clears,clears);assert.equal(h.spriteLayer.revision,revision);
  assert.equal(h.spriteLayer.footY,Number(h.canvas.dataset.y));
  assert.equal(h.spriteLayer.canvas.width,128);assert.equal(h.spriteLayer.canvas.height,128);
});
test('legacy adjacent gait crops retain grounded anchors, scale, and additive premultiplied weights',async()=>{
  const h=await harness({mode:'legacy'});h.step(100);
  const draws=h.sprite.draws;
  assert.equal(draws.length,2);
  assert.deepEqual(draws.map(d=>d.args.slice(1,5)),[[0,0,80,90],[100,0,81,91]]);
  assert(Math.abs(draws[0].alpha-9/19)<1e-12);assert(Math.abs(draws[1].alpha-10/19)<1e-12);
  for(let i=0;i<2;i++) {
    assert.equal(draws[i].operation,'lighter');assert.equal(draws[i].args[5],-(40+i/2)*.56);
    assert.equal(draws[i].args[6],-(85+i)*.56);assert.equal(draws[i].args[7],(80+i)*.56);
  }
  h.step(600);
  assert.deepEqual(h.sprite.draws.map(d=>d.args[1]),[300,0],'last frame blends back to the first');
});
test('legacy headings blend across 0 degrees, while sparse opposing headings never dissolve',async()=>{
  for(const [angle,expected] of [[15,[0,30]],[345,[330,0]]]) {
    const h=await harness({angle,mode:'legacy'});h.step(100);
    assert.equal(h.sprite.draws.length,4);
    assert.deepEqual([...new Set(h.sprite.draws.map(d=>d.args[0].src))],expected.map(n=>`heading-${n}.png`));
    assert(Math.abs(h.sprite.draws.reduce((sum,d)=>sum+d.alpha,0)-1)<1e-12);
  }
  const h=await harness({angle:60,metadata:directions([0,180]),mode:'legacy'});h.step(100);
  assert.deepEqual([...new Set(h.sprite.draws.map(d=>d.args[0].src))],['heading-0.png']);
});
test('legacy fallback rectangles interpolate and a failed neighbor never dims the available heading',async()=>{
  const h=await harness({metadata:null,mode:'legacy'});h.step(100);
  assert.equal(h.canvas.dataset.direction,'fallback');assert.equal(h.sprite.draws.length,2);
  assert.deepEqual(h.sprite.draws.map(d=>d.args.slice(1,5)),[[0,0,80,90],[100,0,81,91]]);
  const neighbor=await harness({angle:10,broken:['heading-30.png'],mode:'legacy'});neighbor.step(100);
  assert.deepEqual([...new Set(neighbor.sprite.draws.map(d=>d.args[0].src))],['heading-0.png']);
  assert(Math.abs(neighbor.sprite.draws.reduce((sum,d)=>sum+d.alpha,0)-1)<1e-12);
});
test('crisp gait draws one full-opacity crop with exact 190ms cadence, scale and foot anchor',async()=>{
  for(const metadata of [directions([0,30,330]),null]) {
    const h=await harness({metadata});
    for(const [ms,frame] of [[100,0],[89,0],[1,1],[189,1],[1,2],[190,3],[190,0]]) {
      h.step(ms);
      const draws=h.sprite.draws;
      assert.equal(draws.length,1);assert.equal(draws[0].alpha,1);
      assert.equal(draws[0].operation,'source-over');
      assert.deepEqual(draws[0].args.slice(1,5),[frame*100,0,80+frame,90+frame]);
      assert.equal(draws[0].args[5],-(40+frame/2)*.56);
      assert.equal(draws[0].args[6],-(85+frame)*.56);
      assert.equal(draws[0].args[7],(80+frame)*.56);
      assert.equal(h.canvas.dataset.frame,String(frame));assert.equal(h.canvas.dataset.spriteMode,'crisp');
    }
  }
});
test('crisp selection accepts all 24 headings and legacy retains only original 30-degree directions',async()=>{
  const metadata=directions(Array.from({length:24},(_,i)=>i*15));
  for(const angle of Array.from({length:24},(_,i)=>i*15)) {
    const h=await harness({angle,metadata});h.step(100);
    assert.equal(h.canvas.dataset.direction,String(angle));assert.equal(h.sprite.draws.length,1);
    assert.equal(h.sprite.draws[0].args[0].src,`heading-${angle}.png`);
  }
  for(const mode of ['legacy','crisp']) {
    const h=await harness({angle:15,metadata,mode});h.step(100);
    assert.deepEqual([...new Set(h.sprite.draws.map(d=>d.args[0].src))],
      mode==='legacy'?['heading-0.png','heading-30.png']:['heading-15.png']);
    assert.equal(h.canvas.dataset.spriteMode,mode==='legacy'?'legacy':'crisp');
  }
});
test('crisp midpoint hysteresis resists jitter in both directions, including the 0/360 seam',async()=>{
  for(const step of [15,30]) {
    const boundary=step/2;
    const offsets=[0,boundary+.5,boundary+1.9,boundary+2.1,boundary+.5,boundary-1.9,boundary-2.1];
    for(const sign of [1,-1]) {
      const headings=offsets.map(angle=>(360+sign*angle)%360);
      const expected=[0,0,0,(360+sign*step)%360,(360+sign*step)%360,(360+sign*step)%360,0];
      const h=await harness({metadata:directions(Array.from({length:360/step},(_,i)=>i*step)),headings:[...headings,0]});
      h.step(500);
      for(let i=0;i<headings.length;i++) {
        if(i)h.step(1000);
        assert.equal(h.canvas.dataset.direction,String(expected[i]),`step ${step}, heading ${headings[i]}`);
        assert.equal(h.sprite.draws.length,1);assert.equal(h.sprite.draws[0].alpha,1);
      }
    }
  }
});
test('crisp selection uses actual irregular angles and wraps headings at 0/360',async()=>{
  for(const [angle,expected] of [[359.9,0],[.1,0],[360,0],[40,47],[320,310]]) {
    const h=await harness({angle,metadata:directions([0,47,180,310])});h.step(100);
    assert.equal(h.canvas.dataset.direction,String(expected));assert.equal(h.sprite.draws.length,1);
  }
  const h=await harness({angle:345,metadata:directions([360,-15,30])});h.step(100);
  assert.equal(h.canvas.dataset.direction,'345');assert.equal(h.sprite.draws[0].args[0].src,'heading--15.png');
});
test('crisp missing directions use the nearest decoded heading, then the single-frame fallback',async()=>{
  for(const broken of [['heading-30.png'],['heading-0.png','heading-30.png','heading-330.png']]) {
    const h=await harness({angle:30,broken});h.step(100);
    assert.equal(h.canvas.dataset.direction,broken.length===1?'0':'fallback');
    assert.equal(h.sprite.draws.length,1);assert.equal(h.sprite.draws[0].alpha,1);
  }
  const h=await harness({metadata:null,broken:['fallback.png']});h.step(100);
  assert.equal(h.canvas.dataset.sprite,'unavailable');assert.equal(h.sprite.draws.length,0);
});
test('idle, paused, reduced, hidden and suspended states retain bounded sprite surfaces without repainting',async()=>{
  for(const state of ['idle','paused','reduced','hidden','suspended']) {
    const h=await harness({reduced:state==='reduced'});h.step(100);
    if(state==='idle')h.motion.placeAtLocation('home');
    if(state==='paused')h.motion.toggle();
    if(state==='hidden')h.hide(true);
    if(state==='suspended')h.motion.suspend(true);
    const count=h.surfaces.length,clears=h.sprite.clears,revision=h.spriteLayer.revision;
    for(let i=0;i<600;i++){h.step();h.motion.update();}
    assert.equal(h.surfaces.length,count,state);assert.equal(h.sprite.clears,clears,state);
    assert.equal(h.spriteLayer.revision,revision,state);assert.equal(h.raf.size,0,state);
    if(state!=='idle')assert.equal(h.timers.size,0,state);
  }
});
test('standalone overlay reuses its sprite bitmap and metadata/source replacement invalidates it once',async()=>{
  const h=await harness({layer:false});h.motion.placeAtLocation('home');
  const count=h.surfaces.length,clears=h.sprite.clears;
  for(let i=0;i<100;i++)h.motion.update();
  assert.equal(h.surfaces.length,count);assert.equal(h.sprite.clears,clears);
  const metadata=directions([0]);metadata.directions[0].src='replacement.png';
  h.context.window.atlasDirections=metadata;h.motion.update();
  for(let i=0;i<8;i++)await Promise.resolve();
  assert.equal(h.sprite.clears,clears+1);assert.equal(h.sprite.draws[0].args[0].src,'replacement.png');
});
test('crisp cache and direction data invalidate when headings share a source and crop',async()=>{
  const metadata=directions([0,15]);
  metadata.directions[1]={...metadata.directions[0],angle:15};
  const h=await harness({metadata,headings:[0,15,15]});h.step(500);
  const key=h.spriteLayer.imageKey,crop=h.sprite.draws[0].args.slice(1,5);
  h.step(760);
  assert.equal(h.canvas.dataset.direction,'15');assert.equal(h.sprite.draws.length,1);
  assert.deepEqual(h.sprite.draws[0].args.slice(1,5),crop);
  assert.notEqual(h.spriteLayer.imageKey,key);
  assert(h.spriteLayer.imageKey.startsWith('15;'));
});
test('Chrome: crisp frame retains source pixels and alpha, renders assets and caps sprite uploads on desktop/mobile',
  {skip:!process.env.ATLAS_SPRITE_BROWSER,timeout:60000},async()=>{
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const base=process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';
  try {
    const page=await browser.newPage();await page.goto(base+'images/atlas/shire-focus-field-v1.json');
    await page.evaluate(()=>history.replaceState(null,'','?spriteMode=crisp'));
    await page.setContent('<canvas id="motion"></canvas>');
    await page.evaluate(()=>{
      let serial=0;window.clock=0;window.queue=new Map();
      window.requestAnimationFrame=fn=>{queue.set(++serial,fn);return serial;};window.cancelAnimationFrame=id=>queue.delete(id);
      window.step=ms=>{clock+=ms;const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(clock));};
      localStorage.removeItem('pinpin.atlas.motion.v1');
      const sheet=document.createElement('canvas');sheet.width=400;sheet.height=100;
      const ctx=sheet.getContext('2d');
      ['#ff0000','#00ff00','#0000ff','#ffff00'].forEach((color,i)=>{
        ctx.fillStyle=color;ctx.globalAlpha=.5;ctx.fillRect(i*100,0,100,20);
        ctx.globalAlpha=1;ctx.fillRect(i*100,20,100,80);
      });
      window.atlasDirections={displayWidth:100,directions:[{angle:0,src:sheet.toDataURL(),referenceWidth:100,
        frames:Array.from({length:4},(_,i)=>({rect:[i*100,0,100,100],anchor:[50,95]}))}]};
    });
    await page.addScriptTag({content:source});
    await page.evaluate(()=>{
      const canvas=document.querySelector('canvas');
      window.motion=AtlasMotion.create(canvas,{width:1000,height:1000,routes:[{from:'home',to:'lake',points:[[.1,.5],[.9,.5]]}]});
      const sprite=document.createElement('canvas');sprite.width=sprite.height=128;
      window.layer={canvas:sprite,anchor:[64,112],revision:0};canvas.atlasSetSpriteLayer(layer);
    });
    await page.waitForFunction(()=>layer.ready);
    const pixel=await page.evaluate(()=>{step(0);step(100);return Array.from(layer.canvas.getContext('2d').getImageData(64,80,1,1).data);});
    assert.deepEqual(pixel,[255,0,0,255]);
    const translucent=await page.evaluate(()=>Array.from(layer.canvas.getContext('2d').getImageData(64,27,1,1).data));
    assert.deepEqual(translucent,[255,0,0,128]);
    await page.close();
    const metrics=[];
    for(const width of [1440,390]) {
      const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base+'atlas-webgpu.html?returnPlace=home&spriteMode=crisp');
      await page.waitForFunction(()=>window.atlasGpuDebug?.motion.spriteLayer?.ready && atlasGpuDebug.renderer);
      await page.evaluate(()=>{
        if(atlasGpuDebug.motion.paused)atlasGpuDebug.motion.toggle();
        atlasGpuDebug.motion.setTarget(atlasGeometry.routes[0].points.at(-1));
      });
      await page.waitForTimeout(150);
      const read=()=>page.evaluate(()=>({time:performance.now(),revision:atlasGpuDebug.motion.spriteLayer.revision,
        backend:atlasGpuDebug.renderer.backend,
        uploads:atlasGpuDebug.renderer.stats.spriteUploads,x:Number(atlasGpuDebug.motionCanvas.dataset.x),
        pixels:atlasGpuDebug.motion.spriteLayer.canvas.getContext('2d').getImageData(0,0,128,128).data.some((v,i)=>i%4===3 && v>0)}));
      const before=await read();await page.waitForTimeout(1100);const after=await read();
      assert(before.pixels && after.pixels);assert.notEqual(before.x,after.x);
      const seconds=(after.time-before.time)/1000;
      assert(after.revision-before.revision<=Math.ceil(seconds*20)+1);
      assert(after.uploads-before.uploads<=Math.ceil(seconds*20)+1);
      if(before.backend==='webgpu' && after.backend==='webgpu')assert(after.uploads>before.uploads);
      await page.evaluate(()=>atlasGpuDebug.camera.fit());await page.waitForTimeout(150);
      const screenshot=`/tmp/pinpin-sprite-interpolation-${width}.png`;
      await page.screenshot({path:screenshot});assert.deepEqual(errors,[]);
      const bitmap=await page.evaluate(()=>atlasGpuDebug.motion.spriteLayer.canvas.toDataURL().split(',')[1]);
      fs.writeFileSync(`/tmp/pinpin-sprite-bitmap-${width}.png`,Buffer.from(bitmap,'base64'));
      metrics.push({width,backend:after.backend,seconds,revisions:after.revision-before.revision,uploads:after.uploads-before.uploads,screenshot});
      await page.close();
    }
    console.log(JSON.stringify({crispPixel:pixel,translucentPixel:translucent,metrics}));
  } finally {await browser.close();}
});
