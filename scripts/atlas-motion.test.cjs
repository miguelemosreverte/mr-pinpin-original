const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'../docs/storyboard');
const source=fs.readFileSync(path.join(root,'atlas-motion.js'),'utf8');
const dist=(a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const straight={width:1000,height:1000,routes:[{id:'home-to-lake',from:'home',to:'lake',points:[[.1,.5],[.9,.5]]}],sprite:{src:'old.png',columns:2,rows:2,frames:4,referenceWidth:100}};
async function harness(geometry=straight,{reduced=false,directions,broken=[]}={}) {
  const raf=new Map(), timers=new Map(), events={}, documentEvents={}, strokes=[], sprites=[];
  let clock=0, serial=0, preference=null;
  const ctx={save(){},restore(){},clearRect(){strokes.length=0;sprites.length=0;},translate(){},
    setLineDash(value){this.dash=value;},stroke(p){strokes.push({color:this.strokeStyle,dash:this.dash,path:p,
      offset:this.lineDashOffset,width:this.lineWidth,alpha:this.globalAlpha});},
    drawImage(...args){sprites.push(args);},scale(){assert.fail('Directional sprites must not mirror');},rotate(){assert.fail('Directional sprites must not rotate');}};
  const canvas={dataset:{},getContext:()=>ctx};
  const media={matches:reduced,addEventListener(type,fn){this[type]=fn;}};
  const document={hidden:false,addEventListener(type,fn){documentEvents[type]=fn;}};
  const context=vm.createContext({window:{atlasDirections:directions},document,matchMedia:()=>media,
    localStorage:{getItem:()=>preference,setItem:(key,value)=>{preference=value;}},
    addEventListener:(type,fn)=>{events[type]=fn;},
    requestAnimationFrame:fn=>{raf.set(++serial,fn);return serial;},cancelAnimationFrame:id=>raf.delete(id),
    setTimeout:(fn,ms)=>{timers.set(++serial,{fn,at:clock+ms});return serial;},clearTimeout:id=>timers.delete(id),performance:{now:()=>clock},
    Path2D:class {constructor(){this.points=[];}moveTo(...p){this.points.push(p);}lineTo(...p){this.points.push(p);}},
    Image:class {naturalWidth=400;naturalHeight=400;decode(){return broken.includes(this.src)?Promise.reject(new Error('missing')):Promise.resolve();}}});
  if (!geometry) { vm.runInContext(fs.readFileSync(path.join(root,'atlas-geometry.js'),'utf8'),context); geometry=context.window.atlasGeometry; }
  vm.runInContext(source,context);
  const motion=context.window.AtlasMotion.create(canvas,geometry);
  await Promise.resolve(); await Promise.resolve();
  function frame(ms=50) { clock+=ms; for(const [id,timer] of [...timers])if(timer.at<=clock){timers.delete(id);timer.fn();} const callbacks=[...raf.values()];raf.clear();callbacks.forEach(fn=>fn(clock)); }
  const advance=ms=>{for(let n=0;n<ms;n+=50)frame(Math.min(50,ms-n));};
  frame(0);
  return {motion,canvas,geometry,ctx,strokes,sprites,media,raf,frame,advance,context,
    point:()=>[Number(canvas.dataset.x),Number(canvas.dataset.y)],
    hide(value){document.hidden=value;documentEvents.visibilitychange();},events};
}
test('44 source pixels per second; update/focus never reset progress or choose a walk',async()=>{
  const h=await harness();h.advance(1000);assert(Math.abs(h.point()[0]-144)<1e-8);
  const progress=h.canvas.dataset.progress,target=h.canvas.dataset.target;
  h.motion.update(['lake','elder']);h.motion.focus('elder');h.motion.cue('home');
  assert.equal(h.canvas.dataset.progress,progress);assert.equal(h.canvas.dataset.target,target);
  h.advance(1000);assert(Math.abs(h.point()[0]-188)<1e-8);
  h.frame(1000);assert(Math.abs(h.point()[0]-232)<1e-8,'dropped frames preserve source-pixel speed');
});
test('off-route target projects; retarget and jitter cannot teleport or restart gait',async()=>{
  const h=await harness();h.advance(1000);const p=h.point(),frame=h.canvas.dataset.frame;
  h.motion.setTarget([.4,.9]);assert.deepEqual(h.point(),p);assert.equal(h.canvas.dataset.frame,frame);
  assert.deepEqual(JSON.parse(h.canvas.dataset.target),[400,500]);
  h.motion.setTarget([.405,.9]);h.advance(250);assert.deepEqual(JSON.parse(h.canvas.dataset.target),[400,500]);
  const before=h.point();h.motion.setTarget([.1,.1]);assert.deepEqual(h.point(),before);
  h.advance(500);assert(h.point()[0]<before[0]);
  h.advance(3000);assert.deepEqual(h.point(),[100,500]);assert.equal(h.canvas.dataset.arrived,'true');
});
test('coalescing retains latest destination while continuing the prior walk',async()=>{
  const h=await harness();h.motion.setTarget([.7,.5]);h.motion.setTarget([.2,.5]);h.motion.setTarget([.6,.5]);
  h.advance(200);assert.deepEqual(JSON.parse(h.canvas.dataset.target),[700,500]);assert(h.point()[0]>100);
  h.advance(50);assert.deepEqual(JSON.parse(h.canvas.dataset.target),[600,500]);
});
test('explicit returns hold all four exact endpoints and later walks start there',async()=>{
  for (const paused of [false,true]) for (const id of ['home','lake','elder','bridge']) {
    const h=await harness(null,{reduced:paused});
    h.motion.setTarget([.7,.5]);h.motion.setTarget([.2,.5]);
    const route=h.geometry.routes.find(r=>r.id===(id==='home'||id==='lake'?'home-to-lake':'lake-to-'+id));
    const p=id==='home'?route.points[0]:route.points.at(-1);
    const expected=Array.from(p,(v,i)=>v*(i?h.geometry.height:h.geometry.width));
    assert.equal(h.motion.placeAtLocation(id),true);assert.deepEqual(h.point(),expected);
    assert.equal(h.canvas.dataset.arrived,'true');assert.equal(h.canvas.dataset.frame,'0');
    h.advance(2000);h.motion.update();h.motion.focus(id);h.events.pageshow();h.advance(1000);
    assert.deepEqual(h.point(),expected,'return must cancel both the active and queued journey');
    const target=id==='home'?h.geometry.routes[0].points.at(-1):h.geometry.routes[0].points[0];
    h.motion.setTarget(Array.from(target));assert.deepEqual(h.point(),expected,'retarget cannot teleport');
    if (paused) { h.advance(500);assert.deepEqual(h.point(),expected);h.motion.toggle();h.frame(0); }
    h.advance(100);assert(dist(h.point(),expected)>0);assert(dist(h.point(),expected)<=4.400001);
  }
});
test('invalid location placement leaves the existing walk untouched',async()=>{
  const h=await harness();h.advance(500);const before={...h.canvas.dataset};
  for (const id of [null,undefined,'','constructor','__proto__','LAKE','lake-to-elder',{},['lake']]) {
    assert.equal(h.motion.placeAtLocation(id),false);assert.deepEqual(h.canvas.dataset,before);
  }
  assert.equal(h.motion.placeAtLocation('elder'),false,'missing surveyed endpoint is not invented');
  h.advance(100);assert(dist(h.point(),[Number(before.x),Number(before.y)])>0);
});
test('map return storage and queries validate four places, preserve language, and consume pending back navigation',()=>{
  for (const file of ['atlas.js','atlas-webgpu.js']) {
    const text=fs.readFileSync(path.join(root,file),'utf8');
    const start=text.indexOf('function restoreReturnPlace()');
    const fn=text.slice(start,text.indexOf('\n  }',start)+4);
    // The module uses unindented function boundaries; the Leaflet page is wrapped.
    const source=file==='atlas-webgpu.js'?text.slice(start,text.indexOf('\n}',start)+2):fn;
    const check=({query='',raw=null,blocked=false}={})=>{
      let stored=raw,href='https://example.test/'+file.replace('.js','.html')+'?lang=es'+query;
      const placed=[],context=vm.createContext({URL,places:['home','lake','elder','bridge'],returnStorageKey:'return',
        location:{href},sessionStorage:{getItem(){if(blocked)throw Error('blocked');return stored;},setItem(_,v){if(blocked)throw Error('blocked');stored=v;}},
        history:{state:{test:true},replaceState(state,_,url){assert.equal(state.test,true);href=url.href;}},
        motion:{placeAtLocation(id){placed.push(id);return true;}},clearTimeout(){},settleTimer:1,targetPending:true,selection:{},arrival:{}});
      vm.runInContext(source+';restoreReturnPlace();',context);
      assert.equal(new URL(href).searchParams.get('lang'),'es');
      return {placed,stored,href,context};
    };
    for (const id of ['home','lake','elder','bridge']) {
      const h=check({query:'&returnPlace='+id,raw:'{'});assert.deepEqual(h.placed,[id]);
      assert.equal(JSON.parse(h.stored).pending,false);assert.equal(h.context.targetPending,false);
      assert.deepEqual(check({query:'&returnPlace='+id,blocked:true}).placed,[id]);
    }
    assert.deepEqual(check().placed,[]);
    for (const raw of ['{','null','[]','{}','{"place":"constructor"}','{"place":1}']) assert.deepEqual(check({raw}).placed,[]);
    for (const query of ['&returnPlace=','&returnPlace=constructor','&returnPlace=https://evil.test'])
      assert.deepEqual(check({query,raw:'{"place":"lake"}'}).placed,[]);
    const back=check({query:'&returnPlace=home',raw:'{"place":"elder","pending":true}'});
    assert.deepEqual(back.placed,['elder']);assert.equal(new URL(back.href).searchParams.get('returnPlace'),'elder');
    assert.deepEqual(check({query:'&returnPlace=bridge',raw:'{"place":"elder","pending":false}'}).placed,['bridge']);
    assert.deepEqual(check({raw:'{"place":"lake","pending":false}'}).placed,['lake']);
  }
});
test('stored GPU camera accepts expanded extents and rejects corrupt or out-of-bounds centers',()=>{
  const source=fs.readFileSync(path.join(root,'atlas-webgpu.js'),'utf8');
  const start=source.indexOf('function readCamera()'),fn=source.slice(start,source.indexOf('\n}',start)+2);
  for (const value of [{x:-200,y:-100,zoom:4},{x:1800,y:1200,zoom:4},{x:-384,y:-256,zoom:2}]) {
    const context=vm.createContext({width:1536,height:1024,cameraStorageKey:'camera',sessionStorage:{getItem:()=>JSON.stringify(value)}});
    vm.runInContext(fn,context);assert.deepEqual(JSON.parse(JSON.stringify(context.readCamera())),value);
  }
  for (const raw of ['{','null','[]','{}',...[
    {x:-385,y:0,zoom:2},{x:1921,y:0,zoom:2},{x:0,y:-257,zoom:2},{x:0,y:1281,zoom:2},
    {x:'0',y:0,zoom:2},{x:0,y:0,zoom:0},{x:0,y:0,zoom:17}].map(JSON.stringify)]) {
    const context=vm.createContext({width:1536,height:1024,cameraStorageKey:'camera',sessionStorage:{getItem:()=>raw}});
    vm.runInContext(fn,context);assert.equal(context.readCamera(),null);
  }
});
test('mid-edge retargeting traverses a projected T junction continuously in both directions',async()=>{
  const h=await harness({...straight,routes:[...straight.routes,{id:'branch',points:[[.5,.505],[.5,.9]]}]});
  h.advance(5300);const original=h.point();h.motion.setTarget([.5,.9]);assert.deepEqual(h.point(),original);
  const follow=predicate=>{
    for(let i=0;i<500 && !predicate();i++) {
      const before=h.point();h.frame(50);const p=h.point();
      assert(dist(before,p)<=2.200001);assert(Math.abs(p[1]-500)<1e-6 || Math.abs(p[0]-500)<1e-6,'must follow the T, never its diagonal');
    }
    assert(predicate());
  };
  follow(()=>h.point()[1]>=620);
  const branch=h.point();h.motion.setTarget([.1,.5]);assert.deepEqual(h.point(),branch);
  follow(()=>h.point()[0]<440);
  const west=h.point();h.motion.setTarget([.9,.5]);assert.deepEqual(h.point(),west);
  follow(()=>h.canvas.dataset.arrived==='true');assert.deepEqual(h.point(),[900,500]);
});
const activeTrails=h=>h.strokes.filter(s=>s.width===4.5).sort((a,b)=>a.offset-b.offset);
const trailSnapshot=h=>h.strokes.map(s=>({points:s.path.points,offset:s.offset,width:s.width}));
function assertTrailChain(h,start,end,count) {
  const trails=activeTrails(h);
  assert.equal(trails.length,count);
  assert(dist(trails[0].path.points[0],start)<1e-6);
  assert(dist(trails.at(-1).path.points[1],end)<1e-6);
  for(let i=1;i<trails.length;i++) {
    const previous=trails[i-1],current=trails[i];
    assert(dist(previous.path.points[1],current.path.points[0])<1e-6,'directed paths meet at junction');
    assert(Math.abs(current.offset-previous.offset-dist(...previous.path.points))<1e-6,'dash phase continues through junction');
  }
}
const trailJunction={...straight,routes:[...straight.routes,
  {id:'branch',points:[[.5,.9],[.5,.7],[.5,.505]]}]};
test('selected dashes flow toward either target and inactive pieces stay still',async()=>{
  const h=await harness();
  for(const target of [[.7,.5],[.1,.5]]) {
    const start=h.point();h.motion.setTarget(target);
    assertTrailChain(h,start,target.map(v=>v*1000),1);
    const selected=activeTrails(h)[0],inactive=h.strokes.filter(s=>s.width===3.5);
    const sign=Math.sign(target[0]*1000-start[0]);
    assert.equal(Math.sign(selected.path.points[1][0]-selected.path.points[0][0]),sign);
    h.advance(500);
    assert(Math.abs(activeTrails(h)[0].offset-selected.offset+500/160)<1e-8,
      'decreasing canvas offset advances dashes along the directed path');
    assert.deepEqual(h.strokes.filter(s=>s.width===3.5),inactive);
  }
});
test('multi-edge trails turn through projected joins with continuous phase in both directions',async()=>{
  const h=await harness(trailJunction);h.advance(1000);
  const start=h.point();h.motion.setTarget([.5,.9]);
  assertTrailChain(h,start,[500,900],4);
  h.advance(18000);assert.deepEqual(h.point(),[500,900]);
  h.motion.setTarget([.1,.5]);assertTrailChain(h,[500,900],[100,500],4);
  const selected=activeTrails(h).map(s=>s.offset);h.advance(500);
  activeTrails(h).forEach((s,i)=>assert(Math.abs(s.offset-selected[i]+500/160)<1e-8));
});
test('explicit shared-node branches remain reachable in either route order',async()=>{
  const junctionRoutes=[{...straight.routes[0],points:[[.1,.5],[.5,.5],[.9,.5]]},
    {id:'branch',points:[[.5,.9],[.5,.7],[.5,.5]]}];
  const sibling={id:'sibling',points:[[.5,.5],[.8,.8]]};
  for(const routes of [[...junctionRoutes,sibling],[sibling,...junctionRoutes]]) {
    const h=await harness({...straight,routes});
    for(const target of [[.5,.9],[.1,.5],[.8,.8],[.9,.5]]) {
      const expected=target.map(v=>v*1000);h.motion.setTarget(target);
      assert(dist(JSON.parse(h.canvas.dataset.target),expected)<1e-6,'endpoint stays in the reachable component');
      for(let frames=0;h.canvas.dataset.arrived!=='true' && frames<1000;frames++) {
        const before=h.point();h.frame(50);const p=h.point();
        assert(dist(before,p)<=2.200001,'continuous bounded movement through shared endpoint');
        assert(Math.abs(p[1]-500)<1e-6 || Math.abs(p[0]-500)<1e-6 || Math.abs(p[1]-p[0])<1e-6,
          'every step stays on an explicit trace');
      }
      assert.equal(h.canvas.dataset.arrived,'true');assert(dist(h.point(),expected)<1e-6);
    }
  }
});
test('retargeted trails reverse at the current position and honor the coalesced destination',async()=>{
  const h=await harness(trailJunction);h.motion.setTarget([.5,.9]);h.advance(12500);
  const start=h.point();assert(start[1]>505 && start[1]<700);
  h.motion.setTarget([.1,.5]);assert.deepEqual(h.point(),start);
  assertTrailChain(h,start,[100,500],3);
  h.motion.setTarget([.9,.5]);h.motion.setTarget([.5,.9]);
  h.advance(200);assert(dist(activeTrails(h).at(-1).path.points[1],[100,500])<1e-6);
  const turn=h.point();h.advance(50);
  assertTrailChain(h,turn,[500,900],2);
  assert(h.point()[1]>turn[1]);
});
test('an unjoined crossing and overlapping alternative do not inherit journey selection or flow',async()=>{
  const h=await harness({...straight,routes:[...straight.routes,
    {id:'crossing',points:[[.5,.1],[.5,.9]]},
    {id:'overlap',points:[[.1,.5],[.9,.5]]}]});
  assertTrailChain(h,[100,500],[900,500],1);
  const inactive=h.strokes.filter(s=>s.width===3.5);assert.equal(inactive.length,2);
  h.advance(500);assert.deepEqual(h.strokes.filter(s=>s.width===3.5),inactive);
});
test('arrival, idle placement and suspended or paused updates freeze trail phases',async()=>{
  const h=await harness();h.motion.setTarget([.13,.5]);h.advance(1000);
  assert.equal(h.canvas.dataset.arrived,'true');
  let before=trailSnapshot(h);h.advance(2000);h.motion.update();assert.deepEqual(trailSnapshot(h),before);
  h.motion.placeAtLocation('home');assert.equal(activeTrails(h).length,0);
  before=trailSnapshot(h);h.advance(1000);h.motion.update();assert.deepEqual(trailSnapshot(h),before);
  h.motion.setTarget([.9,.5]);h.frame(0);h.advance(500);
  h.motion.suspend(true);before=trailSnapshot(h);h.advance(1000);h.motion.update();assert.deepEqual(trailSnapshot(h),before);
  h.motion.suspend(false);h.frame(0);h.advance(100);
  assert.notEqual(activeTrails(h)[0].offset,before.find(s=>s.width===4.5).offset);
  h.motion.toggle();before=trailSnapshot(h);h.advance(1000);h.motion.update();assert.deepEqual(trailSnapshot(h),before);
});
test('pause freezes gait, pulse, dashes and progress; hidden/reduced schedule no RAF',async()=>{
  const h=await harness();h.advance(450);const before={...h.canvas.dataset},offset=h.ctx.lineDashOffset;
  h.motion.toggle();assert.equal(h.raf.size,0);h.advance(2000);
  for(const key of ['x','y','frame','progress','heading'])assert.equal(h.canvas.dataset[key],before[key]);
  assert.equal(h.ctx.lineDashOffset,offset);h.motion.toggle();h.frame();h.advance(100);
  assert(h.point()[0]>Number(before.x));h.hide(true);const hidden=h.point();h.advance(1000);
  assert.deepEqual(h.point(),hidden);assert.equal(h.raf.size,0);h.hide(false);h.frame();assert.deepEqual(h.point(),hidden);
  const r=await harness(straight,{reduced:true});r.advance(2000);assert.equal(r.raf.size,0);assert.deepEqual(r.point(),[100,500]);
  h.media.change({matches:true});assert.equal(h.raf.size,0);
});
test('actual twelve headings use four frames, shared scale, crop anchors and no transforms',async()=>{
  const directions={angleConvention:'clockwise-image-plane',displayWidth:56,directions:Array.from({length:12},(_,i)=>({angle:i*30,src:'heading-'+Math.floor(i/4)+'.png',referenceWidth:i<4?100:80,
    frames:Array.from({length:4},(_,f)=>({rect:[f*100,0,i?70:100,80],anchor:[35,76]}))}))};
  for(let i=0;i<12;i++) {
    const angle=i*30*Math.PI/180,geometry={...straight,routes:[{id:'heading',from:'home',to:'lake',points:[[.5,.5],[.5+.4*Math.cos(angle),.5+.4*Math.sin(angle)]]}]};
    const h=await harness(geometry,{directions});h.advance(50);
    assert.equal(Number(h.canvas.dataset.direction),i*30);
    const frames=new Set();for(let n=0;n<16;n++){h.advance(50);frames.add(h.canvas.dataset.frame);}
    assert.equal(frames.size,4);
    const draw=h.sprites.at(-1),scale=56/(i<4?100:80);assert.equal(draw[0].src,'heading-'+Math.floor(i/4)+'.png');
    assert.equal(draw[5],-35*scale);assert.equal(draw[6],-76*scale);assert.equal(draw[8],80*scale);
    assert.equal(draw[7],(i?70:100)*scale);
  }
});
test('missing new sprite falls back; metadata can arrive after initial create',async()=>{
  const h=await harness(straight,{broken:['missing.png']});assert.equal(h.canvas.dataset.direction,'fallback');
  h.context.window.atlasDirections={directions:[{angle:0,src:'missing.png',referenceWidth:100,frames:[{rect:[0,0,100,80],anchor:[50,76]}]}]};
  h.advance(50);await Promise.resolve();await Promise.resolve();h.advance(50);
  assert.equal(h.canvas.dataset.direction,'fallback');assert.equal(h.canvas.dataset.sprite,'ready');assert(h.raf.size);
});
test('real atlas reaches every route endpoint and all motion remains on traces or bounded joins',async()=>{
  const h=await harness(null),g=h.geometry,segments=[];
  g.routes.forEach(r=>r.points.slice(1).forEach((b,i)=>segments.push([r.points[i],b].map(p=>[p[0]*g.width,p[1]*g.height]))));
  const traceDistance=p=>Math.min(...segments.map(([a,b])=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));
    return dist(p,[a[0]+t*dx,a[1]+t*dy]);
  }));
  const destinations=[g.routes[2],g.routes[1],g.routes[0]].map(route=>({route,
    target:route===g.routes[0]?route.points[0]:route.points.at(-1)}));
  destinations.push(...g.routes.flatMap(route=>[route.points[0],route.points.at(-1)].map(target=>({route,target,reset:true}))));
  for(const {route,target,reset} of destinations) {
    if(reset)h.motion.placeAtLocation('home');
    const expected=[target[0]*g.width,target[1]*g.height],before=h.point();
    h.motion.setTarget(target);assert.deepEqual(h.point(),before);
    assert(dist(JSON.parse(h.canvas.dataset.target),expected)<.001,route.id+': requested endpoint must be reachable');
    let previous=before,frames=0;
    do {
      h.frame(50);const p=h.point();assert(dist(p,previous)<=2.200001,'speed bound across junction');
      assert(traceDistance(p)<6,'route or short surveyed junction only');previous=p;
    } while(h.canvas.dataset.arrived!=='true' && ++frames<3000);
    assert(frames<3000,route.id+': route must finish within the movement budget');
    assert(dist(h.point(),expected)<.001,route.id+': arrive at requested route endpoint');
  }
  assert(h.strokes.length>0);h.strokes.forEach(s=>{assert.equal(s.color,'#ffffff');assert.deepEqual(Array.from(s.dash),[5,11]);});
});
test('disconnected routes cannot cause an invented crossing; empty geometry remains usable',async()=>{
  const geometry={...straight,routes:[...straight.routes,{id:'island',points:[[.1,.1],[.9,.1]]}]};
  const h=await harness(geometry);h.motion.setTarget([.4,.1]);h.advance(8000);assert.deepEqual(h.point(),[400,500]);
  const empty=await harness({width:1000,height:1000,routes:[]});empty.motion.setTarget([.5,.5]);assert.equal(empty.raf.size,0);
});
test('integrated desktop/mobile canvas renders, animates and freezes in Chrome',{skip:!process.env.ATLAS_BROWSER_URL},async()=>{
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for(const width of [1440,390,320]) {
      const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<600,isMobile:width<600});
      const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>{
        let module;
        Object.defineProperty(window,'AtlasMotion',{get:()=>module,set(value){
          module={create(...args){window.motionTest=value.create(...args);return window.motionTest;}};
        }});
      });
      await page.goto(process.env.ATLAS_BROWSER_URL);
      await page.waitForSelector('#map-motion[data-sprite="ready"]');
      await page.waitForTimeout(400);
      const state=()=>page.locator('#map-motion').evaluate(canvas=>({data:{...canvas.dataset},pixels:canvas.toDataURL(),
        ink:canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3 && v>0)}));
      const first=await state();assert(first.ink);await page.waitForTimeout(350);
      const next=await state();assert.notEqual(next.pixels,first.pixels);assert.notEqual(next.data.x,first.data.x);
      await page.evaluate(()=>window.motionTest.toggle());const paused=await state();await page.waitForTimeout(250);
      assert.equal((await state()).pixels,paused.pixels);assert.equal(paused.data.running,'false');
      await page.screenshot({path:'/tmp/pinpin-atlas-v3-motion-'+width+'.png'});
      const ink=await page.evaluate(()=>{
        const canvas=document.createElement('canvas');
        const m=window.AtlasMotion.create(canvas,{width:1000,height:1000,routes:[{from:'home',to:'lake',points:[[.1,.5],[.9,.5]]}]});
        m.toggle();m.setTarget([.4,.8]);
        const pixels=canvas.getContext('2d').getImageData(200,500,400,1).data;
        let white=0,clear=0,colored=0;
        for(let i=0;i<pixels.length;i+=4){if(!pixels[i+3])clear++;else if(pixels[i]===255&&pixels[i+1]===255&&pixels[i+2]===255)white++;else colored++;}
        return {white,clear,colored};
      });
      assert(ink.white>50 && ink.clear>50,'dashes must have genuinely transparent gaps');assert.equal(ink.colored,0);
      assert.deepEqual(errors,[]);await context.close();
    }
  } finally {await browser.close();}
});
test('generated PNG sprite preserves white transparent trails and paused canvas pixels',{skip:!process.env.ATLAS_BROWSER_URL},async()=>{
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1000,height:700}}),scope={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(root,'atlas-directions.js'),'utf8'),scope);
    let metadata=scope.window.atlasDirections;
    const production=metadata.directions.length>0;
    if(!production) {
      const {measure,verifySheet}=require('./verify-atlas-directions.cjs');
      const file=path.join(root,'images/atlas/pinpin-directions-a-v1.png'),sheet=await measure(page,file);verifySheet(sheet);
      metadata={displayWidth:56,directions:[{angle:0,src:'images/atlas/pinpin-directions-a-v1.png',referenceWidth:sheet.referenceWidth,
        frames:sheet.frames.filter(frame=>frame.row===0).map(({rect,anchor})=>({rect,anchor}))}]};
    }
    metadata={...metadata,directions:metadata.directions.map(d=>({...d,src:'data:image/png;base64,'+fs.readFileSync(path.join(root,d.src)).toString('base64')}))};
    await page.setContent('<canvas id="sprite-probe"></canvas>');
    await page.addScriptTag({content:source});
    await page.evaluate(({geometry,metadata})=>{
      window.atlasDirections=metadata;
      delete geometry.sprite;window.probeMotion=window.AtlasMotion.create(document.querySelector('canvas'),geometry);
    },{geometry:straight,metadata});
    await page.waitForSelector('canvas[data-sprite="ready"]');await page.waitForTimeout(200);
    const before=await page.evaluate(()=>{
      if(!window.probeMotion.paused)window.probeMotion.toggle();
      const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
      const sample=ctx.getImageData(300,500,400,1).data;let white=0,clear=0,colored=0;
      for(let i=0;i<sample.length;i+=4){if(!sample[i+3])clear++;else if(sample[i]===255&&sample[i+1]===255&&sample[i+2]===255)white++;else colored++;}
      const pixels=ctx.getImageData(0,350,250,151).data;let spritePixels=0;
      for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100 && Math.min(pixels[i],pixels[i+1],pixels[i+2])<240)spritePixels++;
      return {url:canvas.toDataURL(),direction:canvas.dataset.direction,white,clear,colored,spritePixels};
    });
    await page.waitForTimeout(250);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),before.url);
    assert.notEqual(before.direction,'fallback');assert(before.spritePixels>200);assert(before.white>50 && before.clear>50);assert.equal(before.colored,0);
    await page.locator('canvas').screenshot({path:'/tmp/pinpin-atlas-v3-motion-sprite-canvas.png'});
    console.log(JSON.stringify({actualSpriteProbe:production?'production metadata':'reviewed sheet A measurement',direction:before.direction,white:before.white,transparent:before.clear,coloredTrail:before.colored,spritePixels:before.spritePixels,pausedPixelEquality:true}));
  } finally {await browser.close();}
});
test('hardware Chrome: return endpoints stay still through resize/reload and user pans resume continuously',
  {skip:!process.env.ATLAS_RETURN_BROWSER_URL,timeout:120000},async()=>{
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const base=process.env.ATLAS_RETURN_BROWSER_URL;
  try {
    for (const width of [1440,390]) for (const paused of [false,true]) {
      const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(paused=>localStorage.setItem('pinpin.atlas.motion.v1',paused?'paused':'playing'),paused);
      for (const id of ['home','lake','elder','bridge']) {
        await page.goto(base+'atlas-webgpu.html?lang=es&returnPlace='+id);
        await page.waitForFunction(()=>window.atlasGpuDebug?.renderer && atlasGpuDebug.motionCanvas.dataset.sprite==='ready' && !atlasGpuDebug.moving);
        const inspect=()=>page.evaluate(()=>({point:[Number(atlasGpuDebug.motionCanvas.dataset.x),Number(atlasGpuDebug.motionCanvas.dataset.y)],
          camera:atlasGpuDebug.camera.snapshot,arrived:atlasGpuDebug.motionCanvas.dataset.arrived,frame:atlasGpuDebug.motionCanvas.dataset.frame}));
        const expected=await page.evaluate(id=>{
          const g=atlasGeometry,r=g.routes.find(r=>r.id===(id==='home'||id==='lake'?'home-to-lake':'lake-to-'+id));
          return (id==='home'?r.points[0]:r.points.at(-1)).map((v,i)=>v*(i?g.height:g.width));
        },id);
        const before=await inspect();assert.deepEqual(before.point,expected);assert.equal(before.arrived,'true');
        await page.evaluate(()=>dispatchEvent(new Event('resize')));await page.waitForTimeout(400);
        assert.deepEqual((await inspect()).point,expected);assert.deepEqual((await inspect()).camera,before.camera);
        assert.equal(await page.evaluate(()=>atlasGpuDebug.renderer.backend),'webgpu');
        if (width===1440 && !paused) {
          await page.reload();await page.waitForFunction(()=>window.atlasGpuDebug?.renderer && !atlasGpuDebug.moving);
          await page.waitForTimeout(250);assert.deepEqual((await inspect()).point,expected);assert.deepEqual((await inspect()).camera,before.camera);
        }
        await page.locator('#world-canvas').focus();await page.keyboard.press('ArrowRight');
        if (paused) {
          await page.waitForTimeout(300);assert.deepEqual((await inspect()).point,expected);
          await page.evaluate(()=>atlasGpuDebug.motion.toggle());
        }
        await page.waitForTimeout(300);const after=await inspect();
        assert(dist(after.point,expected)>0,'user pan starts a new walk');
        assert(dist(after.point,expected)<44,'pan must not teleport to home or the camera');
        if (id==='bridge' && !paused) {
          const shot=await page.locator('#world-canvas').screenshot({path:'/tmp/pinpin-location-return-'+width+'.png'});
          const colors=await page.evaluate(async png=>{
            const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();
            const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;
            const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,96,64);
            const data=ctx.getImageData(0,0,96,64).data,colors=new Set();
            for(let i=0;i<data.length;i+=4)colors.add([data[i]>>4,data[i+1]>>4,data[i+2]>>4].join(','));
            return colors.size;
          },shot.toString('base64'));
          assert(colors>40,'the actual WebGPU canvas must render varied artwork');
        }
      }
      assert.deepEqual(errors,[]);await context.close();
    }
    const context=await browser.newContext(),page=await context.newPage();
    for (const map of ['atlas.html','atlas-webgpu.html']) for (const [id,route] of
      [['lake','chapter=1'],['elder','chapter=2'],['bridge','story=timber-tractor'],['home','story=home-sweet-home']]) {
      await page.goto(base+'?'+route+'&lang=ru&returnTo='+map+'&returnPlace='+id+'&view=print#scene-2');
      await page.waitForFunction(()=>document.querySelector('#reader-map').href.includes('returnPlace='));
      for (const selector of ['#reader-map','#reader-map-end']) {
        const href=new URL(await page.locator(selector).getAttribute('href'));
        assert.equal(href.pathname,new URL(base+map).pathname);
        assert.deepEqual([...href.searchParams],[['lang','ru'],['returnPlace',id]]);assert.equal(href.hash,'');
      }
      await page.locator('#reader-map').click();
      await page.waitForFunction(()=>window.atlasGpuDebug?.motionCanvas || document.querySelector('#map-motion[data-sprite="ready"]'));
      const point=()=>page.evaluate(()=>{
        const canvas=window.atlasGpuDebug?.motionCanvas || document.querySelector('#map-motion');
        return [Number(canvas.dataset.x),Number(canvas.dataset.y)];
      });
      const expected=await page.evaluate(id=>{
        const g=atlasGeometry,r=g.routes.find(r=>r.id===(id==='home'||id==='lake'?'home-to-lake':'lake-to-'+id));
        return (id==='home'?r.points[0]:r.points.at(-1)).map((v,i)=>v*(i?g.height:g.width));
      },id);
      assert.deepEqual(await point(),expected);await page.waitForTimeout(300);assert.deepEqual(await point(),expected);
    }
    await context.close();
  } finally {await browser.close();}
});
test('hardware Chrome: registry covers save the selected place and browser Back restores it without recentering',
  {skip:!process.env.ATLAS_RETURN_BROWSER_URL,timeout:120000},async()=>{
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const base=process.env.ATLAS_RETURN_BROWSER_URL;
  try {
    const context=await browser.newContext({viewport:{width:1440,height:844}}),page=await context.newPage();
    const ready=()=>page.waitForFunction(()=>document.querySelector('#map-viewport').dataset.mask==='ready' &&
      (window.atlasGpuDebug ? atlasGpuDebug.renderer && !atlasGpuDebug.moving : window.atlasDebug));
    const camera=()=>page.evaluate(()=>window.atlasGpuDebug?atlasGpuDebug.camera.snapshot:
      {center:atlasDebug.map.getCenter(),zoom:atlasDebug.map.getZoom()});
    for (const map of ['atlas-webgpu.html','atlas.html']) for (const id of ['lake','elder','bridge','home']) {
      await page.goto(base+map+'?lang=en&returnPlace=home');await ready();
      await page.waitForFunction(()=>document.querySelector('[data-place="home"]').dataset.state!=='soon');
      await page.evaluate(id=>(window.atlasGpuDebug || atlasDebug).focusDestination(id),id);
      await page.waitForFunction(id=>document.querySelector('.atlas-book')?.dataset.destination===id,id);
      await page.waitForTimeout(250);const expectedCamera=await camera();
      await page.locator('.atlas-book').click();await page.waitForSelector('#story-preview[open]');
      const href=new URL(await page.locator('#preview-open').getAttribute('href'));
      assert.equal(href.searchParams.get('returnPlace'),id);assert.equal(href.searchParams.get('returnTo'),map);
      if (id==='home') assert.equal(href.searchParams.get('story'),'home-sweet-home');
      await page.locator('#preview-open').click();await page.waitForSelector('#reader-map');
      assert.equal(context.pages().length,1,'reader opens in the same tab');
      assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('pinpin.atlas.return.v1'))),{place:id,pending:true});
      await page.goBack();await ready();await page.waitForTimeout(500);
      const result=await page.evaluate(id=>{
        const g=atlasGeometry,r=g.routes.find(r=>r.id===(id==='home'||id==='lake'?'home-to-lake':'lake-to-'+id));
        const canvas=window.atlasGpuDebug?.motionCanvas || document.querySelector('#map-motion');
        return {point:[Number(canvas.dataset.x),Number(canvas.dataset.y)],
          expected:(id==='home'?r.points[0]:r.points.at(-1)).map((v,i)=>v*(i?g.height:g.width)),arrived:canvas.dataset.arrived};
      },id);
      assert.deepEqual(result.point,result.expected);assert.equal(result.arrived,'true');
      const restoredCamera=await camera();
      if (map==='atlas-webgpu.html') assert.deepEqual(restoredCamera,expectedCamera,'Back must not recenter');
      else {
        assert.equal(restoredCamera.zoom,expectedCamera.zoom);
        assert(dist([restoredCamera.center.lat,restoredCamera.center.lng],
          [expectedCamera.center.lat,expectedCamera.center.lng])*2**expectedCamera.zoom<1,'Leaflet restore differs by at most pixel rounding');
      }
      assert.equal(new URL(page.url()).searchParams.get('returnPlace'),id);
    }
    await page.goto(base+'atlas-webgpu.html?returnPlace=elder');await ready();
    await page.evaluate(()=>atlasGpuDebug.camera.focus([-100,-80],5));await page.waitForTimeout(250);
    const negative=await camera();assert(negative.x<0 && negative.y<0);
    await page.reload();await ready();assert.deepEqual(await camera(),negative);
    await context.close();
  } finally {await browser.close();}
});
