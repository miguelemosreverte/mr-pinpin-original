import {SCENE} from './home-scene.js?v=expanded-20260922';
import {WIDTH,HEIGHT,COLS,ROWS,createMesh,projectMesh,projectPoint} from './home-depth-geometry.js?v=expanded-20260922';
import {createRenderer} from './home-depth-gl.js?v=expanded-20260922';
const viewport=document.querySelector('.room-fit'),room=document.querySelector('.room'),art=document.querySelector('.room-art');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const canvas=document.createElement('canvas');canvas.className='room-depth';canvas.setAttribute('aria-hidden','true');viewport.prepend(canvas);
const contours=[...room.querySelectorAll('.contour')].map(path=>{
 const length=path.getTotalLength(),points=[];
 for(let d=0;d<length;d+=Math.min(WIDTH,HEIGHT)/340){const p=path.getPointAtLength(d);points.push([p.x,p.y]);}
 return {path,original:path.getAttribute('d'),points,bounds:path.getBBox()};
});
let renderer,mesh,frame=0,last=0,focus=.35,target=.35,selected=null,failed=false,ready=false,version=0,draws=0,geometryDirty=true;
viewport.dataset.depth='loading';
// Read-only diagnostics also make coordinate consumers use the renderer's projection.
viewport.depthView=Object.freeze({
 get snapshot(){return {backend:viewport.dataset.depth,convention:'white-near',focus,target,selected:selected?.path.id||null,draws,maxBlurCSS:3.2,camera:{...viewport.cameraState},scene:SCENE};},
 project(point){return mesh&&viewport.dataset.depth==='active'?projectPoint(mesh,...point):[...point,null];}
});
function flat(reason){
 cancelAnimationFrame(frame);frame=0;viewport.classList.remove('has-depth');viewport.dataset.depth=reason;
 contours.forEach(c=>c.path.setAttribute('d',c.original));
}
function schedule(){if(!['panorama','cubemap','cubemap-unified'].includes(viewport.dataset.view)&&!frame&&ready&&!reduced.matches&&!failed)frame=requestAnimationFrame(render);}
function render(time){
 frame=0;const camera=viewport.cameraState;if(!camera)return;
 try{
  if(geometryDirty)projectMesh(mesh,camera);
  const point=selected?{x:selected.bounds.x+selected.bounds.width/2,y:selected.bounds.y+selected.bounds.height/2}:camera;
  target=projectPoint(mesh,point.x,point.y)[2];
  const dt=Math.min(100,last?time-last:100);last=time;
  focus+=(target-focus)*(1-Math.exp(-dt/130));
  renderer.draw(camera,focus,geometryDirty);draws++;
  if(geometryDirty)for(const c of contours)c.path.setAttribute('d',c.points.map((p,i)=>{const q=projectPoint(mesh,...p);return `${i?'L':'M'}${q[0].toFixed(2)} ${q[1].toFixed(2)}`;}).join(' ')+' Z');
  geometryDirty=false;
  viewport.classList.add('has-depth');viewport.dataset.depth='active';
  if(Math.abs(target-focus)>.002)schedule();
 }catch{failed=true;flat('fallback');}
}
async function load(){
 const token=++version;
 if(['panorama','cubemap','cubemap-unified'].includes(viewport.dataset.view)){flat('panorama-paused');return;}
 if(reduced.matches){flat('reduced-motion');return;}
 if(ready){schedule();return;}
 try{
  await art.decode();
  if(art.naturalWidth!==WIDTH||art.naturalHeight!==HEIGHT)throw Error('Color dimensions do not match');
  const depth=new Image();depth.src=SCENE.depth;await depth.decode();
  if(depth.naturalWidth!==WIDTH||depth.naturalHeight!==HEIGHT)throw Error('Depth dimensions do not match');
  if(token!==version||reduced.matches||['panorama','cubemap','cubemap-unified'].includes(viewport.dataset.view))return;
  const sample=document.createElement('canvas');sample.width=COLS+1;sample.height=ROWS+1;
  const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(depth,0,0,sample.width,sample.height);
  const pixels=ctx.getImageData(0,0,sample.width,sample.height).data;
  mesh=createMesh(Float32Array.from({length:sample.width*sample.height},(_,i)=>pixels[i*4]/255));
  renderer=createRenderer(canvas,art,depth,mesh);geometryDirty=true;ready=true;failed=false;schedule();
 }catch{failed=true;flat('fallback');}
}
viewport.addEventListener('roomcamerachange',()=>{geometryDirty=true;selected=null;schedule();});
viewport.addEventListener('pointermove',event=>{
 if(event.buttons||event.pointerType!=='mouse')return;
 const path=event.target.closest('.hotspot')?.querySelector('.contour');selected=contours.find(c=>c.path===path)||null;schedule();
});
viewport.addEventListener('pointerleave',()=>{selected=null;schedule();});
room.addEventListener('focusin',event=>{const path=event.target.closest('.hotspot')?.querySelector('.contour');selected=contours.find(c=>c.path===path)||null;schedule();});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;flat('context-lost');});
canvas.addEventListener('webglcontextrestored',()=>{renderer?.destroy();renderer=null;ready=false;failed=false;load();});
reduced.addEventListener('change',()=>{if(reduced.matches){version++;flat('reduced-motion');}else {geometryDirty=true;load();}});
viewport.addEventListener('roomviewchange',()=>{if(['panorama','cubemap','cubemap-unified'].includes(viewport.dataset.view)){version++;flat('panorama-paused');}else {geometryDirty=true;load();}});
load();
