// Focused cache policy checks; browser pixel/timestamp QA lives in REPORT.md.
import assert from 'node:assert/strict';
import {tourImageCache} from '../../../tractor-tour-cache.js';
import {tractorPanoramaAnchor} from '../../../tractor-panorama-anchor.js';

let running=0,peak=0;
globalThis.Image=class {
 async decode(){
  peak=Math.max(peak,++running);
  await new Promise(resolve=>setTimeout(resolve,2));running--;
  if(this.src==='bad')throw Error('bad');
 }
};
const images=tourImageCache(3),first=images.load('one');
assert.equal(first,images.load('one'));
await Promise.all([first,...Array.from({length:10},(_,i)=>images.load('image-'+i))]);
assert.equal(peak,2);assert.equal(images.stats.decodedImages,3);
assert.equal(images.stats.pendingImages,0);
await assert.rejects(images.load('bad'));await assert.rejects(images.load('bad'));
images.clear();await images.load('transient',false);
assert.equal(images.stats.decodedImages,0);

let serial=0;
const gl=new Proxy({
 getShaderParameter:()=>true,getProgramParameter:()=>true,
 createTexture:()=>({id:++serial}),createShader:()=>({}),
 createProgram:()=>({}),createBuffer:()=>({}),
 getUniformLocation:()=>({}),getAttribLocation:()=>0
},{get:(target,key)=>target[key]??(()=>{})});
const image={width:3072,height:1536};
const anchor={yaw:0,pitch:0,fov:65,aspect:16/9,featherStart:.94};
function renderer(limit){
 return tractorPanoramaAnchor({getContext:()=>gl},image,null,anchor,{
  key:'00',maxPanoramas:limit,maxBytes:limit*image.width*image.height*4
 });
}
function demand(r,key){
 if(!r.hasPanorama(key))r.cachePanorama(key,image);
 r.setPanorama(key,null,anchor);
}
function idle(r,key){
 const neighbors=[key+'-next',key+'-previous'];r.setWarmPanoramas(neighbors);
 for(const n of neighbors)if(!r.hasPanorama(n))r.cachePanorama(n,image,true);
 assert.ok(r.stats.cachedPanoramas<=r.stats.maxPanoramas);
 assert.ok(r.stats.peakBytes<=r.stats.maxBytes);
 assert.ok(r.hasPanorama(key));
 for(const n of neighbors)assert.ok(r.hasPanorama(n));
}
const desktop=renderer(5);
for(const key of ['00','06','12']){demand(desktop,key);idle(desktop,key);}
for(const key of ['06','00','12']){
 assert.ok(desktop.hasPanorama(key),'visited stop remains warm: '+key);
 const uploads=desktop.stats.panoramaUploads;demand(desktop,key);
 assert.equal(desktop.stats.panoramaUploads,uploads);
 assert.equal(desktop.stats.recentVisits.at(-1),key);idle(desktop,key);
}
const constrained=renderer(3);
for(const key of ['00','06','12','06']){
 demand(constrained,key);idle(constrained,key);
 assert.equal(constrained.stats.cachedPanoramas,3);
 assert.deepEqual(constrained.stats.recentVisits,[key]);
}
desktop.destroy();constrained.destroy();assert.equal(desktop.stats.bytes,0);
console.log('Decode bounds/retry and desktop/mobile demand/speculative cache checks passed.');
