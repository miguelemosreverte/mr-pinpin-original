const dialog=document.getElementById('room-inputs'),openButton=document.getElementById('show-inputs');
const root='storyboard/images/house-menu/';
const inputs=[
 {group:'guide',url:'https://huggingface.co/buckets/miguelemosreverte/mr-pinpin-archive/resolve/sha256/60/604d32e7044bc90b2927ec8e9656103d990688addccb534bd4afdf14144c816e/room-blockout-equirectangular.png',title:'Actual Blender input for A · spherical panorama',alt:'Original gray Blender equirectangular room guide, a single 2:1 spherical panorama used as input for A.'},
 {group:'blender',file:'room-blender-gray-v1.webp',title:'Blender source atlas',alt:'Untouched gray Blender cubemap: front, right and back above left, ceiling and floor.',id:'gray-atlas-link'},
 {group:'panorama',file:'room-panorama-v3.webp',title:'A · full panoramic base',alt:'Flat equirectangular painting of the complete room, with curved ceiling and floor projection.'},
 ...['front','rear','up','down'].map((face,index)=>({group:'repair',file:`room-cube-${face}-v1.webp`,title:`A · ${['front','rear','ceiling','floor'][index]} repair`,alt:`Square 110-degree perspective painting used to repair the ${['front wall','rear wall','ceiling','floor'][index]} of panorama A.`}))
];
let populated=false;
function populate(){
 if(populated)return;
 for(const input of inputs){
  const figure=document.createElement('figure'),link=document.createElement('a'),img=document.createElement('img'),caption=document.createElement('figcaption');
  link.href=input.url||root+input.file;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',input.title+' — open original in new tab');
  if(input.id)link.id=input.id;
  img.src=link.href;img.alt=input.alt;img.loading='lazy';img.decoding='async';
  caption.textContent=input.title+' ↗';link.append(img,caption);figure.append(link);
  document.getElementById(input.group+'-inputs').append(figure);
 }
 populated=true;
}
populate();
openButton.addEventListener('click',()=>{populate();dialog.showModal();});
document.getElementById('close-inputs').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
if(new URLSearchParams(location.search).get('inputs')==='1')dialog.showModal();
