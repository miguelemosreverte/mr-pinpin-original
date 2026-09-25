// Isolated review server. Only tractor media gains conditional caching;
// HTML, JS, metadata, and every other scene retain the prior revalidation policy.
const fs=require('node:fs'),fsp=fs.promises,path=require('node:path');
const http=require('node:http'),crypto=require('node:crypto');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.md':'text/plain','.txt':'text/plain','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp4':'video/mp4'};
function byteRange(header,size){
 if(!header)return{start:0,end:size-1,partial:false};
 const m=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!m||(!m[1]&&!m[2]))throw{status:416};
 const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));
 const end=m[1]?(m[2]?Math.min(Number(m[2]),size-1):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)throw{status:416};
 return{start,end,partial:true};
}
function createReviewServer(root){
 root=path.resolve(root);
 const identities=new Map();
 async function identity(file,stat){
  const fingerprint=[stat.size,stat.mtimeNs,stat.ctimeNs,stat.ino].join(':');
  const cached=identities.get(file);
  if(cached?.fingerprint===fingerprint){identities.delete(file);identities.set(file,cached);return cached.promise;}
  const promise=(async()=>{
   const hash=crypto.createHash('sha256');
   for await(const chunk of fs.createReadStream(file))hash.update(chunk);
   return '"'+hash.digest('hex')+'"';
  })();
  identities.set(file,{fingerprint,promise});
  while(identities.size>128)identities.delete(identities.keys().next().value);
  try{return await promise;}catch(error){identities.delete(file);throw error;}
 }
 const server=http.createServer(async(req,res)=>{
  let size;
  try{
   if(!['GET','HEAD'].includes(req.method))throw{status:405};
   const name=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'')||'story-worlds.html';
   const extension=path.extname(name);
   if(name.includes('\\')||name.includes('\0')||name.split('/').some(x=>!x||x.startsWith('.'))||!mime[extension])throw{status:403};
   const file=path.join(root,name),stat=await fsp.stat(file,{bigint:true});
   if(!stat.isFile())throw{status:404};size=Number(stat.size);
   const media=/^storyboard\/production\/tractor-(?:stops|orbit)-20260924\//.test(name)&&['.png','.webp','.jpg','.mp4'].includes(extension);
   res.setHeader('Content-Type',mime[extension]);
   res.setHeader('Cache-Control',media?'public, max-age=0, must-revalidate':'no-cache');
   res.setHeader('Accept-Ranges','bytes');res.setHeader('X-Content-Type-Options','nosniff');
   let range=req.headers.range;
   if(media){
    const etag=await identity(file,stat),modified=Number(stat.mtimeMs);
    res.setHeader('ETag',etag);res.setHeader('Last-Modified',new Date(modified).toUTCString());
    const tags=req.headers['if-none-match'];
    const unchanged=tags?tags.split(',').some(tag=>tag.trim()==='*'||tag.trim().replace(/^W\//,'')===etag):Date.parse(req.headers['if-modified-since'])>=Math.floor(modified/1000)*1000;
    if(unchanged){res.writeHead(304);return res.end();}
    const ifRange=req.headers['if-range'];
    if(range&&ifRange&&ifRange!==etag&&!(Date.parse(ifRange)>=Math.floor(modified/1000)*1000))range=null;
   }
   const r=byteRange(range,size);
   res.setHeader('Content-Length',Math.max(0,r.end-r.start+1));
   if(r.partial)res.setHeader('Content-Range',`bytes ${r.start}-${r.end}/${size}`);
   res.writeHead(r.partial?206:200);
   if(req.method==='HEAD'||!size)return res.end();
   fs.createReadStream(file,{start:r.start,end:r.end}).on('error',()=>res.destroy()).pipe(res);
  }catch(error){
   if(res.headersSent)return res.destroy();
   if(error.status===416&&size!==undefined)res.setHeader('Content-Range',`bytes */${size}`);
   res.writeHead(error.status||404);res.end('Review asset unavailable');
  }
 });
 // Compute strong validators before this long-lived preview server accepts
 // traffic, so the first browser view does not pay for hashing a large PNG.
 server.warmTractorMedia=async()=>{
  const pack='storyboard/production/tractor-stops-20260924/';
  const names=['storyboard/production/tractor-orbit-20260924/orbit-scrub-v1.mp4'];
  try{
   const manifest=JSON.parse(await fsp.readFile(path.join(root,pack,'frames-manifest.json'),'utf8'));
   for(const stop of manifest.stops){
    if(!/^stop-\d{2}$/.test(stop.id))continue;
    try{const selected=JSON.parse(await fsp.readFile(path.join(root,pack,'stops',stop.id,'selected.json'),'utf8'));
     if(typeof selected.panorama==='string'&&!selected.panorama.split('/').some(part=>!part||part.startsWith('.')))names.push(pack+selected.panorama);
    }catch{/* An absent panorama stays a normal per-request 404. */}
   }
  }catch{/* A mirror without tractor stops still serves other review pages. */}
  await Promise.all(Array.from({length:2},async()=>{while(names.length){const name=names.shift();try{const file=path.join(root,name),stat=await fsp.stat(file,{bigint:true});if(stat.isFile())await identity(file,stat);}catch{}}}));
 };
 return server;
}
if(require.main===module){
 const root=path.resolve(process.argv[2]),port=Number(process.argv[3]||8792);
 const server=createReviewServer(root);
 server.warmTractorMedia().then(()=>server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({root,port,pid:process.pid}))));
}
module.exports={byteRange,createReviewServer};
