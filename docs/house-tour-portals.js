import {project,polygonPath} from './home-panorama-math.js';
import {ROOM_NAMES} from './house-tour-config.js';
const NS='http://www.w3.org/2000/svg';
export function worldUV(point,origin){const [x,y,z]=point.map((v,i)=>v-origin[i]),length=Math.hypot(x,y,z);return[.5+Math.atan2(x,y)/(2*Math.PI),.5-Math.asin(z/length)/Math.PI];}
export function portalLayer(stage,svg,buttons,config,navigate){
 let entries=[],enabled=false,lastCamera=null;
 function configure(data,room){
  svg.replaceChildren();buttons.replaceChildren();entries=[];const origin=data.rooms[room].origin;
  for(const portal of data.portals){const link=portal.links.find(l=>l.from===room);if(!link||!link.rayCheck.visible)continue;
   if((room==='bath'&&link.to!=='common')||(room==='bedroom'&&link.to!=='common'))throw Error('Invalid room connection');
   const anchor=worldUV(link.anchorWorld,origin),polygon=portal.polygonWorld.map(p=>worldUV(p,origin));
   const path=document.createElementNS(NS,'path');path.classList.add('portal-outline');path.setAttribute('aria-hidden','true');svg.append(path);
   const button=document.createElement('button');button.type='button';button.className='portal-button out-of-view';button.textContent=ROOM_NAMES[link.to]+' →';button.setAttribute('aria-label','Go to '+ROOM_NAMES[link.to].toLowerCase());button.dataset.panoramaHotspot=portal.id;button.dataset.destination=link.to;button.disabled=!enabled;buttons.append(button);
   const go=()=>{if(enabled)navigate(link.to,link.arrivalView);};path.addEventListener('click',go);button.addEventListener('click',go);
   for(const event of ['pointerenter','focus'])button.addEventListener(event,()=>path.classList.add('highlight'));
   for(const event of ['pointerleave','blur'])button.addEventListener(event,()=>path.classList.remove('highlight'));
   path.addEventListener('pointerenter',()=>button.classList.add('highlight'));path.addEventListener('pointerleave',()=>button.classList.remove('highlight'));
   entries.push({id:portal.id,to:link.to,anchor,polygon,path,button,visible:false});
  }
  config.hotspots=entries.map(e=>({id:e.id,anchor:e.anchor}));
 }
 function draw(camera){lastCamera=camera;svg.setAttribute('viewBox',`0 0 ${camera.width} ${camera.height}`);
  for(const entry of entries){const p=project(entry.anchor,camera),visible=enabled&&p.visible&&p.x>70&&p.x<camera.width-70&&p.y>26&&p.y<camera.height-26;entry.visible=visible;
   entry.path.setAttribute('d',visible?polygonPath(entry.polygon,camera):'');entry.path.style.pointerEvents=visible?'all':'none';
   entry.button.classList.toggle('out-of-view',!visible);entry.button.style.left=p.x+'px';entry.button.style.top=p.y+'px';
  }
 }
 return{configure,draw,setEnabled(value){enabled=value;for(const e of entries)e.button.disabled=!value;if(lastCamera)draw(lastCamera);},get snapshot(){return entries.map(e=>({id:e.id,to:e.to,anchor:e.anchor,visible:e.visible}));}};
}
