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
  function graphFor(routes) {
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
    return {plan,edges:edges.map(e => ({a:nodes[e.u],b:nodes[e.v],offset:e.offset}))};
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
    canvas.width=geometry.width; canvas.height=geometry.height;
    const pathFor=points => {
      const path=new Path2D(); points.forEach(([x,y],i) => i ? path.lineTo(x,y) : path.moveTo(x,y)); return path;
    };
    const routes=(geometry.routes || []).map(route => {
      const points=route.points.map(([x,y]) => [x*geometry.width,y*geometry.height]);
      return {...route,points};
    });
    const graph=graphFor(routes), initial=routes.find(r => r.from==='home' && r.to==='lake') || routes[0];
    let point=initial?.points[0]?.slice() || [0,0], journey=graph.plan(point,initial?.points.at(-1) || point);
    let trails=[], segment=1, travelled=0, heading=0, elapsed=0, walkTime=0;
    let paused=reduced.matches, hidden=document.hidden, suspended=false, request=0, idleTimer=0, last=null, failed=false;
    let focused=null, regionLayers={}, metadata=null, directions=[], pending=null, accepted=-Infinity, cueUntil=0;
    let version=0, lastTrailPoint=null, fallbackStarted=false, spriteLayer=null;
    let spriteSurface=null, spriteDirty=true, spriteSamples=[], spriteKey=null;
    let spritePhase=-1, spriteHeading=-1, spriteTick=-1, spriteMoving=false;
    const spriteLoaded=() => { spriteDirty=true; draw(); };
    const data=(key,value) => { const text=String(value); if (canvas.dataset[key]!==text) canvas.dataset[key]=text; };
    try { paused=paused || localStorage.getItem(preferenceKey)==='paused'; } catch { /* Use system preference. */ }
    function syncDirections() {
      const next=window.atlasDirections;
      if (next===metadata) return;
      metadata=next;
      spriteDirty=true;
      directions=(metadata?.directions || []).filter(d => Number.isFinite(d.angle) && d.frames?.length)
        .slice().sort((a,b) => a.angle-b.angle);
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
    function advance(delta) {
      let remaining=speed*delta/1000, moved=0;
      while (journey && segment<journey.points.length) {
        const next=journey.points[segment], length=distance(point,next);
        if (length<1e-6) { point=next.slice(); segment++; continue; }
        if (remaining<=0) break;
        heading=(Math.atan2(next[1]-point[1],next[0]-point[0])*180/Math.PI+360)%360;
        const step=Math.min(length,remaining), fraction=step/length;
        point=[point[0]+(next[0]-point[0])*fraction,point[1]+(next[1]-point[1])*fraction];
        remaining-=step; travelled+=step; moved+=step;
        if (step===length) segment++;
      }
      walkTime+=moved/speed*1000;
    }
    function sprite() {
      if (spriteLayer) {
        spriteLayer.x=point[0]-spriteLayer.anchor[0]; spriteLayer.y=point[1]-spriteLayer.anchor[1];
        spriteLayer.footY=point[1];
      }
      const moving=Boolean(journey && segment<journey.points.length);
      const phaseBucket=moving ? Math.floor((walkTime+1e-7)/50) : 0;
      const headingBucket=Math.round(heading/3.75)%96, tickBucket=Math.floor((elapsed+1e-7)/50);
      const unchanged=phaseBucket===spritePhase && headingBucket===spriteHeading;
      if (spriteDirty || moving!==spriteMoving || (!unchanged && tickBucket!==spriteTick)) {
        const angle=headingBucket*3.75, angular=d => Math.abs(((angle-d.angle+540)%360)-180);
        const direction=directions.reduce((best,d) => !best || angular(d)<angular(best) ? d : best,null);
        const directionSrc=direction && (direction.runtimeSrc || direction.src);
        const image=direction && preload(directionSrc);
        if (directionSrc && !image && !images.get(directionSrc)?.failed) { data('sprite','loading'); return; }
        const phase=phaseBucket*50/190, frame=Math.floor(phase), mix=phase-frame, samples=[];
        function add(image,crop,anchor,scale,weight) {
          if (weight<=1e-7 || !crop?.every(Number.isFinite) || crop[2]<=0 || crop[3]<=0) return;
          samples.push({image,crop,anchor:anchor || [crop[2]/2,crop[3]],scale,weight});
        }
        function gait(image,count,weight,specFor) {
          for (let i=0;i<2;i++) {
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
          const headings=gap>0 && gap<=60 && lowerImage && upperImage
            ? [[lower,lowerImage,1-blend],[upper,upperImage,blend]] : [[direction,image,1]];
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
        const key=samples.map(s => [s.image.src,...s.crop,...s.anchor,s.scale,s.weight].join(',')).join(';');
        if (key!==spriteKey) {
          spriteSamples=samples; spriteKey=key;
          if (surface) {
            const context=surface.canvas.getContext('2d');
            context.clearRect(0,0,surface.canvas.width,surface.canvas.height);
            paintSprite(context,surface.anchor);
          }
          if (spriteLayer) { spriteLayer.imageKey=key; spriteLayer.revision++; }
        }
        spritePhase=phaseBucket; spriteHeading=headingBucket; spriteTick=tickBucket; spriteMoving=moving; spriteDirty=false;
        data('sprite','ready'); data('frame',frame%4);
      }
      if (spriteLayer) {
        spriteLayer.ready=Boolean(spriteKey);
      } else if (spriteSurface) ctx.drawImage(spriteSurface.canvas,point[0]-64,point[1]-112);
      else paintSprite(ctx,point);
    }
    function paintSprite(context,anchor) {
      context.save(); context.translate(...anchor);
      // Add weighted premultiplied RGBA on a transparent surface: source-over
      // would reduce opacity in overlapping pixels during the crossfade.
      context.globalCompositeOperation='lighter';
      for (const sample of spriteSamples) {
        const {image,crop,anchor,scale,weight}=sample;
        context.globalAlpha=weight;
        context.drawImage(image,...crop,-anchor[0]*scale,-anchor[1]*scale,crop[2]*scale,crop[3]*scale);
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
    // Renderer-owned, fixed-size sprite surface; other consumers keep the original overlay.
    canvas.atlasSetSpriteLayer=layer => { spriteLayer=layer; spriteDirty=true; spriteKey=null; draw(); };
    rebuild(); run();
    return {
      get version() { return version; },
      get spriteLayer() { return spriteLayer; },
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
