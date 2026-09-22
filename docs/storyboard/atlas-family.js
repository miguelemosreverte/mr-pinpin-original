(() => {
  const distance=(a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
  const angle=(a,b) => (Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI+360)%360;
  const difference=(a,b) => Math.abs((a-b+540)%360-180);
  window.AtlasFamily={create({onReady=()=>{}}={}) {
    const params=new URLSearchParams(location.search);
    const originalBaby=params.get('babySprite')==='original';
    const originalPinpin=params.get('pinpinSprite')==='original';
    const production=params.get('familyArt')==='production';
    const ids=['pinpin','mr-pompom','mama'], lags=[0,76,162];
    const members=ids.map((id,i) => ({id,lag:lags[i],point:[0,0],heading:0,
      displayWidth:[56,28,84][i],selected:null,candidate:null,since:0}));
    let history=[],total=0,assets=null,lastPaint=-Infinity,lastKey='',error=null,lastRaster=-1;
    const limit=2048;
    const cache=production ? window.AtlasSpriteCache.create({onReady(){lastKey='';faceLayer?.clear();onReady();}}) : null;
    const faceLayer=production ? window.AtlasFaceLayer.create({resolveImage:src=>cache.peek(src)}) : null;
    const moods=production ? ids.map(seed=>window.AtlasExpressionMotion.create({seed,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches})) : null;
    let faceMetadata={frames:{}};
    const ready=fetch(new URL(production ? 'family-production.json' : 'family-sprites.json',location.href))
      .then(r=>{if(!r.ok)throw Error('Family manifest unavailable');return r.json();})
      .then(async manifest => {
        const result=[],sheets=new Map();
        for(const id of ids) {
          const original=!production && ((id==='mr-pompom' && originalBaby) || (id==='pinpin' && originalPinpin));
          const spec=original ? window.atlasDirections : manifest.characters.find(c=>c.id===id);
          if(!spec)throw Error('Missing family character '+id);
          if(production && !spec.fullCircle)throw Error('Full-direction artwork is still being prepared for '+id);
          const choices=[];
          for(const direction of spec.directions) {
            const src=direction.runtimeSrc || spec.runtimeSrc || direction.src || spec.src;
            if(!production && !sheets.has(src)) {
              const image=new Image();image.src=new URL(src,location.href).href;
              await image.decode();sheets.set(src,image);
            }
            const pose={direction,image:sheets.get(src),src,flip:false,angle:direction.angle};
            choices.push(pose);
            if(!original && !spec.fullCircle)choices.push({...pose,flip:true,angle:(180-direction.angle+360)%360});
          }
          result.push({spec,choices,original});
          if(production && !await cache.load(choices[0].src))throw Error('Could not load walking artwork for '+id);
        }
        if(production) {
          try {const r=await fetch('family-faces.json');if(r.ok)faceMetadata=await r.json();}catch { /* Body remains available without optional facial artwork. */ }
        }
        assets=result;onReady();return true;
      }).catch(e=>{error=String(e.message || e);onReady();return false;});
    function append(point) {
      const previous=history.at(-1),step=previous ? distance(previous.point,point) : 0;
      if(previous && step<1e-8)return;
      total+=step;history.push({point:point.slice(),s:total});
      while(history.length>2 && history[1].s<total-230)history.shift();
      if(history.length>limit)history.splice(0,history.length-limit);
    }
    function seed(points) {
      history=[];total=0;lastKey='';
      points.forEach(append);
      members.forEach(m=>{m.selected=null;m.candidate=null;});
    }
    function at(s) {
      if(!history.length)return {point:[0,0],heading:0};
      for(let i=history.length-1;i>0;i--) {
        const a=history[i-1],b=history[i];
        if(s>=a.s || i===1) {
          const t=Math.max(0,Math.min(1,(s-a.s)/(b.s-a.s || 1)));
          return {point:[a.point[0]+(b.point[0]-a.point[0])*t,a.point[1]+(b.point[1]-a.point[1])*t],
            heading:angle(a.point,b.point)};
        }
      }
      return {point:history[0].point.slice(),heading:0};
    }
    function draw(layer,{point,heading,elapsed,walkTime,moving}) {
      if(!layer?.members)return;
      for(let i=0;i<3;i++) {
        const member=members[i],sample=i ? at(total-member.lag) : {point,heading};
        member.point=sample.point.slice();member.heading=sample.heading;
        const target=layer.members[i];
        target.x=sample.point[0]-64;target.y=sample.point[1]-112;target.footY=sample.point[1];
        target.ready=Boolean(assets);target.anchor=[64,112];
      }
      Object.assign(layer,{x:point[0]-64,y:point[1]-112,footY:point[1],ready:Boolean(assets)});
      const rasterChanged=lastRaster!==(layer.rasterRevision || 0);
      if(!assets || elapsed-lastPaint<50 && lastKey && !rasterChanged)return;
      const poses=members.map((member,i)=>{
        const {choices}=assets[i];
        // Full-circle production sheets use real headings; only old proofs mirror.
        const best=choices.reduce((a,b)=>difference(a.angle,member.heading)<=difference(b.angle,member.heading)?a:b);
        if(production)cache.get(best.src);
        const key=p=>p.direction.angle+':'+p.flip;
        if(!member.selected || !moving && (!production || cache.peek(best.src)))member.selected=production && !cache.peek(best.src) ? choices.find(c=>cache.peek(c.src)) || best : best;
        else if(key(best)!==key(member.selected) && difference(best.angle,member.heading)+4<difference(member.selected.angle,member.heading)) {
          if(member.candidate!==key(best)){member.candidate=key(best);member.since=elapsed;}
          if(elapsed-member.since>=140 && (!production || cache.peek(best.src))){member.selected=best;member.candidate=null;}
        } else member.candidate=null;
        // Shorter legs need shorter strides at the same ground speed.
        const phase=moving ? walkTime/190*(56/member.displayWidth)+i*.8 : 0;
        member.gaitFrame=Math.floor(phase)%4;
        const expression=moods?.[i].evaluateElapsed(elapsed,moving,member.heading);
        member.expression=expression ? {...expression} : null;
        return {...member.selected,expression,frame:member.gaitFrame,lift:moving ? Math.round(.7*Math.sin(Math.PI*phase)**2*8)/8 : 0};
      });
      const pinned=poses.map(p=>p.src);
      if(production)for(const p of poses) {
        const id=p.src+'#'+p.direction.angle+'#'+p.frame;
        const face=faceMetadata.frames?.[id];
        for(const eye of face?.eyes || []) {
          if(eye.blink?.src){pinned.push(eye.blink.src);cache.get(eye.blink.src);}
        }
      }
      cache?.protect(pinned);
      const key=poses.map(p=>[p.direction.angle,p.flip,p.frame,p.lift,
        production && faceMetadata.frames?.[p.src+'#'+p.direction.angle+'#'+p.frame]?.maxTiltDegrees>0
          ? Math.round((p.expression?.headTilt || 0)*4) : '',production && p.expression?.blink>.5].join(',')).join(';');
      lastPaint=elapsed;
      if(key===lastKey && !rasterChanged)return;
      const ctx=layer.canvas.getContext('2d'),r=layer.rasterScale || 1;
      ctx.setTransform(r,0,0,r,0,0);ctx.clearRect(0,0,384,128);
      poses.forEach((pose,i)=>{
        const {spec}=assets[i],frame=pose.direction.frames[pose.frame],image=production ? cache.get(pose.src) : pose.image;
        if(!image)return;
        members[i].renderedHeading=pose.angle;
        members[i].sourceResolution=[image.naturalWidth,image.naturalHeight];
        members[i].faceCapabilities=null;
        members[i].faceDiagnostics=null;
        const scale=members[i].displayWidth/(pose.direction.referenceWidth || spec.referenceWidth);
        ctx.save();ctx.beginPath();ctx.rect(i*128,0,128,128);ctx.clip();ctx.translate(i*128+64,112);
        ctx.fillStyle='rgba(25,31,23,0.16)';ctx.beginPath();
        ctx.ellipse(0,0,members[i].displayWidth*.16,1.8,0,0,Math.PI*2);ctx.fill();
        if(pose.flip)ctx.scale(-1,1);
        const id=pose.src+'#'+pose.direction.angle+'#'+pose.frame;
        if(production && faceMetadata.frames?.[id]) {
          frame.id=id;frame.face=faceMetadata.frames[id];
          const prepared=faceLayer.prepare({image,frame});
          members[i].faceCapabilities={...prepared.capabilities};
          members[i].faceDiagnostics=prepared.diagnostics;
          faceLayer.draw(ctx,prepared,{scale,lift:pose.lift,tiltDegrees:pose.expression?.headTilt || 0,blink:pose.expression?.blink>.5});
        } else ctx.drawImage(image,...frame.rect,-frame.anchor[0]*scale,-frame.anchor[1]*scale-pose.lift,
          frame.rect[2]*scale,frame.rect[3]*scale);
        ctx.restore();
      });
      lastKey=key;lastRaster=layer.rasterRevision || 0;layer.imageKey=key;layer.revision++;
    }
    return {ready,append,seed,draw,get loaded(){return Boolean(assets);},get error(){return error;},get state(){return {ready:Boolean(assets),error,art:production ? 'production-trial' : 'candidate',cache:cache?.stats,faces:faceLayer?.stats,babySprite:originalBaby ? 'original' : 'candidate',pinpinSprite:originalPinpin ? 'original' : 'candidate',
      historyLength:history.length,historyLimit:limit,
      members:members.map(({id,lag,point,heading,displayWidth,gaitFrame,expression,faceCapabilities,faceDiagnostics,renderedHeading,sourceResolution},i)=>({id,lag,point:[...point],heading,renderedHeading,sourceResolution,displayWidth,gaitFrame,expression,faceCapabilities,faceDiagnostics,
        spriteSource:production ? 'family-production' : assets?.[i]?.original ? 'original-pinpin' : 'family-candidate'}))};}};
  }};
})();
