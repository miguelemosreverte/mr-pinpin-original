// Uses the repository's browser PNG decoder; no extra image codec dependency.
// PLAYWRIGHT_MODULE=/path/to/playwright node scripts/build-atlas-focus-field.cjs [--check]
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const {gzipSync,gunzipSync}=require('node:zlib');
const {decode}=require('./verify-atlas-assets.cjs');
const root=path.resolve(__dirname,'../docs/storyboard');
const relativeManifest='images/atlas/shire-focus-field-v1.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function main() {
  assert(process.argv.slice(2).every(arg=>arg==='--check'),'Only --check is supported');
  const check=process.argv.includes('--check'),context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'atlas-geometry.js'),'utf8'),context);
  const geometry=JSON.parse(JSON.stringify(context.window.atlasGeometry));
  const compiler=fs.readFileSync(path.join(root,'atlas-focus.js'),'utf8');
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  let compiled;
  try {
    const page=await browser.newPage();
    const mask=await decode(page,path.join(root,geometry.mask));
    assert.deepEqual([mask.width,mask.height],[geometry.width,geometry.height]);
    await page.addScriptTag({content:compiler});
    compiled=await page.evaluate(({geometry,rgba})=>{
      const pixels=Uint8Array.from(atob(rgba),char=>char.charCodeAt(0));
      const started=performance.now(),field=window.AtlasFocus.compileField(geometry,pixels);
      const compileMs=performance.now()-started,chunks=[];
      for (let i=0;i<field.length;i+=32768) chunks.push(String.fromCharCode(...field.subarray(i,i+32768)));
      return {encoded:btoa(chunks.join('')),format:window.AtlasFocus.fieldFormat,compileMs};
    },{geometry,rgba:mask.data.toString('base64')});
    compiled.sourceSha256=mask.sha256;
  } finally { await browser.close(); }
  const bytes=Buffer.from(compiled.encoded,'base64');
  // Node gzip has a zero timestamp and no filename; fixed options make builds reproducible.
  const compressed=gzipSync(bytes,{level:9});
  assert(gunzipSync(compressed).equals(bytes),'Gzip must preserve every RG8 byte');
  const manifest={...compiled.format,width:geometry.width,height:geometry.height,
    byteLength:bytes.byteLength,sourceMask:geometry.mask,sourceSha256:compiled.sourceSha256,
    regions:geometry.regions.map(({id,color})=>({id,color})),
    data:'shire-focus-field-v1.bin',sha256:hash(bytes),
    gzip:{data:'shire-focus-field-v1.bin.gz',byteLength:compressed.byteLength,sha256:hash(compressed)}};
  const manifestFile=path.join(root,relativeManifest);
  const binaryFile=path.join(path.dirname(manifestFile),manifest.data);
  const gzipFile=path.join(path.dirname(manifestFile),manifest.gzip.data);
  const json=JSON.stringify(manifest,null,2)+'\n';
  if (check) {
    assert.equal(fs.readFileSync(manifestFile,'utf8'),json,'Manifest differs from current source/compiler output');
    assert(fs.readFileSync(binaryFile).equals(bytes),'Binary differs from current source/compiler output');
    assert(fs.readFileSync(gzipFile).equals(compressed),'Gzip differs from deterministic compiler output');
  } else {
    fs.writeFileSync(binaryFile,bytes);
    fs.writeFileSync(gzipFile,compressed);
    fs.writeFileSync(manifestFile,json);
  }
  console.log(JSON.stringify({action:check?'verified':'built',manifest:relativeManifest,
    byteLength:bytes.byteLength,gzipByteLength:compressed.byteLength,
    reductionPercent:100*(1-compressed.byteLength/bytes.byteLength),
    sourceSha256:manifest.sourceSha256,sha256:manifest.sha256,
    compileMs:compiled.compileMs},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
