(function(root) {
  'use strict';
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const smooth=t=>t*t*t*(t*(t*6-15)+10);
  const wrap=n=>((n%360)+360)%360;
  const delta=(a,b)=>wrap(a-b+180)-180;
  function seedNumber(seed) {
    const text=String(seed);
    let value=2166136261;
    for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);
    return value>>>0;
  }
  // Index-addressed randomness makes seeking and skipped frames deterministic.
  function random(seed,index,channel) {
    let n=(seed^Math.imul(index,0x9e3779b1)^Math.imul(channel,0x85ebca6b))>>>0;
    n=Math.imul(n^(n>>>16),0x7feb352d);
    n=Math.imul(n^(n>>>15),0x846ca68b);
    return ((n^(n>>>16))>>>0)/4294967296;
  }
  function drift(seed,time,period,jitter,channel) {
    let i=Math.floor(time/period);
    let start=i*period+random(seed,i,channel)*jitter;
    if(time<start) {
      i--;
      start=i*period+random(seed,i,channel)*jitter;
    }
    const end=(i+1)*period+random(seed,i+1,channel)*jitter;
    const a=random(seed,i,channel+1)*2-1,b=random(seed,i+1,channel+1)*2-1;
    return a+(b-a)*smooth(clamp((time-start)/(end-start),0,1));
  }
  function pulse(time,duration,closing=.4) {
    if(time<=0 || time>=duration)return 0;
    const t=time/duration;
    return t<closing ? smooth(t/closing) : 1-smooth((t-closing)/(1-closing));
  }
  function limit(value,fallback,maximum) {
    return Number.isFinite(value) ? clamp(value,0,maximum) : fallback;
  }
  /**
   * Head angles and heading are degrees; gaze is normalized; blink/smile are 0..1.
   * Body gait stays with the caller. `moving` is accepted but never clocks faces.
   * Pass active elapsed milliseconds (hold while paused). The returned object is
   * reused: copy it only when retaining a historical sample. No assets are loaded.
   * Optional directions: [{angle: number}] are caller-supplied pose metadata,
   * not evidence of assets. Only actual +/-15-degree neighbors can be selected.
   */
  function create(options={}) {
    const seed=seedNumber(options.seed ?? 1);
    const yaw=limit(options.maxHeadYaw,15,15),tilt=limit(options.maxHeadTilt,3,3);
    const gazeX=limit(options.maxGazeX,.75,1),gazeY=limit(options.maxGazeY,.45,1);
    const angles=Array.isArray(options.directions)
      ? [...new Set(options.directions.filter(d=>Number.isFinite(d?.angle)).map(d=>wrap(d.angle)))]
      : [];
    let reducedMotion=Boolean(options.reducedMotion);
    const result={headYaw:0,headTilt:0,gazeX:0,gazeY:0,blink:0,smile:0,
      poseAngle:null,poseYawOffset:0};
    function evaluateElapsed(ms,moving=false,heading=0) {
      const time=Number.isFinite(ms) ? Math.max(0,ms) : 0;
      result.headYaw=reducedMotion ? 0 : yaw*drift(seed,time,6200,2300,10);
      result.headTilt=reducedMotion ? 0 : tilt*drift(seed,time,7900,2700,20);
      result.gazeX=reducedMotion ? 0 : gazeX*drift(seed,time,4100,1500,30);
      result.gazeY=reducedMotion ? 0 : gazeY*drift(seed,time,5300,1900,40);
      result.blink=0;result.smile=0;
      if(!reducedMotion) {
        // Blink clusters are 3.5..9.5 seconds apart; a double is one cluster.
        const i=Math.floor((time-1000)/6500);
        if(i>=0) {
          const age=time-(1000+i*6500+random(seed,i,50)*3000);
          const duration=120+random(seed,i,51)*90;
          result.blink=pulse(age,duration);
          if(random(seed,i,52)<.22) {
            const second=duration+90+random(seed,i,53)*100;
            result.blink=Math.max(result.blink,pulse(age-second,110+random(seed,i,54)*70));
          }
        }
        const j=Math.floor(time/22000);
        if(random(seed,j,60)<.65) {
          const age=time-(j*22000+2000+random(seed,j,61)*12000);
          result.smile=(.25+random(seed,j,62)*.35)*pulse(age,2200+random(seed,j,63)*2400,.45);
        }
      }
      result.poseAngle=null;result.poseYawOffset=0;
      if(angles.length) {
        const bodyHeading=Number.isFinite(heading) ? wrap(heading) : 0;
        let base=angles[0];
        for(let i=1;i<angles.length;i++) {
          if(Math.abs(delta(angles[i],bodyHeading))<Math.abs(delta(base,bodyHeading)))base=angles[i];
        }
        result.poseAngle=base;
        let error=Math.abs(result.headYaw);
        for(let i=0;i<angles.length;i++) {
          const offset=delta(angles[i],base);
          if(Math.abs(Math.abs(offset)-15)>1e-6)continue;
          const nextError=Math.abs(offset-result.headYaw);
          if(nextError<error) {
            error=nextError;result.poseAngle=angles[i];result.poseYawOffset=offset;
          }
        }
      }
      return result;
    }
    return {evaluateElapsed,evaluateelapsed:evaluateElapsed,
      setReducedMotion(value) { reducedMotion=Boolean(value); }};
  }
  const api={create};
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.AtlasExpressionMotion=api;
})(globalThis);
