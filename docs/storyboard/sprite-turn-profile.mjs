export const frameIndices=[0,6,12,18,23];
export function validateProfile(profile,sha,id='turn') {
  if(!profile || !/^[a-f0-9]{64}$/.test(sha || '') || profile.sheetSha256!==sha)
    throw Error('Missing or mismatched turn profile: '+id);
  if(!['low','medium'].includes(profile.confidence)||typeof profile.notes!=='string'||
    !Array.isArray(profile.samples)||profile.samples.length!==5)throw Error('Invalid turn profile: '+id);
  profile.samples.forEach((s,i)=>{
    if(s.frame!==frameIndices[i]||!Number.isFinite(s.tMs)||Math.abs(s.tMs-s.frame*1000/24)>1e-6||
      !Number.isFinite(s.vx)||!Number.isFinite(s.vy)||typeof s.reason!=='string'||!s.reason.trim())
      throw Error('Invalid velocity knot: '+id+' / '+i);
  });
  return profile;
}
export function validateProfiles(data,manifest) {
  if(data?.version!==1||data.method!=='visual-estimate-five-frame'||data.baseWalkSpeed!==44||
    JSON.stringify(data.frameIndices)!==JSON.stringify(frameIndices))throw Error('Invalid profile metadata');
  const ids=[];
  for(let h=0;h<360;h+=15)for(const d of [15,-15])ids.push('turn'+String(h).padStart(3,'0')+String((h+d+360)%360).padStart(3,'0'));
  if(Object.keys(data.clips || {}).length!==48||ids.some(id=>!data.clips[id]))throw Error('Expected all 48 directed turn profiles');
  for(const id of ids)validateProfile(data.clips[id],manifest.clips?.[id]?.sha256,id);
  return data;
}

// Integrate linear velocity exactly between knots; the last sample holds to 1000ms.
export function integrateVelocity(profile,start,end) {
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<start||end>1000+1e-6)throw Error('Invalid turn interval');
  const result=[0,0],samples=profile.samples;
  for(let i=0;i<samples.length;i++) {
    const a=samples[i],b=samples[i+1] || {...a,tMs:1000};
    const lo=Math.max(start,a.tMs),hi=Math.min(end,b.tMs);
    if(hi<=lo)continue;
    for(const [axis,key] of ['vx','vy'].entries()) {
      const slope=(b[key]-a[key])/(b.tMs-a.tMs);
      result[axis]+=(a[key]*(hi-lo)+slope*((hi-a.tMs)**2-(lo-a.tMs)**2)/2)/1000;
    }
  }
  return result;
}

export function integrateFrameLockedVelocity(profile,start,end) {
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<start||end>1000+1e-6)throw Error('Invalid turn interval');
  // Spread the full guessed integral over 23 displayed frame changes, not a terminal jump.
  const time=t=>Math.min(23,Math.floor(t*24/1000))*1000/23;
  return integrateVelocity(profile,time(start),time(end));
}

export function validateRootOffsets(data,manifest) {
  if(data?.version!==1 || !data.clips || !Object.keys(data.clips).length)throw Error('Invalid root offset metadata');
  for(const [id,p] of Object.entries(data.clips)) {
    const clip=manifest.clips?.[id];
    if(!id.startsWith('turn') || !clip || p.sheetSha256!==clip.sha256 ||
      !['reviewed-frame-root-offsets','hybrid-reviewed-frame-deltas'].includes(p.method) || p.review?.status!=='reviewed' ||
      p.review.sourcePawCorrespondence!==true || typeof p.review.evidence!=='string' || !p.review.evidence.trim() ||
      !Array.isArray(p.frameSize) || p.frameSize.length!==2 ||
      !clip.frames.every(r=>r[2]===p.frameSize[0] && r[3]===p.frameSize[1]))throw Error('Unreviewed or mismatched root offsets: '+id);
    if(p.method==='hybrid-reviewed-frame-deltas') {
      const seen=new Set();
      if(!Array.isArray(p.intervals)||!p.intervals.length)throw Error('Missing reviewed intervals: '+id);
      for(const s of p.intervals) {
        if(!Number.isInteger(s.fromFrame)||s.fromFrame<0||s.fromFrame>22||s.toFrame!==s.fromFrame+1||seen.has(s.fromFrame)||
          !Array.isArray(s.delta)||s.delta.length!==2||!s.delta.every(Number.isFinite)||
          typeof s.evidence!=='string'||!s.evidence.trim())throw Error('Invalid reviewed interval: '+id);
        seen.add(s.fromFrame);
      }
    } else if(!Array.isArray(p.offsets)||p.offsets.length!==24||
      p.offsets.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))||p.offsets[0].some(v=>v!==0))
      throw Error('Invalid root positions: '+id);
  }
  if(!Number.isFinite(manifest.grounding?.referenceWidth)||manifest.grounding.referenceWidth<=0)
    throw Error('Invalid root offset scale');
  return data;
}

// Match the renderer's held frame exactly, including frame 23 through the boundary.
export function integrateRootOffsets(profile,start,end,bodyWidth,referenceWidth,fallback) {
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<start||end>1000+1e-6 ||
    !Number.isFinite(bodyWidth)||bodyWidth<=0||!Number.isFinite(referenceWidth)||referenceWidth<=0)
    throw Error('Invalid root offset interval or scale');
  const frame=t=>Math.min(23,Math.floor(t*24/1000));
  if(profile.method==='hybrid-reviewed-frame-deltas') {
    if(!fallback)throw Error('Hybrid root offsets require manual fallback');
    const result=integrateFrameLockedVelocity(fallback,start,end);
    for(const s of profile.intervals)if(s.fromFrame>=frame(start)&&s.toFrame<=frame(end)) {
      const old=integrateVelocity(fallback,s.fromFrame*1000/23,s.toFrame*1000/23);
      result.forEach((v,i)=>{result[i]=v+s.delta[i]*bodyWidth/referenceWidth-old[i];});
    }
    return result;
  }
  const a=profile.offsets[frame(start)],b=profile.offsets[frame(end)];
  return b.map((v,i)=>(v-a[i])*bodyWidth/referenceWidth);
}

// Turn clips keep the walk gait (measured leg activity ~1.08x the approved loops), so a turn
// moves at the approved walk speed while the travel direction eases from `from` to `to`.
export function turnHeadingAt(from,to,t) {
  const d=((to-from+540)%360)-180,u=Math.max(0,Math.min(1,t/1000));
  return from+d*u*u*(3-2*u);
}
export function turnGaitAt(gait,t) {
  if(!gait)return 1;
  const x=Math.max(0,Math.min(gait.length-1,t*gait.length/1000-0.5)),i=Math.floor(x),f=x-i;
  return gait[i]+(gait[Math.min(gait.length-1,i+1)]-gait[i])*f;
}
export function integrateWalkTurn(from,to,start,end,speed,gait=null) {
  if(![from,to,start,end,speed].every(Number.isFinite)||start<0||end<start||end>1000+1e-6||speed<0)
    throw Error('Invalid walk-turn interval');
  const result=[0,0],cuts=[start];
  // Split at gait knots (frame centres) so each Simpson piece is smooth and any RAF split sums to the whole.
  if(gait)for(let i=0;i<gait.length;i++){const k=(i+0.5)*1000/gait.length;if(k>start&&k<end)cuts.push(k);}
  cuts.push(end);
  for(let j=0;j+1<cuts.length;j++) {
    const s0=cuts[j],s1=cuts[j+1],n=Math.max(1,Math.ceil((s1-s0)/2));
    for(let i=0;i<n;i++) {
      const a=s0+(s1-s0)*i/n,b=s0+(s1-s0)*(i+1)/n,m=(a+b)/2;
      for(const [t,w] of [[a,1],[m,4],[b,1]]) {
        const r=turnHeadingAt(from,to,t)*Math.PI/180,k=w*(b-a)/6*speed*turnGaitAt(gait,t)/1000;
        result[0]+=Math.cos(r)*k;result[1]+=Math.sin(r)*k;
      }
    }
  }
  return result;
}

// Turn catch-up: a clip plays faster the more heading is still left after it (15 deg left -> 2x, capped 4x); the last
// clip of a chain plays at 1x. Callers divide travel by the rate, so only the turning gets quicker, never the walk.
export const turnRate=rest=>Math.min(4,1+rest/15);
