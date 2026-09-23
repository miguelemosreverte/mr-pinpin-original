'use strict';
(function(root){
  const order=['loop000','turn000015','loop015','turn015000'];
  const labels=['000 walk','Outbound turn: 000 to 015','015 walk','Return turn: 015 to 000'];
  function sample(elapsed){
    if(!Number.isFinite(elapsed)||elapsed<0)throw Error('Invalid composition clock');
    const time=elapsed%4000,index=Math.floor(time/1000);
    return {clip:order[index],index,frame:Math.floor(time%1000*24/1000),label:labels[index]};
  }
  if(typeof module!=='undefined'){module.exports={sample,order};return;}
  const canvas=document.querySelector('#composition'),ctx=canvas.getContext('2d');
  const button=document.querySelector('#composition-play'),status=document.querySelector('#composition-phase');
  const clips=root.NEIGHBOR_REVIEW.clips,cache=root.NeighborSheets.createSheetCache();
  let elapsed=0,playing=true,visible=false,loaded=false,raf=0,last=null,painted='',draws=0;
  function paint(){
    const s=sample(elapsed),clip=clips[s.clip],image=cache.peek(clip.sheet),key=s.clip+':'+s.frame;
    if(image&&painted!==key){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,...clip.frames[s.frame],0,0,canvas.width,canvas.height);painted=key;draws++;}
    status.textContent=loaded?`${playing?'':'Paused / '}${s.label} / ${s.index+1} of 4`: 'Loading composition';
  }
  function tick(now){raf=0;if(!playing||!visible||document.hidden||!loaded){last=null;return;}elapsed+=last===null?0:Math.min(100,Math.max(0,now-last));last=now;paint();raf=requestAnimationFrame(tick);}
  function reconcile(){if(raf)cancelAnimationFrame(raf);raf=0;last=null;if(playing&&visible&&!document.hidden&&loaded)raf=requestAnimationFrame(tick);paint();}
  function setPlaying(value){playing=value;button.title=button.ariaLabel=playing?'Pause composition':'Play composition';button.innerHTML=`<i data-lucide="${playing?'pause':'play'}" aria-hidden="true"></i>`;root.lucide.createIcons();reconcile();}
  button.onclick=()=>setPlaying(!playing);
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target===canvas){visible=entry.isIntersecting;reconcile();}else if(!entry.isIntersecting)entry.target.pause();}},{threshold:0.01});
  observer.observe(canvas);document.querySelectorAll('video').forEach(video=>observer.observe(video));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(video=>video.pause());reconcile();});
  root.lucide.createIcons();
  Promise.all(order.map(async id=>{const image=await cache.load(clips[id].sheet);if(image.naturalWidth!==clips[id].size[0]||image.naturalHeight!==clips[id].size[1])throw Error('Invalid composition sheet dimensions');}))
    .then(()=>{loaded=true;button.disabled=false;reconcile();}).catch(e=>{status.textContent=e.message;});
  root.compositionReview={setPlaying,get state(){return {elapsed,playing,visible,loaded,rafActive:Boolean(raf),draws,cache:cache.stats,...sample(elapsed)};}};
})(typeof globalThis==='undefined'?this:globalThis);
