'use strict';
(function(root) {
  const headings=['000','015'];
  const loop=h=>'loop'+h, turn=(a,b)=>'turn'+a+b;
  function create(clips) {
    for(const id of ['loop000','loop015','turn000015','turn015000']) {
      if(!Number.isFinite(clips[id]?.durationMs)||clips[id].durationMs<=0)throw Error('Invalid clip duration');
    }
    return {mode:'loop',heading:'000',from:null,to:null,clip:loop('000'),elapsedMs:0,
      pending:null,requestedAt:null,turnStartedAt:null,lastWaitMs:null,lastTurnWallMs:null,events:[]};
  }
  function request(state,heading,wallMs) {
    if(!headings.includes(heading)||!Number.isFinite(wallMs))throw Error('Invalid heading request');
    const destination=state.mode==='turn'?state.to:state.heading;
    if(heading===destination)return {...state,pending:null,requestedAt:null};
    if(heading===state.pending)return state;
    return {...state,pending:heading,requestedAt:wallMs};
  }
  function advance(state,deltaMs,wallMs,clips,ready) {
    if(!Number.isFinite(deltaMs)||deltaMs<0||!Number.isFinite(wallMs))throw Error('Invalid clock');
    const next={...state,events:[]};let remaining=deltaMs;
    // A completed turn is also a dispatch boundary; never interrupt a turn midway.
    while(remaining>0) {
      const duration=clips[next.clip].durationMs, step=Math.min(remaining,duration-next.elapsedMs);
      next.elapsedMs+=step;remaining-=step;
      if(next.elapsedMs+1e-7<duration)break;
      const at=wallMs-remaining;
      next.elapsedMs=0;
      if(next.mode==='turn') {
        next.heading=next.to;next.from=null;next.to=null;next.mode='loop';next.clip=loop(next.heading);
        next.lastTurnWallMs=at-next.turnStartedAt;next.turnStartedAt=null;
        next.events.push({type:'turn-end',at,heading:next.heading});
        if(next.pending===next.heading){next.pending=null;next.requestedAt=null;}
      }
      if(next.pending&&next.pending!==next.heading) {
        const clip=turn(next.heading,next.pending);
        if(ready(clip)&&ready(loop(next.pending))) {
          next.from=next.heading;next.to=next.pending;next.mode='turn';next.clip=clip;
          next.lastWaitMs=Math.max(0,at-next.requestedAt);next.turnStartedAt=at;
          next.pending=null;next.requestedAt=null;
          next.events.push({type:'turn-start',at,from:next.from,to:next.to,waitMs:next.lastWaitMs});
        }
      }
    }
    return next;
  }
  const api={create,request,advance};
  if(typeof module!=='undefined')module.exports=api;else root.NeighborScheduler=api;
})(typeof globalThis==='undefined'?this:globalThis);
