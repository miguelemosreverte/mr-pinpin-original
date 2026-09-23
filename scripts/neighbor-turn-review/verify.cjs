#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const review=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[];
  try {
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
      const mobile=viewport.width<500;
      const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
      const page=await context.newPage(),errors=[],failed=[],sheets=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('requestfailed',r=>failed.push({url:r.url().split('/').pop(),error:r.failure()?.errorText}));
      page.on('request',r=>{if(r.url().endsWith('.webp'))sheets.push(r.url().split('/').pop());});
      await page.goto(pathToFileURL(path.join(review,'index.html')).href);
      await page.waitForFunction(()=>window.neighborReview?.state.cache.decoded===1);
      const images=await page.locator('img').evaluateAll(async list=>Promise.all(list.map(async img=>{await img.decode();return [img.naturalWidth,img.naturalHeight];})));
      assert(images.length===2&&images.every(([w,h])=>w>0&&h>0));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const provenance=JSON.parse(fs.readFileSync(path.join(review,'review-provenance.json')));
      assert.deepEqual(await page.locator('.video-prompt').allTextContents(),provenance.native.map(c=>c.prompt));
      const record=provenance.assets.find(a=>a.source==='heading015-reference-v01.md');
      const {exactPrompt}=require('./build.cjs');
      assert.equal(await page.locator('.image-prompt').textContent(),exactPrompt(fs.readFileSync(path.join(review,record.output),'utf8')));
      await page.screenshot({path:path.join(out,`${viewport.width}-inputs.png`)});
      await page.locator('#sprite').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>window.neighborReview.state.visible);
      assert.equal(sheets.length,1);
      const press=async selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
      await press('[data-heading="015"]');
      await page.evaluate(()=>Promise.all([window.neighborReview.requestHeading('015'),window.neighborReview.requestHeading('015')]));
      assert.equal(sheets.length,3);assert.equal(new Set(sheets).size,3);
      await press('#play');
      await page.waitForFunction(()=>window.neighborReview.state.clip==='turn000015');
      await press('[data-heading="000"]');
      await page.waitForFunction(()=>window.neighborReview.state.clip==='turn015000');
      const chained=await page.evaluate(()=>window.neighborReview.state.history);
      const firstEnd=chained.find(e=>e.type==='turn-end');
      const secondStart=chained.filter(e=>e.type==='turn-start')[1];
      assert.equal(firstEnd.at,secondStart.at);
      await page.waitForFunction(()=>window.neighborReview.state.clip==='loop000');
      await press('[data-heading="015"]');
      await page.waitForFunction(()=>window.neighborReview.state.clip==='loop015');
      await page.screenshot({path:path.join(out,`${viewport.width}-demo.png`)});
      await press('#play');
      const paused=await page.evaluate(()=>window.neighborReview.state);
      await page.waitForTimeout(250);
      const still=await page.evaluate(()=>window.neighborReview.state);
      assert.equal(still.elapsedMs,paused.elapsedMs);assert.equal(still.draws,paused.draws);assert.equal(still.rafActive,false);
      await press('#play');
      await page.evaluate(()=>scrollTo(0,0));
      await page.waitForFunction(()=>!window.neighborReview.state.visible&&!window.neighborReview.state.rafActive);
      const hidden=await page.evaluate(()=>window.neighborReview.state);
      await page.waitForTimeout(1100);
      assert.equal(await page.evaluate(()=>window.neighborReview.state.elapsedMs),hidden.elapsedMs);
      await page.locator('#sprite').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>window.neighborReview.state.rafActive);
      await page.evaluate(()=>window.neighborReview.setPlaying(false));
      const media=[];
      for(const video of await page.locator('video').all()) {
        await video.scrollIntoViewIfNeeded();
        const proof=await video.evaluate(async v=>{
          await new Promise((resolve,reject)=>{if(v.readyState>=2)return resolve();v.addEventListener('loadeddata',resolve,{once:true});v.addEventListener('error',reject,{once:true});});
          await v.play();v.currentTime=Math.max(0,v.duration-.16);
          let last=v.currentTime,wrapped=false;
          const started=performance.now();
          while(performance.now()-started<1800&&!wrapped){await new Promise(r=>setTimeout(r,30));if(v.currentTime<last-.1)wrapped=true;last=v.currentTime;}
          const result={width:v.videoWidth,height:v.videoHeight,duration:v.duration,ready:v.readyState,loop:v.loop,muted:v.muted,autoplay:v.autoplay,wrapped,error:v.error?.message||null};v.pause();return result;
        });
        assert(proof.wrapped&&proof.loop&&proof.muted&&!proof.autoplay&&!proof.error&&proof.width===1280);media.push(proof);
      }
      assert.deepEqual(errors,[]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      results.push({viewport,images,sheetRequests:sheets,coalesced:true,immediateReturnBoundary:true,pausedAndOffscreenStopped:true,exactPrompts:true,media,errors,failed});
      fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');
      await context.close();
    }
  } finally {await browser.close();}
  console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
