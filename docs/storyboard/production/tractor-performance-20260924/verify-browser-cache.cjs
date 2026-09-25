// Run on mini. Uses a new TB4 profile, never the user's Chrome profile.
const {chromium}=require('/Users/miguel_lemos/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const pack='/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924';
const mode=process.argv[2]||'persistent-default',tour=mode==='persistent-tour';
const profile=fs.mkdtempSync(path.join(pack,'browser-cache-profile-'));
const base='http://127.0.0.1:18792';
const url=base+'/storyboard/production/tractor-stops-20260924/stops/stop-18/panorama-assembled-v1.png?browserCacheProof='+mode;
(async()=>{
 const args=mode==='persistent-large-cache'?['--disk-cache-size=536870912']:[];
 const options={channel:'chrome',headless:true,viewport:{width:1440,height:1000},args};
 const browser=mode==='ephemeral'?await chromium.launch(options):null;
 const context=browser?await browser.newContext({viewport:options.viewport}):await chromium.launchPersistentContext(profile,options);
 const result={mode,profile,args,requests:[],fetches:[],startedAt:new Date().toISOString()};
 try{
  const page=context.pages()[0]||await context.newPage(),cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');
  const requests=new Map();
  cdp.on('Network.requestWillBeSent',event=>{if(tour?/\/stops\/stop-\d+\/panorama-assembled-v\d+\.png(?:\?|$)/.test(event.request.url):event.request.url===url){const r={id:event.requestId,url:event.request.url};requests.set(event.requestId,r);result.requests.push(r);}});
  cdp.on('Network.requestWillBeSentExtraInfo',event=>{const r=requests.get(event.requestId);if(r)r.conditionalHeaders=Object.fromEntries(Object.entries(event.headers).filter(([name])=>/^(if-none-match|if-modified-since|cache-control|pragma)$/i.test(name)));});
  cdp.on('Network.responseReceived',event=>{const r=requests.get(event.requestId);if(r){r.effectiveStatus=event.response.status;r.fromDiskCache=event.response.fromDiskCache;r.fromPrefetchCache=event.response.fromPrefetchCache;}});
  cdp.on('Network.responseReceivedExtraInfo',event=>{const r=requests.get(event.requestId);if(r)r.networkStatus=event.statusCode;});
  cdp.on('Network.requestServedFromCache',event=>{const r=requests.get(event.requestId);if(r)r.servedFromCache=true;});
  cdp.on('Network.loadingFinished',event=>{const r=requests.get(event.requestId);if(r)r.networkBytes=event.encodedDataLength;});
  result.userAgent=await page.evaluate(()=>navigator.userAgent);
  if(tour){
   result.steps=[];await page.emulateMedia({reducedMotion:'reduce'});
   await page.goto(base+'/tractor-tour.html?sourceLock=1');
   await page.waitForFunction(()=>window.tractorTour?.snapshot.ready);
   for(const stop of ['stop-00','stop-06','stop-12','stop-06','stop-00','stop-12']){
    const start=result.requests.length;
    await page.locator('#stop').selectOption(stop);
    await page.waitForFunction(stop=>tractorTour.snapshot.mode==='look'&&tractorTour.snapshot.stop===stop,stop);
    await page.waitForTimeout(1800);
    const snapshot=await page.evaluate(()=>tractorTour.snapshot);
    result.steps.push({stop,requests:result.requests.slice(start).map(r=>({...r})),performance:snapshot.performance});
   }
   result.repeatedNeighborRequests=result.steps.slice(3).flatMap(step=>step.requests);
   result.reused=result.repeatedNeighborRequests.length>0&&result.repeatedNeighborRequests.every(r=>r.networkStatus===304||r.fromDiskCache||r.servedFromCache);
  }else{
   await page.goto(base+'/tractor-tour.css');
   for(let i=0;i<2;i++)result.fetches.push(await page.evaluate(async url=>{const begin=performance.now(),r=await fetch(url,{cache:'no-cache'}),data=await r.arrayBuffer();return {status:r.status,bodyBytes:data.byteLength,elapsedMs:performance.now()-begin};},url));
   await page.waitForTimeout(100);
   result.resourceEntries=await page.evaluate(url=>performance.getEntriesByName(url).map(r=>({transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize})),url);
   result.reused=result.requests[1]?.networkStatus===304||result.requests[1]?.fromDiskCache===true;
  }
 }finally{
  await context.close();if(browser)await browser.close();
  result.completedAt=new Date().toISOString();
  fs.writeFileSync(path.join(pack,'browser-cache-'+mode+'.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
