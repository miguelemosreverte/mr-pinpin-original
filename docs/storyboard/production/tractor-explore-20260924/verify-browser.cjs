const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const base=process.env.PINPIN_BASE_URL||'http://127.0.0.1:8789',out=process.env.PINPIN_BROWSER_OUTPUT;
if(!out)throw Error('Set PINPIN_BROWSER_OUTPUT to external screenshot/report storage.');
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 const context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/tractor-explore.html?rev=explore-single-v1');await page.waitForFunction(()=>window.tractorExplore?.snapshot.ready);
 const state=()=>page.evaluate(()=>tractorExplore.snapshot);
 async function progress(value){await page.locator('#progress').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);await page.waitForFunction(()=>!tractorExplore.snapshot.seeking&&tractorExplore.snapshot.queuedSeek===null);}
 async function stage(){await page.locator('#stage').scrollIntoViewIfNeeded();return page.locator('#stage').boundingBox();}
 await progress(90);let box=await stage();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(40,20);
 let s=await state();assert.equal(s.mode,'snapping');assert.ok(s.snap.delta>0&&s.snap.delta<.2);assert.ok(s.queuedHead.yaw>0);assert.ok(Math.abs(s.camera.yaw-(-105*Math.PI/180))<.001);
 await page.waitForFunction(()=>tractorExplore.snapshot.mode==='look');s=await state();assert.ok(s.time<.04);assert.equal(s.queuedHead.yaw,0);assert.ok(s.camera.yaw>-105*Math.PI/180);
 await page.locator('#face').click();await page.waitForFunction(()=>getComputedStyle(document.querySelector('canvas')).opacity==='1');await page.locator('#stage').screenshot({path:out+'/anchor-look.png'});
 const client=await context.newCDPSession(page);box=await stage();const fov=(await state()).camera.fov;
 await client.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:box.x+100,y:box.y+100,deltaX:0,deltaY:-60,modifiers:2});assert.equal((await state()).mode,'look');assert.ok((await state()).camera.fov<fov);
 await progress(30);box=await stage();await page.mouse.move(box.x+200,box.y+200);await page.mouse.down({button:'right'});await page.mouse.move(box.x+280,box.y+170,{steps:5});await page.mouse.up({button:'right'});await page.waitForFunction(()=>tractorExplore.snapshot.mode==='look');assert.ok((await state()).camera.pitch<-5*Math.PI/180);
 await progress(50);box=await stage();await page.mouse.move(box.x+200,box.y+200);await page.mouse.wheel(10000,10000);s=await state();assert.equal(s.mode,'snapping');assert.ok(Math.abs(s.queuedHead.yaw)<=Math.PI&&Math.abs(s.queuedHead.pitch)<=Math.PI/2);
 await page.mouse.down();await page.mouse.move(box.x+250,box.y+200,{steps:3});await page.mouse.up();assert.equal((await state()).mode,'orbit');await page.waitForTimeout(1400);assert.equal((await state()).mode,'orbit');
 await page.evaluate(()=>scrollTo(0,0));const y=await page.evaluate(()=>scrollY);await page.mouse.move(3,80);await page.mouse.wheel(0,250);await page.waitForTimeout(150);assert.ok((await page.evaluate(()=>scrollY))>y);assert.equal((await state()).mode,'orbit');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);results.push({desktop:'pass',queuedUntilArrival:true,shortestWrap:true,rightDrag:true,ctrlWheelZoom:true,cancellation:true,outsideScroll:true});await context.close();
 const mobile=await browser.newContext({viewport:{width:390,height:900},isMobile:true,hasTouch:true}),p=await mobile.newPage();await p.goto(base+'/tractor-explore.html');await p.waitForFunction(()=>window.tractorExplore?.snapshot.ready);const c=await mobile.newCDPSession(p);
 const ss=()=>p.evaluate(()=>tractorExplore.snapshot);async function set(v){await p.locator('#progress').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},v);await p.waitForFunction(()=>!tractorExplore.snapshot.seeking&&tractorExplore.snapshot.queuedSeek===null);}
 await set(20);await p.locator('#stage').scrollIntoViewIfNeeded();box=await p.locator('#stage').boundingBox();const y0=box.y+80,x=box.x+90;
 await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0,id:0}]});await p.waitForTimeout(130);await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y:y0,id:0}]});assert.ok((await ss()).progress>.25);
 await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+40,y:y0,id:0},{x:x+150,y:y0,id:1}]});s=await ss();assert.equal(s.mode,'snapping');assert.ok(Math.abs(s.snap.from-.2)<.005);
 await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+55,y:y0-15,id:0},{x:x+165,y:y0-15,id:1}]});await p.waitForFunction(()=>tractorExplore.snapshot.mode==='look');
 await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:x+55,y:y0-15,id:0}]});assert.equal((await ss()).gestures.pointers,1);assert.equal((await ss()).gestures.kind,'blocked');
 await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+90,y:y0-15,id:0}]});assert.equal((await ss()).mode,'look');await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await p.locator('#face').click();await p.waitForFunction(()=>getComputedStyle(document.querySelector('canvas')).opacity==='1');await p.screenshot({path:out+'/mobile-look.png'});await p.locator('#stage').scrollIntoViewIfNeeded();box=await p.locator('#stage').boundingBox();await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+80,y:box.y+80,id:0}]});await p.waitForTimeout(130);await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+180,y:box.y+80,id:0}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await ss()).mode,'orbit');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));results.push({mobile:'pass',twoNativeTouches:true,firstFingerOriginRestored:true,remainingFingerSuppressed:true,oneFingerReturnsOrbit:true});await mobile.close();
 const reduced=await browser.newContext({reducedMotion:'reduce'}),r=await reduced.newPage();await r.goto(base+'/tractor-explore.html');await r.waitForFunction(()=>window.tractorExplore?.snapshot.ready);await r.locator('#look').click();await r.waitForFunction(()=>tractorExplore.snapshot.mode==='look');assert.equal(await r.evaluate(()=>tractorExplore.snapshot.snap.duration),0);results.push({reducedMotion:'pass'});await reduced.close();
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log('PASS wheel/right drag, queued short-path snap, cancellation, ctrl zoom, native two-touch promotion/release, outside scrolling and reduced motion');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
