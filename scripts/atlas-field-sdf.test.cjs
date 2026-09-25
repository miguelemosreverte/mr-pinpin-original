const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../docs/storyboard/atlas-field.js'),'utf8');
function api(extra={}) {
  const context=vm.createContext({window:{},...extra});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs/storyboard/atlas-ground-planner.js'),'utf8'),context);
  vm.runInContext(source,context);return context.window.AtlasField;
}
function pixels(width,height,value) {
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(value(x,y),(y*width+x)*4);
  return data;
}
function encoded(width,height,distance,{scale=16,bias=32768}={}) {
  return pixels(width,height,(x,y)=>{
    const n=Math.max(0,Math.min(65535,Math.round(distance(x,y)*scale+bias)));
    return [n>>8,n&255,0,255];
  });
}
function field(distance,{width=36,height=24,base=0,walk=0,body=0,...spec}={}) {
  return api().createField(pixels(width,height,()=>[base,102,128,255]),width,height,
    pixels(width,height,()=>[128,144,112,255]),pixels(width,height,()=>[walk,0,0,255]),
    [pixels(width,height,()=>[body,body,body,body]),pixels(width,height,()=>[body,body,body,body])],
    {...spec,dataRGBA:encoded(width,height,distance,spec)});
}
const near=(actual,expected,epsilon=1e-6)=>assert(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);

test('RG16 sign, byte carry, quantization, interpolation and custom units',()=>{
  const f=field((x,y)=>x-16+y/16);
  near(f.signedDistance(15,0),-1);near(f.signedDistance(16,0),0);near(f.signedDistance(17,0),1);
  near(f.signedDistance(16,1),1/16);near(f.signedDistance(15.5,1.5),-.40625);
  near(field(()=>.1).signedDistance(5,5),.125);
  near(field(x=>x-5,{scale:8,bias:16000}).signedDistance(5.5,3),.5);
  near(field(()=>1e6).signedDistance(5,5),2047.9375);
  near(field(()=>-1e6).signedDistance(5,5),-2048);
});
test('outside is blocked and raw gradients remain finite at edges',()=>{
  const f=field((x,y)=>x+2*y);
  for(const p of [[-1,5],[36,5],[5,24],[NaN,5],[Infinity,5]]) {
    assert.equal(f.signedDistance(...p),-Infinity);assert.equal(f.walkable(...p),false);
    assert.equal(f.walkability(...p),0);assert(f.distanceGradient(...p).every(Number.isFinite));
  }
  for(const p of [[0,0],[35,23],[12.3,7.6]]) {
    const g=f.distanceGradient(...p);near(g[0],1);near(g[1],2);
  }
  const single=field(()=>5,{width:1,height:1});near(single.signedDistance(0,0),5);
  assert(single.distanceGradient(0,0).every(v=>v===0));
});
test('SDF overrides old masks and preserves depth, light and tone',()=>{
  const f=field(()=>30),blocked=field(()=>-5,{base:255,walk:255,body:255});
  assert.equal(f.walkable(12,12),true);assert.equal(f.walkability(12,12,135),1);
  assert.equal(blocked.walkable(12,12),false);assert.equal(blocked.walkability(12,12,0),0);
  assert.equal(blocked.plan([3,3],[27,15]),null);
  near(f.groundDepth(12,12),.4);near(f.light(12,12),1);
  assert.deepEqual(Array.from(f.tone(12,12)),[1,1.125,.875]);
  assert(f.plan([3,3],[27,15]));
});
test('clearance and smooth falloff share units; walk gradient is the derivative of passability',()=>{
  const f=field(x=>x,{clearance:3,softRange:18});
  assert.equal(f.walkable(3,5),true);assert.equal(f.walkable(2.99,5),false);
  near(f.walkability(3,5),0);near(f.walkability(12,5),.5);near(f.walkability(21,5),1);
  const gradient=f.walkGradient(12,5,90,.001);near(gradient[0],1.5/18,1e-6);near(gradient[1],0);
});
test('long sweeps stop at a one-pixel wall, including custom clearance',()=>{
  const f=field(x=>Math.abs(x-17)-.5);
  for(const end of [[30,10],[30,15],[30,5]]) {
    const result=f.sweep([3,10],end);
    assert.equal(result.blocked,true);near(result.point[0],13.5);
    assert(f.signedDistance(...result.point)>=3-1e-8);
  }
  near(f.sweep([3,10],[30,10],0).point[0],16.5);
  assert.equal(f.sweep([3,10],[10,10]).blocked,false);
});
test('sweep checks quadratic dips within a pixel, not just endpoints',()=>{
  const f=field((x,y)=>x===0 && y===0 || x===1 && y===1 ? 1 : -1,{width:2,height:2,clearance:.25});
  const result=f.sweep([0,0],[1,1]);
  assert.equal(result.blocked,true);near(result.fraction,.25);
});
test('invalid starts permit only strictly improving escape, including subpixel plateaus',()=>{
  const f=field(x=>x-10);
  assert.equal(f.sweep([3,10],[20,10]).blocked,false);
  assert.equal(f.sweep([3,10],[8,10]).blocked,false);
  assert.equal(f.sweep([3,10],[1,10]).fraction,0);
  assert.equal(f.sweep([3,10],[3,15]).fraction,0);
  assert.equal(field(()=>-2).sweep([3,10],[20,10]).fraction,0);
  const plateau=field(x=>Math.min(x,8)-10);
  near(plateau.sweep([3,10],[20,10]).point[0],8);
  const peak=field((x,y)=>x===0 && y===0 || x===1 && y===1 ? -2 : 0,{width:2,height:2});
  near(peak.sweep([0,0],[1,1]).fraction,.5);
});
test('sweeps stop at map bounds and handle stationary requests',()=>{
  const f=field(()=>30);
  for(const end of [[100,10],[-20,10],[10,100],[10,-20]]) {
    const s=f.sweep([10,10],end);assert.equal(s.blocked,true);
    assert(Number.isFinite(f.signedDistance(...s.point)));
  }
  assert.equal(f.sweep([-1,10],[5,10]).fraction,0);
  assert.equal(f.sweep([3,3],[3,3]).blocked,false);
  assert.equal(field(()=>-1).sweep([3,3],[3,3]).blocked,true);
});
test('fractional boundary exits stay finite and cannot pass a wall near the boundary',()=>{
  const f=field(()=>30),wall=field(x=>34-x,{clearance:.25});
  for(let i=1;i<80;i++) {
    const from=[i/7%30+.13,i/11%20+.17],to=[70+i/13,from[1]];
    const s=f.sweep(from,to);assert.equal(s.blocked,true);assert(Number.isFinite(f.signedDistance(...s.point)));
    const stopped=wall.sweep(from,to);near(stopped.point[0],33.75);
  }
});
test('planner cannot cross a thin wall hidden between its grid samples',()=>{
  const f=field(x=>Math.abs(x-8)-.25,{clearance:0});
  const route=f.plan([3,9],[27,9]);
  if(route)for(let i=1;i<route.length;i++)assert.equal(f.sweep(route[i-1],route[i],0).blocked,false);
  assert(!route || route.at(-1)[0]<8);
});
test('legacy and SDF planners cannot shortcut diagonal blocked corners',()=>{
  const width=18,height=18,diagonal=(x,y)=>Math.floor(x/6)===Math.floor(y/6);
  const legacy=api().createField(pixels(width,height,(x,y)=>[diagonal(x,y)?255:0,128,128,255]),width,height);
  const sdf=field((x,y)=>diagonal(x,y)?30:-30,{width,height});
  assert.equal(legacy.plan([3,3],[15,15]),null);
  assert.equal(sdf.plan([3,3],[15,15]),null);
});
test('planner detours are fully sweepable and respect the SDF despite open old masks',()=>{
  const f=field((x,y)=>Math.max(Math.abs(x-17)-2,y-12),{width:48,height:36,base:255});
  const route=f.plan([3,3],[39,3]);assert(route && route.length>2);
  near(route.at(-1)[0],39);near(route.at(-1)[1],3);
  for(let i=1;i<route.length;i++) {
    assert.equal(f.walkable(...route[i]),true);
    assert.equal(f.sweep(route[i-1],route[i]).blocked,false);
  }
});
test('malformed SDF fixtures fail instead of falling back',()=>{
  const base=pixels(6,6,()=>[255,128,128,255]),dataRGBA=encoded(6,6,()=>5),create=spec=>api().createField(base,6,6,null,null,null,spec);
  for(const spec of [{},{dataRGBA,scale:0},{dataRGBA,softRange:0},{dataRGBA,clearance:-1},
    {dataRGBA,bias:NaN},{dataRGBA:new Uint8Array(4)}])assert.throws(()=>create(spec),/SDF/);
  const bad=dataRGBA.slice();bad[3]=0;assert.throws(()=>create({dataRGBA:bad}),/opaque/);
  bad[3]=255;bad[2]=1;assert.throws(()=>create({dataRGBA:bad}),/B=0/);
});
function loader(images) {
  const requests=[];
  return {requests,field:api({
    Image:class {
      async decode() {
        requests.push(this.src);const image=images[this.src];if(!image)throw Error('missing '+this.src);
        this.naturalWidth=image.width;this.naturalHeight=image.height;this.data=image.data;
      }
    },
    document:{createElement:()=>{
      let image;return {getContext:()=>({drawImage:value=>{image=value;},getImageData:()=>({data:image.data})})};
    }}
  })};
}
test('SDF load skips old walk/body requests and rejects missing or mismatched SDF',async()=>{
  const base={width:18,height:18,data:pixels(18,18,()=>[0,128,128,255])};
  const sdf={...base,data:encoded(18,18,()=>30)},h=loader({base,sdf});
  const f=await h.field.load('base',null,'old-walk',['old-a','old-b'],{src:'sdf'});
  assert.deepEqual(h.requests,['base','sdf']);assert.equal(f.walkable(9,9),true);
  await assert.rejects(h.field.load('base',null,null,null,{src:'absent'}),/missing/);
  await assert.rejects(h.field.load('base',null,null,null,{}),/source/);
  const mismatch=loader({base,sdf:{...sdf,width:17}});
  await assert.rejects(mismatch.field.load('base',null,null,null,{src:'sdf'}),/dimensions/);
});
test('legacy loading retains optional mask failure behavior',async()=>{
  const h=loader({base:{width:18,height:18,data:pixels(18,18,()=>[255,128,128,255])}});
  const f=await h.field.load('base','missing-tone','missing-walk',['missing-a','missing-b']);
  assert.equal(f.walkable(9,9),true);near(f.walkability(9,9),1);assert.equal(f.signedDistance,undefined);
});

test('initial recovery selects nearby safe ground only through a strictly improving escape sweep',()=>{
  const f=field(x=>x-10,{width:36,height:24});
  assert.deepEqual(Array.from(f.recoverInitialPoint([8,12])),[13,12]);
  assert.deepEqual(Array.from(f.recoverInitialPoint([20.25,12.5])),[20.25,12.5]);
  assert.equal(f.recoverInitialPoint([8,12],2),null);
  assert.equal(f.recoverInitialPoint([-1,12]),null);
  const plateau=field(x=>x<12 ? -5 : x-17,{width:36,height:24});
  assert.equal(plateau.recoverInitialPoint([8,12]),null,'safe endpoints cannot bypass a flat blocked interior');
});
