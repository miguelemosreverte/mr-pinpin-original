const root='storyboard/production/story-worlds-20260924/tractor/';
export const ORBIT='storyboard/production/tractor-orbit-20260924/orbit-scrub-v1.mp4';
// One approximate anchor now; future additions require actual reviewed panoramas.
export const STOPS=[{id:'tractor',label:'Tractor viewpoint',time:0,ready:true,asset:root+'panorama-v2.png',frame:'storyboard/production/tractor-orbit-20260924/start-v1.png',prompt:root+'prompt-v2.txt',record:root+'generation-v2.json',face:{yaw:-105*Math.PI/180,pitch:-5*Math.PI/180,fov:75},repairs:{fov:110,frontMask:[0,0,2,2],assets:{rear:root+'rear-v2.png',up:root+'up-v2.png',down:root+'down-v2.png'}}}];
