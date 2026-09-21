const fs=require('fs');
const path=require('path');
const {chromium}=require('/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const chapter=process.argv[2]||'elder';
const target=chapter==='academy'?'academy-r02-21':'elder-r5-008';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(`http://127.0.0.1:8782/storyboard/review/chapter-workshop.html?revision=5&chapter=${chapter}&lang=ru&view=production`);
 const row=page.locator(`[data-scene="${target}"]`);
 await row.waitFor();
 await row.evaluate(async e=>{const imgs=[...e.querySelectorAll('img')];imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode()));});
 await row.screenshot({path:path.join(__dirname,`${chapter}-comparison.png`)});
 const result=await row.evaluate(e=>({text:e.innerText,images:[...e.querySelectorAll('img')].map(i=>({src:i.src,width:i.naturalWidth}))}));
 fs.writeFileSync(path.join(__dirname,`${chapter}-comparison.json`),JSON.stringify(result,null,2)+'\n');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
