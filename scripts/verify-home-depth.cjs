/* Independent native-browser checks for the optional room depth renderer. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.HOME_URL || 'http://127.0.0.1:8789/';
const out=process.env.VERIFICATION_DIR;
if(!out)throw Error('Set VERIFICATION_DIR to an external evidence directory');
fs.mkdirSync(out,{recursive:true});
const checks=[];
const near=(a,b,tolerance,message)=>assert(Math.abs(a-b)<=tolerance,`${message}: ${a} vs ${b}`);
const state=page=>page.evaluate(()=>document.querySelector('.room-fit').depthView?.snapshot);
async function settle(page){await page.waitForTimeout(650);}
async function capture(page,name){await page.screenshot({path:path.join(out,name+'.png')});}
async function touchDrag(cdp,a,b){
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...a}]});
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function pinch(cdp,center){
 const points=r=>[{id:1,x:center.x-r,y:center.y},{id:2,x:center.x+r,y:center.y}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(40)});
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(40+i*3)});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function fill(page){
 const s=await page.evaluate(()=>{const r=document.querySelector('.room').getBoundingClientRect();const flags=document.querySelector('.language-picker').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,visualScale:visualViewport.scale,flags:{x:flags.x,y:flags.y,right:flags.right,bottom:flags.bottom}};});
 assert(s.x<=1&&s.y<=1&&s.right>=s.width-1&&s.bottom>=s.height-1,'Room fills viewport');
 assert(s.scrollW<=s.width&&s.scrollH<=s.height,'No document scrolling');near(s.visualScale,1,.01,'Native gestures leave browser viewport unzoomed');
 assert(s.flags.x>=0&&s.flags.y>=0&&s.flags.right<=s.width&&s.flags.bottom<=s.height,'Fixed flags remain visible');return s;
}
async function reveal(page,id){
 for(let i=0;i<10;i++){await page.keyboard.press('Tab');if(await page.evaluate(id=>document.activeElement?.id===id,id))break;}assert(await page.evaluate(id=>document.activeElement?.id===id,id),'Keyboard reaches '+id);await settle(page);return page.evaluate(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};},id);
}
// Compare the actual projected SVG path to independent samples of its source path.
async function contours(page){
 return page.evaluate(async()=>{
  const html=await (await fetch(location.href)).text(),doc=new DOMParser().parseFromString(html,'text/html'),room=document.querySelector('.room').getBoundingClientRect(),scale=room.width/1536,result=[];
  for(const id of ['door-contour','bookcase-contour']){
   const original=doc.getElementById(id),actual=document.getElementById(id),length=original.getTotalLength(),actualLength=actual.getTotalLength();let worst=0;
   const samples=Array.from({length:801},(_,i)=>actual.getPointAtLength(actualLength*i/800));
   for(let i=0;i<40;i++){
    const p=original.getPointAtLength(length*i/40),q=document.querySelector('.room-fit').depthView.project([p.x,p.y]);
    const distance=Math.min(...samples.map(s=>Math.hypot(s.x-q[0],s.y-q[1])))*scale;worst=Math.max(worst,distance);
   }
   result.push({id,worstScreenPixels:worst});
  }
  return result;
 });
}
async function imageStats(page,png,regions){
 return page.evaluate(async({data,regions})=>{
  const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const p=ctx.getImageData(0,0,image.width,image.height).data;
  const lum=(x,y)=>{const i=(y*image.width+x)*4;return .2126*p[i]+.7152*p[i+1]+.0722*p[i+2];};
  return regions.map(r=>{let energy=0,count=0;const left=Math.max(1,Math.floor(r.x-r.radius)),right=Math.min(image.width-2,Math.ceil(r.x+r.radius)),top=Math.max(1,Math.floor(r.y-r.radius)),bottom=Math.min(image.height-2,Math.ceil(r.y+r.radius));for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){energy+=Math.abs(lum(x+1,y)-lum(x,y))+Math.abs(lum(x,y+1)-lum(x,y));count++;}return {name:r.name,gradient:energy/Math.max(1,count),pixels:count};});
 },{data:png.toString('base64'),regions});
}
async function projected(page,points){return page.evaluate(points=>{const r=document.querySelector('.room').getBoundingClientRect(),scale=r.width/1536;return points.map(p=>{const q=document.querySelector('.room-fit').depthView.project(p);return {source:p,room:q,screen:{x:r.x+q[0]*scale,y:r.y+q[1]*scale},affine:{x:r.x+p[0]*scale,y:r.y+p[1]*scale}};});},points);}
// Runtime interface adapters are intentionally limited to observation; all camera/focus input uses real browser events.
async function focusCase(browser){
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage();
 try{
  await page.goto(base+'?lang=en');await page.waitForFunction(()=>document.querySelector('.room-fit').depthView?.snapshot?.backend==='active');await settle(page);
  const mapped=await projected(page,[[400,350],[800,830],[1220,340]]);
  const regions=[{name:'outside',...mapped[0].screen,radius:45},{name:'rug',...mapped[1].screen,radius:50}];
  await page.mouse.move(mapped[0].screen.x,mapped[0].screen.y);await settle(page);
  const farState=await state(page),far=await page.screenshot({style:".contour{fill:transparent!important;transition:none!important}"});fs.writeFileSync(path.join(out,'focus-far-door.png'),far);
  await page.mouse.move(mapped[2].screen.x,mapped[2].screen.y);await settle(page);
  const nearState=await state(page),nearImage=await page.screenshot({style:".contour{fill:transparent!important;transition:none!important}"});fs.writeFileSync(path.join(out,'focus-nearer-bookcase.png'),nearImage);
  assert(farState.focus+.15<nearState.focus,'Focus follows distinct depths, not a fixed blur');
  near(farState.focus,farState.target,.005,'Far focus settled');near(nearState.focus,nearState.target,.005,'Nearer focus settled');
  const farStats=await imageStats(page,far,regions),nearStats=await imageStats(page,nearImage,regions);
  checks.push({name:'focus-measurements',farState,nearState,farStats,nearStats});
  assert(farStats[0].gradient>nearStats[0].gradient*1.05,'Outside detail sharpens when focused farther');
  assert(nearStats[1].gradient>farStats[1].gradient*1.2,'Nearer rug detail sharpens with nearer focus');
  const draws=nearState.draws;await page.waitForTimeout(700);assert.equal((await state(page)).draws,draws,'GPU stops drawing once focus settles');
  checks.push({name:'depth-of-field',farState,nearState,farStats,nearStats,idleDraws:0});
 }finally{await context.close();}
}
async function gpuCase(browser,viewport,mobile){
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page),name=viewport.width+'x'+viewport.height;
 try{
  await page.goto(base+'?lang=ru');await page.waitForFunction(()=>document.querySelector('.room-fit').depthView?.snapshot?.backend==='active');await settle(page);await fill(page);await capture(page,name+'-depth-initial');
  const before=await state(page);assert.equal(before.backend,'active','Actual GPU renderer active');
  await page.evaluate(()=>{window.depthFrameIntervals=[];let last;const tick=now=>{if(last)window.depthFrameIntervals.push(now-last);last=now;window.depthFrameRequest=requestAnimationFrame(tick);};window.depthFrameRequest=requestAnimationFrame(tick);});
  const points=[[400,350],[210,390],[780,830]],baseline=await projected(page,points);
  if(mobile)await pinch(cdp,{x:viewport.width*.5,y:viewport.height*.5});else{await page.mouse.move(viewport.width/2,viewport.height/2);await page.mouse.wheel(0,-200);}
  await settle(page);await fill(page);
  for(const direction of [1,-1]){
   for(let i=0;i<8;i++){
    const a={x:viewport.width*(direction===1?.25:.75),y:viewport.height*.72},b={x:viewport.width*(direction===1?.75:.25),y:a.y};
    if(mobile)await touchDrag(cdp,a,b);else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();}
   }
   await settle(page);await fill(page);assert.equal(new URL(page.url()).pathname,new URL(base).pathname,'Native drag does not navigate');
   const alignment=await contours(page);assert(alignment.every(x=>x.worstScreenPixels<5),'Projected contours remain registered');
   checks.push({name:name+(direction===1?'-left':'-right'),alignment,projection:await projected(page,points),state:await state(page)});await capture(page,name+(direction===1?'-depth-left':'-depth-right'));
   await page.emulateMedia({reducedMotion:'reduce'});await settle(page);assert.equal((await state(page)).backend,'reduced-motion');await capture(page,name+(direction===1?'-flat-left':'-flat-right'));
   await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.querySelector('.room-fit').depthView.snapshot.backend==='active');await settle(page);
  }
  const intervals=await page.evaluate(()=>{cancelAnimationFrame(window.depthFrameRequest);return window.depthFrameIntervals.slice(5);});intervals.sort((a,b)=>a-b);checks.push({name:name+'-frame-cost',frames:intervals.length,p95:intervals[Math.floor(intervals.length*.95)],max:intervals.at(-1),measurement:'Chrome on host with mobile viewport emulation, including capture/test overhead; not physical-phone GPU time'});
  const after=await projected(page,points);const delta=after.map((p,i)=>({x:(p.screen.x-p.affine.x)-(baseline[i].screen.x-baseline[i].affine.x),y:(p.screen.y-p.affine.y)-(baseline[i].screen.y-baseline[i].affine.y)}));
  const differential=Math.hypot(delta[0].x-delta[2].x,delta[0].y-delta[2].y);assert(differential>=3,'Near/far movement is visibly depth-dependent, not only affine pan');
  checks.push({name:name+'-parallax',differentialPixels:differential,baseline,after});
  if(mobile){await page.setViewportSize({width:viewport.height,height:viewport.width});await settle(page);await fill(page);const alignment=await contours(page);assert(alignment.every(x=>x.worstScreenPixels<5),'Contours remain aligned after rotation');assert.equal((await state(page)).backend,'active');await capture(page,name+'-depth-rotated');checks.push({name:name+'-rotation',alignment,passed:true});}
  // Pointer/touch navigation uses warped native anchor hit regions after movement.
  for(const id of ['door-link','bookcase-link']){
   await page.goto(base+'?lang=ru');await page.waitForFunction(()=>document.querySelector('.room-fit').depthView?.snapshot?.backend==='active');await reveal(page,id);
   const point=(await projected(page,[id==='door-link'?[350,360]:[1220,340]]))[0].screen;
   assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('a')?.id,point),id,'Projected artwork and hit region agree');
   if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
   await page.waitForURL(new URL((id==='door-link'?'storyboard/atlas-webgpu.html':'storyboard/library.html')+'?lang=ru',base).href);
  }
  assert.deepEqual(errors,[]);checks.push({name:name+'-GPU',passed:true,errors});
 }finally{await context.close();}
}
async function fallbackCase(browser,mode){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='reduced-motion'?'reduce':'no-preference'}),page=await context.newPage();
 try{
  if(mode==='missing-depth')await page.route('**/room-depth-v1.webp*',route=>route.abort());
  if(mode==='no-gpu')await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2')return null;return original.call(this,type,...args);};});
  await page.goto(base+'?lang=es');await page.locator('.room-art').evaluate(image=>image.decode());await settle(page);
  if(mode==='context-loss'){
   await page.waitForFunction(()=>document.querySelector('.room-fit').depthView?.snapshot?.backend==='active');
   await page.evaluate(()=>{const canvas=document.querySelector('.room-depth'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl.getExtension('WEBGL_lose_context');if(!extension)throw Error('WEBGL_lose_context unavailable');extension.loseContext();});await settle(page);
  }
  await fill(page);const snapshot=await state(page);assert(snapshot?.backend!=='active','Fallback does not claim active depth rendering');
  assert.equal(await page.locator('.room-art').evaluate(image=>getComputedStyle(image).opacity),'1','Fallback image opaque');
  assert.equal(await page.locator('.room-art').evaluate(image=>getComputedStyle(image).visibility),'visible','Fallback image visible');
  await capture(page,'fallback-'+mode);await reveal(page,'bookcase-link');const r=await page.locator('#bookcase-link').boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await page.waitForURL(new URL('storyboard/library.html?lang=es',base).href);
  checks.push({name:mode,passed:true,snapshot});
 }finally{await context.close();}
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 await focusCase(browser);
 for(const [viewport,mobile]of[[{width:1440,height:900},false],[{width:390,height:844},true],[{width:320,height:568},true]])await gpuCase(browser,viewport,mobile);
 for(const mode of ['missing-depth','no-gpu','context-loss','reduced-motion'])await fallbackCase(browser,mode);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({base,checks},null,2)+'\n');
}catch(error){fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({base,checks,error:String(error.stack||error)},null,2)+'\n');throw error;}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
