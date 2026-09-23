import {CUBEMAP} from './home-cubemap-config.js?v=cubemap-styled-20260922';
import {UNIFIED,GRAY} from './home-unified-config.js?v=unified-gray-20260922';
import {unifiedRenderer} from './home-unified-gl.js?v=unified-20260922';
import {cubemapRenderer} from './home-cubemap-gl.js?v=cubemap-ownership-20260922';
import {PANORAMA} from './home-panorama-config.js?v=panorama-v3-20260922';
import {project,polygonPath} from './home-panorama-math.js?v=panorama-20260922';
import {panoramaRenderer} from './home-panorama-gl.js?v=panorama-20260922';
import {panoramaControls} from './home-panorama-controls.js?v=panorama-20260922';
const view=new URLSearchParams(location.search).get('view');
if(['panorama','cubemap','cubemap-unified','cubemap-gray'].includes(view)){
 const atlasMode=['cubemap-unified','cubemap-gray'].includes(view);
 const config=view==='cubemap-gray'?GRAY:view==='cubemap-unified'?UNIFIED:view==='cubemap'?CUBEMAP:PANORAMA;
 const viewport=document.querySelector('.room-fit'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let backend='loading',stage,canvas,renderer,controls,current,frame=0,draws=0,version=0,imageSize=null,patches=[],faces=[];
 const links=[];
 document.querySelectorAll('[data-language]').forEach(link=>{const url=new URL(link.href,location.href);url.searchParams.set('view',view);link.href=url.href;});
 viewport.panoramaView=Object.freeze({get snapshot(){return{backend,ready:backend==='active',...(current||{}),view,asset:config.asset||null,imageSize,draws,patches:patches.map(p=>({...p})),faces:faces.map(f=>({...f})),limits:{minFov:config.minFov,maxFov:config.maxFov,maxPitch:config.maxPitch},hotspots:config.hotspots.map(h=>({...h,linkId:'panorama-'+h.id+'-link'}))};},project(uv){return current?project(uv,current):null;}});
 function fallback(reason){
  version++;backend=reason;cancelAnimationFrame(frame);frame=0;controls?.destroy();controls=null;renderer?.destroy();renderer=null;stage?.remove();stage=null;links.length=0;
  document.querySelector('.skip-link').setAttribute('href','#room');
  viewport.dataset.view='expanded';viewport.dispatchEvent(new Event('roomviewchange'));
 }
 function render(){frame=0;if(!renderer||!current)return;try{renderer.draw(current);draws++;links.forEach(({path,hotspot})=>path.setAttribute('d',polygonPath(hotspot.polygon,current)));}catch{fallback('render-fallback');}}
 const update=state=>{current=state;if(!frame)frame=requestAnimationFrame(render);};
 async function boot(){
  const token=++version;if(reduced.matches){fallback('reduced-motion');return;}
  backend='loading';
  try{
   const faceImages={},repairs={},orientations={front:[0,0],rear:[Math.PI,0],back:[Math.PI,0],right:[Math.PI/2,0],left:[-Math.PI/2,0],up:[0,Math.PI/2],down:[0,-Math.PI/2]};let image;patches=[];faces=[];
   if(view==='cubemap'){
    await Promise.all(Object.entries(config.faces).map(async([id,url])=>{const face=new Image();face.src=url;await face.decode();if(face.naturalWidth!==face.naturalHeight)throw Error('Cube face must be square');faceImages[id]=face;faces.push({id,url,yaw:orientations[id][0],pitch:orientations[id][1],fov:config.faceFov,width:face.naturalWidth,height:face.naturalHeight});}));
    imageSize={width:faceImages.front.naturalWidth,height:faceImages.front.naturalHeight};
   }else if(atlasMode){
    image=new Image();image.src=config.asset;await image.decode();imageSize={width:image.naturalWidth,height:image.naturalHeight};if(Math.abs(imageSize.width/3-imageSize.height/2)>.5)throw Error('Atlas must contain six square tiles');
    faces=Object.entries(config.tiles).map(([id,tile])=>({id,tile:[...tile],url:config.asset,yaw:orientations[id][0],pitch:orientations[id][1],fov:90,width:imageSize.width/3,height:imageSize.height/2}));
   }else{
    image=new Image();image.src=config.asset;await image.decode();imageSize={width:image.naturalWidth,height:image.naturalHeight};if(Math.abs(imageSize.width/imageSize.height-2)>.025)throw Error('Panorama must be2:1');
    await Promise.all(Object.entries(config.repairs.assets).map(async([id,url])=>{try{const patch=new Image();patch.src=url;await patch.decode();if(patch.naturalWidth!==patch.naturalHeight)throw Error('Repair must be square');repairs[id]=patch;patches.push({id,url,yaw:orientations[id][0],pitch:orientations[id][1],fov:config.repairs.fov,width:patch.naturalWidth,height:patch.naturalHeight});}catch{/* Optional repair failure leaves the spherical base usable. */}}));
   }
   if(token!==version||reduced.matches)return;
   stage=document.createElement('div');stage.id='panorama-room';stage.className='panorama-stage';stage.tabIndex=0;stage.setAttribute('role','group');stage.setAttribute('aria-label',document.querySelector('.room-links').getAttribute('aria-label'));
   canvas=document.createElement('canvas');canvas.className='panorama-canvas';canvas.setAttribute('aria-hidden','true');stage.append(canvas);
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('panorama-links');stage.append(svg);
   for(const hotspot of config.hotspots){
    const source=document.getElementById(hotspot.source),link=document.createElementNS(svg.namespaceURI,'a'),path=document.createElementNS(svg.namespaceURI,'path');
    link.id='panorama-'+hotspot.id+'-link';link.dataset.panoramaHotspot=hotspot.id;link.setAttribute('href',source.getAttribute('href'));link.setAttribute('aria-label',source.getAttribute('aria-label'));link.setAttribute('tabindex','0');link.classList.add('hotspot');path.classList.add('contour');link.append(path);svg.append(link);links.push({path,hotspot});
   }
   renderer=atlasMode?unifiedRenderer(canvas,image):view==='cubemap'?cubemapRenderer(canvas,faceImages,config):panoramaRenderer(canvas,image,repairs,config);document.querySelector('.skip-link').setAttribute('href','#panorama-room');viewport.append(stage);viewport.dataset.view=view;viewport.dispatchEvent(new Event('roomviewchange'));
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('context-lost');});
   controls=panoramaControls(stage,config,state=>{svg.setAttribute('viewBox',`0 0 ${state.width} ${state.height}`);update(state);});backend='active';
  }catch{fallback('fallback');}
 }
 reduced.addEventListener('change',()=>{if(reduced.matches)fallback('reduced-motion');else boot();});
 window.addEventListener('message',event=>{if(window.parent===window||event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='pinpin-review-camera')return;controls?.setCamera(event.data.camera);});
 boot();
}
