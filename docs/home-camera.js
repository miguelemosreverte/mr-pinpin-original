import {SCENE,WORLD} from './home-scene.js?v=expanded-20260922';
(() => {
  'use strict';
  const viewport = document.querySelector('.room-fit');
  const room = document.querySelector('.room');
  const world = WORLD;
  const art = room.querySelector('.room-art');
  if(art.getAttribute('src')!==SCENE.color)art.src=SCENE.color;
  art.width=world.width;art.height=world.height;
  room.style.width = world.width+'px';
  room.style.height = world.height+'px';
  room.querySelector('.room-links').setAttribute('viewBox',`0 0 ${world.width} ${world.height}`);
  const pointers = new Map();
  let width = 0, height = 0, scale = 1, x = world.width/2, y = world.height/2;
  let origin, pinch, blocked = false, keyboard = false;
  const enabled = () => !['panorama','cubemap','cubemap-unified','cubemap-gray'].includes(viewport.dataset.view);
  const cover = () => Math.max(width / world.width, height / world.height);
  const limit = (value, min, max) => Math.max(min, Math.min(max, value));
  function draw() {
    scale = limit(scale, cover()*SCENE.zoom.min, cover()*SCENE.zoom.max);
    x = limit(x, width / (2 * scale), world.width - width / (2 * scale));
    y = limit(y, height / (2 * scale), world.height - height / (2 * scale));
    room.style.transform = `translate(${width / 2 - x * scale}px, ${height / 2 - y * scale}px) scale(${scale})`;
    viewport.cameraState = {width,height,x,y,scale,world,zoom:SCENE.zoom,anchors:SCENE.anchors};
    viewport.dispatchEvent(new CustomEvent('roomcamerachange', {detail:viewport.cameraState}));
  }
  function local(event) {
    const rect = viewport.getBoundingClientRect();
    return {x:event.clientX - rect.left, y:event.clientY - rect.top};
  }
  const toWorld = p => ({x:x + (p.x - width / 2) / scale, y:y + (p.y - height / 2) / scale});
  function anchored(anchor, at, nextScale) {
    scale = limit(nextScale, cover()*SCENE.zoom.min, cover()*SCENE.zoom.max);
    x = anchor.x - (at.x - width / 2) / scale;
    y = anchor.y - (at.y - height / 2) / scale;
    draw();
  }
  function pair() {
    const [a,b] = [...pointers.values()];
    return {mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
  }
  function baseline() {
    if (pointers.size > 1) {
      const p = pair();
      pinch = {...p,anchor:toWorld(p.mid),scale};
    } else {
      pinch = null;
      origin = pointers.size ? {...pointers.values().next().value, cameraX:x, cameraY:y} : null;
    }
  }
  function reset() {
    pointers.clear(); pinch = origin = null;
    viewport.classList.remove('is-dragging');
  }
  viewport.addEventListener('pointerdown', event => {
    if(!enabled())return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    keyboard = false;
    if (!pointers.size) blocked = false;
    pointers.set(event.pointerId, local(event));
    // Capture the original hit element so an ordinary tap retains its native link.
    event.target.setPointerCapture?.(event.pointerId);
    if (pointers.size > 1) blocked = true;
    baseline();
  });
  window.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    const p = local(event);
    pointers.set(event.pointerId, p);
    if (pointers.size > 1) {
      const next = pair();
      anchored(pinch.anchor, next.mid, pinch.scale * next.distance / pinch.distance);
      blocked = true;
    } else if (origin) {
      if (Math.hypot(p.x-origin.x,p.y-origin.y) > 5) blocked = true;
      if (blocked) {
        x = origin.cameraX - (p.x-origin.x)/scale;
        y = origin.cameraY - (p.y-origin.y)/scale;
        draw();
      }
    }
    viewport.classList.toggle('is-dragging', blocked);
  }, {passive:false});
  function release(event) {
    if (!pointers.has(event.pointerId)) return;
    if (event.type !== 'pointerup') blocked = true;
    pointers.delete(event.pointerId);
    if (pointers.size) baseline();
    else reset();
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) window.addEventListener(type, release);
  viewport.addEventListener('click', event => {
    if(!enabled())return;
    if (blocked && event.detail !== 0) {event.preventDefault();event.stopImmediatePropagation();}
  }, true);
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('wheel', event => {
    if(!enabled())return;
    event.preventDefault();
    if (pointers.size) return;
    const p = local(event);
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    anchored(toWorld(p), p, scale * 2 ** (-delta * (event.ctrlKey ? .01 : .0022)));
  }, {passive:false});
  document.addEventListener('keydown', () => {keyboard = true;}, true);
  document.addEventListener('pointerdown', () => {keyboard = false;}, true);
  room.addEventListener('focusin', event => {
    const link = event.target.closest('.hotspot');
    if (!link || (!keyboard && !link.matches(':focus-visible'))) return;
    reset();
    const bounds = link.getBBox();
    scale = Math.min(scale, Math.max(cover()*SCENE.zoom.min, Math.min(width/(bounds.width+world.width*.026),height/(bounds.height+world.height*.039))));
    x = bounds.x+bounds.width/2;
    y = bounds.y+bounds.height/2;
    draw();
    // Browsers may scroll overflow containers to reveal an offscreen focused SVG.
    viewport.scrollLeft = viewport.scrollTop = 0;
  });
  room.addEventListener('keydown', event => {
    const pan = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if (pan) {event.preventDefault();x+=pan[0]*80/scale;y+=pan[1]*80/scale;draw();}
    else if (['+','=','-'].includes(event.key)) {event.preventDefault();scale*=event.key==='-'?1/1.2:1.2;draw();}
  });
  function resize() {
    if(!enabled())return;
    const previousCover = width && height ? cover() : 0;
    const zoom = previousCover ? scale/previousCover : SCENE.zoom.initial;
    const rect = viewport.getBoundingClientRect();
    width = Math.max(1,rect.width); height = Math.max(1,rect.height);
    if (!previousCover) {
      const center = width < height ? SCENE.centers.portrait : SCENE.centers.landscape;
      x = world.width*center[0]; y = world.height*center[1];
    }
    reset(); blocked = true;
    scale = cover()*zoom;
    draw();
    viewport.scrollLeft = viewport.scrollTop = 0;
  }
  window.addEventListener('blur', () => {blocked=true;reset();});
  viewport.addEventListener('roomviewchange',()=>{reset();if(enabled())resize();});
  new ResizeObserver(resize).observe(viewport);
  resize();
})();
