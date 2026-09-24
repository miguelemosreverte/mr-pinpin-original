import {unifiedRenderer} from './home-unified-gl.js';
import {panoramaControls} from './home-panorama-controls.js';
const ASSET='storyboard/production/house-native-panorama-20260923/cube-atlas-v1.webp';
const stage=document.getElementById('room'),canvas=stage.querySelector('canvas'),status=document.getElementById('status');
const initial={yaw:Math.PI,pitch:0,fov:75},config={...initial,minFov:40,maxFov:95,maxPitch:89,hotspots:[]};
let renderer,image,backend='loading',draws=0;
function draw(camera){if(renderer){renderer.draw(camera);draws++;}}
const controls=panoramaControls(stage,config,draw);
document.getElementById('fallback').src=ASSET;
function state(value,message=''){backend=value;stage.dataset.state=value;status.textContent=message;}
async function load(){try{if(!image){image=new Image();image.src=ASSET;await image.decode();}renderer?.destroy();renderer=unifiedRenderer(canvas,image);state('active');draw(controls.snapshot);}catch(error){renderer=null;state('fallback','Interactive view unavailable. The flat cubemap is shown; use Report for the source images.');}}
document.getElementById('reset').addEventListener('click',()=>controls.setCamera(initial));
const fullscreen=document.getElementById('fullscreen');if(!document.documentElement.requestFullscreen)fullscreen.hidden=true;
fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){fullscreen.hidden=true;}});
document.addEventListener('fullscreenchange',()=>fullscreen.textContent=document.fullscreenElement?'Exit fullscreen':'Fullscreen');
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer=null;state('fallback','Interactive view paused. The flat cubemap is shown.');});
canvas.addEventListener('webglcontextrestored',load);
Object.defineProperty(window,'nativeCubeDemo',{value:Object.freeze({get snapshot(){return{backend,asset:ASSET,draws,...controls.snapshot};},setCamera(camera){controls.setCamera(camera);}})});
load();
