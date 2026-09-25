// Source-lock panoramas live in the bounded GPU cache after upload. Their
// decoded Images are transient; the ordinary renderer retains at most 4.
export function tourImageCache(limit=4){
 const decoded=new Map(),pending=new Map(),queue=[];let decodes=0,hits=0,decoding=0;
 function pump(){while(decoding<2&&queue.length){decoding++;queue.shift()().finally(()=>{decoding--;pump();});}}
 return {
  load(src,retain=true){
   if(decoded.has(src)){const value=decoded.get(src);decoded.delete(src);decoded.set(src,value);hits++;return Promise.resolve(value);}
   if(pending.has(src)){hits++;return pending.get(src);}
   const promise=new Promise((resolve,reject)=>queue.push(async()=>{
    try{const image=new Image();image.decoding='async';image.src=src;await image.decode();decodes++;if(retain){decoded.set(src,image);while(decoded.size>limit)decoded.delete(decoded.keys().next().value);}resolve(image);}
    catch(error){reject(error);}
   })).finally(()=>pending.delete(src));
   pending.set(src,promise);pump();return promise;
  },
  clear(){decoded.clear();},
  get stats(){return{decodedImages:decoded.size,pendingImages:pending.size,decodingImages:decoding,decodes,hits};}
 };
}

// One speculative decode at a time, with both decode and upload starting only
// while input and video seeking are quiet. A new request invalidates old work.
export function tourIdlePrefetch({quiet,load,upload,has}){
 let generation=0,busy=false;
 async function idle(valid){
  while(valid()){
   await new Promise(resolve=>setTimeout(resolve,200));
   if(!valid())return false;
   if(!quiet())continue;
   await new Promise(resolve=>globalThis.requestIdleCallback?requestIdleCallback(resolve):setTimeout(resolve,0));
   if(valid()&&quiet())return true;
  }
  return false;
 }
 return {
  cancel(){generation++;},
  schedule(stops){
   const own=++generation,valid=()=>own===generation;
   void(async()=>{
    while(busy&&await idle(valid)){}
    if(!valid())return;
    busy=true;
    try{for(const stop of stops){if(!valid())break;if(has(stop))continue;if(!await idle(valid))break;const image=await load(stop);if(!await idle(valid))break;if(!has(stop))upload(stop,image);}}
    catch{/* Speculative failures never affect an explicit viewpoint request. */}
    finally{busy=false;}
   })();
  }
 };
}
