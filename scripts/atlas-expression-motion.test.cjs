'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const modulePath=require.resolve('../docs/storyboard/atlas-expression-motion.js');
const {create}=require(modulePath);
const fields=['headYaw','headTilt','gazeX','gazeY','blink','smile'];
const sample=(scheduler,time,moving=false,heading=0)=>({...scheduler.evaluateElapsed(time,moving,heading)});

test('browser global works without DOM, RAF, timers, or ambient randomness',()=>{
  const context=vm.createContext({});
  vm.runInContext('Math.random=()=>{throw Error("ambient randomness");}',context);
  vm.runInContext(fs.readFileSync(modulePath,'utf8'),context);
  const scheduler=context.AtlasExpressionMotion.create({seed:'pinpin'});
  assert(Number.isFinite(scheduler.evaluateelapsed(12345,true,90).headYaw));
});

test('seeded samples survive arbitrary seeking, skipped frames, and paused time',()=>{
  const a=create({seed:'pinpin'}),b=create({seed:'pinpin'}),other=create({seed:'mama'});
  for(const time of [0,17,9000,24000,1234,3600000,0,24000]) {
    const expected=sample(a,time);
    b.evaluateElapsed(time+7000,true,180);
    assert.deepEqual(sample(b,time),expected);
    assert.deepEqual(sample(a,time),expected);
    assert.notEqual(sample(other,time).headYaw,expected.headYaw);
  }
  const reference=a.evaluateElapsed(5000);
  assert.strictEqual(a.evaluateElapsed(6000),reference,'one result object is reused');
});

test('moving and body heading never clock the expression or couple it to legs',()=>{
  const a=create({seed:42}),b=create({seed:42});
  for(let time=0;time<90000;time+=37) {
    assert.deepEqual(sample(a,time,true,(time/20)%360),sample(b,time,false,0));
  }
  const signatures=new Set();
  for(let step=0;step<150;step++) {
    // Revisit exactly the same phase of the existing 4 x 190ms gait.
    const pose=sample(a,step*760,true);
    signatures.add([pose.headYaw,pose.gazeX,pose.headTilt].map(n=>n.toFixed(5)).join(','));
  }
  assert(signatures.size>145,'expression does not repeat every stride');
});

test('blink singles and doubles have irregular spacing and over 2s between clusters',()=>{
  const scheduler=create({seed:'blink-proof'}),clusters=[];
  let active=false,lastEnd=-Infinity;
  for(let time=0;time<600000;time+=5) {
    const blinking=scheduler.evaluateElapsed(time).blink>0;
    if(blinking && !active) {
      if(time-lastEnd<500)clusters.at(-1).count++;
      else {
        assert(time-lastEnd>2000);
        clusters.push({start:time,count:1});
      }
    }
    if(!blinking && active)lastEnd=time;
    active=blinking;
  }
  assert(clusters.length>70);
  assert(clusters.some(c=>c.count===1));
  assert(clusters.some(c=>c.count===2));
  assert(clusters.every(c=>c.count<=2));
  const intervals=clusters.slice(1).map((c,i)=>c.start-clusters[i].start);
  assert(new Set(intervals).size>50);
  assert(Math.max(...intervals)-Math.min(...intervals)>3500);
});

test('head and gaze move smoothly, remain bounded, and smiles stay occasional',()=>{
  const scheduler=create({seed:19}),bounds=[15,3,.75,.45,1,.6];
  let previous=sample(scheduler,0),smiling=0,blinking=0;
  const max=Object.fromEntries(fields.map(key=>[key,0]));
  for(let time=10;time<=240000;time+=10) {
    const pose=sample(scheduler,time);
    fields.forEach((key,i)=>{
      assert(Number.isFinite(pose[key]));
      assert(Math.abs(pose[key])<=bounds[i]+1e-10,key);
      max[key]=Math.max(max[key],Math.abs(pose[key]));
    });
    assert(pose.blink>=0 && pose.smile>=0);
    for(const key of fields.slice(0,4))assert(Math.abs(pose[key]-previous[key])<.15,key);
    smiling+=Number(pose.smile>0);blinking+=Number(pose.blink>0);
    previous=pose;
  }
  fields.forEach(key=>assert(max[key]>.05,`${key} actually animates`));
  assert(smiling>100 && smiling<6000);
  assert(blinking>100 && blinking<2000);
});

test('reduced motion neutralizes all expressions and can be toggled without reseeding',()=>{
  const scheduler=create({seed:5,reducedMotion:true}),reference=create({seed:5});
  for(const time of [0,12345,99999]) {
    for(const key of fields)assert.equal(scheduler.evaluateElapsed(time)[key],0);
  }
  scheduler.setReducedMotion(false);
  assert.deepEqual(sample(scheduler,12345),sample(reference,12345));
  scheduler.setReducedMotion(true);
  for(const key of fields)assert.equal(scheduler.evaluateElapsed(12345)[key],0);
});

test('invalid times and option bounds remain finite; zero amplitudes are honored',()=>{
  const scheduler=create({maxHeadYaw:Infinity,maxHeadTilt:-2,maxGazeX:40,maxGazeY:NaN});
  for(const time of [NaN,Infinity,-Infinity,-1,undefined,'1000']) {
    assert.deepEqual(sample(scheduler,time),sample(scheduler,0));
  }
  const zero=create({maxHeadYaw:0,maxHeadTilt:0,maxGazeX:0,maxGazeY:0});
  for(let time=0;time<90000;time+=117) {
    const pose=scheduler.evaluateElapsed(time);
    assert(Math.abs(pose.headYaw)<=15 && Math.abs(pose.headTilt)===0);
    assert(Math.abs(pose.gazeX)<=1 && Math.abs(pose.gazeY)<=.45);
    for(const key of fields.slice(0,4))assert(zero.evaluateElapsed(time)[key]===0);
  }
});

test('pose offsets use explicit 15-degree metadata, never adjacent array entries',()=>{
  const directions=[{angle:90},{angle:345},{angle:30},{angle:0},{angle:15},{angle:NaN}];
  const scheduler=create({seed:4,directions}),seen=new Set();
  const sparse=create({seed:4,directions:[{angle:0},{angle:30},{angle:90}]});
  for(let time=0;time<240000;time+=113) {
    const pose=sample(scheduler,time,true,359);
    seen.add(pose.poseYawOffset);
    assert([0,15,345].includes(pose.poseAngle));
    assert.equal(pose.poseAngle,(pose.poseYawOffset+360)%360);
    assert.equal(sparse.evaluateElapsed(time,true,0).poseAngle,0);
    assert.equal(sparse.evaluateElapsed(time,true,0).poseYawOffset,0);
  }
  assert.deepEqual([...seen].sort((a,b)=>a-b),[-15,0,15]);
  assert.equal(create().evaluateElapsed(10000).poseAngle,null,'no invented assets');
  scheduler.setReducedMotion(true);
  assert.equal(scheduler.evaluateElapsed(10000,true,90).poseAngle,90);
  assert.equal(scheduler.evaluateElapsed(10000,true,90).poseYawOffset,0);
});
