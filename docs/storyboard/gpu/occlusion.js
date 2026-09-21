// Artistic-depth calibration, not recovered geometry. See occlusion-calibration.json.
export const GROUND_SAMPLES = Object.freeze([
  [205, 111 / 255], [400, 125 / 255], [575, 101 / 255],
  [640, 91 / 255], [740, 66 / 255], [845, 66 / 255], [905, 63 / 255]
]);
export const OCCLUSION_BIAS = 0.12;
export const OCCLUSION_FEATHER = 0.05;
export const NEAR_OCCLUSION_BIAS = 0.04;
export const NEAR_OCCLUSION_FEATHER = 0.025;
export const SPRITE_SIZE = 128;
export const SPRITE_ANCHOR = [64, 112];

export function groundDepth(y) {
  if (y <= GROUND_SAMPLES[0][0]) return GROUND_SAMPLES[0][1];
  for (let i = 1; i < GROUND_SAMPLES.length; i++) {
    const [y1, d1] = GROUND_SAMPLES[i], [y0, d0] = GROUND_SAMPLES[i - 1];
    if (y <= y1) return d0 + (d1 - d0) * (y - y0) / (y1 - y0);
  }
  return GROUND_SAMPLES.at(-1)[1];
}

export function visibility(sceneDepth, objectDepth) {
  // The foreground depth range is compressed; a fixed far-ground bias can
  // exceed the entire canopy/road separation. Never use scenery as object depth.
  const range = Math.max(0, Math.min(1, (objectDepth - 66 / 255) / (25 / 255)));
  const bias = NEAR_OCCLUSION_BIAS + (OCCLUSION_BIAS - NEAR_OCCLUSION_BIAS) * range;
  const feather = NEAR_OCCLUSION_FEATHER + (OCCLUSION_FEATHER - NEAR_OCCLUSION_FEATHER) * range;
  const t = Math.max(0, Math.min(1, (objectDepth - sceneDepth - bias) / feather));
  return 1 - t * t * (3 - 2 * t);
}

export function createOcclusionLayer(worldHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SPRITE_SIZE;
  const ground = document.createElement('canvas');
  ground.width = 1; ground.height = worldHeight;
  const ctx = ground.getContext('2d'), pixels = ctx.createImageData(1, worldHeight);
  for (let y = 0; y < worldHeight; y++) {
    const value = Math.round(groundDepth(y + 0.5) * 255);
    pixels.data.set([value, value, value, 255], y * 4);
  }
  ctx.putImageData(pixels, 0, 0);
  return { canvas, ground, anchor: SPRITE_ANCHOR, x: 0, y: 0, footY: 0, ready: false, revision: 0, imageKey: null };
}
