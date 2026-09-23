'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {build,load,exactPrompt}=require('./build-white-background-review.cjs');

function fixture(t) {
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'white-review-')));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const trial=path.join(root,'trial');fs.mkdirSync(trial);
  const data={version:1,previous:{image:null,video:null},current:{image:null,video:null},bookReferences:[null,null]};
  const save=()=>fs.writeFileSync(path.join(trial,'review-manifest.json'),JSON.stringify(data));save();
  return {root,trial,data,save,out:path.join(root,'review')};
}

test('exact Markdown prompt is retained without adjacent prose',()=>{
  assert.equal(exactPrompt('# Record\n\n## Exact submitted prompt\n\nDo exactly this.\nSecond line.\n\n## Review\nNot prompt.'),'Do exactly this.\nSecond line.');
  assert.equal(exactPrompt('## Exact prompt\nLast section prompt.'),'Last section prompt.');
  assert.equal(exactPrompt('## Exact submitted edit prompt\nActual edit.\n\n## Review\nNot prompt.'),'Actual edit.');
  assert.throws(()=>exactPrompt('No recorded prompt.'),/Exact submitted prompt/);
});

test('pending template writes only a review and refuses overwrite',t=>{
  const f=fixture(t);const filename=build(f), html=fs.readFileSync(filename,'utf8');
  assert(html.includes('Native video pending'));assert(html.includes('Pixel-opacity audit pending'));
  assert(!html.includes('autoplay'));assert(!html.includes('requestAnimationFrame'));
  assert.deepEqual(fs.readdirSync(f.out).sort(),['assets','index.html','review-provenance.json']);
  assert.throws(()=>build(f),/EEXIST/);
});

test('submitted image/video hashes, exact prompts and endpoint roles are visible without transport URLs',t=>{
  const f=fixture(t), hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(path.join(f.trial,'image.png'),'input');fs.writeFileSync(path.join(f.trial,'video.mp4'),'native');
  fs.writeFileSync(path.join(f.trial,'edit.md'),'## Exact submitted prompt\nWhite background only.\n\n## Review\nUnapproved.');
  fs.writeFileSync(path.join(f.trial,'submission.json'),JSON.stringify({sourceHash:hash('input'),metadata:{sha256:hash('native')},model:'endpoint',status:'complete',input:{prompt:'Exact video request.',first_image_url:'https://private.invalid/image',end_image_url:'https://private.invalid/image',duration:1,resolution:'720p'},priceEstimate:{amount:0.045}}));
  f.data.current={image:'image.png',video:'video.mp4',submission:'submission.json',editRecord:'edit.md',notes:'<script>not executable</script>'};f.save();
  const html=fs.readFileSync(build(f),'utf8');
  assert(html.includes('Exact video request.'));assert(html.includes('White background only.'));
  assert(html.includes('controls loop muted playsinline'));assert(!html.includes('private.invalid'));
  assert(!html.includes('<script>not executable</script>'));
  fs.writeFileSync(path.join(f.trial,'image.png'),'changed');assert.throws(()=>load(f.trial,'review-manifest.json'),/input hash differs/);
});

test('unsafe inputs, escaped symlinks, in-checkout outputs and output aliases are refused',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.root,'outside.png'),'outside');
  fs.symlinkSync(path.join(f.root,'outside.png'),path.join(f.trial,'link.png'));
  for(const image of ['../outside.png','link.png']){f.data.current.image=image;f.save();assert.throws(()=>build(f));}
  f.data.current.image=null;f.save();
  assert.throws(()=>build({...f,out:path.join(__dirname,'not-created-white-review')}),/outside checkout/);
  fs.symlinkSync(f.root,path.join(f.root,'alias'));
  assert.throws(()=>build({...f,out:path.join(f.root,'alias','review')}),/canonical/);
});

test('opacity facts require matching input hash and coherent pixel counts',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.trial,'image.png'),'image');
  const audit={sha256:createHash('sha256').update('image').digest('hex'),width:2,height:2,source_pixel_format:'rgb24',
    alpha:{all_255:true,opaque_pixels:4,fully_transparent_pixels:0,partially_transparent_pixels:0}};
  const write=()=>fs.writeFileSync(path.join(f.trial,'audit.json'),JSON.stringify(audit));write();
  f.data.current={image:'image.png',opacityAudit:'audit.json'};f.save();
  const html=fs.readFileSync(build(f),'utf8');assert(html.includes('4 opaque pixels'));
  assert(!html.includes('"opaque_pixels"'));
  audit.alpha.partially_transparent_pixels=1;write();assert.throws(()=>load(f.trial,'review-manifest.json'),/pixel counts/);
  audit.sha256='0'.repeat(64);write();assert.throws(()=>load(f.trial,'review-manifest.json'),/audit image hash differs/);
});
