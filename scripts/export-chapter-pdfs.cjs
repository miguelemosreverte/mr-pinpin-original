#!/usr/bin/env node
'use strict';
// Export every completed chapter as a self-contained, selectable-text PDF.
// Artwork originals are read-only; native-size JPEG print derivatives stay outside Git.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {parseArgs}=require('node:util');
const {values}=parseArgs({options:{out:{type:'string'},metadata:{type:'boolean'},help:{type:'boolean'}}});
if(values.help||!values.out){console.log('Usage: node scripts/export-chapter-pdfs.cjs --out /external/export-dir [--metadata]\nRequires Chrome, Playwright, ImageMagick, pdfinfo, pdftotext. PLAYWRIGHT_MODULE overrides module location.');process.exit(values.help?0:2)}
const root=path.resolve(__dirname,'..'),storyboard=path.join(root,'docs/storyboard'),out=path.resolve(values.out);
const relative=path.relative(root,out);assert(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Output must be outside checkout');
fs.mkdirSync(out,{recursive:true});const media=path.join(out,'jpeg-cache');fs.mkdirSync(media,{recursive:true});
const read=f=>JSON.parse(fs.readFileSync(path.join(storyboard,f),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const languages=['en','ru','es'];const covers=read('covers.json'),art=read('illustrations.json'),translations=read('translations.json');
const context={window:{},URLSearchParams,location:{search:''}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(storyboard,'standalone-stories.js'),'utf8'),context);
const api=context.window.standaloneStories;
const ids=['chapter-01','chapter-02','timber-tractor','home-sweet-home','elder-papa-home','elder-family-morning','elder-forest-path','elder-elder-house','elder-beneath-roots'];
const models=ids.map(id=>{
 const cover=covers.covers[id];assert.equal(cover.status,'approved');
 let model;if(id.startsWith('chapter-')){
  model={id,scenes:art.chapters[id].map((image,i)=>({id:id+'-scene-'+String(i+1).padStart(2,'0'),image:image.src,width:image.width,height:image.height,paragraphs:Object.fromEntries(languages.map(lang=>[lang,(translations[id]?.[lang]?.scenes||art.scenes[id])[i].paragraphs]))}))};
  model.scenes.unshift({id:id+'-title',role:'title',images:cover.assets,width:1024,height:1536,paragraphs:{en:[],ru:[],es:[]}});
 }else if(id==='timber-tractor'){model=JSON.parse(JSON.stringify(api.compose(read('stories/timber-tractor.json'),read('stories/timber-tractor-chapter-02.json'))));}
 else{model=read('stories/'+id+'.json');assert(api.complete(model));}
 // The approved registry is the same title-cover authority used by the reader.
 const title=model.scenes[0];title.role='title';title.images=cover.assets;title.width=1024;title.height=1536;
 const miniature=cover.miniature?.status==='approved'?cover.miniature.asset:null;
 return{...model,title:cover.title,cover:cover.assets,miniature,route:cover.route,coverId:id,pageCount:model.scenes.length,
  ...(id==='chapter-02'?{editionLabel:{en:'Earlier edition',ru:'Ранняя версия',es:'Versión anterior'}}:{})};
});
assert.deepEqual(models.map(m=>m.pageCount),[16,17,34,21,28,21,23,36,70]);
const catalog={schemaVersion:1,chapters:models.map(m=>({id:m.id,title:m.title,cover:m.cover,coverId:m.coverId,miniature:m.miniature,pageCount:m.pageCount,route:m.route,...(m.editionLabel?{editionLabel:m.editionLabel}:{}),pdf:Object.fromEntries(languages.map(lang=>[lang,{url:null,filename:m.id+'-'+lang+'.pdf',pageCount:m.pageCount}]))}))};
const catalogPath=path.join(out,'library-pdfs-draft.json');const saveCatalog=()=>fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');saveCatalog();
if(values.metadata){console.log(catalogPath);process.exit(0)}
const provenance={schemaVersion:1,started:new Date().toISOString(),sourceRoot:root,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim(),encoding:{format:'JPEG',quality:92,resize:false,originalsModified:false},artwork:[],pdfs:[]};
const save=()=>fs.writeFileSync(path.join(out,'export-manifest.json'),JSON.stringify(provenance,null,2)+'\n');save();
const cache=new Map();
function artwork(src){
 if(cache.has(src))return cache.get(src);
 assert(typeof src==='string'&&src.startsWith('images/')&&!src.includes('..'));const source=path.join(storyboard,src),bytes=fs.readFileSync(source),sourceSha256=sha(bytes),dest=path.join(media,sourceSha256+'.jpg');
 if(!fs.existsSync(dest))cp.execFileSync('magick',[source,'-background','white','-alpha','remove','-alpha','off','-quality','92',dest]);
 const dimensions=file=>cp.execFileSync('magick',['identify','-format','%wx%h',file]).toString();assert.equal(dimensions(source),dimensions(dest));
 const jpeg=fs.readFileSync(dest);provenance.artwork.push({source:src,sourceSha256,sourceBytes:bytes.length,derivative:dest,sha256:sha(jpeg),bytes:jpeg.length,dimensions:dimensions(dest)});
 const data='data:image/jpeg;base64,'+jpeg.toString('base64');cache.set(src,data);return data;
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>s.normalize('NFKC').replace(/(\p{L}-)\s*\n\s*(?=\p{L})/gu,'$1').replace(/\s+/g,' ').trim();
function html(model,lang){return '<!doctype html><html lang="'+lang+'"><meta charset="utf-8"><title>'+escape(model.title[lang])+'</title><style>'+`
@page story { size:297mm 210mm; margin:12mm; }
@page cover { size:210mm 297mm; margin:12mm; }
*{box-sizing:border-box}html,body{margin:0;padding:0;color:#282519;background:#fff}
.page{page:story;width:273mm;height:186mm;display:flex;flex-direction:column;break-after:page;break-inside:avoid}
.page:last-child{break-after:auto}.page.cover{page:cover;width:186mm;height:273mm}
.art{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}.art img{display:block;width:100%;height:100%;object-fit:contain}
.prose{flex:0 0 auto;margin-top:5mm;font-family:Georgia,"Times New Roman",serif;font-size:17pt;line-height:1.36;hyphens:none;overflow-wrap:normal}
p{margin:0 0 2.4mm}p:last-child{margin-bottom:0}
`+'</style><body>'+model.scenes.map((s,i)=>'<section class="page'+(s.role==='title'?' cover':'')+'" data-scene="'+escape(s.id)+'"><div class="art"><img alt="" src="'+artwork(s.images?.[lang]||s.image)+'"></div>'+(s.paragraphs[lang].length?'<div class="prose">'+s.paragraphs[lang].map(p=>'<p>'+escape(p)+'</p>').join('')+'</div>':'')+'</section>').join('')+'</body></html>'}
(async()=>{
 const playwright=require(process.env.PLAYWRIGHT_MODULE||'/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
 const browser=await playwright.chromium.launch({channel:'chrome',headless:true});
 try{const page=await browser.newPage();
 for(const model of models)for(const lang of languages){
  const filename=model.id+'-'+lang+'.pdf',file=path.join(out,filename);await page.setContent(html(model,lang),{waitUntil:'load'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))});
  const layout=await page.locator('.page').evaluateAll(ps=>ps.map(p=>{const a=p.querySelector('.art'),prose=p.querySelector('.prose');return{id:p.dataset.scene,height:p.clientHeight,scroll:p.scrollHeight,width:p.clientWidth,scrollWidth:p.scrollWidth,artHeight:a.clientHeight,proseHeight:prose?.clientHeight||0}}));
  for(const l of layout){assert(l.scroll<=l.height+1&&l.scrollWidth<=l.width+1,'Content overflow '+l.id);assert(l.artHeight>300,'Image area too small '+l.id)}
  await page.pdf({path:file,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,tagged:true});
  const info=cp.execFileSync('pdfinfo',[file]).toString(),pageCount=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);assert.equal(pageCount,model.pageCount,filename+' page count');
  const text=cp.execFileSync('pdftotext',['-layout','-enc','UTF-8',file,'-'],{maxBuffer:2*1024*1024}).toString(),normalized=normalize(text);
  for(const scene of model.scenes)for(const paragraph of scene.paragraphs[lang])assert(normalized.includes(normalize(paragraph)),'Missing selectable paragraph '+filename+' '+scene.id);
  const bytes=fs.readFileSync(file),entry={id:model.id,lang,file,filename,bytes:bytes.length,sha256:sha(bytes),pageCount,allParagraphsSelectable:true,layoutChecked:true};
  provenance.pdfs.push(entry);Object.assign(catalog.chapters.find(c=>c.id===model.id).pdf[lang],{bytes:entry.bytes,sha256:entry.sha256});save();saveCatalog();console.log('PASS '+filename+' '+pageCount+' pages '+Math.round(bytes.length/1024)+' KiB');
 }
 provenance.finished=new Date().toISOString();provenance.pass=true;save();
 }finally{await browser.close()}
})().catch(e=>{provenance.pass=false;provenance.error=e.stack;save();console.error(e);process.exitCode=1});
