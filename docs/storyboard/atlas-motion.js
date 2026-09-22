(() => {
  'use strict';
  const preferenceKey='pinpin.atlas.motion.v1', speed=44, images=new Map();
  const runtimeSource=spec => spec?.runtimeSrc || (spec?.src==='images/atlas/pinpin-walk-v1.png'
    ? 'images/atlas/pinpin-walk-v1.webp' : spec?.src);
  const distance=(a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
  function project(p,a,b) {
    const dx=b[0]-a[0], dy=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy || 1)));
    const point=[a[0]+t*dx,a[1]+t*dy];
    return {point,t,distance:distance(p,point)};
  }
  function roundNetwork(nodes,edges,options,anchors) {
    const radius=options.radius || 14, limit=(options.maxTurn || 12)*Math.PI/180;
    const original=edges.slice(), adjacency=nodes.map(() => []), removed=new Set(), replacements=[], junctions=[];
    const unit=(a,b) => { const d=distance(a,b); return b.map((v,i) => (v-a[i])/d); };
    const shift=(p,v,d) => p.map((n,i) => n+v[i]*d);
    original.forEach((e,i) => { adjacency[e.u].push(i); adjacency[e.v].push(i); });
    const protectedNode=i => anchors.some(p => distance(p,nodes[i])<1e-6);
    const addPoint=p => { const i=nodes.length; nodes.push(p); return i; };
    const addEdge=(u,v,r,offset=0) => replacements.push({u,v,r,offset});
    function curve(a,c,d,b,r,kind) {
      const at=t => a.map((v,i) => (1-t)**3*v+3*(1-t)**2*t*c[i]+3*(1-t)*t*t*d[i]+t**3*b[i]);
      const tangent=t => a.map((v,i) => 3*((1-t)**2*(c[i]-v)+2*(1-t)*t*(d[i]-c[i])+t*t*(b[i]-d[i])));
      const angle=(u,v) => Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)||1))));
      const points=[a];
      function flatten(lo,hi,depth=0) {
        const middle=(lo+hi)/2, p=at(lo),q=at(hi),chord=q.map((v,i) => v-p[i]);
        if (depth<9 && (distance(p,q)>8 || angle(tangent(lo),chord)>limit/2 ||
            angle(chord,tangent(hi))>limit/2 || angle(tangent(lo),tangent(middle))>limit)) {
          flatten(lo,middle,depth+1); flatten(middle,hi,depth+1);
        } else points.push(q);
      }
      flatten(0,1);
      return {points,r,kind};
    }
    function install(paths,portals) {
      const endpoint=p => portals.find(portal => distance(nodes[portal],p)<1e-6);
      for (const path of paths) {
        let u=endpoint(path.points[0]),offset=0;
        for (let i=1;i<path.points.length;i++) {
          const v=i===path.points.length-1 ? endpoint(path.points[i]) : addPoint(path.points[i]);
          addEdge(u,v,path.r,offset); offset+=distance(nodes[u],nodes[v]); u=v;
        }
      }
    }
    // A surveyed replacement absorbs the lake's tiny endpoint dogleg while
    // keeping its exact story anchor on a physically wider turn.
    for (const blend of options.blends || []) {
      const chain=blend.chain.map(p => nodes.findIndex(q => distance(p,q)<.01));
      if (chain.some(i => i<0)) continue;
      const links=chain.slice(1).map((v,i) => original.findIndex(e =>
        (e.u===chain[i] && e.v===v) || (e.v===chain[i] && e.u===v)));
      if (links.some(i => i<0)) continue;
      links.forEach(i => removed.add(i));
      const paths=blend.curves.map(c => curve(nodes[chain[c.from]],c.controls[0],c.controls[1],
        nodes[chain[c.to]],original[links.at(-1)].r,'anchor'));
      install(paths,chain);
      junctions.push({center:nodes[chain[1]],kind:'anchor',portals:[nodes[chain[0]],nodes[chain.at(-1)]],paths});
    }
    // Branch spokes may include short degree-two connectors. Consume them as one
    // approach so a historical tiny dogleg cannot survive inside the new junction.
    for (let center=0;center<adjacency.length;center++) {
      if (adjacency[center].length<3) continue;
      const spokes=[];
      const spec=options.wide?.find(p => distance(p,nodes[center])<1);
      const branchRadius=spec?.[2] || radius,handle=spec?.[3] || 2/3;
      for (const first of adjacency[center]) {
        let edge=first,u=center,remaining=branchRadius;
        while (true) {
          const e=original[edge],v=e.u===u ? e.v : e.u,length=distance(nodes[u],nodes[v]);
          const terminal=adjacency[v].length!==2 || protectedNode(v);
          const trim=terminal ? Math.min(remaining,length*.4) : Math.min(remaining,length);
          removed.add(edge);
          if (trim<length-1e-6) {
            const outward=unit(nodes[u],nodes[v]),point=shift(nodes[u],outward,trim),portal=addPoint(point);
            addEdge(portal,v,e.r,e.offset+trim);
            spokes.push({portal,point,outward,r:e.r}); break;
          }
          remaining-=length; u=v;
          edge=adjacency[v].find(i => i!==edge);
          if (remaining<1e-6) remaining=.01;
        }
      }
      const paths=[];
      for (let i=0;i<spokes.length;i++) for (let j=i+1;j<spokes.length;j++) {
        const a=spokes[i],b=spokes[j];
        const chord=distance(a.point,b.point);
        const tuned=options.turnHandles?.find(t => distance(t.at,nodes[center])<1 && t.pair[0]===i && t.pair[1]===j);
        paths.push(curve(a.point,shift(a.point,a.outward,-Math.min(chord,distance(a.point,nodes[center]))*(tuned?.handles[0] || handle)),
          shift(b.point,b.outward,-Math.min(chord,distance(b.point,nodes[center]))*(tuned?.handles[1] || handle)),b.point,b.r,'branch'));
      }
      install(paths,spokes.map(s => s.portal));
      junctions.push({center:nodes[center],kind:'branch',portals:spokes.map(s => s.point),paths});
    }
    const branchRemoved=new Set(removed),bendCuts=new Map();
    for (let center=0;center<adjacency.length;center++) {
      const incident=adjacency[center];
      if (incident.length!==2 || incident.some(i => branchRemoved.has(i))) continue;
      const neighbors=incident.map(i => original[i].u===center ? original[i].v : original[i].u);
      const directions=neighbors.map(i => unit(nodes[center],nodes[i]));
      const turn=Math.acos(Math.max(-1,Math.min(1,-directions[0].reduce((sum,v,i) => sum+v*directions[1][i],0))));
      if (turn<(options.minBend || 35)*Math.PI/180) continue;
      const wide=options.anchors?.find(p => distance(p,nodes[center])<1)?.[2];
      const trim=Math.min(wide || 6,...neighbors.map(i => distance(nodes[center],nodes[i])*(wide ? .8 : .3)));
      const points=directions.map(v => shift(nodes[center],v,trim)),portals=points.map(addPoint);
      incident.forEach((edge,i) => {
        if (!bendCuts.has(edge)) bendCuts.set(edge,new Map());
        bendCuts.get(edge).set(center,portals[i]);
      });
      const paths=[],r=original[incident[1]].r,keep=protectedNode(center);
      if (keep) {
        const tangent=unit(directions[0],directions[1]);
        const approach=wide ? trim/3 : trim/2,anchor=wide ? trim/2 : trim/3;
        paths.push(curve(points[0],shift(points[0],directions[0],-approach),shift(nodes[center],tangent,-anchor),nodes[center],r,'anchor'));
        paths.push(curve(nodes[center],shift(nodes[center],tangent,anchor),shift(points[1],directions[1],-approach),points[1],r,'anchor'));
      } else paths.push(curve(points[0],shift(points[0],directions[0],-trim*2/3),
        shift(points[1],directions[1],-trim*2/3),points[1],r,'bend'));
      install(paths,keep ? [...portals,center] : portals);
      junctions.push({center:nodes[center],kind:keep ? 'anchor' : 'bend',portals:points,paths});
    }
    edges.splice(0,edges.length,...original.flatMap((e,i) => branchRemoved.has(i) ? [] : [{...e,
      u:bendCuts.get(i)?.get(e.u) ?? e.u,v:bendCuts.get(i)?.get(e.v) ?? e.v}]),...replacements);
    return junctions;
  }
  function graphFor(routes,options=null) {
    const segments=[], joins=[], nodes=[], edges=[];
    routes.forEach((route,r) => {
      let offset=0;
      route.points.slice(1).forEach((b,i) => {
        const a=route.points[i], length=distance(a,b);
        if (length>1e-6) segments.push({a,b,r,offset,cuts:[0,1]});
        offset+=length;
      });
    });
    // Only close traced endpoints may join another route, including a segment interior.
    routes.forEach((route,r) => [route.points[0],route.points.at(-1)].filter(Boolean).forEach(p => {
      let best=null;
      segments.forEach(segment => {
        if (segment.r===r) return;
        const hit=project(p,segment.a,segment.b);
        if (hit.distance<=12 && (!best || hit.distance<best.distance)) best={...hit,segment};
      });
      if (best) { best.segment.cuts.push(best.t); joins.push([p,best.point]); }
    }));
    const node=p => {
      let i=nodes.findIndex(q => distance(p,q)<1e-6);
      if (i<0) { i=nodes.length; nodes.push(p); }
      return i;
    };
    const edge=(a,b,r,offset=0) => { const u=node(a),v=node(b); if (u!==v) edges.push({u,v,r,offset}); };
    segments.forEach(s => {
      const cuts=[...new Set(s.cuts)].sort((a,b) => a-b);
      const at=t => [s.a[0]+t*(s.b[0]-s.a[0]),s.a[1]+t*(s.b[1]-s.a[1])];
      cuts.slice(1).forEach((t,i) => edge(at(cuts[i]),at(t),s.r,s.offset+cuts[i]*distance(s.a,s.b)));
    });
    joins.forEach(([a,b]) => edge(a,b,-1));
    let junctions=[];
    if (options) {
      const unique=new Set();
      for (let i=edges.length-1;i>=0;i--) {
        const e=edges[i],key=[e.u,e.v].sort((a,b) => a-b).join(',');
        if (unique.has(key)) edges.splice(i,1); else unique.add(key);
      }
      const anchors=routes.filter(r => ['home-to-lake','lake-to-elder','lake-to-bridge','home-lower-road-to-tractor'].includes(r.id))
        .flatMap(r => r.id==='home-to-lake' ? [r.points[0],r.points.at(-1)] : [r.points.at(-1)]);
      junctions=roundNetwork(nodes,edges,options,anchors);
    }
    function nearest(p,allowed=null) {
      let best=null;
      edges.forEach((e,i) => {
        if (allowed && !allowed.has(e.u)) return;
        const hit=project(p,nodes[e.u],nodes[e.v]);
        if (!best || hit.distance<best.distance) best={...hit,edge:i};
      });
      return best;
    }
    function plan(current,target) {
      const start=nearest(current); if (!start) return null;
      const allowed=new Set([edges[start.edge].u]);
      let count=0;
      while (count!==allowed.size) {
        count=allowed.size;
        edges.forEach(e => { if (allowed.has(e.u) || allowed.has(e.v)) { allowed.add(e.u); allowed.add(e.v); } });
      }
      const end=nearest(target,allowed), points=[...nodes,current,end.point], first=nodes.length, goal=first+1;
      const adj=points.map(() => []);
      const link=(u,v,edge) => { const length=distance(points[u],points[v]); adj[u].push([v,length,edge]); adj[v].push([u,length,edge]); };
      edges.forEach((e,i) => link(e.u,e.v,i));
      [start,end].forEach((hit,i) => { const e=edges[hit.edge]; link(first+i,e.u,hit.edge); link(first+i,e.v,hit.edge); });
      if (start.edge===end.edge) link(first,goal,start.edge);
      const costs=points.map(() => Infinity), previous=[], previousEdge=[], seen=new Set(); costs[first]=0;
      while (!seen.has(goal)) {
        let u=-1;
        costs.forEach((cost,i) => { if (!seen.has(i) && cost<Infinity && (u<0 || cost<costs[u])) u=i; });
        if (u<0) return null;
        seen.add(u);
        adj[u].forEach(([v,length,edge]) => {
          if (costs[u]+length<costs[v]) { costs[v]=costs[u]+length; previous[v]=u; previousEdge[v]=edge; }
        });
      }
      const path=[], steps=[];
      for (let i=goal;i!==undefined;i=previous[i]) {
        path.unshift(points[i]);
        const u=previous[i];
        if (u!==undefined && distance(points[u],points[i])>1e-6)
          steps.unshift({edge:previousEdge[i],a:points[u],b:points[i],offset:costs[u]});
      }
      return {points:path,steps,length:costs[goal],target:end.point,route:routes[edges[end.edge].r]?.id || ''};
    }
    return {plan,junctions,nodeCount:new Set(edges.flatMap(e => [e.u,e.v])).size,
      edges:edges.map(e => ({a:nodes[e.u],b:nodes[e.v],offset:e.offset,route:routes[e.r]?.id || ''}))};
  }
  function preload(src,redraw) {
    if (!src) return null;
    if (!images.has(src)) {
      const image=new Image(), entry={image,ready:false}; images.set(src,entry);
      image.src=src;
      entry.promise=image.decode().then(() => { entry.ready=true; },() => { entry.failed=true; });
    }
    const entry=images.get(src);
    if (redraw) entry.promise.then(redraw);
    return entry.ready ? entry.image : null;
  }
  window.AtlasMotion={create(canvas,geometry,onChange=() => {},onFrame=() => {}) {
    const ctx=canvas.getContext('2d'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const requestedMode=window.location?.search && new URLSearchParams(window.location.search).get('spriteMode');
    const mode=['crisp','legacy'].includes(requestedMode) ? requestedMode : 'natural';
    const familyEnabled=Boolean(window.AtlasFamily && new URLSearchParams(window.location?.search || '').get('family')==='1');
    if(familyEnabled)canvas.dataset.family='true';
    const legacy=mode==='legacy', natural=mode==='natural';
    canvas.width=geometry.width; canvas.height=geometry.height;
    const pathFor=points => {
      const path=new Path2D(); points.forEach(([x,y],i) => i ? path.lineTo(x,y) : path.moveTo(x,y)); return path;
    };
    const routes=(geometry.routes || []).map(route => {
      const points=route.points.map(([x,y]) => [x*geometry.width,y*geometry.height]);
      return {...route,points};
    });
    const graph=graphFor(routes,geometry.junctions), initial=routes.find(r => r.from==='home' && r.to==='lake') || routes[0];
    let point=initial?.points[0]?.slice() || [0,0], journey=graph.plan(point,initial?.points.at(-1) || point);
    let trails=[], segment=1, travelled=0, heading=0, elapsed=0, walkTime=0;
    let paused=reduced.matches, hidden=document.hidden, suspended=false, request=0, idleTimer=0, last=null, failed=false;
    let focused=null, regionLayers={}, metadata=null, directions=[], pending=null, accepted=-Infinity, cueUntil=0;
    let version=0, lastTrailPoint=null, fallbackStarted=false, spriteLayer=null;
    let spriteSurface=null, spriteDirty=true, spriteSamples=[], spriteKey=null;
    let spritePhase=-1, spriteHeading=-1, spriteTick=-1, spriteMoving=false;
    let selectedDirection=null;
    let directionCandidate=null, candidateSince=0, turnSince=null, directionSince=-Infinity, transition=null;
    let blendPairs=new Map();
    const pairKey=(a,b) => a<b ? a+','+b : b+','+a;
    let velocity=0, actualSpeed=0, spriteLift=0, naturalPaint=-Infinity;
    const spriteLoaded=() => { spriteDirty=true; draw(); };
    const family=familyEnabled ? window.AtlasFamily.create({onReady:spriteLoaded}) : null;
    function seedFamily() {
      if(!family)return;
      const destinations=routes.flatMap(r=>[r.points[0],r.points.at(-1)])
        .sort((a,b)=>distance(b,point)-distance(a,point));
      const back=graph.plan(point,destinations[0] || point);
      family.seed(back?.points?.length ? back.points.slice().reverse() : [point]);
    }
    seedFamily();
    const data=(key,value) => { const text=String(value); if (canvas.dataset[key]!==text) canvas.dataset[key]=text; };
    try { paused=paused || localStorage.getItem(preferenceKey)==='paused'; } catch { /* Use system preference. */ }
    function syncDirections() {
      if(family)return;
      const next=window.atlasDirections;
      if (next===metadata) return;
      metadata=next;
      spriteDirty=true;
      selectedDirection=null;
      directionCandidate=null; turnSince=null; transition=null; directionSince=-Infinity;
      blendPairs=new Map((metadata?.blendTransitions || [])
        .filter(t => Number.isFinite(t.from) && Number.isFinite(t.to))
        .map(t => [pairKey(((t.from%360)+360)%360,((t.to%360)+360)%360),t]));
      directions=(metadata?.directions || []).filter(d => Number.isFinite(d.angle) && d.frames?.length)
        .map(d => ({...d,angle:((d.angle%360)+360)%360}))
        .filter(d => !legacy || d.angle%30===0).sort((a,b) => a.angle-b.angle);
      directions.forEach(direction => preload(direction.runtimeSrc || direction.src,spriteLoaded));
    }
    function target(value) {
      const next=graph.plan(point,value);
      if (!next || (journey && distance(next.target,journey.target)<12)) return false;
      journey=next; segment=1; travelled=0; rebuild(); accepted=elapsed; return true;
    }
    function rebuild() {
      lastTrailPoint=null;
      // Retain planned edge identity: a geometric crossing is not necessarily a junction.
      const stepsByEdge=new Map();
      for (const step of journey?.steps || []) {
        if (!stepsByEdge.has(step.edge)) stepsByEdge.set(step.edge,[]);
        stepsByEdge.get(step.edge).push(step);
      }
      trails=graph.edges.flatMap(({a,b,offset},edge) => {
        const steps=(stepsByEdge.get(edge) || []).map(step => ({...step,
          start:project(step.a,a,b).t,end:project(step.b,a,b).t}));
        const cuts=[0,1];
        steps.forEach(step => cuts.push(step.start,step.end));
        const sorted=[...new Set(cuts)].sort((x,y) => x-y), length=distance(a,b);
        const at=t => [a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];
        return sorted.slice(1).flatMap((t,i) => {
          if ((t-sorted[i])*length<1e-6) return [];
          const middle=(t+sorted[i])/2;
          const step=steps.find(s => middle>=Math.min(s.start,s.end) && middle<=Math.max(s.start,s.end));
          const reverse=step && step.end<step.start;
          const start=at(reverse ? t : sorted[i]), end=at(reverse ? sorted[i] : t);
          return [{a:start,b:end,path:pathFor([start,end]),selected:Boolean(step),
            offset:step ? step.offset+distance(step.a,start) : offset+sorted[i]*length}];
        });
      });
    }
    function naturalDistance(delta) {
      const length=Math.max(0,(journey?.length || 0)-travelled);
      if (!length) { velocity=0; return 0; }
      const count=Math.min(32,Math.max(1,Math.ceil(delta/16))), dt=delta/count/1000, acceleration=speed/.2;
      let moved=0;
      // Fixed work even after a long dropped frame; clamp the integrated distance at the endpoint.
      for (let i=0;i<count && moved<length;i++) {
        const phase=(walkTime+moved/speed*1000)/190;
        const cruise=speed*(1+.11*Math.sin(phase*Math.PI*2));
        const targetSpeed=Math.min(cruise,Math.sqrt(2*acceleration*(length-moved)));
        const ramp=Math.min(dt,Math.abs(targetSpeed-velocity)/acceleration);
        const next=velocity+Math.sign(targetSpeed-velocity)*acceleration*ramp;
        moved=Math.min(length,moved+(velocity+next)*ramp/2+next*(dt-ramp));
        velocity=moved===length ? 0 : next;
      }
      return moved;
    }
    function advance(delta) {
      let remaining=natural ? naturalDistance(delta) : speed*delta/1000, moved=0;
      while (journey && segment<journey.points.length) {
        const next=journey.points[segment], length=distance(point,next);
        if (length<1e-6) { point=next.slice(); segment++; continue; }
        if (remaining<=0) break;
        heading=(Math.atan2(next[1]-point[1],next[0]-point[0])*180/Math.PI+360)%360;
        const step=Math.min(length,remaining), fraction=step/length;
        point=[point[0]+(next[0]-point[0])*fraction,point[1]+(next[1]-point[1])*fraction];
        family?.append(point);
        remaining-=step; travelled+=step; moved+=step;
        if (step===length) segment++;
      }
      walkTime+=moved/speed*1000;
      if (natural) actualSpeed=delta>0 ? moved/delta*1000 : 0;
    }
    function naturalDirection(candidate,available,moving,frame,canPaint) {
      if (!selectedDirection || !available.includes(selectedDirection)) {
        selectedDirection=candidate; directionSince=elapsed;
        directionCandidate=null; turnSince=null; transition=null;
      } else if (!moving) {
        // Arrival commits the final heading once; an idle sprite never keeps chasing a turn.
        selectedDirection=candidate; directionCandidate=null; turnSince=null; transition=null;
      } else if (candidate===selectedDirection) {
        directionCandidate=null; turnSince=null;
      } else if (candidate) {
        if (turnSince===null) turnSince=elapsed;
        if (candidate!==directionCandidate) { directionCandidate=candidate; candidateSince=elapsed; }
        if (canPaint && elapsed-directionSince>=150 &&
            (elapsed-candidateSince>=120 || elapsed-turnSince>=240)) {
          const previous=selectedDirection;
          const rule=blendPairs.get(pairKey(previous.angle,candidate.angle));
          const adjacent=Math.abs(((candidate.angle-previous.angle+540)%360)-180)===15;
          const duration=Number.isFinite(rule?.durationMs) ? Math.min(80,Math.max(0,rule.durationMs)) : 80;
          transition=rule?.allowed===true && adjacent && duration>0 ? {from:previous,to:candidate,start:elapsed,duration,frame} : null;
          selectedDirection=candidate; directionSince=elapsed;
          directionCandidate=null; turnSince=null;
        }
      }
      if (transition && elapsed-transition.start>=transition.duration) transition=null;
      return selectedDirection;
    }
    function sprite() {
      if(family) {
        const moving=Boolean(journey && segment<journey.points.length);
        family.draw(spriteLayer,{point,heading,elapsed,walkTime,moving});
        data('sprite',family.loaded ? 'ready' : family.error ? 'unavailable' : 'loading');
        data('spriteMode','family');data('speed',moving ? actualSpeed : 0);
        return;
      }
      if (spriteLayer) {
        spriteLayer.x=point[0]-spriteLayer.anchor[0]; spriteLayer.y=point[1]-spriteLayer.anchor[1];
        spriteLayer.footY=point[1];
      }
      const moving=Boolean(journey && segment<journey.points.length);
      const phaseBucket=moving ? Math.floor((walkTime+1e-7)/(legacy ? 50 : 190)) : 0;
      const angle=legacy ? Math.round(heading/3.75)%96*3.75 : heading;
      const angular=d => Math.abs(((angle-d.angle+540)%360)-180);
      const available=legacy ? directions : directions.filter(d => images.get(d.runtimeSrc || d.src)?.ready);
      let direction=available.reduce((best,d) => !best || angular(d)<angular(best) ? d : best,null);
      // A 4-degree distance advantage moves the midpoint boundary by 2 degrees.
      if (!legacy && direction && selectedDirection && available.includes(selectedDirection) &&
          angular(selectedDirection)<=angular(direction)+4) direction=selectedDirection;
      const canPaint=elapsed-naturalPaint>=50-1e-7;
      if (natural) direction=naturalDirection(direction,available,moving,phaseBucket,canPaint);
      else if (!legacy) selectedDirection=direction;
      if (natural) {
        data('speed',moving ? actualSpeed : 0);
        data('turning',Boolean(directionCandidate || transition));
      }
      const headingBucket=legacy ? angle : direction?.angle ?? -1, tickBucket=Math.floor((elapsed+1e-7)/50);
      const unchanged=phaseBucket===spritePhase && headingBucket===spriteHeading;
      const refresh=natural ? canPaint && (moving || moving!==spriteMoving || !unchanged || transition) :
        moving!==spriteMoving || (!unchanged && (!legacy || tickBucket!==spriteTick));
      if (spriteDirty || refresh) {
        if (!legacy && !direction && directions.some(d => {
          const entry=images.get(d.runtimeSrc || d.src);
          return entry && !entry.failed;
        })) { data('sprite','loading'); return; }
        const directionSrc=direction && (direction.runtimeSrc || direction.src);
        const image=direction && preload(directionSrc);
        if (directionSrc && !image && !images.get(directionSrc)?.failed) { data('sprite','loading'); return; }
        const phase=legacy ? phaseBucket*50/190 : phaseBucket;
        const frame=natural && transition ? transition.frame : Math.floor(phase), mix=legacy ? phase-frame : 0, samples=[];
        const lift=natural && moving ? .75*Math.sin(Math.PI*(walkTime/190%1))**2 : 0;
        function add(image,crop,anchor,scale,weight) {
          if (weight<=1e-7 || !crop?.every(Number.isFinite) || crop[2]<=0 || crop[3]<=0) return;
          samples.push({image,crop,anchor:anchor || [crop[2]/2,crop[3]],scale,weight});
        }
        function gait(image,count,weight,specFor) {
          for (let i=0;i<(legacy ? 2 : 1);i++) {
            const contribution=weight*(i ? mix : 1-mix);
            if (contribution<=1e-7) continue;
            const spec=specFor((frame+i)%count);
            add(image,spec.crop,spec.anchor,spec.scale,contribution);
          }
        }
        if (image) {
          let lower=directions.at(-1), upper=directions[0];
          for (const candidate of directions) {
            if (candidate.angle<=angle) lower=candidate;
            if (candidate.angle>angle) { upper=candidate; break; }
          }
          const gap=(upper.angle-lower.angle+360)%360;
          const blend=gap>0 && gap<=60 ? ((angle-lower.angle+360)%360)/gap : 0;
          const lowerImage=preload(lower.runtimeSrc || lower.src), upperImage=preload(upper.runtimeSrc || upper.src);
          // Never dissolve across missing headings or opposing silhouettes.
          let headings=legacy && gap>0 && gap<=60 && lowerImage && upperImage
            ? [[lower,lowerImage,1-blend],[upper,upperImage,blend]] : [[direction,image,1]];
          if (natural && transition) {
            // End-of-display-interval weights keep an 80ms maximum fade inside the 20Hz upload budget.
            const blend=Math.min(1,(elapsed-transition.start+50)/transition.duration);
            headings=[[transition.from,preload(transition.from.runtimeSrc || transition.from.src),1-blend],
              [transition.to,image,blend]];
          }
          for (const [d,source,weight] of headings) {
            const scale=(metadata.displayWidth || 56)/(d.referenceWidth || metadata.referenceWidth || 425);
            gait(source,d.frames.length,weight,index => ({crop:d.frames[index].rect,anchor:d.frames[index].anchor,scale}));
          }
          data('direction',direction.angle);
        } else {
          const spec=geometry.sprite || {};
          if (!fallbackStarted) { fallbackStarted=true; preload(runtimeSource(spec),spriteLoaded); }
          const source=preload(runtimeSource(spec));
          if (!source) { data('sprite','unavailable'); return; }
          const columns=spec.columns || 4, rows=spec.rows || 1, count=spec.frames || columns*rows;
          const fw=source.naturalWidth/columns, fh=source.naturalHeight/rows;
          gait(source,count,1,index => {
            const rect=spec.frameRects?.[index];
            const crop=rect ? Array.isArray(rect) ? rect : [rect.x,rect.y,rect.width,rect.height]
              : spec.frameBounds?.[index] || [index%columns*fw,Math.floor(index/columns)*fh,fw,fh];
            return {crop,anchor:spec.frameAnchors?.[index] || rect?.anchor,
              scale:spec.referenceWidth ? 56/spec.referenceWidth : (spec.displayHeight || 64)/crop[3]};
          });
          data('direction','fallback');
        }
        if (!samples.length) return;
        if (!spriteLayer && !spriteSurface && document.createElement) {
          const surface=document.createElement('canvas'); surface.width=surface.height=128;
          spriteSurface={canvas:surface,anchor:[64,112]};
        }
        const surface=spriteLayer || spriteSurface;
        const imageKey=canvas.dataset.direction+';'+samples.map(s => [s.image.src,...s.crop,...s.anchor,s.scale,s.weight].join(',')).join(';');
        const key=imageKey+(natural ? '|lift='+lift : '');
        if (key!==spriteKey) {
          spriteSamples=samples; spriteKey=key; spriteLift=lift;
          if (surface) {
            const context=surface.canvas.getContext('2d');
            context.clearRect(0,0,surface.canvas.width,surface.canvas.height);
            const rasterScale=surface.rasterScale || 1;
            context.save();
            if (rasterScale!==1) context.setTransform(rasterScale,0,0,rasterScale,0,0);
            paintSprite(context,surface.anchor);
            context.restore();
          }
          if (spriteLayer) { spriteLayer.imageKey=imageKey; spriteLayer.revision++; }
          if (natural) naturalPaint=elapsed;
        }
        spritePhase=phaseBucket; spriteHeading=headingBucket; spriteTick=tickBucket; spriteMoving=moving; spriteDirty=false;
        data('sprite','ready'); data('frame',frame%4); data('spriteMode',mode);
        if (natural) {
          data('bob',lift); data('gaitDistance',walkTime*speed/1000); data('blending',samples.length>1);
        }
      }
      if (spriteLayer) {
        spriteLayer.ready=Boolean(spriteKey);
      } else if (spriteSurface) ctx.drawImage(spriteSurface.canvas,point[0]-64,point[1]-112);
      else paintSprite(ctx,point);
    }
    function paintSprite(context,anchor) {
      context.save(); context.translate(...anchor);
      if (natural && context.ellipse) {
        context.globalCompositeOperation='source-over'; context.globalAlpha=.13; context.fillStyle='#20231c';
        context.beginPath(); context.ellipse(0,0,9,1.7,0,0,Math.PI*2); context.fill();
      }
      // Add weighted premultiplied RGBA on a transparent surface: source-over
      // would reduce opacity in overlapping pixels during the crossfade.
      context.globalCompositeOperation=legacy || spriteSamples.length>1 ? 'lighter' : 'source-over';
      for (const sample of spriteSamples) {
        const {image,crop,anchor,scale,weight}=sample;
        context.globalAlpha=weight;
        context.drawImage(image,...crop,-anchor[0]*scale,-anchor[1]*scale-spriteLift,crop[2]*scale,crop[3]*scale);
      }
      context.restore();
    }
    function stroke(routePath,alpha,width) {
      ctx.globalAlpha=alpha; ctx.lineWidth=width; ctx.stroke(routePath);
    }
    function draw() {
      if (failed || hidden || suspended) return;
      syncDirections();
      try {
        ctx.clearRect(0,0,canvas.width,canvas.height); ctx.save();
        const destination=focused || (journey && routes.find(r => r.id===journey.route)?.to);
        data('region',destination || '');
        if (regionLayers[destination]) {
          ctx.globalAlpha=focused ? .12 : .025+(Math.sin(elapsed/1100)+1)*.028;
          ctx.drawImage(regionLayers[destination],0,0);
        }
        ctx.lineCap='round'; ctx.lineJoin='round';
        ctx.strokeStyle='#ffffff'; ctx.setLineDash([5,11]);
        const pointChanged=!lastTrailPoint || point[0]!==lastTrailPoint[0] || point[1]!==lastTrailPoint[1];
        trails.forEach(trail => {
          if (pointChanged) trail.near=project(point,trail.a,trail.b).distance<170;
          ctx.lineDashOffset=trail.offset-(trail.selected ? walkTime/160 : 0);
          stroke(trail.path,trail.selected ? .9 : trail.near ? .42 : .16,trail.selected ? 4.5 : 3.5);
        });
        lastTrailPoint=point;
        ctx.restore();
        data('x',point[0]); data('y',point[1]); data('heading',heading);
        data('target',JSON.stringify(journey?.target || point)); data('route',journey?.route || '');
        data('progress',(journey?.length ? Math.min(1,travelled/journey.length) : 1).toFixed(5));
        data('arrived',!journey || segment>=journey.points.length);
        if (initial) sprite();
      } catch { failed=true; canvas.dataset.sprite='unavailable'; stop(); }
      if (!failed) onFrame(++version);
    }
    function stop() {
      if (request) cancelAnimationFrame(request);
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer=0;
      request=0; last=null; data('running',false);
    }
    function schedule() {
      if (paused || hidden || suspended || failed || !initial) return;
      if (request) cancelAnimationFrame(request);
      if (idleTimer) clearTimeout(idleTimer);
      request=0; idleTimer=0;
      // Resting region pulses use a low-rate timer; walking and the independent camera use RAF.
      if ((!journey || segment>=journey.points.length) && !pending) {
        idleTimer=setTimeout(() => { idleTimer=0; tick(performance.now()); },1000/15);
      } else request=requestAnimationFrame(tick);
    }
    function tick(now) {
      request=0;
      if (paused || hidden || suspended || failed) return;
      const delta=last===null ? 0 : Math.max(0,now-last); last=now; elapsed+=delta;
      if (pending && elapsed-accepted>=220) { const next=pending; pending=null; target(next); }
      const wasArrived=!journey || segment>=journey.points.length;
      advance(delta);
      if (cueUntil && elapsed>=cueUntil) { cueUntil=0; delete canvas.dataset.cue; }
      draw();
      if (!wasArrived && (!journey || segment>=journey.points.length)) {
        onChange({type:'arrival',point:[point[0]/geometry.width,point[1]/geometry.height]});
      }
      if (!failed) { data('running',true); schedule(); }
    }
    function run() {
      stop(); draw();
      schedule();
    }
    function setPaused(value,persist=true) {
      paused=Boolean(value);
      if (persist) try { localStorage.setItem(preferenceKey,paused ? 'paused' : 'playing'); } catch { /* Control remains usable. */ }
      run(); onChange();
    }
    reduced.addEventListener('change',event => { if (event.matches) setPaused(true,false); });
    document.addEventListener('visibilitychange',() => { hidden=document.hidden; run(); });
    addEventListener('pagehide',stop);
    addEventListener('pageshow',() => { hidden=document.hidden; run(); });
    addEventListener('storage',event => {
      if (event.key===preferenceKey) setPaused(reduced.matches || event.newValue==='paused',false);
    });
    function repaintSpriteRaster(layer) {
      if (layer!==spriteLayer) return;
      spriteDirty=true; spriteKey=null;
      // Camera-only zoom must repaint even when the motion clock is paused.
      draw();
    }
    // Renderer-owned raster size; positions and anchors remain in world pixels.
    canvas.atlasSetSpriteLayer=layer => {
      if (spriteLayer?.onRasterScaleChange===repaintSpriteRaster) spriteLayer.onRasterScaleChange=null;
      spriteLayer=layer;
      if (layer) layer.onRasterScaleChange=repaintSpriteRaster;
      spriteDirty=true; spriteKey=null; draw();
    };
    rebuild(); run();
    return {
      get version() { return version; },
      get navigation() { return {edges:graph.edges,junctions:graph.junctions,nodeCount:graph.nodeCount}; },
      get spriteLayer() { return spriteLayer; },
      get familyState() { return family?.state || null; },
      startFamilyPreview() {
        if(!family)return false;
        const plan=graph.plan(point,[1030,581]);
        point=plan.target.slice();journey=null;pending=null;walkTime=0;travelled=0;segment=1;
        seedFamily();target([1220,568]);
        if(!reduced.matches)setPaused(false,false);else run();
        return true;
      },
      get paused() { return paused; },
      suspend(value) { if (suspended===Boolean(value)) return; suspended=Boolean(value); run(); },
      toggle() { setPaused(!paused); },
      setRegions(value) { regionLayers=value || {}; draw(); },
      focus(id) { if (focused===id) return; focused=id; data('focus',id || ''); draw(); },
      update() { draw(); },
      placeAtLocation(id) {
        if (!['home','lake','elder','bridge'].includes(id)) return false;
        const route=routes.find(r => r.id===(id==='home' || id==='lake' ? 'home-to-lake' : 'lake-to-'+id));
        const endpoint=id==='home' ? route?.points[0] : route?.points.at(-1);
        if (!endpoint) return false;
        point=endpoint.slice(); journey=null; pending=null; segment=1; travelled=0;
        walkTime=0; accepted=-Infinity; cueUntil=0; delete canvas.dataset.cue;
        if (natural) { velocity=0; actualSpeed=0; transition=null; directionCandidate=null; turnSince=null; spriteDirty=true; }
        seedFamily();
        rebuild(); run();
        return true;
      },
      setTarget(value) {
        if (!Array.isArray(value) || value.length!==2 || !value.every(Number.isFinite)) return;
        const next=value.map((v,i) => Math.max(0,Math.min(1,v))*(i ? geometry.height : geometry.width));
        if (!paused && elapsed-accepted<220) pending=next;
        else { pending=null; target(next); draw(); }
        if (idleTimer) schedule();
      },
      cue(id) { canvas.dataset.cue=id; cueUntil=elapsed+4200; draw(); }
    };
  }};
})();
