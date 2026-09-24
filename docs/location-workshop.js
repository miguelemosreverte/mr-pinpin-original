import {unifiedRenderer} from './home-unified-gl.js';
import {panoramaRenderer} from './home-panorama-gl.js';
import {PANORAMA} from './home-panorama-config.js';
import {panoramaControls} from './home-panorama-controls.js';

const rooms={
 common:{label:'Common room',atlas:'storyboard/locations/pinpin-house/examples/common-cubemap/cube-atlas.webp',role:'Current gray geometry · fixed camera in the common room.'},
 bath:{yaw:-1.109,pitch:-0.42,label:'Bathroom',atlas:'storyboard/locations/pinpin-house/examples/bath-cubemap/cube-atlas.webp',role:'Current gray geometry · revised bathroom and its connection to the common room.'},
 bedroom:{yaw:1.052,pitch:-0.35,label:'Bedroom',atlas:'storyboard/locations/pinpin-house/examples/bedroom-cubemap/cube-atlas.webp',role:'Current gray geometry · fixed camera in the bedroom.'},
 benchmark:{yaw:PANORAMA.yaw,pitch:0,label:'Earlier repaired panorama',atlas:PANORAMA.asset,role:'Earlier repaired panorama · visual-quality benchmark, with all four final repairs. Its different house layout is not the current three-room geometry.'}
};
const $=id=>document.getElementById(id),stage=$('viewer'),canvas=$('room-canvas'),fallback=$('flat-fallback'),status=$('viewer-status');
const limits={yaw:0,pitch:0,fov:72,minFov:40,maxFov:95,maxPitch:89,hotspots:[]};
let renderer=null,controls=null,selected='common',request=0,draws=0,backend='loading';
function draw(s){if(renderer){renderer.draw(s);draws++;}}
function state(value,message){backend=value;stage.dataset.state=value;status.textContent=message;for(const id of ['reset','zoom-in','zoom-out'])$(id).disabled=value!=='active';}
function reset(){controls?.setCamera({yaw:limits.yaw,pitch:limits.pitch,fov:72});}
async function loadRoom(id){
 if(id==='legacy')id='benchmark';if(!rooms[id])id='common';selected=id;const token=++request,room=rooms[id];
 limits.yaw=room.yaw||0;limits.pitch=room.pitch||0;limits.maxPitch=id==='benchmark'?65:89;
 renderer?.destroy();renderer=null;state('loading','Loading '+room.label.toLowerCase()+'…');
 $('room').value=id;$('view-role').textContent=room.role;
 fallback.src=room.atlas;fallback.alt=id==='benchmark'?'Earlier panorama spherical base image, before the four runtime repair overlays.':room.label+' flat atlas: front, right, back / left, up, down.';
 const link=$('atlas-download');link.href=room.atlas;link.download=room.atlas.split('/').pop();link.textContent=id==='benchmark'?'Open spherical base image':'Open / download flat atlas';
 $('view-evidence').href=id==='benchmark'?'storyboard/production/house-panorama-20260922/VERIFICATION.md':room.atlas.replace('cube-atlas.webp','review-manifest.json');
 const url=new URL(location.href);url.searchParams.set('room',id);history.replaceState(null,'',url);
 try{
  const image=new Image();image.src=room.atlas;await image.decode();if(token!==request)return;
  const gl=canvas.getContext('webgl');if(gl)gl.activeTexture(gl.TEXTURE0);
  if(id==='benchmark'){const entries=await Promise.all(Object.entries(PANORAMA.repairs.assets).map(async([key,url])=>{const patch=new Image();patch.src=url;await patch.decode();return[key,patch];}));if(token!==request)return;renderer=panoramaRenderer(canvas,image,Object.fromEntries(entries),PANORAMA);}else renderer=unifiedRenderer(canvas,image);reset();draw(controls.snapshot);state('active','');
 }catch(error){if(token!==request)return;state('fallback','Interactive view unavailable. Open the flat atlas using the link below.');}
}
controls=panoramaControls(stage,limits,draw);
$('room').addEventListener('change',e=>loadRoom(e.target.value));
$('reset').addEventListener('click',reset);
for(const [id,delta] of [['zoom-in',-8],['zoom-out',8]])$(id).addEventListener('click',()=>controls.setCamera({...controls.snapshot,fov:controls.snapshot.fov+delta}));
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer=null;state('fallback','Interactive view paused. The flat atlas remains available.');});
canvas.addEventListener('webglcontextrestored',()=>loadRoom(selected));
Object.defineProperty(stage,'workshopView',{value:Object.freeze({get snapshot(){return{room:selected,backend,asset:rooms[selected].atlas,patches:selected==='benchmark'?PANORAMA.repairs.assets:null,draws,...controls.snapshot};}})});
function figure(src,title,caption,alt){
 const f=document.createElement('figure'),a=document.createElement('a'),img=new Image(),c=document.createElement('figcaption'),strong=document.createElement('strong');
 a.href=src;a.target='_blank';a.rel='noopener';img.src=src;img.alt=alt;img.loading='lazy';a.append(img);strong.textContent=title;c.append(strong,document.createTextNode(caption));f.append(a,c);return f;
}
$('still-note').textContent='Saved common-room camera and open/closed-door comparison from the same house model. These still cameras are independent of the look-around room selector above.';
$('still-grid').append(
 figure('storyboard/locations/pinpin-house/examples/common-still/still.webp','Common room · saved still','A repeatable camera composition from the current model.','Current common-room geometry rendered from its saved still camera.'),
 figure('storyboard/locations/pinpin-house/examples/door-open/still.webp','Private-room doors · open','Both internal doors open. The bedroom leaf still partly blocks that sightline; it has not been hidden.','Current house geometry with both private-room doors open from the saved common-room camera.'),
 figure('storyboard/locations/pinpin-house/examples/door-closed/still.webp','Private-room doors · closed','Exactly the same camera with both internal doors closed.','Same saved common-room camera with both private-room doors closed.')
);
loadRoom(new URLSearchParams(location.search).get('room')||'common');

async function loadReferences(){
 try{const response=await fetch('storyboard/locations/pinpin-house/references.json');if(!response.ok)throw Error('Reference manifest unavailable');const data=await response.json();
 const names={'common-book':'Common room · book style and characters','bathroom-book':'Bathroom · book style and tub design','bedroom-book':'Bedroom · book style and bed design','exterior-book':'Exterior · book design motifs'};
 for(const id of Object.keys(names)){const ref=data.references.find(r=>r.id===id);if(ref){const src=ref.path.replace(/^docs\//,'');$('reference-grid').append(figure(src,names[id],ref.notes,names[id]+'. '+ref.notes));}}
 }catch(error){$('reference-grid').textContent='Reference thumbnails unavailable. The reference manifest remains linked below.';}
}
loadReferences();
