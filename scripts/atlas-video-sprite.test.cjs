const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../docs/storyboard/atlas-video-sprite.js');
const pad=n=>String(n).padStart(3,'0'),wrap=n=>(n%360+360)%360;
function manifest(){
  const clips={};
  for(let h=0;h<360;h+=15)for(const id of ['loop'+pad(h),'turn'+pad(h)+pad(wrap(h+15)),'turn'+pad(h)+pad(wrap(h-15))])
    clips[id]={sheet:'sheets/'+id+'.webp',size:[1440,540],frames:Array.from({length:24},(_,i)=>[i%6*240,Math.floor(i/6)*135,240,135])};
  return {grounding:{anchor:[120,111],referenceWidth:136},clips};
}
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
async function setup(options={}){
  const loaded=[],closed=[];
  const player=create({manifestUrl:'https://example.test/__sprite-trial/manifest.json',fetchManifest:async()=>manifest(),
    decodeImage:async src=>{loaded.push(src);return {width:1440,height:540,close(){closed.push(src);}};},...options});
  await player.ready;await flush();return {player,loaded,closed};
}
async function prepare(p,heading,moving=true){p.advance(0,{heading,moving});await flush();return p.advance(0,{heading,moving});}
function finishTurn(p,heading,moving=true){
  let consumed=0;
  while(!p.state.boundary){const r=p.advance(Math.min(250,p.state.remainingMs),{heading,moving});consumed+=r.consumedMs;}
  return consumed;
}
test('relative manifest URLs, initial single sheet and fixed anchor drawing',async()=>{
  const {player,loaded}=await setup();assert.equal(loaded[0],'https://example.test/__sprite-trial/sheets/loop000.webp');
  await flush();assert.deepEqual(loaded.slice(1).sort(),['https://example.test/__sprite-trial/sheets/turn000015.webp','https://example.test/__sprite-trial/sheets/turn000345.webp']);const calls=[];
  assert(player.draw({save(){},restore(){},drawImage(...a){calls.push(a);}},[300,400],56));
  const s=56/136;assert.deepEqual(calls[0].slice(1),[0,0,240,135,300-120*s,400-111*s,240*s,135*s]);player.dispose();
});
test('zero travel and unused allowance never move legs; actual distance commits only',async()=>{
  const {player}=await setup();
  for(let i=0;i<10;i++){assert.equal(player.advance(100,{moving:true}).walkMs,100);player.commitWalk(0);}
  assert.equal(player.state.elapsed,0);assert.equal(player.state.frame,0);
  player.advance(100,{moving:true});player.commitWalk(50);assert.equal(player.state.elapsed,50);
  player.advance(100,{moving:false});assert.equal(player.state.elapsed,50);assert.throws(()=>player.commitWalk(1));
  player.advance(100,{moving:true});player.commitWalk(100);assert.equal(player.state.elapsed,150);
  assert.throws(()=>player.commitWalk(1));player.dispose();
});
test('committed walk loops continuously but never delays heading change',async()=>{
  const {player}=await setup();for(let i=0;i<10;i++){player.advance(100,{moving:true});player.commitWalk(100);}
  assert.equal(player.state.frame,0);player.advance(200,{moving:true});player.commitWalk(200);
  for(let i=0;i<10;i++)player.advance(100,{moving:false});assert.equal(player.state.elapsed,200);
  const s=await prepare(player,15,false);assert.equal(s.clip,'turn000015');assert.equal(s.elapsed,0);
  assert.equal(s.durationMs,1000);assert.equal(finishTurn(player,15),1000);assert.equal(player.state.heading,15);player.dispose();
});
test('active native turn immutable, newest target applied only at adjacent endpoint',async()=>{
  const {player}=await setup();await prepare(player,180);player.advance(30,{heading:180});
  const duration=player.state.durationMs;assert.equal(duration,1000);
  player.advance(20,{heading:345});await flush();assert.equal(player.state.clip,'turn000015');assert.equal(player.state.durationMs,duration);
  assert.equal(finishTurn(player,0),duration-50);assert.equal(player.state.heading,15);
  await prepare(player,0);assert.equal(player.state.clip,'turn015000');assert.equal(player.state.durationMs,1000);
  assert.equal(finishTurn(player,0),1000);assert.equal(player.state.heading,0);player.dispose();
});
test('fractional native transition commits epsilon endpoint without tiny extra tick',async()=>{
  const {player}=await setup();await prepare(player,15);for(let i=0;i<59;i++)player.advance(1000/60,{heading:15});
  const r=player.advance(1000-player.state.elapsed-1e-10,{heading:15});
  assert.equal(r.elapsed,1000);assert.equal(r.boundary,true);assert.equal(r.heading,15);assert.equal(r.walkMs,0);player.dispose();
});
test('native turn samples progress at24fps regardless of total requested angle',async()=>{
  const {player}=await setup();await prepare(player,180);
  for(let i=1;i<=8;i++){
    const r=player.advance(125,{heading:180});assert.equal(r.frame,Math.min(23,i*3));
    assert.equal(r.durationMs,1000);assert.equal(r.walkMs,0);assert.equal(r.boundary,i===8);
  }assert.equal(player.state.heading,15);player.dispose();
});
test('all24 targets retain1000ms per adjacent turn, including12000ms half-turn',async()=>{
  const {player}=await setup();
  for(let desired=0;desired<360;desired+=15){
    player.reset(0);let spent=0,reached=false,previous=0,starts=0;
    for(let tick=0;tick<100;tick++){
      const s=await prepare(player,desired);
      if(s.mode==='walk'){assert.equal(s.heading,desired);reached=true;break;}
      if(s.waiting.length)continue;
      assert.equal(s.mode,'turn');starts++;assert.equal(s.to,wrap(previous+(desired<=180?15:-15)));
      assert.equal(s.durationMs,1000);assert.equal(s.remainingMs,1000);
      spent+=finishTurn(player,desired);previous=player.state.heading;
      assert(player.state.cache.entries<=8);
    }
    assert(reached,'target '+desired);assert.equal(starts,Math.min(desired/15,24-desired/15));
    assert.equal(spent,starts*1000);if(desired===180)assert.equal(spent,12000);
  }player.dispose();
});
test('all24 CW/CCW joins survive delayed decode and zero-time integration probes',async()=>{
  let tick=0;const gates=[];
  const {player}=await setup({decodeImage:()=>new Promise(resolve=>gates.push({at:tick+3,resolve}))});
  for(const direction of [1,-1])for(let i=1;i<=24;i++){
    const desired=wrap(i*direction*15);let reached=false;
    for(let limit=0;limit<90;limit++){
      tick++;for(const g of gates.splice(0))if(g.at<=tick)g.resolve({width:1440,height:540});else gates.push(g);
      await flush();const s=player.advance(0,{heading:desired,moving:true});
      if(s.ready&&!s.waiting.length){
        const dt=Math.min(1000/60,s.remainingMs);assert(dt>1e-7);
        const r=player.advance(dt,{heading:desired,moving:true});
        if(r.walkMs){player.commitWalk(r.walkMs);reached=true;break;}else assert.equal(r.mode,'turn');
      }
      assert(player.state.cache.entries<=8);assert(player.state.cache.loading<=2);
    }assert(reached,JSON.stringify(player.state));
  }player.dispose();for(const g of gates)g.resolve({width:1440,height:540});await flush();
});
test('loading, pause and large gaps freeze gait and clear credit without catchup',async()=>{
  const gates=[];const {player}=await setup({decodeImage:()=>new Promise(resolve=>gates.push(resolve))});
  assert.equal(player.advance(100,{moving:true}).walkMs,0);gates[0]({width:1440,height:540});await flush();
  player.advance(100,{moving:true});player.commitWalk(50);player.advance(5000,{moving:true});
  assert.equal(player.state.elapsed,50);assert.throws(()=>player.commitWalk(1));
  player.advance(100,{moving:true,paused:true});assert.equal(player.state.elapsed,50);
  player.advance(100,{moving:true});player.commitWalk(10);assert.equal(player.state.elapsed,60);player.dispose();
});
test('pause preserves active native clip and duration despite new intent',async()=>{
  const {player}=await setup();await prepare(player,180);player.advance(30,{heading:180});
  player.advance(200,{heading:0,paused:true});assert.equal(player.state.elapsed,30);assert.equal(player.state.clip,'turn000015');
  assert.equal(finishTurn(player,0),970);assert.equal(player.state.heading,15);player.dispose();
});
test('cache releases LRU images and stays bounded without72 preload',async()=>{
  const {player,loaded,closed}=await setup();
  for(let h=15;h<360;h+=15){player.reset(h);await flush();assert(player.state.cache.entries<=8);assert(player.state.cache.bytes<=8*1440*540*4);}
  assert(loaded.length<=24*3);assert(closed.length>=20);player.dispose();assert.equal(closed.length,loaded.length);
});
test('required failed turn reports unavailable despite current walk being ready',async()=>{
  let failures=0;const {player}=await setup({decodeImage:async src=>{
    if(src.includes('turn000015')){failures++;throw Error('offline');}return {width:1440,height:540};
  }});
  await prepare(player,15);for(let i=0;i<50;i++)player.advance(100,{heading:15,moving:true});await flush();
  const s=player.advance(0,{heading:15,moving:true});assert.equal(failures,2);assert(s.ready);
  assert.equal(s.waitingReason,'unavailable');assert.match(s.error,/turn000015/);assert.equal(s.walkMs,0);player.dispose();
});
test('failed destination walk exposes error while completed turn stays drawable',async()=>{
  let failures=0;const {player}=await setup({decodeImage:async src=>{
    if(src.includes('loop015')){failures++;throw Error('offline');}return {width:1440,height:540};
  }});
  await prepare(player,15);finishTurn(player,15);await flush();
  const s=player.advance(0,{heading:15,moving:true});
  assert.equal(s.heading,15);assert.equal(s.clip,'turn000015');assert.equal(s.frame,23);assert(s.ready);
  assert.equal(s.waitingReason,'unavailable');assert.match(s.error,/loop015/);assert.equal(s.walkMs,0);
  assert.equal(player.commitWalk(0).walkElapsed,0);assert.equal(failures,2);
  for(let i=0;i<10;i++)player.advance(100,{heading:15,moving:true});await flush();assert.equal(failures,2);player.dispose();
});
test('concurrent decodes<=2 and late disposed results released',async()=>{
  let active=0,peak=0,closed=0;const gates=[];
  const {player}=await setup({decodeImage:()=>{active++;peak=Math.max(peak,active);return new Promise(resolve=>gates.push(()=>{
    active--;resolve({width:1440,height:540,close(){closed++;}});
  }));}});
  player.advance(0,{heading:180});await flush();assert.equal(peak,2);player.dispose();for(const g of gates)g();await flush();assert.equal(closed,2);
});
test('invalid manifest fails closed after2 attempts without decoding',async()=>{
  let fetches=0,decodes=0;const p=create({manifestUrl:'https://example.test/m.json',fetchManifest:async()=>{fetches++;return {};},decodeImage:async()=>{decodes++;}});
  assert.equal(await p.ready,false);assert.equal(fetches,2);assert.equal(decodes,0);assert.match(p.state.error,/grounding/);p.dispose();
});
test('reverse walk commits play the loop backwards (sandbox backpedal)',async()=>{
  const {player}=await setup();await prepare(player,0);
  player.advance(100,{moving:true});player.commitWalk(100);assert.equal(player.state.elapsed,100);
  player.advance(100,{moving:true});player.commitWalk(100,{reverse:true});assert.equal(player.state.elapsed,0);
  player.advance(100,{moving:true});player.commitWalk(100,{reverse:true});
  assert.equal(player.state.elapsed,player.state.durationMs-100);assert.equal(player.state.frame,Math.floor((player.state.durationMs-100)*24/player.state.durationMs));player.dispose();
});
test('about-face clips: one in-place 180 clip, missing direction plays its opposite reversed, absent falls back to 15s',async()=>{
  const frames=Array.from({length:24},(_,i)=>[i%6*240,Math.floor(i/6)*135,240,135]);
  const withAbout=()=>{const m=manifest();for(const id of ['about270090','about000180'])m.clips[id]={sheet:'sheets/'+id+'.webp',size:[1440,540],frames};return m;};
  const {player}=await setup({fetchManifest:async()=>withAbout()});
  player.reset(270);let s=await prepare(player,90,false);
  assert.equal(s.clip,'about270090');assert.equal(s.to,90);assert.equal(s.reverse,false);assert.equal(s.frame,0);
  finishTurn(player,90,false);assert.equal(player.state.heading,90);
  s=await prepare(player,270,false);
  assert.equal(s.clip,'about270090');assert.equal(s.to,270);assert.equal(s.reverse,true);assert.equal(s.frame,23);
  for(let i=0;i<2;i++)player.advance(250,{heading:270,moving:false});assert.equal(player.state.frame,11);
  finishTurn(player,270,false);assert.equal(player.state.heading,270);
  player.reset(45);s=await prepare(player,225,false);assert.equal(s.clip,'turn045030','No about clip for 45: step toward the nearest about start');
  player.reset(0);s=await prepare(player,195,false);assert.equal(s.clip,'about000180','Near-opposite uses the about clip, then a small turn');
  player.dispose();
  const bad=manifest();bad.clips.about000170={sheet:'x.webp',size:[1440,540],frames};
  const {player:p2}=await setup({fetchManifest:async()=>bad});assert.equal(p2.state.error,null);p2.dispose();
});
test('walk pacing: stride travel keeps the loop mean, surges within it and inverts exactly',async()=>{
  const m=manifest();m.clips.loop000.pace={cycles:2,phase:0.7};
  const make=pace=>create({manifestUrl:'http://x/',fetchManifest:async()=>m,decodeImage:async()=>({width:1440,height:540}),pace});
  const flat=make(0),paced=make(.3);
  for(const p of [flat,paced]){p.reset(0);await prepare(p,0);}
  assert.equal(flat.walkTravel(250),250,'No pacing: identity');
  assert(Math.abs(paced.walkTravel(1000)-1000)<1e-9,'One loop travels exactly the nominal distance');
  const parts=Array.from({length:8},(_,i)=>paced.walkTravel((i+1)*125)-paced.walkTravel(i*125));
  assert(Math.max(...parts)-Math.min(...parts)>40,'Speed varies within the stride');
  assert(Math.abs(paced.walkTravel(paced.walkTimeFor(137))-137)<1e-6,'walkTimeFor inverts walkTravel');
});
