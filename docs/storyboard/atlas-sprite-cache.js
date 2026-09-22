(() => {
  window.AtlasSpriteCache={create({onReady=()=>{},maxEntries=9,maxBytes=64*1024*1024}={}) {
    const entries=new Map();let bytes=0,pending=0,clock=0,loads=0,evictions=0,protectedSources=new Set();
    function remove(src,e) {entries.delete(src);bytes-=e.bytes;e.image.src='';evictions++;}
    function prune() {
      const oldest=[...entries].filter(([src,e])=>!protectedSources.has(src) && e.status!=='loading')
        .sort((a,b)=>a[1].used-b[1].used);
      while((entries.size>maxEntries || bytes>maxBytes) && oldest.length)remove(...oldest.shift());
    }
    function get(src) {
      if(!src)return null;
      let e=entries.get(src);
      if(!e) {
        if(pending>=3)return null;
        const image=new Image();e={image,status:'loading',bytes:0,used:++clock};entries.set(src,e);pending++;loads++;
        image.src=new URL(src,location.href).href;
        e.promise=image.decode().then(()=>{
          e.status='ready';e.bytes=image.naturalWidth*image.naturalHeight*4;bytes+=e.bytes;
          return image;
        }).catch(()=>{e.status='failed';return null;}).finally(()=>{pending--;prune();onReady();});
        prune();
      }
      e.used=++clock;return e.status==='ready' ? e.image : null;
    }
    return {get,peek:src=>entries.get(src)?.status==='ready' ? entries.get(src).image : null,
      async load(src){
        get(src);const entry=entries.get(src);
        if(!entry)return null;
        await entry.promise;
        return entries.get(src)===entry && entry.status==='ready' ? entry.image : null;
      },
      protect(sources){protectedSources=new Set(sources.filter(Boolean));prune();},
      get stats(){return {entries:entries.size,bytes,pending,loads,evictions,maxEntries,maxBytes};}};
  }};
})();
