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

export function spriteRasterScale(demand, current = 1) {
  if (!Number.isFinite(demand) || demand <= 0) return current;
  // Separate promotion/demotion thresholds keep pinch zoom from thrashing canvases.
  while (current < 4 && demand > current * 1.125) current *= 2;
  while (current > 1 && demand < current * 0.425) current /= 2;
  return current;
}

export function resizeSpriteRaster(layer, scale) {
  if (scale !== 1 && scale !== 2 && scale !== 4) throw new RangeError('Sprite raster scale must be 1, 2 or 4');
  const width = SPRITE_SIZE * (layer.members?.length || 1) * scale;
  const height = SPRITE_SIZE * scale;
  if (layer.canvas.width === width && layer.canvas.height === height) return false;
  layer.canvas.width = width;
  layer.canvas.height = height;
  layer.rasterScale = scale;
  layer.rasterRevision++;
  layer.revision++;
  layer.imageKey = null;
  layer.ready = false;
  if (layer.members) for (const member of layer.members) member.ready = false;
  // Painting is synchronous so paused characters survive a camera-only zoom.
  layer.onRasterScaleChange?.(layer);
  return true;
}

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

export function createOcclusionLayer(worldHeight, count = 1) {
  if (!Number.isInteger(count) || count < 1 || count > 3) throw new RangeError('Sprite count must be between 1 and 3');
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE * count;
  canvas.height = SPRITE_SIZE;
  const ground = document.createElement('canvas');
  ground.width = 1; ground.height = worldHeight;
  const ctx = ground.getContext('2d'), pixels = ctx.createImageData(1, worldHeight);
  for (let y = 0; y < worldHeight; y++) {
    const value = Math.round(groundDepth(y + 0.5) * 255);
    pixels.data.set([value, value, value, 255], y * 4);
  }
  ctx.putImageData(pixels, 0, 0);
  const layer = { canvas, ground, anchor: [...SPRITE_ANCHOR], x: 0, y: 0, footY: 0, ready: false, revision: 0, imageKey: null,
    rasterScale: 1, rasterRevision: 0, onRasterScaleChange: null };
  if (count > 1) layer.members = Array.from({ length: count }, () => ({
    x: 0, y: 0, footY: 0, ready: false, anchor: [...SPRITE_ANCHOR]
  }));
  return layer;
}
