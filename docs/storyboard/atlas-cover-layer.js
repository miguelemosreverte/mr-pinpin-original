import {bannerPlacement, createBannerProjection} from './atlas-banner-projection.js';
import {createBannerSurface} from './atlas-banner-surface.js';

// Persistent buttons preserve native input while CSS3D handles their world transforms.
export function createCoverLayer({root, regions, viewport=root, status, project, view, placements, activate, bind, onInvalidate,
  worldWidth=window.atlasGeometry?.width || 1536, worldHeight=window.atlasGeometry?.height || 1024}) {
  const entries=new Map(), cache=new Map(), miniatures=new Map(), projection=createBannerProjection(root);
  const surface=createBannerSurface(projection,{worldWidth,worldHeight,routes:window.atlasGeometry?.routes || []});
  const gpuStyle=document.createElement('style');
  gpuStyle.textContent='.atlas-banner-overlay .atlas-book[data-gpu-rendering="true"] {'+
    'background:transparent !important;border-color:transparent !important;box-shadow:none !important;'+
    'filter:none !important;}'+
    '.atlas-banner-overlay .atlas-book[data-gpu-rendering="true"]::before,'+
    '.atlas-banner-overlay .atlas-book[data-gpu-rendering="true"]::after {visibility:hidden !important;}';
  root.append(gpuStyle);
  const originalPreview=window.AtlasStories.preview.bind(window.AtlasStories);
  const keyFor=(id,lang) => JSON.stringify([id,lang,new URLSearchParams(location.search).get('coverPreview')]);
  window.AtlasStories.preview=(id,lang) => {
    const key=keyFor(id,lang);
    if (!cache.has(key)) cache.set(key,Promise.resolve().then(() => originalPreview(id,lang)).catch(() => null)
      .then(asset => { if (!asset) cache.delete(key); return asset; }));
    return cache.get(key);
  };
  let language, words={}, hidden=false, revision=0, selected=null, destroyed=false;
  let placementRevision=0, gpuRendering=false;
  function syncGpuVisibility() {
    const gpu=gpuRendering && surface.layer.ready;
    for (const entry of entries.values()) {
      if (entry.gpuRendering===gpu) continue;
      entry.gpuRendering=gpu;
      entry.button.dataset.gpuRendering=String(gpu);
      entry.image.style.opacity=gpu ? '0' : '';
      for (const object of [entry.object.ring,...entry.object.dots]) object.element.style.opacity=gpu ? '0' : '';
    }
  }
  const placementReady=placements ? Promise.resolve() : fetch(new URL('./atlas-banners.json',import.meta.url),{cache:'no-cache'})
    .then(response => response.ok ? response.json() : null)
    .then(value => {
      if (destroyed || placementRevision) return;
      placements=value;
      for (const entry of entries.values()) entry.placement=bannerPlacement(value,entry.id,entry.region.center);
      position();
    }).catch(() => { /* Missing placement files keep the region-center defaults. */ });
  function label(entry) {
    const current=status(entry.id), button=entry.button;
    button.disabled=current==='locked' || current==='soon';
    button.setAttribute('aria-disabled',String(button.disabled));
    button.dataset.state=current;
    button.title=(entry.asset?.title || words[entry.id] || entry.id)+': '+(words[current] || current);
    button.setAttribute('aria-label',button.title);
  }
  function position() {
    if (destroyed) return;
    const current=view(), {width,height,scale,openingScale}=current;
    if (![width,height,scale,openingScale].every(value => Number.isFinite(value) && value>0)) return;
    projection.resize(width,height);
    const origin=project([0,0]);
    for (const entry of entries.values()) {
      const anchor=project(entry.placement.anchor);
      const valid=Array.isArray(anchor) && anchor.length===2 && anchor.every(Number.isFinite);
      const visible=valid && !hidden && entry.id===selected && Boolean(entry.asset) && status(entry.id)!=='soon';
      const placement=visible ? surface.resolve(entry,anchor,current,origin) : entry.placement;
      entry.bounds=projection.place(entry.object,placement,valid ? anchor : [-100000,-100000],current,visible);
      if (!entry.button.hidden && entry.image.srcset && entry.bounds) {
        // Use the projected bounds, including perspective, to retain detail at zoom.
        // Only upgrade: panning or zooming out cannot churn decoded image sizes.
        const pixels=Math.min(1024,Math.ceil((entry.bounds.right-entry.bounds.left)*(window.devicePixelRatio || 1)));
        const capacity=[256,512,1024].find(size => size>=pixels);
        if (capacity>entry.capacity) {
          entry.capacity=capacity;
          entry.image.sizes=`${capacity/(window.devicePixelRatio || 1)}px`;
        }
      }
    }
    projection.render();
    const changed=gpuRendering && surface.render([...entries.values()],current);
    syncGpuVisibility();
    if (changed) onInvalidate?.(surface.layer);
  }
  async function update(lang,ui) {
    if (destroyed) return;
    language=lang; words=ui;
    const ticket=++revision;
    viewport.dataset.coversLoaded='false';
    const pending=[];
    for (const region of regions) {
      if (!Object.hasOwn(window.AtlasStories.entries,region.id)) continue;
      let entry=entries.get(region.id);
      if (!entry) {
        const button=document.createElement('button');
        button.type='button'; button.className='atlas-book'; button.hidden=true;
        button.dataset.destination=region.id; button.dataset.coverLoaded='false';
        const image=new Image(); image.draggable=false; image.decoding='async';
        button.append(image);
        entry={id:region.id,region,button,image,asset:null,key:null,capacity:0,
          placement:bannerPlacement(placements,region.id,region.center),object:projection.add(button)};
        entries.set(region.id,entry);
        image.addEventListener('load',() => { entry.imageRevision=(entry.imageRevision || 0)+1; position(); });
        button.addEventListener('click',() => { if (!button.disabled) activate(region.id); });
        bind?.(button,region.id);
      }
      label(entry);
      if (status(entry.id)==='soon') continue;
      const key=keyFor(entry.id,lang);
      if (entry.key!==key) {
        entry.key=key; entry.button.dataset.coverKey=key;
        entry.button.dataset.coverLoaded=String(Boolean(entry.asset));
        entry.pending=(async () => {
          if (!miniatures.has(key)) miniatures.set(key,Promise.resolve().then(() =>
            window.AtlasStories.miniature(entry.id,lang,{image:entry.image})).catch(() => null)
            .then(asset => { if (!asset) miniatures.delete(key); return asset; }));
          const asset=await miniatures.get(key);
          if (destroyed || entry.key!==key || language!==lang || keyFor(entry.id,lang)!==key) return;
          if (asset) {
            entry.image.alt=asset.alt || asset.title || words[entry.id] || entry.id;
            entry.asset=asset; label(entry);
            entry.button.dataset.coverLoaded='true';
          } else {
            entry.key=null;
          }
          position();
        })();
      }
      pending.push(entry.pending);
    }
    position();
    await Promise.all([placementReady,...pending]);
    if (!destroyed && ticket===revision) {
      viewport.dataset.coversLoaded=String([...entries.values()].every(entry => status(entry.id)==='soon' || Boolean(entry.asset)));
      position();
    }
  }
  return {
    update, position,
    get gpuLayer() { return surface.layer; },
    setGpuRendering(value) {
      const next=Boolean(value);
      if (destroyed || next===gpuRendering) return;
      gpuRendering=next;
      if (next) position(); else syncGpuVisibility();
    },
    setSurfaceSampler(value) { surface.setSampler(value); position(); },
    setPlacements(value) {
      placements=value; placementRevision++;
      for (const entry of entries.values()) entry.placement=bannerPlacement(value,entry.id,entry.region.center);
      position();
    },
    destroy() { destroyed=true; revision++; surface.destroy(); projection.destroy(); gpuStyle.remove(); entries.clear(); },
    select(id) {
      if (selected===id) return;
      selected=id;
      viewport.dataset.activeCover=id || '';
      position();
    },
    get selected() { return selected; },
    hide(value) { hidden=value; position(); },
    focus(id) { const entry=entries.get(id); if (entry && !entry.button.hidden) entry.button.focus({preventScroll:true}); },
    get entries() { return [...entries.values()]; },
    get loaded() { return viewport.dataset.coversLoaded==='true'; }
  };
}
