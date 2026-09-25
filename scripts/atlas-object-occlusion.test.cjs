'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../docs/storyboard/gpu');
const source=fs.readFileSync(path.join(root,'object-occlusion.js'),'utf8').replaceAll('import.meta.url',JSON.stringify('file://'+path.join(root,'object-occlusion.js')));
const modulePromise=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const legacyPromise=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(root,'occlusion.js'),'utf8')).toString('base64'));
function image(width,height) {
  const data=new Uint8Array(width*height*4);
  for(let i=3;i<data.length;i+=4)data[i]=255;
  return {width,height,data};
}
function fixture() {
  const width=12,height=20,instances=image(width,height),ground=image(width,256);
  for(let x=0;x<width;x++) {
    const value=(x<6?12:16)*16,offset=(width+x)*4;
    ground.data.set([value>>8,value&255,255,255],offset);
  }
  for(let x=0;x<width;x++)for(let y=2;y<10;y++)instances.data.set([1,255,0,255],(y*width+x)*4);
  return {instances,ground,width,height};
}
test('opaque front/back follows character foot column, not silhouette/wheel column',async()=>{
  const {objectVisibility,validateObjectOcclusion}=await modulePromise,images=fixture();
  validateObjectOcclusion(images.instances,images.ground,images.width,images.height);
  assert.equal(objectVisibility(images,[10,4],[3,13]),1,'front character cannot be cut by a nearer wheel-column threshold');
  assert.equal(objectVisibility(images,[2,4],[8,13]),0,'rear character cannot jump on the nearer panel');
  for(const footY of [11,11.99,12,12.01,13])for(const fragment of [[1,2],[5,8],[10,4]]) {
    assert.equal(objectVisibility(images,fragment,[3,footY]),footY>=12?1:0,'no whole-body translucency band');
  }
});
test('unknown ground and missing contact profiles remain opaque; only silhouette coverage antialiases',async()=>{
  const {objectVisibility}=await modulePromise,images=fixture();
  assert.equal(objectVisibility(images,[3,15],[3,0]),1);
  assert.equal(objectVisibility(images,[-1,4],[3,0]),1);
  images.ground.data[(images.width+3)*4+2]=0;
  assert.equal(objectVisibility(images,[3,4],[3,0]),1);
  images.instances.data[(4*images.width+5)*4+1]=128;
  assert.equal(objectVisibility(images,[5,4],[2,0]),1-128/255);
  assert.equal(objectVisibility(images,[5,4],[2,12]),1);
});
test('mode0 tree/bush instance profile retains its independent opaque ordering',async()=>{
  const {objectVisibility}=await modulePromise,images=fixture();
  images.instances.data.set([2,255,0,255],(4*images.width+5)*4);
  for(let x=0;x<images.width;x++)images.ground.data.set([0,18*16 & 255,0,255],(2*images.width+x)*4);
  const value=18*16;
  for(let x=0;x<images.width;x++)images.ground.data.set([value>>8,value&255,255,255],(2*images.width+x)*4);
  assert.equal(objectVisibility(images,[5,4],[3,15]),0,'canopy is in front although neighboring object is behind');
  assert.equal(objectVisibility(images,[5,4],[3,19]),1,'foreground feet clear the complete canopy pixel');
  assert.equal(objectVisibility(images,[4,4],[3,15]),1);
});
test('profiles floor and clamp foot X and preserve RG byte carries',async()=>{
  const {objectVisibility}=await modulePromise,images=fixture();
  const value=15.9375*16;images.ground.data.set([value>>8,value&255,255,255],images.width*4);
  assert.equal(objectVisibility(images,[5,4],[-100,15.9]),0);
  assert.equal(objectVisibility(images,[5,4],[.99,15.9375]),1);
  assert.equal(objectVisibility(images,[5,4],[100,15.99]),0);
  assert.equal(objectVisibility(images,[5,4],[100,16]),1);
  assert.throws(()=>objectVisibility(images,[NaN,0],[0,0]),TypeError);
});
test('malformed textures fail before upload, with explicit no-fallback data contract',async()=>{
  const {validateObjectOcclusion}=await modulePromise;
  for(const mutate of [x=>x.instances.width++,x=>x.ground.height--,
    x=>x.instances.data[3]=0,x=>x.instances.data[1]=255,x=>x.instances.data[2]=1,
    x=>x.instances.data.set([0,255,2,255],0),x=>x.instances.data.set([1,255,255,255],0),
    x=>x.ground.data[2]=127,x=>x.ground.data.set([255,255,255,255],12*4)]) {
    const x=fixture();mutate(x);assert.throws(()=>validateObjectOcclusion(x.instances,x.ground,x.width,x.height));
  }
});
test('authored canopy mode admits ID0 without a ground profile and requires pixel visibility',async()=>{
  const {objectVisibility,validateObjectOcclusion}=await modulePromise,x=fixture();
  x.instances.data.set([0,255,1,255],(4*x.width+3)*4);
  validateObjectOcclusion(x.instances,x.ground,x.width,x.height);
  for(const v of [0,.2,.6,1])assert(Math.abs(objectVisibility(x,[3,4],[3,19],v)-v)<1e-12);
  for(const v of [undefined,NaN,Infinity,-.1,1.1])assert.throws(()=>objectVisibility(x,[3,4],[3,19],v),/requires/);
  assert.equal(objectVisibility(x,[3,15],[3,0],0),1,'ID0 mode0 is still clear ground');
});
test('canopy coverage is per pixel, independent of IDs and root thresholds',async()=>{
  const {objectVisibility}=await modulePromise,x=fixture();
  for(const id of [0,1,255]) {
    x.instances.data.set([id,128,1,255],(4*x.width+3)*4);
    assert.equal(objectVisibility(x,[3,4],[3,0],0),1-128/255);
    assert.equal(objectVisibility(x,[3,4],[3,19],0),1-128/255,'front-of-root foot does not bypass canopy');
    assert.equal(objectVisibility(x,[3,4],[3,0],1),1);
  }
  assert.equal(objectVisibility(x,[4,4],[3,0],1),0,'neighboring mode0 profile ignores artistic depth');
});
test('shared scene depth still yields each member own legacy foot visibility',async()=>{
  const {objectVisibility}=await modulePromise,{visibility,groundDepth}=await legacyPromise,x=fixture();
  x.instances.data.set([0,255,1,255],(4*x.width+3)*4);
  const scene=.22,footYs=[400,700,900];
  const actual=footYs.map(y=>objectVisibility(x,[3,4],[3,y],visibility(scene,groundDepth(y))));
  assert.deepEqual(actual,footYs.map(y=>visibility(scene,groundDepth(y))));
  assert.equal(actual[0],0);assert.equal(actual[2],1);assert(actual[1]>0&&actual[1]<1);
});
test('mode0 hard-profile visibility is invariant to every supplied canopy result',async()=>{
  const {objectVisibility}=await modulePromise,x=fixture();
  for(let px=0;px<x.width;px++)for(let py=0;py<x.height;py++)for(const y of [0,11.99,12,15.99,16,20]) {
    const expected=objectVisibility(x,[px,py],[px,y]);
    for(const legacy of [0,.25,.75,1])assert.equal(objectVisibility(x,[px,py],[px,y],legacy),expected);
  }
});
test('versioned canopy instances retain ground-v2 pairing',async()=>{
  const {OBJECT_INSTANCE_SOURCE,OBJECT_GROUND_SOURCE}=await modulePromise;
  assert.match(OBJECT_INSTANCE_SOURCE,/shire-object-instances-v2\.png$/);
  assert.match(OBJECT_GROUND_SOURCE,/shire-object-ground-v2\.png$/);
});
test('asset loader decodes once; GPU upload preserves integer data and releases partial failures',async()=>{
  const {loadObjectOcclusion,uploadObjectOcclusion}=await modulePromise,x=fixture(),decoded=[];
  const loaded=await loadObjectOcclusion({width:x.width,height:x.height,instanceSource:'instances',groundSource:'ground',
    decodeImage:async src=>{decoded.push(src);return src==='instances'?x.instances:x.ground;}});
  assert.deepEqual(decoded,['instances','ground']);
  const old=global.GPUTextureUsage;global.GPUTextureUsage={TEXTURE_BINDING:1,COPY_DST:2};
  try {
    const created=[],writes=[];
    const device={createTexture:options=>{const texture={options,destroyed:false,destroy(){this.destroyed=true;}};created.push(texture);return texture;},
      queue:{writeTexture:(dest,bytes,layout,size)=>writes.push({dest,bytes,layout,size})}};
    const uploaded=uploadObjectOcclusion(device,loaded);
    assert.equal(uploaded.bytes,(12*20+12*256)*4);assert.equal(writes.length,2);
    assert.equal(writes[0].bytes,x.instances.data);assert.equal(writes[1].bytes,x.ground.data);
    assert(created.every(t=>t.options.format==='rgba8unorm'));
    device.queue.writeTexture=()=>{throw Error('upload failure');};
    assert.throws(()=>uploadObjectOcclusion(device,loaded),/upload failure/);
    assert.equal(created.at(-1).destroyed,true);
  } finally {if(old===undefined)delete global.GPUTextureUsage;else global.GPUTextureUsage=old;}
});
test('shader gates shared legacy depth by pixel mode and keeps profile ordering generic',()=>{
  const shader=fs.readFileSync(path.join(root,'world.wgsl'),'utf8'),renderer=fs.readFileSync(path.join(root,'renderer.js'),'utf8');
  assert.doesNotMatch(shader+renderer,/tractor_ground|tractor_sprite|TRACTOR_|tractor-ground/);
  assert.match(shader,/textureLoad\(object_ground, vec2i\(x, id\), 0\)/);
  assert.match(shader,/floor\(foot\.x\)/);
  assert.match(shader,/characters\[i\] \*= object_visibility\(instance, frame\.members\[i\]\.slice\.zw, scene, frame\.members\[i\]\.depths\.z\)/);
  assert(shader.indexOf('round(instance.b * 255.0)')<shader.indexOf('if (id == 0'));
  assert.equal((shader.match(/scene \/= 9\.0/g)||[]).length,1,'one shared neighborhood');
  assert.match(shader,/legacy_overlay \|\| \(semantic_overlap && i32\(round\(instance\.b \* 255\.0\)\) == 1\)/);
  assert.doesNotMatch(shader,/characters\[i\] \*= visibility/);
  assert.match(shader,/label\.a > 0\.0 \|\| \(frame\.occlusion\.x == 0\.0 && top\.a > 0\.0\)/);
  assert.match(shader,/if \(frame\.occlusion\.x == 0\.0\) \{ top \*= visibility/);
  assert.match(renderer,/captureReviewFrame\(/);
});
