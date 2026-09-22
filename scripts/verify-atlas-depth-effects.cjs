const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const directory = '/tmp/pinpin-depth-effects';

async function capture(page, name) {
  const png = await page.locator('#world-canvas').screenshot({path:`${directory}/${name}.png`});
  return page.evaluate(async encoded => {
    const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
    const ctx=canvas.getContext('2d'); ctx.drawImage(image,0,0);
    const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
    let energy=0, count=0;
    for (let y=1;y<canvas.height-1;y++) for (let x=1;x<canvas.width-1;x++) {
      const i=(y*canvas.width+x)*4;
      energy+=Math.abs(data[i]-data[i+4])+Math.abs(data[i]-data[i+canvas.width*4]); count++;
    }
    return {energy:energy/count, width:canvas.width,height:canvas.height};
  },png.toString('base64'));
}

(async () => {
  fs.mkdirSync(directory,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[];
  try {
    for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
      const mobile=viewport.width<600;
      const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
      await context.addInitScript(() => localStorage.setItem('pinpin.atlas.motion.v1','paused'));
      const page=await context.newPage(), errors=[];
      page.on('pageerror',error => errors.push(error.message));
      await page.goto(base+'atlas-webgpu.html?lang=en&returnPlace=lake');
      await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.backend==='webgpu' && atlasGpuDebug.covers.loaded);
      await page.evaluate(() => atlasGpuDebug.camera.fit());
      assert.equal(await page.locator('.atlas-debug').isVisible(),false);
      await page.locator('#world-canvas').focus(); await page.keyboard.press('Tab');
      if (mobile) {
        assert.equal(await page.locator('.atlas-debug').isVisible(),false,'Debug panel stays absent on touch phones');
        await page.screenshot({path:`${directory}/mobile.png`});
        results.push({viewport,debugHidden:true,errors});
      } else {
        await page.locator('.atlas-debug').waitFor({state:'visible'});
        const range=page.getByRole('slider',{name:'Bokeh strength'}), states=[];
        for (const value of [0,1,4]) {
          await range.evaluate((input,value) => {
            input.value=String(value);
            input.dispatchEvent(new Event('input',{bubbles:true}));
            input.dispatchEvent(new Event('change',{bubbles:true}));
          },value);
          await page.waitForFunction(value => atlasGpuDebug.renderer.stats.dof.strength===value,value);
          await page.waitForTimeout(2400);
          const pixels=await capture(page,`bokeh-${value}`);
          const stats=await page.evaluate(() => atlasGpuDebug.renderer.stats.dof);
          assert(stats.slices<=4 && stats.sliceBytes<=24*1024*1024,'Bokeh cache stays bounded');
          states.push({value,pixels,stats});
        }
        assert(states[2].pixels.energy<states[0].pixels.energy*.95,'Maximum bokeh visibly reduces fine edge detail');
        assert(states[2].pixels.energy<states[1].pixels.energy,'Maximum is stronger than original bokeh');
        await page.screenshot({path:`${directory}/desktop-debug.png`});
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.atlas-debug').isVisible(),false);
        await page.reload();
        await page.waitForFunction(() => atlasGpuDebug.renderer?.stats.dof?.strength===4);
        results.push({viewport,states,sessionRestored:true,errors});
      }
      assert.deepEqual(errors,[]);
      await context.close();
    }
    fs.writeFileSync(`${directory}/results.json`,JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results,null,2));
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
