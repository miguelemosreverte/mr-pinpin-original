'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const output=process.env.ATLAS_WALK_OUTPUT || '/tmp/atlas-natural-walk';
const mode=process.env.ATLAS_WALK_MODE || 'natural';
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  let context,video;
  try {
    context=await browser.newContext({viewport:{width:1100,height:820},
      recordVideo:{dir:output,size:{width:1100,height:820}}});
    await context.addInitScript(()=>localStorage.setItem('pinpin.atlas.motion.v1','paused'));
    const page=await context.newPage();video=page.video();
    await page.goto('http://127.0.0.1:8767/storyboard/atlas-webgpu.html?spriteMode='+mode);
    await page.waitForFunction(()=>window.atlasGpuDebug?.motion.spriteLayer?.ready && atlasGpuDebug.renderer.stats.draws>0);
    await page.evaluate(()=>{
      atlasGpuDebug.motion.placeAtLocation('bridge');
      atlasGpuDebug.camera.focus([1380,780],3);
    });
    await page.clock.install();
    await page.evaluate(()=>{
      atlasGpuDebug.motion.toggle();
      atlasGpuDebug.motion.setTarget([1310/1536,819.750327/1024]);
    });
    let arrived=false;
    for(let i=0;i<100;i++) {
      await page.clock.fastForward(250);
      arrived=await page.evaluate(()=>atlasGpuDebug.motionCanvas.dataset.arrived==='true');
      if(arrived)break;
    }
    if(!arrived)throw Error('Preview start was not reached');
    await page.clock.resume();
    await page.evaluate(()=>atlasGpuDebug.motion.setTarget([1505.000448/1536,750/1024]));
    await page.waitForTimeout(7500);
    await page.evaluate(()=>atlasGpuDebug.motion.setTarget([1310/1536,819.750327/1024]));
    await page.waitForTimeout(4500);
    await context.close();context=null;
    const source=await video.path(),destination=path.join(output,mode+'-walk.mp4');
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-sseof','-12','-i',source,
      '-an','-vf','fps=30','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',destination]);
    fs.unlinkSync(source);
    console.log(destination);
  } finally {if(context)await context.close();await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
