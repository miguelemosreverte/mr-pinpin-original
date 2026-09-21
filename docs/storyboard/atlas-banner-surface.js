import {groundDepth, visibility} from './gpu/occlusion.js';
import {miniatureGroundDepth} from './gpu/renderer.js';
import {bannerGroundNormal} from './atlas-banner-projection.js';

const WIDTH=160, HEIGHT=240, LIMIT=1024;
const clamp=value => Math.max(0,Math.min(1,value));
const canvas=(width=1,height=1) => Object.assign(document.createElement('canvas'),{width,height});

// Texture triangles approximate perspective using the same matrices as the native hit targets.
function triangle(ctx,source,uv,xy) {
  const [a,b,c]=uv, [p,q,r]=xy;
  const determinant=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
  if (Math.abs(determinant)<1e-8) return;
  const ax=((q[0]-p[0])*(c[1]-a[1])-(r[0]-p[0])*(b[1]-a[1]))/determinant;
  const ay=((q[1]-p[1])*(c[1]-a[1])-(r[1]-p[1])*(b[1]-a[1]))/determinant;
  const bx=((r[0]-p[0])*(b[0]-a[0])-(q[0]-p[0])*(c[0]-a[0]))/determinant;
  const by=((r[1]-p[1])*(b[0]-a[0])-(q[1]-p[1])*(c[0]-a[0]))/determinant;
  ctx.save(); ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.lineTo(...r); ctx.closePath(); ctx.clip();
  ctx.transform(ax,ay,bx,by,p[0]-ax*a[0]-bx*a[1],p[1]-ay*a[0]-by*a[1]);
  ctx.drawImage(source,0,0); ctx.restore();
}

function paint(ctx,source,object,rect,projection,columns=8,rows=12) {
  const sw=source.naturalWidth || source.width, sh=source.naturalHeight || source.height;
  const points=[],pixels=[],stride=columns+1;
  for (let y=0;y<=rows;y++) for (let x=0;x<=columns;x++) {
    const u=x/columns,v=y/rows;
    points.push(projection.sample(object,rect.x+u*rect.width,rect.y-v*rect.height));
    pixels.push([u*sw,v*sh]);
  }
  for (let y=0;y<rows;y++) for (let x=0;x<columns;x++) {
    const a=y*stride+x,b=a+1,c=b+stride,d=a+stride;
    triangle(ctx,source,[pixels[a],pixels[b],pixels[c]],[points[a],points[b],points[c]]);
    triangle(ctx,source,[pixels[a],pixels[c],pixels[d]],[points[a],points[c],points[d]]);
  }
}

function imageRect(image) {
  const scale=Math.min(WIDTH/image.naturalWidth,HEIGHT/image.naturalHeight);
  const width=image.naturalWidth*scale, height=image.naturalHeight*scale;
  return {x:-width/2,y:-HEIGHT/2+height,width,height};
}

export function createBannerSurface(projection,{worldWidth=1536,worldHeight=1024,routes=[]}={}) {
  const layer={canvas:canvas(),depthCanvas:canvas(),revision:0,ready:false};
  const color=layer.canvas.getContext('2d'), depth=layer.depthCanvas.getContext('2d');
  const ring=canvas(96,96), dot=canvas(24,24), alphaCanvas=canvas(10,15);
  const ringContext=ring.getContext('2d'), dotContext=dot.getContext('2d');
  ringContext.beginPath(); ringContext.arc(48,48,46,0,Math.PI*2);
  ringContext.fillStyle='#ffffff0a'; ringContext.fill(); ringContext.lineWidth=4;
  ringContext.strokeStyle='#fff'; ringContext.stroke();
  dotContext.fillStyle='#fff'; dotContext.beginPath(); dotContext.arc(12,12,12,0,Math.PI*2); dotContext.fill();
  const alphaContext=alphaCanvas.getContext('2d',{willReadFrequently:true}), masks=new WeakMap();
  let sampler=null, generation=0, signature=null;

  function sampleDepth(x,y) {
    const value=sampler?.depth?.(x,y);
    return Number.isFinite(value) ? clamp(value) : null;
  }
  function sceneDepth(x,y) {
    // Match world.wgsl's 3x3 filter, spaced two depth texels apart.
    const [stepX,stepY]=sampler?.depthStep || [2,2];
    let sum=0, count=0;
    for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
      const value=sampleDepth(x+dx*stepX,y+dy*stepY);
      if (value!==null) { sum+=value; count++; }
    }
    return count ? sum/count : null;
  }
  function clearsRoads(foot,radius) {
    if (!routes.length) return false;
    for (const route of routes) for (let i=1;i<route.points.length;i++) {
      const a=route.points[i-1].map((v,j)=>v*(j ? worldHeight : worldWidth));
      const b=route.points[i].map((v,j)=>v*(j ? worldHeight : worldWidth));
      const dx=b[0]-a[0], dy=b[1]-a[1];
      const t=clamp(((foot[0]-a[0])*dx+(foot[1]-a[1])*dy)/(dx*dx+dy*dy || 1));
      if (Math.hypot(foot[0]-a[0]-t*dx,foot[1]-a[1]-t*dy)<=radius+6) return false;
    }
    return true;
  }
  function surfaceNormal(x,y,tilt) {
    const samples=[];
    for (const dy of [-12,-6,0,6,12]) for (const dx of [-12,-6,0,6,12]) {
      samples.push(sampler?.normal?.(x+dx,y+dy));
    }
    return bannerGroundNormal(samples,tilt);
  }
  function mask(image) {
    const key=[image.currentSrc,image.naturalWidth,image.naturalHeight].join(':');
    if (masks.get(image)?.key===key) return masks.get(image).data;
    alphaContext.clearRect(0,0,10,15);
    alphaContext.drawImage(image,0,0,10,15);
    const data=alphaContext.getImageData(0,0,10,15).data;
    masks.set(image,{key,data}); return data;
  }
  function score(entry,origin,view,objectDepth) {
    const rect=imageRect(entry.image), data=mask(entry.image);
    let visible=0, total=0;
    for (let y=0;y<15;y++) for (let x=0;x<10;x++) {
      const weight=data[(y*10+x)*4+3]/255;
      if (!weight) continue;
      const p=projection.sample(entry.object.cover,rect.x+(x+.5)/10*rect.width,rect.y-(y+.5)/15*rect.height);
      total+=weight;
      if (p[0]<0 || p[1]<0 || p[0]>=view.width || p[1]>=view.height) continue;
      const scene=sceneDepth((p[0]-origin[0])/view.scale,(p[1]-origin[1])/view.scale);
      visible+=weight*(scene===null ? 1 : visibility(scene,Math.round(objectDepth*255)/255));
    }
    return total ? visible/total : 1;
  }
  function resolve(entry,anchor,view,origin) {
    const authored=entry.placement;
    const foot=[authored.anchor[0]*worldWidth+authored.offset[0],authored.anchor[1]*worldHeight+authored.offset[1]];
    entry.objectDepth=groundDepth(foot[1]);
    entry.lensDepth=miniatureGroundDepth(foot[1]);
    // Visibility includes viewport clipping, so a changed camera anchor must invalidate the search.
    const key=JSON.stringify([authored,anchor,view.scale,view.openingScale,view.width,view.height,generation,
      sampler?.revision,entry.image.currentSrc,entry.image.naturalWidth,entry.image.naturalHeight]);
    if (entry.surfaceKey===key) return entry.surfacePlacement;
    const base={...authored,ground:{...authored.ground,normal:surfaceNormal(...foot,authored.ground.tilt)}};
    let best=base, bestScore=-1;
    if (sampler?.depth && entry.image.complete && entry.image.naturalWidth) {
      // Elevate over foreground while retaining the road-safe, authored footprint.
      for (const lift of [0,12,24,40,56,72,88,104,128,176,224]) {
        const candidate={...base,elevation:base.elevation+lift};
        projection.place(entry.object,candidate,anchor,view,true);
        const value=score(entry,origin,view,entry.objectDepth);
        if (value>bestScore+.002) { best=candidate; bestScore=value; }
        if (value>=.9) break;
      }
      // Only search nearby road-safe horizontal positions if elevation cannot reach 90%.
      // Keeping foot Y unchanged also keeps the calibrated occlusion depth unchanged.
      const elevations=[...new Set([best.elevation,base.elevation,base.elevation+24,base.elevation+56])];
      for (const shift of [-12,12,-24,24]) {
        if (bestScore>=.9) break;
        const movedFoot=[foot[0]+shift,foot[1]];
        if (!clearsRoads(movedFoot,base.ground.radius)) continue;
        const ground={...base.ground,normal:surfaceNormal(...movedFoot,base.ground.tilt)};
        for (const elevation of elevations) {
          const candidate={...base,offset:[base.offset[0]+shift,base.offset[1]],elevation,ground};
          projection.place(entry.object,candidate,anchor,view,true);
          const value=score(entry,origin,view,entry.objectDepth);
          if (value>bestScore+.002) { best=candidate; bestScore=value; }
          if (value>=.9) break;
        }
      }
    }
    entry.surfaceKey=key; entry.surfacePlacement=best;
    entry.surfaceVisibility=bestScore<0 ? null : bestScore;
    entry.surfaceVisibilitySatisfied=bestScore<0 ? null : bestScore>=.8;
    return best;
  }

  function render(entries,view) {
    const active=entries.filter(entry => entry.object.cover.visible);
    const next=JSON.stringify([view.width,view.height,active.map(entry => [entry.id,entry.object.signature,
      entry.image.currentSrc,entry.image.naturalWidth,entry.image.naturalHeight,entry.imageRevision,entry.objectDepth])]);
    if (next===signature) return false;
    signature=next;
    const ratio=Math.min(1,LIMIT/Math.max(view.width,view.height));
    const width=Math.max(1,Math.round(view.width*ratio)), height=Math.max(1,Math.round(view.height*ratio));
    for (const target of [layer.canvas,layer.depthCanvas]) {
      if (target.width!==width) target.width=width;
      if (target.height!==height) target.height=height;
    }
    color.clearRect(0,0,width,height); depth.clearRect(0,0,width,height);
    color.save(); color.scale(width/view.width,height/view.height);
    for (const entry of active) {
      const {object,image}=entry;
      if (!image.complete || !image.naturalWidth) continue;
      if (object.ring.visible) paint(color,ring,object.ring,{x:-24,y:24,width:48,height:48},projection,4,4);
      for (const item of object.dots) if (item.visible) paint(color,dot,item,{x:-3,y:3,width:6,height:6},projection,1,1);
      paint(color,image,object.cover,imageRect(image),projection);
    }
    color.restore();
    // Only one cover is selected. Its cover, dots and ring share the calibrated foot depth.
    depth.drawImage(layer.canvas,0,0);
    depth.globalCompositeOperation='source-in';
    const value=Math.round(clamp(active[0]?.objectDepth ?? 0)*255);
    depth.fillStyle=`rgb(${value},${value},${value})`; depth.fillRect(0,0,width,height);
    depth.globalCompositeOperation='source-over';
    layer.lensDepth=active[0]?.lensDepth;
    layer.ready=active.every(entry => entry.image.complete && entry.image.naturalWidth>0);
    layer.revision++; return true;
  }
  return {layer,resolve,render,
    setSampler(value) { sampler=value; generation++; signature=null; },
    destroy() { layer.ready=false; layer.revision++; layer.canvas.width=layer.depthCanvas.width=1; }
  };
}
