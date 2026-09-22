// The renderer owns activation; this source owns decoding and frame notifications.
export function createSceneryVideoSource({src,width,height,onFrame=()=>{},onError=()=>{},onDestroy=()=>{},timeout=15000}) {
  const video=document.createElement('video');
  video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
  video.crossOrigin='anonymous';video.preload='auto';
  let active=false,destroyed=false,playing=false,generation=0,frameGeneration=0,callback=null,timer=null,playTimer=null;
  let readyDone=false,resolveReady,frames=0,lastTime=-1,reason=null;
  const ready=new Promise(resolve=>{resolveReady=resolve;});
  const nativeFrames=typeof video.requestVideoFrameCallback==='function';
  const listeners=[];
  const listen=(target,name,fn)=>{target.addEventListener(name,fn);listeners.push([target,name,fn]);};
  const visible=()=>!document.hidden;
  const runnable=()=>active && !destroyed && visible();
  function cancelFrames() {
    frameGeneration++;
    if (callback!==null) {
      if (nativeFrames) video.cancelVideoFrameCallback(callback);
      else clearTimeout(callback);
      callback=null;
    }
  }
  function settle(value) {
    if (readyDone) return;
    readyDone=true;clearTimeout(timer);timer=null;resolveReady(value);
  }
  function fail(value) {
    if (destroyed) return;
    reason=value;settle(false);source.destroy();
    try { onError(value); } catch {}
  }
  function schedule() {
    if (!runnable() || !playing || video.paused || callback!==null) return;
    const epoch=generation,frameEpoch=frameGeneration;
    const frame=()=>{
      // A cancelled callback may already have been queued by the browser.
      if (epoch!==generation || frameEpoch!==frameGeneration || !runnable()) return;
      callback=null;
      if (!playing || video.paused) return;
      if (video.readyState>=2 && (nativeFrames || video.currentTime!==lastTime)) {
        lastTime=video.currentTime;frames++;
        try { onFrame(); } catch { fail('frame-update-failed');return; }
      }
      schedule();
    };
    callback=nativeFrames?video.requestVideoFrameCallback(frame):setTimeout(frame,1000/24);
  }
  function synchronize() {
    const epoch=++generation;
    cancelFrames();clearTimeout(playTimer);playTimer=null;playing=false;
    if (!runnable()) { video.pause();return; }
    playTimer=setTimeout(()=>fail('play-timeout'),timeout);
    let result;
    try { result=video.play(); } catch { fail('autoplay-rejected');return; }
    Promise.resolve(result).then(()=>{
      if (destroyed || epoch!==generation || !runnable()) {
        if (!runnable()) video.pause();
        return;
      }
      clearTimeout(playTimer);playTimer=null;
      playing=!video.paused;schedule();
    },()=>{
      if (!destroyed && epoch===generation && runnable()) fail('autoplay-rejected');
    });
  }
  function decoded() {
    if (destroyed || video.readyState<2) return;
    if (!video.videoWidth || !video.videoHeight ||
        (width && video.videoWidth!==width) || (height && video.videoHeight!==height)) {
      fail('invalid-dimensions');return;
    }
    settle(true);
  }
  const source={video,ready,
    setActive(value) {
      if (destroyed || active===Boolean(value)) return;
      active=Boolean(value);synchronize();
    },
    destroy() {
      if (destroyed) return;
      destroyed=true;active=false;playing=false;generation++;
      cancelFrames();clearTimeout(playTimer);settle(false);
      for (const [target,name,fn] of listeners) target.removeEventListener(name,fn);
      video.pause();video.removeAttribute('src');video.load();
      try { onDestroy(reason || 'destroyed'); } catch {}
    },
    get stats() { return {src,width:video.videoWidth || width || 0,height:video.videoHeight || height || 0,
      active,paused:video.paused,playing:playing && !video.paused,destroyed,ready:readyDone && !reason && !destroyed,
      state:destroyed?'destroyed':playing?'playing':readyDone?'paused':'loading',error:reason,
      frames,currentTime:video.currentTime || 0,callbackKind:nativeFrames?'video-frame':'timer',reason}; },
    toJSON() { return this.stats; }
  };
  listen(video,'loadeddata',decoded);
  listen(video,'error',()=>fail('media-error'));
  listen(video,'playing',()=>{if (runnable()) {playing=true;schedule();}});
  listen(video,'pause',()=>{playing=false;cancelFrames();});
  listen(video,'waiting',()=>{playing=false;cancelFrames();});
  listen(document,'visibilitychange',synchronize);
  timer=setTimeout(()=>fail('decode-timeout'),timeout);
  try { video.src=src;video.load();decoded(); } catch { fail('media-error'); }
  return source;
}
