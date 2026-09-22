import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStudioEnvironment} from './pinpin-studio.js';

const canvas=document.getElementById('model-view');
const status=document.getElementById('status');
const rotate=document.getElementById('rotate');
const parameters=new URLSearchParams(location.search);
const requestedModel=parameters.get('model');
const modelVersion=['v1','v2','v3'].includes(requestedModel) ? requestedModel : 'v1';
const modelLabel={v1:'Trellis singleview',v2:'Tripo multiview',v3:'Blender procedural study'}[modelVersion];
const isBlender=modelVersion==='v3';
const revision=parameters.get('rev');
const assetUrl=new URL(`../models/pinpin-${modelVersion}/model.glb`,import.meta.url);
if(isBlender && revision)assetUrl.searchParams.set('rev',revision);
const modelUrl=assetUrl.href;
if(isBlender) {
  const review=document.createElement('a'),url=new URL('pinpin-blender.html',location.href);
  if(revision)url.searchParams.set('rev',revision);
  review.href=url.href;review.textContent='Blender review';review.style.cssText='pointer-events:auto;color:inherit;display:inline-block;padding:8px 0';
  document.getElementById('model-label').after(review);
}
document.getElementById('model-label').textContent=modelLabel;
document.title=`Mr. PinPin / ${modelLabel}`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const stats=window.__pinpin3D={loaded:false,loading:true,meshes:0,triangles:0,bounds:null,
  modelUrl,modelVersion,modelLabel,error:null,frames:0,autoRotate:false,animationsPlayed:0,threeRevision:THREE.REVISION};

function message(text,state='loading') {status.textContent=text;status.dataset.state=state;}
function fail(error) {
  stats.loading=false;stats.loaded=false;stats.error=String(error?.message || error);
  rotate.disabled=true;
  message(error?.response?.status===404 ? 'Model not available yet' : 'Model could not be loaded','error');
}

function start() {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=isBlender ? .85 : .9;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#d7dfd9');
  scene.fog=new THREE.Fog('#d7dfd9',10,28);
  let environment=isBlender ? createStudioEnvironment(renderer) : null;
  if(environment) {scene.environment=environment.texture;scene.environmentIntensity=.65;}
  stats.studioEnvironment=isBlender;stats.revision=isBlender ? revision : null;
  const camera=new THREE.PerspectiveCamera(36,1,.01,100);
  if(isBlender)camera.position.set(5.7,2.5,4);
  else camera.position.set(4,2.5,5);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.08;
  controls.enablePan=false;controls.minPolarAngle=.035;controls.maxPolarAngle=Math.PI-.035;
  controls.autoRotate=false;controls.autoRotateSpeed=.8;
  controls.target.set(0,1,0);controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff,0x738475,isBlender ? 1 : 1.8));
  const key=new THREE.DirectionalLight(0xfff7ec,isBlender ? 1.8 : 2.5);
  key.position.set(-3,6,4);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00015;key.shadow.normalBias=.015;
  Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:18});
  key.shadow.camera.updateProjectionMatrix();scene.add(key);
  const fill=new THREE.DirectionalLight(0xe9f3ff,isBlender ? .6 : 1);fill.position.set(4,3,-3);scene.add(fill);
  const undersideFill=new THREE.DirectionalLight(0xf1f4f0,isBlender ? .4 : .6);undersideFill.position.set(1,-4,2);scene.add(undersideFill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xd7dfd9,roughness:.95,metalness:0}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);

  let sphere=null,previousTime=null,framedDistance=6,framingProfile=[],framingCorners=[];
  function studioDistance(direction,orbit=true) {
    const {height,top}=canvas.getBoundingClientRect();
    const headerBottom=document.querySelector('#studio header').getBoundingClientRect().bottom-top;
    const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    // Reserve 10% total screen margin, plus the header above the model.
    const topLimit=Math.max(.05,Math.min(.9,1-2*(headerBottom/height+.05)));
    const horizontal=vertical*camera.aspect*.9,upper=vertical*topLimit,lower=vertical*.9;
    const sin=direction.y,cos=Math.sqrt(Math.max(0,1-sin*sin));
    let distance=0;
    if(!orbit) {
      const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize();
      const up=new THREE.Vector3().crossVectors(direction,right);
      for(const corner of framingCorners) {
        const depth=corner.dot(direction),x=corner.dot(right),y=corner.dot(up);
        distance=Math.max(distance,depth+Math.abs(x)/horizontal,depth+y/upper,depth-y/lower);
      }
    }
    else for(const {radius,minY,maxY} of framingProfile) {
      const support=coefficient=>coefficient*(coefficient>=0 ? maxY : minY);
      // Exact worst azimuth of each radial/height envelope, including perspective depth.
      distance=Math.max(distance,
        radius*Math.hypot(cos,1/horizontal)+support(sin),
        radius*Math.abs(cos-sin/upper)+support(sin+cos/upper),
        radius*Math.abs(cos+sin/lower)+support(sin-cos/lower));
    }
    stats.framing={method:orbit ? 'mesh-orbit-envelope' : 'projected-box-corners',distance,marginFraction:.1,topLimit,headerBottom};
    return distance;
  }
  function fit() {
    if(!sphere)return;
    const halfVertical=THREE.MathUtils.degToRad(camera.fov/2);
    const halfHorizontal=Math.atan(Math.tan(halfVertical)*camera.aspect);
    const direction=camera.position.clone().sub(controls.target).normalize();
    const distance=isBlender ? studioDistance(direction) : sphere.radius/Math.sin(Math.min(halfVertical,halfHorizontal))*1.15;
    framedDistance=distance;
    controls.target.copy(sphere.center);camera.position.copy(sphere.center).addScaledVector(direction,distance);
    camera.near=Math.max(.001,sphere.radius/100);camera.far=Math.max(100,distance+sphere.radius*30);
    camera.updateProjectionMatrix();controls.minDistance=sphere.radius*.65;controls.maxDistance=Math.max(distance*3,sphere.radius*12);
    controls.update();controls.saveState();
  }
  function resize() {
    const {width,height}=canvas.getBoundingClientRect();if(!width || !height)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,2));renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();fit();
    stats.viewport={width,height,pixelRatio:renderer.getPixelRatio()};
  }
  function draw(time) {
    const delta=previousTime===null ? 0 : Math.min((time-previousTime)/1000,.05);previousTime=time;
    controls.update(delta);floor.visible=camera.position.y>=controls.target.y;
    stats.floorVisible=floor.visible;renderer.render(scene,camera);stats.frames++;
    stats.camera={position:camera.position.toArray(),target:controls.target.toArray(),distance:camera.position.distanceTo(controls.target)};
  }
  function loop() {previousTime=null;renderer.setAnimationLoop(document.hidden ? null : draw);}
  function rotation(value) {
    controls.autoRotate=value;stats.autoRotate=value;rotate.setAttribute('aria-pressed',String(value));
    rotate.title=value ? 'Stop automatic rotation' : 'Start automatic rotation';rotate.setAttribute('aria-label',rotate.title);
  }
  stats.viewAxes={front:'+Z',rear:'-Z',left:'-X',right:'+X',underside:'-Y'};
  stats.setView=name=>{
    const directions={front:[0,.08,1],rear:[0,.08,-1],left:[-1,.08,0],right:[1,.08,0],underside:[0,-1,.001]};
    if(!sphere || !directions[name])return false;
    rotation(false);
    const damping=controls.enableDamping;controls.enableDamping=false;controls.update();
    const direction=new THREE.Vector3(...directions[name]).normalize();
    controls.target.copy(sphere.center);camera.position.copy(sphere.center).addScaledVector(direction,isBlender ? studioDistance(direction,false) : framedDistance);
    controls.update();controls.enableDamping=damping;draw(performance.now());return true;
  };
  rotate.addEventListener('click',()=>rotation(!controls.autoRotate));
  reduced.addEventListener('change',event=>{if(event.matches)rotation(false);});
  document.addEventListener('visibilitychange',loop);
  addEventListener('pagehide',event=>{
    renderer.setAnimationLoop(null);
    if(!event.persisted) {scene.environment=null;environment?.dispose();environment=null;}
  });
  addEventListener('pageshow',event=>{if(event.persisted)loop();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stats.error='Graphics context lost';message(stats.error,'error');});
  canvas.addEventListener('webglcontextrestored',()=>{
    if(isBlender) {environment?.dispose();environment=createStudioEnvironment(renderer);scene.environment=environment.texture;}
    stats.error=null;message(stats.loaded ? '' : 'Loading model',stats.loaded ? 'ready' : 'loading');resize();
  });
  new ResizeObserver(resize).observe(canvas);resize();loop();window.lucide?.createIcons();

  new GLTFLoader().loadAsync(modelUrl).then(gltf=>{
    const model=gltf.scene;if(!model)throw Error('GLB has no default scene');
    let meshes=0,triangles=0;
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    if(bounds.isEmpty() || ![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite) || size.length()<=0)throw Error('GLB bounds are empty or invalid');
    model.traverse(object=>{
      if(!object.isMesh)return;meshes++;object.castShadow=true;object.receiveShadow=true;
      const geometry=object.geometry,count=geometry.index?.count || geometry.attributes.position?.count || 0;
      const available=Math.max(0,Math.min(count-geometry.drawRange.start,geometry.drawRange.count));
      triangles+=Math.floor(available/3)*(object.isInstancedMesh ? object.count : 1);
      for(const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if(material?.map)material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      }
    });
    if(!meshes || !triangles)throw Error('GLB contains no triangle meshes');

    // Normalize through a parent transform; keep the supplied mesh and materials intact.
    const wrapper=new THREE.Group(),scale=2.4/Math.max(size.x,size.y,size.z);
    wrapper.add(model);wrapper.scale.setScalar(scale);wrapper.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);scene.add(wrapper);wrapper.updateMatrixWorld(true);
    const displayedBounds=new THREE.Box3().setFromObject(wrapper,true);sphere=displayedBounds.getBoundingSphere(new THREE.Sphere());
    if(isBlender) {
      for(const x of [displayedBounds.min.x,displayedBounds.max.x])
        for(const y of [displayedBounds.min.y,displayedBounds.max.y])
          for(const z of [displayedBounds.min.z,displayedBounds.max.z])
            framingCorners.push(new THREE.Vector3(x,y,z).sub(sphere.center));
      const bins=Array.from({length:64},()=>({radius:0,minY:Infinity,maxY:-Infinity}));
      const point=new THREE.Vector3(),matrix=new THREE.Matrix4(),instance=new THREE.Matrix4();
      const height=displayedBounds.max.y-displayedBounds.min.y;
      wrapper.traverse(object=>{
        if(!object.isMesh)return;
        const positions=object.geometry.attributes.position;
        for(let copy=0;copy<(object.isInstancedMesh ? object.count : 1);copy++) {
          matrix.copy(object.matrixWorld);
          if(object.isInstancedMesh) {object.getMatrixAt(copy,instance);matrix.multiply(instance);}
          for(let index=0;index<positions.count;index++) {
            point.fromBufferAttribute(positions,index).applyMatrix4(matrix);
            const bin=bins[Math.min(63,Math.max(0,Math.floor((point.y-displayedBounds.min.y)/height*64)))];
            point.sub(sphere.center);
            bin.radius=Math.max(bin.radius,Math.hypot(point.x,point.z));
            bin.minY=Math.min(bin.minY,point.y);bin.maxY=Math.max(bin.maxY,point.y);
          }
        }
      });
      framingProfile=bins.filter(bin=>Number.isFinite(bin.minY));
    }
    stats.meshes=meshes;stats.triangles=triangles;
    stats.bounds={min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray(),center:center.toArray()};
    stats.displayedBounds={min:displayedBounds.min.toArray(),max:displayedBounds.max.toArray()};
    stats.animationsAvailable=gltf.animations.length;
    fit();stats.loaded=true;stats.loading=false;stats.error=null;rotate.disabled=false;rotation(!reduced.matches);message('','ready');
  }).catch(fail);
}

try {start();} catch(error) {fail(error);message('3D graphics unavailable','error');}
