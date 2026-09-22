const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../docs/storyboard/atlas-cover-selection.js'),'utf8');
const modulePromise=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const sample=(id,confidence=100)=>({id,confidence});
async function harness(options={}) {
  const {createCoverSelection}=await modulePromise;
  let now=0,serial=0;
  const timers=new Map(),changes=[];
  const selection=createCoverSelection({...options,onChange:id=>changes.push(id),
    setTimeout(fn,delay) { const id=serial++;timers.set(id,{fn,at:now+delay});return id; },
    clearTimeout(id) { timers.delete(id); }});
  function advance(ms) {
    const end=now+ms;
    while (true) {
      const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if (!next) break;
      const [id,timer]=next;timers.delete(id);now=timer.at;timer.fn();
    }
    now=end;
  }
  return {selection,changes,timers,advance};
}
test('first valid sample selects immediately even at zero confidence',async()=>{
  const h=await harness();
  assert.equal(h.selection.selected,null);
  assert.equal(h.selection.update(null),null);
  assert.equal(h.selection.update(sample('lake',0)),'lake');
  assert.equal(h.selection.selected,'lake');
  assert.deepEqual(h.changes,['lake']);
  h.selection.update(sample('lake'));
  assert.equal(h.timers.size,0);
  assert.deepEqual(h.changes,['lake']);
});
test('boundary noise toggling never commits a transient candidate',async()=>{
  const h=await harness();h.selection.update(sample('lake'));
  for (let i=0;i<20;i++) {
    h.selection.update(sample('elder'));h.advance(80);
    h.selection.update(sample('lake'));h.advance(80);
  }
  h.advance(1000);
  assert.equal(h.selection.selected,'lake');
  assert.deepEqual(h.changes,['lake']);
  assert.equal(h.timers.size,0);
});
test('low confidence holds the prior selection and cancels pending dwell',async()=>{
  const h=await harness();h.selection.update(sample('lake'));
  h.selection.update(sample('elder'));h.advance(150);
  h.selection.update(sample('elder',19));h.advance(1000);
  assert.equal(h.selection.selected,'lake');
  h.selection.update(sample('elder',20));h.advance(159);
  assert.equal(h.selection.selected,'lake');
  h.advance(1);
  assert.equal(h.selection.selected,'elder');
  assert.deepEqual(h.changes,['lake','elder']);
});
test('sustained repeated samples do not restart candidate dwell',async()=>{
  const h=await harness();h.selection.update(sample('lake'));
  h.selection.update(sample('elder',30));h.advance(80);
  h.selection.update(sample('elder',80));h.advance(79);
  assert.equal(h.selection.selected,'lake');
  h.advance(1);
  assert.equal(h.selection.selected,'elder');
  h.selection.update(sample('elder'));h.advance(1000);
  assert.deepEqual(h.changes,['lake','elder']);
});
test('a stopped character completes selection without another update or animation frame',async()=>{
  const h=await harness();h.selection.update(sample('lake'));
  h.selection.update(sample('home'));h.advance(160);
  assert.equal(h.selection.selected,'home');
  assert.deepEqual(h.changes,['lake','home']);
  assert.equal(h.timers.size,0);
});
test('changing candidate resets the full dwell, including returning to an earlier candidate',async()=>{
  const h=await harness();h.selection.update(sample('lake'));
  h.selection.update(sample('elder'));h.advance(120);
  h.selection.update(sample('home'));h.advance(120);
  h.selection.update(sample('elder'));h.advance(159);
  assert.equal(h.selection.selected,'lake');
  h.advance(1);
  assert.deepEqual(h.changes,['lake','elder']);
});
test('null and malformed samples cancel pending changes and hold the selection',async()=>{
  for (const invalid of [null,undefined,{},sample(null),sample(''),sample(1),
    sample('home',NaN),sample('home',Infinity),sample('home',-1),sample('home',101),{id:'home'}]) {
    const h=await harness();
    h.selection.update(invalid);
    assert.equal(h.selection.selected,null);
    h.selection.update(sample('lake'));h.selection.update(sample('elder'));h.advance(150);
    h.selection.update(invalid);h.advance(1000);
    assert.equal(h.selection.selected,'lake');
    assert.deepEqual(h.changes,['lake']);
    assert.equal(h.timers.size,0);
  }
});
test('returning to the selected region cancels a pending timer',async()=>{
  const h=await harness();h.selection.update(sample('lake'));
  h.selection.update(sample('elder'));h.advance(159);
  h.selection.update(sample('lake',0));h.advance(1000);
  assert.deepEqual(h.changes,['lake']);
  assert.equal(h.timers.size,0);
});
test('destroy cancels pending work and makes subsequent updates inert',async()=>{
  const h=await harness();h.selection.update(sample('lake'));
  h.selection.update(sample('elder'));h.advance(159);
  h.selection.destroy();h.selection.destroy();h.advance(1000);
  assert.equal(h.selection.update(sample('home')),'lake');
  assert.deepEqual(h.changes,['lake']);
  assert.equal(h.timers.size,0);
  const empty=await harness();empty.selection.destroy();empty.selection.update(sample('home'));
  assert.equal(empty.selection.selected,null);
});
test('custom confidence threshold and delay control selection',async()=>{
  const h=await harness({delayMs:40,minConfidence:60});h.selection.update(sample('lake'));
  h.selection.update(sample('elder',59));h.advance(100);
  assert.equal(h.selection.selected,'lake');
  h.selection.update(sample('elder',60));h.advance(39);
  assert.equal(h.selection.selected,'lake');h.advance(1);
  assert.equal(h.selection.selected,'elder');
});
