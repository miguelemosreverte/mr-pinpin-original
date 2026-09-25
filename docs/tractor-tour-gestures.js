// Owns stage input; ordinary scrolling and controls outside it are untouched.
export function tourGestures(stage,api){
  const points=new Map();let gesture=null,hover=null;
  const interactive=e=>Boolean(e.target?.closest?.('button,a,input,select,textarea,[role="button"],[contenteditable="true"]'));
  const center=()=>{const p=[...points.values()].slice(0,2);return{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)};};
  function mouseMotion(e){
    if(e.pointerType!=='mouse'||e.buttons||points.size||interactive(e)){hover=null;return;}
    const now=performance.now();
    if(!hover){hover={x:e.clientX,y:e.clientY,time:now,dx:0,dy:0,active:false,origin:api.progress()};return;}
    const dx=e.clientX-hover.x,dy=e.clientY-hover.y,elapsed=now-hover.time;
    hover.x=e.clientX;hover.y=e.clientY;hover.time=now;
    // Re-entry, a cursor warp, and subpixel jitter are not orbit intent.
    if(elapsed>240||Math.hypot(dx,dy)>Math.min(120,stage.clientWidth*.3)){hover.dx=hover.dy=0;hover.active=false;hover.origin=api.progress();return;}
    hover.dx+=dx;hover.dy+=dy;
    if(!hover.active&&Math.abs(hover.dx)>=5&&Math.abs(hover.dx)>=Math.abs(hover.dy)*.5){hover.active=true;hover.origin=api.progress();}
    if(hover.active&&dx)api.orbit(hover.origin+hover.dx/stage.clientWidth);
  }
  stage.addEventListener('pointerenter',e=>{hover=null;mouseMotion(e);});
  stage.addEventListener('pointerleave',()=>{hover=null;});
  stage.addEventListener('contextmenu',e=>{if(!interactive(e))e.preventDefault();});
  stage.addEventListener('wheel',e=>{if(interactive(e))return;hover=null;e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1;api.wheelInput(e.deltaX*unit,e.deltaY*unit,e.ctrlKey);},{passive:false});
  stage.addEventListener('pointerdown',e=>{
    hover=null;if(interactive(e)||(e.pointerType==='mouse'&&e.button!==0&&e.button!==2))return;
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});stage.setPointerCapture(e.pointerId);
    if(e.pointerType==='touch'&&points.size===2){const origin=api.progress();gesture={kind:'two',last:center(),origin};api.startLook(origin);return;}
    if(points.size>1)return;
    const right=e.pointerType==='mouse'&&e.button===2;
    gesture={kind:right?'right':'pending',origin:api.progress(),x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,time:performance.now(),touch:e.pointerType==='touch'};
    if(right)api.startLook();
  });
  stage.addEventListener('pointermove',e=>{
    if(!points.has(e.pointerId)||!gesture){mouseMotion(e);return;}
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(gesture.kind==='two'){if(points.size<2)return;const c=center();api.drag(c.x-gesture.last.x,c.y-gesture.last.y);if(c.d>0&&gesture.last.d>0)api.zoom(Math.log(gesture.last.d/c.d)*400);gesture.last=c;return;}
    if(gesture.kind==='right'){api.drag(e.clientX-gesture.lastX,e.clientY-gesture.lastY);gesture.lastX=e.clientX;gesture.lastY=e.clientY;return;}
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(gesture.kind==='pending'&&Math.hypot(dx,dy)>(gesture.touch?8:3)&&(!gesture.touch||performance.now()-gesture.time>=110))gesture.kind='orbit';
    if(gesture.kind==='orbit')api.orbit(gesture.origin+dx/stage.clientWidth);
  });
  function release(e,cancelled=false){
    if(!points.has(e.pointerId))return;
    if(cancelled)api.cancelInput?.();
    else if(gesture?.kind==='pending'&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>8)api.orbit(gesture.origin+(e.clientX-gesture.x)/stage.clientWidth);
    points.delete(e.pointerId);if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
    if(!points.size)gesture=null;
    else if(gesture?.kind==='two'){
      const p=points.values().next().value;
      gesture={kind:'pending',origin:api.progress(),x:p.x,y:p.y,lastX:p.x,lastY:p.y,time:performance.now()-110,touch:true};
    }
  }
  stage.addEventListener('pointerup',e=>release(e));stage.addEventListener('pointercancel',e=>release(e,true));
  return {get state(){return{kind:gesture?.kind||(hover?.active?'hover-orbit':'idle'),pointers:points.size,accepted:api.isLooking()};}};
}
