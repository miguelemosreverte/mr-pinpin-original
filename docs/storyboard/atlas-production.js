// Public defaults are explicit; local review switches never become production URL requirements.
export function resolveAtlasRuntime(search='',hostname='') {
  const q=new URLSearchParams(search),local=['localhost','127.0.0.1','[::1]','::1'].includes(hostname);
  const trial=q.get('spriteTrial')==='1',localTrial=local && trial;
  const familyPreview=q.get('family')==='1';
  const production=!localTrial && !familyPreview;
  const videoEnabled=!familyPreview && q.get('spriteTrial')!=='0' && q.get('spriteSet')!=='original' && (production || trial);
  const groundEnabled=q.has('sandbox') ? q.get('sandbox')==='1' : production;
  return Object.freeze({production,videoEnabled,groundEnabled,
    reviewCapture:local && q.get('sandbox')==='1' && q.get('reviewCapture')==='1',
    spriteSet:videoEnabled ? 'video' : 'original',
    manifestUrl:localTrial ? '/__sprite-trial/'+'manifest.json' : './images/atlas/walk/manifest.json',
    turnWalk:videoEnabled && q.get('turnWalk')!=='0',
    gaitModule:(q.get('gait')==='regen' || production && !q.has('gait')) ? 'sprite-turn-gait-regen.mjs' : 'sprite-turn-gait.mjs'});
}
