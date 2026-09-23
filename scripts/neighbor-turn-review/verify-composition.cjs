#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const review=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
  try{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    const context=await browser.newContext({viewport,isMobile:viewport.width===390,hasTouch:viewport.width===390});
    const page=await context.newPage(),errors=[],failed=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push({file:r.url().split('/').pop(),error:r.failure()?.errorText}));
    await page.goto(pathToFileURL(path.join(review,'index.html')).href);
    await page.waitForFunction(()=>window.compositionReview?.state.loaded&&window.compositionReview.state.draws>1);
    assert.equal(await page.locator('#composition-play svg').count(),1,'Pause icon must render');
    const rect=await page.locator('#composition').boundingBox();
    assert(rect.y>=0&&rect.y+rect.height<=viewport.height,'Composition must fit first viewport');
    const phaseRect=await page.locator('#composition-phase').boundingBox();
    assert(phaseRect.y+phaseRect.height<=viewport.height,'Phase must fit first viewport');
    const phases=await page.evaluate(async()=>{
      const seen=[];const start=performance.now();
      while(performance.now()-start<4300){const s=window.compositionReview.state;if(seen.at(-1)!==s.clip)seen.push(s.clip);await new Promise(r=>setTimeout(r,20));}
      return seen;
    });
    assert(phases.includes('loop000')&&phases.includes('turn000015')&&phases.includes('loop015')&&phases.includes('turn015000'));
    for(let i=1;i<phases.length;i++)assert.equal(phases[i],['loop000','turn000015','loop015','turn015000'][(['loop000','turn000015','loop015','turn015000'].indexOf(phases[i-1])+1)%4]);
    await page.screenshot({path:path.join(out,`${viewport.width}-composition.png`)});
    const press=async selector=>viewport.width===390?page.locator(selector).tap():page.locator(selector).click();
    await press('#composition-play');
    const paused=await page.evaluate(()=>window.compositionReview.state);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>window.compositionReview.state.elapsed),paused.elapsed);
    assert.equal(await page.evaluate(()=>window.compositionReview.state.rafActive),false);
    await press('#composition-play');
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!window.compositionReview.state.visible&&!window.compositionReview.state.rafActive);
    const hidden=await page.evaluate(()=>window.compositionReview.state.elapsed);
    await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>window.compositionReview.state.elapsed),hidden);
    let headingControl=false;
    if(await page.locator('#demo').count()){
      await page.locator('#demo').scrollIntoViewIfNeeded();
      await press('[data-heading="015"]');await press('#play');
      await page.waitForFunction(()=>window.neighborReview.state.clip==='loop015');
      await page.evaluate(()=>window.neighborReview.setPlaying(false));headingControl=true;
    }else{
      const href=await page.locator('#interactive-link').getAttribute('href');assert(fs.existsSync(path.resolve(review,href)));
      assert.equal(await page.evaluate(()=>Boolean(window.neighborReview)),false);
      assert.equal(await page.evaluate(()=>window.compositionReview.state.cache.decoded),4);
      assert.equal(await page.evaluate(()=>window.compositionReview.state.cache.requests),4);
      assert.equal(await page.locator('canvas').count(),1);
    }
    await page.locator('#composition').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>window.compositionReview.state.rafActive);
    await page.locator('img').evaluateAll(list=>Promise.all(list.map(img=>img.decode())));
    const green=await page.locator('#green-trial').count(),media=[];
    if(green){
      const proof=JSON.parse(fs.readFileSync(path.join(review,'green-provenance.json')));
      assert.equal(await page.locator('.green-video-prompt').textContent(),proof.videoPrompt);
      assert.equal(await page.locator('.green-image-prompt').textContent(),proof.imagePrompt);
      const posters=await page.locator('#green-trial video').evaluateAll(videos=>Promise.all(videos.map(async v=>{
        if(!v.poster)return null;const image=new Image();image.src=v.poster;await image.decode();return [image.naturalWidth,image.naturalHeight];
      })));
      if(posters.some(Boolean)){
        assert(posters.every(p=>p&&p[0]===1280&&p[1]===720));
        await page.locator('#green-trial .pair').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(out,`${viewport.width}-posters.png`)});
      }
      for(const video of await page.locator('#green-trial video').all()){
        await video.scrollIntoViewIfNeeded();
        const state=await video.evaluate(async v=>{
          await v.play();v.currentTime=Math.max(0,v.duration-.2);let last=v.currentTime,wrapped=false;
          const start=performance.now();while(performance.now()-start<1800&&!wrapped){await new Promise(r=>setTimeout(r,30));wrapped=v.currentTime<last-.1;last=v.currentTime;}
          const result={width:v.videoWidth,height:v.videoHeight,loop:v.loop,muted:v.muted,autoplay:v.autoplay,wrapped,error:v.error?.message||null};v.pause();return result;
        });
        assert(state.width>0&&state.loop&&state.muted&&!state.autoplay&&state.wrapped&&!state.error);media.push(state);
        await video.evaluate(v=>v.play());await page.locator('#composition').scrollIntoViewIfNeeded();
        await page.waitForFunction(v=>v.paused,await video.elementHandle());
      }
      await page.locator('#green-trial .pair').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(out,`${viewport.width}-green.png`)});
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    results.push({viewport,firstScreenCanvas:rect,autoplay:true,phases,pauseAndOffscreen:true,headingControl,interactiveLink:!headingControl,greenComparison:Boolean(green),media,imagesDecoded:true,noOverflow:true,errors,failed});
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');
    await context.close();
  }}finally{await browser.close();}
  console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
