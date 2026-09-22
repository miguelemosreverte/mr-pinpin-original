const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../docs/storyboard');
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

class Events {
  listeners=new Map();
  addEventListener(type,fn) { if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn); }
  removeEventListener(type,fn) {this.listeners.get(type)?.delete(fn);}
  emit(type) {for(const fn of [...(this.listeners.get(type)||[])])fn({type});}
  get listenerCount() {return [...this.listeners.values()].reduce((sum,set)=>sum+set.size,0);}
}
function harness(options={}) {
  const timers=new Map(),videos=[],fetches=[],window=new Events(),document=new Events();
  let clock=0,serial=0,stored=options.paused?'paused':null;
  const setTimer=(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:clock+ms,ms});return id;};
  class Video extends Events {
    paused=true;readyState=0;videoWidth=0;videoHeight=0;currentTime=0;callbacks=new Map();playCalls=0;loads=0;
    constructor() {super();if(options.fallback)this.requestVideoFrameCallback=undefined;}
    load() {
      this.loads++;
      if(this.src && !options.noDecode)queueMicrotask(()=>{
        if(!this.src)return;
        const mobile=this.src.includes('mobile');
        this.readyState=2;this.videoWidth=mobile?1152:1536;this.videoHeight=mobile?768:1024;
        if(options.badDimensions)this.videoWidth=10;
        this.emit('loadeddata');
      });
    }
    play() {this.playCalls++;this.paused=false;return options.play?options.play(this):Promise.resolve();}
    pause() {this.paused=true;this.emit('pause');}
    removeAttribute(name) {if(name==='src')this.src='';}
    requestVideoFrameCallback(fn) {const id=++serial;this.callbacks.set(id,fn);return id;}
    cancelVideoFrameCallback(id) {this.callbacks.delete(id);}
    frame(time) {this.currentTime=time;const callbacks=[...this.callbacks.values()];this.callbacks.clear();callbacks.forEach(fn=>fn());}
  }
  document.hidden=false;document.createElement=name=>{assert.equal(name,'video');const video=new Video();videos.push(video);return video;};
  const media=new Events(),connection=new Events();media.matches=Boolean(options.reduced);connection.saveData=Boolean(options.saveData);
  const manifest={version:1,duration:10,fps:24,world:[1536,1024],variants:[
    {id:'mobile',src:'videos/shire-atlas-loop-mobile-v1.mp4',width:1152,height:768,bytes:123},
    {id:'desktop',src:'videos/shire-atlas-loop-desktop-v1.mp4',width:1536,height:1024,bytes:456}
  ],registration:{}};
  const context=vm.createContext({URL,AbortController,document,queueMicrotask,
    innerWidth:options.width || 1440,navigator:{connection,deviceMemory:options.memory},
    matchMedia:()=>media,localStorage:{getItem(){if(options.storageBlocked)throw Error('denied');return stored;}},
    addEventListener:window.addEventListener.bind(window),removeEventListener:window.removeEventListener.bind(window),
    setTimeout:setTimer,clearTimeout:id=>timers.delete(id),
    fetch:(url,init)=>{fetches.push({url:String(url),...init});return options.fetch?options.fetch(url,init):
      Promise.resolve({ok:!options.missing,status:404,json:async()=>options.manifest || manifest});}
  });
  for(const file of ['atlas-video-source.js','atlas-scenery.js']) {
    const source=fs.readFileSync(path.join(root,file),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'')
      .replace(/import\.meta\.url/g,JSON.stringify('https://atlas.test/storyboard/'+file));
    vm.runInContext(source,context,{filename:file});
  }
  const renderer={backend:options.backend || 'webgpu',source:null,attachments:[],updates:0,
    setSceneryVideo(value) {
      this.attachments.push(value);const old=this.source;this.source=value;
      if(!value && options.destroyOnDetach) {old?.setActive(false);old?.destroy();}
      if(!value && options.detachThrows)throw Error('renderer already lost');
      if(value)value.setActive(options.rendererActive!==false);return options.accept!==false;
    },
    updateSceneryVideo() {this.updates++;if(options.updateThrows)throw Error('device lost');}
  };
  return {context,renderer,media,connection,document,window,timers,videos,fetches,
    source:args=>context.createSceneryVideoSource({src:'https://atlas.test/videos/shire-atlas-loop-desktop-v1.mp4',...args}),
    load:args=>context.loadScenery(renderer,args),setStored:value=>{stored=value;},
    hide(value) {document.hidden=value;document.emit('visibilitychange');},
    async advance(ms) {
      const end=clock+ms;
      while(true) {
        const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
        if(!next)break;
        clock=next[1].at;timers.delete(next[0]);next[1].fn();await flush();
      }
      clock=end;await flush();
    }
  };
}

test('blocked initial preferences and renderer cause zero fetches and zero media elements',async()=>{
  for(const [options,reason] of [[{reduced:true},'reduced-motion'],[{saveData:true},'save-data'],
    [{paused:true},'paused'],[{backend:'canvas2d'},'renderer'],[{},'paused']]) {
    const h=harness(options),state=await h.load(Object.keys(options).length?{}:{animate:false});
    assert.equal(state.enabled,false);assert.equal(state.reason,reason);
    assert.equal(h.fetches.length,0);assert.equal(h.videos.length,0);assert.equal(h.timers.size,0);
  }
});
test('pause is retryable after unpause and inaccessible storage does not break loading',async()=>{
  const h=harness({paused:true});assert.equal((await h.load()).reason,'paused');
  h.setStored('playing');const state=await h.load({animate:true});assert.equal(state.enabled,true);state.source.destroy();
  const blocked=harness({storageBlocked:true}),loaded=await blocked.load();assert.equal(loaded.enabled,true);loaded.source.destroy();
});
test('one variant is selected once and exposes plain JSON diagnostics',async()=>{
  for(const [options,variant] of [[{width:768},'mobile'],[{width:769},'desktop'],[{memory:4},'mobile'],[{memory:8},'desktop']]) {
    const h=harness(options),state=await h.load(),video=h.videos[0];await flush();
    assert.equal(state.enabled,true);assert.equal(state.kind,'video');assert.equal(state.variant,variant);
    assert.equal(h.fetches.length,1);assert(h.fetches[0].url.endsWith('/atlas-video.json'));assert.equal(h.videos.length,1);
    assert(video.src.endsWith(`shire-atlas-loop-${variant}-v1.mp4`));
    assert(video.muted && video.defaultMuted && video.loop && video.playsInline);assert.equal(video.crossOrigin,'anonymous');
    assert.equal(state.source.stats.paused,false);assert.equal(state.source.stats.src,video.src);
    const plain=JSON.parse(JSON.stringify(state));assert.equal(plain.source,undefined);assert.equal(plain.stats.width,state.width);
    h.context.innerWidth=320;assert.equal(state.variant,variant);state.source.destroy();
  }
});
test('decoded frame callback updates renderer; pause, hidden and teardown cancel callbacks',async()=>{
  const h=harness(),state=await h.load(),source=state.source,video=source.video;await flush();
  assert.equal(video.callbacks.size,1);video.frame(.1);assert.equal(h.renderer.updates,1);assert.equal(source.stats.frames,1);
  const late=[...video.callbacks.values()][0];source.setActive(false);assert.equal(video.callbacks.size,0);assert.equal(video.paused,true);
  late();assert.equal(h.renderer.updates,1);
  source.setActive(true);await flush();assert.equal(video.callbacks.size,1);
  h.hide(true);assert.equal(video.paused,true);assert.equal(video.callbacks.size,0);
  h.hide(false);await flush();assert.equal(video.callbacks.size,1);
  source.destroy();source.destroy();source.setActive(true);await flush();
  assert.equal(video.src,'');assert.equal(video.callbacks.size,0);assert.equal(h.timers.size,0);
  assert.equal(video.listenerCount,0);assert.equal(h.document.listenerCount,0);assert.equal(h.media.listenerCount,0);
  assert.equal(state.enabled,false);assert.equal(state.reason,'destroyed');
});
test('runtime reduced motion and save-data permanently detach and update existing state',async()=>{
  for(const pref of ['reduced','saveData']) {
    const h=harness(),state=await h.load(),source=state.source;
    if(pref==='reduced'){h.media.matches=true;h.media.emit('change');}
    else {h.connection.saveData=true;h.connection.emit('change');}
    assert.equal(state.enabled,false);assert.equal(state.kind,'static');assert.equal(h.renderer.attachments.at(-1),null);
    assert(source.stats.destroyed);assert.equal(source.video.src,'');assert.equal(h.timers.size,0);
    h.media.matches=false;h.connection.saveData=false;h.media.emit('change');h.connection.emit('change');
    assert.equal(h.fetches.length,1);assert.equal(state.enabled,false);
  }
});
test('rejected play detaches without unhandled rejection and records reason',async()=>{
  for(const play of [()=>Promise.reject(Error('NotAllowedError')),()=>{throw Error('NotAllowedError');}]) {
    const h=harness({play}),state=await h.load();await flush();
    assert.equal(state.enabled,false);assert.equal(state.reason,'autoplay-rejected');
    assert.equal(h.renderer.attachments.at(-1),null);assert.equal(state.source.stats.error,'autoplay-rejected');assert.equal(h.timers.size,0);
  }
});
test('pending play cannot revive pause or destroy, and stale rejection cannot cancel newer play',async()=>{
  for(const action of ['pause','destroy','resume']) {
    const calls=[],h=harness({play:()=>{const d=deferred();calls.push(d);return d.promise;}});
    const source=h.source();await source.ready;source.setActive(true);
    if(action==='destroy')source.destroy();else source.setActive(false);
    if(action==='resume')source.setActive(true);
    if(action==='resume'){calls[0].reject(Error('old interruption'));calls[1].resolve();}
    else {source.video.paused=false;calls[0].resolve();}
    await flush();assert.equal(source.video.paused,action!=='resume');assert.equal(source.stats.destroyed,action==='destroy');
    assert.equal(source.video.callbacks.size,action==='resume'?1:0);source.destroy();assert.equal(h.timers.size,0);
  }
});
test('fallback polling is bounded to 24fps, ignores repeated times and stops while hidden or waiting',async()=>{
  const h=harness({fallback:true}),state=await h.load(),source=state.source,video=source.video;await flush();
  assert.equal(source.stats.callbackKind,'timer');assert.equal(h.timers.size,1);
  assert([...h.timers.values()].every(t=>t.ms>=1000/24));
  await h.advance(1000);assert.equal(h.renderer.updates,1,'unchanged media timestamp is never uploaded twice');
  for(let i=0;i<10;i++){video.currentTime+=1/24;await h.advance(1000/24);}
  assert(h.renderer.updates<=11);assert(h.renderer.updates>=10);
  video.emit('waiting');assert.equal(h.timers.size,0);video.emit('playing');assert.equal(h.timers.size,1);
  h.hide(true);assert.equal(h.timers.size,0);await h.advance(1000);
  h.hide(false);await flush();assert.equal(h.timers.size,1);
  source.setActive(false);assert.equal(h.timers.size,0);source.destroy();
});
test('manifest errors, invalid dimensions, rejected renderer and media errors stay static',async()=>{
  for(const [options,reason] of [[{missing:true},'load-failed'],[{badDimensions:true},'invalid-dimensions'],
    [{accept:false},'renderer'],[{manifest:{version:1,variants:[]}},'invalid-manifest']]) {
    const h=harness(options),state=await h.load();assert.equal(state.enabled,false);assert.equal(state.reason,reason);assert.equal(h.timers.size,0);
  }
  for(const updateThrows of [false,true]) {
    const h=harness({updateThrows}),state=await h.load();await flush();
    if(updateThrows)state.source.video.frame(.1);else state.source.video.emit('error');
    assert.equal(state.enabled,false);assert.equal(state.reason,updateThrows?'frame-update-failed':'media-error');assert.equal(h.renderer.source,null);
  }
});
test('manifest/decode/play timeouts and pagehide bound work and ignore late completions',async()=>{
  const deferredFetch=deferred(),h=harness({fetch:()=>deferredFetch.promise}),pending=h.load();
  await h.advance(15000);const state=await pending;assert.equal(state.reason,'timeout');assert(h.fetches[0].signal.aborted);
  deferredFetch.resolve({ok:true,json:async()=>({})});await flush();assert.equal(h.videos.length,0);
  const decode=harness({noDecode:true}),loading=decode.load();await flush();await decode.advance(15000);
  assert.equal((await loading).enabled,false);assert.equal(decode.videos[0].src,'');assert.equal(decode.timers.size,0);
  const play=harness({play:()=>new Promise(()=>{})}),playing=await play.load();await play.advance(15000);
  assert.equal(playing.reason,'play-timeout');assert.equal(play.renderer.source,null);
  const hidden=harness({noDecode:true}),hiding=hidden.load();await flush();hidden.window.emit('pagehide');
  assert.equal((await hiding).reason,'pagehide');assert.equal(hidden.timers.size,0);
});
test('preference changes during manifest load abort before assigning video src',async()=>{
  const fetched=deferred(),h=harness({fetch:()=>fetched.promise}),loading=h.load();
  h.connection.saveData=true;h.connection.emit('change');
  assert.equal((await loading).reason,'save-data');assert.equal(h.videos.length,0);assert(h.fetches[0].signal.aborted);
});
test('error cleanup tolerates reentrant renderer destruction and throwing detach',async()=>{
  for(const detachThrows of [false,true])for(const trigger of ['media','preference','destroy']) {
    const h=harness({destroyOnDetach:true,detachThrows}),state=await h.load(),source=state.source;
    if(trigger==='media')source.video.emit('error');
    else if(trigger==='preference'){h.media.matches=true;h.media.emit('change');}
    else source.destroy();
    assert.equal(state.enabled,false);assert.equal(state.kind,'static');
    assert.equal(state.reason,trigger==='media'?'media-error':trigger==='preference'?'reduced-motion':'destroyed');
    assert.equal(h.renderer.attachments.filter(value=>value===null).length,1);
    assert.equal(source.video.src,'');assert.equal(source.video.loads,2,'load once and release once');
    assert.equal(source.video.callbacks.size,0);assert.equal(source.video.listenerCount,0);
    assert.equal(h.document.listenerCount,0);assert.equal(h.media.listenerCount,0);assert.equal(h.connection.listenerCount,0);
    assert.equal(h.window.listenerCount,0);assert.equal(h.timers.size,0);
  }
});
test('stale callbacks after waiting cannot duplicate callbacks on resumed playback',async()=>{
  const h=harness(),state=await h.load(),video=state.source.video;await flush();
  const stale=[...video.callbacks.values()][0];video.emit('waiting');video.emit('playing');
  assert.equal(video.callbacks.size,1);stale();assert.equal(video.callbacks.size,1);assert.equal(h.renderer.updates,0);
  video.frame(.5);assert.equal(h.renderer.updates,1);state.source.destroy();
});
