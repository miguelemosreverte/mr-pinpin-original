const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../docs/storyboard');
const source=fs.readFileSync(path.join(root,'atlas-motion.js'),'utf8');
const metadata=()=>({displayWidth:56,directions:Array.from({length:24},(_,i)=>({angle:i*15,src:`heading-${i*15}.png`,referenceWidth:100,
  frames:Array.from({length:4},(_,frame)=>({rect:[frame*100,i*100,80,90],anchor:[40,85]}))})),
  blendTransitions:[{from:0,to:15,allowed:true,durationMs:80},{from:15,to:0,allowed:true,durationMs:80}]});
function route(segments) {
  const points=[[.1,.5]];
  for(const [angle,length] of segments) {
    const p=points.at(-1),r=angle*Math.PI/180;
    points.push([p[0]+Math.cos(r)*length/1000,p[1]+Math.sin(r)*length/1000]);
  }
  return {width:1000,height:1000,routes:[{id:'home-to-lake',from:'home',to:'lake',points}],
    sprite:{src:'fallback.png',frames:4,columns:4,referenceWidth:100}};
}
async function harness({geometry=route([[0,400]]),directions=metadata(),mode='',broken=[]}={}) {
  const raf=new Map(),timers=new Map(),events={};let now=0,serial=0;
  function canvas() {
    const stack=[],draws=[],shadows=[];
    const ctx={globalAlpha:1,globalCompositeOperation:'source-over',draws,shadows,
      save(){stack.push([this.globalAlpha,this.globalCompositeOperation]);},restore(){[this.globalAlpha,this.globalCompositeOperation]=stack.pop();},
      clearRect(){draws.length=0;shadows.length=0;},translate(){},setLineDash(){},stroke(){},beginPath(){},fill(){},
      ellipse(...args){shadows.push({args,alpha:this.globalAlpha});},
      drawImage(...args){draws.push({args,alpha:this.globalAlpha,operation:this.globalCompositeOperation});}};
    return {dataset:{},width:128,height:128,getContext:()=>ctx};
  }
  const document={hidden:false,createElement:canvas,addEventListener:(name,fn)=>events[name]=fn};
  const context=vm.createContext({window:{atlasDirections:directions,location:{search:mode?'?spriteMode='+mode:''}},URLSearchParams,document,
    matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:()=>null,setItem(){}},addEventListener(){},
    performance:{now:()=>now},requestAnimationFrame(fn){raf.set(++serial,fn);return serial;},cancelAnimationFrame:id=>raf.delete(id),
    setTimeout(fn,ms){timers.set(++serial,{fn,at:now+ms});return serial;},clearTimeout:id=>timers.delete(id),
    Path2D:class {moveTo(){}lineTo(){}},Image:class {naturalWidth=400;naturalHeight=100;
      decode(){return broken.includes(this.src)?Promise.reject(Error('missing')):Promise.resolve();}}});
  vm.runInContext(source,context);
  const surface=canvas(),motion=context.window.AtlasMotion.create(surface,geometry);
  const layer={canvas:canvas(),anchor:[64,112],revision:0,ready:false};surface.atlasSetSpriteLayer(layer);
  for(let i=0;i<8;i++)await Promise.resolve();
  function step(ms=10) {
    now+=ms;
    for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}
    const callbacks=[...raf.values()];raf.clear();callbacks.forEach(fn=>fn(now));
  }
  step(0);
  return {motion,layer,canvas:surface,context,step,raf,timers,geometry,get now(){return now;},
    point:()=>[Number(surface.dataset.x),Number(surface.dataset.y)],get draws(){return layer.canvas.getContext('2d').draws;},
    get shadows(){return layer.canvas.getContext('2d').shadows;},hide(value){document.hidden=value;events.visibilitychange();},
    advance(ms){for(let left=ms;left>0;left-=10)step(Math.min(10,left));}};
}
test('natural is the default and unknown-mode fallback; crisp and legacy keep constant speed and no shadow',async()=>{
  for(const mode of ['', 'natural', 'unknown','crisp','legacy']) {
    const h=await harness({mode});h.advance(100);
    const natural=!['crisp','legacy'].includes(mode);
    assert.equal(h.canvas.dataset.spriteMode,natural?'natural':mode);
    if(natural) {assert(h.point()[0]>100 && h.point()[0]<102);assert.equal(h.shadows.length,1);}
    else {assert(Math.abs(h.point()[0]-104.4)<1e-8);assert.equal(h.shadows.length,0);}
  }
});
test('natural acceleration, positive step pulses and braking preserve distance-driven gait and exact endpoints',async()=>{
  const h=await harness({geometry:route([[0,45]])}),speeds=[],first=[],last=[];
  for(let i=0;i<300 && h.canvas.dataset.arrived!=='true';i++) {
    const before=h.point()[0];h.step();const speed=(h.point()[0]-before)*100;
    assert(speed>=0 && speed<=44*1.11+1e-7);assert.equal(h.point()[1],500);
    if(i<15)first.push(speed);
    if(h.now>300 && h.point()[0]<135)speeds.push(speed);
    if(h.point()[0]>142)last.push(speed);
    const drawnDistance=Number(h.canvas.dataset.gaitDistance);
    assert.equal(Number(h.canvas.dataset.frame),Math.floor((drawnDistance+1e-7)/8.36)%4);
    assert(Math.abs(Number(h.canvas.dataset.speed)-(h.canvas.dataset.arrived==='true'?0:speed))<1e-6);
  }
  assert.deepEqual(h.point(),h.geometry.routes[0].points.at(-1).map(v=>v*1000));assert.equal(h.canvas.dataset.arrived,'true');
  assert(first[0]<first.at(-1) && first.at(-1)<44);
  assert(Math.max(...speeds)-Math.min(...speeds)>2,'steady walking has visible speed variation');
  assert(last.at(-1)<last[0],'arrival slows down');
  h.advance(100);assert.equal(h.canvas.dataset.bob,'0');assert.equal(h.canvas.dataset.speed,'0');
});
test('direction confirmation and hold use simulation time; approved fades are transient and normalized',async()=>{
  const h=await harness({geometry:route([[15,100]])});
  h.advance(120);assert.equal(h.canvas.dataset.direction,'0');
  for(let i=0;i<100;i++)h.motion.update();assert.equal(h.canvas.dataset.direction,'0');
  h.advance(30);assert.equal(h.canvas.dataset.direction,'15');
  assert.equal(h.draws.length,2);assert.equal(h.canvas.dataset.blending,'true');
  assert.deepEqual(h.draws.map(d=>d.args[1]),[0,0],'both headings use the same gait frame');
  assert(Math.abs(h.draws.reduce((sum,d)=>sum+d.alpha,0)-1)<1e-12);
  assert(h.draws.every(d=>d.operation==='lighter'));
  h.advance(80);assert.equal(h.draws.length,1);assert.equal(h.draws[0].alpha,1);
  h.advance(300);assert.equal(h.draws.length,1);assert.equal(h.canvas.dataset.direction,'15');
});
test('candidate jitter cannot flip views, while continuous curves cannot starve turns',async()=>{
  const jitter=await harness({geometry:route([[0,10],...Array.from({length:16},(_,i)=>[i%2?0:15,.7]),[15,40]])});
  while(jitter.point()[0]<119) {jitter.step();assert.equal(jitter.canvas.dataset.direction,'0');}
  jitter.advance(600);assert.equal(jitter.canvas.dataset.direction,'15');
  const curved=await harness({geometry:route([...Array.from({length:12},(_,i)=>[i*15,3]),[165,40]])});
  const turns=[];let previous=curved.canvas.dataset.direction;
  for(let i=0;i<150;i++) {
    curved.step();const next=curved.canvas.dataset.direction;
    if(next!==previous){turns.push({time:curved.now,direction:next});previous=next;}
  }
  assert(turns.length>=2,'continuous candidate changes still make bounded progress');
  for(let i=1;i<turns.length;i++)assert(turns[i].time-turns[i-1].time>=150);
  assert(turns[0].time<=500,'a curve cannot postpone the first turn indefinitely');
});
test('denied, missing, far and reverse rules never blend; wrapping adjacent headings may blend',async()=>{
  for(const [angle,rule,allow] of [[15,null,false],[15,{from:0,to:15,allowed:false,durationMs:80},false],
    [45,{from:0,to:45,allowed:true,durationMs:80},false],[180,{from:0,to:180,allowed:true,durationMs:80},false],
    [345,{from:0,to:345,allowed:true,durationMs:80},true]]) {
    const data=metadata();data.blendTransitions=rule?[rule]:[];
    const h=await harness({geometry:route([[angle,100]]),directions:data});h.advance(150);
    assert.equal(h.canvas.dataset.direction,String(angle));assert.equal(h.draws.length,allow?2:1);
    h.advance(100);assert.equal(h.draws.length,1);assert.equal(h.draws[0].alpha,1);
  }
});
test('one undirected metadata entry enables both directions and denied entries forbid both',async()=>{
  for(const allowed of [true,false]) {
    const data=metadata();data.blendTransitions=[{from:120,to:135,allowed,durationMs:80,score:.8857}];
    const h=await harness({geometry:route([[120,20],[135,30],[120,30]]),directions:data}),pairs=new Set();
    for(let i=0;i<240;i++) {
      h.step();
      if(h.draws.length===2)pairs.add(h.draws.map(d=>d.args[0].src).join('>'));
    }
    assert.deepEqual([...pairs],allowed?
      ['heading-120.png>heading-135.png','heading-135.png>heading-120.png']:[]);
  }
});
test('arrival settles a final heading even before the turn hold, then remains still',async()=>{
  const h=await harness({geometry:route([[15,.1]])});h.advance(120);
  assert.equal(h.canvas.dataset.arrived,'true');assert.equal(h.canvas.dataset.direction,'15');
  assert.equal(h.draws.length,1);assert.equal(h.canvas.dataset.turning,'false');
  const revision=h.layer.revision;h.advance(1000);assert.equal(h.layer.revision,revision);
});
test('a transition freezes the gait phase even when distance crosses a gait boundary',async()=>{
  let crossed=false;
  for(let length=1;length<=12 && !crossed;length++) {
    const h=await harness({geometry:route([[0,length],[15,60]])});
    for(let i=0;i<100 && h.draws.length!==2;i++)h.step();
    assert.equal(h.draws.length,2);
    const frame=Number(h.canvas.dataset.frame);assert(h.draws.every(d=>d.args[1]===frame*100));
    h.advance(50);
    assert.equal(Number(h.canvas.dataset.frame),frame,'phase remains frozen through the transition');
    crossed=Math.floor(Number(h.canvas.dataset.gaitDistance)/8.36)%4!==frame;
  }
  assert(crossed,'test exercises an actual distance-phase boundary during a transition');
});
test('body lift is bounded and ground shadow stays fixed; moving uploads never exceed 20Hz',async()=>{
  const h=await harness(),revisions=[],lifts=[];let revision=h.layer.revision;
  for(let i=0;i<240;i++) {
    h.step(1000/120);
    assert.equal(h.layer.footY,h.point()[1]);assert.equal(h.layer.y+h.layer.anchor[1],h.point()[1]);
    const lift=Number(h.canvas.dataset.bob);assert(lift>=0 && lift<=.8);lifts.push(lift);
    assert.equal(h.shadows.length,1);assert.deepEqual(h.shadows[0].args.slice(0,4),[0,0,9,1.7]);
    assert.equal(h.draws.length,1);assert.equal(h.draws[0].alpha,1);
    assert(Math.abs(h.draws[0].args[6]+85*.56+lift)<1e-10);
    assert.equal(h.layer.imageKey.split(';').length,2,'imageKey has only direction and image samples');
    if(h.layer.revision!==revision){revisions.push(h.now);revision=h.layer.revision;}
  }
  assert(Math.max(...lifts)>.6);assert(revisions.length<=40);
  for(let i=1;i<revisions.length;i++)assert(revisions[i]-revisions[i-1]>=50-1e-6);
});
test('paused, hidden and suspended motion freeze turns, lift and speed; idle settles once',async()=>{
  for(const state of ['paused','hidden','suspended','idle']) {
    const h=await harness({geometry:route([[15,30]])});h.advance(150);
    if(state==='paused')h.motion.toggle();
    if(state==='hidden')h.hide(true);
    if(state==='suspended')h.motion.suspend(true);
    if(state==='idle'){h.step(1000000);h.advance(100);}
    const point=h.point(),revision=h.layer.revision,key=h.layer.imageKey,bob=h.canvas.dataset.bob;
    h.advance(1000);for(let i=0;i<100;i++)h.motion.update();
    assert.deepEqual(h.point(),point,state);assert.equal(h.layer.revision,revision,state);
    assert.equal(h.layer.imageKey,key,state);assert.equal(h.canvas.dataset.bob,bob,state);
    if(state==='idle'){assert.equal(h.canvas.dataset.direction,'15');assert.equal(bob,'0');}
  }
});
test('missing headings remain opaque, no-metadata fallback remains animated, and large deltas have bounded work',async()=>{
  const missing=await harness({geometry:route([[15,100]]),broken:['heading-15.png']});missing.advance(300);
  assert.equal(missing.draws.length,1);assert.equal(missing.draws[0].alpha,1);
  const fallback=await harness({directions:null});fallback.advance(400);
  assert.equal(fallback.canvas.dataset.direction,'fallback');assert.equal(fallback.draws.length,1);
  const h=await harness({geometry:route([[0,20],[90,30],[15,40]])});
  h.step(1e12);
  assert.deepEqual(h.point(),h.geometry.routes[0].points.at(-1).map(v=>v*1000));
  assert.equal(h.canvas.dataset.arrived,'true');assert.equal(h.canvas.dataset.direction,'15');
  h.advance(100);assert.equal(h.canvas.dataset.bob,'0');
});
test('natural production walks stay on derived centerlines, retain speed bounds and reach exact projected targets',async()=>{
  const scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'atlas-geometry.js'),'utf8'),scope);
  const geometry=scope.window.atlasGeometry,h=await harness({geometry});
  const edges=h.motion.navigation.edges;
  const gap=(p,e)=>{
    const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1];
    const t=Math.max(0,Math.min(1,((p[0]-e.a[0])*dx+(p[1]-e.a[1])*dy)/(dx*dx+dy*dy)));
    return Math.hypot(p[0]-e.a[0]-t*dx,p[1]-e.a[1]-t*dy);
  };
  for(const target of [[1380,807.5],[1505,750],[1310,819.75]]) {
    h.motion.setTarget(target.map((v,i)=>v/(i?geometry.height:geometry.width)));
    let count=0;
    do {
      const previous=h.point();h.step(50);const point=h.point();
      assert(Math.hypot(point[0]-previous[0],point[1]-previous[1])<=44*1.11*.05+1e-7);
      assert(Math.min(...edges.map(edge=>gap(point,edge)))<1e-6,'point lies on a real derived segment');
      assert.equal(h.layer.footY,point[1]);assert(++count<2000);
    } while(h.canvas.dataset.arrived!=='true');
    assert.deepEqual(h.point(),JSON.parse(h.canvas.dataset.target));
  }
});
