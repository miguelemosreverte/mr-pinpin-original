// Owns the stage's gesture state. Ordinary page scrolling remains outside it.
export function exploreGestures(stage,api){
  const points=new Map();let gesture=null;
  const center=()=>{const p=[...points.values()].slice(0,2);return{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)};};
  stage.addEventListener('contextmenu',e=>e.preventDefault());
  stage.addEventListener('wheel',e=>{e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1;api.startLook();if(e.ctrlKey)api.zoom(e.deltaY*unit);else api.wheel(e.deltaX*unit,e.deltaY*unit);},{passive:false});
  stage.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2)return;
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});stage.setPointerCapture(e.pointerId);
    if(e.pointerType==='touch'&&points.size===2){const origin=gesture?.origin??api.progress();gesture={kind:'two',last:center(),origin};api.startLook(origin);return;}
    if(points.size>1)return;
    const right=e.pointerType==='mouse'&&e.button===2;
    gesture={kind:right?'right':'pending',origin:api.progress(),x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,time:performance.now(),touch:e.pointerType==='touch'};
    if(right)api.startLook();
  });
  stage.addEventListener('pointermove',e=>{
    if(!points.has(e.pointerId)||!gesture)return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(gesture.kind==='blocked')return;
    if(gesture.kind==='two'){if(points.size<2)return;const c=center();api.drag(c.x-gesture.last.x,c.y-gesture.last.y);if(c.d>0&&gesture.last.d>0)api.zoom(Math.log(gesture.last.d/c.d)*400);gesture.last=c;return;}
    if(gesture.kind==='right'){api.drag(e.clientX-gesture.lastX,e.clientY-gesture.lastY);gesture.lastX=e.clientX;gesture.lastY=e.clientY;return;}
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(gesture.kind==='pending'&&Math.hypot(dx,dy)>(gesture.touch?8:3)&&(!gesture.touch||performance.now()-gesture.time>=110))gesture.kind='orbit';
    if(gesture.kind==='orbit')api.orbit(gesture.origin+dx/stage.clientWidth);
  });
  function release(e){
    if(!points.has(e.pointerId))return;
    if(gesture?.kind==='pending'&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>8)api.orbit(gesture.origin+(e.clientX-gesture.x)/stage.clientWidth);
    points.delete(e.pointerId);if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
    if(!points.size)gesture=null;else if(gesture?.kind==='two')gesture.kind='blocked';
  }
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',e=>{points.delete(e.pointerId);if(!points.size)gesture=null;else if(gesture)gesture.kind='blocked';});
  return {get state(){return{kind:gesture?.kind||'idle',pointers:points.size};}};
}
