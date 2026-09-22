#!/usr/bin/env node
/* Dependency-free proposal audit. It never modifies chapter files. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const base = path.resolve(__dirname, '../docs/storyboard');
const legacyBase = path.resolve(__dirname, '../../mr-pinpin-original/docs/storyboard');
const languages = ['ru', 'en', 'es'];
const chapters = {elder:'chapter-02', academy:'chapter-04'};
const isText = value => typeof value === 'string' && value.trim().length > 0;
const isImagePath = value => typeof value === 'string' && /^images\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp)$/i.test(value) && !value.split('/').some(part => ['..', '.', ''].includes(part));
const isPlanningDiagram = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(svg|png)$/i.test(value);
const isPending = value => typeof value === 'string' && /^(pending\b|not yet\b|awaiting (generation|inspection|visual review)\b)/i.test(value.trim());
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const referenceListValid = (metadata, preproduction=false) => Array.isArray(metadata.references) && (metadata.references.length>0 || (preproduction && metadata.referenceMode==='original-design' && isText(metadata.referenceRationale)));
function chapterFolder(id, revision=1) {
  if(!Object.hasOwn(chapters,id)||!chaptersForRevision(revision).includes(id))throw Error('Unknown chapter or unavailable revision');
  return path.join(base,'production/chapters-02-04',...(revision===1?[]:[`revision-0${revision}`]),id);
}
function chaptersForRevision(revision=1) {
  if(![1,2,3,4,5,6].includes(revision))throw Error('Unknown revision');
  return revision>=3?['elder']:Object.keys(chapters);
}
function parseArgs(args) {
  const flags=new Set();let revision=1,seenRevision=false;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--revision'){
      if(seenRevision||!['1','2','3','4','5','6'].includes(args[i+1]))throw Error('--revision requires 1, 2, 3, 4, 5 or 6, once');
      revision=Number(args[++i]);seenRevision=true;
    }else if(['--allow-pending','--self-test','--json'].includes(args[i]))flags.add(args[i]);
    else throw Error(`Unknown argument: ${args[i]}`);
  }
  return {revision,flags};
}
const errors = [], pending = [], warnings = [], fallbacks = [];
const stats = {chapters:0, scenes:0, preproduction:0, images:0, sidecars:0};
function check(condition, message) { if (!condition) errors.push(message); }
function unavailable(message) { pending.push(message); }
function localized(value, label, issues) {
  for (const lang of languages) if (!isText(value?.[lang])) issues.push(`${label}.${lang}: nonempty translation required`);
}
function validateCameraTransform(record,label) {
  const issues=[], ensure=(ok,message)=>{if(!ok)issues.push(`${label}: ${message}`);};
  const xyz=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
  ensure(record?.schemaVersion===1,'camera schemaVersion1 required');
  for(const key of ['purpose','frameId','units'])ensure(isText(record?.[key]),`camera ${key} required`);
  const camera=record?.camera;
  ensure(xyz(camera?.positionXYZ)&&xyz(camera?.targetXYZ),'camera position and target XYZ required');
  ensure(Number.isFinite(camera?.height)&&camera.height>=0,'camera height required');
  ensure(Number.isFinite(camera?.fieldOfViewDegrees)&&camera.fieldOfViewDegrees>0&&camera.fieldOfViewDegrees<180,'valid camera field of view required');
  for(const key of ['framing','axisSide'])ensure(isText(camera?.[key]),`camera ${key} required`);
  ensure(Array.isArray(record?.actors)&&record.actors.length>0,'actor records required');
  const names=new Set();
  for(const actor of record?.actors||[]){
    ensure(isText(actor.name)&&!names.has(actor.name),'unique actor name required');names.add(actor.name);
    ensure(xyz(actor.positionXYZ),`${actor.name} position required`);
    for(const key of ['bodyFacingTarget','headFacingTarget','eyeTarget'])ensure(isText(actor[key])||xyz(actor[key]),`${actor.name} ${key} required`);
    for(const key of ['pose','limbsContactSupport','visibility'])ensure(isText(actor[key]),`${actor.name} ${key} required`);
  }
  for(const key of ['staticLandmarks','objectStates','transition'])ensure(record?.[key]&&typeof record[key]==='object'&&Object.keys(record[key]).length>0,`camera ${key} required`);
  return issues;
}
function validateManifest(data, id) {
  const issues=[];
  const ensure=(ok,message)=>{if(!ok)issues.push(message);};
  ensure(data?.schemaVersion===1, `${id}: schemaVersion must be 1`);
  ensure(data?.id===id, `${id}: manifest ID must match its directory`);
  ensure(data?.sourceChapter===chapters[id], `${id}: unexpected source chapter`);
  ensure(data?.status==='proposed', `${id}: status must remain proposed`);
  localized(data?.title,`${id}.title`,issues);localized(data?.summary,`${id}.summary`,issues);
  for(const field of ['sequences','scenes','preproduction','editorialNotes','continuityNotes'])ensure(Array.isArray(data?.[field]),`${id}.${field}: array required`);
  if(!Array.isArray(data?.sequences)||!Array.isArray(data?.scenes))return issues;
  const sequenceIDs=new Set(), sceneIDs=new Set(), usedSequences=new Set();
  for(const sequence of data.sequences){
    ensure(isText(sequence.id)&&!sequenceIDs.has(sequence.id),`${id}: invalid or duplicate sequence ID ${sequence.id}`);sequenceIDs.add(sequence.id);
    localized(sequence.title,`${id}/${sequence.id}.title`,issues);ensure(isText(sequence.purpose),`${id}/${sequence.id}: sequence purpose required`);
  }
  let lastSequenceIndex=-1;
  for(const scene of data.scenes){
    const label=`${id}/${scene.id}`;
    ensure(typeof scene.id==='string'&&/^[a-z0-9][a-z0-9-]*$/.test(scene.id)&&!sceneIDs.has(scene.id),`${label}: invalid or duplicate scene ID`);sceneIDs.add(scene.id);
    ensure(sequenceIDs.has(scene.sequence),`${label}: unknown sequence ${scene.sequence}`);usedSequences.add(scene.sequence);
    const sequenceIndex=data.sequences.findIndex(sequence=>sequence.id===scene.sequence);
    ensure(sequenceIndex>=lastSequenceIndex,`${label}: sequence groups must be contiguous and follow declared order`);lastSequenceIndex=sequenceIndex;
    ensure(isImagePath(scene.src),`${label}: src must be a safe storyboard-relative images/ path`);
    if(scene.before!==undefined)ensure(isImagePath(scene.before),`${label}: before must be a safe storyboard-relative images/ path`);
    if(scene.beforeText!==undefined){
      ensure(isImagePath(scene.before),`${label}: beforeText requires an actual before image`);
      for(const lang of languages){const paragraphs=scene.beforeText?.[lang];ensure(Array.isArray(paragraphs)&&paragraphs.every(isText),`${label}.beforeText.${lang}: translated paragraph array required (empty means earlier silence)`);}
      const lengths=languages.map(lang=>scene.beforeText?.[lang]?.length);
      ensure(lengths.every(length=>length===0)||lengths.every(length=>length>0),`${label}.beforeText: earlier silence must agree across all languages`);
    }
    if(scene.beforeNote!==undefined){
      if(typeof scene.beforeNote==='string')ensure(isText(scene.beforeNote),`${label}.beforeNote: nonempty context required`);
      else localized(scene.beforeNote,`${label}.beforeNote`,issues);
    }
    ensure(Number.isInteger(scene.width)&&Number.isInteger(scene.height)&&scene.width>scene.height&&scene.height>0,`${label}: standalone landscape dimensions required`);
    localized(scene.alt,`${label}.alt`,issues);
    for(const lang of languages){const paragraphs=scene.text?.[lang];ensure(Array.isArray(paragraphs)&&paragraphs.every(isText)&&(paragraphs.length>0||scene.source?.kind==='silent'),`${label}.text.${lang}: translated paragraphs required (empty only for silent scenes)`);}
    ensure(['original','expanded','new','silent'].includes(scene.source?.kind),`${label}: invalid source kind`);
    ensure(Array.isArray(scene.source?.blocks)&&scene.source.blocks.every(block=>Number.isInteger(block)&&block>=0),`${label}: source blocks must be nonnegative integers`);
    if(['original','expanded'].includes(scene.source?.kind))ensure(scene.source.blocks?.length>0,`${label}: original/expanded scene needs source block references`);
    ensure(isText(scene.source?.note),`${label}: source/adaptation note required`);
    for(const field of ['camera','continuity','review'])ensure(isText(scene[field]),`${label}: ${field} required`);
    ensure(typeof scene.reused==='boolean',`${label}: reused must be explicit boolean`);
    if(scene.cameraTransform!==undefined)issues.push(...validateCameraTransform(scene.cameraTransform,label));
  }
  for(const sequenceID of sequenceIDs)ensure(usedSequences.has(sequenceID),`${id}/${sequenceID}: declared sequence has no scenes`);
  const referenceIDs=new Set();
  for(const reference of data.preproduction||[]){
    ensure(isText(reference.id)&&!referenceIDs.has(reference.id),`${id}: duplicate or invalid preproduction ID ${reference.id}`);referenceIDs.add(reference.id);
    ensure([reference.title,reference.description].every(value=>isText(value)||languages.every(lang=>isText(value?.[lang]))),`${id}/${reference.id}: reference title and description required`);
    ensure(isImagePath(reference.src),`${id}/${reference.id}: unsafe preproduction path`);
  }
  if(data.planningDiagram!==undefined)ensure(isPlanningDiagram(data.planningDiagram),`${id}.planningDiagram: safe chapter-local SVG/PNG basename required`);
  const cover=data.cover||{};
  if(Object.keys(cover).length)for(const lang of languages)ensure(isImagePath(cover[lang]),`${id}.cover.${lang}: all declared cover languages need safe image paths`);
  if(data.miniature){const miniature=typeof data.miniature==='string'?data.miniature:data.miniature.src;ensure(isImagePath(miniature),`${id}.miniature: safe image path or {src} required`);}
  for(const field of ['editorialNotes','continuityNotes'])ensure((data[field]||[]).every(isText),`${id}.${field}: notes must be nonempty strings`);
  return issues;
}
function imageDimensions(bytes) {
  if(bytes.length>=24&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a')return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
  if(bytes.length>=30&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
    const format=bytes.toString('ascii',12,16);
    if(format==='VP8X')return {width:bytes.readUIntLE(24,3)+1,height:bytes.readUIntLE(27,3)+1};
    if(format==='VP8 '&&bytes.length>=30)return {width:bytes.readUInt16LE(26)&0x3fff,height:bytes.readUInt16LE(28)&0x3fff};
    if(format==='VP8L'&&bytes[20]===0x2f)return {width:1+(((bytes[22]&0x3f)<<8)|bytes[21]),height:1+(((bytes[24]&0x0f)<<10)|(bytes[23]<<2)|(bytes[22]>>6))};
  }
  if(bytes[0]===0xff&&bytes[1]===0xd8){
    let offset=2;
    while(offset+8<bytes.length){if(bytes[offset]!==0xff)break;const marker=bytes[offset+1];const length=bytes.readUInt16BE(offset+2);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {height:bytes.readUInt16BE(offset+5),width:bytes.readUInt16BE(offset+7)};if(length<2)break;offset+=2+length;}
  }
  throw Error('unsupported or corrupt image header');
}
const checkedAssets=new Map();
function inspectAsset(src, options={}) {
  const {label=src, legacy=false, generated=false, preproduction=false, expected}=options;
  if(!isImagePath(src))return;
  let file=path.join(base,src);let fallback=false;
  if(!fs.existsSync(file)&&legacy&&fs.existsSync(path.join(legacyBase,src))){file=path.join(legacyBase,src);fallback=true;}
  if(!fs.existsSync(file)){unavailable(`${label}: missing ${src}${legacy?' (including legacy fallback)':''}`);return;}
  if(fallback)fallbacks.push(`${label}: ${src}`);
  let dimensions;
  try {
    const bytes=fs.readFileSync(file);dimensions=imageDimensions(bytes);
    if(expected)check(dimensions.width===expected.width&&dimensions.height===expected.height,`${label}: actual ${dimensions.width}x${dimensions.height} differs from manifest ${expected.width}x${expected.height}`);
    // The same file can be both an optional comparison and a selected scene; cache only equally strict checks.
    const cacheKey=`${file}|${generated}|${preproduction}`;if(checkedAssets.has(cacheKey))return dimensions;checkedAssets.set(cacheKey,true);stats.images++;
    const sidecar=file.replace(/\.(png|jpe?g|webp)$/i,'.json');
    if(!fs.existsSync(sidecar)){unavailable(`${label}: missing adjacent JSON provenance`);return dimensions;}
    const metadata=readJSON(sidecar);stats.sidecars++;
    check(metadata.sha256===sha256(bytes),`${label}: sidecar SHA-256 does not match image`);
    const recorded={width:metadata.width??metadata.dimensions?.width,height:metadata.height??metadata.dimensions?.height};
    check(recorded.width===dimensions.width&&recorded.height===dimensions.height,`${label}: sidecar dimensions do not match image`);
    const markdown=file.replace(/\.(png|jpe?g|webp)$/i,'.md');
    if(!fs.existsSync(markdown)||!fs.readFileSync(markdown,'utf8').trim())unavailable(`${label}: missing adjacent Markdown provenance`);
    if(generated){
      check(isText(metadata.prompt),`${label}: exact prompt missing`);
      check(referenceListValid(metadata,preproduction),`${label}: nonempty reference list required (original-design exception only for preproduction with explicit referenceRationale)`);
      const start=metadata.startedAt??metadata.started_at_utc, end=metadata.finishedAt??metadata.ended_at_utc;
      check(isText(start)&&isText(end)&&Number.isFinite(Date.parse(start))&&Number.isFinite(Date.parse(end))&&Date.parse(end)>=Date.parse(start),`${label}: valid ordered UTC generation timestamps required`);
      if(!isText(metadata.review)||isPending(metadata.review))unavailable(`${label}: actual full-image review missing from sidecar`);
    }
  }catch(error){errors.push(`${label}: ${error.message}`);}
  return dimensions;
}
function auditChapter(id,revision=1){
  const folder=chapterFolder(id,revision);const manifest=path.join(folder,'chapter.json');
  if(!fs.existsSync(manifest)){unavailable(`${id}: chapter.json not saved yet`);return;}
  let data;try{data=readJSON(manifest);}catch(error){errors.push(`${id}: invalid manifest JSON: ${error.message}`);return;}
  errors.push(...validateManifest(data,id));stats.chapters++;
  for(const filename of ['bible.md','shot-plan.json','REPORT.md']){const file=path.join(folder,filename);if(!fs.existsSync(file)||!fs.readFileSync(file,'utf8').trim())unavailable(`${id}: ${filename} missing or empty`);}
  try{if(fs.existsSync(path.join(folder,'shot-plan.json')))readJSON(path.join(folder,'shot-plan.json'));}catch(error){errors.push(`${id}: shot-plan.json invalid JSON`);}
  if(isPlanningDiagram(data.planningDiagram)){const file=path.join(folder,data.planningDiagram);if(!fs.existsSync(file)||!fs.statSync(file).isFile()||fs.statSync(file).size===0)unavailable(`${id}: planningDiagram missing or empty`);}
  if(!data.scenes?.length)unavailable(`${id}: no selected scenes yet`);
  if((data.preproduction?.length||0)<2)unavailable(`${id}: cast and environment preproduction pack incomplete`);
  if(!Object.keys(data.cover||{}).length&&!data.parts)warnings.push(`${id}: no cover declared; none invented or tested`);
  for(const [lang,src] of Object.entries(data.cover||{}))inspectAsset(src,{label:`${id}/cover/${lang}`});
  if(data.miniature){const miniature=typeof data.miniature==='string'?data.miniature:data.miniature.src;inspectAsset(miniature,{label:`${id}/miniature`,generated:true});}
  if(data.parts){
    check(revision===6&&data.parts.length===5,`${id}: five parts required for revision06`);
    const ids=new Set();let last=-1;
    for(const [index,part] of data.parts.entries()){
      check(isText(part.id)&&!ids.has(part.id),`${id}: unique part ID required`);ids.add(part.id);
      check(part.number===index+1,`${id}/${part.id}: contiguous part number required`);
      localized(part.title,`${id}/${part.id}.title`,errors);localized(part.summary,`${id}/${part.id}.summary`,errors);
      check(data.scenes.some(s=>s.part===part.id),`${id}/${part.id}: empty part`);
      if(!part.cover||languages.some(lang=>!part.cover[lang]))unavailable(`${id}/${part.id}: localized title cover missing`);
      for(const [lang,src] of Object.entries(part.cover||{}))inspectAsset(src,{label:`${id}/${part.id}/cover/${lang}`,generated:true});
      if(!part.miniature)unavailable(`${id}/${part.id}: miniature missing`);
      else inspectAsset(typeof part.miniature==='string'?part.miniature:part.miniature.src,{label:`${id}/${part.id}/miniature`,generated:true});
    }
    for(const scene of data.scenes){const i=data.parts.findIndex(p=>p.id===scene.part);check(i>=0&&i>=last,`${id}/${scene.id}: part order invalid`);last=i;}
  }
  for(const reference of data.preproduction||[]){stats.preproduction++;inspectAsset(reference.src,{label:`${id}/preproduction/${reference.id}`,generated:true,preproduction:true});}
  for(const scene of data.scenes||[]){
    stats.scenes++;if(revision>=5&&scene.src.includes(`/revision-0${revision}/`))check(!!scene.cameraTransform,`${id}/${scene.id}: new scene requires camera/actor record`);if(isPending(scene.review))unavailable(`${id}/${scene.id}: visual review still pending`);
    inspectAsset(scene.src,{label:`${id}/${scene.id}`,legacy:scene.reused===true,generated:scene.reused!==true,expected:scene});
    if(scene.before)inspectAsset(scene.before,{label:`${id}/${scene.id}/before`,legacy:true});
  }
}
function selfTest(){
  for(const input of ['images/x.png','images/chapter-02/scenes/scene-01-v2.webp'])assert.ok(isImagePath(input));
  for(const input of ['../images/x.png','https://example.com/x.png','images/../x.png','images/./x.png','images//x.png','images/%2e%2e/x.png','images/x.png?x=1','images/x.png#x','/images/x.png','images\\x.png'])assert.equal(isImagePath(input),false,input);
  const localized={ru:'тест',en:'test',es:'prueba'};
  const data={schemaVersion:1,id:'elder',sourceChapter:'chapter-02',status:'proposed',title:localized,summary:localized,cover:{},preproduction:[],editorialNotes:[],continuityNotes:[],sequences:[{id:'a',title:localized,purpose:'Validation fixture only.'}],scenes:[{id:'test-01',sequence:'a',src:'images/test.png',width:1536,height:1024,alt:localized,text:{ru:['тест'],en:['test'],es:['prueba']},source:{kind:'new',blocks:[],note:'In-memory validation fixture; never rendered in workshop.'},camera:'camera',continuity:'continuity',review:'Inspected.',reused:false}]};
  assert.deepEqual(validateManifest(data,'elder'),[]);
  assert.ok(validateCameraTransform({},'fixture').length>0);
  for(const name of ['floorplan.svg','location-plan-v2.png']){assert.equal(isPlanningDiagram(name),true);assert.deepEqual(validateManifest({...data,planningDiagram:name},'elder'),[]);}
  for(const name of ['../floorplan.svg','sub/floorplan.svg','https://example.com/x.svg','/x.png','x.svg?download','%2e%2e.svg','x.html','x.svg#part','x\\y.png']){assert.equal(isPlanningDiagram(name),false);assert.ok(validateManifest({...data,planningDiagram:name},'elder').some(issue=>issue.includes('planningDiagram')));}
  let changed=structuredClone(data);changed.scenes.push(structuredClone(changed.scenes[0]));assert.ok(validateManifest(changed,'elder').some(issue=>issue.includes('duplicate scene')));
  changed=structuredClone(data);delete changed.scenes[0].text.es;assert.ok(validateManifest(changed,'elder').some(issue=>issue.includes('text.es')));
  changed=structuredClone(data);changed.sequences.push({id:'b',title:localized,purpose:'Fixture.'});assert.ok(validateManifest(changed,'elder').some(issue=>issue.includes('has no scenes')));
  changed=structuredClone(data);changed.scenes[0].text={ru:[],en:[],es:[]};assert.ok(validateManifest(changed,'elder').some(issue=>issue.includes('translated paragraphs')));changed.scenes[0].source.kind='silent';assert.deepEqual(validateManifest(changed,'elder'),[]);
  changed=structuredClone(data);changed.scenes[0].source.kind='original';assert.ok(validateManifest(changed,'elder').some(issue=>issue.includes('source block references')));
  changed=structuredClone(data);changed.scenes[0].before='../bad.png';assert.ok(validateManifest(changed,'elder').some(issue=>issue.includes('before')));
  changed=structuredClone(data);changed.scenes[0].src='images/../bad.png';assert.ok(validateManifest(changed,'elder').some(issue=>issue.includes('src')));
  changed=structuredClone(data);changed.scenes[0].before='images/earlier.png';changed.scenes[0].beforeText=structuredClone(changed.scenes[0].text);changed.scenes[0].beforeNote=localized;assert.deepEqual(validateManifest(changed,'elder'),[]);
  let invalid=structuredClone(changed);delete invalid.scenes[0].beforeText.es;assert.ok(validateManifest(invalid,'elder').some(issue=>issue.includes('beforeText.es')));
  invalid=structuredClone(changed);delete invalid.scenes[0].before;assert.ok(validateManifest(invalid,'elder').some(issue=>issue.includes('requires an actual before')));
  invalid=structuredClone(changed);invalid.scenes[0].beforeText.en=[''];assert.ok(validateManifest(invalid,'elder').some(issue=>issue.includes('beforeText.en')));
  invalid=structuredClone(changed);invalid.scenes[0].beforeText.ru=[];assert.ok(validateManifest(invalid,'elder').some(issue=>issue.includes('silence must agree')));
  invalid=structuredClone(changed);invalid.scenes[0].beforeText={ru:[],en:[],es:[]};assert.deepEqual(validateManifest(invalid,'elder'),[]);
  invalid=structuredClone(changed);invalid.scenes[0].beforeNote={ru:'контекст',en:'context'};assert.ok(validateManifest(invalid,'elder').some(issue=>issue.includes('beforeNote.es')));
  assert.equal(chapterFolder('elder'),path.join(base,'production/chapters-02-04/elder'));
  assert.equal(chapterFolder('academy',2),path.join(base,'production/chapters-02-04/revision-02/academy'));
  assert.equal(chapterFolder('elder',3),path.join(base,'production/chapters-02-04/revision-03/elder'));
  assert.equal(chapterFolder('elder',4),path.join(base,'production/chapters-02-04/revision-04/elder'));
  assert.deepEqual(chaptersForRevision(),['elder','academy']);assert.deepEqual(chaptersForRevision(2),['elder','academy']);assert.deepEqual(chaptersForRevision(3),['elder']);
  assert.deepEqual(chaptersForRevision(4),['elder']);
  assert.deepEqual(chaptersForRevision(5),['elder']);
  assert.throws(()=>chapterFolder('academy',5));
  assert.equal(parseArgs(['--revision','5','--json']).revision,5);
  assert.throws(()=>chapterFolder('../elder',2));assert.throws(()=>chapterFolder('academy',3));assert.throws(()=>chapterFolder('academy',4));assert.throws(()=>chaptersForRevision(7));
  assert.equal(parseArgs([]).revision,1);assert.equal(parseArgs(['--revision','2','--json']).revision,2);
  assert.equal(parseArgs(['--revision','3','--allow-pending']).revision,3);
  assert.equal(parseArgs(['--revision','4','--allow-pending']).revision,4);
  for(const args of [['--revision'],['--revision','../2'],['--revision','7'],['--revision','4','--revision','3'],['--revision','3','--revision','2'],['--revision','2','--revision','1'],['2']])assert.throws(()=>parseArgs(args));
  const originalDesign={references:[],referenceMode:'original-design',referenceRationale:'First authored mural design; no image references supplied.'};
  assert.equal(referenceListValid(originalDesign,true),true,'honest original-design preproduction allowed');
  assert.equal(referenceListValid(originalDesign,false),false,'same empty-reference record rejected for scene');
  assert.equal(referenceListValid({...originalDesign,referenceRationale:''},true),false);
  assert.equal(referenceListValid({references:[]},true),false);
  const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1536,16);png.writeUInt32BE(1024,20);assert.deepEqual(imageDimensions(png),{width:1536,height:1024});assert.throws(()=>imageDimensions(Buffer.from('bad')));
  assert.equal(isPending('Pending generation and visual inspection.'),true);assert.equal(isPending('Inspected; hidden anatomy remains unverified.'),false);
  for(const file of ['chapter.json','scene.schema.json','shot-plan.json','shot-plan.schema.json'])readJSON(path.join(base,'production/chapter-template',file));
  new vm.Script(fs.readFileSync(path.join(base,'review/chapter-workshop.js'),'utf8'),{filename:'chapter-workshop.js'});
  console.log('Self-tests passed: revision routing/arguments, safe image and optional planning-diagram paths, duplicate IDs, sequence coverage, three languages, intentional silence, earlier-text comparison/context, original-design preproduction boundary, source evidence, image headers, pending review, template JSON and browser-script syntax.');
}
function main(){
  let options;try{options=parseArgs(process.argv.slice(2));}catch(error){console.error(`${error.message}\nUsage: node scripts/verify-chapter-workshop.cjs [--revision 1|2|3|4|5|6] [--allow-pending] [--self-test] [--json]`);process.exitCode=2;return;}
  const {revision,flags}=options;
  if(flags.has('--self-test')){selfTest();return;}
  for(const id of chaptersForRevision(revision))auditChapter(id,revision);
  for(const filename of ['chapter-workshop.html','chapter-workshop.css','chapter-workshop.js'])check(fs.existsSync(path.join(base,'review',filename)),`Workshop file missing: ${filename}`);
  const result={revision,auditedChapters:chaptersForRevision(revision),status:errors.length?'invalid':pending.length?'in-progress':'complete',stats,errors,pending,warnings,legacyFallbacks:[...new Set(fallbacks)],note:'Structural and file checks do not certify source fidelity, visual anatomy or narrative continuity. Full browser and human review are separate gates.'};
  if(flags.has('--json'))console.log(JSON.stringify(result,null,2));
  else{
    console.log(`Chapter workshop revision ${revision}: ${result.status.toUpperCase()} — ${stats.chapters} manifests, ${stats.scenes} scenes, ${stats.preproduction} reference entries, ${stats.images} checked image variants.`);
    for(const [label,items] of [['ERROR',errors],['PENDING',pending],['WARNING',warnings],['LEGACY FALLBACK',result.legacyFallbacks]])for(const item of items)console.log(`${label}: ${item}`);
    console.log(result.note);
    if(flags.has('--allow-pending')&&pending.length)console.log('Pending mode: this is a progress check, NOT a completion pass.');
  }
  if(errors.length||(!flags.has('--allow-pending')&&pending.length))process.exitCode=1;
}
if(require.main===module){try{main();}catch(error){console.error(error);process.exitCode=1;}}
module.exports={validateManifest,isImagePath,imageDimensions,isPending,chapterFolder,chaptersForRevision,parseArgs,referenceListValid,isPlanningDiagram};
