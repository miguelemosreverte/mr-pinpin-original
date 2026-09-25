// Browser-decoded RGBA comparison; only existing QA screenshots are read.
const {chromium}=require('/Users/miguel_lemos/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('node:fs');
const label=process.argv[2]||'source-all24-performance-v1',out='/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-stops-20260924/browser-check/'+label;
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage();await p.goto('http://127.0.0.1:18792/tractor-tour.html?sourceLock=1');
 const result=await p.evaluate(async label=>{
  const root='/storyboard/production/tractor-stops-20260924/browser-check/';
  async function pixels(url){const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {width:c.width,height:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};}
  const rows=[];for(let i=0;i<24;i++){const id='stop-'+String(i).padStart(2,'0'),file=id+'-entry-desktop.png';const a=await pixels(root+'source-all24-v2/'+file),b=await pixels(root+label+'/'+file);let changedPixels=0,maxChannelDelta=0,totalDelta=0;if(a.width!==b.width||a.height!==b.height){rows.push({id,pass:false,error:'size mismatch'});continue;}
   for(let k=0;k<a.data.length;k+=4){let changed=false;for(let c=0;c<4;c++){const delta=Math.abs(a.data[k+c]-b.data[k+c]);if(delta)changed=true;maxChannelDelta=Math.max(maxChannelDelta,delta);totalDelta+=delta;}if(changed)changedPixels++;}
   rows.push({id,width:a.width,height:a.height,changedPixels,maxChannelDelta,meanChannelDelta:totalDelta/a.data.length,pass:changedPixels===0});
  }return {method:'Chromium Canvas2D decoded RGBA comparison of full-stage entry screenshots',rows,pass:rows.every(x=>x.pass)};
 },label);fs.writeFileSync(out+'/pixel-comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}})();
