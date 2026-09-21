const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.env.READER_URL || 'http://127.0.0.1:8767/storyboard/';

async function synthetic(browser) {
  const page = await browser.newPage({ viewport: { width: 768, height: 512 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/occlusion-probe.html', route => route.fulfill({ contentType: 'text/html', body:
    '<style>body{margin:0}canvas{width:768px;height:512px;display:block}</style><canvas id="world"></canvas>' }));
  await page.goto(base + 'occlusion-probe.html');
  const result = await page.evaluate(async () => {
    const { createRenderer } = await import('./gpu/renderer.js');
    const { groundDepth } = await import('./gpu/occlusion.js');
    const make = () => { const c = document.createElement('canvas'); c.width = 1536; c.height = 1024; return c; };
    const art = make(), depth = make(), overlay = make();
    art.getContext('2d').fillStyle = '#204060'; art.getContext('2d').fillRect(0, 0, 1536, 1024);
    const dc = depth.getContext('2d');
    for (let y = 0; y < 1024; y++) { const d = Math.round(groundDepth(y) * 255); dc.fillStyle = `rgb(${d},${d},${d})`; dc.fillRect(0, y, 1536, 1); }
    dc.fillStyle = '#101010'; dc.fillRect(400, 530, 100, 40);
    const minor = Math.round((groundDepth(550) - 0.08) * 255);
    dc.fillStyle = `rgb(${minor},${minor},${minor})`; dc.fillRect(600, 540, 100, 20);
    dc.fillStyle = '#000'; dc.fillRect(640, 550, 1, 1);
    const oc = overlay.getContext('2d'); oc.strokeStyle = '#fff'; oc.lineWidth = 6;
    oc.setLineDash([10, 6]); oc.beginPath(); oc.moveTo(380, 550); oc.lineTo(750, 550); oc.stroke();
    overlay.atlasSetSpriteLayer = layer => {
      if (!layer) return;
      layer.x = 450 - layer.anchor[0]; layer.y = 600 - layer.anchor[1]; layer.footY = 600; layer.ready = true;
      const ctx = layer.canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(layer.anchor[0] - 10, layer.anchor[1] - 80, 20, 80);
      layer.revision++;
    };
    const renderer = await createRenderer({ canvas: document.querySelector('#world'), artSrc: art.toDataURL(), depthSrc: depth.toDataURL(), overlayCanvas: overlay, borderSrc: null });
    window.probeRenderer = renderer;
    const camera = { x: 560, y: 560, scale: 2, width: 768, height: 512 };
    renderer.setDof(false);
    const read = async enabled => {
      renderer.setOcclusion(enabled); renderer.render(camera, { overlayDirty: false });
      await new Promise(resolve => setTimeout(resolve, 100));
      const c = document.createElement('canvas'); c.width = 768; c.height = 512;
      renderer.render(camera, { overlayDirty: false, now: performance.now() });
      const ctx = c.getContext('2d'); ctx.drawImage(document.querySelector('#world'), 0, 0);
      const sample = (x, y) => [...ctx.getImageData(Math.round(384 + (x - 560) * 2), Math.round(256 + (y - 560) * 2), 1, 1).data];
      return { head: sample(450, 550), feet: sample(450, 590), hiddenTrail: sample(481, 550), clearTrail: sample(643, 550), stats: renderer.stats };
    };
    const off = await read(false), on = await read(true);
    const strengths = [];
    for (const value of [0, 1, 4]) { renderer.setBokehStrength(value); strengths.push([renderer.stats.bokehStrength, renderer.stats.dof.strength]); }
    const invalid = [];
    for (const value of [-1, 4.1, NaN, Infinity, '2']) { try { renderer.setBokehStrength(value); invalid.push(false); } catch { invalid.push(true); } }
    renderer.suspend(true);
    const suspendedDraws = renderer.stats.draws;
    renderer.setBokehStrength(2); renderer.setOcclusion(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    const suspended = renderer.stats;
    renderer.suspend(false); await new Promise(resolve => setTimeout(resolve, 100));
    const resumed = renderer.stats;
    renderer.setOcclusion(true); await new Promise(resolve => setTimeout(resolve, 100));
    return { off, on, strengths, invalid, suspendedDraws, suspended, resumed };
  });
  assert.equal(result.on.stats.backend, 'webgpu');
  assert.equal(result.on.stats.occlusion.enabled, true);
  assert.equal(result.off.stats.occlusion.enabled, false);
  for (const [name, pixel] of Object.entries(result.off).slice(0, 4)) assert(pixel[0] > 240, `off reference ${name} must show white overlays: ${JSON.stringify(result)}`);
  assert(result.on.head[0] < 50, 'foreground must hide character head');
  assert(result.on.feet[0] > 240, 'exposed feet must remain visible');
  assert(result.on.hiddenTrail[0] < 50, 'foreground must hide dashed trail');
  assert(result.on.clearTrail[0] > 240, 'minor shading must preserve clear trail');
  assert.deepEqual(result.strengths, [[0, 0], [1, 1], [4, 4]]);
  assert(result.invalid.every(Boolean));
  assert.equal(result.suspended.draws, result.suspendedDraws);
  assert.equal(result.suspended.needsFrame, true);
  assert(result.resumed.draws > result.suspendedDraws);
  assert.equal(result.resumed.bokehStrength, 2);
  assert.equal(result.resumed.occlusion.enabled, false);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: '/tmp/pinpin-occlusion-synthetic-on.png' });
  await page.evaluate(() => probeRenderer.setOcclusion(false)); await page.waitForTimeout(100);
  await page.screenshot({ path: '/tmp/pinpin-occlusion-synthetic-off.png' });
  await page.close();
  return result;
}

async function realMap(browser, width, targetIndex = 7) {
  const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + 'atlas-webgpu.html?returnPlace=lake');
  await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.occlusion.spriteReady);
  await page.evaluate(targetIndex => {
    const d = atlasGpuDebug;
    if (d.motion.paused) d.motion.toggle();
    d.motion.placeAtLocation('lake');
    d.motion.setTarget(atlasGeometry.routes.find(r => r.id === 'lake-to-elder').points[targetIndex]);
  }, targetIndex);
  await page.waitForFunction(() => atlasGpuDebug.motionCanvas.dataset.arrived === 'true');
  await page.evaluate(() => {
    const d = atlasGpuDebug;
    if (!d.motion.paused) d.motion.toggle();
    d.camera.focus([Number(d.motionCanvas.dataset.x), Number(d.motionCanvas.dataset.y) - 12], 2.6);
  });
  await page.waitForTimeout(1700);
  const comparison = await page.evaluate(async () => {
    const d = atlasGpuDebug, canvas = document.querySelector('#world-canvas');
    const read = async value => {
      d.renderer.setOcclusion(value); await new Promise(resolve => setTimeout(resolve, 120));
      const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
      d.renderer.render(d.camera.snapshot, { overlayDirty: false, now: performance.now() });
      const ctx = c.getContext('2d'); ctx.drawImage(canvas, 0, 0);
      return ctx.getImageData(0, 0, c.width, c.height).data;
    };
    const off = await read(false), on = await read(true);
    let changed = 0, maxDelta = 0, spriteChanged = 0, spriteRetained = 0;
    for (let i = 0; i < on.length; i += 4) { const delta = Math.abs(off[i] - on[i]) + Math.abs(off[i + 1] - on[i + 1]) + Math.abs(off[i + 2] - on[i + 2]); if (delta > 15) changed++; maxDelta = Math.max(delta, maxDelta); }
    const layer = d.motion.spriteLayer, camera = d.camera.snapshot;
    const pixels = layer.canvas.getContext('2d').getImageData(0, 0, 128, 128).data;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      if (pixels[(y * 128 + x) * 4 + 3] < 200) continue;
      const sx = Math.floor((camera.width / 2 + (layer.x + x + .5 - camera.x) * camera.scale) * canvas.width / camera.width);
      const sy = Math.floor((camera.height / 2 + (layer.y + y + .5 - camera.y) * camera.scale) * canvas.height / camera.height);
      if (sx < 0 || sy < 0 || sx >= canvas.width || sy >= canvas.height) continue;
      const i = (sy * canvas.width + sx) * 4;
      const delta = Math.abs(off[i] - on[i]) + Math.abs(off[i + 1] - on[i + 1]) + Math.abs(off[i + 2] - on[i + 2]);
      if (delta > 15) spriteChanged++; else spriteRetained++;
    }
    return { changed, maxDelta, spriteChanged, spriteRetained, foot: [Number(d.motionCanvas.dataset.x), Number(d.motionCanvas.dataset.y)], camera, stats: d.renderer.stats };
  });
  assert.equal(comparison.stats.backend, 'webgpu');
  assert.equal(comparison.stats.occlusion.enabled, true);
  assert(comparison.changed > 50, 'real canopy overlap must visibly change pixels');
  assert(comparison.spriteChanged > 20, 'actual character pixels must be occluded on the real map');
  if (targetIndex === 9) assert(comparison.spriteRetained > 20, 'partial overlap must preserve exposed character pixels');
  const label = targetIndex === 9 ? 'partial' : 'tree';
  await page.screenshot({ path: `/tmp/pinpin-occlusion-${label}-${width}-on.png` });
  await page.evaluate(() => atlasGpuDebug.renderer.setOcclusion(false)); await page.waitForTimeout(120);
  await page.screenshot({ path: `/tmp/pinpin-occlusion-${label}-${width}-off.png` });
  assert.deepEqual(errors, []);
  await page.close();
  return { width, targetIndex, ...comparison, errors };
}

async function fallback(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
  await page.goto(base + 'atlas-webgpu.html?returnPlace=home');
  await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.occlusion.spriteReady);
  const result = await page.evaluate(() => {
    const d = atlasGpuDebug;
    if (!d.motion.paused) d.motion.toggle();
    d.renderer.setBokehStrength(4);
    return d.renderer.stats;
  });
  assert.equal(result.backend, 'canvas2d');
  assert.equal(result.occlusion.available, false);
  assert.equal(result.occlusion.enabled, false);
  await page.screenshot({ path: '/tmp/pinpin-occlusion-fallback.png' });
  await page.close();
  return result;
}

async function woodland(browser, width, legacy = false) {
  const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (legacy) {
    // Reproduce the pre-v7 calibration without changing files shared with other workers.
    await page.route('**/gpu/occlusion.js', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace(', [845, 66 / 255], [905, 63 / 255]', '');
      await route.fulfill({ response, body });
    });
    await page.route('**/gpu/world.wgsl', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace(/fn visibility\(scene: f32, object: f32\) -> f32 \{[\s\S]*?\n\}/,
        'fn visibility(scene: f32, object: f32) -> f32 {\n return 1.0 - smoothstep(frame.occlusion.z, frame.occlusion.z + frame.occlusion.w, object - scene);\n}');
      await route.fulfill({ response, body });
    });
  }
  await page.goto(base + 'atlas-webgpu.html?returnPlace=home');
  await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.occlusion.spriteReady);
  const result = await page.evaluate(async () => {
    const d = atlasGpuDebug;
    if (!d.motion.paused) d.motion.toggle();
    d.motion.suspend(true); d.renderer.suspend(true);
    const { createRenderer } = await import('./gpu/renderer.js');
    const make = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
    const overlay = make(1536, 1024), oc = overlay.getContext('2d');
    const sprite = make(128, 128); sprite.getContext('2d').drawImage(d.motion.spriteLayer.canvas, 0, 0);
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';
    document.body.append(canvas);
    let layer;
    overlay.atlasSetSpriteLayer = value => { layer = value; if (layer) {
      layer.canvas.getContext('2d').drawImage(sprite, 0, 0); layer.revision++;
    } };
    const renderer = await createRenderer({ canvas, artSrc: 'images/atlas/shire-v1.webp',
      depthSrc: 'images/atlas/shire-depth-v1.webp', overlayCanvas: overlay });
    renderer.setDof(false); renderer.setBokehStrength(0);
    const camera = { x: 900, y: 900, scale: 2, width: innerWidth, height: innerHeight };
    const copy = make(innerWidth, innerHeight), ctx = copy.getContext('2d');
    const render = () => { renderer.render(camera, { overlayDirty: true, now: performance.now() });
      ctx.drawImage(canvas, 0, 0, copy.width, copy.height); };
    const pixel = () => [...ctx.getImageData(Math.floor(innerWidth / 2), Math.floor(innerHeight / 2), 1, 1).data];
    const depthImage = new Image(); depthImage.src = 'images/atlas/shire-depth-v1.webp'; await depthImage.decode();
    const depth = make(1536, 1024), dc = depth.getContext('2d'); dc.drawImage(depthImage, 0, 0);
    const points = [
      ['canopy-west',650,860,'hidden'],['canopy-west-2',700,875,'hidden'],
      ['canopy-center',860,910,'hidden'],['canopy-center-2',900,910,'hidden'],
      ['canopy-center-3',980,910,'hidden'],['canopy-east',1020,908,'hidden'],
      ['canopy-east-2',1060,900,'hidden'],['canopy-east-3',1100,890,'hidden'],
      ['canopy-east-4',1140,875,'hidden'],['road-west',500,825,'clear'],
      ['road-west-2',575,845,'clear'],['road-gap',780,905,'clear'],
      ['tractor-arrival',1248,820,'clear'],['home-door',300,695,'clear'],['elder-door',1212,205,'clear'],
      ['tractor-link-1',1240,780,'clear'],['tractor-link-2',1240,740,'hidden'],
      ['tractor-link-3',1240,700,'hidden'],['tractor-link-4',1240,660,'hidden'],
      ['route-v7-center',915,918,'hidden'],['route-v7-east',998,908,'hidden'],
      ['route-v7-east-2',1070,899,'hidden'],['route-v7-east-3',1120,890,'hidden'],
      ['west-north-655',1263,655,'survey'],['west-north-666',1264,666,'survey'],
      ['west-north-678',1264,678,'survey'],['west-north-686',1263,686,'survey']
    ];
    const samples = [];
    for (const [name,x,y,expect] of points) {
      camera.x=x;camera.y=y;layer.ready=false;oc.clearRect(0,0,1536,1024);
      render();const bare=pixel();
      oc.fillStyle='#fff';oc.fillRect(x-4,y-4,8,8);
      renderer.setOcclusion(false);render();const off=pixel();
      renderer.setOcclusion(true);render();const on=pixel();
      const delta=(a,b)=>a.slice(0,3).reduce((s,v,i)=>s+Math.abs(v-b[i]),0);
      let red=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)red+=dc.getImageData(x+i*2,y+j*2,1,1).data[0]/9;
      samples.push({name,x,y,expect,red,retained:delta(on,bare)/Math.max(1,delta(off,bare)),bare,off,on});
    }
    const drawRoutes = () => {
      oc.clearRect(0,0,1536,1024);oc.strokeStyle='#fff';oc.lineWidth=2;oc.setLineDash([5,11]);
      for(const route of atlasGeometry.routes){oc.beginPath();route.points.forEach(([x,y],i)=>i?oc.lineTo(x*1536,y*1024):oc.moveTo(x*1536,y*1024));oc.stroke();}
    };
    drawRoutes();
    window.woodlandProbe = { renderer, camera, layer, canvas, render, drawRoutes, copy, ctx };
    return { samples, stats: renderer.stats, routeVersion: atlasGeometry.routeSurveyVersion };
  });
  assert.equal(result.stats.backend, 'webgpu');
  assert.equal(result.stats.occlusion.extraTextureBytes, 69632);
  if (!legacy) for (const sample of result.samples) {
    if (sample.expect === 'hidden') assert(sample.retained < .05, JSON.stringify(sample));
    if (sample.expect === 'clear') assert(sample.retained > .98, JSON.stringify(sample));
  }
  const captures = [], sprites = [];
  for (const [name, foot] of [['woodland',[1060,900]],['gap',[780,905]],['tractor',[1248,820]],['tractor-link',[1240,740]]]) {
    const metrics = await page.evaluate(({foot,width}) => {
      const p=woodlandProbe;Object.assign(p.camera,{x:foot[0],y:foot[1]-45,scale:width<600?2:1.8});
      Object.assign(p.layer,{x:foot[0]-p.layer.anchor[0],y:foot[1]-p.layer.anchor[1],footY:foot[1],ready:true});
      const read = enabled => {p.renderer.setOcclusion(enabled);p.render();return p.ctx.getImageData(0,0,p.copy.width,p.copy.height).data;};
      const off=read(false),on=read(true),rgba=p.layer.canvas.getContext('2d').getImageData(0,0,128,128).data;
      let hidden=0,retained=0;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
        if(rgba[(y*128+x)*4+3]<200)continue;
        const sx=Math.floor(p.camera.width/2+(p.layer.x+x+.5-p.camera.x)*p.camera.scale);
        const sy=Math.floor(p.camera.height/2+(p.layer.y+y+.5-p.camera.y)*p.camera.scale);
        if(sx<0||sy<0||sx>=p.copy.width||sy>=p.copy.height)continue;
        const i=(sy*p.copy.width+sx)*4;
        if(Math.abs(off[i]-on[i])+Math.abs(off[i+1]-on[i+1])+Math.abs(off[i+2]-on[i+2])>15)hidden++;else retained++;
      }
      return {hidden,retained};
    }, {foot,width});
    sprites.push({name,foot,...metrics});
    if (!legacy) {
      if (name === 'woodland' || name === 'tractor-link') assert(metrics.hidden > 20, `${name}: actual sprite must be hidden by canopy`);
      if (name === 'gap') assert(metrics.hidden > 20 && metrics.retained > 20, 'gap must show partial character occlusion');
      if (name === 'tractor') assert(metrics.retained > 20 && metrics.hidden === 0, 'entire tractor-arrival sprite must remain exposed');
    }
    await page.waitForTimeout(100);
    const file=`/tmp/atlas-occlusion-v7-${name}-${width}-${legacy?'before':'after'}.png`;
    await page.screenshot({path:file});captures.push(file);
  }
  assert.deepEqual(errors, []);
  await page.close();
  return {width,legacy,...result,captures,sprites,errors};
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const woodlandOnly = process.env.ATLAS_OCCLUSION_WOODLAND_ONLY === '1';
    const result = { synthetic: woodlandOnly ? null : await synthetic(browser), real: [], woodland: [] };
    for (const width of [1440,390]) for (const legacy of [true,false]) result.woodland.push(await woodland(browser,width,legacy));
    if (!woodlandOnly) {
      for (const width of [1440, 390]) result.real.push(await realMap(browser, width));
      result.real.push(await realMap(browser, 1440, 9));
      result.fallback = await fallback(browser);
    }
    fs.writeFileSync('/tmp/pinpin-occlusion-verification.json', JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
