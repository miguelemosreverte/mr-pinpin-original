/* GPU roundtrip: unedited extracted faces must reconstruct the original spherical image. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.HOME_URL||'http://127.0.0.1:8789/',out=process.env.VERIFICATION_DIR,input=process.env.CUBE_INPUT_DIR;
if(!out||!input)throw Error('Set external VERIFICATION_DIR and CUBE_INPUT_DIR');fs.mkdirSync(out,{recursive:true});
const provenance=JSON.parse(fs.readFileSync(path.join(input,'provenance.json'))),root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'docs/storyboard/images/house-menu/room-panorama-v3.webp'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(sha(source),provenance.sourceSha256,'Face extraction matches source');
const faces=Object.fromEntries(provenance.faces.map(f=>{const b=fs.readFileSync(path.join(input,f.file));assert.equal(sha(b),f.sha256);return[f.name,b.toString('base64')];}));
const views=[['front',0,0],['rear',180,0],['up',0,90],['down',0,-90],['front-up',0,45],['rear-up',180,45],['rear-down',180,-45],['right-rear',135,0],['left-rear',-135,0],['right-up',90,45],['left-up',-90,45],['right-down',90,-45],['left-down',-90,-45],['right',90,0],['left',-90,0]];
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{const p=await b.newPage({viewport:{width:512,height:512},deviceScaleFactor:1});await p.goto(base);const result=await p.evaluate(async({source,faces,oldShader,views})=>{
 const old=await import(URL.createObjectURL(new Blob([oldShader],{type:'text/javascript'}))),current=await import('/home-panorama-gl.js?patch-qa='+Date.now());
 const decode=async(b64,type)=>{const im=new Image();im.src='data:image/'+type+';base64,'+b64;await im.decode();return im;};
 const image=await decode(source,'webp'),repairs={};for(const[id,b64]of Object.entries(faces))repairs[id]=await decode(b64,'png');
 const a=document.createElement('canvas'),c=document.createElement('canvas'),ra=old.panoramaRenderer(a,image),rc=current.panoramaRenderer(c,image,repairs),ga=a.getContext('webgl'),gc=c.getContext('webgl');
 const results=[];for(const[name,yaw,pitch]of views){const state={width:512,height:512,yaw:yaw*Math.PI/180,pitch:pitch*Math.PI/180,fov:72};ra.draw(state);rc.draw(state);const x=new Uint8Array(512*512*4),y=new Uint8Array(x.length);ga.readPixels(0,0,512,512,ga.RGBA,ga.UNSIGNED_BYTE,x);gc.readPixels(0,0,512,512,gc.RGBA,gc.UNSIGNED_BYTE,y);let sum=0,large=0,max=0;for(let i=0;i<x.length;i+=4){let pixel=0;for(let k=0;k<3;k++){const d=Math.abs(x[i+k]-y[i+k]);sum+=d;pixel+=d;max=Math.max(max,d);}if(pixel/3>20)large++;}results.push({name,yaw,pitch,meanAbsoluteError:sum/(512*512*3),pixelsAbove20Fraction:large/(512*512),maximumChannelError:max,base:a.toDataURL(),roundtrip:c.toDataURL()});}ra.destroy();rc.destroy();return results;
 },{source:source.toString('base64'),faces,oldShader:fs.readFileSync(path.join(input,'renderer-snapshot.js'),'utf8'),views});
 for(const r of result){for(const field of ['base','roundtrip']){fs.writeFileSync(path.join(out,r.name+'-'+field+'.png'),Buffer.from(r[field].split(',')[1],'base64'));delete r[field];}}
 fs.writeFileSync(path.join(out,'roundtrip.json'),JSON.stringify({sourceSha256:sha(source),views:result},null,2)+'\n');
 for(const r of result){assert(r.meanAbsoluteError<3,`${r.name}: orientation/FOV roundtrip MAE ${r.meanAbsoluteError}`);assert(r.pixelsAbove20Fraction<.02,`${r.name}: excessive registration discrepancy`);}console.log(JSON.stringify(result));
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
