const query=new URLSearchParams(location.search),lang=['ru','en','es'].includes(query.get('lang'))?query.get('lang'):'ru';
const frames={a:document.getElementById('frame-a'),b:document.getElementById('frame-b')},views={a:'panorama',b:'cubemap'};
const statuses={a:document.getElementById('status-a'),b:document.getElementById('status-b')},main=document.querySelector('main'),fov=document.getElementById('fov'),output=document.getElementById('fov-value');
const candidate=document.getElementById('candidate');
candidate.value=['unified','gray'].includes(query.get('candidate'))?query.get('candidate'):'separate';
let active='a',camera={yaw:0,pitch:0,fov:72};const sent={},bound={};
document.getElementById('home-link').href='./?lang='+lang;
const differs=(a,b)=>!a||Math.abs(a.yaw-b.yaw)>1e-6||Math.abs(a.pitch-b.pitch)>1e-6||Math.abs(a.fov-b.fov)>1e-5;
function send(id,force=false){if(!force&&!differs(sent[id],camera))return;frames[id].contentWindow?.postMessage({type:'pinpin-review-camera',camera:{...camera}},location.origin);sent[id]={...camera};}
function showAngle(){fov.value=String(Math.round(camera.fov));output.value=Math.round(camera.fov)+'°';}
function setCamera(next){camera={...next};showAngle();for(const id of Object.keys(frames))send(id,true);}
function select(id){active=id;main.dataset.selected=id;document.querySelectorAll('.mobile-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===id)));send(id,true);}
for(const button of document.querySelectorAll('button[data-panel]'))button.addEventListener('click',()=>select(button.dataset.panel));
const presets={front:[0,0],rear:[Math.PI,0],left:[-Math.PI/4,0],right:[Math.PI/4,0],up:[0,65*Math.PI/180],down:[0,-65*Math.PI/180]};
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{const[yaw,pitch]=presets[button.dataset.view];setCamera({yaw,pitch,fov:camera.fov});});
fov.addEventListener('input',()=>setCamera({...camera,fov:Number(fov.value)}));
const candidates={separate:{letter:'B',view:'cubemap',label:'Six Blender views',tab:'Blender faces',description:'six separately styled Blender views'},unified:{letter:'C',view:'cubemap-unified',label:'One image, six views',tab:'One image',description:'six Blender views styled in one image'},gray:{letter:'D',view:'cubemap-gray',label:'Pure Blender',tab:'Pure Blender',description:'unaltered gray Blender render'}};
function candidateLabels(){const option=candidates[candidate.value];views.b=option.view;document.getElementById('review-title').textContent='Room experiment · A / '+option.letter;document.title='PinPin room · A/'+option.letter+' review';document.getElementById('candidate-title').textContent=option.letter+' · '+option.label;document.querySelector('.mobile-tabs button[data-panel=b]').textContent=option.letter+' · '+option.tab;frames.b.title=option.letter+': '+option.description;}
candidateLabels();
candidate.addEventListener('change',()=>{candidateLabels();active='a';sent.b=null;bound.b=null;statuses.b.textContent='Loading…';frames.b.src='./?view='+views.b+'&lang='+lang+'&review=1';const url=new URL(location.href);if(candidate.value!=='separate')url.searchParams.set('candidate',candidate.value);else url.searchParams.delete('candidate');history.replaceState(null,'',url);});
function reload(){for(const[id,frame]of Object.entries(frames)){sent[id]=null;bound[id]=null;statuses[id].textContent='Loading…';frame.src='./?view='+views[id]+'&lang='+lang+'&review=1';}camera={yaw:0,pitch:0,fov:72};showAngle();}
document.getElementById('reload').addEventListener('click',reload);
for(const[id,frame]of Object.entries(frames))frame.addEventListener('load',()=>{sent[id]=null;bound[id]=null;});
function poll(){for(const[id,frame]of Object.entries(frames)){try{const doc=frame.contentDocument,viewport=doc?.querySelector('.room-fit'),state=viewport?.panoramaView?.snapshot;if(!state){statuses[id].textContent='Waiting for room';continue;}statuses[id].textContent=state.backend==='active'?'Ready':state.backend==='loading'?'Loading…':'Fallback: '+state.backend;if(state.backend!=='active')continue;
 if(bound[id]!==doc){for(const event of ['pointerdown','wheel','keydown'])doc.addEventListener(event,()=>{active=id;},{capture:true,passive:true});bound[id]=doc;send(id,true);continue;}
 if(id===active&&differs(camera,state)){camera={yaw:state.yaw,pitch:state.pitch,fov:state.fov};sent[id]={...camera};showAngle();send(id==='a'?'b':'a');}else if(!sent[id])send(id,true);
 }catch{statuses[id].textContent='Preview unavailable';}}
}
reload();function tick(){if(!document.hidden)poll();requestAnimationFrame(tick);}requestAnimationFrame(tick);
