export const FOCUS_ZONES = 16;
export const MAX_SLICES = 4;
const MAX_SLICE_BYTES = 24 * 1024 * 1024;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Read depth once, never read pixels back during pointer movement.
export function depthLookup(image, worldWidth, worldHeight) {
  const width = image.width, height = image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  // Focus samples use only red; retain one byte per pixel, not the RGBA readback.
  const values = new Uint8Array(width * height);
  for (let i = 0; i < values.length; i++) values[i] = data[i * 4];
  canvas.width = canvas.height = 1;
  return ([x, y]) => {
    const px = clamp(x / worldWidth * width - 0.5, 0, width - 1);
    const py = clamp(y / worldHeight * height - 0.5, 0, height - 1);
    const x0 = Math.floor(px), y0 = Math.floor(py);
    const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
    const read = (a, b) => values[b * width + a] / 255;
    const top = read(x0, y0) * (1 - (px - x0)) + read(x1, y0) * (px - x0);
    const bottom = read(x0, y1) * (1 - (px - x0)) + read(x1, y1) * (px - x0);
    return top * (1 - (py - y0)) + bottom * (py - y0);
  };
}

export function createDofCache({ device, pipeline, art, depth, lookup, wake }) {
  const uniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const slices = new Map();
  const scale = Math.min(1, Math.sqrt(MAX_SLICE_BYTES / (MAX_SLICES * art.width * art.height * 4)));
  const width = Math.max(1, Math.floor(art.width * scale));
  const height = Math.max(1, Math.floor(art.height * scale));
  const sliceBytes = width * height * 4;
  let current = null, previousTime = 0, fade = 0, enabledBefore = false;
  let inFlight = null, destroyed = false, suspended = false, baked = 0;
  let strength = 1, revision = 0;

  function invalidate() {
    revision++;
    for (const texture of slices.values()) {
      // An encoded pass may still reference these textures before submission.
      if (inFlight) inFlight.retired.add(texture);
      else texture.destroy();
    }
    slices.clear();
  }

  function frame(encoder, point, enabled, now) {
    if (destroyed || suspended) return { a: art, b: art, focus: current ?? 0.5,
      mix: 0, strength: 0, needsFrame: false };
    const dt = previousTime ? Math.max(0, now - previousTime) : 0;
    previousTime = now;
    const target = lookup(point);
    if (current === null) current = target;
    current += (target - current) * (1 - Math.exp(-dt / 300));
    if (Math.abs(target - current) < 0.0008) current = target;
    enabled = enabled && strength > 0;
    if (enabled && !enabledBefore) fade = now;
    enabledBefore = enabled;
    if (!enabled) return { a: art, b: art, focus: current, mix: 0, strength: 0, needsFrame: false };
    const zf = clamp(current * FOCUS_ZONES - 0.5, 0, FOCUS_ZONES - 1);
    const z0 = Math.floor(zf), z1 = Math.min(FOCUS_ZONES - 1, z0 + 1);
    for (const zone of [z0, z1]) {
      if (slices.has(zone)) {
        const value = slices.get(zone);
        slices.delete(zone);
        slices.set(zone, value);
      }
    }
    const missing = [z0, z1].find(zone => !slices.has(zone));
    if (missing !== undefined && !inFlight) {
      if (slices.size >= MAX_SLICES) {
        const victim = [...slices.keys()].find(zone => zone !== z0 && zone !== z1);
        slices.get(victim).destroy();
        slices.delete(victim);
      }
      const texture = device.createTexture({ size: [width, height], format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING });
      // Track ownership before encoding so destroy also cleans up a failed pass.
      slices.set(missing, texture);
      inFlight = { revision, submitted: false, retired: new Set() };
      device.queue.writeBuffer(uniform, 0, new Float32Array([(missing + 0.5) / FOCUS_ZONES, strength, 0, 0]));
      const pass = encoder.beginComputePass({ label: 'One lazy 64-tap focus slice' });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: uniform } },
        { binding: 1, resource: art.createView() },
        { binding: 2, resource: depth.createView() },
        { binding: 3, resource: texture.createView() }
      ] }));
      pass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
      pass.end();
      baked++;
    }
    // A missing neighbor remains sharp until baked; no uninitialized textures.
    const a = slices.get(z0) || art, b = slices.get(z1) || art;
    const amount = clamp((now - fade) / 600, 0, 1);
    return { a, b, focus: current, mix: zf - z0, strength: Math.min(1, 0.55 * strength) * amount * amount,
      needsFrame: current !== target || amount < 1 || (!inFlight && (!slices.has(z0) || !slices.has(z1))) };
  }

  return {
    frame,
    setStrength(value) {
      if (destroyed || !Number.isFinite(value)) return strength;
      // Ignore numerical noise and coalesce all changes before the next bake.
      const next = Math.round(clamp(value, 0, 4) * 100) / 100;
      if (next === strength) return strength;
      strength = next;
      invalidate();
      if (!strength) enabledBefore = false;
      if (!suspended) wake();
      return strength;
    },
    suspend(value) {
      if (destroyed || suspended === Boolean(value)) return;
      suspended = Boolean(value);
      if (!suspended) wake();
    },
    submitted() {
      const work = inFlight;
      if (destroyed || !work || work.submitted) return;
      work.submitted = true;
      const finish = failed => {
        if (inFlight !== work) return;
        inFlight = null;
        for (const texture of work.retired) texture.destroy();
        work.retired.clear();
        if (failed && revision === work.revision) invalidate();
        if (!failed && !destroyed && !suspended) wake();
      };
      device.queue.onSubmittedWorkDone().then(() => finish(false), () => finish(true));
    },
    get stats() { return { zones: FOCUS_ZONES, slices: slices.size, maxSlices: MAX_SLICES,
      sliceBytes: (slices.size + (inFlight?.retired.size || 0)) * sliceBytes,
      baked, inFlight: Boolean(inFlight), focus: current, strength }; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const texture of slices.values()) texture.destroy();
      slices.clear();
      for (const texture of inFlight?.retired || []) texture.destroy();
      inFlight = null;
      uniform.destroy();
    }
  };
}
