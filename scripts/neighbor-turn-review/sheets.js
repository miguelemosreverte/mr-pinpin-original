'use strict';
(function(root) {
  function createSheetCache(decode = src => {
    const image = new Image(); image.src = src;
    return image.decode().then(() => image);
  }) {
    const entries = new Map(); let requests = 0;
    function load(src) {
      if (entries.has(src)) return entries.get(src).promise;
      const entry = {image:null}; entries.set(src,entry); requests++;
      entry.promise = Promise.resolve().then(() => decode(src)).then(image => {
        entry.image = image; return image;
      }).catch(error => {if(entries.get(src)===entry)entries.delete(src);throw error;});
      return entry.promise;
    }
    return {load,peek:src=>entries.get(src)?.image || null,
      get stats(){return {requests,decoded:[...entries.values()].filter(e=>e.image).length,pending:[...entries.values()].filter(e=>!e.image).length};}};
  }
  if(typeof module!=='undefined')module.exports={createSheetCache};
  else root.NeighborSheets={createSheetCache};
})(typeof globalThis==='undefined'?this:globalThis);
