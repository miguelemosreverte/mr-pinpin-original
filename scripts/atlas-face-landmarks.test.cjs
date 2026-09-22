const test=require('node:test');
const assert=require('node:assert/strict');
const {detect,opaque}=require('./build-atlas-face-landmarks.cjs');
function fixture(eyes=[]) {
  const image={width:100,height:100,data:Buffer.alloc(100*100*4)};
  for(let i=0;i<image.data.length;i+=4)image.data.set([180,180,180,253],i);
  for(const [x0,y0] of eyes)for(let y=y0;y<y0+9;y++)for(let x=x0;x<x0+9;x++) {
    image.data.set([50,50,50,253],(y*100+x)*4);
  }
  return image;
}
const frame={rect:[0,0,100,100],anchor:[50,95]};
test('near-opaque registration accepts prepared alpha but rejects transparent pixels and out-of-crop regions',()=>{
  const image=fixture();
  assert(opaque(image,frame.rect,[20,20,20,20]));
  image.data[(30*100+30)*4+3]=244;
  assert(!opaque(image,frame.rect,[20,20,20,20]));
  assert(!opaque(image,frame.rect,[-1,20,20,20]));
});
test('profile eye candidates retain the entire changed region inside a quiet feather border',()=>{
  const eyes=detect(fixture([[75,45]]),fixture(),frame,0);
  assert.equal(eyes.length,1);
  assert.deepEqual(eyes[0].features,[75,45,9,9]);
  assert.deepEqual(eyes[0].error,{mean:0,max:0});
  const [x,y,w,h]=eyes[0].bounds;
  assert(x<=70 && y<=40 && x+w>=89 && y+h>=59);
});
test('frontal pairs stay distinct; identical or rear-facing artwork does not invent eye regions',()=>{
  assert.equal(detect(fixture([[30,60],[60,60]]),fixture(),frame,90).length,2);
  const image=fixture([[75,45]]);
  assert.deepEqual(detect(image,image,frame,0),[]);
  assert.deepEqual(detect(image,fixture(),frame,270),[]);
});
