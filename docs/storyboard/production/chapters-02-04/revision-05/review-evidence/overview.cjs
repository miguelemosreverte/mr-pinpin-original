const fs=require('fs');
const path=require('path');
const {chromium}=require('/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const repo='/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-cover-standard';
const chapter=process.argv[2]||'elder';
const manifest=JSON.parse(fs.readFileSync(path.join(repo,'docs/storyboard/production/chapters-02-04/revision-05',chapter,'chapter.json')));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true});
 const p=await b.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:1});
 await p.goto('http://127.0.0.1:8782/storyboard/review/chapter-workshop.html');
 for(let start=Number(process.env.START||0);start<Math.min(manifest.scenes.length,Number(process.env.STOP||999));start+=12){
  const scenes=manifest.scenes.slice(start,start+12);
  await p.setContent(`<style>body{margin:16px;background:#f8f5eb;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;font:16px/1.25 Georgia}article{break-inside:avoid}img{width:100%;display:block}p{margin:5px 0}</style>`+scenes.map(s=>`<article><img src="http://127.0.0.1:8782/storyboard/${s.src}"><p><b>${s.id}</b> · ${escape(s.text.en.join(' '))}</p></article>`).join(''));
  await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await p.screenshot({path:path.join(__dirname,`${chapter}-overview-${start+1}.png`),fullPage:true});
 }
 const mini=typeof manifest.miniature==='string'?manifest.miniature:manifest.miniature?.src;
 if(mini){await p.setContent(`<style>body{background:#f8f5eb;display:flex;align-items:start;gap:24px;font:16px sans-serif}img{display:block}</style>`+[96,160,240].map(w=>`<article>${w}px<img width="${w}" src="http://127.0.0.1:8782/storyboard/${mini}"></article>`).join(''));await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await p.screenshot({path:path.join(__dirname,`${chapter}-miniature-sizes.png`)});}
 await b.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
