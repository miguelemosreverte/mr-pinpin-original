const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const directory=path.resolve(__dirname,'../docs/storyboard/images/atlas');
const hash=file => crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,file))).digest('hex');
const frames=[];
const sources=[];
for (let frame=1;frame<=5;frame++) {
  const stem=`shire-motion-0${frame}-v1`, source=frame===1 ? 'shire-v1.png' : `${stem}.png`;
  const file=stem+'.webp';
  sources.push(path.join(directory,source));
  execFileSync('cwebp',['-quiet','-q','84','-resize','512','342',path.join(directory,source),'-o',path.join(directory,file)]);
  frames.push({frame,file,source,width:512,height:342,bytes:fs.statSync(path.join(directory,file)).size,
    sha256:hash(file),sourceSha256:hash(source),provenance:frame===1 ? `${stem}.md` : `${stem}.json`});
}
const strip=execFileSync('magick',sources.flatMap(source => ['(',source,'-resize','512x342!',')']).concat(['-append','png:-']),{maxBuffer:16*1024*1024});
const packedFile='shire-motion-strip-v1.webp';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pinpin-scenery-'));
try {
  const input=path.join(temp,'strip.png'); fs.writeFileSync(input,strip);
  execFileSync('cwebp',['-quiet','-q','84',input,'-o',path.join(directory,packedFile)]);
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
const manifest={version:1,builtAt:new Date().toISOString(),frames,mask:'shire-motion-mask-v1.webp',
  packed:{file:packedFile,width:512,height:1710,layout:'vertical',bytes:fs.statSync(path.join(directory,packedFile)).size,sha256:hash(packedFile)},
  durationMilliseconds:12000,blendStrength:0.35,interpolation:'Adjacent-frame cyclic smoothstep crossfade; not optical flow.',
  policy:'Load only for WebGPU when reduced motion and save-data are off. One-time GPU upload; pause with scene.',
  encodedFrameBytes:frames.reduce((sum,frame) => sum+frame.bytes,0),
  gpuFrameBytes:512*342*4*5,
  provenance:'Frames 2-5 generated with built-in image_gen, always editing original shire-v1.png. Frame 1 is original artwork.'};
fs.writeFileSync(path.join(directory,'shire-motion-v1.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({frames:5,packedBytes:manifest.packed.bytes,individualBytes:manifest.encodedFrameBytes,gpuBytes:manifest.gpuFrameBytes}));
