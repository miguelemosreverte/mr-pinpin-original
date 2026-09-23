'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sample,order}=require('./composition.js');
test('composition uses the four forward clips and 24 samples each',()=>{
  assert.deepEqual(order,['loop000','turn000015','loop015','turn015000']);
  for(let i=0;i<4;i++){
    assert.deepEqual([sample(i*1000).clip,sample(i*1000).frame],[order[i],0]);
    assert.equal(sample(i*1000+999.9).frame,23);
  }
  assert.equal(sample(4000).clip,'loop000');assert.equal(sample(4000).frame,0);
});
test('composition rejects invalid clocks',()=>{for(const n of [-1,NaN,Infinity])assert.throws(()=>sample(n));});
test('HTML parser keeps original records but removes duplicate interactive player',()=>{
  const {transform}=require('./compose.cjs'),{parse}=require('parse5');
  const html=transform('<!doctype html><title>Old</title><main><header>Old header</header><section id="demo">Old player</section><pre>A &lt; B</pre></main><script>window.NEIGHBOR_REVIEW={clips:{}}</script><script src="player.js"></script><script src="scheduler.js"></script><script src="sheets.js"></script>', '<header>New header</header><canvas id="composition"></canvas>','../../old/index.html');
  assert(html.includes('A &lt; B'));assert(!html.includes('Old player'));assert(!html.includes('src="player.js"'));assert(!html.includes('src="scheduler.js"'));
  assert(html.includes('src="sheets.js"'));assert(html.includes('src="composition.js"'));assert(html.includes('id="interactive-link"'));
  assert.equal(parse(html).childNodes.at(-1).tagName,'html');
});
test('green record binds real file hashes and publishes prompts without hosted URLs',()=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{createHash}=require('node:crypto');
  const {greenSection}=require('./green-section.cjs'),root=fs.mkdtempSync(path.join(os.tmpdir(),'pinpin-green-'));
  const write=(name,value)=>fs.writeFileSync(path.join(root,name),value);
  const hash=text=>createHash('sha256').update(text).digest('hex');
  try{
    write('input.png','image');write('native.mp4','video');write('keyed.mp4','keyed');write('nose.png','nose');
    write('image.md','## Exact prompt\n\nReplace background.\n');write('audit.md','Measured variation.');
    const record={status:'complete',sourceHash:hash('image'),metadata:{sha256:hash('video'),width:1280,height:720,frameCount:25,avg_frame_rate:'24/1',duration:1.041667},input:{first_image_url:'https://private-hosted/input',end_image_url:'https://private-hosted/input',prompt:'Actual prompt.',duration:1},priceEstimate:{amount:.045},model:'test-model'};
    write('record.json',JSON.stringify(record));
    write('manifest.json',JSON.stringify({input:'input.png',video:'native.mp4',record:'record.json',imagePromptRecord:'image.md',keyedVideo:'keyed.mp4',findings:'Not certified.',noseViews:[{path:'nose.png',label:'Nose'}],auditRecord:'audit.md'}));
    const out=path.join(root,'out');fs.mkdirSync(out);
    const html=greenSection(path.join(root,'manifest.json'),out);
    assert(html.includes('Actual prompt.'));assert(html.includes('Replace background.'));assert(!html.includes('private-hosted'));
    assert(!fs.readFileSync(path.join(out,'green-provenance.json'),'utf8').includes('private-hosted'));
    record.sourceHash='wrong';write('record.json',JSON.stringify(record));
    assert.throws(()=>greenSection(path.join(root,'manifest.json'),out),/hash differs/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
