const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const tractor=[[1292,745],[1322,734],[1324,726],[1341,722],[1364,682],[1381,680],
  [1408,700],[1410,724],[1456,724],[1462,748],[1458,774],[1424,786],[1380,783],
  [1363,796],[1332,797],[1303,786],[1292,770]];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function pointSegment(p,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
function inside(p,polygon){
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if(pointSegment(p,a,b)<1e-8)return true;
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
function segmentDistance(a,b,c,d){
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;
  return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}
function capsuleClearance({a,b},polygon,{halfWidth=12,radius=2}={}){
  // Sweep the capsule's horizontal spine, then subtract its circular radius.
  const halfSpine=halfWidth-radius;
  const spine=[[a[0]-halfSpine,a[1]],[a[0]+halfSpine,a[1]],
    [b[0]+halfSpine,b[1]],[b[0]-halfSpine,b[1]]];
  if(spine.some(p=>inside(p,polygon))||polygon.some(p=>inside(p,spine)))return -radius;
  let gap=Infinity;
  for(let i=0;i<spine.length;i++)for(let j=0;j<polygon.length;j++)
    gap=Math.min(gap,segmentDistance(spine[i],spine[(i+1)%spine.length],polygon[j],polygon[(j+1)%polygon.length]));
  return gap-radius;
}
function foregroundRoadForEdge(geometry,edge){
  return (geometry.foregroundRoads||[]).find(lane=>{
    if(edge.route!==lane.routeId||![edge.a,edge.b].every(p=>inside(p,lane.corridor)))return false;
    const route=geometry.routes.find(r=>r.id===lane.routeId);
    const world=p=>[p[0]*geometry.width,p[1]*geometry.height];
    for(let i=lane.segmentRange[0];i<lane.segmentRange[1];i++){
      const a=world(route.points[i]),b=world(route.points[i+1]);
      if([edge.a,edge.b].every(p=>pointSegment(p,a,b)<.002))return true;
    }
    return false;
  });
}
module.exports={tractor,capsuleClearance,foregroundRoadForEdge};

if(require.main===module){
  const test=require('node:test');
  const root=path.join(__dirname,'../docs/storyboard'),scope={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'atlas-geometry.js'),'utf8'),scope);
  const geometry=JSON.parse(JSON.stringify(scope.window.atlasGeometry));
  const routes=geometry.routes.map(r=>({...r,points:r.points.map(p=>[p[0]*geometry.width,p[1]*geometry.height])}));
  const marker='window.AtlasMotion={create';
  vm.runInNewContext(fs.readFileSync(path.join(root,'atlas-motion.js'),'utf8').replace(marker,'window.graphForTest=graphFor; '+marker),scope);
  test('all logical and derived roads retain a continuously swept real-foot capsule outside the vehicle',()=>{
    let minimum=Infinity,foreground=0;
    for(const options of [null,geometry.junctions])for(const edge of scope.window.graphForTest(routes,options).edges){
      const gap=capsuleClearance(edge,tractor);
      minimum=Math.min(minimum,gap);
      assert(gap>=8.2,'12x2 foot capsule plus 6px clearance and 2.2px travel reserve: '+JSON.stringify({edge,gap}));
      if(foregroundRoadForEdge(geometry,edge))foreground++;
    }
    assert(foreground>0);
    console.log('minimum swept foot-capsule clearance:',minimum,'foreground edges:',foreground);
  });
  test('foreground policy is limited to authored route segments and corridor',()=>{
    assert.equal(geometry.foregroundRoads.length,1);
    const lane=geometry.foregroundRoads[0];
    assert.deepEqual(lane.contactCapsule,{halfWidth:12,radius:2});
    assert.equal(lane.clearance,6);assert.equal(lane.travelReserve,2.2);
    const edge={route:lane.routeId,a:[1340,814.5],b:[1420,800.5]};
    assert(foregroundRoadForEdge(geometry,edge));
    assert(!foregroundRoadForEdge(geometry,{...edge,route:'tractor-west-to-picnic'}));
    assert(!foregroundRoadForEdge(geometry,{...edge,a:[1340,810],b:[1420,796]}));
    assert(!foregroundRoadForEdge(geometry,{...edge,a:[1340,658],b:[1380,658]}));
    assert(!foregroundRoadForEdge(geometry,{...edge,a:[1204.159488,845.648896],b:[1240,836]}));
  });
  test('contact capsule detects wheel contact even when a foot center remains outside',()=>{
    const edge={a:[1350,803],b:[1360,803]};
    assert(capsuleClearance(edge,tractor)<6);
    assert(capsuleClearance({a:[1340,814.5],b:[1420,800.5]},tractor)>8.2);
  });
}
