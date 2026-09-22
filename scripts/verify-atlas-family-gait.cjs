const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const output='/tmp/atlas-family-gait';
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[];
  try {
    for(const width of [1280,390]) for(const variant of ['candidate','original']) {
      const page=await browser.newPage({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390});
      try {
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://127.0.0.1:8767/storyboard/atlas-webgpu.html?family=1&familyPreview=1&babySprite='+variant+'&pinpinSprite='+variant);
        await page.waitForFunction(()=>window.atlasGpuDebug?.motion.spriteLayer?.ready && atlasGpuDebug.renderer?.stats.draws>2);
        await page.clock.install();
        const frames=[new Set(),new Set(),new Set()],changes=[0,0,0];let previous=null;
        for(let i=0;i<100;i++) {
          await page.clock.runFor(20);
          const state=await page.evaluate(()=>atlasGpuDebug.motion.familyState);
          assert.equal(state.babySprite,variant);
          assert.deepEqual(state.members.map(m=>m.spriteSource),[variant==='original' ? 'original-pinpin' : 'family-candidate',
            variant==='original' ? 'original-pinpin' : 'family-candidate','family-candidate']);
          state.members.forEach((m,j)=>{
            frames[j].add(m.gaitFrame);
            if(previous && previous[j]!==m.gaitFrame)changes[j]++;
          });
          previous=state.members.map(m=>m.gaitFrame);
          if(i===35)await page.screenshot({path:`${output}/${width}-${variant}.png`});
        }
        assert(frames.every(set=>set.size===4),'Every member uses all four walking frames');
        assert(changes[1]>changes[0] && changes[0]>changes[2],'Baby steps faster and Mama steps slower');
        await page.evaluate(()=>atlasGpuDebug.motion.toggle());
        const paused=await page.evaluate(()=>({state:atlasGpuDebug.motion.familyState,revision:atlasGpuDebug.motion.spriteLayer.revision}));
        await page.clock.runFor(500);
        assert.deepEqual(await page.evaluate(()=>({state:atlasGpuDebug.motion.familyState,revision:atlasGpuDebug.motion.spriteLayer.revision})),paused);
        assert.deepEqual(errors,[]);
        const rendered=await page.evaluate(()=>({backend:atlasGpuDebug.renderer.backend,error:atlasGpuDebug.rendererError,
          count:atlasGpuDebug.renderer.stats.occlusion.memberReady}));
        assert.equal(rendered.backend,'webgpu');assert.equal(rendered.error,null);assert.equal(rendered.count,3);
        const result={width,variant,changes,frames:frames.map(s=>[...s]),errors};results.push(result);console.log(JSON.stringify(result));
      } finally {await page.close();}
    }
  } finally {await browser.close();fs.writeFileSync(output+'/results.json',JSON.stringify(results,null,2));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
