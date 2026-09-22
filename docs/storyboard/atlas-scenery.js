import {createSceneryVideoSource} from './atlas-video-source.js';

export const SCENERY_FRAMES=Object.freeze(Array.from({length:5},(_,i) => `shire-motion-0${i+1}-v1.webp`));
const manifestURL=new URL('./atlas-video.json',import.meta.url);

export async function loadScenery(renderer,options={}) {
  const state={enabled:false,reason:'loading',kind:'static',width:0,height:0,dimensions:null};
  const media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const connection=globalThis.navigator?.connection;
  const blocked=() => {
    if (renderer.backend!=='webgpu' || typeof renderer.setSceneryVideo!=='function') return 'renderer';
    if (media?.matches) return 'reduced-motion';
    if (connection?.saveData) return 'save-data';
    if (options.animate===false) return 'paused';
    try { if (globalThis.localStorage?.getItem('pinpin.atlas.motion.v1')==='paused') return 'paused'; } catch {}
    return null;
  };
  const initialReason=blocked();
  if (initialReason) { state.reason=initialReason;return state; }
  const controller=new AbortController();
  let source=null,attached=false,stopped=false,timer,finish;
  const cancelled=new Promise(resolve=>{finish=resolve;});
  Object.defineProperty(state,'source',{get:()=>source});
  Object.defineProperty(state,'stats',{enumerable:true,get:()=>source?.stats || null});
  function cleanup() {
    clearTimeout(timer);
    media?.removeEventListener?.('change',preferences);
    connection?.removeEventListener?.('change',preferences);
    globalThis.removeEventListener?.('pagehide',pagehide);
  }
  function stop(reason) {
    if (stopped) return;
    stopped=true;
    state.enabled=false;state.kind='static';state.reason=reason;
    controller.abort();cleanup();
    if (attached) {
      attached=false;
      try { renderer.setSceneryVideo(null); } catch {}
    }
    source?.destroy();finish(null);
  }
  function preferences() {
    if (media?.matches) stop('reduced-motion');
    else if (connection?.saveData) stop('save-data');
  }
  function pagehide() { stop('pagehide'); }
  media?.addEventListener?.('change',preferences);
  connection?.addEventListener?.('change',preferences);
  globalThis.addEventListener?.('pagehide',pagehide);
  timer=setTimeout(()=>stop('timeout'),15000);
  try {
    const manifest=await Promise.race([fetch(manifestURL,{signal:controller.signal}).then(response=>{
      if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
      return response.json();
    }),cancelled]);
    if (stopped) return state;
    const reason=blocked();
    if (reason) { stop(reason);return state; }
    const mobile=(globalThis.innerWidth || 1024)<=768 ||
      (globalThis.navigator?.deviceMemory>0 && globalThis.navigator.deviceMemory<=4);
    const variant=manifest?.variants?.find(item=>item.id===(mobile?'mobile':'desktop'));
    if (manifest?.version!==1 || !variant || !Number.isInteger(variant.width) || variant.width<=0 ||
        !Number.isInteger(variant.height) || variant.height<=0 ||
        !/^videos\/shire-atlas-loop-(mobile|desktop)-v1\.mp4$/.test(variant.src)) {
      stop('invalid-manifest');return state;
    }
    state.variant=variant.id;state.src=variant.src;
    state.width=variant.width;state.height=variant.height;
    state.dimensions=[variant.width,variant.height];
    state.duration=manifest.duration;state.fps=manifest.fps;
    source=createSceneryVideoSource({src:new URL(variant.src,manifestURL).href,
      width:variant.width,height:variant.height,
      onFrame:()=>renderer.updateSceneryVideo(),onError:stop,onDestroy:stop});
    const ready=await Promise.race([source.ready,cancelled]);
    if (stopped) return state;
    if (!ready) { stop(source.stats.reason || 'decode-failed');return state; }
    const finalReason=blocked();
    if (finalReason) { stop(finalReason);return state; }
    attached=true;
    if (!renderer.setSceneryVideo(source)) { stop('renderer');return state; }
    if (stopped) return state;
    state.enabled=true;state.kind='video';state.reason=null;
    clearTimeout(timer);
    globalThis.removeEventListener?.('pagehide',pagehide);
    return state;
  } catch (error) {
    state.error=String(error?.message || error);
    stop('load-failed');return state;
  }
}
