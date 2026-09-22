'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const output = process.env.ATLAS_BANNERS_OUTPUT || '/tmp/pinpin-banners';
const reportPath = process.env.ATLAS_BANNERS_REPORT || '/tmp/pinpin-banners-review.md';
const scope = process.env.ATLAS_BANNERS_SCOPE || 'full';
const ids = ['home', 'lake', 'elder', 'bridge'];
const sizes = [{width:1440,height:1000}, {width:390,height:844}, {width:320,height:740}];
const results = [], screenshots = [];
const marker = (page, id) => page.locator(`.atlas-book[data-destination="${id}"]`);
const midpoint = box => ({x:box.x + box.width / 2, y:box.y + box.height / 2});

async function check(name, run) {
  try {
    const detail = await run();
    results.push({name, pass:true, detail});
    console.log('PASS ' + name);
  } catch (error) {
    results.push({name, pass:false, error:error.stack || String(error)});
    console.error('FAIL ' + name + ': ' + error.message);
  }
}

async function screenshot(page, name) {
  const file = path.join(output, name + '.png');
  await page.screenshot({path:file});
  screenshots.push(file);
  return file;
}

async function ready(page) {
  await page.waitForFunction(() => window.atlasGpuDebug?.renderer && atlasGpuDebug.detector &&
    atlasGpuDebug.renderer.stats.draws >= 1 && atlasGpuDebug.covers.loaded);
  await page.waitForFunction(() => [...document.querySelectorAll('.atlas-book img')].length === 4 &&
    [...document.querySelectorAll('.atlas-book img')].every(image => image.complete && image.naturalWidth > 0));
}

async function settled(page) {
  await page.waitForFunction(() => !atlasGpuDebug.moving);
  await page.waitForTimeout(240);
}

async function focus(page, id) {
  await page.evaluate(id => {
    const d = atlasGpuDebug, s = d.camera.snapshot;
    if (!d.motion.paused) d.motion.toggle();
    d.motion.placeAtLocation(id);
    const entry = d.covers.entries.find(entry => entry.id === id);
    const ground = entry?.placement?.anchor || atlasGeometry.regions.find(region => region.id === id).center;
    d.camera.focus(d.world(ground), 2 * Math.max(s.width / atlasGeometry.width, s.height / atlasGeometry.height));
  }, id);
  await settled(page);
  await page.waitForFunction(id => atlasGpuDebug.covers.selected === id, id);
  await marker(page, id).waitFor({state:'visible'});
}

async function oneActive(page, id) {
  assert.equal(await page.locator('.atlas-book').count(), 4, 'Four persistent banner nodes');
  assert.equal(await page.locator('.atlas-book:visible').count(), 1, 'One visible banner');
  assert.equal(await page.evaluate(() => atlasGpuDebug.covers.selected), id);
  assert.equal(await page.locator('#map-viewport').getAttribute('data-active-cover'), id);
}

async function layout(page, id) {
  await oneActive(page, id);
  const image = marker(page, id).locator('img');
  const expected = await page.evaluate(id => `images/covers/${AtlasStories.entries[id].coverId}/miniature/miniature-v1.png`, id);
  assert.equal(await image.getAttribute('src'), expected, 'Banner uses the textless miniature');
  assert.equal(await image.evaluate(node => getComputedStyle(node).objectFit), 'contain');
  const box = await marker(page,id).boundingBox(), viewport = await page.locator('#map-viewport').boundingBox();
  assert(box && box.width > 40 && box.height > 60, 'Native banner bounds survive transparent GPU artwork');
  const intersection=Math.max(0,Math.min(box.x+box.width,viewport.x+viewport.width)-Math.max(box.x,viewport.x))*
    Math.max(0,Math.min(box.y+box.height,viewport.y+viewport.height)-Math.max(box.y,viewport.y));
  assert(intersection/(box.width*box.height)>=.8,
    `At least 80% of the native banner area fits viewport: ${JSON.stringify({box,viewport})}`);
  return {box, viewport, miniature:expected};
}

async function gpuBridge(page,id) {
  await page.waitForFunction(id => {
    const d=atlasGpuDebug,e=d.covers.entries.find(entry=>entry.id===id);
    return d.renderer.backend!=='webgpu' || (d.renderer.stats.banner?.ready && e.surfaceVisibility!==null);
  },id);
  const result=await page.evaluate(async id=>{
    const d=atlasGpuDebug,c=d.covers,e=c.entries.find(entry=>entry.id===id),l=c.gpuLayer;
    const style=getComputedStyle(e.button), box=e.button.getBoundingClientRect();
    const rgba=l.canvas.getContext('2d').getImageData(0,0,l.canvas.width,l.canvas.height).data;
    const depth=l.depthCanvas.getContext('2d').getImageData(0,0,l.canvas.width,l.canvas.height).data;
    let opaque=0,alphaMismatch=0,depthError=0;
    for(let i=3;i<rgba.length;i+=4) {
      if(rgba[i]>20)opaque++;
      if(rgba[i]!==depth[i])alphaMismatch++;
      if(depth[i]===255)depthError=Math.max(depthError,Math.abs(depth[i-3]/255-e.objectDepth));
    }
    const revision=l.revision;c.position();c.position();
    let denseVisibility=null;
    if(d.renderer.backend==='webgpu') {
      const {visibility}=await import('./gpu/occlusion.js');
      const v=d.camera.snapshot,image=e.image,ratio=Math.min(160/image.naturalWidth,240/image.naturalHeight);
      const width=image.naturalWidth*ratio,height=image.naturalHeight*ratio,point=e.object.group.position.clone();
      const mask=document.createElement('canvas');mask.width=40;mask.height=60;
      const ctx=mask.getContext('2d');ctx.drawImage(image,0,0,40,60);
      const alpha=ctx.getImageData(0,0,40,60).data;
      let total=0,visible=0;
      e.object.group.updateMatrixWorld(true);
      // Independent dense projection audit, including clipping and the shader's nine depth taps.
      for(let y=0;y<60;y++)for(let x=0;x<40;x++) {
        const weight=alpha[(y*40+x)*4+3]/255;total+=weight;
        if(!weight)continue;
        point.set(-width/2+(x+.5)*width/40,-120+height-(y+.5)*height/60,0).applyMatrix4(e.object.cover.matrixWorld);
        const sx=v.width/2+point.x*900/(900-point.z),sy=v.height/2-point.y*900/(900-point.z);
        if(sx<0||sy<0||sx>=v.width||sy>=v.height)continue;
        const wx=v.x+(sx-v.width/2)/v.scale,wy=v.y+(sy-v.height/2)/v.scale;
        let scene=0;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)scene+=d.renderer.sampleDepth(wx+dx*2,wy+dy*2);
        visible+=weight*visibility(scene/9,Math.round(e.objectDepth*255)/255);
      }
      denseVisibility=total ? visible/total : 1;
    }
    return {backend:d.renderer.backend,ready:l.ready,size:[l.canvas.width,l.canvas.height],opaque,alphaMismatch,depthError,
      idleStable:revision===l.revision,gpu:e.button.dataset.gpuRendering==='true',imageOpacity:getComputedStyle(e.image).opacity,
      background:style.backgroundColor,border:style.borderTopColor,shadow:style.boxShadow,
      hit:document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)?.closest('.atlas-book')===e.button,
      visibility:e.surfaceVisibility,denseVisibility,target90:denseVisibility>=.9,placement:e.surfacePlacement,
      lensDepth:l.lensDepth,expectedLensDepth:.85-.65*Math.max(0,Math.min(1,
        (e.placement.anchor[1]*atlasGeometry.height+e.placement.offset[1])/atlasGeometry.height)),
      uploads:d.renderer.stats.banner?.uploads};
  },id);
  assert(result.idleStable,'Idle positions do not rasterize');
  assert(Math.max(...result.size)<=1024,'Screen raster is memory bounded');
  assert(result.hit,'Transparent native button retains its exact hit area');
  if(result.backend==='webgpu') {
    assert(result.ready && result.opaque>100,'Enabled GPU raster is nonblank');
    assert.equal(result.alphaMismatch,0,'Color and depth cover exactly the same pixels');
    assert(result.depthError<=1/255,'Depth texture retains calibrated occlusion depth, not lens-remapped depth');
    assert(Math.abs(result.lensDepth-result.expectedLensDepth)<1e-6,'Global lens uses banner foot depth in its own ground-plane scale');
    assert(result.gpu && result.imageOpacity==='0','GPU mode hides duplicate DOM artwork');
    assert.equal(result.background,'rgba(0, 0, 0, 0)');
    assert.equal(result.border,'rgba(0, 0, 0, 0)');assert.equal(result.shadow,'none');
    assert(result.uploads>0,'Renderer uploaded the screen-space banner');
    assert(result.visibility>=.8,`Minimum 80% visibility: ${result.visibility}`);
    assert(result.denseVisibility>=.8,`Independent dense minimum visibility: ${result.denseVisibility}`);
    if(scope==='surface')assert(result.denseVisibility>=.9,`Focused reference placements reach 90%: ${result.denseVisibility}`);
  } else assert(!result.gpu && result.imageOpacity!=='0','Fallback restores DOM artwork');
  return result;
}

async function pixels(page) {
  // Inspect the compositor capture because presented WebGPU textures may expire.
  const png = await page.locator('#world-canvas').screenshot();
  const result = await page.evaluate(async encoded => {
    const image = new Image(); image.src = 'data:image/png;base64,' + encoded;
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 64;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(image, 0, 0, 96, 64);
    const bytes = ctx.getImageData(0, 0, 96, 64).data, colors = new Set();
    let opaque = 0;
    for (let i = 0; i < bytes.length; i += 4) {
      if (bytes[i + 3] > 240) opaque++;
      colors.add([bytes[i] >> 4, bytes[i + 1] >> 4, bytes[i + 2] >> 4].join(','));
    }
    return {opaque, colors:colors.size, backend:atlasGpuDebug.renderer.backend};
  }, png.toString('base64'));
  assert(result.opaque > 5000 && result.colors > 40, 'Map canvas contains opaque, varied artwork');
  return result;
}

async function geometry(page, id) {
  const result = await page.evaluate(id => {
    const d = atlasGpuDebug, entry = d.covers.entries.find(item => item.id === id);
    const object = entry.object, p = entry.surfacePlacement || entry.placement;
    const rect = element => { const r = element.getBoundingClientRect(); return {x:r.x, y:r.y, width:r.width, height:r.height}; };
    const style = element => {
      const s = getComputedStyle(element);
      return {display:s.display, color:s.backgroundColor, transform:s.transform, border:s.borderTopColor, borderWidth:s.borderTopWidth};
    };
    const ground = [p.anchor[0] * atlasGeometry.width + p.offset[0], p.anchor[1] * atlasGeometry.height + p.offset[1]];
    const segmentDistance = (point, a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
    };
    let nearestRoad = Infinity;
    for (const route of atlasGeometry.routes) for (let i = 1; i < route.points.length; i++) {
      nearestRoad = Math.min(nearestRoad, segmentDistance(ground, d.world(route.points[i - 1]), d.world(route.points[i])));
    }
    return {placement:p, box:rect(entry.button), ring:{...rect(object.ring.element), ...style(object.ring.element)},
      dots:object.dots.map(dot => ({...rect(dot.element), ...style(dot.element), visible:dot.visible})),
      coverTransform:getComputedStyle(entry.button).transform,
      pivot:[object.pivot.rotation.x, object.pivot.rotation.y, object.pivot.rotation.z], nearestRoad,
      ringNormal:object.ring.position.clone().set(0,0,1).applyQuaternion(object.ring.quaternion).toArray(),
      confidence:Number(document.getElementById('map-viewport').dataset.coverConfidence),
      sceneCount:document.querySelectorAll('.atlas-banner-scene').length};
  }, id);
  assert.equal(result.sceneCount, 1, 'One shared CSS3D scene');
  assert(result.coverTransform.startsWith('matrix3d('), 'Cover has an actual CSS3D transform');
  assert(result.box.height > result.box.width, 'Banner remains upright');
  assert.equal(result.dots.length, 3);
  assert(result.dots.every(dot => dot.visible && dot.width > 0 && dot.height > 0 &&
    /rgba?\(255, 255, 255(?:,|\))/.test(dot.color)), 'Three visible white dots');
  const centers = result.dots.map(dot => dot.y + dot.height / 2).sort((a, b) => a - b);
  assert(centers[0] > result.box.y + result.box.height - 8, 'Dots float below the upright banner');
  assert(centers[2] < result.ring.y + result.ring.height / 2, 'Dots end above the ground ring');
  assert(centers[1] - centers[0] > 2 && centers[2] - centers[1] > 2, 'Dots are separated');
  assert(result.ring.width>0 && result.ring.height>0,'Ground ring has nonzero projected geometry');
  if(result.placement.ground.normal) assert(result.ringNormal.every((value,i)=>
    Math.abs(value-result.placement.ground.normal[i])<1e-6),'Ring plane is perpendicular to the supplied surface normal');
  else assert(result.ring.width>result.ring.height*1.5,'Authored fallback keeps its flattened ground ellipse');
  assert(parseFloat(result.ring.borderWidth) > 0, 'Ground ring has a visible stroke');
  assert(result.nearestRoad > result.placement.ground.radius + 6,
    `Ground footprint clears route centerline and half-stroke: ${result.nearestRoad.toFixed(1)} world px`);
  assert(result.confidence >= 20, 'Selected destination meets minimum confidence');
  return result;
}

async function characterClearance(page, id) {
  const result = await page.evaluate(id => {
    const d = atlasGpuDebug, layer = d.motion.spriteLayer, canvas = layer?.canvas || d.motionCanvas;
    const x = Number(d.motionCanvas.dataset.x), y = Number(d.motionCanvas.dataset.y);
    const left = layer ? 0 : Math.max(0, Math.floor(x - 80)), top = layer ? 0 : Math.max(0, Math.floor(y - 100));
    const width = layer ? canvas.width : Math.min(160, canvas.width - left);
    const height = layer ? canvas.height : Math.min(120, canvas.height - top);
    const offsetX = layer?.x || 0, offsetY = layer?.y || 0;
    const bytes = canvas.getContext('2d').getImageData(left, top, width, height).data;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, opaque = 0;
    // Inspect actual sprite pixels, whether split for depth testing or in the legacy overlay.
    for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
      if (bytes[(py * width + px) * 4 + 3] <= 240) continue;
      minX = Math.min(minX, offsetX + left + px); minY = Math.min(minY, offsetY + top + py);
      maxX = Math.max(maxX, offsetX + left + px + 1); maxY = Math.max(maxY, offsetY + top + py + 1); opaque++;
    }
    const viewport = document.getElementById('map-viewport').getBoundingClientRect();
    const a = d.camera.worldToScreen([minX, minY]), b = d.camera.worldToScreen([maxX, maxY]);
    const body = {left:a[0] + viewport.x, top:a[1] + viewport.y, right:b[0] + viewport.x, bottom:b[1] + viewport.y};
    const entry = d.covers.entries.find(entry => entry.id === id);
    const overlap = element => {
      const r = element.getBoundingClientRect();
      return Math.max(0, Math.min(r.right, body.right) - Math.max(r.left, body.left)) *
        Math.max(0, Math.min(r.bottom, body.bottom) - Math.max(r.top, body.top));
    };
    return {opaque, body, coverOverlap:overlap(entry.button), ringOverlap:overlap(entry.object.ring.element),
      dotOverlap:entry.object.dots.reduce((sum, dot) => sum + overlap(dot.element), 0)};
  }, id);
  assert(result.opaque > 100, 'Actual PinPin body is present in its render layer');
  assert.equal(result.coverOverlap, 0, `Banner does not cover PinPin body: ${JSON.stringify(result)}`);
  assert.equal(result.ringOverlap, 0, 'Ground ring clears PinPin body');
  assert.equal(result.dotOverlap, 0, 'Floating dots clear PinPin body');
  return result;
}

async function watch(page) {
  await page.evaluate(() => {
    const probe = window.bannerProbe = {nodes:[...document.querySelectorAll('.atlas-book')], added:0, removed:0, sources:0, sampleCalls:0};
    probe.originalSample = atlasGpuDebug.detector.sampleRegion;
    atlasGpuDebug.detector.sampleRegion = function(...args) { probe.sampleCalls++; return probe.originalSample.apply(this, args); };
    probe.images = probe.nodes.map(node => node.querySelector('img'));
    probe.srcs = probe.images.map(image => image.getAttribute('src'));
    probe.observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes' && probe.images.includes(record.target)) probe.sources++;
        for (const node of record.addedNodes) if (node.nodeType === 1 &&
          (node.matches('.atlas-book') || node.querySelector('.atlas-book'))) probe.added++;
        for (const node of record.removedNodes) if (node.nodeType === 1 &&
          (node.matches('.atlas-book') || node.querySelector('.atlas-book'))) probe.removed++;
      }
    });
    probe.observer.observe(document.getElementById('map-viewport'),
      {subtree:true, childList:true, attributes:true, attributeFilter:['src']});
  });
  const requests = [];
  const listener = request => requests.push(request.url());
  page.on('request', listener);
  return async () => {
    page.off('request', listener);
    const result = await page.evaluate(() => {
      const p = bannerProbe; p.observer.disconnect();
      atlasGpuDebug.detector.sampleRegion = p.originalSample;
      return {added:p.added, removed:p.removed, sources:p.sources, sampleCalls:p.sampleCalls,
        same:p.nodes.every((node, i) => node.isConnected &&
          document.querySelector(`.atlas-book[data-destination="${node.dataset.destination}"]`) === node &&
          node.querySelector('img') === p.images[i] && p.images[i].getAttribute('src') === p.srcs[i])};
    });
    assert.deepEqual(result, {added:0, removed:0, sources:0, sampleCalls:0, same:true}, 'Gestures preserve cached DOM, image sources and paused-character selection');
    assert.deepEqual(requests, [], 'Gestures issue no network requests');
    return result;
  };
}

async function hit(page, point, id) {
  assert.equal(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.closest('.atlas-book')?.dataset.destination, point),
    id, 'Native gesture begins on the banner');
}

async function gesture(page, id, touch) {
  await focus(page, id);
  const box = await marker(page, id).boundingBox(), point = midpoint(box);
  await hit(page, point, id);
  const before = await page.evaluate(() => atlasGpuDebug.camera.snapshot);
  const stop = await watch(page);
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  try {
    if (cdp) {
      await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{id:1, ...point}]});
      for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent',
        {type:'touchMove', touchPoints:[{id:1, x:point.x + i * 5, y:point.y + i * 4}]});
    } else {
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      await page.mouse.move(point.x + 30, point.y + 24, {steps:6});
    }
    const during = await page.evaluate(() => ({moving:atlasGpuDebug.moving, camera:atlasGpuDebug.camera.snapshot}));
    assert(during.moving, 'Banner-origin pan moves before pointer release');
    assert(Math.abs(during.camera.x - before.x) > 1 && Math.abs(during.camera.y - before.y) > 1,
      'Banner-origin pan changes both camera axes');
    await oneActive(page, id);
    const moved = await marker(page, id).boundingBox();
    assert(Math.abs(moved.x - box.x + (during.camera.x - before.x) * before.scale) < 3, 'Banner follows camera X');
    assert(Math.abs(moved.y - box.y + (during.camera.y - before.y) * before.scale) < 3, 'Banner follows camera Y');
  } finally {
    if (cdp) { await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]}); await cdp.detach(); }
    else await page.mouse.up();
  }
  await settled(page);
  assert.equal(await page.locator('#story-preview').evaluate(dialog => dialog.open), false, 'Pan does not open preview');
  return stop();
}

async function pinch(page) {
  await focus(page, 'home');
  const box = await marker(page, 'home').boundingBox(), point = midpoint(box);
  const distance = Math.min(24, box.width / 5);
  const points = factor => [{id:1, x:point.x - distance * factor, y:point.y}, {id:2, x:point.x + distance * factor, y:point.y}];
  for (const p of points(1)) await hit(page, p, 'home');
  const before = await page.evaluate(() => atlasGpuDebug.camera.snapshot.scale);
  const stop = await watch(page), cdp = await page.context().newCDPSession(page);
  let after;
  try {
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:points(1)});
    for (const factor of [1.1, 1.2, 1.35]) await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:points(factor)});
    after = await page.evaluate(() => atlasGpuDebug.camera.snapshot.scale);
    assert(after > before * 1.2, 'Native pinch from banner zooms the map');
    await oneActive(page, 'home');
  } finally {
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    await cdp.detach();
  }
  await settled(page);
  assert.equal(await page.locator('#story-preview').evaluate(dialog => dialog.open), false, 'Pinch does not open preview');
  return {before, after, cache:await stop()};
}

async function preview(page, id, lang, touch, navigate) {
  await focus(page, id);
  const expected = await page.evaluate(async ({id, lang}) => AtlasStories.preview(id, lang), {id, lang});
  assert(expected, 'Published localized preview exists');
  const point = midpoint(await marker(page, id).boundingBox());
  await hit(page, point, id);
  if (touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
  await page.waitForSelector('#story-preview[open]');
  await page.waitForFunction(() => { const image = document.getElementById('preview-image'); return image.complete && image.naturalWidth > 0; });
  assert.equal(await page.locator('#preview-image').getAttribute('src'), expected.src, 'Modal uses localized full cover');
  assert(!expected.src.includes('/miniature/'), 'Modal retains the full title artwork');
  assert.equal(await page.locator('#preview-title').textContent(), expected.title);
  const registry = await page.evaluate(({id, lang}) => titleCovers.resolve(AtlasStories.entries[id].coverId, lang, '?coverPreview=1')?.src, {id, lang});
  if (lang === 'en') await screenshot(page, `${page.viewportSize().width}x${page.viewportSize().height}-${id}-modal`);
  if (navigate) {
    const href = await page.locator('#preview-open').getAttribute('href');
    if (touch) await page.locator('#preview-open').tap(); else await page.locator('#preview-open').click();
    await page.waitForURL(url => url.pathname.endsWith('/index.html'));
    assert.equal(new URL(page.url()).searchParams.get('lang'), lang);
    assert.equal(new URL(page.url()).searchParams.get('returnPlace'), id);
    assert.equal(new URL(page.url()).searchParams.get('coverPreview'), '1', 'Reader preserves title-cover preview mode');
    for (const key of ['story', 'chapter']) assert.equal(new URL(page.url()).searchParams.get(key), new URL(href, base).searchParams.get(key));
    await page.waitForFunction(() => [...document.images].some(image => image.complete && image.naturalWidth > 0));
    await page.goto(base + 'atlas-webgpu.html?lang=' + lang + '&coverPreview=1'); await ready(page);
  } else {
    await page.locator('#preview-close').click();
    await page.waitForFunction(() => !document.getElementById('story-preview').open);
    await settled(page);
  }
  assert.equal(expected.src, registry, 'Modal uses the existing localized title image');
  return {miniature:await marker(page, id).locator('img').getAttribute('src'), fullCover:expected.src, title:expected.title, reader:navigate};
}

async function defaultPreview(page, touch) {
  await focus(page, 'lake');
  const expected = await page.evaluate(() => AtlasStories.preview('lake', 'en'));
  const point = midpoint(await marker(page, 'lake').boundingBox());
  if (touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
  await page.waitForSelector('#story-preview[open]');
  assert.equal(await page.locator('#preview-image').getAttribute('src'), expected.src, 'Normal mode preserves approval-gated fallback');
  assert(!expected.src.includes('/miniature/'), 'Normal modal also uses full artwork');
  await page.locator('#preview-close').click(); await settled(page);
  return {src:expected.src, title:expected.title};
}

function writeReport() {
  const failures = results.filter(result => !result.pass);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({base, scope, sizes, results, screenshots}, null, 2));
  const lines = ['# Atlas Banner Verification', '',
    `Result: ${results.length - failures.length}/${results.length} checks passed.`, '',
    `Run: ATLAS_BANNERS_READY=1 ATLAS_BANNERS_SCOPE=${scope} node scripts/verify-atlas-banners.cjs`, '',
    `Server: ${base}`, '', '## Checks', '',
    ...results.map(result => `- ${result.pass ? 'PASS' : 'FAIL'} ${result.name}${result.pass ? '' : ': ' + result.error.split('\n')[0]}`),
    '', '## Screenshots', '', ...screenshots.map(file => `- ${file}`), '',
    `Detailed measurements and failure stacks: ${path.join(output, 'results.json')}`, '',
    'Scope: Chromium desktop and emulated mobile touch. Screenshots support visual review of artistic placement and road clearance.', '',
    'Full-title and reader cases use coverPreview=1 because chapter title covers remain proposed. Normal-mode checks separately preserve the existing approval-gated scene fallback.', ''];
  fs.writeFileSync(reportPath, lines.join('\n'));
}

async function main() {
  if (process.env.ATLAS_BANNERS_READY !== '1') throw new Error('Await parent READY, then run with ATLAS_BANNERS_READY=1.');
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    for (const size of sizes.filter(size => scope !== 'overview' || size.width < 600)) {
      const touch = size.width < 600, label = `${size.width}x${size.height}`;
      const context = await browser.newContext({viewport:size, isMobile:touch, hasTouch:touch, reducedMotion:'reduce'});
      await context.addInitScript(() => localStorage.setItem('pinpin.atlas.motion.v1', 'paused'));
      const page = await context.newPage(), errors = [];
      page.setDefaultTimeout(12000);
      page.on('pageerror', error => errors.push(error.message));
      try {
        await check(label + ' ready', async () => {
          await page.goto(base + 'atlas-webgpu.html?lang=en'); await ready(page);
          return page.evaluate(() => atlasGpuDebug.detector.fieldMetadata);
        });
        if (scope === 'overview') {
          for (const id of ['home', 'elder', 'bridge']) {
            await check(`${label} ${id} overview PinPin body clearance`, async () => {
              await focus(page, id);
              await page.evaluate(() => atlasGpuDebug.camera.fit()); await settled(page);
              await screenshot(page, `${label}-${id}-overview`);
              await oneActive(page, id); return characterClearance(page, id);
            });
          }
          continue;
        }
        for (const id of ids) {
          await check(`${label} ${id} miniature/layout`, async () => {
            await focus(page, id); await screenshot(page, `${label}-${id}`); return layout(page, id);
          });
          await check(`${label} ${id} 3D / dots / ring / road clearance`, () => geometry(page, id));
          await check(`${label} ${id} GPU surface / native hit area / visibility`, () => gpuBridge(page,id));
          if(scope==='surface') continue;
          await check(`${label} ${id} focused PinPin body clearance`, () => characterClearance(page, id));
          await check(`${label} ${id} overview PinPin body clearance`, async () => {
            await page.evaluate(() => atlasGpuDebug.camera.fit()); await settled(page);
            await screenshot(page, `${label}-${id}-overview`);
            await oneActive(page, id); return characterClearance(page, id);
          });
          await check(`${label} ${id} banner-origin ${touch ? 'touch' : 'mouse'} pan/cache`, () => gesture(page, id, touch));
        }
        await check(label + ' nonblank canvas', () => pixels(page));
        if(scope==='surface') {
          await check(label + ' browser errors', () => assert.deepEqual(errors,[]));
          continue;
        }
        if (touch) await check(label + ' native banner-origin pinch/cache', () => pinch(page));
        await check(label + ' locked elder', async () => {
          await focus(page, 'elder');
          assert.equal(await marker(page, 'elder').getAttribute('aria-disabled'), 'true');
          const point = midpoint(await marker(page, 'elder').boundingBox());
          if (touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
          await page.waitForTimeout(250);
          assert.equal(await page.locator('#story-preview').evaluate(dialog => dialog.open), false);
        });
        await check(label + ' normal-mode approval-gated full preview', () => defaultPreview(page, touch));
        for (const lang of ['en', 'es', 'ru']) {
          await page.goto(base + 'atlas-webgpu.html?lang=' + lang + '&coverPreview=1'); await ready(page);
          for (const id of ['lake', 'home', 'bridge', 'elder']) {
            await check(`${label} ${lang} ${id} localized modal / two-tap reader`, () => preview(page, id, lang, touch, true));
            if (await page.locator('#story-preview').count() && await page.locator('#story-preview').evaluate(dialog => dialog.open)) {
              await page.locator('#preview-close').click(); await settled(page);
            }
          }
        }
        await check(label + ' browser errors', () => assert.deepEqual(errors, []));
      } catch (error) {
        results.push({name:label + ' suite', pass:false, error:error.stack || String(error)});
        await screenshot(page, label + '-failure').catch(() => {});
      } finally { await context.close(); writeReport(); }
    }
  } finally { await browser.close(); writeReport(); }
  if (results.some(result => !result.pass)) process.exitCode = 1;
  console.log('Report: ' + reportPath);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
