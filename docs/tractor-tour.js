import {tourImageCache,tourIdlePrefetch} from './tractor-tour-cache.js?v=tour-perf-v1';
import {orbitVideoRenderer} from './tractor-tour-video.js?v=tour-perf-v1';
import {tractorPanoramaAnchor} from './tractor-panorama-anchor.js?v=tour-perf-v1';
import {panoramaRenderer} from './home-panorama-gl.js?v=bath-rug-detail-v1';
import {clamp,wrap,RAD} from './home-panorama-math.js';
import {tourGestures} from './tractor-tour-gestures.js?v=tour-inverted-v1';
import {FRAME_MANIFEST,PACK,PANORAMAS,RESTORATIONS,ORBIT} from './tractor-tour.config.js?v=tour-source-lock-v5';
import {bridgePlayer} from './tractor-tour-bridge.js?v=tour-source-lock-v5';
import {reviewedStops} from './tractor-tour-stops.js?v=tour-source-lock-v5';
const manifest=await fetch(FRAME_MANIFEST).then(r=>{if(!r.ok)throw Error('Frame manifest unavailable');return r.json();});
const STOPS=await reviewedStops(manifest.stops,PACK,PANORAMAS,RESTORATIONS);
const sourceLock=new URLSearchParams(location.search).get('sourceLock')==='1';
const $=id=>document.getElementById(id),stage=$('stage'),video=$('video'),canvas=$('panorama-canvas'),slider=$('progress');
const flatOrbit=sourceLock?orbitVideoRenderer($('orbit-canvas')):null;stage.dataset.sourceLock=String(sourceLock);
function drawOrbit(){if(mode==='orbit'||mode==='snapping')flatOrbit?.draw(video,stage.clientWidth,stage.clientHeight,displayedFrame??video.currentTime);}
const available=STOPS.filter(s=>s.ready&&(!sourceLock||s.sourceLockReady)),images=tourImageCache();
let mode='orbit',ready=false,epoch=0,renderer=null,renderedStop=null,active=null,desired=null,seekFrame=0,draws=0,snap=null;
let displayedMediaTime=null,displayedFrame=null,drawFrame=0,lastInteractionAt=0;
if(video.requestVideoFrameCallback){const observeFrame=(_,metadata)=>{displayedMediaTime=metadata.mediaTime;displayedFrame=metadata.presentedFrames;drawOrbit();video.requestVideoFrameCallback(observeFrame);};video.requestVideoFrameCallback(observeFrame);}
let camera={yaw:0,pitch:0,fov:75,width:1,height:1};
let queuedLook={yaw:0,pitch:0,zoom:0},entryFrame=0,entryPending=false,orbitWarmTimer=0,deferredLook=null;
function discardLookInput(){queuedLook={yaw:0,pitch:0,zoom:0};}
function resetLookInput(){discardLookInput();if(entryFrame)cancelAnimationFrame(entryFrame);entryFrame=0;entryPending=false;}
const bridge=bridgePlayer($('bridge-video'));let pendingOrbit=null,exitPromise=null;
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
video.loop=true;
const progress=()=>ready?(desired===null?video.currentTime:desired)/video.duration:0;
const image=(src)=>images.load(src);
const roomyCache=(navigator.deviceMemory??4)>4&&!matchMedia('(pointer:coarse)').matches;
const panoramaCacheOptions={maxPanoramas:roomyCache?5:3,maxBytes:(roomyCache?160:96)*1024*1024};
let warmStopIds=[];
const sourceAnchor=stop=>({...stop.face,aspect:16/9,featherStart:.94});
function installPanorama(stop,base,speculative=false){
 if(!renderer){renderer=tractorPanoramaAnchor(canvas,base,null,sourceAnchor(stop),{...panoramaCacheOptions,key:stop.id});renderedStop=stop.id;}
 else renderer.cachePanorama(stop.id,base,speculative);
 renderer.setWarmPanoramas(warmStopIds);
}
const prefetch=tourIdlePrefetch({
 quiet:()=>sourceLock&&ready&&video.paused&&!video.seeking&&desired===null&&['orbit','look'].includes(mode)&&performance.now()-lastInteractionAt>200&&gestures.state.pointers===0,
 has:stop=>renderer?.hasPanorama(stop.id),load:stop=>images.load(stop.asset,false),upload:(stop,base)=>installPanorama(stop,base,true)
});
function warmNearby(stop=nearest(progress())){if(!sourceLock||!stop)return;const i=available.indexOf(stop),next=available[(i+1)%available.length],previous=available[(i+available.length-1)%available.length];warmStopIds=[next.id,previous.id];renderer?.setWarmPanoramas(warmStopIds);prefetch.schedule([stop,next,previous]);}
function queueOrbitWarm(){if(orbitWarmTimer)return;orbitWarmTimer=setTimeout(()=>{orbitWarmTimer=0;if(mode!=='orbit')return;if(video.seeking||desired!==null||performance.now()-lastInteractionAt<220){queueOrbitWarm();return;}warmNearby();},240);}
function status(text){$('status').textContent=text;}
function labels(){stage.dataset.mode=mode;$('active').textContent=mode==='orbit'?'Orbit · scroll or move two fingers':`${({snapping:'Moving to','bridge-in':'Entering',recentering:'Facing tractor','bridge-out':'Returning to orbit',look:'Looking around'})[mode]||mode} · ${active.label} · video ${active.time.toFixed(1)} s`;$('percentage').value=Math.round(progress()*100)+'%';slider.value=progress()*100;$('time').textContent=ready?`${video.currentTime.toFixed(1)} / ${video.duration.toFixed(1)} s`:'';}
function draw(){drawOrbit();camera.width=stage.clientWidth;camera.height=stage.clientHeight;if(['look','recentering'].includes(mode)&&renderer){renderer.draw(camera);draws++;}}
function requestDraw(){if(!drawFrame)drawFrame=requestAnimationFrame(()=>{drawFrame=0;draw();});}
new ResizeObserver(requestDraw).observe(stage);
function pump(){seekFrame=0;if(!ready||desired===null||video.seeking)return;const t=desired;desired=null;if(Math.abs(video.currentTime-t)>.001)video.currentTime=t;else labels();}
function seek(p){if(!ready)return;lastInteractionAt=performance.now();video.pause();desired=Math.min(((p%1)+1)%1*video.duration,video.duration-.001);if(!seekFrame)seekFrame=requestAnimationFrame(pump);if(mode==='orbit')queueOrbitWarm();labels();}
video.addEventListener('seeked',()=>{if(desired!==null&&!seekFrame)seekFrame=requestAnimationFrame(pump);else labels();});
video.addEventListener('loadeddata',drawOrbit);video.addEventListener('timeupdate',()=>{labels();if(!video.requestVideoFrameCallback)drawOrbit();});video.addEventListener('play',()=>{$('play').textContent='Pause orbit';});video.addEventListener('pause',()=>{$('play').textContent='Play orbit';});
function finishOrbit(p=null){epoch++;prefetch.cancel();bridge.cancel();mode='orbit';resetLookInput();snap=null;video.pause();if(p!==null)seek(p);drawOrbit();labels();queueOrbitWarm();status('Two-finger scroll or two fingers on the image orbit the tractor. Move the pointer or one finger to look around; keep moving through the transition.');}
function orbit(p=null){deferredLook=null;resetLookInput();if(mode==='orbit'){if(p!==null)seek(p);else video.pause();return Promise.resolve();}if(['recentering','bridge-out'].includes(mode)){if(p!==null)pendingOrbit=p;return exitPromise;}if(['look','bridge-in'].includes(mode)&&(sourceLock||active?.bridge)&&!reduced()){pendingOrbit=p;exitPromise=leaveLook();return exitPromise;}finishOrbit(p);return Promise.resolve();}
async function centerCamera(own){const start={...camera},target=active.face,dy=wrap(target.yaw-start.yaw),dp=target.pitch-start.pitch,df=target.fov-start.fov;if(Math.abs(dy)<1e-10&&Math.abs(dp)<1e-10&&Math.abs(df)<1e-10){Object.assign(camera,target);return;}const begin=performance.now(),duration=reduced()?0:clamp(Math.max(Math.abs(dy),Math.abs(dp))*240,180,600);mode='recentering';labels();await new Promise(resolve=>{function tick(now){if(own!==epoch)return resolve();const t=duration?Math.min(1,(now-begin)/duration):1,e=t*t*(3-2*t);camera.yaw=wrap(start.yaw+dy*e);camera.pitch=start.pitch+dp*e;camera.fov=start.fov+df*e;draw();if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});if(own===epoch){Object.assign(camera,target);draw();}}
async function leaveLook(){const wasEntering=mode==='bridge-in',reverseFrom=wasEntering?Math.max(0,bridge.duration-bridge.time):0,own=++epoch;bridge.cancel();if(wasEntering){mode='bridge-out';labels();}try{if(!wasEntering)await centerCamera(own);if(own!==epoch)return;if(!sourceLock)await bridge.play(active.bridge.out,{from:reverseFrom,valid:()=>own===epoch,onReady:()=>{mode='bridge-out';labels();status('Returning through the same transition. Your orbit drag resumes next.');}});if(own!==epoch)return;const target=pendingOrbit;pendingOrbit=null;finishOrbit(active.time/video.duration);await new Promise(r=>requestAnimationFrame(r));if(target!==null&&mode==='orbit')seek(target);}catch{if(own!==epoch)return;const target=pendingOrbit;pendingOrbit=null;finishOrbit(target??active.time/video.duration);status('Transition unavailable. Returned to the orbit viewpoint.');}finally{exitPromise=null;}}
function nearest(p){return available.reduce((best,s)=>{const distance=Math.abs((((s.time/video.duration-p)+.5)%1+1)%1-.5);return !best||distance<best.distance?{stop:s,distance}:best;},null)?.stop;}
async function snapTo(stop,own,from){const target=stop.time/video.duration,delta=(((target-from+.5)%1)+1)%1-.5;const start=performance.now(),duration=reduced()||Math.abs(delta)<1e-10?0:clamp(Math.abs(delta)*2400,220,1200);snap={from,target,delta,duration};if(duration===0){await settleStopFrame(stop,own);return;}await new Promise(resolve=>{function tick(now){if(own!==epoch)return resolve();const t=duration?Math.min(1,(now-start)/duration):1,e=t*t*(3-2*t);seek(from+delta*e);if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});if(own!==epoch)return;await settleStopFrame(stop,own);}
async function settleStopFrame(stop,own){
  // Animation seeks may land just before a frame boundary. Bypass the drag
  // pump's 1ms deadband and cancel its queued seek before committing the stop.
  if(seekFrame)cancelAnimationFrame(seekFrame);seekFrame=0;desired=null;
  await new Promise((resolve,reject)=>{const end=performance.now()+2500;let committed=false;
    function check(){
      if(own!==epoch)return resolve();
      if(!committed&&!video.seeking){video.currentTime=stop.time;committed=true;}
      if(committed&&!video.seeking&&desired===null&&Math.abs(video.currentTime-stop.time)<1e-5&&(!video.requestVideoFrameCallback||(displayedMediaTime!==null&&Math.abs(displayedMediaTime-stop.time)<1e-5)))return resolve();
      if(performance.now()>end)return reject(Error('Exact video stop frame did not settle'));
      requestAnimationFrame(check);
    }check();
  });
}
async function loadRenderer(stop,own){
 if(renderedStop===stop.id&&renderer)return;
 if(sourceLock){
  if(!renderer?.hasPanorama(stop.id)){const base=await images.load(stop.asset,false);if(own!==epoch)return;installPanorama(stop,base);}
  if(own!==epoch)return;
  renderer.setPanorama(stop.id,null,sourceAnchor(stop));renderedStop=stop.id;return;
 }
 const [base,detail,...repairs]=await Promise.all([image(stop.asset),stop.details?image(stop.details.asset):null,...Object.values(stop.repairs?.assets||{}).map(image)]);
 if(own!==epoch)return;renderer?.destroy();renderer=panoramaRenderer(canvas,base,Object.fromEntries(Object.keys(stop.repairs?.assets||{}).map((k,i)=>[k,repairs[i]])),stop,detail);renderedStop=stop.id;
}
async function look(from=null,forced=null){
  if(!ready||!available.length){status('The look-around panorama is not available yet.');return;}
  if(['recentering','bridge-out'].includes(mode)){
    const request=deferredLook??={from:pendingOrbit??from,forced,delta:{yaw:0,pitch:0,zoom:0}};
    await exitPromise;if(deferredLook!==request||mode!=='orbit')return;deferredLook=null;
    const entering=look(request.from,request.forced);head(request.delta.yaw,request.delta.pitch,request.delta.zoom);return entering;
  }
  if(mode!=='orbit')return;
  const origin=from===null?progress():from,stop=forced||nearest(origin),own=++epoch;
  resetLookInput();prefetch.cancel();video.pause();active=stop;camera={...stop.face,width:stage.clientWidth,height:stage.clientHeight};mode='snapping';$('stop').value=stop.id;labels();status('Moving to the nearest viewpoint. Keep moving the pointer or one finger; your movement continues after the tractor-facing frame.');
  try{await Promise.all([snapTo(stop,own,origin),loadRenderer(stop,own)]);if(own!==epoch)return;if(sourceLock)renderer.setSource(video);if(!sourceLock&&stop.bridge&&!reduced()){await bridge.play(stop.bridge.in,{valid:()=>own===epoch,onReady:()=>{mode='bridge-in';labels();status('Entering the panorama through its generated camera transition.');}});if(own!==epoch)return;}mode='look';entryPending=true;warmNearby(stop);draw();labels();status('Move the pointer or one finger to look around. Two-finger scroll or two-finger movement orbits the tractor; pinch zooms.');
    // Commit the exact source-facing draw before applying transition input.
    // Two RAF boundaries guarantee a paint even if entry resolves before RAF.
    entryFrame=requestAnimationFrame(()=>{entryFrame=requestAnimationFrame(()=>{entryFrame=0;if(own!==epoch||mode!=='look')return;entryPending=false;const delta=queuedLook;discardLookInput();let remaining=3;function flush(){if(own!==epoch||mode!=='look')return;head(delta.yaw/3,delta.pitch/3,delta.zoom/3);if(--remaining)entryFrame=requestAnimationFrame(flush);else entryFrame=0;}flush();});});}catch{if(own!==epoch)return;orbit();status('The panorama could not load. Orbit remains available.');}
}
function head(yaw,pitch,zoom=0){
 if(!['look','snapping','bridge-in'].includes(mode)&&!deferredLook)return;
 lastInteractionAt=performance.now();yaw=Number.isFinite(yaw)?yaw:0;pitch=Number.isFinite(pitch)?pitch:0;zoom=Number.isFinite(zoom)?zoom:0;
 if(mode!=='look'||entryPending){const target=deferredLook?.delta??queuedLook;target.yaw=clamp(target.yaw+yaw,-.6,.6);target.pitch=clamp(target.pitch+pitch,-.4,.4);target.zoom=clamp(target.zoom+zoom,-120,120);return;}
 if(!yaw&&!pitch&&!zoom)return;camera.yaw=wrap(camera.yaw+yaw);camera.pitch=clamp(camera.pitch+pitch,-89*RAD,89*RAD);camera.fov=clamp(camera.fov*Math.exp(zoom*.0025),25,110);requestDraw();
}
function wheelInput(dx,dy,ctrl){if(!dx&&!dy)return;if(ctrl){look();head(0,0,dy);return;}const delta=Math.abs(dx)>=Math.abs(dy)?dx:dy;orbit((pendingOrbit??progress())+delta/stage.clientWidth);}
const gestures=tourGestures(stage,{progress,orbit,isLooking:()=>mode==='look',startLook:look,cancelInput:()=>{deferredLook=null;resetLookInput();},drag:(dx,dy)=>head(-dx/stage.clientHeight*camera.fov*RAD,dy/stage.clientHeight*camera.fov*RAD),wheelInput,zoom:delta=>head(0,0,delta)});
$('look').addEventListener('click',()=>look());$('orbit').addEventListener('click',()=>orbit());$('face').addEventListener('click',()=>{if(mode==='orbit')look();else if(active){deferredLook=null;resetLookInput();camera={...active.face,width:stage.clientWidth,height:stage.clientHeight};draw();}});
slider.addEventListener('input',()=>{const p=Number(slider.value)/100;orbit(p===1?(video.duration-.001)/video.duration:p);});
$('stop').addEventListener('change',async()=>{const next=available.find(s=>s.id===$('stop').value);await orbit();look(null,next);});
$('play').addEventListener('click',async()=>{if(!ready)return;if(!video.paused){video.pause();return;}await orbit();try{await video.play();}catch{status('Playback unavailable; drag to choose a view.');}});
stage.addEventListener('keydown',e=>{if(!ready)return;if(e.key==='Escape'){e.preventDefault();orbit();}else if(e.key.toLowerCase()==='l'){e.preventDefault();look();}else if(e.code==='Space'){e.preventDefault();$('play').click();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(mode==='orbit')orbit(progress()+(e.key==='ArrowLeft'?-.01:e.key==='ArrowRight'?.01:0));else head((e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)*8*RAD,(e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0)*8*RAD);}else if(e.key==='Home'){e.preventDefault();mode==='orbit'?orbit(0):$('face').click();}else if(e.key==='End'&&mode==='orbit'){e.preventDefault();orbit((video.duration-.001)/video.duration);}});
function evidenceImage(src,label){const f=document.createElement('figure');if(src){const a=document.createElement('a');a.href=src;a.target='_blank';a.rel='noopener';const img=new Image();img.loading='lazy';img.decoding='async';img.src=src;img.alt=label;a.append(img);f.append(a);}const caption=document.createElement('figcaption');caption.textContent=label+(src?'':' · pending');f.append(caption);return f;}
for(const stop of STOPS){const enabled=stop.ready&&(!sourceLock||stop.sourceLockReady);const o=new Option(`${stop.label}${sourceLock&&stop.sourceLockStatus==='experimental'?' · experimental join':''} · ${stop.time.toFixed(2)}s${enabled?'':' (pending)'}`,stop.id);o.disabled=!enabled;$('stop').append(o);const section=document.createElement('section');section.className='stop-evidence';const title=document.createElement('h3');title.textContent=`${stop.label} · video ${stop.time.toFixed(2)} s`;const row=document.createElement('div');row.className='gallery';row.append(evidenceImage(stop.frame,'Raw video frame'),evidenceImage(stop.restoration?.asset,'Restored frame'),evidenceImage(stop.forward||stop.asset,'Panorama / forward proof'));section.append(title,row);const nav=document.createElement('nav');for(const [label,href] of [['Restoration prompt',stop.restoration?.prompt],['Panorama prompt',stop.prompt],['Generation record',stop.record],['Cubemap',sourceLock?stop.anchoredCube:stop.cube],['Bridge record',stop.bridge?.record]]){if(href){const a=document.createElement('a');a.href=href;a.textContent=label;a.target='_blank';a.rel='noopener';nav.append(a);}}section.append(nav);$('evidence').append(section);}
if(sourceLock){$('trial-label').textContent='Source-frame projection trial';$('scope').textContent='Experimental source-frame projection: the paused browser video frame is registered to viewing rays at each completed stop. Entry keeps the source tractor geometry; turning away reveals the generated surroundings. The scenery join can remain visible near the source boundary. Generated bridge clips are bypassed in this mode. Exit first faces the tractor, then resumes orbit. These are inferred viewpoints, not measured camera positions.';}
$('availability').textContent=`${available.length} of ${STOPS.length} panoramas available · ${sourceLock?'source-frame projection, bridges bypassed':available.filter(s=>s.bridge).length+' generated transition pairs ready' }.`;
video.addEventListener('loadedmetadata',()=>{ready=Number.isFinite(video.duration)&&video.duration>0;for(const id of['orbit','play','progress'])$(id).disabled=!ready;for(const id of['look','face','stop'])$(id).disabled=!ready||!available.length;labels();status(available.length?'Ready. Orbit or enter the nearest completed viewpoint.':'Orbit is ready. Panoramas are being prepared; no look-around stops are available yet.');const requested=new URLSearchParams(location.search).get('stop');const stop=available.find(s=>s.id===requested);if(stop&&new URLSearchParams(location.search).get('mode')==='look')look(null,stop);else warmNearby();});
video.addEventListener('error',()=>status('The orbit clip is unavailable; reload when the local review server is ready.'));
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();deferredLook=null;prefetch.cancel();renderer?.destroy();renderer=null;renderedStop=null;images.clear();finishOrbit();prefetch.cancel();status('Panorama rendering paused. Orbit remains available.');});
Object.defineProperty(window,'tractorTour',{value:Object.freeze({get snapshot(){return{ready,sourceLock,displayedMediaTime,displayedFrame,mode,stop:active?.id||null,time:video.currentTime,progress:progress(),seeking:video.seeking,queuedSeek:desired,snap,wheelQuietUntil:0,input:{queuedLook:{...queuedLook},entryPending,deferredLook:Boolean(deferredLook)},bridgeTime:bridge.time,pendingOrbit,available:available.map(s=>s.id),camera:{...camera},draws,performance:{images:images.stats,panorama:renderer?.stats??null,orbit:flatOrbit?.stats??null},gestures:gestures.state};},setCamera(c){if(mode==='look'){lastInteractionAt=performance.now();Object.assign(camera,c);camera.pitch=clamp(camera.pitch,-89*RAD,89*RAD);draw();}}})});
video.src=ORBIT;video.load();
