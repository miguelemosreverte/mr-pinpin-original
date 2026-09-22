// Estimated camera-space data, not world-space geometry. See shire-normal-v2.json.
export const SURFACE_WIDTH = 256;
export const SURFACE_HEIGHT = 171;
const clamp = v => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

// Frozen v2 contract. Tests compare these values against generator and asset metadata.
export const DEPTH_CALIBRATION_V2 = Object.freeze({
  version: 2, referenceHeight: 1024, groundFar: 0.85, groundSpan: 0.65,
  occluderGain: 0.30, maxOccluderLift: 0.12,
  oldGroundReference: Object.freeze([
    [0, 0.80], [205, 111 / 255], [400, 125 / 255], [575, 101 / 255],
    [640, 91 / 255], [740, 66 / 255], [1024, 0.08]
  ].map(point => Object.freeze(point))),
  groundFormula: '0.85 - 0.65 * clamp(v, 0, 1)',
  lensFormula: 'groundDepthV2(v) - clamp(0.30 * (oldGroundReference(v * 1024) - smoothedV1Depth), 0, 0.12)',
  coordinates: 'Top-left UV; texel-center v=(y+0.5)/height; old ground reference linearly interpolated in source Y.',
  input: 'V1 scalar depth after two bilateral passes: radius=4, spatialSigma=2.5, rangeSigma=0.035. Do not recalibrate an already-v2 depth value.'
});

export function groundDepthV2(v) {
  return DEPTH_CALIBRATION_V2.groundFar - DEPTH_CALIBRATION_V2.groundSpan * clamp(v);
}

/** Converts gently smoothed v1 depth into the calibrated v2 lens-distance estimate. */
export function lensDepthV2(smoothedV1Depth, v) {
  if (!Number.isFinite(smoothedV1Depth)) throw new TypeError('Expected finite smoothed v1 depth');
  const calibration = DEPTH_CALIBRATION_V2, y = clamp(v) * calibration.referenceHeight;
  const points = calibration.oldGroundReference;
  const index = Math.max(1, points.findIndex(([py]) => py >= y));
  const [ay, ad] = points[index - 1], [by, bd] = points[index];
  const reference = ad + (bd - ad) * (y - ay) / (by - ay);
  const lift = Math.max(0, Math.min(calibration.maxOccluderLift,
    (reference - smoothedV1Depth) * calibration.occluderGain));
  return groundDepthV2(v) - lift;
}

function compact(source, channels) {
  if (!source) return null;
  const width = source.naturalWidth || source.width, height = source.naturalHeight || source.height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new TypeError('Invalid surface dimensions');
  let data = source.data, stride = source.channels || 4, canvas;
  if (!data) {
    canvas = document.createElement('canvas');
    canvas.width = SURFACE_WIDTH; canvas.height = SURFACE_HEIGHT;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.imageSmoothingEnabled = false;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    stride = 4;
  } else if (!(data instanceof Uint8Array || data instanceof Uint8ClampedArray) ||
      ![1, 3, 4].includes(stride) || stride < channels || data.length !== width * height * stride) {
    throw new TypeError('Expected tightly packed RGB8/RGBA8 normal or R8/RGB8/RGBA8 depth data');
  }
  const sourceWidth = canvas ? SURFACE_WIDTH : width, sourceHeight = canvas ? SURFACE_HEIGHT : height;
  const values = new Uint8Array(SURFACE_WIDTH * SURFACE_HEIGHT * channels);
  for (let y = 0; y < SURFACE_HEIGHT; y++) for (let x = 0; x < SURFACE_WIDTH; x++) {
    const sx = Math.min(sourceWidth - 1, Math.floor((x + 0.5) / SURFACE_WIDTH * sourceWidth));
    const sy = Math.min(sourceHeight - 1, Math.floor((y + 0.5) / SURFACE_HEIGHT * sourceHeight));
    const input = (sy * sourceWidth + sx) * stride, output = (y * SURFACE_WIDTH + x) * channels;
    for (let c = 0; c < channels; c++) values[output + c] = data[input + c];
  }
  if (canvas) canvas.width = canvas.height = 1;
  return values;
}

function sampleChannel(values, channels, channel, u, v) {
  const x = Math.max(0, Math.min(SURFACE_WIDTH - 1, clamp(u) * SURFACE_WIDTH - 0.5));
  const y = Math.max(0, Math.min(SURFACE_HEIGHT - 1, clamp(v) * SURFACE_HEIGHT - 0.5));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, SURFACE_WIDTH - 1), y1 = Math.min(y0 + 1, SURFACE_HEIGHT - 1);
  const at = (px, py) => values[(py * SURFACE_WIDTH + px) * channels + channel] / 255;
  const top = at(x0, y0) * (1 - x + x0) + at(x1, y0) * (x - x0);
  const bottom = at(x0, y1) * (1 - x + x0) + at(x1, y1) * (x - x0);
  return top * (1 - y + y0) + bottom * (y - y0);
}

/** Synchronous decoded-image/byte-raster input. UV top-left; +X right, +Y up, +Z viewer. */
export function createSurfaceSampler(depth, normal) {
  const depths = compact(depth, 1), normals = compact(normal, 3);
  const depthAt = (u, v) => depths ? sampleChannel(depths, 1, 0, u, v) : 0.5;
  const normalAt = (u, v) => {
    if (!normals) return [0, 0, 1];
    const n = [0, 1, 2].map(c => 2 * sampleChannel(normals, 3, c, u, v) - 1);
    const length = Math.hypot(...n);
    return length > 1e-6 ? n.map(value => value / length) : [0, 0, 1];
  };
  const sample = (u, v) => ({ depth: depthAt(u, v), normal: normalAt(u, v) });
  return { sample, depthAt, normalAt,
    sampleWorld: (x, y, width = 1536, height = 1024) => sample(x / width, y / height),
    width: SURFACE_WIDTH, height: SURFACE_HEIGHT,
    byteLength: (depths?.byteLength || 0) + (normals?.byteLength || 0),
    hasDepth: Boolean(depths), hasNormal: Boolean(normals) };
}

/** Fetch only 128.25 KiB of RGB8 normals; depth can reuse the parent's decoded image. */
export async function loadSurfaceSampler({ depth, normalUrl = new URL('../images/atlas/shire-normal-v2.rgb.bin', import.meta.url), signal } = {}) {
  const response = await fetch(normalUrl, { signal });
  if (!response.ok) throw new Error(`Surface normal load failed: ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  return createSurfaceSampler(depth, { width: SURFACE_WIDTH, height: SURFACE_HEIGHT, channels: 3, data });
}
