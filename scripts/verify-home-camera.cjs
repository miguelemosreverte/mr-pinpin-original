/* Real Chrome touch/mouse verification; keep screenshots outside the checkout. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=new URL(process.env.HOME_URL || 'http://127.0.0.1:8789/');
const out=process.env.VERIFICATION_DIR;
if (!out) throw Error('Set VERIFICATION_DIR to an external evidence directory');
fs.mkdirSync(out,{recursive:true});
const results=[];
const close=(a,b,label,tolerance=2)=>assert(Math.abs(a-b)<=tolerance,`${label}: ${a} != ${b}`);
async function measure(page) {
  return page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    return {room:rect('.room'),art:rect('.room-art'),links:rect('.room-links'),flags:rect('.language-picker'),
      width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
      browserScale:visualViewport.scale,lang:document.documentElement.lang,camera:document.querySelector('.room-fit').cameraState};
  });
}
async function filled(page) {
  const m=await measure(page);
  assert(m.art.x<=1&&m.art.y<=1&&m.art.right>=m.width-1&&m.art.bottom>=m.height-1,'Artwork fills viewport without empty bands');
  close(m.art.width/m.art.height,m.camera.world.width/m.camera.world.height,'Artwork native aspect',.001);
  for(const field of ['x','y','width','height'])close(m.art[field],m.links[field],'SVG registration '+field,.2);
  assert(m.scrollWidth<=m.width&&m.scrollHeight<=m.height,'No document overflow');
  close(m.browserScale,1,'Browser viewport remains unzoomed',.01);
  assert(m.flags.x>=0&&m.flags.y>=0&&m.flags.right<=m.width&&m.flags.bottom<=m.height,'Flags remain inside viewport');
  return m;
}
async function home(page,lang) {
  const url=new URL(base);url.searchParams.set('lang',lang);
  await page.goto(url.href);
  await page.locator('.room-art').evaluate(image=>image.decode());
  await page.waitForFunction(()=>document.querySelector('.room-fit').cameraState);
  await page.waitForTimeout(100);
  return filled(page);
}
async function drag(cdp,from,to) {
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...from}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function pinch(cdp,anchor,start,end) {
  const points=radius=>[{id:1,x:anchor.x-radius,y:anchor.y},{id:2,x:anchor.x+radius,y:anchor.y}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(start)});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(start+(end-start)*i/8)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function keyboardReveal(page,id) {
  for(let i=0;i<10;i++) {
    await page.keyboard.press('Tab');
    if(await page.evaluate(id=>document.activeElement?.id===id,id))break;
  }
  assert(await page.evaluate(id=>document.activeElement?.id===id,id),'Keyboard reaches '+id);
  await page.waitForTimeout(100);
  const visibility=await page.locator('#'+id).evaluate(node=>{const r=node.getBoundingClientRect();return {visible:Math.max(0,Math.min(innerWidth,r.right)-Math.max(0,r.x))*Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.y)),area:r.width*r.height};});
  assert(visibility.visible/visibility.area>.8,'Keyboard reveals cropped '+id);
  await filled(page);
}
async function hotspotPoint(page,id) {
  const point=await page.evaluate(id=>{const viewport=document.querySelector('.room-fit'),c=viewport.cameraState,a=c.anchors[id],source=[a[0]*c.world.width,a[1]*c.world.height],p=viewport.depthView?.project(source)||source;return{x:(p[0]-c.x)*c.scale+c.width/2,y:(p[1]-c.y)*c.scale+c.height/2};},id);
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('a')?.id,point),id,'Visible touch target matches artwork');
  return point;
}
async function verify(viewport,lang,mobile) {
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const cdp=await context.newCDPSession(page),name=viewport.width+'x'+viewport.height;
  try {
    const initial=await home(page,lang),coverWidth=Math.max(viewport.width/initial.camera.world.width,viewport.height/initial.camera.world.height)*initial.camera.world.width,minimum=coverWidth*initial.camera.zoom.min;
    close(initial.room.width,coverWidth*initial.camera.zoom.initial,'Configured initial zoom');
    assert(initial.room.width>viewport.width+2&&initial.room.height>viewport.height+2,'Initial camera permits travel on both axes');
    await page.screenshot({path:path.join(out,name+'-initial.png')});
    const anchor={x:viewport.width*.5,y:viewport.height*.4};
    if(mobile)await pinch(cdp,anchor,40,60);
    else {await page.mouse.move(anchor.x,anchor.y);await page.mouse.wheel(0,-220);await page.waitForTimeout(200);}
    const zoomed=await filled(page),ratio=zoomed.room.width/initial.room.width;
    assert(ratio>1.1,'Zoom increases room scale');
    if(mobile)close(ratio,1.5,'Native pinch scale',.035);
    close((anchor.x-initial.room.x)/initial.room.width,(anchor.x-zoomed.room.x)/zoomed.room.width,'Zoom X anchor',.003);
    close((anchor.y-initial.room.y)/initial.room.height,(anchor.y-zoomed.room.y)/zoomed.room.height,'Zoom Y anchor',.003);
    for(const field of ['x','y','width','height'])close(initial.flags[field],zoomed.flags[field],'Fixed flags '+field,.2);
    // Drive both pan bounds. Floor swipes avoid the fixed flags and make no link activation.
    for(const direction of [1,-1]) {
      for(let i=0;i<10;i++) {
        const from={x:viewport.width*(direction===1?.2:.8),y:viewport.height*.75};
        const to={x:viewport.width*(direction===1?.8:.2),y:from.y};
        if(mobile)await drag(cdp,from,to);
        else {await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
      }
      const m=await filled(page);
      close(direction===1?m.room.x:m.room.right,direction===1?0:m.width,'Horizontal pan reaches boundary');
      await page.screenshot({path:path.join(out,name+(direction===1?'-left.png':'-right.png'))});
      assert.equal(new URL(page.url()).pathname,base.pathname,'Panning does not navigate');
    }
    for(const direction of [1,-1]) {
      for(let i=0;i<8;i++) {
        const from={x:viewport.width*.5,y:viewport.height*(direction===1?.25:.7)};
        const to={x:from.x,y:viewport.height*(direction===1?.7:.25)};
        if(mobile)await drag(cdp,from,to);
        else {await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
      }
      const m=await filled(page);
      close(direction===1?m.room.y:m.room.bottom,direction===1?0:m.height,'Vertical pan reaches boundary');
    }
    if(mobile) {
      for(let i=0;i<3;i++)await pinch(cdp,anchor,20,100);
      close((await filled(page)).room.width,coverWidth*initial.camera.zoom.max,'Maximum zoom clamp',3);
      for(let i=0;i<4;i++)await pinch(cdp,anchor,100,20);
    } else {await page.mouse.wheel(0,100000);await page.waitForTimeout(100);}
    const minimumView=await filled(page);
    close(minimumView.room.width,minimum,'Configured minimum zoom clamp');
    assert(minimumView.room.width>viewport.width+2&&minimumView.room.height>viewport.height+2,'Both axes remain pannable at minimum zoom');
    // An actual touch drag starting on each link cannot follow that link.
    for(const id of ['door-link','bookcase-link']) {
      await home(page,lang);await keyboardReveal(page,id);
      const p=await hotspotPoint(page,id),to={x:p.x+(id==='door-link'?-55:55),y:p.y+20};
      if(mobile)await drag(cdp,p,to);
      else {await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
      await page.waitForTimeout(150);
      assert.equal(new URL(page.url()).pathname,base.pathname,'Hotspot drag does not activate '+id);
      await filled(page);
      // A subsequent ordinary tap still follows the localized destination.
      const tap=await hotspotPoint(page,id);
      const expected=new URL(id==='door-link'?'storyboard/atlas-webgpu.html':'storyboard/library.html',base);expected.searchParams.set('lang',lang);
      if(mobile)await page.touchscreen.tap(tap.x,tap.y);else await page.mouse.click(tap.x,tap.y);
      await page.waitForURL(expected.href);
    }
    await home(page,lang);
    if(mobile) {
      await pinch(cdp,anchor,40,60);
      await drag(cdp,{x:viewport.width*.2,y:viewport.height*.5},{x:viewport.width*.8,y:viewport.height*.7});
      const beforeRotate=await filled(page),zoomBefore=beforeRotate.room.width/(Math.max(viewport.width/beforeRotate.camera.world.width,viewport.height/beforeRotate.camera.world.height)*beforeRotate.camera.world.width);
      await page.setViewportSize({width:viewport.height,height:viewport.width});
      await page.waitForTimeout(150);const rotated=await filled(page);
      close(rotated.room.width/(Math.max(viewport.height/rotated.camera.world.width,viewport.width/rotated.camera.world.height)*rotated.camera.world.width),zoomBefore,'Rotation retains zoom while clamping position',.02);
      await page.screenshot({path:path.join(out,name+'-rotated.png')});
    }
    for(const next of ['ru','en','es']) {
      const flag=page.locator('[data-language="'+next+'"]');
      if(mobile){const box=await flag.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}else await flag.click();
      await page.waitForFunction(lang=>document.documentElement.lang===lang,next);
      await filled(page);
      assert.equal(new URL(page.url()).searchParams.get('lang'),next);
    }
    assert.deepEqual(errors,[]);
    results.push({viewport,lang,mobile,passed:true,nativeTouch:mobile,zoomRatio:ratio,errors});
    console.log(name+' passed');
  } finally {await browser.close();}
}
(async()=>{
  try {
    for(const [viewport,lang,mobile] of [[{width:390,height:844},'ru',true],[{width:320,height:568},'en',true],[{width:844,height:390},'es',true],[{width:1440,height:900},'en',false]])await verify(viewport,lang,mobile);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({base:base.href,results},null,2)+'\n');
  } catch(error) {fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({base:base.href,results,error:String(error.stack||error)},null,2)+'\n');throw error;}
})().catch(error=>{console.error(error);process.exitCode=1;});
