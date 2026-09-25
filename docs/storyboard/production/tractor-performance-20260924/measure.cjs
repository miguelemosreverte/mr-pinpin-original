const {chromium}=require('/Users/miguel_lemos/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('node:fs'),crypto=require('node:crypto');
const label=process.argv[2]||'baseline';
const root='/Volumes/TB4/mac-mini-storage/shared/pinpin-review-mirror-20260924/docs';
const out='/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/browser-check/performance-'+label;
fs.mkdirSync(out,{recursive:true});
const result={label,startedAt:new Date().toISOString(),url:'http://127.0.0.1:18792/tractor-tour.html?sourceLock=1',sourceHashes:{},runs:[],errors:[]};
for(const file of ['tractor-tour.js','tractor-tour-video.js','tractor-panorama-anchor.js','tractor-tour-cache.js','tractor-tour.html'])if(fs.existsSync(root+'/'+file))result.sourceHashes[file]=crypto.createHash('sha256').update(fs.readFileSync(root+'/'+file)).digest('hex');
function instrument(){
 const data=window.__perf={events:[],frames:[],longtasks:[]};
 let last=performance.now(),state='';
 const event=(type,extra)=>data.events.push({type,t:performance.now(),...extra});
 function frame(now){data.frames.push({t:now,gap:now-last});last=now;const s=window.tractorTour?.snapshot;if(s){const key=s.mode+'|'+s.stop;if(key!==state){event('mode',{mode:s.mode,stop:s.stop,snap:s.snap});state=key;}}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 new PerformanceObserver(list=>data.longtasks.push(...list.getEntries().map(x=>({t:x.startTime,duration:x.duration})))).observe({type:'longtask',buffered:true});
 const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(...args){const t=performance.now(),src=this.src;return decode.apply(this,args).then(value=>{event('decode',{start:t,duration:performance.now()-t,src,width:this.naturalWidth,height:this.naturalHeight});return value;});};
 for(const name of ['texImage2D','texSubImage2D','compileShader','linkProgram','drawArrays']){const original=WebGLRenderingContext.prototype[name];WebGLRenderingContext.prototype[name]=function(...args){const t=performance.now();const value=original.apply(this,args);const src=args.at(-1);event(name,{start:t,duration:performance.now()-t,canvas:this.canvas.id,source:src?.tagName||null});return value;};}
 document.addEventListener('DOMContentLoaded',()=>{const v=document.querySelector('#video');for(const name of ['seeking','seeked'])v?.addEventListener(name,()=>event(name,{time:v.currentTime}));});
}
const round=v=>Math.round(v*100)/100;
function summarize(data,start,end){
 const events=data.events.filter(x=>x.t>=start&&x.t<=end),frames=data.frames.filter(x=>x.t>=start&&x.t<=end),longtasks=data.longtasks.filter(x=>x.t>=start&&x.t<=end);
 const sums={};for(const e of events.filter(x=>x.duration!==undefined)){const key=e.type+':'+(e.canvas||'image');const row=sums[key]??={count:0,totalMs:0,maxMs:0};row.count++;row.totalMs+=e.duration;row.maxMs=Math.max(row.maxMs,e.duration);}for(const row of Object.values(sums)){row.totalMs=round(row.totalMs);row.maxMs=round(row.maxMs);}
 const gaps=frames.map(x=>x.gap).sort((a,b)=>a-b);
 return {elapsedMs:round(end-start),frameCount:frames.length,frameGapP95Ms:round(gaps[Math.floor(gaps.length*.95)]||0),frameGapMaxMs:round(Math.max(0,...gaps)),framesOver50ms:gaps.filter(x=>x>50).length,longtaskCount:longtasks.length,longtaskTotalMs:round(longtasks.reduce((a,x)=>a+x.duration,0)),operations:sums,modes:events.filter(x=>x.type==='mode'),decodes:events.filter(x=>x.type==='decode'),seeks:events.filter(x=>x.type==='seeking').length};
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 result.browserVersion=browser.version();
 for(const reducedMotion of ['no-preference','reduce']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion});await context.addInitScript(instrument);
  const p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>result.errors.push(e.message));
  const requests=[];const cdp=await context.newCDPSession(p);await cdp.send('Network.enable');cdp.on('Network.loadingFinished',e=>requests.push({at:Date.now(),bytes:e.encodedDataLength}));
  await p.goto(result.url);await p.waitForFunction(()=>window.tractorTour?.snapshot.ready);await p.locator('#stage').scrollIntoViewIfNeeded();await p.waitForTimeout(400);
  const run={reducedMotion,transitions:[],webgl:await p.evaluate(()=>{const gl=document.querySelector('#panorama-canvas').getContext('webgl');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),dpr:devicePixelRatio};})};result.runs.push(run);
  for(const [i,id] of ['stop-00','stop-06','stop-12','stop-00','stop-06','stop-12'].entries()){
   const before=await p.evaluate(()=>({t:performance.now(),snapshot:tractorTour.snapshot})),requestStart=requests.length;
   await p.locator('#stop').selectOption(id);await p.waitForFunction(id=>tractorTour.snapshot.mode==='look'&&tractorTour.snapshot.stop===id,id);
   const end=await p.evaluate(()=>({t:performance.now(),snapshot:tractorTour.snapshot}));
   const data=await p.evaluate(()=>__perf);const row={id,cache:i<3?'first entry':'repeat entry',from:before.snapshot.mode,...summarize(data,before.t,end.t),requestCount:requests.length-requestStart,requestBytes:requests.slice(requestStart).reduce((a,x)=>a+x.bytes,0),entry:end.snapshot};
   const panStart=await p.evaluate(()=>performance.now());
   await p.evaluate(async()=>{const c=tractorTour.snapshot.camera;await new Promise(resolve=>{let n=0;function tick(){tractorTour.setCamera({yaw:c.yaw+Math.sin(n/60*Math.PI)*.7,pitch:c.pitch+Math.sin(n/60*Math.PI)*.12});if(++n<60)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});});
   const panEnd=await p.evaluate(()=>performance.now());row.pan=summarize(await p.evaluate(()=>__perf),panStart,panEnd);
   if(i===2&&reducedMotion==='no-preference')await p.locator('#stage').screenshot({path:out+'/stop-12-look.png'});
   run.transitions.push(row);fs.writeFileSync(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({motion:reducedMotion,id,cache:row.cache,ms:row.elapsedMs,gap:row.frameGapMaxMs,bytes:row.requestBytes,panMs:row.pan.elapsedMs,panGap:row.pan.frameGapMaxMs}));
  }
  fs.writeFileSync(out+'/raw-'+reducedMotion+'.json',JSON.stringify(await p.evaluate(()=>({perf:__perf,resources:performance.getEntriesByType('resource').map(x=>x.toJSON())})),null,2));
  await context.close();
 }
 result.completedAt=new Date().toISOString();
}catch(e){result.fatal=e.stack;throw e;}finally{fs.writeFileSync(out+'/results.json',JSON.stringify(result,null,2));await browser.close();}})();
