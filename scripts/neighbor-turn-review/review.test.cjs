'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {create,request,advance}=require('./scheduler.js');
const {createSheetCache}=require('./sheets.js');
const clips=Object.fromEntries(['loop000','loop015','turn000015','turn015000'].map(id=>[id,{durationMs:1000}]));
const yes=()=>true;
test('request waits for boundary, runs directed turn, then destination loop',()=>{
  let s=advance(create(clips),300,300,clips,yes);s=request(s,'015',300);
  s=advance(s,699,999,clips,yes);assert.equal(s.clip,'loop000');
  s=advance(s,1,1000,clips,yes);assert.equal(s.clip,'turn000015');assert.equal(s.lastWaitMs,700);
  s=advance(s,999,1999,clips,yes);assert.equal(s.mode,'turn');
  s=advance(s,1,2000,clips,yes);assert.equal(s.clip,'loop015');assert.equal(s.elapsedMs,0);assert.equal(s.lastTurnWallMs,1000);
});
test('unloaded turn or destination defers through whole loop, never draws missing clip',()=>{
  let s=request(create(clips),'015',10);
  s=advance(s,1000,1000,clips,id=>id!=='loop015');assert.equal(s.clip,'loop000');
  s=advance(s,999,1999,clips,yes);assert.equal(s.mode,'loop');
  s=advance(s,1,2000,clips,yes);assert.equal(s.clip,'turn000015');assert.equal(s.lastWaitMs,1990);
});
test('latest intent cancels queue without forcing phase matching',()=>{
  let s=request(create(clips),'015',10);assert.equal(request(s,'015',20),s);
  s=request(s,'000',30);assert.equal(s.pending,null);
  s=advance(s,2500,2500,clips,yes);assert.equal(s.clip,'loop000');assert.equal(s.elapsedMs,500);
});
test('request during turn dispatches return immediately at completion, never midway',()=>{
  let s=advance(request(create(clips),'015',0),1200,1200,clips,yes);
  s=request(s,'000',1200);s=advance(s,799,1999,clips,yes);assert.equal(s.clip,'turn000015');
  s=advance(s,1,2000,clips,yes);assert.equal(s.clip,'turn015000');assert.equal(s.lastWaitMs,800);
  assert.deepEqual(s.events.map(e=>e.type),['turn-end','turn-start']);
  s=advance(s,1000,3000,clips,yes);assert.equal(s.clip,'loop000');
});
test('paused/offscreen delta zero preserves phase and real wall wait',()=>{
  let s=advance(create(clips),600,600,clips,yes);s=request(s,'015',600);
  s=advance(s,0,5000,clips,yes);assert.equal(s.elapsedMs,600);
  s=advance(s,400,5400,clips,yes);assert.equal(s.clip,'turn000015');assert.equal(s.lastWaitMs,4800);
});
test('invalid clips, headings and clocks rejected',()=>{
  assert.throws(()=>create({}),/duration/);assert.throws(()=>request(create(clips),'030',0),/heading/);
  assert.throws(()=>advance(create(clips),-1,0,clips,yes),/clock/);
});
test('fresh concurrent sheet requests coalesce and predecode once',async()=>{
  let calls=0,resolve;const cache=createSheetCache(()=>{calls++;return new Promise(r=>resolve=r);});
  const a=cache.load('a'),b=cache.load('a');assert.equal(a,b);await Promise.resolve();assert.equal(calls,1);
  const image={width:2880};resolve(image);assert.equal(await a,image);assert.equal(cache.peek('a'),image);
  assert.equal(await cache.load('a'),image);assert.equal(calls,1);
});
test('failed decode is retryable and a fresh retry coalesces',async()=>{
  let calls=0;const cache=createSheetCache(()=>{if(++calls===1)throw Error('decode');return {ok:true};});
  await assert.rejects(cache.load('x'),/decode/);const a=cache.load('x'),b=cache.load('x');assert.equal(a,b);
  assert.deepEqual(await a,{ok:true});assert.equal(calls,2);
});

const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createHash}=require('node:crypto');
const {build,exactPrompt}=require('./build.cjs');
test('prompt section retains exact text, excluding later review prose',()=>{
  assert.equal(exactPrompt('## Exact prompt\nA & B.\n\n## Review\nNo.'),'A & B.');
  assert.throws(()=>exactPrompt('No prompt'),/missing/);
});
function fixture(t){
  const trial=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'neighbor-review-')));t.after(()=>fs.rmSync(trial,{recursive:true,force:true}));
  const write=(name,value)=>fs.writeFileSync(path.join(trial,name),typeof value==='string'?value:JSON.stringify(value));
  const hash=value=>createHash('sha256').update(value).digest('hex');
  write('a.png','a');write('b.png','b');write('sheet.webp','sheet');write('clip.mp4','clip');write('prompt.md','## Exact prompt\nActual edit <test>.');
  write('uploads.json',{anchors:[{heading:'000',sha256:hash('a'),download_sha256_verified:true,url:'https://secret.invalid/a'},{heading:'015',sha256:hash('b'),download_sha256_verified:true,url:'https://secret.invalid/b'}]});
  const pairs=[['015','015'],['000','015'],['015','000']];
  pairs.forEach(([from,to],i)=>write('record'+i+'.json',{status:'complete',sourceHash:hash(from==='000'?'a':'b'),metadata:{sha256:hash('clip'),width:1280,height:720,frameCount:25,duration:25/24},model:'test-endpoint',priceEstimate:{amount:.045},input:{prompt:'Exact video '+i,first_image_url:'https://secret.invalid/'+(from==='000'?'a':'b'),end_image_url:'https://secret.invalid/'+(to==='000'?'a':'b'),duration:1,resolution:'720p'}}));
  const sheets={clips:Object.keys(clips).map(id=>({id,sheet:'sheet.webp',sha256:hash('sheet'),fps:24,durationMs:1000,size:[24,1],frames:Array.from({length:24},(_,i)=>[i,0,1,1])}))};write('sheets.json',sheets);
  const spec={version:1,references:[{heading:'000',path:'a.png'},{heading:'015',path:'b.png'}],uploads:'uploads.json',sheets:'sheets.json',imagePromptRecord:'prompt.md',playbackNote:'0-23 only',joinSummary:'Not yet visually accepted.',nativeClips:pairs.map(([from,to],i)=>({from,to,record:'record'+i+'.json',video:'clip.mp4',label:'Clip '+i}))};
  write('manifest.json',spec);return {trial,manifest:'manifest.json',out:path.join(trial,'review'),write,spec,sheets};
}
test('build preserves roles/prompts, uses real assets, strips transport URLs, refuses overwrite',t=>{
  const f=fixture(t),html=fs.readFileSync(build(f),'utf8');
  assert(html.includes('Actual edit &lt;test&gt;.'));assert(html.includes('Exact video 2'));assert(html.includes('0.135'));
  assert(!html.includes('secret.invalid'));assert(!fs.readFileSync(path.join(f.out,'review-provenance.json'),'utf8').includes('secret.invalid'));
  assert(html.indexOf('Actual input references')<html.indexOf('<video'));assert(html.includes('controls loop muted playsinline'));
  assert.throws(()=>build(f),/EEXIST/);
});
test('builder rejects out-of-bounds sheets, changed hashes and escaped paths',t=>{
  const f=fixture(t);f.sheets.clips[0].frames[0]=[24,0,1,1];f.write('sheets.json',f.sheets);assert.throws(()=>build(f),/outside sheet/);
  f.sheets.clips[0].frames[0]=[0,0,1,1];f.write('sheets.json',f.sheets);f.write('a.png','changed');assert.throws(()=>build(f),/first image|binding/);
  assert.throws(()=>build({...f,manifest:'../outside.json'}),/relative/);
  assert.throws(()=>build({...f,out:path.join(__dirname,'not-created')}),/external/);
});
