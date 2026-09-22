'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const output=process.env.ATLAS_NATURAL_OUTPUT || '/tmp/atlas-natural-walk';
const url=process.env.ATLAS_NATURAL_URL || 'http://127.0.0.1:8767/storyboard/atlas-webgpu.html?spriteMode=natural';
const reports=[];
async function state(page) {
  return page.evaluate(()=>{
    const d=atlasGpuDebug,l=d.motion.spriteLayer,s=d.motionCanvas.dataset;
    return {...s,x:Number(s.x),y:Number(s.y),direction:Number(s.direction),heading:Number(s.heading),
      revision:l.revision,footY:l.footY,key:l.imageKey,backend:d.renderer.backend};
  });
}
async function target(page,point) {
  await page.evaluate(p=>atlasGpuDebug.motion.setTarget([p[0]/1536,p[1]/1024]),point);
}
async function arrive(page,point) {
  await target(page,point);
  for(let i=0;i<150;i++) {
    await page.clock.fastForward(250);
    const s=await state(page);
    if(s.arrived==='true' && Math.hypot(s.x-point[0],s.y-point[1])<.1)return;
  }
  throw Error('Unreachable point '+point);
}
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for(const width of [1440,390]) {
      const context=await browser.newContext({viewport:{width,height:width===390?844:1000},
        isMobile:width===390,hasTouch:width===390});
      try {
        await context.addInitScript(()=>localStorage.setItem('pinpin.atlas.motion.v1','paused'));
        const page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto(url);
        await page.waitForFunction(()=>window.atlasGpuDebug?.motion.spriteLayer?.ready &&
          atlasGpuDebug.motionCanvas.dataset.spriteMode==='natural' && atlasGpuDebug.renderer.stats.draws>0);
        await page.evaluate(()=>{
          atlasGpuDebug.motion.placeAtLocation('bridge');
          atlasGpuDebug.camera.focus([1380,785],atlasGpuDebug.camera.snapshot.width/(innerWidth<600?300:480));
        });
        await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
        await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
        await page.evaluate(()=>atlasGpuDebug.motion.toggle());
        await arrive(page,[1310,819.750327]);
        await page.clock.runFor(500);
        const samples=[],changes=[];
        const start=await state(page);
        await target(page,[1505.000448,750]);
        let previous=start,lastChange=null;
        for(let i=0;i<600;i++) {
          await page.clock.runFor(20);
          const s=await state(page),time=(i+1)*20;
          s.measuredSpeed=Math.hypot(s.x-previous.x,s.y-previous.y)*50;
          s.time=time;
          assert.equal(s.backend,'webgpu');
          assert.equal(s.spriteMode,'natural');
          assert.equal(s.footY,s.y,'depth anchor stays grounded on path');
          assert(Number.isFinite(Number(s.speed)) && Number(s.speed)>=0 && Number(s.speed)<65,
            'bounded integrated speed: '+JSON.stringify(s));
          if(s.direction!==previous.direction) {
            changes.push({time,from:previous.direction,to:s.direction,interval:lastChange===null?null:time-lastChange});
            lastChange=time;
          }
          samples.push(s);previous=s;
          if(i===80 || i===200)await page.screenshot({path:path.join(output,`${width}-walk-${i}.png`)});
          if(s.arrived==='true')break;
        }
        fs.writeFileSync(path.join(output,`${width}-samples.json`),JSON.stringify({samples,changes},null,2));
        assert.equal(samples.at(-1).arrived,'true','exact route arrival');
        assert(Math.hypot(samples.at(-1).x-1505.000448,samples.at(-1).y-750)<.1);
        const moving=samples.filter(s=>s.measuredSpeed>25 && s.time>500 && s.time<3000);
        assert(moving.length>30);
        const speeds=moving.map(s=>Number(s.speed));
        assert(Math.max(...speeds)-Math.min(...speeds)>3,'observable step rhythm, not constant translation');
        assert(changes.length>1,'curved road exercises heading changes: '+JSON.stringify(changes));
        assert(changes.every(c=>c.interval===null || c.interval>=120),'direction changes are held rather than flickering');
        await page.clock.runFor(1000);
        const settled=await state(page);
        await page.clock.runFor(1000);
        const idle=await state(page);
        assert.equal(idle.revision,settled.revision,'settled sprite stops repainting');
        assert.deepEqual([idle.x,idle.y],[settled.x,settled.y]);
        await page.screenshot({path:path.join(output,`${width}-settled.png`)});
        await page.evaluate(()=>atlasGpuDebug.motion.toggle());
        const paused=await state(page);
        await page.clock.runFor(500);
        assert.equal((await state(page)).revision,paused.revision,'pause freezes animation');
        assert.deepEqual(errors,[]);
        reports.push({width,changes,speedRange:[Math.min(...speeds),Math.max(...speeds)],samples,errors});
        console.log(JSON.stringify({width,samples:samples.length,changes,speedRange:[Math.min(...speeds),Math.max(...speeds)]}));
      } finally {await context.close();}
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(reports,null,2)+'\n');
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
