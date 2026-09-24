export const PACK='storyboard/production/tractor-stops-20260924/';
export const FRAME_MANIFEST=PACK+'frames-manifest.json';
export const ORBIT='storyboard/production/tractor-orbit-20260924/orbit-scrub-v1.mp4';
// Only actual selected media belong here. Frame extraction alone is not readiness.
export const PANORAMAS={'stop-04':{
  label:'Calibrated panorama trial',
  asset:PACK+'pilot/fov-correction/panorama-repaired-v4.png',
  forward:PACK+'pilot/fov-correction/v4-fit-raw/fitted-view.png',
  prompt:PACK+'pilot/fov-correction/repair-v4-prompt.txt',
  record:PACK+'pilot/fov-correction/repair-v4-generation.json',
  face:{yaw:0.003557808640356198,pitch:0.0009270482291129821,fov:65.41537697357725},
  repairs:{fov:110,frontMask:[0,0,2,2],assets:{rear:PACK+'pilot/fov-correction/rear-v4-repair.png'}}
}};
export const RESTORATIONS={'stop-04':{asset:PACK+'pilot/restored-v1.png',prompt:PACK+'pilot/restore-prompt.txt'}};
