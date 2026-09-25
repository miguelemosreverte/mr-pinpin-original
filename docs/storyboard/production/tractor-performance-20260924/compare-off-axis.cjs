const {chromium}=require('/Users/miguel_lemos/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('node:fs'),crypto=require('node:crypto');
const root='/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/browser-check';
const out=root+'/'+(process.argv[2]||'performance-off-axis');fs.mkdirSync(out,{recursive:true});
const baseline=JSON.parse(fs.readFileSync(root+'/performance-baseline/results.json'));
const result={startedAt:new Date().toISOString(),cases:[],transitions:[],errors:[]};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const version of ['baseline','optimized']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  if(version==='baseline')for(const [file,hash] of Object.entries(baseline.sourceHashes)){
   const body=fs.readFileSync(root+'/performance-baseline/'+file);if(crypto.createHash('sha256').update(body).digest('hex')!==hash)throw Error('Baseline hash mismatch: '+file);
   await context.route('**/'+file+'*',route=>route.fulfill({status:200,contentType:'application/javascript',body}));
  }
  await context.addInitScript(()=>{window.__frames=[];let last=performance.now();function tick(t){__frames.push({t,gap:t-last});last=t;requestAnimationFrame(tick);}requestAnimationFrame(tick);});
  const p=await context.newPage();const requests=[];const cdp=await context.newCDPSession(p);await cdp.send('Network.enable');cdp.on('Network.loadingFinished',e=>requests.push(e.encodedDataLength));
  p.on('pageerror',e=>result.errors.push(e.message));await p.goto('http://127.0.0.1:18792/tractor-tour.html?sourceLock=1');await p.waitForFunction(()=>window.tractorTour?.snapshot.ready);await p.locator('#stage').scrollIntoViewIfNeeded();
  for(const id of ['stop-00','stop-06','stop-12','stop-06','stop-00','stop-12']){
   const before=await p.evaluate(()=>({t:performance.now(),snapshot:tractorTour.snapshot})),requestStart=requests.length;
   await p.locator('#stop').selectOption(id);await p.waitForFunction(id=>tractorTour.snapshot.mode==='look'&&tractorTour.snapshot.stop===id,id);
   const entry=await p.evaluate(start=>({t:performance.now(),snapshot:tractorTour.snapshot,maxFrameGap:Math.max(0,...__frames.filter(x=>x.t>=start).map(x=>x.gap))}),before.t);
   const entryRequestBytes=requests.slice(requestStart).reduce((a,b)=>a+b,0);await p.waitForTimeout(1600);
   const idle=await p.evaluate(()=>tractorTour.snapshot);
   result.transitions.push({version,id,elapsedMs:entry.t-before.t,maxFrameGapMs:entry.maxFrameGap,entryRequestBytes,includingIdleRequestBytes:requests.slice(requestStart).reduce((a,b)=>a+b,0),before:before.snapshot.performance,entry:entry.snapshot.performance,afterIdle:idle.performance});
   if(id==='stop-00'||id==='stop-12'){
    await p.evaluate(()=>{const c=tractorTour.snapshot.camera;tractorTour.setCamera({yaw:c.yaw+1.2,pitch:c.pitch-.15});});await p.waitForTimeout(100);
    const s=await p.evaluate(()=>tractorTour.snapshot);const name=version+'-'+id+'-'+result.cases.filter(x=>x.version===version&&x.id===id).length;
    await p.locator('#stage').screenshot({path:out+'/'+name+'.png'});result.cases.push({version,id,name,camera:s.camera,performance:s.performance,time:s.time,decoded:s.displayedMediaTime});
   }
  }
  if(version==='optimized'){
   await p.waitForTimeout(250);
   result.wheelBurst=await p.evaluate(async()=>{const before=tractorTour.snapshot;for(let i=0;i<100;i++)document.querySelector('#stage').dispatchEvent(new WheelEvent('wheel',{deltaX:1,deltaY:0,bubbles:true,cancelable:true}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const after=tractorTour.snapshot;return {events:100,draws:after.draws-before.draws,yawDelta:after.camera.yaw-before.camera.yaw,pass:after.draws-before.draws<=2&&Math.abs(after.camera.yaw-before.camera.yaw)>.1};});
  }
  await context.close();
 }
 const p=await browser.newPage();const comparisons=[];
 const pairs=result.cases.filter(x=>x.version==='baseline').map(before=>({before,after:result.cases.find(x=>x.name===before.name.replace('baseline-','optimized-')),kind:'before-after'}));
 for(const id of ['stop-00','stop-12'])pairs.push({before:result.cases.find(x=>x.name==='baseline-'+id+'-0'),after:result.cases.find(x=>x.name==='baseline-'+id+'-1'),kind:'baseline-repeat-control'});
 for(const {before,after,kind} of pairs){
  const images=[before,after].map(x=>'data:image/png;base64,'+fs.readFileSync(out+'/'+x.name+'.png').toString('base64'));
  const diff=await p.evaluate(async images=>{const data=[];for(const url of images){const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);data.push(ctx.getImageData(0,0,c.width,c.height).data);}let changedPixels=0,maxChannelDelta=0;for(let i=0;i<data[0].length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(data[0][i+c]-data[1][i+c]);changed||=d!==0;maxChannelDelta=Math.max(maxChannelDelta,d);}changedPixels+=Number(changed);}return {changedPixels,maxChannelDelta,pass:changedPixels===0};},images);
  comparisons.push({kind,before:before.name,after:after.name,...diff,exactMatch:diff.pass,withinSingleLevelNoise:diff.maxChannelDelta<=1&&diff.changedPixels<=20});
 }
 result.comparisons=comparisons;result.pass=result.errors.length===0&&comparisons.every(x=>x.withinSingleLevelNoise)&&result.wheelBurst.pass;
 console.log(JSON.stringify(result));
}catch(e){result.fatal=e.stack;throw e;}finally{result.completedAt=new Date().toISOString();fs.writeFileSync(out+'/results.json',JSON.stringify(result,null,2));await browser.close();}})();
