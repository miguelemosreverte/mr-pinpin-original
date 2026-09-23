'use strict';
(() => {
  const {clips}=window.NEIGHBOR_REVIEW, scheduler=window.NeighborScheduler;
  const cache=window.NeighborSheets.createSheetCache();
  const canvas=document.querySelector('#sprite'), ctx=canvas.getContext('2d');
  const play=document.querySelector('#play'), status=document.querySelector('#status');
  const timing=document.querySelector('#timing'), error=document.querySelector('#error');
  let state=scheduler.create(clips), playing=false, visible=false, raf=0,lastTick=null,lastPaint='',draws=0;
  const history=[];
  const ready=id=>Boolean(cache.peek(clips[id].sheet));
  async function loadClip(id) {
    const clip=clips[id],image=await cache.load(clip.sheet);
    if(image.naturalWidth!==clip.size[0]||image.naturalHeight!==clip.size[1])throw Error('Unexpected sheet dimensions: '+id);
    return image;
  }
  function frameIndex(){const clip=clips[state.clip];return Math.min(clip.frames.length-1,Math.floor(state.elapsedMs/clip.durationMs*clip.frames.length));}
  function paint() {
    const frame=frameIndex(),image=cache.peek(clips[state.clip].sheet),key=state.clip+':'+frame;
    if(image&&key!==lastPaint){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,...clips[state.clip].frames[frame],0,0,canvas.width,canvas.height);lastPaint=key;draws++;}
    const phase=state.mode==='turn'?`Turn ${state.from} to ${state.to}`:`Loop ${state.heading}`;
    const queue=state.pending?` / queued ${state.pending}${ready('turn'+(state.to||state.heading)+state.pending)&&ready('loop'+state.pending)?' / next loop boundary':' / loading'}`:'';
    status.textContent=(playing?(visible&&!document.hidden?'':'Suspended / '):'Paused / ')+phase+queue;
    timing.textContent=`Frame ${frame+1}/${clips[state.clip].frames.length}. Last wait: ${state.lastWaitMs===null?'not yet':(state.lastWaitMs/1000).toFixed(3)+' s'}. Turn wall time: ${state.lastTurnWallMs===null?'not yet':(state.lastTurnWallMs/1000).toFixed(3)+' s'}.`;
    document.querySelectorAll('[data-heading]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.heading===(state.pending||state.to||state.heading))));
  }
  function tick(now) {
    raf=0;if(!playing||!visible||document.hidden){lastTick=null;return;}
    const delta=lastTick===null?0:Math.min(100,Math.max(0,now-lastTick));lastTick=now;
    state=scheduler.advance(state,delta,now,clips,ready);
    history.push(...state.events);if(history.length>32)history.splice(0,history.length-32);
    paint();raf=requestAnimationFrame(tick);
  }
  function reconcile(){if(raf)cancelAnimationFrame(raf);raf=0;lastTick=null;if(playing&&visible&&!document.hidden)raf=requestAnimationFrame(tick);paint();}
  function setPlaying(value){playing=value;play.title=play.ariaLabel=playing?'Pause':'Play';play.innerHTML=`<i data-lucide="${playing?'pause':'play'}" aria-hidden="true"></i>`;window.lucide.createIcons();reconcile();}
  function requestHeading(heading){
    state=scheduler.request(state,heading,performance.now());paint();
    if(!state.pending)return Promise.resolve();
    const from=state.to||state.heading;
    error.textContent='';
    return Promise.all([loadClip('turn'+from+state.pending),loadClip('loop'+state.pending)])
      .then(()=>{paint();}).catch(e=>{error.textContent=e.message;paint();});
  }
  play.onclick=()=>setPlaying(!playing);
  document.querySelectorAll('[data-heading]').forEach(button=>button.onclick=()=>requestHeading(button.dataset.heading));
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target===canvas){visible=entry.isIntersecting;reconcile();}else if(!entry.isIntersecting)entry.target.pause();}},{threshold:0.01});
  observer.observe(canvas);document.querySelectorAll('video').forEach(video=>observer.observe(video));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(v=>v.pause());reconcile();});
  window.lucide.createIcons();
  loadClip('loop000').then(()=>{play.disabled=false;paint();}).catch(e=>{error.textContent=e.message;});
  window.neighborReview=Object.freeze({requestHeading,setPlaying,get state(){return {...state,playing,visible,frame:frameIndex(),draws,cache:cache.stats,history:[...history],rafActive:Boolean(raf)};}});
})();
