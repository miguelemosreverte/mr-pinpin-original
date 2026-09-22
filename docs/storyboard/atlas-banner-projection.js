import {Group, PerspectiveCamera, Scene, Vector3} from './vendor/three/three.core.min.js';
import {CSS3DObject, CSS3DRenderer} from './vendor/three/CSS3DRenderer.js';

const WIDTH=160, HEIGHT=240, DISTANCE=900, radians=Math.PI/180;
const number=(value,fallback,min,max) => Number.isFinite(value) ? Math.min(max,Math.max(min,value)) : fallback;
const tuple=(value,fallback,min,max) => fallback.map((n,i) => number(value?.[i],n,min,max));

// V2's arbitrary depth scale makes its base-plane slope 0.75 * 0.65.
// Rescale tangent slopes into the authored ground perspective, without another rotation.
export function bannerGroundNormal(samples,tilt) {
  const sourceSlope=.75*.65, targetSlope=Math.tan(tilt*radians);
  const slopes=samples.filter(n => n?.length===3 && Array.from(n).every(Number.isFinite) && n[2]>1e-6)
    .map(n => [n[0]/n[2],n[1]/n[2]])
    .filter(([x,y]) => Math.abs(x)<.6 && y>0 && Math.abs(y-sourceSlope)<.6);
  // A compact neighborhood can include a crane, shrub or silhouette. Prefer ground-like samples.
  slopes.sort((a,b) => Math.hypot(a[0],a[1]-sourceSlope)-Math.hypot(b[0],b[1]-sourceSlope));
  const ground=slopes.slice(0,Math.max(1,Math.ceil(slopes.length/2)));
  const average=ground.length ? ground.reduce((sum,n)=>[sum[0]+n[0]/ground.length,sum[1]+n[1]/ground.length],[0,0]) : [0,sourceSlope];
  const normal=[average[0]*targetSlope/sourceSlope,average[1]*targetSlope/sourceSlope,1];
  const length=Math.hypot(...normal);
  return normal.map(value=>value/length);
}

export function bannerPlacement(document,id,center) {
  const value=document?.schemaVersion===1 ? document.placements?.[id] : null;
  return {
    anchor:tuple(value?.anchor,center,0,1), offset:tuple(value?.offset,[0,0],-4096,4096),
    elevation:number(value?.elevation,64,12,2048), rotation:tuple(value?.rotation,[0,0,0],-75,75),
    scale:number(value?.scale,1,.25,4),
    ground:{radius:number(value?.ground?.radius,24,4,256),tilt:number(value?.ground?.tilt,65,0,85)},
    dots:value?.dots===2 ? 2 : 3
  };
}

export function createBannerProjection(root) {
  const scene=new Scene(), camera=new PerspectiveCamera(45,1,1,10000);
  const renderer=new CSS3DRenderer(), point=new Vector3(), forward=new Vector3(0,0,1), normal=new Vector3();
  renderer.domElement.className='atlas-banner-scene';
  root.classList.add('atlas-banner-overlay'); root.append(renderer.domElement);
  camera.position.z=DISTANCE; camera.updateMatrixWorld();
  let width=0, height=0, dirty=true;

  function add(button) {
    const group=new Group(), pivot=new Group(), cover=new CSS3DObject(button);
    const ringElement=document.createElement('div');
    ringElement.className='atlas-banner-ground'; ringElement.setAttribute('aria-hidden','true');
    const ring=new CSS3DObject(ringElement), dots=[];
    ringElement.style.pointerEvents='none';
    cover.position.y=HEIGHT/2; pivot.add(cover); group.add(pivot,ring);
    for (let i=0;i<3;i++) {
      const element=document.createElement('div');
      element.className='atlas-banner-dot'; element.setAttribute('aria-hidden','true');
      const dot=new CSS3DObject(element); element.style.pointerEvents='none';
      group.add(dot); dots.push(dot);
    }
    for (const object of [cover,ring,...dots]) {
      object.visible=false; object.element.hidden=true;
      renderer.domElement.append(object.element);
    }
    scene.add(group); dirty=true;
    return {group,pivot,cover,ring,dots,signature:null};
  }

  function resize(nextWidth,nextHeight) {
    if (nextWidth===width && nextHeight===height) return;
    width=nextWidth; height=nextHeight;
    renderer.setSize(width,height);
    camera.aspect=width/height;
    camera.fov=2*Math.atan(height/(2*DISTANCE))/radians;
    camera.updateProjectionMatrix(); dirty=true;
  }

  function bounds(item) {
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity,near=false;
    item.group.updateMatrixWorld(true);
    const include=(object,x,y) => {
      point.set(x,y,0).applyMatrix4(object.matrixWorld);
      if (point.z>=DISTANCE-1) near=true;
      point.project(camera);
      const sx=(point.x+1)*width/2, sy=(1-point.y)*height/2;
      left=Math.min(left,sx); right=Math.max(right,sx); top=Math.min(top,sy); bottom=Math.max(bottom,sy);
    };
    for (const x of [-WIDTH/2,WIDTH/2]) for (const y of [-HEIGHT/2,HEIGHT/2]) include(item.cover,x,y);
    // The ring's containing square conservatively bounds its perspective ellipse.
    for (const x of [-24,24]) for (const y of [-24,24]) include(item.ring,x,y);
    for (const dot of item.dots) if (dot.visible) {
      for (const x of [-3,3]) for (const y of [-3,3]) include(dot,x,y);
    }
    return {left:left-4,top:top-4,right:right+4,bottom:bottom+4,near};
  }

  function place(item,placement,anchor,view,visible) {
    const {scale,openingScale}=view;
    const signature=JSON.stringify([anchor,width,height,scale,openingScale,placement,visible]);
    if (signature===item.signature) return item.bounds;
    item.signature=signature; dirty=true;
    if (!visible) {
      for (const object of [item.cover,item.ring,...item.dots]) {
        object.visible=false;
        if (!object.element.hidden) object.element.hidden=true;
      }
      return item.bounds;
    }
    const zoom=Math.max(.3,scale/openingScale)*placement.scale;
    const gap=placement.elevation*scale/zoom, radius=placement.ground.radius*scale/zoom;
    item.group.position.set(anchor[0]+placement.offset[0]*scale-width/2,
      height/2-anchor[1]-placement.offset[1]*scale,0);
    item.pivot.position.y=gap;
    item.pivot.rotation.set(...placement.rotation.map(angle => angle*radians));
    item.ring.scale.setScalar(radius/24);
    if (placement.ground.normal?.length===3 && placement.ground.normal.every(Number.isFinite) &&
      Math.hypot(...placement.ground.normal)>0) {
      normal.set(...placement.ground.normal).normalize();
      item.ring.quaternion.setFromUnitVectors(forward,normal);
    } else item.ring.rotation.set(-placement.ground.tilt*radians,0,0);
    item.dots.forEach((dot,i) => {
      dot.visible=i<placement.dots;
      dot.position.y=gap*(i+1)/(placement.dots+1);
    });
    item.group.scale.setScalar(zoom);
    let box=bounds(item);
    const fits=value => !value.near && value.right-value.left<=Math.max(1,width-16) && value.bottom-value.top<=Math.max(1,height-16);
    if (!fits(box)) {
      let low=0,high=zoom;
      for (let i=0;i<18;i++) {
        const middle=(low+high)/2;
        item.group.scale.setScalar(middle);
        if (fits(bounds(item))) low=middle; else high=middle;
      }
      item.group.scale.setScalar(low); box=bounds(item);
    }
    const offscreen=box.right<=0 || box.bottom<=0 || box.left>=width || box.top>=height;
    const show=visible && !offscreen;
    // CSS3DRenderer visits descendants of invisible groups; set each DOM object's visibility.
    item.cover.visible=show;
    if (item.cover.element.hidden!==!show) item.cover.element.hidden=!show;
    item.ring.visible=show;
    if (item.ring.element.hidden!==!show) item.ring.element.hidden=!show;
    item.dots.forEach((dot,i) => {
      dot.visible=show && i<placement.dots;
      if (dot.element.hidden!==!dot.visible) dot.element.hidden=!dot.visible;
    });
    item.bounds=box;
    return box;
  }

  return {
    add,resize,place,
    // Local coordinates use CSS pixels with Y up, exactly as CSS3DObject does.
    sample(object,x,y) {
      // place() updates the complete group in bounds(); raster samples share those matrices.
      point.set(x,y,0).applyMatrix4(object.matrixWorld).project(camera);
      return [(point.x+1)*width/2,(1-point.y)*height/2];
    },
    render() { if (dirty) { renderer.render(scene,camera); dirty=false; } },
    destroy() { renderer.domElement.remove(); scene.clear(); }
  };
}
