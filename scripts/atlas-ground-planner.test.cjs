'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{}});
for(const file of ['atlas-ground-planner.js','atlas-field.js'])vm.runInContext(fs.readFileSync(require.resolve('../docs/storyboard/'+file),'utf8'),context);
const box=(x,y,l,t,r,b)=>{const dx=Math.max(l-x,0,x-r),dy=Math.max(t-y,0,y-b);
  return dx||dy ? Math.hypot(dx,dy) : -Math.min(x-l,r-x,y-t,b-y);};
function field(fn,width=180,height=140){
  const data=new Uint8ClampedArray(width*height*4),base=new Uint8ClampedArray(data.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const n=Math.max(0,Math.min(65535,Math.round(32768+16*fn(x,y)))),i=(y*width+x)*4;
    data.set([n>>8,n&255,0,255],i);base.set([255,128,128,255],i);
  }
  return context.window.AtlasField.createField(base,width,height,null,null,null,{dataRGBA:data});
}
function follow(f,from,to,{limit=2000}={}){
  const nav=f.createNavigator(),points=[from.slice()];let p=from.slice(),heading=0,state;
  nav.setGoal(p,to,heading,0);
  for(let i=0;i<limit;i++){
    state=nav.guide(p,heading,i*25);if(state.status!=='following')break;
    const d=Math.hypot(state.target[0]-p[0],state.target[1]-p[1]);assert(d>0,'no zero-distance loop');
    const next=p.map((v,j)=>v+(state.target[j]-v)*Math.min(1,1/d));
    assert.equal(f.sweep(p,next).blocked,false);assert(f.signedDistance(...next)>=3);
    heading=Math.atan2(next[1]-p[1],next[0]-p[0])*180/Math.PI;p=next;points.push(p);
  }
  return {nav,point:p,points,status:state.status};
}
test('persistent route goes around an obstacle without local dead ends',()=>{
  const f=field((x,y)=>box(x,y,60,35,110,95)),r=follow(f,[20,65],[150,65]);
  assert.equal(r.status,'arrived');assert(Math.hypot(r.point[0]-150,r.point[1]-65)<=4);
  assert.equal(r.nav.diagnostics.replans,1);assert(r.points.some(p=>p[1]<33||p[1]>98));
});
test('long range route escapes a U-shaped local minimum',()=>{
  const f=field((x,y)=>Math.min(box(x,y,40,40,100,45),box(x,y,40,40,45,100),box(x,y,95,40,100,100)));
  const r=follow(f,[70,70],[70,20]);assert.equal(r.status,'arrived');assert(r.points.some(p=>p[1]>102));
  assert.equal(r.nav.diagnostics.replans,1);
});
test('narrow continuous passage survives conservative cell-corner rejection',()=>{
  const f=field((x,y)=>4.25-Math.abs(y-55.75));
  for(const [a,b] of [[[10,55.75],[165,55.75]],[[165,55.75],[10,55.75]]]){
    const r=follow(f,a,b);assert.equal(r.status,'arrived');assert.equal(r.nav.diagnostics.replans,1);
  }
});
test('connected offset narrow passage remains traversable both ways',()=>{
  const f=field((x,y)=>Math.min(box(x,y,55,0,100,60),box(x,y,55,70,100,139)));
  for(const [a,b] of [[[20,95],[145,35]],[[145,35],[20,95]]])assert.equal(follow(f,a,b).status,'arrived');
});
test('unreachable island resolves once and does not retry every frame',()=>{
  const f=field(x=>Math.abs(x-90)-8),nav=f.createNavigator();nav.setGoal([20,60],[150,60],0,0);
  for(let i=0;i<100;i++)nav.guide([20,60],0,i*25);
  assert.equal(nav.diagnostics.replans,1);
  const result=follow(f,[20,60],[150,60]);assert.equal(result.status,'unreachable');assert(result.point[0]<=79);
});
test('blocked goal yields an explicit projected arrival and accepts a subsequent legal goal',()=>{
  const f=field(x=>Math.abs(x-90)-8),r=follow(f,[20,60],[90,60]);
  assert.equal(r.status,'projected-arrival');assert(f.signedDistance(...r.point)>=3);
  r.nav.setGoal(r.point,[20,100],180,10000);
  assert.equal(r.nav.guide(r.point,180,10000).status,'following');
  assert.deepEqual(Array.from(r.nav.diagnostics.goal),[20,100]);
});
test('rapid target updates coalesce and latest intent replaces stale goals',()=>{
  const f=field(()=>100),nav=f.createNavigator();nav.setGoal([20,60],[150,60],0,0);
  for(let i=1;i<=20;i++)nav.setGoal([20,60],[i%2 ? 145 : 155,60+i*3],0,i*10);
  assert.equal(nav.diagnostics.replans,1);assert.equal(nav.diagnostics.pendingGoal,true);
  nav.guide([20,60],0,500);assert.equal(nav.diagnostics.replans,2);
  assert.deepEqual(Array.from(nav.diagnostics.endpoint),[155,120]);
  nav.reset();assert.equal(nav.guide([20,60],0,600).status,'idle');
});
test('stale route invalidation is rate bounded and replaces unsafe geometry',()=>{
  const f=field(()=>100),nav=f.createNavigator();nav.setGoal([20,60],[150,60],0,0);
  for(let i=1;i<20;i++){nav.invalidate();nav.guide([20,60],0,i*10);}
  assert.equal(nav.diagnostics.replans,1);nav.guide([20,60],0,500);assert.equal(nav.diagnostics.replans,2);
});
module.exports={field,box,follow};
