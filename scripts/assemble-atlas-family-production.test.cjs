const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {assemble} = require('./assemble-atlas-family-production.cjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function fixture(t, count) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'family-assemble-test-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  const outDir = path.join(root,'images/atlas/family-production-v1');
  fs.mkdirSync(outDir,{recursive:true});
  const sheets = [];
  for(let group=0;group<count;group++) {
    const stem='pinpin-'+group+'-v1',png=Buffer.from('source-'+group),webp=Buffer.from('encoded-'+group);
    const sheetAngles=Array.from({length:4},(_,row)=>(group*4+row)*15);
    const frames=Array.from({length:16},(_,i)=>({row:Math.floor(i/4),column:i%4,rect:[i%4*10,Math.floor(i/4)*10,8,8],anchor:[4,8]}));
    const directions=sheetAngles.map((angle,row)=>({angle,referenceWidth:30,src:stem+'.png',runtimeSrc:stem+'.webp',
      frames:frames.filter(f=>f.row===row).map(({rect,anchor})=>({rect,anchor}))}));
    const details={characterId:'pinpin',assetVersion:'v1',reviewStatus:'awaiting-visual-review',sheetAngles,
      source:{sha256:hash(png)},encoding:{decodedRgbaExact:true,runtimeSha256:hash(webp)},quality:{pixelValidation:'PASS'},
      sheet:{src:stem+'.png',runtimeSrc:stem+'.webp',referenceWidth:30,width:40,height:40},measurements:{frames},directions};
    fs.writeFileSync(path.join(outDir,stem+'.png'),png);
    fs.writeFileSync(path.join(outDir,stem+'.webp'),webp);
    fs.writeFileSync(path.join(outDir,stem+'.json'),JSON.stringify(details));
    sheets.push({characterId:'pinpin',status:'prepared',sheetAngles,sourceSha256:hash(png),
      png:stem+'.png',webp:stem+'.webp',preparation:stem+'.json'});
  }
  const reportPath=path.join(outDir,'atlas-family-v1.prepare.json');
  fs.writeFileSync(reportPath,JSON.stringify({assetVersion:'v1',sheets}));
  return {root,outDir,reportPath};
}

test('complete Pinpin produces 24 real directions while absent family stays explicitly partial',t=>{
  const options=fixture(t,6),manifest=assemble(options);
  assert.deepEqual(manifest.characters.map(c=>[c.id,c.fullCircle,c.directions.length]),
    [['pinpin',true,24],['mama',false,0],['mr-pompom',false,0]]);
  assert.equal(manifest.reviewStatus,'partial');assert.equal(manifest.fullCircle,false);
  assert.equal(manifest.characters[0].productionReady,false);
  assert(manifest.characters[0].directions.every(d=>d.src.startsWith('images/atlas/family-production-v1/')));
  assert(fs.existsSync(path.join(options.outDir,'pinpin-v1.character.json')));
});

test('partial character never acquires fullCircle from available headings',t=>{
  const manifest=assemble({...fixture(t,2),write:false});
  assert.equal(manifest.characters[0].fullCircle,false);
  assert.equal(manifest.characters[0].readiness.missingAngles.length,16);
});

test('asset tampering prevents publication',t=>{
  const options=fixture(t,1);
  fs.appendFileSync(path.join(options.outDir,'pinpin-0-v1.webp'),'changed');
  assert.throws(()=>assemble(options),/WebP changed/);
  assert(!fs.existsSync(path.join(options.root,'family-production.json')));
});

test('blink preparations cannot enter body inventory',t=>{
  const options=fixture(t,1),file=path.join(options.outDir,'pinpin-0-v1.json');
  const details=JSON.parse(fs.readFileSync(file));details.kind='blink';
  fs.writeFileSync(file,JSON.stringify(details));
  assert.throws(()=>assemble(options),/Expression assets must not enter body directions/);
});

test('duplicate headings and changed foot coordinates cannot be assembled',t=>{
  const options=fixture(t,1),report=JSON.parse(fs.readFileSync(options.reportPath));
  report.sheets.push(report.sheets[0]);fs.writeFileSync(options.reportPath,JSON.stringify(report));
  assert.throws(()=>assemble({...options,write:false}),/Duplicate or invalid headings/);
  report.sheets.pop();fs.writeFileSync(options.reportPath,JSON.stringify(report));
  const file=path.join(options.outDir,'pinpin-0-v1.json'),details=JSON.parse(fs.readFileSync(file));
  details.directions[0].frames[0].anchor=[99,99];fs.writeFileSync(file,JSON.stringify(details));
  assert.throws(()=>assemble({...options,write:false}),/Crop or foot anchor changed/);
});
