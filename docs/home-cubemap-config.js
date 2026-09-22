// Hotspots calibrated to the styled1254-square110-degree front/right faces.
const size=1254,tangent=Math.tan(55*Math.PI/180);
const direction=(face,[x,y])=>{const a=(x/size*2-1)*tangent,b=(1-y/size*2)*tangent;return face==='right'?[1,b,-a]:[a,b,1];};
const uv=([x,y,z])=>[.5+Math.atan2(x,z)/(Math.PI*2),.5-Math.asin(y/Math.hypot(x,y,z))/Math.PI];
const anchor=(face,p)=>uv(direction(face,p));
const polygon=(face,points)=>points.flatMap((a,i)=>{const b=points[(i+1)%points.length];return Array.from({length:8},(_,j)=>anchor(face,a.map((v,k)=>v+(b[k]-v)*j/8)));});
export const CUBEMAP=Object.freeze({
 faces:Object.fromEntries(['front','back','right','left','up','down'].map(id=>[id,`storyboard/images/house-menu/room-blender-${id}-v1.webp`])),
 faceFov:110,yaw:0,pitch:0,fov:72,minFov:40,maxFov:90,maxPitch:65,
 hotspots:[
  {id:'door',source:'door-link',anchor:anchor('front',[615,575]),polygon:polygon('front',[[534,754],[534,516],[538,470],[551,439],[574,416],[602,402],[626,398],[650,403],[674,416],[683,402],[697,399],[711,411],[721,440],[724,757],[681,778],[681,754]])},
  {id:'bookcase',source:'bookcase-link',anchor:anchor('right',[508,587]),polygon:polygon('right',[[357,809],[355,385],[362,372],[378,366],[637,366],[651,374],[658,389],[658,809]])}
 ]
});
