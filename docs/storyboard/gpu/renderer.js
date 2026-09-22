import { depthLookup } from './dof.js';
import { createLens } from './lens.js';
import { groundDepthV2, lensDepthV2 } from './surface.js';
import { createOcclusionLayer, groundDepth, OCCLUSION_BIAS, OCCLUSION_FEATHER, SPRITE_SIZE, spriteRasterScale, resizeSpriteRaster } from './occlusion.js';
import { tractorGroundDepth, TRACTOR_GROUND_WGSL } from './tractor-ground.js';

export const WORLD_WIDTH = 1536;
export const WORLD_HEIGHT = 1024;
export const BORDER_TILE_SIZE = 512;
export const miniatureGroundDepth = y => groundDepthV2(y / WORLD_HEIGHT);
const DEFAULT_BORDER_SRC = new URL('../images/atlas/shire-floral-tile-v1.webp', import.meta.url).href;
const BORDER_COLOR = '#dce7d3';

async function loadImage(src) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = src;
  await image.decode();
  return image;
}

async function shader(name) {
  const response = await fetch(new URL(name, import.meta.url));
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response.text();
}

export async function createRenderer({ canvas, artSrc, depthSrc, overlayCanvas,
  borderSrc = DEFAULT_BORDER_SRC, onError = () => {} }) {
  if (!canvas || !artSrc) throw new TypeError('canvas and artSrc are required');
  const spriteCount = overlayCanvas?.dataset?.family === 'true' ? 3 : 1;
  const report = error => { try { onError(error); } catch (ignored) { console.error(ignored); } };
  const art = await loadImage(artSrc);
  let depth = null;
  if (depthSrc) {
    try { depth = await loadImage(depthSrc); } catch (error) { report(error); }
  }
  let border = null;
  if (borderSrc) {
    try { border = await loadImage(borderSrc); } catch (error) { report(error); }
  }
  // An opaque backing also gives transparent border assets identical composition.
  const borderImage = document.createElement('canvas');
  borderImage.width = border?.naturalWidth || 1;
  borderImage.height = border?.naturalHeight || 1;
  const borderContext = borderImage.getContext('2d');
  borderContext.fillStyle = BORDER_COLOR;
  borderContext.fillRect(0, 0, borderImage.width, borderImage.height);
  if (border) borderContext.drawImage(border, 0, 0);
  let mirroredBorder;
  function fallbackBorder() {
    if (mirroredBorder) return mirroredBorder;
    mirroredBorder = document.createElement('canvas');
    mirroredBorder.width = borderImage.width * 2;
    mirroredBorder.height = borderImage.height * 2;
    const ctx = mirroredBorder.getContext('2d');
    for (const x of [0, 1]) for (const y of [0, 1]) {
      ctx.setTransform(x ? -1 : 1, 0, 0, y ? -1 : 1,
        x ? mirroredBorder.width : 0, y ? mirroredBorder.height : 0);
      ctx.drawImage(borderImage, 0, 0);
    }
    return mirroredBorder;
  }
  const occlusion = createOcclusionLayer(WORLD_HEIGHT, spriteCount);
  // Keep atlas slots fixed while ordering their independently positioned quads.
  const spriteSlots = Array.from({ length: spriteCount }, (_, slot) => ({ slot, member: null, orderDepth: 0 }));
  function orderedSprites() {
    for (const entry of spriteSlots) {
      entry.member = spriteCount === 1 ? occlusion : occlusion.members?.[entry.slot];
      entry.orderDepth = groundDepth(entry.member?.footY ?? 0);
    }
    return spriteSlots.sort((a, b) => b.orderDepth - a.orderDepth || a.slot - b.slot);
  }
  const lookup = depth ? depthLookup(depth, WORLD_WIDTH, WORLD_HEIGHT) : () => 0.5;
  let device, context, pipeline, uniform, sampler, borderSampler, artTexture, depthTexture, overlayTexture, borderTexture, spriteTexture, groundTexture, lens;
  let bannerTexture, bannerDepthTexture, sceneryTexture, sceneryMaskTexture;
  let bannerLayer = null, bannerRevision, bannerUploads = 0, bannerReady = false;
  let scenery = null, sceneryElapsed = 0, sceneryTime = null, animate = true, sceneryUploads = 0;
  let sceneryVideo = null, videoActive = null, videoDirty = false, videoRevision = 0;
  let videoUploadedRevision = 0, videoUploadedTime = null;
  let focusDepth = null, focusOffset = 0, highlights = 1;
  let backend = 'canvas2d', adapterInfo = null, fallbackContext, fallbackCanvas, borderPattern;
  let destroyed = false, raf = 0, dirty = true, overlayDirty = true, overlayVersion;
  let enabled = true, occlusionEnabled = true, bokehStrength = 4, focus = [WORLD_WIDTH / 2, WORLD_HEIGHT / 2];
  let needsFrame = false, draws = 0, overlayUploads = 0, spriteUploads = 0, spriteRevision = -1, spriteAllocations = 0;
  let bindGroup = null, boundTextures = [], textureViews = new WeakMap();
  const uniformData = new Float32Array(64), previousUniform = new Float32Array(64);
  let uniformWritten = false, suspended = false, lastDrawTime = -Infinity;
  let camera = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, scale: 1,
    width: canvas.clientWidth || 1, height: canvas.clientHeight || 1 };
  const oldBackground = canvas.style.backgroundImage;
  const oldBackgroundSize = canvas.style.backgroundSize;

  function wake() {
    dirty = true;
    if (!destroyed && !suspended && !document.hidden && !raf) raf = requestAnimationFrame(draw);
  }

  function syncVideo() {
    const active = !destroyed && backend === 'webgpu' && animate && !suspended && !document.hidden;
    if (sceneryVideo && videoActive !== active) {
      videoActive = active;
      sceneryVideo.setActive(active);
    }
  }

  function releaseVideo() {
    const source = sceneryVideo;
    sceneryVideo = null; videoActive = null; videoDirty = false;
    videoRevision = videoUploadedRevision = 0; videoUploadedTime = null;
    if (source) {
      try { source.setActive(false); } catch (error) { report(error); }
      try { source.destroy(); } catch (error) { report(error); }
    }
  }

  function uploadVideo() {
    if (!sceneryVideo || !videoActive || !videoDirty) return;
    const video = sceneryVideo.video, width = video.videoWidth, height = video.videoHeight;
    if (video.readyState < 2 || !width || !height || video.seeking) return;
    if (width > device.limits.maxTextureDimension2D || height > device.limits.maxTextureDimension2D || width * height > 2000000) {
      throw new RangeError('Scenery video exceeds the texture pixel budget');
    }
    // Allocate once per source/size, then overwrite the same single array layer.
    if (scenery?.kind !== 'video' || scenery.width !== width || scenery.height !== height) {
      let next, nextMask;
      try {
        next = device.createTexture({ size: [width, height, 1], format: 'rgba8unorm',
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
        const white = document.createElement('canvas'); white.width = white.height = 1;
        const ctx = white.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1, 1);
        nextMask = texture(white);
        device.queue.copyExternalImageToTexture({ source: video }, { texture: next }, [width, height]);
      } catch (error) { next?.destroy(); nextMask?.destroy(); throw error; }
      sceneryTexture.destroy(); sceneryMaskTexture.destroy();
      sceneryTexture = next; sceneryMaskTexture = nextMask;
      scenery = { kind: 'video', count: 1, width, height, textureBytes: width * height * 4 + 4 };
    } else {
      device.queue.copyExternalImageToTexture({ source: video }, { texture: sceneryTexture }, [width, height]);
    }
    sceneryUploads = Math.min(Number.MAX_SAFE_INTEGER, sceneryUploads + 1);
    videoUploadedRevision = videoRevision;
    videoUploadedTime = Number.isFinite(video.currentTime) ? video.currentTime : null;
    videoDirty = false;
  }

  function releaseGpu() {
    releaseVideo();
    bindGroup = null; boundTextures = []; textureViews = new WeakMap(); uniformWritten = false;
    lens?.destroy();
    lens = null;
    for (const resource of [uniform, artTexture, depthTexture, overlayTexture, borderTexture, spriteTexture, groundTexture,
      bannerTexture, bannerDepthTexture, sceneryTexture, sceneryMaskTexture]) resource?.destroy();
    uniform = artTexture = depthTexture = overlayTexture = borderTexture = spriteTexture = groundTexture = null;
    bannerTexture = bannerDepthTexture = sceneryTexture = sceneryMaskTexture = null;
    scenery = null;
    context?.unconfigure();
    device?.destroy();
    device = null;
  }

  function useFallback(error) {
    const wasGpu = Boolean(context);
    releaseGpu();
    backend = 'canvas2d';
    canvas.dataset.renderer = backend;
    canvas.dataset.dof = 'off';
    bannerReady = false;
    canvas.dispatchEvent(new CustomEvent('atlasrendererchange', { detail: { backend } }));
    // Canvas context type is immutable. After device loss, present a 2D bitmap
    // as the same canvas's background; keep the controller's canvas reference.
    fallbackCanvas = wasGpu ? document.createElement('canvas') : canvas;
    fallbackContext = fallbackCanvas.getContext('2d', { alpha: true });
    if (!fallbackContext) throw new Error('Canvas2D fallback unavailable');
    borderPattern = fallbackContext.createPattern(fallbackBorder(), 'repeat');
    borderPattern?.setTransform(new DOMMatrix().scale(BORDER_TILE_SIZE / borderImage.width, BORDER_TILE_SIZE / borderImage.height));
    if (error) report(error);
    dirty = true;
    wake();
  }

  function texture(source, premultipliedAlpha = false) {
    if (source instanceof HTMLCanvasElement) source.getContext('2d');
    const value = device.createTexture({ size: [source.width, source.height], format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    device.queue.copyExternalImageToTexture({ source }, { texture: value, premultipliedAlpha }, [source.width, source.height]);
    return value;
  }

  try {
    if (!navigator.gpu) throw new Error('WebGPU unavailable; using Canvas2D');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
    if (!adapter) throw new Error('WebGPU adapter unavailable; using Canvas2D');
    adapterInfo = { vendor: adapter.info?.vendor, architecture: adapter.info?.architecture,
      device: adapter.info?.device, description: adapter.info?.description,
      isFallbackAdapter: adapter.info?.isFallbackAdapter ?? adapter.isFallbackAdapter ?? null };
    device = await adapter.requestDevice();
    const ownedDevice = device;
    device.pushErrorScope('validation');
    const [worldSource, lensSource] = await Promise.all([shader('world.wgsl'), shader('lens.wgsl')]);
    const worldModule = device.createShaderModule({ code: worldSource + TRACTOR_GROUND_WGSL, label: 'Rectangular atlas world' });
    const format = navigator.gpu.getPreferredCanvasFormat();
    pipeline = await device.createRenderPipelineAsync({ layout: 'auto',
      vertex: { module: worldModule, entryPoint: 'vs_main' },
      fragment: { module: worldModule, entryPoint: 'fs_main', targets: [{ format: 'rgba16float' }, { format: 'r16float' }] },
      primitive: { topology: 'triangle-list' } });
    uniform = device.createBuffer({ size: uniformData.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    sampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    borderSampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear', addressModeU: 'mirror-repeat', addressModeV: 'mirror-repeat' });
    artTexture = texture(art);
    borderTexture = texture(borderImage);
    const blank = document.createElement('canvas');
    blank.width = blank.height = 1;
    depthTexture = texture(depth || blank);
    overlayTexture = texture(overlayCanvas || blank, true);
    spriteTexture = texture(occlusion.canvas, true);
    spriteAllocations++;
    spriteRevision = occlusion.revision;
    groundTexture = texture(occlusion.ground);
    bannerTexture = texture(blank, true);
    bannerDepthTexture = texture(blank);
    sceneryTexture = device.createTexture({ size: [1, 1, 1], format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    sceneryMaskTexture = texture(blank);
    lens = await createLens({ device, source: lensSource, format, sampler });
    lens.setStrength(bokehStrength);
    const validation = await device.popErrorScope();
    if (validation) throw new Error(validation.message);
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU canvas context unavailable');
    context.configure({ device, format, alphaMode: 'premultiplied' });
    backend = 'webgpu';
    canvas.dataset.renderer = backend;
    canvas.dataset.dof = depth ? 'on' : 'off';
    device.addEventListener('uncapturederror', event => {
      if (!destroyed && device === ownedDevice) useFallback(new Error(event.error.message));
    });
    device.lost.then(info => {
      if (!destroyed && device === ownedDevice) useFallback(new Error(`WebGPU device lost: ${info.message || info.reason}`));
    });
  } catch (error) {
    useFallback(error);
  }

  function dimensions() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const max = device?.limits.maxTextureDimension2D || 8192;
    const fit = Math.min(ratio, max / camera.width, max / camera.height,
      Math.sqrt(2000000 / (camera.width * camera.height)));
    const width = Math.max(1, Math.floor(camera.width * fit));
    const height = Math.max(1, Math.floor(camera.height * fit));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return { width, height };
  }

  function drawFallback(width, height) {
    if (fallbackCanvas.width !== width) fallbackCanvas.width = width;
    if (fallbackCanvas.height !== height) fallbackCanvas.height = height;
    const ctx = fallbackContext;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const sx = width / camera.width, sy = height / camera.height;
    ctx.setTransform(sx * camera.scale, 0, 0, sy * camera.scale,
      sx * (camera.width / 2 - camera.x * camera.scale), sy * (camera.height / 2 - camera.y * camera.scale));
    ctx.fillStyle = borderPattern || BORDER_COLOR;
    ctx.fillRect(camera.x - camera.width / (2 * camera.scale), camera.y - camera.height / (2 * camera.scale),
      camera.width / camera.scale, camera.height / camera.scale);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); ctx.clip();
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.drawImage(art, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    if (overlayCanvas) ctx.drawImage(overlayCanvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    for (const { slot, member } of orderedSprites()) {
      const cell = SPRITE_SIZE * occlusion.rasterScale;
      if (member?.ready) ctx.drawImage(occlusion.canvas, slot * cell, 0, cell, cell,
        member.x, member.y, SPRITE_SIZE, SPRITE_SIZE);
    }
    ctx.restore();
    if (fallbackCanvas !== canvas) {
      canvas.style.backgroundImage = `url("${fallbackCanvas.toDataURL()}")`;
      canvas.style.backgroundSize = '100% 100%';
    }
    needsFrame = false;
  }

  function draw(now) {
    raf = 0;
    if (destroyed || suspended || document.hidden) return;
    // A DOF RAF may precede the controller in this display frame. Keep its latest
    // camera/overlay state for the next RAF instead of submitting a second pass.
    if (now === lastDrawTime) { wake(); return; }
    lastDrawTime = now;
    const { width, height } = dimensions();
    try {
      // Legacy painters cannot recover a cleared canvas while paused.
      if (typeof occlusion.onRasterScaleChange === 'function') {
        resizeSpriteRaster(occlusion, spriteRasterScale(camera.scale * (window.devicePixelRatio || 1), occlusion.rasterScale));
      }
      if (backend === 'canvas2d') {
        drawFallback(width, height);
      } else {
        if (overlayCanvas && overlayDirty && overlayCanvas.width && overlayCanvas.height) {
          if (overlayTexture.width !== overlayCanvas.width || overlayTexture.height !== overlayCanvas.height) {
            overlayTexture.destroy();
            overlayTexture = texture(overlayCanvas, true);
          } else device.queue.copyExternalImageToTexture({ source: overlayCanvas },
            { texture: overlayTexture, premultipliedAlpha: true }, [overlayCanvas.width, overlayCanvas.height]);
          overlayDirty = false;
          overlayUploads++;
        }
        const spriteWidth = occlusion.canvas.width, spriteHeight = occlusion.canvas.height;
        if (spriteRevision !== occlusion.revision || spriteTexture.width !== spriteWidth || spriteTexture.height !== spriteHeight) {
          if (spriteTexture.width !== spriteWidth || spriteTexture.height !== spriteHeight) {
            const next = texture(occlusion.canvas, true);
            spriteTexture.destroy();
            spriteTexture = next;
            spriteAllocations++;
          } else device.queue.copyExternalImageToTexture({ source: occlusion.canvas },
            { texture: spriteTexture, premultipliedAlpha: true }, [spriteWidth, spriteHeight]);
          spriteRevision = occlusion.revision;
          spriteUploads++;
        }
        bannerReady = Boolean(bannerLayer?.ready && bannerLayer.canvas?.width && bannerLayer.canvas?.height
          && bannerLayer.depthCanvas?.width && bannerLayer.depthCanvas?.height);
        if (bannerReady && bannerRevision !== bannerLayer.revision) {
          const upload = (source, old, premultipliedAlpha) => {
            if (old.width !== source.width || old.height !== source.height) {
              const next = texture(source, premultipliedAlpha); old.destroy(); return next;
            }
            device.queue.copyExternalImageToTexture({ source }, { texture: old, premultipliedAlpha }, [source.width, source.height]);
            return old;
          };
          bannerTexture = upload(bannerLayer.canvas, bannerTexture, true);
          bannerDepthTexture = upload(bannerLayer.depthCanvas, bannerDepthTexture, false);
          bannerRevision = bannerLayer.revision;
          bannerUploads++;
        }
        uploadVideo();
        if (sceneryTime !== null && animate && scenery?.kind === 'frames') {
          sceneryElapsed = (sceneryElapsed + Math.min(100, Math.max(0, now - sceneryTime))) % scenery.duration;
        }
        sceneryTime = now;
        const phase = scenery?.kind === 'frames' ? sceneryElapsed / scenery.duration * scenery.count : 0;
        const encoder = device.createCommandEncoder();
        const dofEnabled = enabled && Boolean(depth);
        const state = lens.frame({ width, height, viewport: [camera.width, camera.height],
          focusDepth: Math.max(0, Math.min(1, (focusDepth ?? miniatureGroundDepth(focus[1])) + focusOffset)),
          enabled: dofEnabled, now, highlights });
        uniformData.set([camera.x, camera.y, camera.width, camera.height, WORLD_WIDTH, WORLD_HEIGHT,
          camera.scale, state.focus, bokehStrength, bannerReady ? 1 : 0, BORDER_TILE_SIZE, occlusion.ready ? 1 : 0,
          occlusion.x, occlusion.y, SPRITE_SIZE, SPRITE_SIZE,
          tractorGroundDepth(occlusion.x + occlusion.anchor[0], occlusion.footY, groundDepth(occlusion.footY)),
          depth && occlusionEnabled ? 1 : 0, OCCLUSION_BIAS, OCCLUSION_FEATHER,
          scenery ? 1 : 0, phase, scenery?.count || 1, scenery?.kind === 'video' ? 1 : 0.35,
          miniatureGroundDepth(occlusion.footY), Number.isFinite(bannerLayer?.lensDepth) ? bannerLayer.lensDepth : -1,
          spriteCount, groundDepth(occlusion.footY)]);
        orderedSprites().forEach(({ slot, member, orderDepth }, index) => {
          const x = member?.x ?? 0, y = member?.y ?? 0, footY = member?.footY ?? 0;
          uniformData.set([x, y, SPRITE_SIZE, SPRITE_SIZE,
            tractorGroundDepth(x + (member?.anchor?.[0] ?? 64), footY, orderDepth),
            miniatureGroundDepth(footY), orderDepth, member?.ready ? 1 : 0,
            slot / spriteCount, 1 / spriteCount, 0, 0], 28 + index * 12);
        });
        if (!uniformWritten || uniformData.some((value, i) => value !== previousUniform[i])) {
          device.queue.writeBuffer(uniform, 0, uniformData);
          previousUniform.set(uniformData); uniformWritten = true;
        }
        const textures = [artTexture, bannerTexture, bannerDepthTexture, depthTexture, overlayTexture,
          borderTexture, spriteTexture, groundTexture, sceneryTexture, sceneryMaskTexture];
        if (!bindGroup || textures.some((value, i) => value !== boundTextures[i])) {
          const view = value => {
            if (!textureViews.has(value)) textureViews.set(value, value.createView());
            return textureViews.get(value);
          };
          bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: uniform } },
            ...textures.slice(0, 5).map((value, index) => ({ binding: index + 1, resource: view(value) })),
            { binding: 6, resource: sampler },
            { binding: 7, resource: view(borderTexture) },
            { binding: 8, resource: borderSampler },
            { binding: 9, resource: view(spriteTexture) },
            { binding: 10, resource: view(groundTexture) },
            { binding: 11, resource: sceneryTexture.createView({ dimension: '2d-array' }) },
            { binding: 12, resource: view(sceneryMaskTexture) }
          ] });
          boundTextures = textures;
        }
        const pass = encoder.beginRenderPass({ label: 'Unified atlas color and depth', colorAttachments: state.attachments });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        lens.encode(encoder, context.getCurrentTexture().createView(), dofEnabled);
        device.queue.submit([encoder.finish()]);
        needsFrame = state.needsFrame;
        const dof = dofEnabled && bokehStrength > 0 ? 'on' : 'off';
        if (canvas.dataset.dof !== dof) canvas.dataset.dof = dof;
      }
      draws++;
      dirty = false;
      if (needsFrame) wake();
    } catch (error) {
      if (backend === 'webgpu') useFallback(error);
      else report(error);
    }
  }

  function visibility() {
    syncVideo();
    if (document.hidden || suspended) { cancelAnimationFrame(raf); raf = 0; sceneryTime = null; }
    else if (dirty || needsFrame) wake();
  }
  document.addEventListener('visibilitychange', visibility);

  const api = {
    render(snapshot, options = {}) {
      if (destroyed) return false;
      if (snapshot) {
        for (const key of ['x', 'y', 'scale', 'width', 'height']) {
          if (!Number.isFinite(snapshot[key])) throw new TypeError(`Invalid camera.${key}`);
        }
        if (snapshot.scale <= 0 || snapshot.width <= 0 || snapshot.height <= 0) throw new RangeError('Camera scale and viewport must be positive');
        camera = { ...snapshot };
      }
      if (options.focus && options.focus.length === 2 && options.focus.every(Number.isFinite)) focus = [...options.focus];
      if (Object.hasOwn(options, 'focusDepth')) {
        if (options.focusDepth !== null && !Number.isFinite(options.focusDepth)) throw new TypeError('focusDepth must be finite or null');
        focusDepth = options.focusDepth === null ? null : Math.max(0, Math.min(1, options.focusDepth));
      }
      if (typeof options.animate === 'boolean') {
        if (animate !== options.animate) sceneryTime = null;
        animate = options.animate;
        syncVideo();
      }
      if (typeof options.dof === 'boolean') enabled = options.dof;
      if (options.overlayDirty !== false && (options.overlayVersion === undefined || options.overlayVersion !== overlayVersion)) overlayDirty = true;
      if (options.overlayVersion !== undefined) overlayVersion = options.overlayVersion;
      dirty = true;
      // The controller already runs on RAF; submit in that frame without a second RAF.
      if (Number.isFinite(options.now)) { cancelAnimationFrame(raf); raf = 0; draw(options.now); }
      else wake();
      return needsFrame;
    },
    resize(width = canvas.clientWidth, height = canvas.clientHeight) {
      if (width > 0 && height > 0) api.render({ ...camera, width, height }, { overlayDirty: false });
    },
    setDof(value) { enabled = Boolean(value); dirty = true; wake(); },
    setBokehStrength(value) {
      if (!Number.isFinite(value)) throw new TypeError('Bokeh strength must be finite');
      if (value < 0 || value > 4) throw new RangeError('Bokeh strength must be between 0 and 4');
      bokehStrength = value;
      lens?.setStrength(value);
      wake();
    },
    setLensOptions(options = {}) {
      for (const [key, lo, hi] of [['focusOffset', -0.25, 0.25], ['highlights', 0, 2]]) {
        if (options[key] !== undefined && (!Number.isFinite(options[key]) || options[key] < lo || options[key] > hi)) {
          throw new RangeError(`${key} must be between ${lo} and ${hi}`);
        }
      }
      if (options.focusOffset !== undefined) focusOffset = options.focusOffset;
      if (options.highlights !== undefined) highlights = options.highlights;
      wake();
    },
    sampleDepth(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('Depth coordinates must be finite');
      return lookup([x, y]);
    },
    sampleLensDepth(x, y) {
      return lensDepthV2(api.sampleDepth(x, y), y / WORLD_HEIGHT);
    },
    sampleNormal(x, y) {
      const slope = 0.75 * WORLD_HEIGHT / 12;
      const dx = (api.sampleLensDepth(x + 6, y) - api.sampleLensDepth(x - 6, y)) * slope;
      const dy = (api.sampleLensDepth(x, y + 6) - api.sampleLensDepth(x, y - 6)) * slope;
      const length = Math.hypot(dx, dy, 1);
      return [dx / length, -dy / length, 1 / length];
    },
    setBannerLayer(layer) {
      if (destroyed) return false;
      if (layer !== bannerLayer) bannerRevision = Symbol('unuploaded');
      bannerLayer = layer || null;
      wake();
      return backend === 'webgpu';
    },
    setSceneryVideo(source) {
      if (destroyed || backend !== 'webgpu') {
        source?.setActive(false);
        return false;
      }
      if (source && (!source.video || typeof source.setActive !== 'function' || typeof source.destroy !== 'function')) {
        throw new TypeError('Scenery video requires video, setActive and destroy');
      }
      if (source && source === sceneryVideo) { syncVideo(); return true; }
      api.setSceneryFrames(null);
      sceneryElapsed = 0;
      sceneryVideo = source || null;
      syncVideo();
      wake();
      return true;
    },
    updateSceneryVideo() {
      if (!sceneryVideo || !videoActive || destroyed || suspended || document.hidden || !animate) return false;
      videoRevision = videoRevision >= Number.MAX_SAFE_INTEGER ? 1 : videoRevision + 1;
      videoDirty = true;
      wake();
      return true;
    },
    setSceneryFrames(value) {
      if (destroyed || backend !== 'webgpu') return false;
      if (!value) {
        const blank = document.createElement('canvas'); blank.width = blank.height = 1;
        const next = texture(blank), nextMask = texture(blank);
        sceneryTexture.destroy(); sceneryMaskTexture.destroy();
        sceneryTexture = next; sceneryMaskTexture = nextMask;
        releaseVideo();
        scenery = null; sceneryTime = null; wake(); return true;
      }
      const { frames, mask, duration = 12000 } = value;
      if (!Array.isArray(frames) || !frames.length || !Number.isFinite(duration) || duration <= 0) {
        throw new TypeError('Scenery requires frames and positive duration');
      }
      const width = frames[0].naturalWidth || frames[0].width, height = frames[0].naturalHeight || frames[0].height;
      if (!width || !height || frames.length > device.limits.maxTextureArrayLayers ||
        frames.some(frame => (frame.naturalWidth || frame.width) !== width || (frame.naturalHeight || frame.height) !== height)) {
        throw new RangeError('Scenery frames must have matching nonzero dimensions');
      }
      let next, nextMask;
      try {
        next = device.createTexture({ size: [width, height, frames.length], format: 'rgba8unorm',
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
        frames.forEach((source, index) => device.queue.copyExternalImageToTexture({ source },
          { texture: next, origin: [0, 0, index] }, [width, height]));
        if (mask) nextMask = texture(mask);
        else {
          const white = document.createElement('canvas'); white.width = white.height = 1;
          const ctx = white.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1, 1);
          nextMask = texture(white);
        }
      } catch (error) { next?.destroy(); nextMask?.destroy(); throw error; }
      releaseVideo();
      sceneryTexture.destroy(); sceneryMaskTexture.destroy();
      sceneryTexture = next; sceneryMaskTexture = nextMask;
      scenery = { kind: 'frames', count: frames.length, duration, width, height,
        textureBytes: width * height * frames.length * 4 + nextMask.width * nextMask.height * 4 };
      sceneryElapsed = 0; sceneryTime = null; sceneryUploads = Math.min(Number.MAX_SAFE_INTEGER, sceneryUploads + frames.length);
      wake();
      return true;
    },
    setOcclusion(value) { occlusionEnabled = Boolean(value); wake(); },
    suspend(value) { suspended = Boolean(value); sceneryTime = null; visibility(); },
    get backend() { return backend; },
    get stats() { return { backend, adapter: adapterInfo, draws, overlayUploads, spriteUploads, needsFrame: needsFrame || dirty,
      world: [WORLD_WIDTH, WORLD_HEIGHT], pixels: canvas.width * canvas.height,
      bokehStrength, dof: lens ? { ...lens.stats, focusOffset, highlights } : null,
      banner: { ready: bannerReady, uploads: bannerUploads, revision: bannerLayer?.revision ?? null },
      scenery: { ready: Boolean(scenery), frames: scenery?.count || 0, uploads: sceneryUploads,
        kind: sceneryVideo ? 'video' : scenery?.kind || 'static',
        width: scenery?.width || 0, height: scenery?.height || 0,
        media: sceneryVideo?.stats ?? null, revision: videoRevision,
        uploadedRevision: videoUploadedRevision, mediaTime: videoUploadedTime,
        phase: scenery?.kind === 'frames' ? sceneryElapsed / scenery.duration : 0, animate,
        textureBytes: scenery?.textureBytes || 0 },
      occlusion: { available: backend === 'webgpu' && Boolean(depth),
        enabled: backend === 'webgpu' && Boolean(depth) && occlusionEnabled,
        approximate: true, model: 'calibrated-ground-y', spriteReady: occlusion.ready,
        spriteCount, memberReady: orderedSprites().filter(({ member }) => member?.ready).length,
        rasterScale: occlusion.rasterScale, rasterRevision: occlusion.rasterRevision,
        spriteWidth: occlusion.canvas.width, spriteHeight: occlusion.canvas.height, spriteAllocations,
        extraTextureBytes: backend === 'webgpu' ? (occlusion.canvas.width * occlusion.canvas.height + WORLD_HEIGHT) * 4 : 0 } }; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', visibility);
      releaseGpu();
      overlayCanvas?.atlasSetSpriteLayer?.(null);
      occlusion.canvas.width = occlusion.canvas.height = occlusion.ground.height = 1;
      if (fallbackCanvas && fallbackCanvas !== canvas) fallbackCanvas.width = fallbackCanvas.height = 1;
      canvas.style.backgroundImage = oldBackground;
      canvas.style.backgroundSize = oldBackgroundSize;
      canvas.dataset.renderer = 'destroyed';
      canvas.dataset.dof = 'off';
    }
  };
  overlayCanvas?.atlasSetSpriteLayer?.(occlusion);
  wake();
  return api;
}

export const create = createRenderer;
export default { create: createRenderer, createRenderer };
