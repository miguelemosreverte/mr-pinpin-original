const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {createHash,webcrypto}=require('node:crypto');
const {gzipSync,gunzipSync}=require('node:zlib');
const source=fs.readFileSync(path.join(__dirname,'../docs/storyboard/atlas-focus.js'),'utf8');
const regions=[{id:'lake',color:[255,0,0]},{id:'elder',color:[128,0,255]},
  {id:'bridge',color:[0,255,255]},{id:'home',color:[0,255,0]}];
async function detector(rectangles,{width=1000,height=700,onRead=()=>{},mutateData=()=>{},
  onDecode=()=>{},focusField,fetch,crypto,DecompressionStream=globalThis.DecompressionStream}={}) {
  const data=new Uint8ClampedArray(width*height*4);
  for (const [id,x0,y0,x1,y1] of rectangles) {
    const color=regions.find(region=>region.id===id).color;
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) data.set([...color,255],(y*width+x)*4);
  }
  mutateData(data);
  const context={window:{},structuredClone,URL,fetch,crypto,DecompressionStream,Response,
    Image:class {async decode(){onDecode();}},
    document:{baseURI:'https://example.test/storyboard/',
      createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>{onRead();return {data};}})})}};
  vm.runInNewContext(source,context);
  return context.window.AtlasFocus.create({width,height,regions,mask:'mock.png',focusField});
}
const point=(x,y)=>[x/1000,y/700];
function camera(x,y,zoom=.75,span=600,aspect=1.5) {
  const center=point(x,y),size={x:900,y:900/aspect};
  return {getSize:()=>size,getCenter:()=>center,getZoom:()=>zoom,
    containerPointToLatLng:([px,py])=>point(x+(px/size.x-.5)*span,y+(py/size.y-.5)*span/aspect)};
}
const evaluate=(focus,...args)=>focus.evaluate(camera(...args),0,p=>p);
test('direct hits, nearby shore, radius limit, invalid points and ambiguous gaps',async()=>{
  const focus=await detector([['lake',100,100,300,300],['elder',360,100,500,300]]);
  assert.equal(focus.regionAt(point(200,200)),'lake');
  assert.equal(focus.regionAt(point(80,200)),null);
  assert.equal(focus.regionAt(point(80,200),{nearby:true}),'lake');
  assert.equal(focus.regionAt(point(52,200),{nearby:true}),'lake');
  assert.equal(focus.regionAt(point(51,200),{nearby:true}),null);
  assert.equal(focus.regionAt(point(330,200),{nearby:true}),null);
  assert.equal(focus.regionAt(point(310,200),{nearby:true}),'lake');
  for(const p of [[NaN,0],[Infinity,0],[-.01,.2],[1,.5],null]) assert.equal(focus.regionAt(p,{nearby:true}),null);
});
test('natural shoreline and off-center views acquire without exact center or full zoom step',async()=>{
  const focus=await detector([['lake',150,120,450,380],['elder',700,50,850,230]]);
  assert.equal(evaluate(focus,300,405),'lake');
  assert.equal(focus.diagnostic.center,null);
  assert.equal(evaluate(focus,625,140),'elder');
  assert.equal(focus.diagnostic.center,null);
  assert.equal(evaluate(focus,675,140,.75,350,.6),'elder');
});
test('overview and ambiguous camera gaps have no focus, including after acquisition',async()=>{
  const focus=await detector([['lake',100,100,300,400],['elder',360,100,560,400]]);
  assert.equal(evaluate(focus,200,200,0),null);
  assert.equal(evaluate(focus,200,200,.75),'lake');
  assert.equal(evaluate(focus,330,200,.75),null);
  assert.equal(evaluate(focus,200,200,0),null);
  assert.equal(evaluate(focus,800,600,2),null);
});
test('deliberate bridge center and nearby path beat larger lake coverage',async()=>{
  const focus=await detector([['lake',200,100,600,335],['bridge',420,360,640,385]]);
  for(const y of [370,395]) {
    assert.equal(evaluate(focus,500,y,.75,1000),'bridge');
    const d=focus.diagnostic;
    assert(d.coverageByRegion.lake>d.coverageByRegion.bridge);
    assert(d.dominance<.5);
  }
});
test('viewport sampling cannot override an ambiguous nearby gap',async()=>{
  const focus=await detector([['lake',100,100,300,400],['elder',330,100,560,400]]);
  assert.equal(focus.regionAt(point(309,200),{nearby:true}),null);
  assert.equal(evaluate(focus,309,200,2,150),null);
});
test('zoom hysteresis retains arrival, then clears at overview; diagnostic is detached',async()=>{
  const focus=await detector([['lake',100,100,500,500]]);
  assert.equal(evaluate(focus,300,300,.4),null);
  assert.equal(evaluate(focus,300,300,.5),'lake');
  assert.equal(evaluate(focus,300,300,.4),'lake');
  const diagnostic=focus.diagnostic;diagnostic.coverageByRegion.lake=0;
  assert(focus.diagnostic.coverageByRegion.lake>0);
  assert.equal(evaluate(focus,300,300,.3),null);
});
test('nearest region includes all labels and preserves even single-pixel direct hits',async()=>{
  const focus=await detector([
    ['lake',0,0,1000,700],['elder',400,200,401,201],
    ['bridge',700,400,701,401],['home',900,600,901,601]
  ]);
  for (const [id,x,y] of [['lake',10,10],['elder',400,200],['bridge',700,400],['home',900,600]]) {
    assert.equal(focus.regionAt(point(x+.5,y+.5)),id);
    assert.equal(focus.nearestRegionAt(point(x+.5,y+.5)),id);
  }
});
test('nearest region rejects invalid points and returns null for an empty mask',async()=>{
  const focus=await detector([['lake',100,100,200,200]]);
  for (const p of [null,undefined,{},'0,0',[],[0],[0,0,0],[NaN,0],[0,Infinity],
    [-.001,.2],[.2,-.001],[1,.5],[.5,1],[2,2],['.2',.2]]) {
    assert.equal(focus.nearestRegionAt(p),null);
    assert.deepEqual({...focus.sampleRegion(p)},{id:null,confidence:0});
  }
  const empty=await detector([],{width:19,height:13});
  for (const p of [[0,0],[.5,.5],[.999,.999]]) {
    assert.equal(empty.nearestRegionAt(p),null);
    assert.deepEqual({...empty.sampleRegion(p)},{id:null,confidence:0});
  }
});
test('nearest segments resolve gaps, distant positions, borders and deterministic ties',async()=>{
  const focus=await detector([['lake',100,100,301,301],['elder',360,100,501,301]]);
  for (const [x,y,id] of [[0,0,'lake'],[310,200,'lake'],[330,200,'lake'],
    [331,200,'elder'],[350,200,'elder'],[999,699,'elder'],[200,699,'lake']]) {
    assert.equal(focus.nearestRegionAt(point(x,y)),id);
  }
  assert.equal(focus.regionAt(point(330,200),{nearby:true}),null);
  assert.equal(focus.regionAt(point(999,699),{nearby:true}),null);
});
test('nearest uses actual segment pixels rather than region centers or normalized-axis distance',async()=>{
  const focus=await detector([['lake',100,100,800,110],['bridge',800,180,820,200]]);
  const position=point(790,120);
  assert(Math.hypot(790-810,120-190)<Math.hypot(790-450,120-105));
  assert.equal(focus.nearestRegionAt(position),'lake');
  const nonSquare=await detector([['lake',500,100,501,101],['bridge',600,190,601,191]]);
  assert.equal(nonSquare.nearestRegionAt(point(600,100)),'bridge');
});
test('cached nearest queries are stable across camera evaluation and read the image only once',async()=>{
  let reads=0;
  const focus=await detector([['lake',100,100,300,400],['elder',600,100,900,400]],{onRead:()=>reads++});
  const positions=[point(10,10),point(350,200),point(999,699)];
  const expected=positions.map(p=>focus.nearestRegionAt(p));
  const expectedSamples=positions.map(p=>({...focus.sampleRegion(p)}));
  const before=focus.diagnostic;
  for (let i=0;i<1000;i++) {
    assert.deepEqual(positions.map(p=>focus.nearestRegionAt(p)),expected);
    assert.deepEqual(positions.map(p=>({...focus.sampleRegion(p)})),expectedSamples);
  }
  assert.deepEqual(focus.diagnostic,before);
  assert.equal(evaluate(focus,750,250,2),'elder');
  assert.deepEqual(positions.map(p=>focus.nearestRegionAt(p)),expected);
  assert.equal(reads,1);
});
test('nearest field matches exhaustive Euclidean search on irregular masks and degenerate dimensions',async()=>{
  for (const [width,height] of [[31,23],[1,23],[31,1]]) {
    const seeds=[];
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      if ((x*17+y*31+x*y)%29===0) seeds.push([regions[(x+y)%regions.length].id,x,y]);
    }
    const focus=await detector(seeds.map(([id,x,y])=>[id,x,y,x+1,y+1]),{width,height});
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      let expected=null,best=Infinity;
      const distances=new Map();
      for (const [id,sx,sy] of seeds) {
        const distance=(sx-x)**2+(sy-y)**2;
        distances.set(id,Math.min(distances.get(id) ?? Infinity,distance));
        if (distance<best) { best=distance;expected=id; }
      }
      const position=[(x+.5)/width,(y+.5)/height];
      assert.equal(focus.nearestRegionAt(position),expected,`${width}x${height} at ${x},${y}`);
      const second=Math.min(...[...distances].filter(([id])=>id!==expected).map(([,d])=>d));
      const confidence=Number.isFinite(second) ? Math.round(Math.min(1,(Math.sqrt(second)-Math.sqrt(best))/24)*100) : 0;
      assert.deepEqual({...focus.sampleRegion(position)},{id:expected,confidence},`${width}x${height} confidence at ${x},${y}`);
    }
  }
});
test('confidence compares distinct regions, including direct hits next to a shared boundary',async()=>{
  const width=100,height=20;
  const focus=await detector([['lake',0,0,50,20],['elder',50,0,100,20]],{width,height});
  const at=x=>({...focus.sampleRegion([(x+.5)/width,10.5/height])});
  assert.deepEqual(at(49),{id:'lake',confidence:4});
  assert.deepEqual(at(50),{id:'elder',confidence:4});
  assert.deepEqual(at(38),{id:'lake',confidence:50});
  assert.deepEqual(at(26),{id:'lake',confidence:100});
  assert.deepEqual(at(73),{id:'elder',confidence:100});
});
test('equidistant regions have zero confidence, with distance gaps increasing smoothly',async()=>{
  const width=101,height=3;
  const focus=await detector([['lake',20,1,21,2],['elder',80,1,81,2]],{width,height});
  for (const [x,id,confidence] of [[50,'lake',0],[49,'lake',8],[51,'elder',8],
    [44,'lake',50],[56,'elder',50],[38,'lake',100],[62,'elder',100]]) {
    assert.deepEqual({...focus.sampleRegion([(x+.5)/width,1.5/height])},{id,confidence});
  }
});
test('absent competitors and unrecognized mask colors cannot create false certainty',async()=>{
  const options={width:31,height:7};
  const single=await detector([['lake',10,2,20,5]],options);
  for (const p of [[0,0],[.5,.5],[.999,.999]]) {
    assert.deepEqual({...single.sampleRegion(p)},{id:'lake',confidence:0});
  }
  const unknown=await detector([],{...options,mutateData(data) {
    for (let i=0;i<data.length;i+=4) data.set([255,255,255,255],i);
  }});
  assert.deepEqual({...unknown.sampleRegion([.5,.5])},{id:null,confidence:0});
  const transparent=await detector([],{...options,mutateData(data) {
    for (let i=0;i<data.length;i+=4) data.set([255,0,0,127],i);
  }});
  assert.deepEqual({...transparent.sampleRegion([.5,.5])},{id:null,confidence:0});
});
test('field metadata describes an immutable two-byte texture at source resolution',async()=>{
  const focus=await detector([],{width:1536,height:1024});
  const metadata=focus.fieldMetadata;
  assert.equal(metadata.width,1536);
  assert.equal(metadata.height,1024);
  assert.equal(metadata.channels,2);
  assert.equal(metadata.byteLength,3*1024*1024);
  assert.equal(metadata.confidenceGapPixels,24);
  assert.match(metadata.encoding.label,/0 unknown/);
  assert.match(metadata.encoding.confidence,/geometric separation/);
  assert(Object.isFrozen(metadata));
  assert(Object.isFrozen(metadata.encoding));
});
function prebuilt({manifest:overrides={},bytes=new Uint8Array([1,228,2,132,0,0]),crypto}={}) {
  const context={window:{}};vm.runInNewContext(source,context);
  const format=JSON.parse(JSON.stringify(context.window.AtlasFocus.fieldFormat));
  const manifest={...format,width:3,height:1,byteLength:6,sourceMask:'mock.png',
    sourceSha256:'a'.repeat(64),regions,data:'test-field.bin',
    sha256:createHash('sha256').update(bytes).digest('hex'),...overrides};
  const calls=[],counts={decode:0,read:0};
  const options={width:3,height:1,crypto,focusField:'images/atlas/test-field.json',
    onDecode(){counts.decode++;},onRead(){counts.read++;},
    async fetch(url) {
      calls.push(String(url));
      return calls.length===1 ? {ok:true,json:async()=>manifest} :
        {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
    }};
  return {options,calls,counts,manifest,bytes};
}
test('valid prebuilt texture loads without mask decode or image work and samples in O(1)',async()=>{
  for (const crypto of [undefined,webcrypto]) {
    const h=prebuilt({crypto}),focus=await detector([],{...h.options});
    assert.equal(focus.fieldMetadata.source,'prebuilt');
    assert.deepEqual(h.calls,['https://example.test/storyboard/images/atlas/test-field.json',
      'https://example.test/storyboard/images/atlas/test-field.bin']);
    for (let i=0;i<1000;i++) {
      assert.deepEqual({...focus.sampleRegion([.1,.5])},{id:'lake',confidence:100});
      assert.deepEqual({...focus.sampleRegion([.5,.5])},{id:'elder',confidence:4});
      assert.deepEqual({...focus.sampleRegion([.9,.5])},{id:null,confidence:0});
    }
    assert.equal(focus.regionAt([.1,.5]),'lake');
    assert.equal(focus.regionAt([.5,.5]),'elder');
    assert.deepEqual(h.counts,{decode:0,read:0});
    assert.equal(h.calls.length,2);
  }
});
test('malformed or stale prebuilt manifests fall back to preparing the decoded mask',async()=>{
  const invalid=[{version:2},{format:'other'},{width:4},{height:2},{channels:3},{byteLength:5},
    {sourceMask:'stale.png'},{sourceSha256:'invalid'},{sha256:'invalid'},
    {confidenceGapPixels:12},{encoding:{label:'bad',confidence:'bad'}},
    {regions:[]},{regions:[...regions].reverse()},{data:'../elsewhere.bin'},{data:42}];
  for (const manifest of invalid) {
    const h=prebuilt({manifest}),focus=await detector([['lake',0,0,1,1]],h.options);
    assert.equal(focus.fieldMetadata.source,'decoded-mask',JSON.stringify(manifest));
    assert.deepEqual({...focus.sampleRegion([.5,.5])},{id:'lake',confidence:0});
    assert.deepEqual(h.counts,{decode:1,read:1});
    assert.equal(h.calls.length,1);
  }
});
test('truncated, invalid labels, invalid percentages, and checksum failures fall back',async()=>{
  for (const fixture of [
    {bytes:new Uint8Array([1,100])},
    {bytes:new Uint8Array([5,100,1,100,1,100])},
    {bytes:new Uint8Array([1,127,1,100,1,100])},
    {bytes:new Uint8Array([0,128,1,100,1,100])},
    {bytes:new Uint8Array([0,20,1,100,1,100])},
    {crypto:webcrypto,manifest:{sha256:'0'.repeat(64)}}
  ]) {
    const h=prebuilt(fixture),focus=await detector([['lake',0,0,1,1]],h.options);
    assert.equal(focus.fieldMetadata.source,'decoded-mask');
    assert.deepEqual(h.counts,{decode:1,read:1});
    assert.equal(h.calls.length,2);
  }
});
test('missing and failed manifest or binary fetches fall back without failing detector creation',async()=>{
  for (const failure of ['manifest-http','manifest-json','manifest-network','binary-http','binary-network']) {
    const h=prebuilt(),fetch=h.options.fetch;
    let requests=0;
    h.options.fetch=async url=>{
      requests++;
      if (failure===(requests===1?'manifest-network':'binary-network')) throw new Error('network');
      if (failure===(requests===1?'manifest-http':'binary-http')) return {ok:false};
      if (failure==='manifest-json') return {ok:true,json:async()=>{throw new Error('json');}};
      return fetch(url);
    };
    const focus=await detector([['lake',0,0,1,1]],h.options);
    assert.equal(focus.fieldMetadata.source,'decoded-mask',failure);
    assert.deepEqual(h.counts,{decode:1,read:1});
  }
});
function compressedPrebuilt({payload,manifest={},...options}={}) {
  const h=prebuilt(options),compressed=gzipSync(h.bytes,{level:9}),fetch=h.options.fetch;
  h.manifest.gzip={data:'test-field.bin.gz',byteLength:compressed.length,...manifest};
  h.options.fetch=async url=>{
    if (String(url).endsWith('.gz')) {
      h.calls.push(String(url));
      return new Response(payload ?? compressed);
    }
    return fetch(url);
  };
  return h;
}
test('gzip and HTTP-decoded gzip preserve exact samples with no mask work',async()=>{
  for (const crypto of [undefined,webcrypto]) for (const decoded of [false,true]) {
    const h=compressedPrebuilt({crypto});
    if (decoded) {
      const fetch=h.options.fetch;
      h.options.fetch=async url=>{
        const response=await fetch(url);
        return String(url).endsWith('.gz') ? new Response(h.bytes,{headers:{'Content-Encoding':'gzip'}}) : response;
      };
    }
    const focus=await detector([],h.options);
    assert.equal(focus.fieldMetadata.source,'prebuilt');
    assert.deepEqual({...focus.sampleRegion([.1,.5])},{id:'lake',confidence:100});
    assert.deepEqual({...focus.sampleRegion([.5,.5])},{id:'elder',confidence:4});
    assert.deepEqual({...focus.sampleRegion([.9,.5])},{id:null,confidence:0});
    assert.equal(focus.regionAt([.1,.5]),'lake');
    assert.equal(focus.regionAt([.5,.5]),'elder');
    assert.equal(h.calls.length,2);
    assert.match(h.calls[1],/\.bin\.gz$/);
    assert.deepEqual(h.counts,{decode:0,read:0});
  }
});
test('missing decompression support and malformed gzip metadata go directly to raw',async()=>{
  for (const options of [{DecompressionStream:null},
    {manifest:{data:'../elsewhere.bin.gz'}},{manifest:{data:42}},
    {manifest:{byteLength:0}},{manifest:{byteLength:1.5}}]) {
    const h=compressedPrebuilt(options);
    const focus=await detector([],{...h.options,...('DecompressionStream' in options ? options : {})});
    assert.equal(focus.fieldMetadata.source,'prebuilt');
    assert.equal(h.calls.length,2);
    assert.match(h.calls[1],/\.bin$/);
    assert.deepEqual(h.counts,{decode:0,read:0});
  }
});
test('gzip fetch, decoder, length, checksum and semantic failures retry raw before mask compilation',async()=>{
  for (const failure of ['http','network','decoder','truncated','crc','length','decoded-length','label','confidence','hash']) {
    const h=compressedPrebuilt({crypto:webcrypto}),fetch=h.options.fetch;
    h.options.fetch=async url=>{
      if (!String(url).endsWith('.gz')) return fetch(url);
      h.calls.push(String(url));
      if (failure==='http') return new Response(null,{status:404});
      if (failure==='network') throw new Error('network');
      let payload=gzipSync(h.bytes,{level:9});
      if (failure==='truncated') payload=payload.subarray(0,12);
      if (failure==='crc') payload[payload.length-8]^=1;
      if (failure==='decoded-length') payload=gzipSync(new Uint8Array([1,100]));
      if (failure==='label') payload=gzipSync(new Uint8Array([255,100,1,100,1,100]));
      if (failure==='confidence') payload=gzipSync(new Uint8Array([1,127,1,100,1,100]));
      if (failure==='hash') payload=gzipSync(new Uint8Array([1,100,1,100,1,100]));
      h.manifest.gzip.byteLength=payload.length+(failure==='length' ? 1 : 0);
      return new Response(payload);
    };
    if (failure==='decoder') h.options.DecompressionStream=class {constructor(){throw new Error('unsupported');}};
    const focus=await detector([],h.options);
    assert.equal(focus.fieldMetadata.source,'prebuilt',failure);
    assert.deepEqual({...focus.sampleRegion([.5,.5])},{id:'elder',confidence:4});
    assert.equal(h.calls.length,3,failure);
    assert.match(h.calls[2],/\.bin$/);
    assert.deepEqual(h.counts,{decode:0,read:0});
  }
});
test('failure of both delivery formats still prepares the decoded mask',async()=>{
  const h=compressedPrebuilt(),fetch=h.options.fetch;
  h.options.fetch=async url=>String(url).endsWith('.json') ? fetch(url) : new Response(null,{status:404});
  const focus=await detector([['lake',0,0,1,1]],h.options);
  assert.equal(focus.fieldMetadata.source,'decoded-mask');
  assert.deepEqual(h.counts,{decode:1,read:1});
  assert.deepEqual({...focus.sampleRegion([.5,.5])},{id:'lake',confidence:0});
});
test('shipped gzip is deterministic and matches every raw RG8 byte and manifest hash',()=>{
  const dir=path.join(__dirname,'../docs/storyboard/images/atlas');
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'shire-focus-field-v1.json'),'utf8'));
  const raw=fs.readFileSync(path.join(dir,manifest.data)),compressed=fs.readFileSync(path.join(dir,manifest.gzip.data));
  assert.equal(raw.length,1536*1024*2);
  assert.equal(compressed.length,manifest.gzip.byteLength);
  assert.deepEqual(gunzipSync(compressed),raw);
  assert.deepEqual(gzipSync(raw,{level:9}),compressed);
  assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.sha256);
  assert.equal(createHash('sha256').update(compressed).digest('hex'),manifest.gzip.sha256);
});
