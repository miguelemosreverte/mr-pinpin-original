'use strict';
// Merge new coloring pages into a new edition; the verified story PDF is never reprinted.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const info=file=>{const text=cp.execFileSync('pdfinfo',[file]).toString();return{pages:Number(text.match(/^Pages:\s+(\d+)/m)?.[1])}};
const extract=(file,count)=>cp.execFileSync('pdftotext',['-layout','-f','1','-l',String(count),'-enc','UTF-8',file,'-'],{maxBuffer:4*1024*1024}).toString();
function imageInventory(file,count){
 return cp.execFileSync('pdfimages',['-list','-f','1','-l',String(count),file],{maxBuffer:4*1024*1024}).toString().split('\n').filter(l=>/^\s*\d+\s+\d+\s/.test(l)).map(l=>{const c=l.trim().split(/\s+/);return c.slice(0,10).concat(c.slice(12)).join(' ')});
}
const escape=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function run({root,out,base,manifest}){
 assert(base,'--base-pdfs is required with --coloring-manifest');out=path.resolve(out);base=path.resolve(base);
 assert(out!==base&&!out.startsWith(base+path.sep),'New edition must be outside the original PDF directory');
 const relative=path.relative(root,out);assert(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Output must be outside checkout');
 assert(!fs.existsSync(out),'Use a new output directory; never overwrite an existing edition');fs.mkdirSync(out,{recursive:true});
 const plan=JSON.parse(fs.readFileSync(manifest)),baseline=JSON.parse(fs.readFileSync(path.join(base,'export-manifest.json'))),catalog=JSON.parse(fs.readFileSync(path.join(base,'library-pdfs-draft.json')));
 assert.equal(plan.schemaVersion,1);assert.equal(baseline.pass,true);assert.equal(baseline.pdfs.length,27);assert.equal(plan.chapters.length,9);
 const records=new Map(baseline.pdfs.map(p=>[p.id+'-'+p.lang,p]));const byId=new Map(plan.chapters.map(c=>[c.id,c]));assert.equal(byId.size,9);
 const report={schemaVersion:1,edition:'story-plus-three-coloring-pages',started:new Date().toISOString(),baseManifest:path.join(base,'export-manifest.json'),coloringManifest:path.resolve(manifest),originalPagesReprinted:false,pdfs:[],coloring:[]};
 const save=()=>fs.writeFileSync(path.join(out,'export-manifest.json'),JSON.stringify(report,null,2)+'\n');save();
 const playwright=require(process.env.PLAYWRIGHT_MODULE||'/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');const browser=await playwright.chromium.launch({channel:'chrome',headless:true});
 try{const page=await browser.newPage();
 for(const chapter of catalog.chapters){
  const selected=byId.get(chapter.id);assert(selected);assert.deepEqual(selected.pages.map(p=>p.id),['cover','scene-1','scene-2']);
  const images=selected.pages.map(p=>{assert(p.path.startsWith('docs/storyboard/production/')&&!p.path.includes('..'));const file=path.join(root,p.path),b=fs.readFileSync(file);assert.equal(sha(b),p.sha256);assert.equal(b.readUInt32BE(16),1024);assert.equal(b.readUInt32BE(20),1536);const opaque=cp.execFileSync('magick',['identify','-format','%[opaque]',file]).toString();assert.equal(opaque,'True','White paper must be opaque: '+p.path);return'data:image/png;base64,'+b.toString('base64')});
  await page.setContent('<!doctype html><html><meta charset="utf-8"><title>'+escape(chapter.title.en)+' — Coloring</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}.page{width:186mm;height:273mm;break-after:page;display:flex;align-items:center;justify-content:center}.page:last-child{break-after:auto}img{display:block;width:100%;height:100%;object-fit:contain}</style>'+images.map(src=>'<section class="page"><img src="'+src+'"></section>').join('')+'</html>',{waitUntil:'load'});
  await page.evaluate(async()=>await Promise.all([...document.images].map(i=>i.decode())));
  const supplement=path.join(out,chapter.id+'-coloring-pages.pdf');await page.pdf({path:supplement,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});assert.equal(info(supplement).pages,3);
  report.coloring.push({id:chapter.id,pages:selected.pages,file:supplement,sha256:sha(fs.readFileSync(supplement))});
  const originalCount=chapter.pageCount;chapter.storyPageCount=originalCount;chapter.coloringPageCount=3;chapter.pageCount=originalCount+3;
  for(const lang of ['en','ru','es']){
   const previous=records.get(chapter.id+'-'+lang);assert(previous);const original=path.join(base,previous.filename);const originalBytes=fs.readFileSync(original);assert.equal(originalBytes.length,previous.bytes);assert.equal(sha(originalBytes),previous.sha256);assert.equal(info(original).pages,originalCount);
   const filename=chapter.id+'-'+lang+'.pdf',file=path.join(out,filename);cp.execFileSync('pdfunite',[original,supplement,file]);assert.equal(info(file).pages,originalCount+3);
   assert.equal(extract(file,originalCount),extract(original,originalCount),'Original selectable text changed');assert.deepEqual(imageInventory(file,originalCount),imageInventory(original,originalCount),'Original embedded image properties changed');assert.equal(sha(fs.readFileSync(original)),previous.sha256,'Original PDF was modified');
   const b=fs.readFileSync(file),entry={id:chapter.id,lang,file,filename,bytes:b.length,sha256:sha(b),pageCount:originalCount+3,storyPageCount:originalCount,coloringPageCount:3,baseSha256:previous.sha256,originalFileUnchanged:true,originalTextUnchanged:true,originalImageInventoryUnchanged:true};report.pdfs.push(entry);
   chapter.pdf[lang]={url:null,filename,bytes:entry.bytes,sha256:entry.sha256,pageCount:entry.pageCount};save();console.log('PASS '+filename+' '+entry.pageCount+' pages; original PDF/text/image inventory preserved');
  }
 }
 report.finished=new Date().toISOString();report.pass=true;save();fs.writeFileSync(path.join(out,'library-pdfs-draft.json'),JSON.stringify(catalog,null,2)+'\n');
 }catch(e){report.pass=false;report.error=e.stack;save();throw e}finally{await browser.close()}
}
module.exports={run};
