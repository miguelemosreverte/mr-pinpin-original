const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rendererPath = path.join(__dirname, '../docs/storyboard/gpu/renderer.js');
const source = fs.readFileSync(rendererPath, 'utf8')
  .replace(/^import .*;$/gm, '')
  .replace(/import\.meta\.url/g, JSON.stringify('file://' + rendererPath))
  .replace(/^export default .*;$/gm, '')
  .replace(/^export /gm, '');

async function harness({ gpu = true, spriteCount = 1, dpr = 2, objectFailure = false } = {}) {
  const raf = new Map(), events = new Map(), textures = [], copies = [], uniforms = [], errors = [], passes = [];
  let serial = 0, now = 0, lose, submissions = 0, lensPasses = 0, failVideoCopy = false;
  const spriteDraws = [];
  const ctx = {
    fillRect() {}, setTransform() {}, clearRect() {}, save() {}, restore() {},
    beginPath() {}, rect() {}, clip() {}, createPattern: () => ({ setTransform() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {},
    drawImage(...args) { spriteDraws.push(args); }
  };
  const gpuContext = { configure() {}, unconfigure() {}, getCurrentTexture: () => ({ createView: () => ({}) }) };
  class Canvas {
    width = 1; height = 1; clientWidth = 1536; clientHeight = 1024; style = {}; dataset = {};
    getContext(kind) { return kind === 'webgpu' ? gpuContext : ctx; }
    dispatchEvent() {}
    toDataURL() { return 'data:image/png;base64,'; }
  }
  const device = {
    limits: { maxTextureDimension2D: 8192, maxTextureArrayLayers: 256 },
    lost: new Promise(resolve => { lose = resolve; }),
    pushErrorScope() {}, popErrorScope: async () => null, addEventListener() {}, destroy() {},
    createShaderModule: () => ({}), createRenderPipelineAsync: async () => ({ getBindGroupLayout() {} }),
    createBuffer: () => ({ destroy() {} }), createSampler: () => ({}), createBindGroup: value => value,
    createTexture(options) {
      const value = { width: options.size[0], height: options.size[1], layers: options.size[2] || 1,
        destroyed: false, createView: options => ({ texture: value, ...options }), destroy() { this.destroyed = true; } };
      textures.push(value);
      return value;
    },
    createCommandEncoder: () => ({
      beginRenderPass(options) {
        passes.push(options);
        return { setPipeline() {}, setBindGroup() {}, draw() {}, end() {} };
      },
      finish() {}
    }),
    queue: {
      copyExternalImageToTexture(from, to, size) {
        if (from.source.videoWidth && failVideoCopy) throw new Error('Video copy failed');
        copies.push({ source: from.source, texture: to.texture, size: Array.from(size) });
      },
      writeBuffer(_, __, data) { uniforms.push(Array.from(data)); },
      submit() { submissions++; }
    }
  };
  const document = { hidden: false, createElement: () => new Canvas(),
    addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) };
  const context = vm.createContext({
    URL, console, document, window: { devicePixelRatio: dpr }, HTMLCanvasElement: Canvas,
    Image: class { width = 1536; height = 1024; naturalWidth = 1536; naturalHeight = 1024; async decode() {} },
    CustomEvent: class {}, DOMMatrix: class { scale() { return this; } },
    navigator: { gpu: gpu ? { requestAdapter: async () => ({ requestDevice: async () => device }),
      getPreferredCanvasFormat: () => 'bgra8unorm' } : null },
    GPUTextureUsage: { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 },
    GPUBufferUsage: { UNIFORM: 1, COPY_DST: 2 },
    fetch: async () => ({ ok: true, text: async () => '' }),
    requestAnimationFrame(fn) { raf.set(++serial, fn); return serial; },
    cancelAnimationFrame: id => raf.delete(id),
    depthLookup: () => () => 0.5, groundDepthV2: y => y, lensDepthV2: d => d, groundDepth: () => 0.5,
    loadObjectOcclusion: async () => { if (objectFailure) throw Error('Object texture unavailable'); return {}; },
    uploadObjectOcclusion: () => ({ instances:device.createTexture({size:[1,1]}),
      ground:device.createTexture({size:[1,1]}),bytes:8 }),
    createLens: async () => ({ setStrength() {}, destroy() {}, stats: {},
      frame: () => ({ focus: 0.5, attachments: [{ color: true }, { depth: true }], needsFrame: false }),
      encode() { lensPasses++; } })
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../docs/storyboard/gpu/occlusion.js'), 'utf8')
    .replace(/^export /gm, ''), context);
  vm.runInContext(source, context);
  const canvas = new Canvas();
  const overlayCanvas = new Canvas();
  overlayCanvas.dataset.family = String(spriteCount === 3);
  let layer;
  overlayCanvas.atlasSetSpriteLayer = value => { layer = value; };
  const renderer = await context.createRenderer({ canvas, artSrc: 'art.webp', depthSrc: 'depth.webp',
    overlayCanvas, borderSrc: null, onError: error => errors.push(error) });
  return {
    renderer, canvas, raf, textures, copies, uniforms, errors, passes, layer, spriteDraws,
    get submissions() { return submissions; }, get lensPasses() { return lensPasses; },
    frame() {
      now += 1000 / 60;
      const pending = [...raf.values()]; raf.clear(); pending.forEach(fn => fn(now));
    },
    render(options = {}) { now += 1000 / 60; renderer.render(null, { now, overlayDirty: false, ...options }); },
    hide(hidden) { document.hidden = hidden; events.get('visibilitychange')?.(); },
    async lose() { lose({ reason: 'unknown', message: 'test loss' }); await Promise.resolve(); },
    failCopy() { failVideoCopy = true; }
  };
}

function media(width = 1536, height = 1024) {
  const active = [];
  return { video: { videoWidth: width, videoHeight: height, readyState: 2, currentTime: 0, seeking: false },
    active, destroyed: 0, setActive(value) { active.push(value); }, destroy() { this.destroyed++; },
    get stats() { return { active: active.at(-1), paused: !active.at(-1), currentTime: this.video.currentTime, decodedFrames: 7 }; } };
}

test('hybrid occlusion mode is reported; missing data is surfaced without losing WebGPU', async () => {
  for (const objectFailure of [false, true]) {
    const h = await harness({ objectFailure });
    h.layer.ready = true; h.render();
    assert.equal(h.renderer.backend, 'webgpu');
    assert.equal(h.renderer.stats.occlusion.state, objectFailure ? 'failed' : 'ready');
    assert.equal(h.renderer.stats.occlusion.available, !objectFailure);
    assert.equal(h.renderer.stats.occlusion.model, 'hybrid-profile-canopy-v2');
    assert.equal(h.uniforms.at(-1)[16], objectFailure ? 0 : 1, 'semantic character ordering flag');
    assert.equal(h.uniforms.at(-1)[17], 1, 'banner retains its legacy ordering regardless of semantic data');
    if (objectFailure) assert.match(h.errors[0].message, /Object texture unavailable/);
    else assert.deepEqual(h.errors, []);
    h.renderer.setOcclusion(false); h.render();
    assert.equal(h.uniforms.at(-1)[16], 0);
    assert.equal(h.uniforms.at(-1)[17], 0);
    h.renderer.destroy();
  }
});

test('each family member supplies its own legacy ground depth for canopy comparison',async()=>{
  const h=await harness({spriteCount:3}),ys=[400,700,900];
  h.layer.ready=true;
  for(const [i,member] of h.layer.members.entries()) {
    member.x=100+i*150;member.y=ys[i]-112;member.footY=ys[i];member.ready=true;
  }
  h.render();
  const values=h.uniforms.at(-1),depths=[];
  const legacy=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(__dirname,'../docs/storyboard/gpu/occlusion.js'),'utf8')).toString('base64'));
  for(let i=0;i<3;i++) {
    const start=28+i*12,footY=values[start+11],depth=values[start+6];
    assert(Math.abs(depth-legacy.groundDepth(footY))<1e-6);depths.push(depth);
  }
  assert.equal(new Set(depths).size,3);h.renderer.destroy();
});

test('zoom reallocates sprite textures only for new raster tiers, releasing old textures with fixed world bounds', async () => {
  for (const spriteCount of [1, 3]) {
    const h = await harness({ spriteCount, dpr: 1 });
    let paints = 0;
    h.layer.onRasterScaleChange = layer => {
      paints++; layer.ready = true;
      for (const member of layer.members || [layer]) member.ready = true;
      layer.revision++;
    };
    const render = scale => h.renderer.render({ x: 600, y: 400, scale, width: 800, height: 600 }, { overlayDirty: false });
    render(0.7); h.frame();
    const initial = h.copies.find(copy => copy.source === h.layer.canvas).texture;
    render(2); h.frame();
    assert.equal(initial.destroyed, true);
    assert.equal(paints, 1);
    assert.equal(h.renderer.stats.occlusion.spriteAllocations, 2);
    const at2 = h.copies.filter(copy => copy.source === h.layer.canvas).at(-1).texture;
    assert.equal(at2.width, 256 * spriteCount);
    assert.equal(at2.height, 256);
    const allocations = h.textures.length;
    for (let i = 0; i < 100; i++) { render(i % 2 ? 0.9 : 1.1); h.frame(); }
    assert.equal(h.textures.length, allocations);
    assert.equal(paints, 1);
    render(3); h.frame();
    assert.equal(at2.destroyed, true);
    const at4 = h.copies.filter(copy => copy.source === h.layer.canvas).at(-1).texture;
    assert.equal(at4.width, 512 * spriteCount);
    assert.equal(at4.height, 512);
    for (let i = 0; i < spriteCount; i++) assert.deepEqual(h.uniforms.at(-1).slice(30 + i * 12, 32 + i * 12), [128,128]);
    render(0.6); h.frame();
    assert.equal(at4.destroyed, true);
    assert.equal(h.renderer.stats.occlusion.rasterScale, 1);
    assert.equal(h.renderer.stats.occlusion.memberReady, spriteCount);
    assert.equal(h.renderer.stats.occlusion.spriteAllocations, 4);
    assert.deepEqual(h.errors, []);
    const last = h.copies.filter(copy => copy.source === h.layer.canvas).at(-1).texture;
    h.renderer.destroy();
    assert.equal(last.destroyed, true);
  }
});

test('Canvas2D fallback crops physical atlas cells into unchanged world quads', async () => {
  const h = await harness({ gpu: false, spriteCount: 3, dpr: 3 });
  h.layer.onRasterScaleChange = layer => {
    layer.ready = true;
    layer.members.forEach((member, i) => Object.assign(member, { ready: true, x: i * 150, y: 100 }));
  };
  h.renderer.render({ x: 600, y: 400, scale: 2, width: 390, height: 844 }); h.frame();
  const draws = h.spriteDraws.filter(args => args[0] === h.layer.canvas);
  assert.equal(draws.length, 3);
  draws.forEach((args, i) => assert.deepEqual(args.slice(1), [i * 512, 0, 512, 512, i * 150, 100, 128, 128]));
  assert.equal(h.renderer.stats.occlusion.rasterScale, 4);
  h.renderer.destroy();
});

test('legacy painter stays intact until it registers synchronous raster invalidation', async () => {
  const h = await harness({ spriteCount: 3 });
  h.layer.ready = true;
  h.layer.members.forEach(member => { member.ready = true; });
  h.renderer.render({ x: 600, y: 400, scale: 8, width: 800, height: 600 }); h.frame();
  assert.equal(h.renderer.stats.occlusion.rasterScale, 1);
  assert.equal(h.renderer.stats.occlusion.spriteAllocations, 1);
  assert.equal(h.renderer.stats.occlusion.memberReady, 3);
  assert.equal(h.layer.revision, 0);
  assert.deepEqual(h.errors, []);
  h.renderer.destroy();
});

test('video waits for decoded data, then uses full strength in the unified scene and lens', async () => {
  const h = await harness(), m = media();
  m.video.readyState = 1;
  assert.equal(h.renderer.setSceneryVideo(m), true);
  h.renderer.updateSceneryVideo(); h.frame();
  assert.equal(h.renderer.stats.scenery.ready, false);
  assert.equal(h.uniforms.at(-1)[20], 0, 'Static art remains selected until a valid frame');
  m.video.readyState = 2;
  h.renderer.updateSceneryVideo(); h.frame();
  const stats = h.renderer.stats.scenery;
  assert.equal(stats.kind, 'video'); assert.equal(stats.ready, true);
  assert.equal(stats.width, 1536); assert.equal(stats.height, 1024);
  assert.equal(stats.textureBytes, 1536 * 1024 * 4 + 4);
  assert.equal(stats.media.active, true); assert.equal(stats.media.paused, false);
  assert.equal(stats.media.currentTime, 0);
  assert.deepEqual(h.uniforms.at(-1).slice(20, 24), [1, 0, 1, 1]);
  assert.equal(h.passes.at(-1).label, 'Unified atlas color and depth');
  assert.equal(h.passes.at(-1).colorAttachments.length, 2);
  assert.equal(h.lensPasses, h.submissions);
  assert(h.renderer.stats.pixels <= 2000000);
  h.renderer.destroy();
});

test('only decoded notifications upload, reusing one mobile texture across controller draws', async () => {
  const h = await harness(), m = media(1152, 768);
  h.renderer.setSceneryVideo(m); h.renderer.updateSceneryVideo(); h.render();
  assert.equal(h.raf.size, 0, 'Controller consumes the pending video RAF');
  const textureCount = h.textures.length, first = h.copies.find(copy => copy.source === m.video).texture;
  for (let i = 0; i < 120; i++) h.render();
  assert.equal(h.renderer.stats.scenery.uploads, 1);
  for (let i = 1; i <= 24; i++) {
    m.video.currentTime = i / 24;
    h.renderer.updateSceneryVideo(); h.render(); h.render();
  }
  assert.equal(h.renderer.stats.scenery.uploads, 25);
  assert.equal(h.textures.length, textureCount);
  assert(h.copies.filter(copy => copy.source === m.video).every(copy => copy.texture === first));
  assert.equal(first.layers, 1);
  assert.equal(h.renderer.stats.scenery.mediaTime, 1);
  assert.equal(h.renderer.stats.scenery.uploadedRevision, h.renderer.stats.scenery.revision);
  h.renderer.updateSceneryVideo(); h.renderer.updateSceneryVideo(); h.renderer.updateSceneryVideo(); h.render();
  assert.equal(h.renderer.stats.scenery.uploads, 26, 'Pending frames coalesce into the latest image');
  h.renderer.destroy();
});

test('video RAF retains the last controller camera and animate preference', async () => {
  const h = await harness(), m = media();
  h.renderer.setSceneryVideo(m);
  h.renderer.render({ x: 444, y: 333, scale: 1.5, width: 1152, height: 768 }, { now: 0, animate: true });
  h.renderer.updateSceneryVideo(); h.frame();
  assert.deepEqual(h.uniforms.at(-1).slice(0, 4), [444, 333, 1152, 768]);
  assert.equal(h.uniforms.at(-1)[6], 1.5);
  h.render({ animate: false });
  h.renderer.setDof(false); h.frame();
  assert.equal(h.renderer.stats.scenery.animate, false);
  assert.equal(h.renderer.stats.scenery.media.paused, true);
  assert.equal(h.renderer.stats.scenery.uploads, 1);
  h.renderer.destroy();
});

test('paused, hidden and preview-suspended video neither activates nor uploads', async () => {
  const h = await harness(), m = media();
  h.renderer.setSceneryVideo(m); h.renderer.updateSceneryVideo(); h.render();
  for (const mode of ['pause', 'hidden', 'preview']) {
    if (mode === 'pause') h.render({ animate: false });
    if (mode === 'hidden') h.hide(true);
    if (mode === 'preview') h.renderer.suspend(true);
    assert.equal(m.active.at(-1), false, mode);
    const uploads = h.renderer.stats.scenery.uploads;
    for (let i = 0; i < 10; i++) {
      assert.equal(h.renderer.updateSceneryVideo(), false); h.render(); h.frame();
    }
    assert.equal(h.renderer.stats.scenery.uploads, uploads, mode);
    assert.equal(h.raf.size, 0, mode);
    if (mode === 'pause') h.render({ animate: true });
    if (mode === 'hidden') h.hide(false);
    if (mode === 'preview') h.renderer.suspend(false);
    assert.equal(m.active.at(-1), true, mode);
    h.renderer.updateSceneryVideo(); h.render();
    assert.equal(h.renderer.stats.scenery.uploads, uploads + 1);
  }
  h.render({ animate: false }); h.hide(true); h.hide(false);
  h.renderer.suspend(true); h.renderer.suspend(false);
  assert.equal(m.active.at(-1), false, 'Visibility and preview restore preserve user pause');
  h.renderer.destroy();
});

test('attachment respects suspension; replacement and clearing release each source once', async () => {
  const h = await harness(), first = media(), second = media();
  h.renderer.suspend(true); h.renderer.setSceneryVideo(first);
  assert.deepEqual(first.active, [false]);
  h.renderer.suspend(false); h.renderer.updateSceneryVideo(); h.render();
  h.renderer.setSceneryVideo(first);
  assert.equal(first.destroyed, 0);
  const firstTexture = h.copies.find(copy => copy.source === first.video).texture;
  h.renderer.setSceneryVideo(second); h.render();
  assert.equal(firstTexture.destroyed, true);
  assert.equal(first.destroyed, 1); assert.equal(first.active.at(-1), false);
  assert.equal(h.renderer.stats.scenery.ready, false);
  assert.equal(h.uniforms.at(-1)[20], 0);
  h.renderer.updateSceneryVideo(); h.render();
  const secondTexture = h.copies.find(copy => copy.source === second.video).texture;
  h.renderer.setSceneryVideo(null); h.render();
  assert.equal(secondTexture.destroyed, true);
  assert.equal(second.destroyed, 1); assert.equal(second.active.at(-1), false);
  assert.equal(h.renderer.stats.scenery.kind, 'static');
  h.renderer.destroy(); h.renderer.destroy();
  assert.equal(second.destroyed, 1);
});

test('device loss and upload errors release video and use static Canvas2D fallback', async () => {
  for (const failure of ['loss', 'copy']) {
    const h = await harness(), m = media();
    h.renderer.setSceneryVideo(m); h.renderer.updateSceneryVideo(); h.render();
    if (failure === 'loss') await h.lose();
    else { h.failCopy(); h.renderer.updateSceneryVideo(); h.render(); }
    assert.equal(h.renderer.backend, 'canvas2d');
    assert.equal(m.active.at(-1), false); assert.equal(m.destroyed, 1);
    assert.equal(h.renderer.updateSceneryVideo(), false);
    h.frame();
    assert.equal(h.renderer.stats.scenery.ready, false);
    assert.equal(h.errors.length, 1);
    h.renderer.destroy(); assert.equal(m.destroyed, 1);
    assert(h.textures.every(texture => texture.destroyed));
  }
});

test('fallback rejects ownership and renderer destruction stops the attached source', async () => {
  const fallback = await harness({ gpu: false }), rejected = media();
  assert.equal(fallback.renderer.setSceneryVideo(rejected), false);
  assert.deepEqual(rejected.active, [false]); assert.equal(rejected.destroyed, 0);
  fallback.renderer.destroy();
  const h = await harness(), m = media();
  h.renderer.setSceneryVideo(m); h.renderer.updateSceneryVideo(); h.render(); h.renderer.destroy();
  assert.equal(m.active.at(-1), false); assert.equal(m.destroyed, 1);
  assert.equal(h.raf.size, 0); assert.equal(h.renderer.updateSceneryVideo(), false);
  h.hide(false); assert.equal(m.active.at(-1), false);
  assert(h.textures.every(texture => texture.destroyed));
});

test('legacy frames still blend at 0.35 and can replace or be replaced by video', async () => {
  const h = await harness(), m = media();
  h.renderer.setSceneryVideo(m);
  h.renderer.setSceneryFrames({ frames: [{ width: 512, height: 342 }, { width: 512, height: 342 }] });
  h.render();
  assert.equal(m.destroyed, 1); assert.equal(h.renderer.stats.scenery.kind, 'frames');
  assert.equal(h.renderer.stats.scenery.frames, 2);
  assert(Math.abs(h.uniforms.at(-1)[23] - 0.35) < 1e-6);
  const next = media(); h.renderer.setSceneryVideo(next); h.renderer.updateSceneryVideo(); h.render();
  assert.deepEqual(h.uniforms.at(-1).slice(20, 24), [1, 0, 1, 1]);
  h.renderer.setSceneryFrames(null); h.render();
  assert.equal(next.destroyed, 1); assert.equal(h.uniforms.at(-1)[20], 0);
  assert.equal(h.renderer.stats.scenery.kind, 'static');
  h.renderer.destroy();
});
