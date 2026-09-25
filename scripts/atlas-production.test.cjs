'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const load=()=>import('../docs/storyboard/atlas-production.js');
test('queryless public runtime activates accepted video, SDF ground and regen gait',async()=>{
  const {resolveAtlasRuntime}=await load(),r=resolveAtlasRuntime('','mr-pinpin.github.io');
  assert.equal(r.production,true);assert.equal(r.spriteSet,'video');assert.equal(r.groundEnabled,true);
  assert.equal(r.turnWalk,true);assert.equal(r.gaitModule,'sprite-turn-gait-regen.mjs');
  assert.equal(r.manifestUrl,'./images/atlas/walk/manifest.json');assert.equal(r.reviewCapture,false);
  assert(Object.isFrozen(r));
});
test('accepted explicit local review still uses frozen trial paths and settings',async()=>{
  const {resolveAtlasRuntime}=await load();
  const r=resolveAtlasRuntime('?spriteTrial=1&spriteSet=video&sandbox=1&gait=regen&reviewCapture=1','127.0.0.1');
  assert.equal(r.production,false);assert.equal(r.manifestUrl,'/__sprite-trial/manifest.json');
  assert.equal(r.groundEnabled,true);assert.equal(r.videoEnabled,true);assert.equal(r.reviewCapture,true);
  assert.equal(r.gaitModule,'sprite-turn-gait-regen.mjs');
});
test('public URL cannot activate capture or local manifest even with review query flags',async()=>{
  const {resolveAtlasRuntime}=await load();
  const r=resolveAtlasRuntime('?spriteTrial=1&sandbox=1&reviewCapture=1','mr-pinpin.github.io');
  assert.equal(r.reviewCapture,false);assert.equal(r.manifestUrl,'./images/atlas/walk/manifest.json');
  for(const q of ['','?sandbox=1','?reviewCapture=1'])assert.equal(resolveAtlasRuntime(q,'localhost').reviewCapture,false);
});
test('original-sprite, turn and family compatibility switches stay explicit',async()=>{
  const {resolveAtlasRuntime}=await load();
  assert.equal(resolveAtlasRuntime('?spriteSet=original','localhost').videoEnabled,false);
  assert.equal(resolveAtlasRuntime('?turnWalk=0','localhost').turnWalk,false);
  assert.equal(resolveAtlasRuntime('?family=1&familyPreview=1','localhost').groundEnabled,false);
  assert.equal(resolveAtlasRuntime('?spriteTrial=1&gait=classic','localhost').gaitModule,'sprite-turn-gait.mjs');
});
test('projected doorway arrival opens home only for doorway intent; local review remains suppressed',()=>{
  const source=fs.readFileSync(require.resolve('../docs/storyboard/atlas-webgpu.js'),'utf8');
  const start=source.indexOf('function arrive('),end=source.indexOf('\nfunction refresh()',start),navigations=[];
  const context=vm.createContext({URL,URLSearchParams,width:1536,height:1024,
    geometry:{width:1536,height:1024,routes:[{id:'home-to-lake',points:[[309/1536,712/1024]]}]},
    motion:{reviewDiagnostics:{planner:{goal:[309,712],endpoint:[312,717]}}},
    state:{},lang:'es',returnStorageKey:'return',sessionStorage:{setItem(){}},saveCamera(){},save(){},chooseBook(){},
    location:{search:'',href:'https://mr-pinpin.github.io/storyboard/atlas-webgpu.html',assign:u=>navigations.push(u)}});
  vm.runInContext(source.slice(start,end),context);context.arrive([314/1536,718/1024]);
  assert.deepEqual(navigations,['https://mr-pinpin.github.io/?lang=es']);
  context.motion.reviewDiagnostics.planner.goal=[340,730];context.arrive([312/1536,717/1024]);assert.equal(navigations.length,1);
  context.motion.reviewDiagnostics.planner.goal=[309,712];context.location.search='?spriteTrial=1&sandbox=1';
  context.arrive([312/1536,717/1024]);assert.equal(navigations.length,1);
});
