const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../docs/storyboard');
const projection=import(pathToFileURL(path.join(root,'atlas-banner-projection.js')));

test('known v2 ground plane maps to the authored tilt once, with positive Y',async()=>{
  const {bannerGroundNormal}=await projection;
  const metadata=JSON.parse(fs.readFileSync(path.join(root,'images/atlas/shire-normal-v2.json')));
  const slope=metadata.settings.depthScale*metadata.settings.groundSpan;
  for(const tilt of [0,45,66,85]) {
    const normal=bannerGroundNormal([[0,slope,1]],tilt),angle=tilt*Math.PI/180;
    assert(Math.abs(normal[0])<1e-12);
    assert(Math.abs(normal[1]-Math.sin(angle))<1e-12);
    assert(Math.abs(normal[2]-Math.cos(angle))<1e-12);
  }
});

test('ground calibration retains terrain slope and rejects foreground silhouettes',async()=>{
  const {bannerGroundNormal}=await projection;
  const ground=Array.from({length:18},()=>[.025,.52,1]);
  const normal=bannerGroundNormal([...ground,[1,-2,.1],[-2,3,.2],[0,-1,1],[NaN,0,1]],66);
  const reference=bannerGroundNormal(ground,66);
  assert.deepEqual(normal,reference);
  assert(normal[0]>0 && normal[1]>Math.sin(66*Math.PI/180));
  assert(Math.abs(Math.hypot(...normal)-1)<1e-12);
});

test('missing or unusable normals use the same upward ground basis',async()=>{
  const {bannerGroundNormal}=await projection;
  for(const samples of [[],[null,undefined,[0,0,0],[0,0,-1],[Infinity,0,1]]]) {
    const normal=bannerGroundNormal(samples,66);
    assert(normal[1]>.9 && normal[2]>.4 && normal[2]<.41);
  }
});
