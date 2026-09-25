const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const player=require('../docs/storyboard/atlas-video-sprite.js');
const source=fs.readFileSync(require.resolve('../docs/storyboard/atlas-motion.js'),'utf8');
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};

// Analytic ground independent of the texture decoder/planner worker. A deliberately unsafe planner
// lets the adapter prove its last sweep also protects ordinary route walking and turn travel.
function ground(signedDistance) {
  return {
    signedDistance,groundDepth:()=>.36,light:()=>1,
    distanceGradient(x,y) {const e=.01;return [(signedDistance(x+e,y)-signedDistance(x-e,y))/(2*e),
      (signedDistance(x,y+e)-signedDistance(x,y-e))/(2*e)];},
    plan:(a,b)=>[a.slice(),b.slice()],
    sweep(a,b,clearance=3) {
      const at=t=>a.map((v,i)=>v+(b[i]-v)*t),steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*8));
      for(let i=1;i<=steps;i++) {
        const previous=signedDistance(...at((i-1)/steps)),next=signedDistance(...at(i/steps));
        if(previous<clearance) {
          if(next<=previous)return {point:at((i-1)/steps),fraction:(i-1)/steps,blocked:true};
          continue;
        }
        if(next>=clearance)continue;
        let lo=(i-1)/steps,hi=i/steps;
        for(let j=0;j<30;j++) {const mid=(lo+hi)/2;if(signedDistance(...at(mid))>=clearance)lo=mid;else hi=mid;}
        return {point:at(lo),fraction:lo,blocked:true};
      }
      return {point:b.slice(),fraction:1,blocked:false};
    }
  };
}

function fieldFromPixels(dataRGBA,width,height,base=new Uint8ClampedArray(dataRGBA.length).fill(128)) {
  const context=vm.createContext({window:{}});
  vm.runInContext(fs.readFileSync(require.resolve('../docs/storyboard/atlas-ground-planner.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(require.resolve('../docs/storyboard/atlas-field.js'),'utf8'),context);
  return context.window.AtlasField.createField(base,width,height,null,null,null,{dataRGBA,scale:16,bias:32768,clearance:3,softRange:18});
}

function metricField(signedDistance,width=400,height=600) {
  const base=new Uint8ClampedArray(width*height*4),dataRGBA=new Uint8ClampedArray(base.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const i=(y*width+x)*4,encoded=Math.round(32768+16*signedDistance(x,y));
    base.set([255,128,128,255],i);dataRGBA.set([encoded>>8,encoded&255,0,255],i);
  }
  return fieldFromPixels(dataRGBA,width,height,base);
}

async function harness({field=ground(()=>100),query='',deferred=false,missing=false,video=true,turnWalk,reducedMotion=false,storedPause=false,runtime=null,search,onChange}={}) {
  if(!turnWalk) {
    const profile=await import('../docs/storyboard/sprite-turn-profile.mjs');
    turnWalk={integrateWalkTurn:profile.integrateWalkTurn,turnRate:profile.turnRate,gait:{}};
  }
  let clock=0,serial=0,resolveField,rejectField;
  const raf=new Map(),timers=new Map(),loads=[],videoOptions=[];
  const ctx={save(){},restore(){},clearRect(){},translate(){},setLineDash(){},stroke(){},drawImage(){}};
  const canvas={dataset:{},getContext:()=>ctx};
  const pending=new Promise((resolve,reject)=>{resolveField=resolve;rejectField=reject;});
  const pad=n=>String(n).padStart(3,'0'),clips={};
  for(let h=0;h<360;h+=15)for(const id of ['loop'+pad(h),'turn'+pad(h)+pad((h+15)%360),'turn'+pad(h)+pad((h+345)%360)])
    clips[id]={sheet:id+'.webp',size:[24,1],frames:Array.from({length:24},(_,i)=>[i,0,1,1])};
  const manifest={grounding:{anchor:[.5,1],referenceWidth:1},clips};
  const context=vm.createContext({window:{location:{search:search ?? '?spriteTrial=1&sandbox=1'+(video?'&spriteSet=video':'')+query},
    AtlasField:missing ? undefined : {load:async(...args)=>{loads.push(args);return deferred ? pending : field;}},
    AtlasTurnWalk:turnWalk,
    AtlasVideoSprite:{create:options=>{videoOptions.push(options);return player.create({...options,fetchManifest:async()=>manifest,decodeImage:async()=>({width:24,height:1})});}}},
    document:{hidden:false,addEventListener(){}},URLSearchParams,matchMedia:()=>({matches:reducedMotion,addEventListener(){}}),
    localStorage:{getItem(){return storedPause ? 'paused' : null;},setItem(){}},addEventListener(){},
    requestAnimationFrame:fn=>{raf.set(++serial,fn);return serial;},cancelAnimationFrame:id=>raf.delete(id),
    setTimeout:(fn,ms)=>{timers.set(++serial,{fn,at:clock+ms});return serial;},clearTimeout:id=>timers.delete(id),
    performance:{now:()=>clock},Path2D:class{moveTo(){}lineTo(){}},
    Image:class{naturalWidth=4;naturalHeight=4;decode(){return Promise.resolve();}}});
  vm.runInContext(source,context);
  const motion=context.window.AtlasMotion.create(canvas,{width:1000,height:1000,
    routes:[{id:'home-to-lake',from:'home',to:'lake',points:[[.1,.5],[.9,.5]]}],
    sprite:{src:'original.png',columns:1,rows:1,frames:1,referenceWidth:4}},onChange,undefined,runtime);
  async function frame(ms=25) {
    await flush();clock+=ms;
    for(const [id,timer] of [...timers])if(timer.at<=clock) {timers.delete(id);timer.fn();}
    const callbacks=[...raf.values()];raf.clear();callbacks.forEach(fn=>fn(clock));await flush();
  }
  await frame(0);
  return {motion,canvas,loads,videoOptions,frame,resolve:()=>resolveField(field),reject:()=>rejectField(Error('SDF decode failed')),
    point:()=>Array.from(motion.getState().point),target:p=>motion.setTarget(p.map(v=>v/1000)),
    async advance(ms,check=()=>{}) {for(let t=0;t<ms;t+=25) {await frame(Math.min(25,ms-t));check();}}};
}

test('sandbox selects the metric SDF contract; legacy rollback excludes SDF',async()=>{
  const h=await harness();
  assert.deepEqual(JSON.parse(JSON.stringify(h.loads[0])),['images/atlas/shire-field-v1.png','images/atlas/shire-tone-v1.png',null,null,
    {src:'images/atlas/shire-ground-sdf-v4.png',scale:16,bias:32768,clearance:3,softRange:18}]);
  assert.equal(h.motion.groundFieldStatus.state,'ready');assert.equal(h.motion.groundDistanceAt([20,20]),100);
  const legacy=await harness({query:'&groundField=legacy',field:{...ground(()=>100),walkability:()=>1,walkGradient:()=>[0,0]}});
  assert.equal(legacy.loads[0].length,4);assert.match(legacy.loads[0][2],/shire-walk-v1/);
  assert.equal(legacy.motion.groundFieldStatus.state,'ready');assert.equal(legacy.motion.groundDistanceAt([20,20]),null);
});

test('explicit invalid placement recovers only toward increasing clearance via a pointer target',async()=>{
  const field=metricField(x=>x-105);
  for(const query of ['', '&walk=field']) {
    const h=await harness({field,query,deferred:true});
    assert.deepEqual(h.point(),[100,500]);h.motion.placeAt([100,500]);h.target([300,500]);h.resolve();
    let previous=field.signedDistance(...h.point());
    await h.advance(6000,()=>{
      const distance=field.signedDistance(...h.point());assert(distance>=previous);previous=distance;
    });
    assert(h.point()[0]>150);assert.equal(h.motion.groundFieldStatus.state,'ready');
    const inward=await harness({field,query,deferred:true});inward.motion.placeAt([100,500]);inward.target([20,500]);inward.resolve();await inward.advance(1000);
    assert.deepEqual(inward.point(),[100,500]);assert.equal(inward.motion.getState().walkTime,0);
    const tangent=await harness({field,query,deferred:true});tangent.motion.placeAt([100,500]);tangent.target([100,800]);tangent.resolve();await tangent.advance(1000);
    assert.deepEqual(tangent.point(),[100,500]);assert.equal(tangent.motion.getState().walkTime,0);
  }
});

test('invalid untouched spawn recovers once on readiness while preserving paused intent, heading and clocks',async()=>{
  const field=metricField(x=>x-105);
  for(const pause of [{reducedMotion:true},{storedPause:true}])for(const query of ['', '&walk=field']){
    const h=await harness({field,deferred:true,query,...pause});h.target([300,500]);
    const before=h.motion.getState(),heading=h.motion.sandboxPose.heading;h.resolve();await h.frame(0);
    const after=h.motion.getState();assert.deepEqual(h.point(),[108,500]);assert.equal(after.paused,true);
    assert.deepEqual(Array.from(after.target),[300,500]);assert.equal(h.motion.sandboxPose.heading,heading);
    assert.equal(after.walkTime,before.walkTime);assert.equal(after.video.elapsed,before.video.elapsed);
    assert.equal(after.video.frame,before.video.frame);assert.equal(after.video.clip,before.video.clip);
    await h.advance(1000);assert.deepEqual(h.point(),[108,500]);
    h.motion.placeAt([100,500]);await h.advance(1000);assert.deepEqual(h.point(),[100,500],'not an ongoing recovery loop');
  }
});

test('spawn correction leaves valid starts, explicit pre-ready placements and free mode alone',async()=>{
  const invalid=metricField(x=>x-105),valid=metricField(()=>100);
  const h=await harness({field:valid,storedPause:true});assert.deepEqual(h.point(),[100,500]);
  for(const place of [m=>m.placeAt([100,500]),m=>m.placeAtLocation('home')]){
    const p=await harness({field:invalid,deferred:true,storedPause:true});place(p.motion);p.resolve();await p.frame(0);
    assert.deepEqual(p.point(),[100,500]);
  }
  const free=await harness({field:invalid,storedPause:true,query:'&walk=free'});assert.deepEqual(free.point(),[100,500]);
  const blocked=await harness({field:metricField(()=>-40),storedPause:true});assert.deepEqual(blocked.point(),[100,500]);
});

test('queryless production config activates the accepted motion and keeps reader return parked',async()=>{
  const {resolveAtlasRuntime}=await import('../docs/storyboard/atlas-production.js');
  const runtime=resolveAtlasRuntime('','mr-pinpin.github.io'),field=metricField(x=>x-105);
  const h=await harness({field,runtime,search:'',storedPause:true});await h.motion.ready;
  assert.equal(h.motion.spriteSet,'video');assert.equal(h.motion.walkMode,'steer');
  assert.equal(h.motion.groundFieldStatus.state,'ready');assert.deepEqual(h.point(),[108,500]);
  assert.equal(h.videoOptions[0].manifestUrl,'./images/atlas/walk/manifest.json');assert.equal(h.videoOptions[0].pace,.3);
  assert.equal(h.motion.placeAt([200,500]),false,'public config does not expose review placement');
  h.motion.toggle();h.target([300,500]);await h.advance(1200);assert(h.point()[0]>108);
  assert.equal(h.motion.placeAtLocation('home'),true);assert.deepEqual(h.point(),[108,500]);
  await h.advance(1200);assert.deepEqual(h.point(),[108,500],'return cancels old sticky aim without bouncing into home');
});

test('actual steering completion emits once per goal and projected home arrival enters the menu',async()=>{
  const {resolveAtlasRuntime}=await import('../docs/storyboard/atlas-production.js');
  const runtime=resolveAtlasRuntime('','mr-pinpin.github.io'),events=[],navigations=[];
  let arrival;
  const h=await harness({field:metricField(x=>x-105),runtime,search:'',storedPause:true,
    onChange:event=>{if(event?.type==='arrival'){events.push(event);arrival?.(event.point);}}});
  const page=fs.readFileSync(require.resolve('../docs/storyboard/atlas-webgpu.js'),'utf8');
  const start=page.indexOf('function arrive('),end=page.indexOf('\nfunction interact()',start);
  const context=vm.createContext({URL,URLSearchParams,width:1000,height:1000,
    geometry:{width:1000,height:1000,routes:[{id:'home-to-lake',points:[[.1,.5]]}]},
    motion:h.motion,state:{},lang:'es',returnStorageKey:'return',sessionStorage:{setItem(){}},
    saveCamera(){},save(){},chooseBook(){},
    location:{search:'',href:'https://mr-pinpin.github.io/storyboard/atlas-webgpu.html',assign:u=>navigations.push(u)}});
  vm.runInContext(page.slice(start,end),context);arrival=context.arrive;
  h.target([160,500]);h.motion.toggle();await h.advance(8000);
  assert.equal(events.length,1,'lookahead segment ends are not destination arrivals');
  assert.equal(navigations.length,0,'ordinary nearby ground does not enter the house');
  h.target([100,500]);await h.advance(12000);
  assert.equal(h.motion.reviewDiagnostics.planner.reason,'projected-arrival');
  assert.equal(events.length,2,'projected completion emits an arrival even after the last short segment ended');
  assert.deepEqual(navigations,['https://mr-pinpin.github.io/?lang=es']);
  await h.advance(2000);assert.equal(events.length,2);assert.equal(navigations.length,1);
});

test('blocked steering completion does not emit a destination arrival',async()=>{
  const events=[],h=await harness({field:ground(()=>-40),onChange:event=>{if(event?.type==='arrival')events.push(event);}});
  h.motion.placeAt([100,500]);h.target([200,500]);await h.advance(2000);
  assert.equal(h.motion.groundFieldStatus.held,true);assert.equal(events.length,0);
});

test('loading holds the initial spawn and latest target; failure is visible; free stays unrestricted',async()=>{
  for(const mode of ['steer','field']) {
    const h=await harness({deferred:true,query:'&walk='+mode});h.target([700,500]);
    await h.advance(1000);assert.deepEqual(h.point(),[100,500]);assert.equal(h.motion.getState().walkTime,0);
    assert.equal(h.canvas.dataset.groundFieldState,'loading');
    h.resolve();await h.advance(500);assert(h.point()[0]>100);
    const failed=await harness({deferred:true,query:'&walk='+mode});failed.target([700,500]);failed.reject();
    await failed.advance(1000);assert.deepEqual(failed.point(),[100,500]);
    assert.equal(failed.canvas.dataset.groundFieldState,'failed');assert.match(failed.canvas.dataset.groundFieldError,/decode/);
  }
  const absent=await harness({missing:true});await absent.advance(500);
  assert.deepEqual(absent.point(),[100,500]);assert.equal(absent.motion.groundFieldStatus.state,'failed');
  const free=await harness({missing:true,query:'&walk=free'});await free.advance(500);assert(free.point()[0]>100);
});

test('flat blocked interiors never leak and have no gait credit',async()=>{
  for(const mode of ['steer','field']) {
    const h=await harness({field:ground(()=>-40),query:'&walk='+mode});h.motion.placeAt([100,500]);h.target([900,500]);
    await h.advance(1000);assert.deepEqual(h.point(),[100,500]);assert.equal(h.motion.getState().walkTime,0);
    assert.equal(h.motion.groundFieldStatus.held,true);
  }
});

test('wall approach stops and freezes gait until a valid new target',async()=>{
  const field=ground(x=>200-x),h=await harness({field});h.motion.placeAt([100,500]);h.target([400,500]);
  await h.advance(7000,()=>assert(field.signedDistance(...h.point())>=3));
  assert(h.point()[0]>150);assert(h.point()[0]<=197);assert.equal(h.canvas.dataset.arrived,'true');
  const before=h.motion.getState();await h.advance(2000);
  assert.deepEqual(h.point(),Array.from(before.point));assert.equal(h.motion.getState().walkTime,before.walkTime);
  assert.equal(h.motion.getState().video.frame,before.video.frame);assert.equal(h.motion.getState().video.elapsed,before.video.elapsed);
  h.target([h.point()[0],650]);await h.advance(4000);assert(h.point()[1]>520);
});

test('oblique aim slides along a flat wall without crossing it',async()=>{
  const field=ground(x=>200-x),h=await harness({field});h.motion.placeAt([170,300]);h.target([250,850]);
  await h.advance(10000,()=>assert(field.signedDistance(...h.point())>=3));
  assert(h.point()[1]>550,JSON.stringify(h.point()));assert(h.point()[0]<=197);
});

test('narrow sloped bridge admits travel both ways without a medial-axis push',async()=>{
  const slope=-.1,centre=x=>500+slope*(x-100),norm=Math.hypot(1,slope);
  const field=ground((x,y)=>8-Math.abs(y-centre(x))/norm);
  for(const [from,to] of [[[100,500],[500,460]],[[500,460],[100,500]]]) {
    const h=await harness({field});h.motion.placeAt(from);h.target(to);
    await h.advance(20000,()=>assert(field.signedDistance(...h.point())>=3));
    assert(Math.hypot(h.point()[0]-to[0],h.point()[1]-to[1])<12,JSON.stringify(h.point()));
    assert(Math.abs(h.point()[1]-centre(h.point()[0]))<1e-5,'No lateral drift from the centre');
  }
});

// Unmodified v4 RG16 crop [1294,790,1318,814], from SDF SHA-256 88d37064cf43be7a...
// Local coordinates retain the two observed valid short approaches to the front wheel.
const wheelArrivalPixels=Uint8ClampedArray.from(require('node:zlib').inflateSync(Buffer.from(
  'eJyN1G1klWEcx/FTerFaFD2YpLGUtBI9zEwvKmLWHCmppKSJshQRTdH9T1kR69VRJjEtZRrVm2VksmVFRbQejiSSlaKNmGTre7l/x64uZ/d9XnwczuF8Xf/rIcplJqIrOI8WnEQzmrAfe7FHGlCHaizGHJRlJs6NYRh5vEQ/evCA3ztwDW1ohXmdYziKI2plsQlrsQwV3v+P4IvXeIo+fu9GJ24gF3TOei23nl2oT1iD33gTd6JePEQXbnmdq5pbqxrNU6yhWGN4shM9g1vHo6BzE+1ajxVZw8aEhteJhvAKg0GnW51csIYD2Jnc8DsR64g+Bp0n6nRpXm06X6e030mNiv870Sh+eJ236vRpHZ06X24vopRGddCBTePzT9AZ0r70ak4dmlNSw+15nddZETPWYmVexzU+4TUGNKd7KQ2359mgUxuzJVioznS++w2373nNqT+l4d/1QqdBLdgqMDNzsyrnu3HN6is+pDRKeFOMtdgaVGFBPKvoL0ZSGqW8KbCtcHNiT6wS80polPKmnI4Z87ItqMFK7UdSYyCT/qZcxqWYuRk1gn23DSmNvM5V2ptyXfODsSe2G9tSGqM6V+7sJr0prnUXd2J2HIdKaIzr7Pp3PXxTHmt2rtcTs5aURqXOVbnuR3jXC2+Km9sLPNf8BmN2IaFRo3NVpfsxN7jrhY7bm89quXPwHu9i1jZFo1Hnqlb3Y3lw1/2Om9sv/MR3fNNewdqLNJp0rrK6H7yPtt67635nJmYgo3PgemOT7HaRxgkcxj7sAO+JbdZdXxd03NzmqzUbs7S2gvteg/thF3EG3HVz9/ug5rUd9UFnNdwbvFTngHffFqkp/wACSng4','base64')));
for(const [name,world] of [['wheel',[1300.7529,808.0492]],['west',[1301.2072,806.2777]]]) {
  test('short sweep-clear '+name+' arrival is not cancelled by opposing boundary normals',async()=>{
    const field=fieldFromPixels(wheelArrivalPixels,24,24),from=[world[0]-1294,world[1]-790],to=[16,6];
    assert.equal(field.signedDistance(...to),3.75);
    assert.equal(field.sweep(from,to,3).blocked,false);
    const h=await harness({field});h.motion.placeAt(from);h.target(to);
    assert.equal(h.motion.groundFieldStatus.held,false,'A fully clear short leg must remain active');
    await h.advance(5000,()=>assert(field.signedDistance(...h.point())>=3));
    assert(Math.hypot(h.point()[0]-to[0],h.point()[1]-to[1])<8,JSON.stringify(h.point()));
    assert.equal(h.motion.groundFieldStatus.held,false);
  });
}

test('short arrival with clear endpoints still rejects a blocked intervening chord',async()=>{
  const field=ground(x=>Math.abs(x-110)-2),h=await harness({field});
  h.motion.placeAt([100,500]);assert.equal(field.signedDistance(120,500),8);h.target([120,500]);
  await h.advance(2000,()=>assert(h.point()[0]<=105));
  assert.equal(h.motion.groundFieldStatus.held,true);
});

test('field route clips unsafe planner endpoints for ordinary, video and turn-walk followers',async()=>{
  for(const video of [false,true]) {
    const field=ground(x=>200-x),h=await harness({field,video,query:'&walk=field'});
    h.motion.placeAt([100,500]);h.target([900,500]);await h.frame();
    if(!video)await h.frame(10000);
    await h.advance(5000,()=>assert(field.signedDistance(...h.point())>=3));
    assert(Math.abs(h.point()[0]-197)<1e-5);assert.equal(h.canvas.dataset.arrived,'true');
    const before=h.motion.getState();await h.advance(1000);assert.equal(h.motion.getState().walkTime,before.walkTime);
    if(video)assert.equal(h.motion.getState().video.elapsed,before.video.elapsed);
  }
  const field=ground((x,y)=>Math.min(200-x,510-y));
  const h=await harness({field,query:'&walk=field',turnWalk:{turnRate:()=>1,integrateWalkTurn:()=>[100,100],gait:{}}});
  h.motion.placeAt([100,500]);h.target([400,800]);
  await h.advance(3000,()=>assert(field.signedDistance(...h.point())>=3));
  assert.equal(h.canvas.dataset.arrived,'true');assert(h.point()[1]<=507);
  const before=h.motion.getState();await h.advance(1000);assert.equal(h.motion.getState().video.elapsed,before.video.elapsed);
});

test('collision during an active turn holds its exact clip/frame until a valid target',async()=>{
  let blocked=false;
  const field=ground(()=>blocked ? -20 : 100),h=await harness({field,query:'&walk=field'});
  h.motion.placeAt([100,500]);h.target([100,800]);
  for(let i=0;i<20 && h.motion.getState().video.mode!=='turn';i++)await h.frame();
  assert.equal(h.motion.getState().video.mode,'turn');blocked=true;await h.frame();
  const before=h.motion.getState();await h.advance(2000);const after=h.motion.getState();
  assert.deepEqual(Array.from(after.point),Array.from(before.point));assert.equal(after.walkTime,before.walkTime);
  assert.equal(after.video.clip,before.video.clip);assert.equal(after.video.frame,before.video.frame);
  assert.equal(after.video.elapsed,before.video.elapsed);assert.equal(h.motion.groundFieldStatus.held,true);
  blocked=false;h.target([100,900]);await h.advance(3000);assert(h.point()[1]>500);
});

test('a rejected field target stops the old route; a resolved blocked target freezes at its safe endpoint',async()=>{
  const field=ground(x=>200-x),h=await harness({field,query:'&walk=field'});
  h.motion.placeAt([100,500]);h.target([150,500]);await h.advance(100);
  field.plan=()=>null;h.target([400,700]);const at=h.point();await h.advance(1000);
  assert.deepEqual(h.point(),at);assert.equal(h.canvas.dataset.arrived,'true');
  field.plan=(from)=>[from.slice(),[180,510]];h.target([400,700]);
  await h.advance(5000);assert.deepEqual(h.point(),[180,510]);assert.equal(h.motion.groundFieldStatus.held,true);
  const before=h.motion.getState();await h.advance(1000);const after=h.motion.getState();
  assert.equal(after.video.frame,before.video.frame);assert.equal(after.video.elapsed,before.video.elapsed);
  assert.equal(after.walkTime,before.walkTime);
});

test('free mode bypasses collision and switching to protected mode cancels its unsafe route',async()=>{
  const h=await harness({field:ground(()=>-40),query:'&walk=free'});await h.advance(500);assert(h.point()[0]>100);
  h.motion.setWalkMode('steer');const point=h.point();h.target([900,500]);await h.advance(1000);
  assert.deepEqual(h.point(),point);h.motion.setWalkMode('free');h.target([700,500]);await h.advance(500);assert(h.point()[0]>point[0]);
});

test('planned SDF steering carries the video follower around an obstacle on one persistent route',async()=>{
  const field=metricField((x,y)=>{
    const dx=Math.max(155-x,0,x-225),dy=Math.max(455-y,0,y-545);
    return dx||dy ? Math.hypot(dx,dy) : -Math.min(x-155,225-x,y-455,545-y);
  });
  const h=await harness({field});h.motion.placeAt([100,500]);h.target([330,500]);
  await h.advance(30000,()=>assert(field.signedDistance(...h.point())>=3));
  assert(Math.hypot(h.point()[0]-330,h.point()[1]-500)<=4,JSON.stringify(h.point()));
  assert(h.motion.reviewDiagnostics.planner.replans<=2,'At most one turn-displacement correction, not per-frame searches');
  assert.equal(h.motion.reviewDiagnostics.planner.reason,'arrived');
  assert.equal(h.motion.groundFieldStatus.held,false);
});

test('planned SDF steering coalesces changed goals without reviving the earlier destination',async()=>{
  const field=metricField(()=>100),h=await harness({field});h.motion.placeAt([100,500]);h.target([300,500]);
  for(let i=0;i<12;i++){await h.frame(25);h.target([300,500-i*5]);}
  assert(h.motion.reviewDiagnostics.planner.replans<=2);
  await h.advance(18000);
  assert.deepEqual(Array.from(h.motion.reviewDiagnostics.planner.goal),[300,445]);
  assert(Math.hypot(h.point()[0]-300,h.point()[1]-445)<=4,JSON.stringify(h.point()));
});
test('planned projected arrival is distinct from collision-held and a new legal target resumes travel',async()=>{
  const field=metricField(x=>200-x),h=await harness({field});h.motion.placeAt([100,500]);h.target([250,500]);
  await h.advance(12000);assert.equal(h.motion.reviewDiagnostics.planner.reason,'projected-arrival');
  assert.equal(h.motion.groundFieldStatus.held,false);const start=h.point();h.target([100,400]);
  await h.advance(15000);assert(Math.hypot(h.point()[0]-100,h.point()[1]-400)<=4);
  assert(Math.hypot(h.point()[0]-start[0],h.point()[1]-start[1])>50);
});

test('matched sweep-clear wall approach avoids the local gradient detour and unnecessary turns',async()=>{
  const field=metricField(x=>200-x,400,1000),runs=[];
  for(const planned of [false,true]){
    const h=await harness({field:planned ? field : {...field,createNavigator:undefined}});
    h.motion.placeAt([100,500]);h.target([196,800]);let previous=h.motion.sandboxPose.heading,turnDegrees=0,travel=0,point=h.point();
    await h.advance(30000,()=>{const next=h.point(),heading=h.motion.sandboxPose.heading;
      turnDegrees+=Math.abs(((heading-previous+540)%360)-180);travel+=Math.hypot(next[0]-point[0],next[1]-point[1]);
      previous=heading;point=next;assert(field.signedDistance(...next)>=3);
    });
    runs.push({planned,turnDegrees,travel,point:h.point(),held:h.motion.groundFieldStatus.held});
  }
  console.log('MATCHED_WALL_APPROACH '+JSON.stringify(runs));
  assert(runs[1].turnDegrees<=runs[0].turnDegrees);
  assert(Math.hypot(runs[1].point[0]-196,runs[1].point[1]-800)<=4);
});
