// Scene-wide DOF: linear-light color, continuous focus, bounded aperture gather.
export const MAX_LENS_PIXELS = 600000;

export async function createLens({ device, source, format, sampler }) {
  const module = device.createShaderModule({ code: source, label: 'Continuous miniature aperture' });
  const pipeline = entryPoint => device.createRenderPipelineAsync({ layout: 'auto',
    vertex: { module, entryPoint: 'vs_main' },
    fragment: { module, entryPoint, targets: [{ format: entryPoint === 'fs_resolve' ? format : 'rgba16float' }] }
  });
  const gather = await pipeline('fs_lens'), resolve = await pipeline('fs_resolve'), downsample = await pipeline('fs_downsample');
  const uniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const uniformData = new Float32Array(8);
  let attachments, blurView;
  let mipPasses = [], mipBytes = 0;
  let color, depth, blur, prefilter, gatherGroup, resolveGroup, width = 0, height = 0, effectWidth = 0, effectHeight = 0;
  let focus = null, target = 0.5, previousTime = null, strength = 4, passes = 0;
  function resize(w, h) {
    if (width === w && height === h) return;
    for (const value of [color, depth, blur, prefilter]) value?.destroy();
    width = w; height = h;
    const scale = Math.min(0.5, Math.sqrt(MAX_LENS_PIXELS / (w * h)));
    effectWidth = Math.max(1, Math.floor(w * scale));
    effectHeight = Math.max(1, Math.floor(h * scale));
    const texture = (size, format, mipLevelCount = 1) => device.createTexture({ size, format, mipLevelCount,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    const pw = Math.max(1, w >> 2), ph = Math.max(1, h >> 2);
    const mipLevels = Math.min(3, Math.floor(Math.log2(Math.max(pw, ph))) + 1);
    color = texture([w, h], 'rgba16float');
    prefilter = texture([pw, ph], 'rgba16float', mipLevels);
    depth = texture([w, h], 'r16float');
    blur = texture([effectWidth, effectHeight], 'rgba16float');
    const colorView = color.createView(), depthView = depth.createView();
    blurView = blur.createView();
    attachments = [color.createView({ baseMipLevel: 0, mipLevelCount: 1 }), depthView].map(view => ({ view,
      clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'store' }));
    const entries = [
      { binding: 0, resource: { buffer: uniform } },
      { binding: 1, resource: colorView },
      { binding: 2, resource: depthView },
      { binding: 3, resource: sampler }
    ];
    gatherGroup = device.createBindGroup({ layout: gather.getBindGroupLayout(0), entries: [
      ...entries, { binding: 5, resource: prefilter.createView() }
    ] });
    resolveGroup = device.createBindGroup({ layout: resolve.getBindGroupLayout(0), entries: [
      ...entries, { binding: 4, resource: blurView }
    ] });
    mipPasses = []; mipBytes = 0;
    for (let level = 0; level < mipLevels; level++) {
      mipBytes += Math.max(1, pw >> level) * Math.max(1, ph >> level) * 8;
      mipPasses.push({ view: prefilter.createView({ baseMipLevel: level, mipLevelCount: 1 }),
        group: device.createBindGroup({ layout: downsample.getBindGroupLayout(0), entries: [
          { binding: 1, resource: level ? prefilter.createView({ baseMipLevel: level - 1, mipLevelCount: 1 }) : colorView },
          { binding: 3, resource: sampler }
        ] }) });
    }
  }
  return {
    frame({ width, height, viewport, focusDepth, enabled, now, highlights = 1 }) {
      resize(width, height);
      target = focusDepth;
      const dt = previousTime === null ? 0 : Math.max(0, now - previousTime);
      previousTime = now;
      if (focus === null) focus = target;
      focus += (target - focus) * (1 - Math.exp(-dt / 180));
      if (Math.abs(focus - target) < 0.00001) focus = target;
      uniformData.set([
        viewport[0], viewport[1], focus, enabled ? strength : 0,
        effectWidth, effectHeight, 48, highlights
      ]);
      device.queue.writeBuffer(uniform, 0, uniformData);
      return { focus, attachments,
        needsFrame: enabled && strength > 0 && focus !== target };
    },
    encode(encoder, output, enabled) {
      if (enabled && strength > 0) {
        for (const mip of mipPasses) {
          const pass = encoder.beginRenderPass({ label: 'Linear aperture prefilter', colorAttachments: [
            { view: mip.view, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }
          ] });
          pass.setPipeline(downsample); pass.setBindGroup(0, mip.group); pass.draw(3); pass.end();
        }
        const pass = encoder.beginRenderPass({ label: 'Half-resolution aperture disc', colorAttachments: [
          { view: blurView, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }
        ] });
        pass.setPipeline(gather); pass.setBindGroup(0, gatherGroup); pass.draw(3); pass.end();
        passes++;
      }
      const pass = encoder.beginRenderPass({ label: 'Global lens resolve', colorAttachments: [
        { view: output, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }
      ] });
      pass.setPipeline(resolve); pass.setBindGroup(0, resolveGroup); pass.draw(3); pass.end();
    },
    setStrength(value) { strength = value; },
    get stats() { return { model: 'global-miniature-aperture', zones: 0, slices: 0, maxSlices: 0,
      sliceBytes: 0, baked: 0, inFlight: false, focus, targetFocus: target, strength,
      passes, taps: 32, effectWidth, effectHeight, effectPixels: effectWidth * effectHeight,
      textureBytes: width * height * 10 + effectWidth * effectHeight * 8 + mipBytes, prefilterBytes: mipBytes,
      linearLight: true, signedCoC: true, maxRadiusCss: 48,
      depthModel: 'ground-plane-minus-canopy', depthRangeMeters: [0.25, 2] }; },
    destroy() { for (const value of [color, depth, blur, prefilter, uniform]) value?.destroy(); }
  };
}
