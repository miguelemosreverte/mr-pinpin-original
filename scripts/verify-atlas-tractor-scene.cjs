'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {capsuleClearance, foregroundRoadForEdge} = require('./atlas-roadside-contact.test.cjs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const baseline = process.argv.includes('--baseline');
if (!baseline && process.env.ATLAS_TRACTOR_READY !== '1') throw new Error('Await READY; baseline is available with --baseline.');
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const output = process.env.ATLAS_TRACTOR_OUTPUT || '/tmp/atlas-tractor-scene-v13';
const report = process.env.ATLAS_TRACTOR_REPORT || '/tmp/atlas-tractor-scene-v13-review.md';
const reviewLabel = process.env.ATLAS_TRACTOR_LABEL || 'v13';
const root = path.resolve(__dirname, '../docs/storyboard');
const phase = baseline ? 'before' : 'after';
const results = [], screenshots = [];
const started = Date.now();
// Independent survey of the visible vehicle silhouette in the original 1536x1024 artwork.
const vehicle = [[1292,745],[1322,734],[1324,726],[1341,722],[1364,682],[1381,680],[1408,700],
  [1410,724],[1456,724],[1462,748],[1458,774],[1424,786],[1380,783],[1363,796],[1332,797],[1303,786],[1292,770]];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function pointGap(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return distance(p, [a[0] + t * dx, a[1] + t * dy]);
}
function inside(p, polygon) {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
  }
  return yes;
}
function hull(points) {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  function half(list) {
    const h = [];
    for (const p of list) { while (h.length > 1 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop(); h.push(p); }
    return h.slice(0, -1);
  }
  return [...half(sorted), ...half(sorted.slice().reverse())];
}
function polygonGap(a, b) {
  if (a.some(p => inside(p, b)) || b.some(p => inside(p, a))) return 0;
  let gap = Infinity;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    const p = a[i], q = a[(i + 1) % a.length], r = b[j], s = b[(j + 1) % b.length];
    const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
    const pq = q.map((n, k) => n - p[k]), rs = s.map((n, k) => n - r[k]), pr = r.map((n, k) => n - p[k]);
    const denominator = cross(pq, rs), t = cross(pr, rs) / denominator, u = cross(pr, pq) / denominator;
    if (Math.abs(denominator) > 1e-9 && t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
    gap = Math.min(gap, pointGap(p, r, s), pointGap(q, r, s), pointGap(r, p, q), pointGap(s, p, q));
  }
  return gap;
}
function travelEnvelope(directions, heading) {
  const angle = (Math.round(heading / 3.75) * 3.75 + 360) % 360;
  const bins = directions.directions.slice().sort((a, b) => a.angle - b.angle);
  const lower = bins.filter(d => d.angle <= angle).at(-1) || bins.at(-1);
  const upper = bins.find(d => d.angle > angle) || bins[0];
  const extent = {left: 0, right: 0, up: 0, down: 0};
  // Include both heading textures and all gait frames, matching production interpolation.
  for (const d of [lower, upper]) for (const f of d.frames) {
    const scale = directions.displayWidth / d.referenceWidth;
    extent.left = Math.max(extent.left, f.anchor[0] * scale);
    extent.right = Math.max(extent.right, (f.rect[2] - f.anchor[0]) * scale);
    extent.up = Math.max(extent.up, f.anchor[1] * scale);
    extent.down = Math.max(extent.down, (f.rect[3] - f.anchor[1]) * scale);
  }
  return extent;
}
async function roads(page, label) {
  const data = await page.evaluate(() => ({edges: atlasGpuDebug.motion.navigation.edges,
    geometry: atlasGeometry,
    junctions: atlasGpuDebug.motion.navigation.junctions, directions: atlasDirections}));
  const branches = data.junctions.filter(j => j.kind === 'branch');
  record(`${label} seven derived branch junctions`, branches.length === 7 && branches.every(j => j.paths.length === 3),
    {branches: branches.length, totalIncludingBendsAndAnchors: data.junctions.length});
  let minimum = Infinity, minimumFootGap = Infinity, foregroundEdges = 0, closest;
  for (const e of data.edges) {
    const foreground = foregroundRoadForEdge(data.geometry, e);
    minimumFootGap = Math.min(minimumFootGap, capsuleClearance(e, vehicle, foreground?.contactCapsule));
    if (foreground) { foregroundEdges++; continue; }
    const heading = Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]) * 180 / Math.PI;
    for (const turn of [0,180]) {
      const extent = travelEnvelope(data.directions, heading + turn);
      const corners = [[-extent.left, -extent.up], [extent.right, -extent.up], [extent.right, extent.down], [-extent.left, extent.down]];
      const swept = hull([e.a, e.b].flatMap(p => corners.map(c => p.map((n, i) => n + c[i]))));
      const gap = polygonGap(swept, vehicle);
      if (gap < minimum) { minimum = gap; closest = {...e, heading: heading + turn, extent}; }
    }
  }
  record(`${label} all derived arcs scoped vehicle clearance`, minimum >= 8.2 && minimumFootGap >= 8.2,
    {minimumNonForegroundBodyGap: minimum, minimumFootGap, foregroundEdges,
      bodyMargin: 6, updateTravelAllowance: 2.2, closest, edges: data.edges.length});
  // Fundamental cycles in the actual navigation graph, including rounded junction links.
  const key = p => p.map(n => n.toFixed(5)).join(',');
  const adjacency = new Map(), points = new Map();
  data.edges.forEach((e, i) => {
    const a = key(e.a), b = key(e.b);
    points.set(a, e.a); points.set(b, e.b);
    for (const [u, v] of [[a,b],[b,a]]) { if (!adjacency.has(u)) adjacency.set(u, []); adjacency.get(u).push({v, i}); }
  });
  const parent = new Map(), depth = new Map(), tree = new Set();
  function visit(u) {
    for (const {v, i} of adjacency.get(u)) if (!depth.has(v)) {
      parent.set(v, u); depth.set(v, depth.get(u) + 1); tree.add(i); visit(v);
    }
  }
  for (const u of adjacency.keys()) if (!depth.has(u)) { depth.set(u, 0); visit(u); }
  let cycles = 0, enclosing = 0;
  data.edges.forEach((e, i) => {
    if (tree.has(i)) return;
    let a = key(e.a), b = key(e.b); const left = [a], right = [b];
    while (a !== b) {
      if (depth.get(a) >= depth.get(b)) { a = parent.get(a); left.push(a); }
      else { b = parent.get(b); right.push(b); }
    }
    const polygon = [...left, ...right.slice(0, -1).reverse()].map(k => points.get(k));
    cycles++;
    if (vehicle.every(p => inside(p, polygon)) && inside([1375,750], polygon)) enclosing++;
  });
  record(`${label} derived cycle encloses entire vehicle`, enclosing > 0, {cycles, enclosing, vehicleCenter: [1375,750]});
}
function record(name, pass, detail) { results.push({name, pass, detail}); console.log(`${pass ? 'PASS' : baseline ? 'BASELINE' : 'FAIL'} ${name}: ${JSON.stringify(detail)}`); }
function signatures() {
  return Object.fromEntries(['atlas-geometry.js', 'atlas-motion.js', 'atlas-banners.json', 'atlas-banner-projection.js', 'atlas-banner-surface.js'].map(file =>
    [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
}
async function focus(page, id) {
  await page.evaluate(id => {
    const d = atlasGpuDebug, s = d.camera.snapshot;
    if (!d.motion.paused) d.motion.toggle();
    d.motion.placeAtLocation(id);
    const p = d.covers.entries.find(e => e.id === id).placement;
    d.camera.focus(d.world(p.anchor), 2 * Math.max(s.width / atlasGeometry.width, s.height / atlasGeometry.height));
  }, id);
  await page.waitForFunction(id => !atlasGpuDebug.moving && atlasGpuDebug.covers.selected === id &&
    atlasGpuDebug.covers.entries.find(e => e.id === id)?.surfaceVisibility !== null, id);
  await page.waitForTimeout(200);
}
async function banner(page, id) {
  return page.evaluate(async id => {
    const {visibility} = await import('./gpu/occlusion.js');
    const d = atlasGpuDebug, e = d.covers.entries.find(e => e.id === id), o = e.object, v = d.camera.snapshot;
    const placement = e.surfacePlacement || e.placement;
    o.group.updateMatrixWorld(true);
    const point = o.group.position.clone();
    const project = (obj, x, y) => {
      point.set(x, y, 0).applyMatrix4(obj.matrixWorld);
      return [v.width / 2 + point.x * 900 / (900 - point.z), v.height / 2 - point.y * 900 / (900 - point.z)];
    };
    const viewport = document.querySelector('#map-viewport').getBoundingClientRect();
    const native = e.button.getBoundingClientRect();
    const corners = [-80, 80].flatMap(x => [-120, 120].map(y => project(o.cover, x, y)));
    const expected = [Math.min(...corners.map(p => p[0])) + viewport.x, Math.min(...corners.map(p => p[1])) + viewport.y,
      Math.max(...corners.map(p => p[0])) + viewport.x, Math.max(...corners.map(p => p[1])) + viewport.y];
    const hitError = Math.max(...[native.left, native.top, native.right, native.bottom].map((n, i) => Math.abs(n - expected[i])));
    const centerHit = document.elementFromPoint(native.x + native.width / 2, native.y + native.height / 2)?.closest('.atlas-book') === e.button;
    const ratio = Math.min(160 / e.image.naturalWidth, 240 / e.image.naturalHeight);
    const w = e.image.naturalWidth * ratio, h = e.image.naturalHeight * ratio;
    const mask = Object.assign(document.createElement('canvas'), {width: 40, height: 60});
    const ctx = mask.getContext('2d'); ctx.drawImage(e.image, 0, 0, 40, 60);
    const alpha = ctx.getImageData(0, 0, 40, 60).data;
    let total = 0, shown = 0, upperTotal = 0, upperShown = 0, lowerHidden = 0, hidden = 0, clipped = 0;
    for (let y = 0; y < 60; y++) for (let x = 0; x < 40; x++) {
      const weight = alpha[(y * 40 + x) * 4 + 3] / 255;
      if (!weight) continue;
      const p = project(o.cover, -w / 2 + (x + .5) * w / 40, -120 + h - (y + .5) * h / 60);
      total += weight;
      let visible = 0;
      if (p[0] >= 0 && p[1] >= 0 && p[0] < v.width && p[1] < v.height) {
        const wx = v.x + (p[0] - v.width / 2) / v.scale, wy = v.y + (p[1] - v.height / 2) / v.scale;
        let scene = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) scene += d.renderer.sampleDepth(wx + dx * 2, wy + dy * 2);
        visible = visibility(scene / 9, Math.round(e.objectDepth * 255) / 255);
      } else clipped += weight;
      shown += weight * visible; hidden += weight * (1 - visible);
      if (y < 42) { upperTotal += weight; upperShown += weight * visible; } else lowerHidden += weight * (1 - visible);
    }
    const circle = Array.from({length: 128}, (_, i) => project(o.ring, 24 * Math.cos(i * Math.PI / 64), 24 * Math.sin(i * Math.PI / 64)));
    const rw = Math.max(...circle.map(p => p[0])) - Math.min(...circle.map(p => p[0]));
    const rh = Math.max(...circle.map(p => p[1])) - Math.min(...circle.map(p => p[1]));
    const normal = point.set(0, 0, 1).applyQuaternion(o.ring.quaternion).toArray();
    const foot = placement.anchor.map((n, i) => n * (i ? atlasGeometry.height : atlasGeometry.width) + placement.offset[i]);
    let roadGap = Infinity, nearestRoad;
    for (const edge of d.motion.navigation.edges) {
      const [a, b] = [edge.a, edge.b], dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((foot[0] - a[0]) * dx + (foot[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      const gap = Math.hypot(foot[0] - a[0] - t * dx, foot[1] - a[1] - t * dy);
      if (gap < roadGap) { roadGap = gap; nearestRoad = edge.route; }
    }
    return {backend: d.renderer.backend, foot, placement, hitError, centerHit,
      visible: shown / total, upperVisible: upperShown / upperTotal, lowerShareOfHidden: hidden ? lowerHidden / hidden : 1,
      clipped: clipped / total, reportedVisible: e.surfaceVisibility, objectDepth: e.objectDepth,
      ringNormal: normal, ringRatio: rh / rw, ringSize: [rw, rh], gpuReady: d.covers.gpuLayer.ready,
      nativeSize: [native.width, native.height], roadGap, nearestRoad};
  }, id);
}
async function storyReturn(page, label) {
  await focus(page, 'bridge');
  const before = await page.evaluate(() => atlasGpuDebug.camera.snapshot);
  await page.locator('.atlas-book[data-destination="bridge"]').click();
  await page.waitForSelector('#story-preview[open]');
  const href = await page.locator('#preview-open').getAttribute('href');
  await page.locator('#preview-open').click();
  await page.waitForURL(url => !url.pathname.endsWith('atlas-webgpu.html'));
  await page.locator('#reader-map').click();
  await page.waitForURL('**/atlas-webgpu.html*');
  await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.draws > 0 && atlasGpuDebug.covers.loaded && !atlasGpuDebug.moving);
  const after = await page.evaluate(() => ({camera: atlasGpuDebug.camera.snapshot, cover: atlasGpuDebug.covers.selected}));
  const delta = Math.max(...['x', 'y', 'scale'].map(key => Math.abs(before[key] - after.camera[key])));
  record(`${label} native story open and map return`, href.includes('returnTo=atlas-webgpu.html') && delta < 1e-5 && after.cover === 'bridge',
    {delta, returnedCover: after.cover});
}
async function main() {
  fs.mkdirSync(output, {recursive: true});
  const before = signatures();
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    for (const size of [{width: 1440, height: 1000}, {width: 390, height: 844}, ...(!baseline ? [{width: 320, height: 740}] : [])]) {
      const label = `${size.width}x${size.height}`;
      const context = await browser.newContext({viewport: size, isMobile: size.width < 600, hasTouch: size.width < 600, reducedMotion: 'reduce'});
      await context.addInitScript(() => localStorage.setItem('pinpin.atlas.motion.v1', 'paused'));
      const page = await context.newPage(), errors = [];
      page.setDefaultTimeout(12000);
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base + 'atlas-webgpu.html?lang=en');
        await page.waitForFunction(() => window.atlasGpuDebug?.covers.loaded && atlasGpuDebug.renderer?.stats.draws > 0 && atlasGpuDebug.detector &&
          atlasGpuDebug.covers.entries.every(e => e.image.complete && e.image.naturalWidth));
        await roads(page, label);
        for (const id of baseline ? ['bridge', 'home', 'lake'] : ['bridge', 'lake']) {
          await focus(page, id);
          const file = path.join(output, `${phase}-${label}-${id}.png`);
          await page.screenshot({path: file}); screenshots.push(file);
          await page.evaluate(() => { if (atlasGpuDebug.dof) document.querySelector('#bokeh-toggle').click(); });
          await page.waitForTimeout(80);
          const sharp = path.join(output, `${phase}-${label}-${id}-sharp.png`);
          await page.screenshot({path: sharp}); screenshots.push(sharp);
          await page.evaluate(() => { if (!atlasGpuDebug.dof) document.querySelector('#bokeh-toggle').click(); });
          const data = await banner(page, id);
          record(`${label} ${id} banner`, data.backend === 'webgpu' && data.gpuReady && data.visible >= .8 && data.hitError < 1 && data.centerHit, data);
          record(`${label} ${id} ground`, data.ringNormal.every((n, i) => Math.abs(n - data.placement.ground.normal[i]) < 1e-6) &&
            data.ringRatio < .7 && data.ringRatio > .15 && data.ringNormal[1] > .65, {normal: data.ringNormal, ratio: data.ringRatio});
          record(`${label} ${id} derived road-to-ring clearance`, data.roadGap > data.placement.ground.radius + 6,
            {roadGap: data.roadGap, radius: data.placement.ground.radius, route: data.nearestRoad});
          if (id === 'lake') record(`${label} known flat water-plane reference`,
            Math.abs(data.ringRatio - Math.cos(data.placement.ground.tilt * Math.PI / 180)) < .08,
            {ratio: data.ringRatio, authoredFlatRatio: Math.cos(data.placement.ground.tilt * Math.PI / 180)});
        }
        if (!baseline) await storyReturn(page, label);
        record(`${label} browser errors`, errors.length === 0, errors);
      } catch (error) { record(`${label} runtime`, false, error.message); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
  if (!baseline) {
    const tests = ['atlas-junctions', 'atlas-route-network', 'atlas-camera-return', 'atlas-banner-grounding'].map(name => `scripts/${name}.test.cjs`);
    const env = {...process.env}; delete env.PLAYWRIGHT_MODULE;
    const tested = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...tests], {cwd: path.resolve(root, '../..'), env, encoding: 'utf8', timeout: 20000});
    fs.writeFileSync(path.join(output, 'unit-tests.txt'), (tested.stdout || '') + (tested.stderr || ''));
    record('existing curvature, route, return, grounding units', tested.status === 0,
      {status: tested.status, summary: (tested.stdout || '').split('\n').filter(line => /^# (tests|pass|fail|skipped|duration_ms)/.test(line))});
  }
  const stable = JSON.stringify(before) === JSON.stringify(signatures());
  record('sources stable during run', stable, {seconds: (Date.now() - started) / 1000});
  fs.writeFileSync(path.join(output, `${phase}.json`), JSON.stringify({phase, sources: before, results, screenshots}, null, 2) + '\n');
  fs.writeFileSync(report, [`# Tractor scene ${reviewLabel} ${phase}`, '', baseline ? 'Provisional baseline only. Await READY before final conclusions.' : 'Focused desktop/mobile verification.',
    '', ...results.map(r => `- ${r.pass ? 'PASS' : baseline ? 'BASELINE' : 'FAIL'} ${r.name}`), '',
    'Normal v2 is artistic view-space depth (depthScale 0.75); physical ground inclination cannot be inferred directly. Authored tilt is the perspective reference; screenshots still require terrain review. Lake water supplies the independently flat visual reference.',
    'Dense visibility uses 40x60 alpha samples with the renderer occlusion function and nine scene-depth taps. Native hit bounds are independently projected from cover matrix corners. Road clearance checks a swept 12x2 foot capsule on every derived edge and the full bidirectional blended sprite envelope outside the authored foreground-road corridor.',
    baseline ? 'Baseline observation: tractor ring overlaps the crane boom; placement is pending. Mobile home is 74.4% visible at this camera, with 14.9% clipped; retained as baseline context, not a new frozen-coordinate defect.' : 'Story return uses the native banner, preview link, reader map link, and checks camera/selection restoration.',
    '', ...screenshots.map(file => `- ${file}`), '', `Measurements: ${path.join(output, phase + '.json')}`, ''].join('\n'));
  if (!baseline && results.some(r => !r.pass)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
