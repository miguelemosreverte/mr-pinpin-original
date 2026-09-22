// Preview calibration; UV coordinates refer to the selected full spherical image.
const uv=points=>points.map(([x,y])=>[x/1774,y/887]);
export const PANORAMA=Object.freeze({
 asset:'storyboard/images/house-menu/room-panorama-v3.webp',
 repairs:{fov:110,frontMask:[.102,-.028,.075,.075],assets:{front:'storyboard/images/house-menu/room-cube-front-v1.webp',rear:'storyboard/images/house-menu/room-cube-rear-v1.webp',up:'storyboard/images/house-menu/room-cube-up-v1.webp',down:'storyboard/images/house-menu/room-cube-down-v1.webp'}},
 yaw:(890/1774-.5)*Math.PI*2,pitch:0,fov:72,minFov:40,maxFov:90,maxPitch:65,
 hotspots:[
  {id:'door',source:'door-link',anchor:[885/1774,440/887],polygon:uv([[825,543],[825,400],[830,380],[839,365],[851,354],[864,346],[878,342],[891,344],[906,350],[922,362],[932,327],[944,312],[952,315],[955,333],[955,562],[918,548]])},
  {id:'bookcase',source:'bookcase-link',anchor:[1414/1774,443/887],polygon:uv([[1327,584],[1327,336],[1336,316],[1354,308],[1458,295],[1479,300],[1496,313],[1506,335],[1506,589],[1478,596]])}
 ]
});
