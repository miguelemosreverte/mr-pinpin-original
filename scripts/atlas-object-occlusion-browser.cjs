'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {withMiniBrowser}=require(process.env.MINI_BROWSER_HELPER || '/Volumes/TB4/mac-mini-storage/shared/atlas-ground-sdf-20260924/harness/atlas-traversal-trial/mini-browser.cjs');
const root=process.env.OBJECT_GPU_SOURCE || path.join(__dirname,'../docs/storyboard/gpu');
const output=path.join(process.env.OBJECT_GPU_OUTPUT || '/Volumes/TB4/mac-mini-storage/shared/atlas-texture-fix-20260924','gpu-fixture-'+new Date().toISOString().replace(/[:.]/g,'-'));
const allowed=new Set(['renderer.js','dof.js','lens.js','surface.js','occlusion.js','object-occlusion.js','world.wgsl','lens.wgsl']);
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const server=http.createServer(async(req,res)=>{
    const name=req.url.slice(1);
    if(name==='') {res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body style="margin:0"><canvas></canvas></body></html>');return;}
    if(!allowed.has(name)){res.writeHead(404);res.end();return;}
    try{res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/plain');res.end(await fs.readFile(path.join(root,name)));}
    catch{res.writeHead(500);res.end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    const report={output,kind:'synthetic hybrid profile/canopy renderer verification',viewports:[]};
    await withMiniBrowser(async context=>{
      for(const viewport of [{width:800,height:600},{width:390,height:844}]) {
        const page=await context.newPage(),pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
        await page.setViewportSize(viewport);await page.goto(base);
        const result=await page.evaluate(async viewport=>{
          const {createRenderer}=await import('./renderer.js');
          const canvas=document.querySelector('canvas');canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
          const art=document.createElement('canvas');art.width=1536;art.height=1024;
          const ctx=art.getContext('2d');ctx.fillStyle='#408060';ctx.fillRect(0,0,1536,1024);
          const artSrc=art.toDataURL();ctx.fillStyle='#000';ctx.fillRect(0,0,1536,1024);
          ctx.fillStyle='#fff';ctx.fillRect(1000,400,100,140);const depthSrc=art.toDataURL();
          const rgba=(w,h)=>{const data=new Uint8Array(w*h*4);for(let i=3;i<data.length;i+=4)data[i]=255;return {width:w,height:h,data};};
          const instances=rgba(1536,1024),ground=rgba(1536,256);
          for(let y=400;y<540;y++)for(let x=400;x<650;x++)instances.data.set([1,255,0,255],(y*1536+x)*4);
          for(let y=400;y<540;y++)for(let x=840;x<940;x++)instances.data.set([0,255,1,255],(y*1536+x)*4);
          for(let y=400;y<540;y++)for(let x=960;x<1080;x++)instances.data.set([2,255,1,255],(y*1536+x)*4);
          for(let x=0;x<1536;x++){const value=(x<512?490:550)*16;ground.data.set([value>>8,value&255,255,255],(1536+x)*4);}
          const overlay=document.createElement('canvas');overlay.width=1536;overlay.height=1024;
          let layer,decodes=0;overlay.atlasSetSpriteLayer=value=>{layer=value;};
          const errors=[];
          const renderer=await createRenderer({canvas,artSrc,depthSrc,overlayCanvas:overlay,borderSrc:null,
            objectOcclusionSources:{instanceSource:'instances',groundSource:'ground',decodeImage:async src=>{decodes++;return src==='instances'?instances:ground;}},
            onError:e=>errors.push(e.message)});
          if(renderer.backend!=='webgpu')throw Error('Actual WebGPU required: '+errors.join(';'));
          renderer.setBokehStrength(0);renderer.setDof(false);
          const sprite=layer.canvas.getContext('2d');sprite.clearRect(0,0,128,128);sprite.fillStyle='#ef3020';sprite.fillRect(32,40,64,64);
          layer.ready=true;layer.revision++;
          async function capture(name,footX,footY,enabled) {
            layer.x=footX-64;layer.y=footY-112;layer.footY=footY;
            const camera={x:footX,y:footY-55,scale:2,width:viewport.width,height:viewport.height};
            renderer.setOcclusion(enabled);renderer.render(camera,{overlayDirty:true,animate:false});
            await new Promise(r=>requestAnimationFrame(r));
            const dataUrl=await renderer.captureReviewFrame({snapshot:camera}).jpeg;
            const image=new Image();image.src=dataUrl;await image.decode();
            const copy=document.createElement('canvas');copy.width=image.width;copy.height=image.height;
            const c=copy.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,copy.width,copy.height).data;
            let red=0,opaque=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>pixels[i+1]*1.7 && pixels[i]>pixels[i+2]*1.7 && pixels[i]>120)red++;if(pixels[i+3]>250)opaque++;}
            return {name,footX,footY,enabled,red,opaque,dataUrl};
          }
          const cases=[];
          for(const [name,x,y] of [['front-foot-column',504,512],['rear-foot-column',544,512],['unclassified-ground',750,512],
            ['canopy-id0',890,512],['canopy-spatial',1000,512]]) {
            cases.push(await capture(name+'-off',x,y,false));cases.push(await capture(name+'-on',x,y,true));
          }
          const stats=renderer.stats;renderer.destroy();
          return {cases,stats,errors,decodes};
        },viewport);
        assert.deepEqual(pageErrors,[]);assert.deepEqual(result.errors,[]);assert.equal(result.decodes,2);assert.equal(result.stats.occlusion.state,'ready');
        for(let i=0;i<result.cases.length;i+=2) {
          const off=result.cases[i],on=result.cases[i+1];assert(off.red>1000,'nonblank opaque character');
          const fraction=on.red/off.red;on.visibleFraction=fraction;
          if(on.name.startsWith('rear')||on.name.startsWith('canopy-id0'))assert(fraction<.01,'rear profile or ID0 canopy hides character');
          else if(on.name.startsWith('canopy-spatial'))assert(fraction>.4&&fraction<.6,'spatial canopy covers one side, not a whole-body fade');
          else assert(fraction>.99,'front/unclassified character stays opaque');
          for(const c of [off,on]) {const file=`${viewport.width}-${c.name}.jpg`;await fs.writeFile(path.join(output,file),Buffer.from(c.dataUrl.split(',')[1],'base64'));delete c.dataUrl;c.file=file;}
        }
        report.viewports.push({viewport,...result});await page.close();
      }
    });
    await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
