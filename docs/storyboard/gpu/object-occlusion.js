// Authored pixels select categorical ground contacts or legacy canopy depth.
export const OBJECT_GROUND_SCALE = 16;
export const OBJECT_INSTANCE_SOURCE = new URL('../images/atlas/shire-object-instances-v2.png', import.meta.url).href;
export const OBJECT_GROUND_SOURCE = new URL('../images/atlas/shire-object-ground-v2.png', import.meta.url).href;

function dimensions(image, width, height, name) {
  if (!image || image.width !== width || image.height !== height ||
      !(image.data instanceof Uint8Array || image.data instanceof Uint8ClampedArray) ||
      image.data.length !== width * height * 4) throw new TypeError(`Invalid ${name} dimensions or RGBA bytes`);
}

export function validateObjectOcclusion(instances, ground, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 2e6) {
    throw new RangeError('Invalid object occlusion world dimensions');
  }
  dimensions(instances, width, height, 'instance texture');
  dimensions(ground, width, 256, 'ground profile');
  for (let i = 0; i < instances.data.length; i += 4) {
    const mode = instances.data[i+2], coverage = instances.data[i+1];
    if (instances.data[i+3] !== 255 || (mode !== 0 && mode !== 1) ||
        (mode === 0 && instances.data[i] === 0 && coverage !== 0) ||
        (mode === 1 && coverage === 0)) throw new TypeError('Invalid instance/coverage/mode encoding');
  }
  for (let i = 0; i < ground.data.length; i += 4) {
    const valid = ground.data[i+2];
    if (ground.data[i+3] !== 255 || (valid !== 0 && valid !== 255) ||
        (valid && (ground.data[i] * 256 + ground.data[i+1]) / OBJECT_GROUND_SCALE > height)) {
      throw new TypeError('Invalid ground profile encoding');
    }
  }
  return { instances, ground, width, height };
}

async function decode(source) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Object occlusion texture HTTP ${response.status}`);
  const blob = await response.blob();
  if (blob.size > 16 * 1024 * 1024) throw new RangeError('Object occlusion PNG exceeds byte budget');
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion:'none', premultiplyAlpha:'none' });
  try {
    if (bitmap.width * bitmap.height > 2e6) throw new RangeError('Object occlusion texture exceeds pixel budget');
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently:true });
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = canvas.height = 0;
    return { width:bitmap.width, height:bitmap.height, data:pixels.data };
  } finally { bitmap.close(); }
}

export async function loadObjectOcclusion({ width, height, instanceSource=OBJECT_INSTANCE_SOURCE,
  groundSource=OBJECT_GROUND_SOURCE, decodeImage=decode } = {}) {
  const [instances, ground] = await Promise.all([decodeImage(instanceSource), decodeImage(groundSource)]);
  return { ...validateObjectOcclusion(instances, ground, width, height), instanceSource, groundSource };
}

export function uploadObjectOcclusion(device, images) {
  const created = [];
  try {
    for (const image of [images.instances, images.ground]) {
      const texture = device.createTexture({ size:[image.width,image.height], format:'rgba8unorm',
        usage:GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
      created.push(texture);
      device.queue.writeTexture({ texture }, image.data, { bytesPerRow:image.width * 4 }, [image.width,image.height]);
    }
    return { instances:created[0], ground:created[1], bytes:images.instances.data.byteLength + images.ground.data.byteLength };
  } catch (error) { created.forEach(texture => texture.destroy()); throw error; }
}

// Reference for deterministic fixtures; the renderer never samples these bytes per frame.
export function objectVisibility(images, fragment, foot, canopyVisibility) {
  if (!fragment.every(Number.isFinite) || !foot.every(Number.isFinite)) throw new TypeError('Finite fragment/foot required');
  if (fragment[0] < 0 || fragment[1] < 0 || fragment[0] >= images.width || fragment[1] >= images.height) return 1;
  const pixel = (Math.floor(fragment[1]) * images.width + Math.floor(fragment[0])) * 4;
  const id = images.instances.data[pixel], coverage = images.instances.data[pixel+1] / 255;
  if (images.instances.data[pixel+2] === 1) {
    if (!Number.isFinite(canopyVisibility) || canopyVisibility < 0 || canopyVisibility > 1) {
      throw new TypeError('Canopy mode requires per-member legacy pixel visibility');
    }
    return 1 - coverage * (1 - canopyVisibility);
  }
  if (!id || !coverage) return 1;
  const footX = Math.max(0, Math.min(images.width - 1, Math.floor(foot[0])));
  const index = (id * images.width + footX) * 4;
  if (!images.ground.data[index+2]) return 1;
  const baseY = (images.ground.data[index] * 256 + images.ground.data[index+1]) / OBJECT_GROUND_SCALE;
  return foot[1] >= baseY ? 1 : 1 - coverage;
}
