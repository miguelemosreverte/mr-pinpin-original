const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'../docs/storyboard'),scope={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'atlas-geometry.js'),'utf8'),scope);
vm.runInNewContext(fs.readFileSync(path.join(root,'atlas-motion.js'),'utf8')
  .replace('window.AtlasMotion={create','window.graphFor=graphFor;window.AtlasMotion={create'),scope);
const geometry=scope.window.atlasGeometry;
const world=p=>[p[0]*geometry.width,p[1]*geometry.height];
const routes=geometry.routes.map(r=>({...r,points:r.points.map(world)}));
const graph=scope.window.graphFor(routes,geometry.junctions);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const key=p=>p.map(n=>n.toFixed(6)).join(',');
const angle=(a,b,c)=>Math.acos(Math.max(-1,Math.min(1,((b[0]-a[0])*(c[0]-b[0])+
  (b[1]-a[1])*(c[1]-b[1]))/(distance(a,b)*distance(b,c)))))*180/Math.PI;
const clean=points=>points.filter((p,i)=>!i || distance(p,points[i-1])>1e-6);

test('derived network is opt-in, bounded and replaces all five branch centers',()=>{
  const raw=scope.window.graphFor(routes);
  assert.equal(raw.junctions.length,0,'generic/synthetic graph contract stays unchanged');
  assert.equal(graph.junctions.filter(j=>j.kind==='branch').length,5);
  assert(graph.nodeCount<=520,'bounded initialization and planner work: '+graph.nodeCount);
  for(const junction of graph.junctions.filter(j=>j.kind==='branch')) {
    assert.equal(junction.paths.length,3,'one connection per approach/exit pair');
    assert(!graph.edges.some(e=>distance(e.a,junction.center)<1e-6 || distance(e.b,junction.center)<1e-6),
      'old central pivot has no retained spokes');
  }
});

test('every actual branch approach/exit plan is tangent in both directions',()=>{
  for(const junction of graph.junctions.filter(j=>j.kind==='branch')) {
    const approaches=junction.portals.map(p=>{
      const e=graph.edges.find(e=>(distance(e.a,p)<1e-6 || distance(e.b,p)<1e-6) &&
        !junction.paths.some(path=>path.points.some(q=>distance(q,distance(e.a,p)<1e-6?e.b:e.a)<1e-6)));
      assert(e,'retained external spoke at '+p);
      const q=distance(e.a,p)<1e-6?e.b:e.a;
      const step=Math.min(2,distance(p,q)/2);
      return p.map((v,i)=>v+(q[i]-v)*step/distance(p,q));
    });
    for(let i=0;i<approaches.length;i++)for(let j=0;j<approaches.length;j++)if(i!==j){
      const plan=graph.plan(approaches[i],approaches[j]),points=clean(plan.points);
      assert(distance(plan.target,approaches[j])<1e-5);
      assert(plan.length<100,'local connection does not take a global detour');
      for(let k=1;k<points.length-1;k++)assert(angle(points[k-1],points[k],points[k+1])<=12.1,
        JSON.stringify({center:junction.center,pair:[i,j],point:points[k],angle:angle(points[k-1],points[k],points[k+1])}));
    }
  }
});

test('all rounded paths and two-way anchor journeys have bounded sampled heading changes',()=>{
  for(const junction of graph.junctions)for(const path of junction.paths){
    const points=clean(path.points);
    for(let i=1;i<points.length-1;i++)assert(angle(points[i-1],points[i],points[i+1])<=12.1,
      junction.kind+' '+junction.center+' angle '+angle(points[i-1],points[i],points[i+1]));
  }
  for(const junction of graph.junctions.filter(j=>j.kind!=='branch'))for(const [a,b] of [junction.portals,junction.portals.slice().reverse()]){
    const points=clean(graph.plan(a,b).points);
    for(let i=1;i<points.length-1;i++)assert(angle(points[i-1],points[i],points[i+1])<=12.1,
      'actual two-way journey '+junction.center+' angle '+angle(points[i-1],points[i],points[i+1]));
  }
});

test('derived graph keeps connectivity, exact story and tractor anchors, and the v7 loop',()=>{
  const adjacency=new Map();
  for(const {a,b} of graph.edges)for(const [p,q] of [[a,b],[b,a]]){
    const k=key(p);if(!adjacency.has(k))adjacency.set(k,new Set());adjacency.get(k).add(key(q));
  }
  const home=routes[0].points[0],visited=new Set([key(home)]),queue=[key(home)];
  for(let i=0;i<queue.length;i++)for(const n of adjacency.get(queue[i])||[])if(!visited.has(n)){visited.add(n);queue.push(n);}
  assert.equal(visited.size,adjacency.size);
  for(const [p,neighbors] of adjacency)if(neighbors.size===1)assert.equal(p,key(home),'no new dead ends');
  const anchors=[routes[0].points.at(-1),routes[1].points.at(-1),routes[2].points.at(-1),
    world(geometry.navigationDestinations.find(p=>p.id==='tractor').point)];
  for(const p of anchors){
    assert(distance(graph.plan(home,p).target,p)<1e-5,'exact logical anchor');
    assert(distance(graph.plan(p,home).points[0],p)<1e-5,'return starts at exact anchor');
  }
  const tractor=key(anchors.at(-1)),neighbors=[...adjacency.get(tractor)];
  assert.equal(neighbors.length,2);
  const seen=new Set([neighbors[0]]),pending=[neighbors[0]];
  for(let i=0;i<pending.length;i++)for(const n of adjacency.get(pending[i])||[])if(n!==tractor && !seen.has(n)){seen.add(n);pending.push(n);}
  assert(seen.has(neighbors[1]),'tractor remains on the picnic/bridge/Home loop');
});

for(const junction of graph.junctions.filter(j=>j.kind==='branch' || j.kind==='anchor')){
  test('physical 0.75px heading bound at '+junction.center.map(Math.round).join(','),()=>{
    const approaches=junction.portals.map(p=>{
      const e=graph.edges.find(e=>(distance(e.a,p)<1e-6 || distance(e.b,p)<1e-6) &&
        !junction.paths.some(path=>path.points.some(q=>distance(q,distance(e.a,p)<1e-6?e.b:e.a)<1e-6)));
      assert(e,'external spoke at '+p);
      const q=distance(e.a,p)<1e-6?e.b:e.a,step=Math.min(2,distance(p,q)/2);
      return p.map((v,i)=>v+(q[i]-v)*step/distance(p,q));
    });
    for(let i=0;i<approaches.length;i++)for(let j=0;j<approaches.length;j++)if(i!==j){
      const points=clean(graph.plan(approaches[i],approaches[j]).points),segments=[];let length=0;
      for(let k=1;k<points.length;k++){
        length+=distance(points[k-1],points[k]);
        segments.push({to:length,heading:Math.atan2(points[k][1]-points[k-1][1],points[k][0]-points[k-1][0])*180/Math.PI});
      }
      const step=.75,heading=at=>segments.find(s=>s.to>=at).heading;
      // Heading is piecewise constant. Evaluate both sides of every event where
      // either end of the travel window crosses a vertex, covering every phase.
      const candidates=segments.flatMap(s=>[s.to-1e-7,s.to+1e-7,s.to-step-1e-7,s.to-step+1e-7]);
      for(const at of candidates)if(at>=0 && at+step<length){
        const turn=Math.abs((heading(at+step)-heading(at)+540)%360-180);
        assert(turn<=25,JSON.stringify({center:junction.center,pair:[i,j],turn,at,step}));
      }
    }
  });
}
