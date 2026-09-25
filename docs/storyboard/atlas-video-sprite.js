(() => {
  'use strict';
  const wrap=n=>(n%360+360)%360, bin=n=>wrap(Math.round(n/15)*15);
  const pad=n=>String(n).padStart(3,'0'), loop=n=>'loop'+pad(n);
  const next=(from,to)=>wrap(from+(wrap(to-from)<=180 ? 15 : -15));
  const turn=(from,to)=>'turn'+pad(from)+pad(to), duration=1000;
  // Optional 180-degree about-face clips (aboutHHHTTT, in place); a missing direction plays its opposite reversed.
  const about=(from,to)=>'about'+pad(from)+pad(to), gap=(a,b)=>Math.min(wrap(b-a),wrap(a-b));
  const release=image=>{ if(image?.close)image.close();else if(image)image.src=''; };
  async function decode(src) {
    const image=new Image();image.src=src;
    try { await image.decode();return image; } catch(error) { release(image);throw error; }
  }
  function validate(data,base) {
    const clips={},g=data.grounding;
    const optional=Object.keys(data.clips||{}).filter(id=>/^about\d{6}$/.test(id) &&
      gap(Number(id.slice(5,8)),Number(id.slice(8)))===180 && Number(id.slice(5,8))%15===0);
    if(!Array.isArray(g?.anchor)||g.anchor.length!==2||!g.anchor.every(Number.isFinite)||
        !Number.isFinite(g.referenceWidth)||g.referenceWidth<=0)throw Error('Missing common grounding');
    for(const id of [...Array.from({length:24},(_,i)=>i*15).flatMap(h=>[loop(h),turn(h,wrap(h+15)),turn(h,wrap(h-15))]),...optional]) {
      const c=data.clips?.[id];
      if(!c||typeof c.sheet!=='string'||!Array.isArray(c.size)||c.size.length!==2||
          !c.size.every(v=>Number.isInteger(v)&&v>0)||!Array.isArray(c.frames)||c.frames.length!==24||
          c.frames.some(r=>!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||
            r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>c.size[0]||r[1]+r[3]>c.size[1]))
        throw Error('Invalid selected sheet: '+id);
      if(c.frames.some(r=>r[2]!==c.frames[0][2]||r[3]!==c.frames[0][3]))throw Error('Variable frame size: '+id);
      clips[id]={...c,sheet:new URL(c.sheet,base).href};
    }
    return {clips,grounding:{anchor:g.anchor.slice(),referenceWidth:g.referenceWidth}};
  }
  function create({manifestUrl,onReady=()=>{},fetchManifest,decodeImage=decode,pace=0}={}) {
    const entries=new Map(),failures=new Map(),maxEntries=8,maxBytes=32*1024*1024;
    let manifest=null,error=null,disposed=false,wanted=new Set(),serial=0,requests=0,loading=0,peakBytes=0;
    let heading=0,target=0,clip=loop(0),mode='idle',elapsed=0,boundary=true,to=null,waiting=[],paused=false;
    let walkElapsed=0,walkCredit=0,reverse=false;
    const base=new URL(manifestUrl,typeof location==='undefined' ? 'http://localhost/' : location.href).href;
    const notify=()=>{ if(!disposed)onReady(); };
    const residentBytes=()=>[...entries.values()].reduce((n,e)=>n+e.bytes,0);
    const readyImage=id=>{ const e=entries.get(id);if(e?.status!=='ready')return null;e.used=++serial;return e.image; };
    function evict(id) { release(entries.get(id)?.image);entries.delete(id); }
    function pump() {
      if(disposed||!manifest)return;
      for(const id of wanted) {
        if(loading>=2)break;
        if(entries.has(id)||(failures.get(id)||0)>=2)continue;
        const c=manifest.clips[id],bytes=c.size[0]*c.size[1]*4;
        if(bytes>maxBytes){failures.set(id,2);continue;}
        while(entries.size>=maxEntries||residentBytes()+bytes>maxBytes) {
          const old=[...entries].filter(([key,e])=>!wanted.has(key)&&e.status==='ready')
            .sort((a,b)=>a[1].used-b[1].used)[0];
          if(!old)break;evict(old[0]);
        }
        if(entries.size>=maxEntries||residentBytes()+bytes>maxBytes)continue;
        const e={status:'loading',bytes,used:++serial,image:null};entries.set(id,e);loading++;requests++;
        peakBytes=Math.max(peakBytes,residentBytes());
        Promise.resolve().then(()=>decodeImage(c.sheet)).then(image=>{
          if(disposed){release(image);return;}
          if((image.naturalWidth||image.width)!==c.size[0]||(image.naturalHeight||image.height)!==c.size[1]) {
            release(image);throw Error('Decoded dimensions differ: '+id);
          }
          e.image=image;e.status='ready';
        }).catch(()=>{entries.delete(id);failures.set(id,(failures.get(id)||0)+1);})
          .finally(()=>{loading--;if(!disposed){request();notify();}});
      }
    }
    function choice(from=heading) {
      let dest=from===target ? null : next(from,target);
      // Reaching an about start on the way (the target may then be up to 45 off its landing) still uses the clip.
      if(from!==target && gap(from,target)>=135 && manifest) {
        const opposite=wrap(from+180);
        if(manifest.clips[about(from,opposite)])return {clip:about(from,opposite),to:opposite,reverse:false};
        if(manifest.clips[about(opposite,from)])return {clip:about(opposite,from),to:opposite,reverse:true};
        // No about clip starts here: step (15s) toward the start whose about-face lands nearest the target.
        const start=Array.from({length:24},(_,i)=>i*15).filter(h=>manifest.clips[about(h,wrap(h+180))]||manifest.clips[about(wrap(h+180),h)])
          .map(h=>({h,cost:gap(from,h)+gap(wrap(h+180),target)})).sort((a,b)=>a.cost-b.cost)[0];
        if(start && gap(from,target)>=150 && start.cost<gap(from,target))dest=next(from,start.h);
      }
      return {clip:dest===null ? loop(from) : turn(from,dest),to:dest};
    }
    function request() {
      if(!manifest||disposed)return;
      const c=choice(mode==='turn'&&!boundary ? to : heading);
      // Two adjacent turns ahead plus the final walk; never a full-ring preload.
      wanted=new Set([clip,c.clip]);
      if(c.to!==null)wanted.add(choice(c.to).clip);
      // Once the current walk is drawable, warm both 15-degree turns so a redirect starts
      // immediately instead of freezing ~170ms on a decode. Still at most 8 resident sheets (~25 MB).
      else if(mode!=='turn'&&readyImage(clip))for(const d of [15,-15])wanted.add(turn(heading,wrap(heading+d)));
      wanted.add(loop(target));
      pump();
    }
    const frame=()=>{const f=Math.min(23,Math.floor(elapsed*24/duration));return mode==='turn'&&reverse ? 23-f : f;};
    function state() {
      const unavailable=waiting.filter(id=>(failures.get(id)||0)>=2);
      return {heading,target,clip,mode,elapsed,frame:frame(),to,reverse:mode==='turn'&&reverse,boundary,paused,clipDurationMs:duration,durationMs:duration,
        remainingMs:Math.max(0,duration-elapsed),walkElapsed,
        waiting:waiting.slice(),waitingReason:unavailable.length ? 'unavailable' : waiting.length ? 'loading' : null,
        ready:Boolean(manifest&&readyImage(clip)),error:error || (unavailable.length ? 'Required sheet unavailable after 2 attempts: '+unavailable.join(', ') : null),
        cache:{entries:entries.size,loading,requests,bytes:residentBytes(),peakBytes,maxEntries,maxBytes,
          resident:[...entries].filter(([,e])=>e.status==='ready').map(([id])=>id),
          failed:[...failures].filter(([,n])=>n>=2).map(([id])=>id)}};
    }
    function reset(value=0) {
      if(!Number.isFinite(value))throw Error('Invalid heading');
      heading=target=bin(value);clip=loop(heading);mode='idle';elapsed=0;boundary=true;to=null;waiting=[];reverse=false;
      walkElapsed=walkCredit=0;
      request();return state();
    }
    function advance(delta,{heading:desired=target,moving=false,paused:stop=false}={}) {
      if(!Number.isFinite(delta)||delta<0||!Number.isFinite(desired))throw Error('Invalid clock or heading');
      target=bin(desired);paused=Boolean(stop);walkCredit=0;
      let walkMs=0,consumedMs=0;const walkHeading=heading;
      request();
      // Caller supplies RAF deltas; a background/stall gap is discarded, never replayed.
      if(disposed||!manifest||paused||delta>250)return {...state(),walkMs,distanceFraction:0,walkHeading,consumedMs};
      if(boundary) {
        const c=choice(),needs=[c.clip];
        waiting=needs.filter(id=>!readyImage(id));
        if(waiting.length)return {...state(),walkMs,distanceFraction:0,walkHeading,consumedMs};
        clip=c.clip;to=c.to;reverse=Boolean(c.reverse);mode=to!==null ? 'turn' : moving ? 'walk' : 'idle';
        if(to!==null) {elapsed=0;boundary=false;}
        else {elapsed=walkElapsed;boundary=true;}
      }
      waiting=[];
      if(mode==='turn') {
        const step=Math.min(delta,duration-elapsed);elapsed+=step;consumedMs=step;
        // Fractional RAF sums must commit before callers discard a sub-epsilon remainder.
        if(duration-elapsed<=1e-6) {
          elapsed=duration;heading=to;boundary=true;to=null;walkElapsed=0;
        }
      } else if(mode==='walk'&&moving&&target===heading) {walkMs=delta;walkCredit=delta;consumedMs=delta;}
      request();
      // Any remainder at a boundary is intentionally not charged to a new clip.
      return {...state(),walkMs,distanceFraction:delta ? walkMs/delta : 0,walkHeading,consumedMs};
    }
    // Walk pacing: a loop with manifest pace {cycles,phase} strides like an inverted pendulum, fastest where the body is
    // lowest: speed x (1 + pace*cos). The mean over the loop stays 1. Returns nominal-speed ms travelled when the loop
    // clock runs ms from now (backwards when reverse).
    function paceStride(){const p=manifest?.clips[clip]?.pace;return mode==='walk'&&pace>0&&p ? {w:2*Math.PI*p.cycles/duration,phase:p.phase} : null;}
    function walkTravel(ms,{reverse=false}={}) {
      const p=paceStride();if(!p||!(ms>0))return ms;
      const D=t=>t+pace/p.w*Math.sin(p.w*t+p.phase);
      return reverse ? D(walkElapsed)-D(walkElapsed-ms) : D(walkElapsed+ms)-D(walkElapsed);
    }
    // Inverse of walkTravel: loop-clock ms needed to travel the given nominal ms (monotonic, so bisection).
    function walkTimeFor(travel,{reverse=false}={}) {
      if(!paceStride()||!(travel>0))return travel;
      let lo=0,hi=travel/(1-Math.min(.95,pace));
      for(let i=0;i<40;i++){const m=(lo+hi)/2;if(walkTravel(m,{reverse})<travel)lo=m;else hi=m;}
      return lo;
    }
    function commitWalk(actualMs,{reverse=false}={}) {
      if(!Number.isFinite(actualMs)||actualMs<0||actualMs>walkCredit+1e-6)throw Error('Walk commit exceeds movement allowance');
      const used=Math.min(actualMs,walkCredit);walkCredit-=used;
      if(!disposed&&!paused&&mode==='walk'&&heading===target&&used>0) {
        // Reverse plays the loop backwards: a backwards walk (the sandbox's backpedal).
        walkElapsed=((walkElapsed+(reverse ? -used : used))%duration+duration)%duration;
        if(duration-walkElapsed<=1e-6)walkElapsed=0;
        elapsed=walkElapsed;
      }
      return state();
    }
    function draw(ctx,anchor,bodyWidth=56) {
      if(disposed||!manifest)return false;
      const image=readyImage(clip);if(!image)return false;
      const rect=manifest.clips[clip].frames[frame()],g=manifest.grounding,scale=bodyWidth/g.referenceWidth;
      ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      ctx.drawImage(image,...rect,anchor[0]-g.anchor[0]*scale,anchor[1]-g.anchor[1]*scale,rect[2]*scale,rect[3]*scale);
      ctx.restore();return true;
    }
    const ready=(async()=>{
      for(let attempt=0;attempt<2&&!disposed;attempt++)try {
        const data=fetchManifest ? await fetchManifest(base) : await fetch(base).then(r=>{if(!r.ok)throw Error('Manifest HTTP '+r.status);return r.json();});
        if(disposed)return false;manifest=validate(data,base);request();notify();return true;
      } catch(e) {error=e.message;}
      notify();return false;
    })().then(result=>{if(result)error=null;return result;});
    return {ready,reset,advance,commitWalk,walkTravel,walkTimeFor,draw,get state(){return state();},
      dispose(){disposed=true;for(const id of entries.keys())evict(id);wanted.clear();}};
  }
  const api={create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.AtlasVideoSprite=api;
})();
