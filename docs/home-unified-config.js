// One atlas, top: front/right/back; bottom: left/up/down. True 90-degree faces.
// Targets calibrated to the selected v2 atlas's actual 512-square face pixels.
const uv=([x,y,z])=>[.5+Math.atan2(x,z)/(Math.PI*2),.5-Math.asin(y/Math.hypot(x,y,z))/Math.PI];
const anchor=(face,[x,y])=>uv(face==='right'?[1,1-2*y,1-2*x]:[2*x-1,1-2*y,1]);
const polygon=(face,points)=>points.flatMap((a,i)=>{const b=points[(i+1)%points.length];return Array.from({length:8},(_,j)=>anchor(face,a.map((v,k)=>v+(b[k]-v)*j/8)));});
const pixels=points=>points.map(p=>p.map(v=>v/512));
export const UNIFIED=Object.freeze({
 asset:'storyboard/images/house-menu/room-unified-cubemap-v2.webp',
 tiles:{front:[0,0],right:[1,0],back:[2,0],left:[0,1],up:[1,1],down:[2,1]},
 faceFov:90,yaw:0,pitch:0,fov:72,minFov:40,maxFov:90,maxPitch:65,
 hotspots:[
  {id:'door',source:'door-link',anchor:anchor('front',[236/512,228/512]),polygon:polygon('front',pixels([[176,331],[176,180],[181,156],[190,139],[204,125],[221,115],[239,111],[256,115],[272,124],[285,141],[294,163],[298,331],[260,337],[260,331]]))},
  {id:'bookcase',source:'bookcase-link',anchor:anchor('right',[194/512,230/512]),polygon:polygon('right',pixels([[105,348],[105,122],[107,112],[281,112],[283,121],[283,348]]))}
 ]
});
// Pure Blender control uses the guide geometry, not the stylized C targets.
export const GRAY=Object.freeze({
 ...UNIFIED,asset:'storyboard/images/house-menu/room-blender-gray-v1.webp',
 hotspots:[
  {id:'door',source:'door-link',anchor:anchor('front',[.5,.51]),polygon:polygon('front',[[.4167,.6917],[.4167,.4083],[.423,.376],[.441,.349],[.469,.331],[.5,.325],[.531,.331],[.559,.349],[.577,.376],[.5833,.4083],[.5833,.6917]])},
  {id:'bookcase',source:'bookcase-link',anchor:anchor('right',[.37,.5]),polygon:polygon('right',[[.21,.736],[.21,.268],[.535,.268],[.535,.736]])}
 ]
});
