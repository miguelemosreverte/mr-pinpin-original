const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium}=require('/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const root='/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-source';
const out=__dirname;
const source=path.join(root,'docs/storyboard/images/house-menu/room-panorama-v3.webp');
const shaderPath=path.join(root,'docs/home-panorama-gl.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const image=fs.readFileSync(source),snapshot=path.join(out,'renderer-snapshot.js'),shader=fs.readFileSync(fs.existsSync(snapshot)?snapshot:shaderPath,'utf8');if(!fs.existsSync(snapshot))fs.writeFileSync(snapshot,shader);
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1024,height:1024},deviceScaleFactor:1});const page=await context.newPage();
 await page.setContent('<html><head><style>html,body{margin:0;background:#000}canvas{display:block;width:1024px;height:1024px}</style></head><body><canvas id="view"></canvas></body></html>');
 await page.evaluate(async({shader,image})=>{const module=await import(URL.createObjectURL(new Blob([shader],{type:'text/javascript'})));const im=new Image();im.src='data:image/webp;base64,'+image;await im.decode();window.renderer=module.panoramaRenderer(document.getElementById('view'),im);},{shader,image:image.toString('base64')});
 const faces=[['front',0,0],['rear',Math.PI,0],['up',0,Math.PI/2],['down',0,-Math.PI/2]],entries=[];
 for(const [name,yaw,pitch] of faces){const data=await page.evaluate(({yaw,pitch})=>{window.renderer.draw({width:1024,height:1024,fov:110,yaw,pitch});return document.getElementById('view').toDataURL('image/png');},{yaw,pitch});const bytes=Buffer.from(data.split(',')[1],'base64');fs.writeFileSync(path.join(out,name+'.png'),bytes);entries.push({name,file:name+'.png',yawRadians:yaw,pitchRadians:pitch,fovDegrees:110,width:1024,height:1024,bytes:bytes.length,sha256:sha(bytes)});}
 await browser.close();fs.writeFileSync(path.join(out,'provenance.json'),JSON.stringify({method:'Pure WebGL perspective reprojection using frozen runtime renderer; no artwork edits',source,sourceSha256:sha(image),shaderSource:shaderPath,shaderSha256:sha(shader),devicePixelRatio:1,textureFilter:'LINEAR',textureWrap:'CLAMP_TO_EDGE',faces:entries},null,2)+'\n');console.log(JSON.stringify(entries,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
