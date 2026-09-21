const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const root=path.join(__dirname,'../docs/storyboard');
const geometrySource=fs.readFileSync(path.join(root,'atlas-geometry.js'),'utf8');
const motionSource=fs.readFileSync(path.join(root,'atlas-motion.js'),'utf8');
const scope={window:{}};
vm.runInNewContext(geometrySource,scope);
const geometry=JSON.parse(JSON.stringify(scope.window.atlasGeometry));
const world=p=>[p[0]*geometry.width,p[1]*geometry.height];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const routes=geometry.routes.map(r=>({...r,points:r.points.map(world)}));
// Exercise the production endpoint-joining implementation without a public debug API.
const marker='window.AtlasMotion={create';
assert(motionSource.includes(marker),'production motion factory marker');
vm.runInNewContext(motionSource.replace(marker,'window.routeGraphForTest=graphFor; '+marker),scope);
const graph=scope.window.routeGraphForTest(routes);
const derived=scope.window.routeGraphForTest(routes,geometry.junctions);
const home=routes[0].points[0];
const key=p=>p.map(v=>v.toFixed(5)).join(',');
const edgeKey=(u,v)=>[u,v].sort().join('|');
const adjacency=new Map(),edges=new Set();
for(const {a,b} of graph.edges) {
  const u=key(a),v=key(b);if(u===v) continue;
  for(const p of [u,v]) if(!adjacency.has(p)) adjacency.set(p,new Set());
  adjacency.get(u).add(v);adjacency.get(v).add(u);edges.add(edgeKey(u,v));
}
// Nearby historical lake endpoints are both lake, never two distinct story places.
const entrances=[
  ['home',routes[0].points[0]],['lake',routes[0].points.at(-1)],
  ['lake',routes[1].points[0]],['elder',routes[1].points.at(-1)],
  ['bridge',routes[2].points.at(-1)],
  ...geometry.navigationDestinations.map(({id,point})=>[id,world(point)])
];

function storyPaths(network) {
  const covered=new Set(),counts=new Map();let visits=0;
  for(let i=0;i<entrances.length;i++) for(let j=i+1;j<entrances.length;j++) {
    const [from,a]=entrances[i],[to,b]=entrances[j];if(from===to) continue;
    const start=key(a),end=key(b),seen=new Set([start]),path=[];
    const pair=[from,to].sort().join('|');
    function visit(u) {
      assert(++visits<100000,'bounded enumeration of simple story paths');
      if(u===end) {
        counts.set(pair,(counts.get(pair)||0)+1);
        path.forEach(edge=>covered.add(edge));return;
      }
      for(const v of network.get(u)||[]) if(!seen.has(v)) {
        seen.add(v);path.push(edgeKey(u,v));visit(v);path.pop();seen.delete(v);
      }
    }
    visit(start);
  }
  return {covered,counts};
}

test('first two v2 traces remain exact; picnic return moves clear of the blanket',()=>{
  assert.equal(createHash('sha256').update(JSON.stringify(geometry.routes.slice(0,2))).digest('hex'),
    '6a600497abd28e5d5f24627a9a185927d5c4eeb51d28758b6ff12f75c8a5ee08',
    'Home/lake and lake/elder coordinates, identities, colors and endpoints stay unchanged');
  const originals=[
    ['home-to-lake','home','lake',[0.201172,0.695313],[0.436198,0.505859]],
    ['lake-to-elder','lake','elder',[0.4375,0.50293],[0.789063,0.200195]],
    ['lake-to-bridge','lake','bridge',[0.669271,0.574219],[0.820313,0.626953]]
  ];
  for(const [id,from,to,start,end] of originals) {
    const route=geometry.routes.find(r=>r.id===id);
    assert(route,id);assert.equal(route.from,from);assert.equal(route.to,to);
    assert.deepEqual(route.points[0],start);assert.deepEqual(route.points.at(-1),end);
  }
});

test('purposeful network stays interior, bounded and explicitly joined',()=>{
  assert.equal(geometry.routes.length,8);
  assert.equal(new Set(routes.map(r=>r.id)).size,routes.length);
  assert(routes.reduce((count,r)=>count+r.points.length-1,0)<=250,'bounded baked-curve graph work');
  for(const route of geometry.routes) for(const point of route.points) {
    assert.equal(point.length,2);
    assert(point.every(v=>Number.isFinite(v) && v>=0 && v<=1),route.id);
  }
  for(const route of routes.slice(3)) for(const index of [0,route.points.length-1]) {
    if(geometry.navigationDestinations.some(d=>distance(world(d.point),route.points[index])<1e-6)) continue;
    assert(routes.some(other=>other!==route && other.points.some(p=>distance(p,route.points[index])<1e-6)),
      route.id+': junction must coincide with another route vertex');
  }
  for(const route of geometry.routes.slice(2)) for(const [x,y] of route.points) {
    assert(x>=.24 && x<=.98 && y>=.19 && y<=.90,route.id+': interior destination corridor');
  }
  const picnic=geometry.routes.find(r=>r.id==='east-bridge-to-picnic-north');
  assert.deepEqual(picnic.points[0],geometry.routes[1].points[20]);
  assert.deepEqual(picnic.points.at(-1),geometry.routes[2].points[0],
    'explicit purple-to-cyan connector joins the short shared north picnic approach');
  const outer=geometry.routes.find(r=>r.id==='east-bridge-to-elder-outer');
  assert.deepEqual(outer.points[0],geometry.routes[1].points[24],
    'outer road forks at (1094,524), sharing the original bridge approach');
  assert.deepEqual(outer.points.at(-1),geometry.routes[1].points.at(-1));
});

function inside(point,polygon) {
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a[1]>point[1])!==(b[1]>point[1]) && point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
  }
  return hit;
}
function pointSegment(p,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  return distance(p,[a[0]+t*dx,a[1]+t*dy]);
}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function segmentDistance(a,b,c,d) {
  if(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) return 0;
  return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}
function hull(points) {
  const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const half=list=>{const result=[];for(const p of list){while(result.length>1 && cross(result.at(-2),result.at(-1),p)<=0)result.pop();result.push(p);}return result.slice(0,-1);};
  return [...half(sorted),...half(sorted.slice().reverse())];
}
function polygonDistance(a,b) {
  if(a.some(p=>inside(p,b)) || b.some(p=>inside(p,a))) return 0;
  let result=Infinity;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)
    result=Math.min(result,segmentDistance(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]));
  return result;
}

test('all segments keep feet and the full directional sprite envelope clear of picnic and tractor',()=>{
  // Original-art survey in world pixels: blanket, food, basket, benches and east stool.
  const picnic=[[1108,603],[1145,598],[1173,600],[1184,611],[1203,605],[1216,608],
    [1216,637],[1190,643],[1170,649],[1144,650],[1107,638]];
  const tractor=[[1292,745],[1322,734],[1324,726],[1341,722],[1364,682],[1381,680],
    [1408,700],[1410,724],[1456,724],[1462,748],[1458,774],[1424,786],[1380,783],
    [1363,796],[1332,797],[1303,786],[1292,770]];
  vm.runInNewContext(fs.readFileSync(path.join(root,'atlas-directions.js'),'utf8'),scope);
  const metadata=scope.window.atlasDirections;
  const extent={left:0,right:0,up:0,down:0};
  for(const direction of metadata.directions) for(const frame of direction.frames) {
    const scale=metadata.displayWidth/direction.referenceWidth;
    extent.left=Math.max(extent.left,frame.anchor[0]*scale);
    extent.right=Math.max(extent.right,(frame.rect[2]-frame.anchor[0])*scale);
    extent.up=Math.max(extent.up,frame.anchor[1]*scale);
    extent.down=Math.max(extent.down,(frame.rect[3]-frame.anchor[1])*scale);
  }
  assert(extent.up>40 && extent.left>=28,'check actual directional crops, not a foot-only proxy');
  const corners=[[-extent.left,-extent.up],[extent.right,-extent.up],
    [extent.right,extent.down],[-extent.left,extent.down]];
  for(const [name,obstacle] of [['picnic',picnic],['tractor/trailer/boom',tractor]]) for(const {a,b} of [...graph.edges,...derived.edges]) {
    const label=name+' '+JSON.stringify([a,b]);
    assert(polygonDistance([a,b],obstacle)>=20,'foot clearance along entire segment: '+label);
    const swept=hull([a,b].flatMap(p=>corners.map(c=>[p[0]+c[0],p[1]+c[1]])));
    const gap=polygonDistance(swept,obstacle);
    assert(gap>=14,'full sprite clearance '+gap.toFixed(2)+'px: '+label);
  }
});

test('lower road connects Home to tractor below the visible river with bank routes removed',()=>{
  // Visible channel below the wooden bridge; woodland outside it is inferred ground.
  const channel=[[900,632],[935,632],[970,647],[1000,677],[1055,712],[1086,750],[1110,786],
    [1134,819],[1115,831],[1070,797],[1030,765],[993,737],[968,713],[943,683],[917,658]];
  for(const {a,b} of [...graph.edges,...derived.edges]) assert(polygonDistance([a,b],channel)>0,
    'route crosses surveyed water channel: '+JSON.stringify([a,b]));
  assert(routes.some(r=>r.id==='home-lower-road-to-tractor'));
  assert(!routes.some(r=>['home-lower-road-west-bank','right-bank-to-tractor-road','tractor-road-to-picnic'].includes(r.id)));
  const lower=geometry.routes.find(r=>r.id==='home-lower-road-to-tractor');
  const tractor=geometry.navigationDestinations.find(d=>d.id==='tractor');
  assert.deepEqual(lower.points[0],geometry.routes[0].points[3]);
  assert.equal(lower.to,'tractor');
  assert.deepEqual(tractor.point,[0.8125,0.800781]);
  assert.deepEqual(lower.points.at(-1),tractor.point);
  assert(geometry.routes[2].points.every(p=>p[1]<.65),'no cyan shoreline wrap');
});

test('entire graph connects real destinations with no unapproved leaves or dangling loops',()=>{
  const reached=new Set([key(home)]),queue=[key(home)];
  for(let i=0;i<queue.length;i++) for(const next of adjacency.get(queue[i]) || []) {
    if(!reached.has(next)) {reached.add(next);queue.push(next);}
  }
  assert.equal(reached.size,adjacency.size,'no disconnected branch or crossing-only junction');
  const destinationNodes=new Set(entrances.filter(([id])=>id!=='tractor').map(([,point])=>key(point)));
  for(const [point,neighbors] of adjacency) if(neighbors.size===1)
    assert(destinationNodes.has(point),'unapproved degree-one leaf: '+point);
  const {covered,counts}=storyPaths(adjacency);
  for(const edge of edges) assert(covered.has(edge),'edge outside every simple path between different real destinations: '+edge);
  for(const pair of ['elder|home','bridge|home','bridge|elder'])
    assert(counts.get(pair)>=2,pair+': at least two actual simple paths, without duplicate lake entrances');
});

test('tractor is a curved through-connection on the lower road, picnic, bridge and Home loop',()=>{
  const lower=routes.find(r=>r.id==='home-lower-road-to-tractor');
  const bypass=routes.find(r=>r.id==='tractor-west-to-picnic');
  assert(bypass,'west bypass must exist');
  assert.deepEqual(bypass.points[0],lower.points.at(-1));
  assert.deepEqual(bypass.points.at(-1),routes.find(r=>r.id==='lake-to-bridge').points.at(-1));
  const tractor=key(bypass.points[0]);
  assert(adjacency.get(tractor).size>=2,'tractor must never be an approved terminal leaf');
  // Removing the tractor must leave its two neighbors connected through Home,
  // the existing bridge and picnic: degree alone would also accept a dead spur.
  const neighbors=[...adjacency.get(tractor)],seen=new Set([neighbors[0]]),queue=[neighbors[0]];
  for(let i=0;i<queue.length;i++)for(const next of adjacency.get(queue[i])||[]){
    if(next!==tractor && !seen.has(next)){seen.add(next);queue.push(next);}
  }
  assert(neighbors.slice(1).some(n=>seen.has(n)),'tractor lies on a cycle');
  const {counts}=storyPaths(adjacency);
  for(const pair of ['home|tractor','bridge|tractor'])assert(counts.get(pair)>=2,pair+': two simple routes');
  for(const [x,y] of bypass.points)assert(x>=1228 && x<=1265 && y>=641 && y<=821,
    'bypass stays in the compact west passage; no vehicle, eastern-edge or foreground detour');
  const travel=[lower.points.at(-2),...bypass.points];
  for(let i=1;i<travel.length-1;i++){
    const a=travel[i-1],b=travel[i],c=travel[i+1];
    const cosine=((b[0]-a[0])*(c[0]-b[0])+(b[1]-a[1])*(c[1]-b[1]))/(distance(a,b)*distance(b,c));
    assert(cosine>Math.cos(Math.PI/3),'no hard turn at tractor or along the baked bypass');
  }
});

test('simple-story-path coverage rejects a dangling lollipop even with no extra leaves',()=>{
  const network=new Map([...adjacency].map(([u,vs])=>[u,new Set(vs)]));
  const anchor=key(routes[0].points[8]);
  const link=(u,v)=>{if(!network.has(u))network.set(u,new Set());network.get(u).add(v);};
  for(const [u,v] of [[anchor,'lollipop-a'],['lollipop-a','lollipop-b'],['lollipop-b',anchor]]) {
    link(u,v);link(v,u);
  }
  const {covered}=storyPaths(network);
  assert(!covered.has(edgeKey('lollipop-a','lollipop-b')),'a one-junction cycle serves no simple story journey');
});

test('home reaches every route vertex and segment midpoint through the production planner',()=>{
  for(const route of routes) {
    const targets=[...route.points,...route.points.slice(1).map((p,i)=>p.map((v,j)=>(v+route.points[i][j])/2))];
    for(const target of targets) {
      const journey=graph.plan(home,target);
      assert(journey && Number.isFinite(journey.length),route.id);
      assert(distance(journey.target,target)<1e-5,route.id+': planner must reach requested branch, not project to another component');
    }
    const back=graph.plan(route.points.at(-1),home);
    assert(back && distance(back.target,home)<1e-5,route.id+': can walk home');
  }
});

test('v7 manual survey excludes rejected v3 from active provenance and runtime media',()=>{
  const requests=[];
  const context={window:{},document:{hidden:false,addEventListener(){}},
    matchMedia:()=>({matches:true,addEventListener(){}}),
    localStorage:{getItem:()=>null},addEventListener(){},
    requestAnimationFrame(){assert.fail('reduced motion should not schedule animation');},cancelAnimationFrame(){},
    setTimeout(){assert.fail('reduced motion should not schedule timers');},clearTimeout(){},
    fetch(url){requests.push(String(url));assert.fail('route geometry must not fetch metadata');},
    Path2D:class{moveTo(){}lineTo(){}},
    Image:class{set src(value){requests.push(value);}decode(){return Promise.resolve();}}
  };
  vm.runInNewContext(geometrySource,context);vm.runInNewContext(motionSource,context);
  const ctx={save(){},restore(){},clearRect(){},translate(){},setLineDash(){},stroke(){},drawImage(){}};
  const canvas={dataset:{},getContext:()=>ctx};
  const motion=context.window.AtlasMotion.create(canvas,context.window.atlasGeometry);
  for(const route of geometry.routes) motion.setTarget(route.points.at(-1));
  assert.equal(canvas.dataset.sprite,'unavailable');
  assert.equal(geometry.pathSource,'images/atlas/shire-routes-v2.png');
  assert.equal(geometry.routePlanSource,undefined);
  assert.equal(geometry.rejectedRoutePlanSource,'images/atlas/shire-routes-v3.png');
  assert(!geometry.generationReview.includes('images/atlas/shire-routes-v3.json'));
  assert.equal(geometry.routeSurveySource,'images/atlas/shire-v1.png');
  assert.equal(geometry.routeSurveyVersion,7);
  assert(geometry.routes.slice(2).every(r=>r.provenance===(r.id==='tractor-west-to-picnic'
    ? 'manual-original-art-survey-v7' : 'manual-original-art-survey-v6')));
  assert.deepEqual(requests,['images/atlas/pinpin-walk-v1.webp'],'only the existing fallback sprite is requested');
});
