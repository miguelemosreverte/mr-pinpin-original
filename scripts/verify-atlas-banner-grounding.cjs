const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base=process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const output=process.env.ATLAS_GROUNDING_OUTPUT || '/tmp/atlas-banner-v9-grounding';

(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true}), results=[];
  try {
    for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]) {
      const page=await browser.newPage({viewport,isMobile:viewport.width<600,hasTouch:viewport.width<600,reducedMotion:'reduce'});
      const errors=[]; page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>localStorage.setItem('pinpin.atlas.motion.v1','paused'));
      await page.goto(base+'atlas-webgpu.html?lang=en');
      await page.waitForFunction(()=>window.atlasGpuDebug?.covers.loaded && atlasGpuDebug.renderer?.stats.banner.ready);
      await page.evaluate(()=>{
        const d=atlasGpuDebug,s=d.camera.snapshot;
        d.motion.placeAtLocation('bridge');d.camera.focus([1360,720],2*Math.max(s.width/1536,s.height/1024));
      });
      await page.waitForFunction(()=>!atlasGpuDebug.moving && atlasGpuDebug.covers.selected==='bridge');
      await page.waitForTimeout(300);
      const label=viewport.width+'x'+viewport.height;
      await page.screenshot({path:path.join(output,label+'-default.png')});
      // Disable the lens only for geometric inspection; retain a default-lens screenshot above.
      await page.evaluate(()=>atlasGpuDebug.renderer.setBokehStrength(0));
      await page.waitForTimeout(150);
      const enabled=await page.screenshot({path:path.join(output,label+'-grounding.png')});
      const state=await page.evaluate(()=>{
        const d=atlasGpuDebug,e=d.covers.entries.find(e=>e.id==='bridge'),p=e.surfacePlacement,o=e.object;
        const normal=o.ring.position.clone().set(0,0,1).applyQuaternion(o.ring.quaternion);
        const tangent=o.ring.position.clone().set(0,1,0).applyQuaternion(o.ring.quaternion);
        const cover=o.cover.position.clone().set(0,0,1).applyQuaternion(o.pivot.quaternion);
        return {backend:d.renderer.backend,score:e.surfaceVisibility,foot:[p.anchor[0]*1536+p.offset[0],p.anchor[1]*1024+p.offset[1]],
          normal:normal.toArray(),tangent:tangent.toArray(),cover:cover.toArray(),elevation:p.elevation,
          depth:e.objectDepth,lensDepth:e.lensDepth,gpu:e.button.dataset.gpuRendering,
          dotPositions:o.dots.map(dot=>dot.position.toArray()),pivot:o.pivot.position.toArray()};
      });
      assert.equal(state.backend,'webgpu');assert.equal(state.gpu,'true');assert(state.score>=.9);
      assert(state.foot[1]===720 && Math.abs(state.foot[0]-1360)<=24,'Readability adjustment stays in the reserved ground footprint');
      assert(state.normal[1]>.85 && state.normal[2]>.25 && state.normal[2]<.55,'Ring is a ground ellipse');
      assert(state.tangent[1]>0 && state.tangent[2]<0,'Upper ring edge recedes away from camera');
      assert(state.cover[2]>.97,'Cover remains vertical and viewer-facing');
      assert(state.dotPositions.every(dot=>dot[0]===0 && dot[2]===0 && dot[1]>0 && dot[1]<state.pivot[1]),'Dots retain the ground anchor');
      await page.evaluate(()=>atlasGpuDebug.renderer.setOcclusion(false));
      await page.waitForTimeout(150);
      const disabled=await page.screenshot({path:path.join(output,label+'-occlusion-disabled.png')});
      const changed=await page.evaluate(async images=>{
        const rgba=await Promise.all(images.map(async src=>{const image=new Image();image.src='data:image/png;base64,'+src;await image.decode();
          const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
          const context=canvas.getContext('2d');context.drawImage(image,0,0);return context.getImageData(0,0,image.width,image.height).data;}));
        let count=0;for(let i=0;i<rgba[0].length;i+=4)if(Math.abs(rgba[0][i]-rgba[1][i])+Math.abs(rgba[0][i+1]-rgba[1][i+1])+Math.abs(rgba[0][i+2]-rgba[1][i+2])>30)count++;
        return count;
      },[enabled.toString('base64'),disabled.toString('base64')]);
      assert(changed>100,'Real GPU output changes when shared terrain occlusion is disabled');
      assert.deepEqual(errors,[]);results.push({viewport,...state,occlusionChangedPixels:changed});
      console.log('PASS '+label+' calibrated ground basis, upright cover, dots, visibility and GPU occlusion');
      await page.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
