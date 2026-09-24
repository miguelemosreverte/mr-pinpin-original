import {unifiedRenderer} from './home-unified-gl.js';
import {panoramaControls} from './home-panorama-controls.js';
import {project} from './home-panorama-math.js';
import {portalLayer} from './house-tour-portals.js';
import {ART,PORTALS,ROOM_NAMES} from './house-tour-config.js';
const $=id=>document.getElementById(id),stage=$('tour-stage'),canvas=$('tour-canvas');
const config={yaw:0,pitch:0,fov:75,minFov:40,maxFov:95,maxPitch:89,hotspots:[]};
const cache=new Map();let data,renderer,controls,doors,room='common',mode='illustrated',backend='loading',pending=true,token=0,draws=0,urlTimer;
function imageAt(url){if(!cache.has(url)){const image=new Image();image.src=url;cache.set(url,image.decode().then(()=>image).catch(error=>{cache.delete(url);throw error;}));}return cache.get(url);}
function state(value,message=''){backend=value;stage.dataset.state=value;$('tour-status').textContent=message;$('reset').disabled=value!=='active';doors?.setEnabled(value==='active');}
function parsedURL(){const p=new URLSearchParams(location.search),r=p.get('room'),m=p.get('mode');const camera=Object.fromEntries(['yaw','pitch','fov'].map(k=>[k,Number(p.get(k))]));return{room:ROOM_NAMES[r]?r:'common',mode:m==='gray'?'gray':'illustrated',camera:['yaw','pitch','fov'].every(k=>p.has(k)&&Number.isFinite(camera[k]))?camera:null};}
function writeURL(push=false){if(!controls)return;const s=controls.snapshot,u=new URL(location.href);u.searchParams.set('room',room);u.searchParams.set('mode',mode);for(const k of ['yaw','pitch','fov'])u.searchParams.set(k,s[k].toFixed(5));history[push?'pushState':'replaceState']({room,mode,camera:{yaw:s.yaw,pitch:s.pitch,fov:s.fov}},'',u);}
function draw(camera){if(renderer){renderer.draw(camera);draws++;}doors?.draw(camera);if(!pending&&backend==='active'){clearTimeout(urlTimer);urlTimer=setTimeout(()=>writeURL(),120);}}
function reset(){if(data)controls.setCamera(data.rooms[room].initialView);}
async function enter(nextRoom,{nextMode=mode,camera=null,push=false}={}){
 if(!data?.rooms[nextRoom])return;clearTimeout(urlTimer);const ticket=++token;pending=true;state('loading','Entering '+ROOM_NAMES[nextRoom].toLowerCase()+'…');
 const url=nextMode==='gray'?data.rooms[nextRoom].atlas:ART[nextRoom];
 $('flat-atlas').href=url;$('tour-fallback').src=url;$('tour-fallback').alt=ROOM_NAMES[nextRoom]+' '+(nextMode==='gray'?'geometry':'illustrated')+' flat six-face cubemap.';
 try{
  const image=await imageAt(url);if(push&&!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,120));if(ticket!==token)return;
  renderer?.destroy();renderer=unifiedRenderer(canvas,image);room=nextRoom;mode=nextMode;
  const initial=data.rooms[room].initialView;Object.assign(config,initial);doors.configure(data,room);
  $('room-name').textContent=ROOM_NAMES[room];$('illustrated').setAttribute('aria-pressed',String(mode==='illustrated'));$('gray').setAttribute('aria-pressed',String(mode==='gray'));$('room-status').textContent=ROOM_NAMES[room]+' · '+(mode==='gray'?'geometry':'illustrated proposal');
  controls.setCamera(camera||initial);pending=false;state('active');draw(controls.snapshot);clearTimeout(urlTimer);writeURL(push);
  if(push)stage.focus({preventScroll:true});
 }catch(error){if(ticket!==token)return;room=nextRoom;mode=nextMode;pending=false;renderer?.destroy();renderer=null;for(const choice of ['illustrated','gray'])$(choice).setAttribute('aria-pressed',String(mode===choice));$('room-name').textContent=ROOM_NAMES[room];$('room-status').textContent=ROOM_NAMES[room]+' · '+mode;state('fallback',nextMode==='illustrated'?'Illustrated view unavailable. Choose Geometry to inspect this room.':'Interactive geometry unavailable. The flat atlas link remains available.');}
}
controls=panoramaControls(stage,config,draw);
doors=portalLayer(stage,$('door-outlines'),$('door-buttons'),config,(to,arrivalView)=>enter(to,{camera:arrivalView,push:true}));
$('reset').addEventListener('click',reset);
for(const nextMode of ['illustrated','gray'])$(nextMode).addEventListener('click',()=>enter(room,{nextMode,camera:controls.snapshot}));
window.addEventListener('popstate',()=>{const state=parsedURL();enter(state.room,{nextMode:state.mode,camera:state.camera});});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer=null;state('fallback','Interactive view paused. The flat atlas remains available.');});
canvas.addEventListener('webglcontextrestored',()=>enter(room,{camera:controls.snapshot}));
Object.defineProperty(stage,'tourView',{value:Object.freeze({get snapshot(){return{room,mode,backend,pending,draws,asset:mode==='gray'?data?.rooms[room].atlas:ART[room],portals:doors.snapshot,...controls.snapshot};},setCamera(camera){controls.setCamera(camera);},project(uv){return project(uv,controls.snapshot);}})});
async function start(){try{const response=await fetch(PORTALS);if(!response.ok)throw Error('Portal manifest unavailable');data=await response.json();if(data.portals.length!==2||Object.keys(data.rooms).length!==3)throw Error('Unexpected room graph');const initial=parsedURL();await enter(initial.room,{nextMode:initial.mode,camera:initial.camera});for(const id of Object.keys(data.rooms)){imageAt(ART[id]).catch(()=>{});imageAt(data.rooms[id].atlas).catch(()=>{});}}catch(error){state('fallback','House data unavailable. Return to the location workshop.');}}
start();
