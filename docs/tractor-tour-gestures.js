// One-finger/pointer motion looks; two-finger translation or scrolling orbits.
export function tourGestures(stage,api){
  const points=new Map();let gesture=null,hover=null,twoFrame=0;
  const interactive=e=>Boolean(e.target?.closest?.('button,a,input,select,textarea,[role="button"],[contenteditable="true"]'));
  const center=()=>{const p=[...points.values()].slice(0,2);return{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)};};
  function lookMove(dx,dy){api.startLook();api.drag(dx,dy);}
  function mouseMotion(e){
    if(e.pointerType!=='mouse'||e.buttons||points.size||interactive(e)){hover=null;return;}
    const now=performance.now();
    if(!hover){hover={x:e.clientX,y:e.clientY,time:now,dx:0,dy:0,active:false};return;}
    const dx=e.clientX-hover.x,dy=e.clientY-hover.y,elapsed=now-hover.time;
    hover.x=e.clientX;hover.y=e.clientY;hover.time=now;
    // Re-entry, cursor warps, and small jitter are not look intent.
    if(elapsed>240||Math.hypot(dx,dy)>Math.min(120,stage.clientWidth*.3)){hover.dx=hover.dy=0;hover.active=false;return;}
    if(!hover.active){hover.dx+=dx;hover.dy+=dy;if(Math.hypot(hover.dx,hover.dy)<5)return;hover.active=true;lookMove(hover.dx,hover.dy);}
    else if(dx||dy)lookMove(dx,dy);
  }
  function flushTwo(){
    if(twoFrame)cancelAnimationFrame(twoFrame);twoFrame=0;
    if(gesture?.kind!=='two'||points.size<2)return;
    const c=center(),dx=c.x-gesture.start.x,dy=c.y-gesture.start.y,travel=Math.hypot(dx,dy),spread=Math.abs(c.d-gesture.start.d);
    if(!gesture.action){
      // Decide from a complete two-pointer sample, not the transient centroid
      // halfway through delivery of the two pointermove events.
      if(spread>=3&&spread>travel*1.3)gesture.action='pinch';
      else if(travel>=4){gesture.action='orbit';gesture.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';}
      else return;
    }
    if(gesture.action==='pinch'){if(c.d>0&&gesture.last.d>0){api.startLook();api.zoom(Math.log(gesture.last.d/c.d)*400);}}
    else api.orbit(gesture.origin+(gesture.axis==='x'?dx:dy)/stage.clientWidth);
    gesture.last=c;
  }
  stage.addEventListener('pointerenter',e=>{hover=null;mouseMotion(e);});
  stage.addEventListener('pointerleave',()=>{hover=null;});
  stage.addEventListener('contextmenu',e=>{if(!interactive(e))e.preventDefault();});
  stage.addEventListener('wheel',e=>{if(interactive(e))return;hover=null;e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1;api.wheelInput(e.deltaX*unit,e.deltaY*unit,e.ctrlKey);},{passive:false});
  stage.addEventListener('pointerdown',e=>{
    hover=null;if(interactive(e)||(e.pointerType==='mouse'&&e.button!==0&&e.button!==2))return;
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});stage.setPointerCapture(e.pointerId);
    if(e.pointerType==='touch'&&points.size===2){const c=center();gesture={kind:'two',start:c,last:c,origin:api.progress(),action:null,axis:null};return;}
    if(points.size>1)return;
    gesture={kind:'single',active:false,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,touch:e.pointerType==='touch'};
  });
  stage.addEventListener('pointermove',e=>{
    if(!points.has(e.pointerId)||!gesture){mouseMotion(e);return;}
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(gesture.kind==='two'){if(!twoFrame)twoFrame=requestAnimationFrame(flushTwo);return;}
    const dx=e.clientX-gesture.lastX,dy=e.clientY-gesture.lastY;
    if(!gesture.active){const totalX=e.clientX-gesture.x,totalY=e.clientY-gesture.y;if(Math.hypot(totalX,totalY)<(gesture.touch?8:3))return;gesture.active=true;lookMove(totalX,totalY);}
    else if(dx||dy)lookMove(dx,dy);
    gesture.lastX=e.clientX;gesture.lastY=e.clientY;
  });
  function release(e,cancelled=false){
    if(!points.has(e.pointerId))return;
    if(cancelled){if(twoFrame)cancelAnimationFrame(twoFrame);twoFrame=0;api.cancelInput?.();}
    else flushTwo();
    points.delete(e.pointerId);if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
    if(!points.size)gesture=null;
    else if(gesture?.kind==='two'){const p=points.values().next().value;gesture={kind:'single',active:false,x:p.x,y:p.y,lastX:p.x,lastY:p.y,touch:true};}
  }
  stage.addEventListener('pointerup',e=>release(e));stage.addEventListener('pointercancel',e=>release(e,true));
  return {get state(){return{kind:gesture?.kind||(hover?.active?'hover-look':'idle'),action:gesture?.action??null,pointers:points.size,accepted:api.isLooking()};}};
}
