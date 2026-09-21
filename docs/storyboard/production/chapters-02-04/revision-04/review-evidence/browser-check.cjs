const fs=require('fs');
const path=require('path');
const {chromium}=require('/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const repo='/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-cover-standard';
const out=__dirname;
const base='http://127.0.0.1:8782/storyboard/review/chapter-workshop.html';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const results=[];
 for(const chapter of (process.env.CHAPTER?[process.env.CHAPTER]:['elder'])){
  const manifest=JSON.parse(fs.readFileSync(path.join(repo,'docs/storyboard/production/chapters-02-04/revision-04',chapter,'chapter.json')));
  for(const width of [1440,390])for(const lang of ['ru','en','es'])for(const view of ['reading','preproduction','production']){
   const page=await browser.newPage({viewport:{width,height:1000}}), errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`${base}?revision=4&chapter=${chapter}&lang=${lang}&view=${view}`);
   await page.waitForSelector(view==='reading'?'.reading-scene':view==='production'?'.production-scene':'.reference-card');
   await page.evaluate(async()=>{const imgs=[...document.images];imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});
   const check=await page.evaluate(()=>({lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth,images:document.images.length,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src),pending:document.querySelectorAll('.picture-frame.pending').length,ids:[...document.querySelectorAll('[data-scene]')].map(e=>e.dataset.scene),distorted:[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width>0&&r.height>0&&Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)>.015;}).map(i=>i.src),metadata:document.querySelectorAll('.production-notes').length}));
   const issues=[];
   if(check.lang!==lang)issues.push('wrong language');
   if(check.overflow)issues.push('horizontal overflow');
   if(check.broken.length||check.pending)issues.push('missing image');
   if(check.distorted.length)issues.push('distorted image');
   if(view!=='preproduction'&&JSON.stringify(check.ids)!==JSON.stringify(manifest.scenes.map(s=>s.id)))issues.push('scene order');
   if(view==='reading'&&check.metadata)issues.push('metadata in reading');
   if(errors.length)issues.push('JavaScript errors');
   if(lang==='ru'&&(view==='reading'||view==='preproduction')){
    await page.screenshot({path:path.join(out,`${chapter}-${width}-${view}.png`)});
    if(view==='reading'){await page.locator('.reading-scene').last().scrollIntoViewIfNeeded();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,`${chapter}-${width}-ending.png`)});}
   }
   results.push({chapter,width,lang,view,...check,errors,issues});
   console.log(`${chapter} ${width} ${lang} ${view}: ${issues.length?issues.join(', '):'PASS'} (${check.images} images)`);
   await page.close();
  }
 }
 await browser.close();
 const report={checkedAt:new Date().toISOString(),cases:results.length,passed:results.filter(x=>!x.issues.length).length,results};
 fs.writeFileSync(path.join(out,process.env.CHAPTER?`${process.env.CHAPTER}-browser-results.json`:'browser-results.json'),JSON.stringify(report,null,2)+'\n');
 if(report.passed!==report.cases)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
