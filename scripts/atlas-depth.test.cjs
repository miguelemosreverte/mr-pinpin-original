const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../docs/storyboard/gpu/dof.js'), 'utf8');
const modulePromise = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('compact depth lookup matches RGBA bilinear sampling and releases its scratch canvas', async () => {
  const {depthLookup} = await modulePromise;
  const width = 17, height = 11, worldWidth = 1536, worldHeight = 1024;
  const bytes = Uint8ClampedArray.from({length:width*height*4}, (_, i) => (i * 71 + 19) % 256);
  const canvas = {width:0,height:0,getContext:() => ({drawImage() {},getImageData:() => ({data:bytes})})};
  const prior = global.document;
  global.document = {createElement:() => canvas};
  let lookup;
  try { lookup = depthLookup({width,height}, worldWidth, worldHeight); }
  finally { if (prior === undefined) delete global.document; else global.document = prior; }
  assert.equal(canvas.width * canvas.height, 1);
  const clamp = (n, high) => Math.min(high, Math.max(0, n));
  function reference([x,y]) {
    const px = clamp(x/worldWidth*width-.5,width-1), py = clamp(y/worldHeight*height-.5,height-1);
    const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(x0+1,width-1), y1 = Math.min(y0+1,height-1);
    const read = (a,b) => bytes[(b*width+a)*4]/255;
    const top = read(x0,y0)*(1-(px-x0))+read(x1,y0)*(px-x0);
    const bottom = read(x0,y1)*(1-(px-x0))+read(x1,y1)*(px-x0);
    return top*(1-(py-y0))+bottom*(py-y0);
  }
  const points = [[-500,-500],[0,0],[1536,1024],[2000,2000]];
  for (let i=0;i<1000;i++) points.push([(i*137)%2000-200,(i*97)%1400-200]);
  for (const point of points) assert.equal(lookup(point), reference(point));
  const value = lookup([100,200]);
  bytes.fill(0);
  assert.equal(lookup([100,200]), value, 'Lookup retains its own compact channel, not the readback');
});
