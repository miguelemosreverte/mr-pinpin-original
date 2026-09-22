const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base=process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const output=path.resolve(__dirname,'../docs/storyboard/videos/atlas-water-loop-v1.mp4');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pinpin-animation-'));
  try {
    const page=await browser.newPage({viewport:{width:1024,height:684}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/animation-capture.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0}canvas{display:block;width:1024px;height:684px}</style><canvas></canvas>'}));
    await page.goto(base+'animation-capture.html');
    const capture=await page.evaluate(async()=>{
      const {createRenderer}=await import('./gpu/renderer.js');
      const {loadScenery}=await import('./atlas-scenery.js');
      const canvas=document.querySelector('canvas');
      const renderer=await createRenderer({canvas,artSrc:'images/atlas/shire-v1.webp',depthSrc:'images/atlas/shire-depth-v1.webp',borderSrc:null});
      if(renderer.backend!=='webgpu')throw Error('WebGPU capture required');
      renderer.setBokehStrength(0);
      const scenery=await loadScenery(renderer);
      if(!scenery.enabled)throw Error('Scenery unavailable: '+scenery.reason);
      const camera={x:768,y:512,scale:1024/1536,width:1024,height:684};
      renderer.render(camera,{dof:false,animate:false,now:performance.now()});
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const stream=canvas.captureStream(30), chunks=[];
      const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(type=>MediaRecorder.isTypeSupported(type));
      if(!mimeType)throw Error('No video encoder available');
      const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:6000000});
      const finished=new Promise((resolve,reject)=>{
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
        recorder.onerror=e=>reject(Error(e.error?.message || 'Video capture failed'));
        recorder.onstop=async()=>{
          const blob=new Blob(chunks,{type:mimeType}), reader=new FileReader();
          reader.onloadend=()=>resolve(String(reader.result).split(',')[1]);
          reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
        };
      });
      recorder.start();
      const start=performance.now();
      await new Promise(resolve=>{
        function tick(now){
          renderer.render(camera,{dof:false,animate:true,overlayDirty:false,now});
          if(now-start<12000)requestAnimationFrame(tick);else resolve();
        }
        requestAnimationFrame(tick);
      });
      recorder.stop();
      const encoded=await finished,stats=renderer.stats;
      for(const track of stream.getTracks())track.stop();
      renderer.destroy();
      return {encoded,stats,scenery};
    });
    if(errors.length)throw Error(errors.join('\n'));
    const webm=path.join(temp,'capture.webm');
    fs.writeFileSync(webm,Buffer.from(capture.encoded,'base64'));
    fs.mkdirSync(path.dirname(output),{recursive:true});
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',webm,'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-r','30',output]);
    const info=JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_format','-show_streams','-of','json',output],{encoding:'utf8'}));
    const metadata={recordedAt:new Date().toISOString(),file:path.basename(output),duration:Number(info.format.duration),
      bytes:fs.statSync(output).size,width:1024,height:684,source:'Actual atlas WebGPU renderer',
      effects:'Five-frame scenery loop with the production 35% blend and water/canopy mask. No depth of field, characters, routes or banners.',
      scenery:capture.scenery,renderer:capture.stats};
    fs.writeFileSync(output.replace('.mp4','.json'),JSON.stringify(metadata,null,2)+'\n');
    console.log(JSON.stringify(metadata,null,2));
  }finally{await browser.close();fs.rmSync(temp,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
