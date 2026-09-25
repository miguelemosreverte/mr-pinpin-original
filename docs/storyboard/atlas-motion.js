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
  window.AtlasMotion={create(canvas,geometry,onChange=() => {},onFrame=() => {},runtime=null) {
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
    const trial=runtime?.videoEnabled ?? Boolean(window.location?.search && new URLSearchParams(window.location.search).get('spriteTrial')==='1');
    let spriteSet='original', video=null, videoHeading=0, videoFallback=null;
    let facingPlan=null,facingCandidate=null,facingSince=0,backpedal=false;
    // Sandbox limits: backpedalling or walking misaligned for too long halts him for a clean in-place turn.
    let backSince=null,misalignSince=null,halt=false;
    function fallbackVideo(state,reason) {
      if(spriteSet!=='video')return false;
      if(!reason && state.waitingReason!=='unavailable' && !state.cache.failed.includes(state.clip))return false;
      videoFallback={reason:reason || state.error || 'Required sheet unavailable: '+state.clip,clip:state.clip,at:elapsed};
      data('videoFallback',videoFallback.reason);
      setSpriteSet('original');return true;
    }
    const angularDistance=(a,b)=>Math.abs((a-b+540)%360-180);
    function desiredVideoHeading() {
      while(journey && segment<journey.points.length && distance(point,journey.points[segment])<1e-6) {
        point=journey.points[segment++].slice();
      }
      const next=journey?.points[segment];
      if(!next) {
        // Sandbox: arrived means stopped; no turn chain toward the last aim plays out in place (a clip under way ends).
        const state=sandbox && video?.state;
        if(state?.ready)videoHeading=state.to ?? state.heading;
        backpedal=false;halt=false;backSince=misalignSince=null;
        if(sandbox) {data('backpedal',false);data('halt',false);}
        return videoHeading;
      }
      const direction=(a,b)=>(Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI+360)%360;
      const tangent=direction(point,next),newPlan=facingPlan!==journey;
      facingPlan=journey;
      if(sandbox && video) {
        const limit=(key,fallback) => {const v=Number(sandboxQuery.get(key));return Number.isFinite(v) && sandboxQuery.has(key) ? v : fallback;};
        const aligned=Math.round(tangent/15)%24*15;
        if(newPlan) {halt=false;backSince=misalignSince=null;}
        // Halted: turn in place toward the way ahead; advanceVideo releases him once the turn has landed.
        if(halt) {videoHeading=aligned;facingCandidate=null;data('halt',true);return videoHeading;}
        data('halt',false);
        // Backpedal: a pointer behind him (within 60 degrees of straight back) is walked to backwards, keeping his
        // facing and playing the walk loop in reverse; he turns normally once the way ahead leaves that cone.
        const facing=video.state.to ?? video.state.heading;
        if(newPlan)backpedal=angularDistance(tangent,(facing+180)%360)<=60;
        else if(backpedal && angularDistance(tangent,(videoHeading+180)%360)>60)backpedal=false;
        if(backpedal) {
          backSince??=elapsed;
          if(elapsed-backSince>=limit('backMs',750)) {
            backpedal=false;halt=true;backSince=null;videoHeading=aligned;data('backpedal',false);data('halt',true);return videoHeading;
          }
          if(newPlan)videoHeading=facing;
          facingCandidate=null;data('backpedal',true);return videoHeading;
        }
        data('backpedal',false);backSince=null;
        // Walking at an angle to the way ahead (turn-walk not converging) for too long: stop and align.
        if(angularDistance(tangent,video.state.heading)>limit('alignDeg',15)) {
          misalignSince??=elapsed;
          if(elapsed-misalignSince>=limit('alignMs',1000)) {
            halt=true;misalignSince=null;videoHeading=aligned;facingCandidate=null;data('halt',true);return videoHeading;
          }
        } else misalignSince=null;
      }
      let aim=point,cursor=point,budget=24;
      // Facing samples only a short road stretch, never beyond a sharp corner.
      for(let i=segment;i<journey.points.length && i<segment+16 && budget>0;i++) {
        const end=journey.points[i],length=distance(cursor,end);
        if(length<1e-6) {cursor=end;continue;}
        if(angularDistance(direction(cursor,end),tangent)>30)break;
        const step=Math.min(length,budget),fraction=step/length;
        aim=[cursor[0]+(end[0]-cursor[0])*fraction,cursor[1]+(end[1]-cursor[1])*fraction];
        budget-=step;cursor=end;
      }
      const angle=direction(point,aim),outside=angularDistance(tangent,videoHeading)>30;
      let candidate=Math.round(angle/15)%24*15;
      if(angularDistance(candidate,tangent)>30)candidate=Math.round(tangent/15)%24*15;
      // Sandbox: a pointer roughly north/south/east/west means exactly that; a few degrees off never picks the
      // neighbouring 15-degree clip, and the snap wins at once over the keep-current-facing margin below.
      const snap=Number(sandboxQuery.get('snapDeg') ?? 10),cardinal=Math.round(angle/90)%4*90;
      const snapped=sandbox && snap>0 && angularDistance(angle,cardinal)<=snap;
      if(snapped)candidate=cardinal;
      data('aim',Math.round(angle));
      if(snapped && videoHeading!==cardinal) {videoHeading=cardinal;facingCandidate=null;return videoHeading;}
      if(!outside && (journey.length-travelled<12 ||
          angularDistance(angle,videoHeading)<=angularDistance(angle,candidate)+(journey.steer ? 10 : 4))) {
        facingCandidate=null;return videoHeading;
      }
      if(candidate!==facingCandidate || newPlan) {facingCandidate=candidate;facingSince=travelled;}
      // Small intent changes need road distance, not an in-place timer, to persist.
      if(newPlan || outside || angularDistance(candidate,videoHeading)>=45 || travelled-facingSince>=5) {
        videoHeading=candidate;facingCandidate=null;
      }
      return videoHeading;
    }
    function setSpriteSet(value) {
      if(!['original','video'].includes(value) || value==='video' && (!trial || !window.AtlasVideoSprite))return false;
      if(value===spriteSet)return true;
      spriteSet=value;
      if(value==='video') {
        videoFallback=null;delete canvas.dataset.videoFallback;
        facingPlan=null;facingCandidate=null;
        videoHeading=Math.round(heading/15)%24*15;
        // Stride pacing (?pace=0..0.6): on by default in the sandbox, off on the original page.
        const paceQuery=new URLSearchParams(window.location?.search || '');
        video ||= window.AtlasVideoSprite.create({manifestUrl:runtime?.manifestUrl || '/__sprite-trial/'+'manifest.json',onReady:spriteLoaded,
          pace:Math.max(0,Math.min(.6,Number(paceQuery.get('pace') ?? ((runtime?.groundEnabled ?? paceQuery.get('sandbox')==='1') ? .3 : 0)) || 0))});
        const instance=video;
        instance.ready.then(ready=>{
          if(!ready && video===instance)fallbackVideo(instance.state,instance.state.error || 'Trial manifest unavailable');
        });
        video.reset(videoHeading);
      } else {
        video?.dispose(); video=null; seedFamily();
        delete canvas.dataset.videoClip;delete canvas.dataset.turning;delete canvas.dataset.spriteSet;
      }
      spriteDirty=true; spriteKey=null; velocity=0; actualSpeed=0;
      run(); onChange(); return true;
    }
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
      if(family || spriteSet==='video')return;
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
    // Sprite-trial sandbox (?sandbox=1): no roads, he walks at the pointer like the movement lab. The field texture
    // Ground collision is separate from canopy occlusion; depth and light retain their existing textures.
    const sandboxQuery=new URLSearchParams(window.location?.search || '');
    const reviewSandbox=sandboxQuery.get('sandbox')==='1';
    const sandbox=runtime?.groundEnabled ?? reviewSandbox;
    // Walk mode (Tab panel or ?walk=): 'steer' (default) slides along the soft walkable field toward the pointer;
    // 'field' plans a path over walkable ground; 'free' walks straight at the pointer.
    let walkMode=['field','free'].includes(sandboxQuery.get('walk')) ? sandboxQuery.get('walk') : 'steer';
    let field=null,fieldLight=1,fieldTone=[1,1,1],tintCanvas=null,navigator=null,routeAim=null;
    const initialSpawn=point.slice();let untouchedSpawn=true;
    const groundField=sandboxQuery.get('groundField')==='legacy' ? 'legacy' : 'sdf',clearance=3,softRange=18;
    let fieldState=sandbox ? 'loading' : 'disabled',fieldError='',fieldTarget=null;
    let groundHeld=sandbox && walkMode!=='free';
    let ready=Promise.resolve();
    const sdfReady=() => groundField==='sdf' && fieldState==='ready';
    function fieldStatus(state,error='') {
      fieldState=state;fieldError=error;
      data('groundField',groundField);data('groundFieldState',state);data('groundFieldError',error);
    }
    if(sandbox) {
      fieldStatus('loading');
      if(walkMode!=='free') {fieldTarget=journey?.target?.slice() || null;journey=null;}
      ready=Promise.resolve().then(() => {
        if(!window.AtlasField)throw Error('AtlasField unavailable');
        const textures=['images/atlas/shire-field-v1.png','images/atlas/shire-tone-v1.png'];
        return groundField==='legacy' ? window.AtlasField.load(...textures,'images/atlas/shire-walk-v1.png',
          ['images/atlas/shire-body-v1a.png','images/atlas/shire-body-v1b.png']) :
          window.AtlasField.load(...textures,null,null,{src:'images/atlas/shire-ground-sdf-v4.png',scale:16,bias:32768,clearance,softRange});
      }).then(value => {
        const methods=groundField==='sdf' ? ['signedDistance','distanceGradient','sweep','plan'] : ['walkability','walkGradient','plan'];
        if(!value || methods.some(name => typeof value[name]!=='function'))throw Error('Ground field API unavailable');
        field=value;navigator=field.createNavigator?.({clearance,lookahead:32,arrival:4}) || null;
        fieldStatus('ready');spriteDirty=true;
        if(untouchedSpawn && walkMode!=='free' && sdfReady() && distance(point,initialSpawn)<1e-6 &&
            field.signedDistance(...point)<clearance) {
          const recovered=field.recoverInitialPoint?.(point);
          if(recovered)point=recovered.slice();
        }
        untouchedSpawn=false;
        const waiting=fieldTarget;fieldTarget=null;
        if(waiting && walkMode!=='free')target(waiting);
        draw();schedule();
      }).catch(error => {fieldStatus('failed',String(error?.message || error));draw();});
    }
    // Steering (sticky aim): the pointer is an aim, re-steered every frame. The way is the aim direction with its push
    // into less walkable ground removed (continuous, weighted by how unwalkable it gets), low-passed so the boundary
    // bends his path gently instead of turning him; pushing straight into a wall slows him to a stop.
    let aimPoint=null,steerDir=null,steerLag=null,steerPace=1,reviewLastStop=null;
    const smoothstep=(a,b,x) => {const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
    function stopGroundJourney(blocked=false,reason=blocked ? 'collision-held' : 'stopped') {
      reviewLastStop={reason,atElapsed:elapsed};
      groundHeld=blocked;
      aimPoint=null;steerDir=steerLag=null;
      if(journey) {journey.points=[point.slice(),point.slice()];journey.length=travelled;segment=2;}
    }
    function sweepGround(from,to) {
      const here=field.signedDistance(...from);
      if(here<clearance) {
        const g=field.distanceGradient(...from),dx=to[0]-from[0],dy=to[1]-from[1],length=Math.hypot(dx,dy);
        if(!Number.isFinite(here) || !length || (g[0]*dx+g[1]*dy)/length<=1e-5)
          return {point:from.slice(),fraction:0,blocked:true};
      }
      // The field sweep permits only strictly improving distance while below clearance.
      return field.sweep(from,to,clearance);
    }
    // Clip the remaining polyline before either route follower or video can credit travel/stride time.
    function guardGroundJourney() {
      if(!sandbox || walkMode==='free')return;
      if(fieldState!=='ready') {stopGroundJourney(true,'field-not-ready');return;}
      if(journey?.groundBlocked && segment>=journey.points.length)groundHeld=true;
      if(!sdfReady() || !journey || segment>=journey.points.length)return;
      groundHeld=false;
      let cursor=point,length=0;
      for(let i=segment;i<journey.points.length;i++) {
        const result=sweepGround(cursor,journey.points[i]);
        length+=distance(cursor,result.point);
        if(result.blocked) {
          journey.points=journey.points.slice(0,i).concat([result.point.slice()]);
          journey.length=travelled+length;journey.groundBlocked=true;
          if(length<1e-6)stopGroundJourney(true,'sweep-no-travel');
          return;
        }
        cursor=journey.points[i];
      }
    }
    function steer(delta) {
      if(!aimPoint)return;
      if(fieldState!=='ready') {stopGroundJourney(true,'field-not-ready');return;}
      if(navigator && sdfReady() && field.signedDistance(...point)>=clearance) {steerPlanned(delta);return;}
      const toAim=[aimPoint[0]-point[0],aimPoint[1]-point[1]],rest=Math.hypot(...toAim);
      const walking=Boolean(journey && segment<journey.points.length);
      if(rest<(walking ? 8 : 12)) {stopGroundJourney(false,'aim-reached');return;}
      const d=[toAim[0]/rest,toAim[1]/rest],look=Math.min(rest,20),ahead=[point[0]+d[0]*look,point[1]+d[1]*look];
      let way=d,push=[0,0],speedFactor=1;
      if(sdfReady()) {
        const here=field.signedDistance(...point),there=field.signedDistance(...ahead);
        const g=field.distanceGradient(...ahead),gh=field.distanceGradient(...point);
        if(!Number.isFinite(here) || (here<clearance && gh[0]*d[0]+gh[1]*d[1]<=1e-5)) {stopGroundJourney(true,'invalid-start-direction');return;}
        const gx=g[0]+gh[0],gy=g[1]+gh[1],gl=Math.hypot(gx,gy);
        // Opposing nearby normals can cancel a legal final approach; its full sweep is authoritative.
        const clearArrival=rest<=20 && !sweepGround(point,aimPoint).blocked;
        if(gl>1e-5 && !clearArrival) {
          const n=[gx/gl,gy/gl],w=1-smoothstep(clearance,clearance+softRange,Math.min(here,there));
          const into=Math.min(0,d[0]*n[0]+d[1]*n[1]);
          way=[d[0]-w*into*n[0],d[1]-w*into*n[1]];
        }
        speedFactor=Math.min(1,Math.hypot(...way));
      } else if(field?.walkability) {
        // The body field depends on how he faces: judge it at the heading he is walking (or about to walk).
        const facing=Math.atan2((steerDir || d)[1],(steerDir || d)[0])*180/Math.PI;
        const here=field.walkability(...point,facing),there=field.walkability(...ahead,facing);
        const g=field.walkGradient(...ahead,facing),gh=field.walkGradient(...point,facing);
        const gx=g[0]+gh[0],gy=g[1]+gh[1],gl=Math.hypot(gx,gy);
        if(gl>1e-5) {
          const n=[gx/gl,gy/gl],w=smoothstep(.75,.25,(here+there)/2),into=Math.min(0,d[0]*n[0]+d[1]*n[1]);
          way=[d[0]-w*into*n[0],d[1]-w*into*n[1]];
          // A gentle push back only when he is already on poor ground.
          const k=.3*smoothstep(.5,.2,here);push=[k*n[0],k*n[1]];
        }
        speedFactor=Math.min(1,Math.hypot(...way));
      }
      let dir=[way[0]+push[0],way[1]+push[1]];const dl=Math.hypot(...dir);
      if(dl<1e-6)dir=d;else dir=[dir[0]/dl,dir[1]/dl];
      // Two cascaded one-pole filters (0.2 s each): a critically damped ~0.4 s response.
      if(!walking || !steerDir) {steerDir=dir.slice();steerLag=dir.slice();steerPace=speedFactor;}
      else {
        const a=1-Math.exp(-delta/200);
        steerLag=[steerLag[0]+(dir[0]-steerLag[0])*a,steerLag[1]+(dir[1]-steerLag[1])*a];
        steerDir=[steerDir[0]+(steerLag[0]-steerDir[0])*a,steerDir[1]+(steerLag[1]-steerDir[1])*a];
        steerPace+=(speedFactor-steerPace)*a;
      }
      const sl=Math.hypot(...steerDir);
      // Nothing left of the aim along the edge: stop (no walking in place) until the aim moves.
      if(steerPace<.25 || sl<1e-6) {stopGroundJourney(true,'steer-pace');return;}
      let u=[steerDir[0]/sl,steerDir[1]/sl],leg=0,end,blocked=false;
      if(sdfReady()) {
        const sweep=() => sweepGround(point,[point[0]+u[0]*Math.min(rest,40),point[1]+u[1]*Math.min(rest,40)]);
        let result=sweep();
        if(result.blocked && distance(point,result.point)<2) {
          // A filtered direction can still face into the wall. Keep its tangential component at contact.
          const g=field.distanceGradient(...point),gl=Math.hypot(...g);
          if(gl>1e-5) {
            const n=g.map(v => v/gl),into=Math.min(0,u[0]*n[0]+u[1]*n[1]);
            const tangent=[u[0]-into*n[0],u[1]-into*n[1]],tl=Math.hypot(...tangent);
            if(tl>1e-5) {u=tangent.map(v => v/tl);result=sweep();}
          }
        }
        end=result.point.slice();leg=distance(point,end);blocked=result.blocked;
      } else if(field?.walkability) {
        const facing=Math.atan2(u[1],u[0])*180/Math.PI,wall=.3;
        if(field.walkability(...point,facing)<wall) {stopGroundJourney(true,'legacy-blocked');return;}
        for(let s=2;s<=Math.min(rest,40);s+=2) {if(field.walkability(point[0]+u[0]*s,point[1]+u[1]*s,facing)<wall)break;leg=s;}
      }
      if(leg<2) {stopGroundJourney(true,'sweep-no-travel');return;}
      groundHeld=false;
      end??=[point[0]+u[0]*leg,point[1]+u[1]*leg];
      if(!walking) {
        journey={points:[point.slice(),end],steps:[],length:leg,target:aimPoint.slice(),route:'',steer:true};
        segment=1;travelled=0;rebuild();accepted=elapsed;
      } else {
        // Same journey object: the facing logic sees one continuous plan, not a new plan every frame.
        journey.points=[point.slice(),end];segment=1;journey.length=travelled+leg;journey.target=aimPoint.slice();
      }
      journey.groundBlocked=blocked;
    }
    function holdPlanned() {
      groundHeld=true;reviewLastStop={reason:'route-replan-wait',atElapsed:elapsed};
      if(journey) {journey.points=[point.slice(),point.slice()];journey.length=travelled;segment=2;}
    }
    function steerPlanned(delta) {
      if(routeAim!==aimPoint) {navigator.setGoal(point,aimPoint,heading,elapsed);routeAim=aimPoint;}
      const guide=navigator.guide(point,heading,elapsed);
      if(['arrived','projected-arrival','unreachable'].includes(guide.status)) {
        stopGroundJourney(guide.status==='unreachable',guide.status==='arrived' ? 'aim-reached' : 'route-'+guide.status);return;
      }
      if(guide.status!=='following') {holdPlanned();return;}
      const dx=guide.target[0]-point[0],dy=guide.target[1]-point[1],rest=Math.hypot(dx,dy);
      if(rest<1e-6) {navigator.invalidate();holdPlanned();return;}
      const direct=[dx/rest,dy/rest],walking=Boolean(journey && segment<journey.points.length);
      if(!walking || !steerDir) {steerDir=direct.slice();steerLag=direct.slice();}
      else {
        const a=1-Math.exp(-delta/200);
        steerLag=steerLag.map((v,i)=>v+(direct[i]-v)*a);
        steerDir=steerDir.map((v,i)=>v+(steerLag[i]-v)*a);
      }
      const magnitude=Math.hypot(...steerDir),u=magnitude>1e-6 ? steerDir.map(v=>v/magnitude) : direct;
      let end=point.map((v,i)=>v+u[i]*Math.min(rest,32)),result=sweepGround(point,end);
      // A filtered corner can point into the old wall. Use the checked route chord, not a tangent dead end.
      if(result.blocked) {end=guide.target.slice();result=sweepGround(point,end);steerDir=direct.slice();steerLag=direct.slice();}
      if(result.blocked || distance(point,result.point)<1e-6) {navigator.invalidate();holdPlanned();return;}
      end=result.point.slice();const leg=distance(point,end);steerPace=1;groundHeld=false;
      if(!walking) {
        journey={points:[point.slice(),end],steps:[],length:leg,target:guide.goal.slice(),route:'',steer:true};
        segment=1;travelled=0;rebuild();accepted=elapsed;
      } else {
        journey.points=[point.slice(),end];segment=1;journey.length=travelled+leg;journey.target=guide.goal.slice();
      }
      journey.groundBlocked=false;
    }
    function target(value) {
      if(sandbox && walkMode!=='free' && fieldState!=='ready') {
        fieldTarget=value.slice();stopGroundJourney(true,'field-not-ready');return false;
      }
      if(sandbox && walkMode==='steer') {
        if(aimPoint && distance(aimPoint,value)<3)return false;
        const walking=Boolean(journey && segment<journey.points.length);
        if(distance(point,value)<(walking ? 8 : 12))return false;
        aimPoint=value.slice();steer(0);return true;
      }
      if(sandbox) {
        if(distance(point,value)<1 || (journey && distance(journey.target,value)<3))return false;
        let points;
        if(walkMode==='field' && sdfReady() && field.signedDistance(...point)<clearance) {
          const escape=sweepGround(point,value);
          points=distance(point,escape.point)>=2 ? [point.slice(),escape.point.slice()] : null;
        } else points=walkMode==='field' ? field.plan(point,value) : [point.slice(),value.slice()];
        if(!points || points.length<2) {stopGroundJourney(true,'planner-rejected');return false;}
        // Dead zone: a pointer on blocked ground resolves to the nearest open cell, which wobbles by a few pixels.
        // Standing still, he ignores ends within 12 px; walking, he keeps his journey unless the end moves 8 px.
        if(journey ? distance(journey.target,points.at(-1))<8 : distance(point,points.at(-1))<12)return false;
        let length=0;for(let i=1;i<points.length;i++)length+=distance(points[i-1],points[i]);
        journey={points,steps:[],length,target:points.at(-1).slice(),route:''};
        if(walkMode==='field' && sdfReady())journey.groundBlocked=distance(points.at(-1),value)>1e-6;
        groundHeld=false;
        segment=1;travelled=0;rebuild();accepted=elapsed;return true;
      }
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
      guardGroundJourney();
      if(sandbox && walkMode!=='free' && groundHeld) {actualSpeed=0;return;}
      if(spriteSet==='video') { advanceVideo(delta); return; }
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
    function followRoute(budget) {
      let moved=0;
      while(budget>1e-9 && journey && segment<journey.points.length) {
        const next=journey.points[segment],length=distance(point,next);
        if(length<1e-6) {point=next.slice();segment++;continue;}
        const step=Math.min(length,budget),fraction=step/length;
        point=[point[0]+(next[0]-point[0])*fraction,point[1]+(next[1]-point[1])*fraction];
        if(step===length)segment++;
        budget-=step;moved+=step;
      }
      return moved;
    }
    function advanceVideo(delta) {
      actualSpeed=0;
      if(delta>250)return;
      let remaining=delta, moved=0;
      // Turn time grants no distance; only committed graph travel advances gait.
      for(let count=0;count<128;count++) {
        const desired=desiredVideoHeading();
        if(halt && video.state.ready && video.state.mode!=='turn' && video.state.heading===desired) {halt=false;data('halt',false);}
        const moving=Boolean(journey && segment<journey.points.length) && !halt;
        const state=video.advance(0,{heading:desired,moving});
        if(fallbackVideo(state))return;
        if(!state.ready || state.waiting.length || !remaining)break;
        const walking=state.mode==='walk' && state.heading===desired && moving;
        if(!walking && state.mode!=='turn')break;
        const next=journey?.points[segment], length=walking ? distance(point,next) : Infinity;
        // Backpedal is slower (backSpeed, default half); the loop plays at the same reduced rate so feet stay planted.
        // Steering into an edge slows loop and travel together (like backpedal), so he eases to a stop, never slides.
        const pace=(backpedal ? Number(sandboxQuery.get('backSpeed') ?? .5) || .5 : 1)*(journey?.steer ? Math.max(.4,Math.min(1,steerPace)) : 1);
        const turnRemaining=state.mode==='turn' ? Math.max(1e-7,state.remainingMs) : Infinity;
        // Walk-speed turns (window.AtlasTurnWalk, sprite trial): keep travelling along the road while the turn clip
        // plays, gated by the clip's stepping, and play clips faster while much heading is still left.
        // An about-face clip turns in place: no travel while it plays.
        const turnWalk=state.mode==='turn' && moving && !state.clip.startsWith('about') && window.AtlasTurnWalk || null;
        // A halted in-place turn (sandbox) catches up the same way, so a full about-face is not twelve slow seconds.
        const catchUp=state.mode==='turn' && !state.clip.startsWith('about') && (moving || halt) && window.AtlasTurnWalk || null;
        const rate=catchUp ? catchUp.turnRate(angularDistance(state.to,desired)) : 1;
        const step=Math.min(remaining*rate,turnRemaining,length/(speed*pace)*1000);
        if(step<=0)break;
        const result=video.advance(step,{heading:desired,moving});
        if(turnWalk && result.consumedMs>0) {
          const end=Math.min(1000,state.elapsed+result.consumedMs);
          const offset=turnWalk.integrateWalkTurn(state.heading,state.to,state.elapsed,end,speed,turnWalk.gait[state.clip]);
          const along=followRoute(Math.hypot(offset[0],offset[1])/rate);moved+=along;travelled+=along;
        }
        // The loop clock runs at pace; distance follows the loop's stride (walkTravel), so he surges on each step.
        let gaitMs=walking ? result.walkMs*pace : 0,travel=walking ? video.walkTravel(gaitMs,{reverse:backpedal})*speed/1000 : 0,used=step;
        if(travel>length) {gaitMs=video.walkTimeFor(length/speed*1000,{reverse:backpedal});used=step*gaitMs/(result.walkMs*pace);travel=length;}
        if(travel>0) {
          const fraction=Math.min(1,travel/length);
          point=[point[0]+(next[0]-point[0])*fraction,point[1]+(next[1]-point[1])*fraction];
          video.commitWalk(gaitMs,{reverse:backpedal});travelled+=travel;moved+=travel;walkTime+=gaitMs;
          if(length-travel<1e-6) { point=next.slice();segment++; }
        }
        heading=result.heading;remaining=Math.max(0,remaining-(travel>0 ? used : step)/rate);
        if(!remaining || result.mode==='idle')break;
      }
      actualSpeed=delta ? moved/delta*1000 : 0;
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
      if(spriteSet==='video') { videoSprite(); return; }
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
    function videoSprite() {
      const state=video.state;
      if(fallbackVideo(state))return;
      data('spriteSet',spriteSet);data('spriteMode','video');data('direction',state.heading);
      data('frame',state.frame);data('turning',state.mode==='turn');data('speed',actualSpeed);
      data('bob',0);data('blending',false);data('videoClip',state.clip);
      data('sprite',state.ready ? 'ready' : state.error ? 'unavailable' : 'loading');
      if(spriteLayer) {
        spriteLayer.x=point[0]-spriteLayer.anchor[0];spriteLayer.y=point[1]-spriteLayer.anchor[1];
        spriteLayer.footY=point[1];
        // Sandbox field: nearer ground draws him larger; shade and sun at the feet darken or brighten him.
        let size=1,shade=1;
        if(field) {
          const depthRef=Number(sandboxQuery.get('depthRef')) || .36,depthGain=Number(sandboxQuery.get('depthGain') ?? 1);
          size=Math.max(.72,Math.min(1.22,1+(depthRef-field.groundDepth(...point))*depthGain));
          const lightGain=Number(sandboxQuery.get('lightGain') ?? .8);
          fieldLight+=(field.light(...point)-fieldLight)*.12;
          shade=Math.max(.45,Math.min(1.2,1+(fieldLight-1)*lightGain));
          if(field.tone) {
            // Tone of the light (L0 colour at the feet): a multiply tint; its brightest channel moves into the shade.
            const tintGain=Number(sandboxQuery.get('tintGain') ?? .7),sample=field.tone(...point);
            // Keep the tint a plausible light colour: painted red wood (the bridge) must not turn him pink. Green never
            // drops below the red/blue mean (no magenta), and chroma is capped at 15% of luma.
            let t=sample.map(v => 1+(v-1)*tintGain);
            t[1]=Math.max(t[1],(t[0]+t[2])/2-.02);
            const luma=.299*t[0]+.587*t[1]+.114*t[2],chroma=Math.max(...t.map(v => Math.abs(v-luma)))/luma;
            if(chroma>.15)t=t.map(v => luma+(v-luma)*.15/chroma);
            fieldTone=fieldTone.map((v,c) => v+(t[c]-v)*.12);
          }
        }
        const toneMax=Math.max(...fieldTone),tint=fieldTone.map(v => Math.round(255*v/toneMax));
        shade*=toneMax;
        data('fieldSize',size.toFixed(2));data('fieldShade',shade.toFixed(2));data('fieldTint',tint.join(','));
        const key='video:'+state.clip+':'+state.frame+':'+Math.round(size*100)+':'+Math.round(shade*100)+':'+tint.join(',');
        if(state.ready && (spriteDirty || spriteKey!==key)) {
          const context=spriteLayer.canvas.getContext('2d'),scale=spriteLayer.rasterScale || 1;
          context.clearRect(0,0,spriteLayer.canvas.width,spriteLayer.canvas.height);
          context.save();if(scale!==1)context.setTransform(scale,0,0,scale,0,0);
          if(natural && context.ellipse) {
            context.save();context.globalAlpha=.13;context.fillStyle='#20231c';
            context.beginPath();context.ellipse(...spriteLayer.anchor,9*size,1.7*size,0,0,Math.PI*2);context.fill();context.restore();
          }
          if(shade!==1)context.filter=`brightness(${shade.toFixed(2)})`;
          spriteLayer.ready=video.draw(context,spriteLayer.anchor,56*size);context.restore();
          if(tint.some(v => v<255) && typeof document!=='undefined') {
            // Multiply keeps his shading; destination-in with the untinted copy restores his silhouette.
            const w=spriteLayer.canvas.width,h=spriteLayer.canvas.height;
            tintCanvas??=document.createElement('canvas');tintCanvas.width=w;tintCanvas.height=h;
            const copy=tintCanvas.getContext('2d');copy.clearRect(0,0,w,h);copy.drawImage(spriteLayer.canvas,0,0);
            context.save();context.globalCompositeOperation='multiply';context.fillStyle=`rgb(${tint.join(',')})`;context.fillRect(0,0,w,h);
            context.globalCompositeOperation='destination-in';context.drawImage(tintCanvas,0,0);context.restore();
          }
          spriteKey=key;spriteDirty=false;spriteLayer.imageKey=key;spriteLayer.revision++;
        }
      } else video.draw(ctx,point,56);
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
        if(sandbox) {data('groundDistance',sdfReady() ? field.signedDistance(...point) : '');data('groundHeld',groundHeld);}
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
      if(sandbox && walkMode==='steer')steer(delta);
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
    rebuild();
    if(trial && (runtime?.spriteSet ?? new URLSearchParams(window.location?.search || '').get('spriteSet'))==='video')setSpriteSet('video');
    else run();
    return {
      setSpriteSet,
      get ready() { return ready; },
      locationPoint(id) {
        const route=routes.find(r=>r.id===(id==='home' || id==='lake' ? 'home-to-lake' : 'lake-to-'+id));
        const endpoint=id==='home' ? route?.points[0] : route?.points.at(-1);
        if(!endpoint)return null;
        return runtime?.production && sdfReady() && field.signedDistance(...endpoint)<clearance ?
          field.recoverInitialPoint(endpoint) : endpoint.slice();
      },
      get walkMode() { return sandbox ? walkMode : null; },
      get groundFieldStatus() { return sandbox ? {kind:groundField,state:fieldState,error:fieldError,clearance,held:groundHeld} : null; },
      get reviewDiagnostics() { return sandbox ? {steerDir:steerDir?.slice() || null,steerLag:steerLag?.slice() || null,
        steerPace,segment,travelled,journeyLength:journey?.length ?? null,groundBlocked:journey?.groundBlocked || false,
        planner:navigator?.diagnostics || null,
        stopReason:groundHeld ? reviewLastStop?.reason || null : null,
        lastStop:reviewLastStop && {...reviewLastStop}} : null; },
      groundDistanceAt(value) { return sandbox && sdfReady() ? field.signedDistance(...value) : null; },
      // Sandbox test hook: place him on the map (stops any walk and aim).
      placeAt(value) { if(!reviewSandbox)return false;untouchedSpawn=false;point=value.slice();journey=null;pending=null;fieldTarget=null;aimPoint=null;steerDir=null;navigator?.reset();routeAim=null;segment=1;travelled=0;draw();return true; },
      get sandboxPose() { return sandbox ? {point:point.slice(),heading,mode:video?.state?.mode || null,clipHeading:video?.state?.heading ?? null,aim:aimPoint?.slice() || null} : null; },
      setWalkMode(value) { if(sandbox && value!==walkMode && ['steer','field','free'].includes(value)) {walkMode=value;fieldTarget=null;stopGroundJourney(false,'mode-changed');}data('walkMode',walkMode); },
      get spriteSet() { return spriteSet; },
      getState() { return {spriteSet,point:point.slice(),target:(journey?.target || point).slice(),pendingTarget:pending?.slice() || null,
        walkTime,paused,suspended,video:video?.state || null,videoFallback:videoFallback && {...videoFallback}}; },
      get version() { return version; },
      get navigation() { return {edges:graph.edges,junctions:graph.junctions,nodeCount:graph.nodeCount}; },
      get spriteLayer() { return spriteLayer; },
      get familyState() { return family?.state || null; },
      startFamilyPreview() {
        if(!family)return false;
        untouchedSpawn=false;
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
        const endpoint=runtime?.production ? this.locationPoint(id) : id==='home' ? route?.points[0] : route?.points.at(-1);
        if (!endpoint) return false;
        untouchedSpawn=false;
        point=endpoint.slice(); journey=null; pending=null; segment=1; travelled=0;
        if(runtime?.production) {aimPoint=null;fieldTarget=null;steerDir=steerLag=null;navigator?.reset();routeAim=null;groundHeld=false;}
        walkTime=0; accepted=-Infinity; cueUntil=0; delete canvas.dataset.cue;
        video?.reset(heading);videoHeading=Math.round(heading/15)%24*15;
        facingPlan=null;facingCandidate=null;
        if (natural) { velocity=0; actualSpeed=0; transition=null; directionCandidate=null; turnSince=null; spriteDirty=true; }
        seedFamily();
        rebuild(); run();
        return true;
      },
      setTarget(value) {
        if (!Array.isArray(value) || value.length!==2 || !value.every(Number.isFinite)) return;
        const next=value.map((v,i) => Math.max(0,Math.min(1,v))*(i ? geometry.height : geometry.width));
        if (!paused && !sandbox && elapsed-accepted<220) pending=next;
        else { pending=null; target(next); draw(); }
        if (idleTimer) schedule();
      },
      cue(id) { canvas.dataset.cue=id; cueUntil=elapsed+4200; draw(); }
    };
  }};
})();
