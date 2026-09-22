import * as THREE from 'three';

export function createStudioEnvironment(renderer) {
  const studio=new THREE.Scene();
  studio.background=new THREE.Color().setRGB(.10,.12,.13);
  const geometry=new THREE.PlaneGeometry(1,1),materials=[];
  // Blender Z-up studio positions mapped into the GLB's Y-up coordinates.
  for(const [position,size,color,power] of [
    [[-3.5,6,4.5],[4,3],[1,.93,.83],6],
    [[4,3.3,2.8],[3.5,2.5],[.84,.91,1],4],
    [[.5,5,-4],[3,2],[1,.93,.85],5],
    [[0,.3,6],[6,2],[1,.96,.9],8],
  ]) {
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(...color).multiplyScalar(power),side:THREE.DoubleSide});
    materials.push(material);
    const panel=new THREE.Mesh(geometry,material);
    panel.position.set(...position);panel.scale.set(...size,1);panel.lookAt(0,0,0);studio.add(panel);
  }
  const generator=new THREE.PMREMGenerator(renderer);
  try {return generator.fromScene(studio,0,.1,30);}
  finally {generator.dispose();geometry.dispose();materials.forEach(material=>material.dispose());studio.clear();}
}
