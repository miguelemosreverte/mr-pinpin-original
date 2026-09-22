// Offline bounds for crisp heading hysteresis, plus the legacy blend comparison.
const TRACTOR_BODY_MARGIN=6;
const SPRITE_UPDATE_TRAVEL=2.2; // 44 map px/s during a 50ms sprite update interval.

function blendedDirections(metadata,heading) {
  const angle=((Math.round(heading/3.75)*3.75)%360+360)%360;
  const directions=metadata.directions.filter(d=>d.angle%30===0).slice().sort((a,b)=>a.angle-b.angle);
  const lower=directions.filter(d=>d.angle<=angle).at(-1)||directions.at(-1);
  const upper=directions.find(d=>d.angle>angle)||directions[0];
  // Including the zero-weight upper bin at exact headings is conservative.
  return [lower,upper];
}

function crispDirections(metadata,heading) {
  const angle=(heading%360+360)%360;
  const distance=d=>Math.abs(((angle-d.angle+540)%360)-180);
  const nearest=Math.min(...metadata.directions.map(distance));
  return metadata.directions.filter(d=>distance(d)<=nearest+4);
}

function spriteCorners(metadata,heading) {
  const extent={left:0,right:0,up:0,down:0};
  const directions=heading===undefined?metadata.directions:crispDirections(metadata,heading);
  for(const direction of directions) for(const frame of direction.frames) {
    const scale=metadata.displayWidth/direction.referenceWidth;
    extent.left=Math.max(extent.left,frame.anchor[0]*scale);
    extent.right=Math.max(extent.right,(frame.rect[2]-frame.anchor[0])*scale);
    extent.up=Math.max(extent.up,frame.anchor[1]*scale);
    extent.down=Math.max(extent.down,(frame.rect[3]-frame.anchor[1])*scale);
  }
  return [[-extent.left,-extent.up],[extent.right,-extent.up],
    [extent.right,extent.down],[-extent.left,extent.down]];
}

module.exports={blendedDirections,crispDirections,spriteCorners,TRACTOR_BODY_MARGIN,SPRITE_UPDATE_TRAVEL};
