'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const root = path.resolve(__dirname, '../docs/storyboard');
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/';
const report = process.env.ATLAS_ROUTE_REPORT || '/tmp/atlas-routes-v7-browser.md';
const output = process.env.ATLAS_ROUTE_SCREENSHOTS || '/tmp/atlas-route-network-v7';
const fullRun = process.env.ATLAS_ROUTE_FULL === '1';
const results = [], screenshots = [], sourceHashes = {};
const hash = text => createHash('sha256').update(text).digest('hex');
const originalIds = ['home-to-lake', 'lake-to-elder', 'lake-to-bridge'];
const storyIds = ['home', 'lake', 'elder', 'bridge'];
const approvedPoi = { tractor: [1248, 820] };
const startedAt = new Date();
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const branchStories = {};
const retainedTraceHashes = {
  'home-to-lake': '41a9892261a1feb233c2289d36523396127c614b21193cff8817662cb94b812c',
  'lake-to-elder': '1bc2c988438101c5a63f48ba77f9beeed9447fa3ac6dca28eb76179ed7342a49'
};
// Independently surveyed on the original 1536x1024 artwork, not inferred from the routes.
const picnicFood = [[1108,603],[1145,598],[1173,600],[1184,611],[1203,605],[1216,608],
  [1216,637],[1190,643],[1170,649],[1144,650],[1107,638]];
const riverCenter = [[835,531],[866,568],[925,616],[956,645],[1004,694],[1057,746],[1094,797],[1170,842]];
const tractorBody = [[1292,745],[1322,734],[1324,726],[1341,722],[1364,682],[1381,680],
  [1408,700],[1410,724],[1456,724],[1462,748],[1458,774],[1424,786],[1380,783],
  [1363,796],[1332,797],[1303,786],[1292,770]];

function intersect(a, b, c, d) {
  const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
  const ab = b.map((v, i) => v - a[i]), cd = d.map((v, i) => v - c[i]), ac = c.map((v, i) => v - a[i]);
  const denominator = cross(ab, cd);
  if (Math.abs(denominator) < 1e-8) return null;
  const t = cross(ac, cd) / denominator, u = cross(ac, ab) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? a.map((v, i) => v + t * ab[i]) : null;
}

function inside(point, polygon) {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
        point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
  }
  return yes;
}

function polygonGap(a, b) {
  if (a.some(p => inside(p, b)) || b.some(p => inside(p, a))) return 0;
  const pointGap = (p, u, v) => {
    const d = v.map((n, i) => n - u[i]);
    const t = Math.max(0, Math.min(1, ((p[0] - u[0]) * d[0] + (p[1] - u[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2 || 1)));
    return distance(p, u.map((n, i) => n + t * d[i]));
  };
  let gap = Infinity;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    const u = a[i], v = a[(i + 1) % a.length], p = b[j], q = b[(j + 1) % b.length];
    if (intersect(u, v, p, q)) return 0;
    gap = Math.min(gap, pointGap(u, p, q), pointGap(v, p, q), pointGap(p, u, v), pointGap(q, u, v));
  }
  return gap;
}

function sweptRectangle(a, b, extent) {
  const corners = [[-extent.left, -extent.up], [extent.right, -extent.up],
    [extent.right, extent.down], [-extent.left, extent.down]];
  const points = [a, b].flatMap(p => corners.map(c => [p[0] + c[0], p[1] + c[1]]))
    .sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const half = list => {
    const result = [];
    for (const p of list) {
      while (result.length > 1 && cross(result.at(-2), result.at(-1), p) <= 0) result.pop();
      result.push(p);
    }
    return result.slice(0, -1);
  };
  return [...half(points), ...half(points.slice().reverse())];
}

async function terrainSafety(page) {
  const data = await page.evaluate(() => ({ width: atlasGeometry.width, height: atlasGeometry.height,
    routes: atlasGeometry.routes, directions: atlasDirections }));
  for (const [id, expected] of Object.entries(retainedTraceHashes)) {
    assert.equal(hash(JSON.stringify(data.routes.find(r => r.id === id).points)), expected,
      id + ': retained original traces remain unchanged; new curved routes and cyan adjustment are permitted');
  }
  const foodHits = [], waterCrossings = [], permittedBridgeCrossings = [];
  const extent = { left: 0, right: 0, up: 0, down: 0 };
  for (const direction of data.directions.directions) for (const frame of direction.frames) {
    const scale = data.directions.displayWidth / direction.referenceWidth;
    extent.left = Math.max(extent.left, frame.anchor[0] * scale);
    extent.right = Math.max(extent.right, (frame.rect[2] - frame.anchor[0]) * scale);
    extent.up = Math.max(extent.up, frame.anchor[1] * scale);
    extent.down = Math.max(extent.down, (frame.rect[3] - frame.anchor[1]) * scale);
  }
  let minimumVehicleGap = Infinity, minimumPicnicGap = Infinity;
  for (const route of data.routes) {
    const points = route.points.map(p => [p[0] * data.width, p[1] * data.height]);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const swept = sweptRectangle(a, b, extent);
      const gap = polygonGap(swept, tractorBody);
      minimumVehicleGap = Math.min(minimumVehicleGap, gap);
      assert(gap >= 14, route.id + ': entire baked segment sprite envelope must clear vehicle by 14px; gap=' + gap);
      const picnicGap = polygonGap(swept, picnicFood);
      minimumPicnicGap = Math.min(minimumPicnicGap, picnicGap);
      assert(picnicGap >= 14, route.id + ': entire baked segment sprite envelope must clear picnic by 14px; gap=' + picnicGap);
      if (inside(a, picnicFood) || inside(b, picnicFood) || picnicFood.some((p, j) => intersect(a, b, p, picnicFood[(j + 1) % picnicFood.length]))) {
        foodHits.push({ route: route.id, segment: i - 1, a, b });
      }
      for (let j = 1; j < riverCenter.length; j++) {
        const point = intersect(a, b, riverCenter[j - 1], riverCenter[j]);
        if (!point) continue;
        const hit = { route: route.id, segment: i - 1, point };
        if (route.id === 'lake-to-elder' && point[0] >= 870 && point[0] <= 1040 && point[1] >= 575 && point[1] <= 635) permittedBridgeCrossings.push(hit);
        else waterCrossings.push(hit);
      }
      assert(a.every((v, axis) => v > 0 && v < (axis ? data.height : data.width)), route.id + ': no map-edge exit');
      assert(b.every((v, axis) => v > 0 && v < (axis ? data.height : data.width)), route.id + ': no map-edge exit');
    }
  }
  assert.deepEqual(foodHits, [], 'No route steps onto the picnic blanket/basket: ' + JSON.stringify(foodHits));
  assert.deepEqual(waterCrossings, [], 'No water crossing outside the original bridge: ' + JSON.stringify(waterCrossings));
  assert(permittedBridgeCrossings.length, 'River survey intersects the known original bridge crossing');
  return { retainedTraceHashes, picnicFood, riverCenter, foodHits, waterCrossings, permittedBridgeCrossings,
    tractorBody, spriteExtent: extent, minimumVehicleGap, minimumPicnicGap,
    limits: 'Segment intersections against an independent manual food polygon and visible river centerline. Not a collision mask or proof of all vegetation/rock clearance; runtime closeups support aesthetic review.' };
}

async function check(name, run) {
  const start = performance.now();
  try {
    const detail = await run(); results.push({ name, pass: true, elapsedMs: performance.now() - start, detail });
    console.log('PASS ' + name); return detail;
  } catch (error) {
    results.push({ name, pass: false, elapsedMs: performance.now() - start, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message);
  }
}

// Wait for purposeful story alternatives and source stability before final browser checks.
async function waitForWorkers() {
  const until = Date.now() + Number(process.env.ATLAS_ROUTE_WAIT_MS || 900000);
  let previous = '', stableSince = Date.now();
  while (Date.now() < until) {
    const geometry = fs.readFileSync(path.join(root, 'atlas-geometry.js'), 'utf8');
    const motion = fs.readFileSync(path.join(root, 'atlas-motion.js'), 'utf8');
    const sandbox = { window: {} };
    vm.runInNewContext(geometry, sandbox, { timeout: 1000 });
    const signature = hash(geometry) + hash(motion);
    if (signature !== previous) { previous = signature; stableSince = Date.now(); }
    const geometryData = sandbox.window.atlasGeometry;
    const routes = geometryData.routes;
    const additions = routes.filter(r => !originalIds.includes(r.id));
    if (Date.now() - stableSince >= 10000 && geometryData.routeSurveyVersion === 7 &&
        routes.some(r => r.id === 'tractor-west-to-picnic') &&
        !routes.some(r => ['home-lower-road-west-bank', 'right-bank-to-tractor-road', 'tractor-road-to-picnic'].includes(r.id)) &&
        routes.some(r => /tractor/.test(r.id) && distance([r.points.at(-1)[0] * 1536, r.points.at(-1)[1] * 1024], approvedPoi.tractor) < 1) &&
        originalIds.every(id => routes.some(r => r.id === id)) &&
        additions.length && additions.every(r => [r.points[0], r.points.at(-1)].every(p =>
          Object.values(approvedPoi).some(q => distance([p[0] * 1536, p[1] * 1024], q) < 1) ||
          routes.some(other => other !== r && other.points.some(q => Math.hypot((p[0] - q[0]) * 1536, (p[1] - q[1]) * 1024) < 12))))) {
      sourceHashes.geometry = hash(geometry); sourceHashes.motion = hash(motion); return;
    }
    console.log('Waiting for v7 tractor through-connection and ten seconds of source stability.');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error('Timed out waiting for geometry and motion workers; no final browser validation performed.');
}

function instrument() {
  const paths = new WeakMap();
  window.routeProbe = { enabled: true, strokes: [], frames: 0 };
  for (const name of ['moveTo', 'lineTo']) {
    const original = Path2D.prototype[name];
    Path2D.prototype[name] = function (x, y) {
      if (!paths.has(this)) paths.set(this, []);
      paths.get(this).push([x, y]); return original.apply(this, arguments);
    };
  }
  const proto = CanvasRenderingContext2D.prototype, clear = proto.clearRect, stroke = proto.stroke;
  proto.clearRect = function () {
    if (this.canvas.id === 'map-motion' && routeProbe.enabled) { routeProbe.strokes = []; routeProbe.frames++; }
    return clear.apply(this, arguments);
  };
  proto.stroke = function (path) {
    if (this.canvas.id === 'map-motion' && routeProbe.enabled && paths.has(path)) {
      routeProbe.strokes.push({ points: paths.get(path), alpha: this.globalAlpha,
        width: this.lineWidth, offset: this.lineDashOffset, dash: this.getLineDash() });
    }
    return stroke.apply(this, arguments);
  };
}

async function state(page) {
  return page.evaluate(() => ({ ...atlasGpuDebug.motionCanvas.dataset,
    paused: atlasGpuDebug.motion.paused, strokes: routeProbe.strokes,
    camera: atlasGpuDebug.camera.snapshot, renderer: atlasGpuDebug.renderer.stats }));
}

async function pause(page) {
  await page.evaluate(() => { if (!atlasGpuDebug.motion.paused) atlasGpuDebug.motion.toggle(); });
}

async function pixels(page) {
  const png = await page.locator('#world-canvas').screenshot();
  const measured = await page.evaluate(async encoded => {
    const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: 128, height: 96 });
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 128, 96);
    const data = ctx.getImageData(0, 0, 128, 96).data, colors = new Set();
    let opaque = 0, sum = 0, squares = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 240) opaque++;
      colors.add([data[i] >> 4, data[i + 1] >> 4, data[i + 2] >> 4].join(','));
      const l = (data[i] + data[i + 1] + data[i + 2]) / 3; sum += l; squares += l * l;
    }
    return { opaque, colors: colors.size, variance: squares / 12288 - (sum / 12288) ** 2 };
  }, png.toString('base64'));
  assert(measured.opaque > 11000 && measured.colors > 40 && measured.variance > 50,
    'GPU canvas must contain visible textured artwork: ' + JSON.stringify(measured));
  return measured;
}

async function capture(page, name) {
  const measured = await pixels(page), file = path.join(output, name + '.png');
  await page.screenshot({ path: file }); screenshots.push(file); return { file, pixels: measured };
}

async function topology(page) {
  await pause(page);
  const storyPoints = await page.evaluate(ids => Object.fromEntries(ids.map(id => {
    if (!atlasGpuDebug.motion.placeAtLocation(id)) throw new Error('Missing story return: ' + id);
    const d = atlasGpuDebug.motionCanvas.dataset;
    return [id, [Number(d.x), Number(d.y)]];
  })), storyIds);
  await page.evaluate(() => atlasGpuDebug.motion.placeAtLocation('home'));
  const data = await page.evaluate(() => ({ routes: atlasGeometry.routes, strokes: routeProbe.strokes }));
  assert(originalIds.every(id => data.routes.some(r => r.id === id)), 'Original story route identities retained');
  const additions = data.routes.filter(r => !originalIds.includes(r.id));
  assert(additions.length, 'There are alternatives to the original story routes');
  assert.equal(new Set(data.routes.map(r => r.id)).size, data.routes.length, 'Unique route identities');
  assert(!data.routes.some(r => ['home-lower-road-west-bank', 'right-bank-to-tractor-road', 'tractor-road-to-picnic'].includes(r.id)),
    'Removed riverbank returns and eastern vehicle detour stay removed');
  const tractor = data.routes.find(r => r.to === 'tractor');
  assert(tractor && distance(tractor.points.at(-1).map((v, i) => v * (i ? 1024 : 1536)), approvedPoi.tractor) < 1,
    'The lower road joins the tractor through-connection');
  const adjacency = new Map(), key = p => p.map(n => n.toFixed(6)).join(',');
  let edges = 0;
  for (const stroke of data.strokes) {
    assert.deepEqual(stroke.dash, [5, 11], 'Network uses dashed strokes');
    for (let i = 1; i < stroke.points.length; i++) {
      const a = key(stroke.points[i - 1]), b = key(stroke.points[i]);
      if (!adjacency.has(a)) adjacency.set(a, new Set());
      if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a).add(b); adjacency.get(b).add(a); edges++;
    }
  }
  const reached = new Set(), stack = [adjacency.keys().next().value];
  while (stack.length) {
    const node = stack.pop(); if (reached.has(node)) continue;
    reached.add(node); for (const next of adjacency.get(node) || []) stack.push(next);
  }
  assert(adjacency.size > 2 && reached.size === adjacency.size, 'All rendered graph nodes form one connected network');
  const leaves = [...adjacency].filter(([, neighbors]) => neighbors.size === 1).map(([node]) => {
    const point = node.split(',').map(Number);
    const nearest = Object.entries(storyPoints).sort((a, b) => distance(a[1], point) - distance(b[1], point))[0];
    const error = distance(nearest[1], point);
    assert(error <= 12, 'No unapproved dead end: ' + JSON.stringify({ point, nearest: nearest[0], error }));
    return { point, destination: nearest[0], kind: 'story', error };
  });
  const tractorNode = [...adjacency.keys()].find(node => distance(node.split(',').map(Number), approvedPoi.tractor) < .01);
  assert(tractorNode && adjacency.get(tractorNode).size >= 2, 'Tractor must have a through-connection, never a terminal exemption');
  const neighbors = [...adjacency.get(tractorNode)], cycleSeen = new Set([neighbors[0]]), queue = [neighbors[0]];
  for (let i = 0; i < queue.length; i++) for (const next of adjacency.get(queue[i]) || []) {
    if (next !== tractorNode && !cycleSeen.has(next)) { cycleSeen.add(next); queue.push(next); }
  }
  assert(neighbors.slice(1).some(node => cycleSeen.has(node)), 'Tractor lies on the lower-road/picnic/bridge/Home cycle');
  return { routes: data.routes.length, routeIds: data.routes.map(r => r.id),
    authoredPoints: data.routes.reduce((n, r) => n + r.points.length, 0),
    graphNodes: adjacency.size, graphEdges: edges, reachableNodes: reached.size, leaves, storyPoints,
    tractorDegree: adjacency.get(tractorNode).size, tractorCycle: true };
}

function branchReturns() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'atlas-geometry.js'), 'utf8'), sandbox);
  const source = fs.readFileSync(path.join(root, 'atlas-motion.js'), 'utf8');
  const marker = 'window.AtlasMotion={create';
  assert(source.includes(marker), 'Production graph factory can be observed in isolated VM');
  vm.runInNewContext(source.replace(marker, 'window.routeGraphForTest=graphFor; ' + marker), sandbox);
  const geometry = sandbox.window.atlasGeometry;
  const routes = geometry.routes.map(r => ({ ...r, points: r.points.map(p => [p[0] * geometry.width, p[1] * geometry.height]) }));
  const graph = sandbox.window.routeGraphForTest(routes);
  const homeLake = routes.find(r => r.id === 'home-to-lake');
  const tractorPoint = geometry.navigationDestinations?.find(p => p.id === 'tractor')?.point;
  assert(tractorPoint, 'Approved tractor navigation destination is declared');
  const stories = { home: homeLake.points[0], lake: homeLake.points.at(-1),
    elder: routes.find(r => r.id === 'lake-to-elder').points.at(-1),
    bridge: routes.find(r => r.id === 'lake-to-bridge').points.at(-1),
    tractor: [tractorPoint[0] * geometry.width, tractorPoint[1] * geometry.height] };
  return routes.filter(r => !originalIds.includes(r.id)).map(route => {
    const nearest = (point, exclude) => Object.entries(stories).filter(([id]) => id !== exclude)
      .sort((a, b) => graph.plan(point, a[1]).length - graph.plan(point, b[1]).length)[0][0];
    const namedDestination = route.to.split('-').find(id => stories[id]);
    const to = namedDestination || nearest(route.points.at(-1), route.from);
    const from = stories[route.from] ? route.from : nearest(route.points[0], to);
    branchStories[route.id] = { from, to };
    const points = fullRun ? [...route.points, ...route.points.slice(1).map((p, i) => p.map((v, j) => (v + route.points[i][j]) / 2))]
      : [route.points[0], route.points[Math.floor(route.points.length / 2)], route.points.at(-1)];
    let plans = 0;
    for (const point of points) for (const id of [from, to]) {
      for (const [start, target] of [[point, stories[id]], [stories[id], point]]) {
        const plan = graph.plan(start, target);
        assert(plan && Number.isFinite(plan.length), route.id + ': connected journey to/from ' + id);
        assert(distance(plan.target, target) < 1e-5, route.id + ': reaches actual endpoint');
        assert(distance(plan.points[0], start) < 1e-5 && distance(plan.points.at(-1), target) < 1e-5);
        plans++;
      }
    }
    return { id: route.id, from, to, authoredFrom: route.from, authoredTo: route.to, testedPoints: points.length, successfulPlans: plans,
      method: fullRun ? 'Production planner: every vertex/segment midpoint to both destinations, both directions'
        : 'Production planner: start/middle/end to both destinations, both directions; tractor is an approved nonstory POI' };
  });
}

async function movement(page, reverse) {
  await pause(page);
  await page.evaluate(reverse => {
    atlasGpuDebug.motion.placeAtLocation(reverse ? 'lake' : 'home');
    const route = atlasGeometry.routes.find(r => r.id === 'home-to-lake');
    atlasGpuDebug.motion.setTarget(reverse ? route.points[0] : route.points.at(-1));
  }, reverse);
  const before = await state(page), selected = before.strokes.filter(s => s.alpha > .8);
  assert(selected.length > 0 && selected.length < before.strokes.length, 'Chosen journey is highlighted inside the whole network');
  const origin = [Number(before.x), Number(before.y)];
  const first = selected.find(s => Math.hypot(s.points[0][0] - origin[0], s.points[0][1] - origin[1]) < .1);
  assert(first, 'First selected stroke starts at MrPinPin, including reverse travel');
  await page.evaluate(points => {
    const x = Math.max(0, Math.floor(Math.min(...points.map(p => p[0]))) - 6);
    const y = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))) - 6);
    const w = Math.ceil(Math.max(...points.map(p => p[0]))) - x + 6;
    const h = Math.ceil(Math.max(...points.map(p => p[1]))) - y + 6;
    const ctx = atlasGpuDebug.motionCanvas.getContext('2d');
    routeProbe.pixelBefore = { x, y, w, h, data: ctx.getImageData(x, y, w, h).data };
  }, first.points);
  await page.evaluate(() => atlasGpuDebug.motion.toggle());
  await page.waitForTimeout(180);
  await pause(page);
  const after = await state(page), delta = [Number(after.x) - origin[0], Number(after.y) - origin[1]];
  const tangent = first.points.at(-1).map((v, i) => v - first.points[0][i]);
  const distance = Math.hypot(...delta), alignment = (delta[0] * tangent[0] + delta[1] * tangent[1]) / (distance * Math.hypot(...tangent));
  assert(distance > 1 && distance < 40, 'Real RAF moves character a bounded distance');
  assert(alignment > .9, 'Selected stroke direction agrees with character travel');
  const same = after.strokes.find(s => JSON.stringify(s.points) === JSON.stringify(first.points));
  assert(same, 'Selected segment persists while moving');
  const phaseDelta = ((same.offset - first.offset + 8) % 16 + 16) % 16 - 8;
  assert(phaseDelta < -.01, 'Dash pattern advances along the selected path direction');
  const dashPixels = await page.evaluate(() => {
    const { x, y, w, h, data: a } = routeProbe.pixelBefore;
    const b = atlasGpuDebug.motionCanvas.getContext('2d').getImageData(x, y, w, h).data;
    let whiteBefore = 0, whiteAfter = 0, changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      const aw = a[i] > 230 && a[i + 1] > 230 && a[i + 2] > 230 && a[i + 3] > 175;
      const bw = b[i] > 230 && b[i + 1] > 230 && b[i + 2] > 230 && b[i + 3] > 175;
      if (aw) whiteBefore++; if (bw) whiteAfter++;
      if (aw !== bw) changed++;
    }
    return { whiteBefore, whiteAfter, changed, sampleRect: [x, y, w, h] };
  });
  assert(dashPixels.whiteBefore > 3 && dashPixels.whiteAfter > 3 && dashPixels.changed > 2,
    'Actual motion canvas contains visible white dash pixels that move: ' + JSON.stringify(dashPixels));
  assert.equal(after.sprite, 'ready');
  return { direction: reverse ? 'lake-to-home' : 'home-to-lake', distance, alignment, phaseDelta,
    selectedStrokes: selected.length, totalStrokes: before.strokes.length, heading: Number(after.heading), dashPixels };
}

async function targets(page, width) {
  await pause(page);
  const choices = await page.evaluate(({ originalIds, branchStories, fullRun }) => {
    const world = p => [p[0] * atlasGeometry.width, p[1] * atlasGeometry.height];
    const segmentDistance = (p, a, b) => {
      const d = b.map((v, i) => v - a[i]);
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2 || 1)));
      return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1]);
    };
    return atlasGeometry.routes.filter(r => fullRun ? !originalIds.includes(r.id) : r.to === 'tractor').map(route => {
      const others = atlasGeometry.routes.filter(r => r !== route).flatMap(r => r.points.slice(1).map((p, i) => [world(r.points[i]), world(p)]));
      const samples = route.points.slice(1).map((p, i) => {
        const point = p.map((v, j) => (v + route.points[i][j]) / 2);
        const clearance = Math.min(...others.map(([a, b]) => segmentDistance(world(point), a, b)));
        return { point, clearance };
      }).sort((a, b) => b.clearance - a.clearance);
      return { id: route.id, ...branchStories[route.id], ...samples[0] };
    });
  }, { originalIds, branchStories, fullRun });
  const measured = [];
  const strength = await page.evaluate(() => {
    const strength = atlasGpuDebug.renderer.stats.bokehStrength;
    atlasGpuDebug.renderer.setBokehStrength(0); return strength;
  });
  try {
  for (const choice of choices) {
    assert(choice.clearance > 3, choice.id + ' provides a separately targetable alternative');
    // One world pixel off the route exercises projection from nearby terrain.
    const near = [choice.point[0] + 1 / 1536, choice.point[1]];
    await page.evaluate(choice => {
      atlasGpuDebug.motion.placeAtLocation(choice.from); atlasGpuDebug.motion.setTarget(choice.near);
    }, { ...choice, near });
    const s = await state(page), target = JSON.parse(s.target);
    const error = Math.hypot(target[0] - choice.point[0] * 1536, target[1] - choice.point[1] * 1024);
    assert(error < 2, choice.id + ' is reachable near its requested world coordinate');
    assert.equal(s.route, choice.id, 'Nearby setTarget chooses the new alternative');
    assert(s.strokes.some(stroke => stroke.alpha > .8), choice.id + ' has a rendered chosen journey');
    const forwardFlow = fullRun ? await branchFlow(page, choice) : null;
    await page.evaluate(point => {
      const c = atlasGpuDebug.camera.snapshot;
      const scale = Math.max(c.width / 1536, c.height / 1024) * (c.width < 600 ? 2.3 : 2);
      atlasGpuDebug.camera.focus([point[0] * 1536 + 60 / scale, point[1] * 1024 + 30 / scale], scale);
    }, choice.point);
    await page.waitForTimeout(450);
    const cameraBefore = (await state(page)).camera;
    await page.evaluate(from => atlasGpuDebug.motion.placeAtLocation(from), choice.from);
    const box = await page.locator('#world-canvas').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    if (width < 600) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: x + i * 10, y: y + i * 5 }] });
      await page.waitForTimeout(100);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else {
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x + 60, y + 30, { steps: 6 });
      await page.waitForTimeout(100); await page.mouse.up();
    }
    await page.waitForTimeout(500);
    const panned = await state(page);
    assert(distance([cameraBefore.x, cameraBefore.y], [panned.camera.x, panned.camera.y]) > 10, 'Native pan changes camera');
    assert.equal(panned.route, choice.id, 'Native pan settling chooses the new alternative');
    const panError = distance(JSON.parse(panned.target), choice.point.map((v, i) => v * (i ? 1024 : 1536)));
    const panProjection = await page.evaluate(({ id, camera }) => {
      const route = atlasGeometry.routes.find(r => r.id === id), p = [camera.x, camera.y];
      const points = route.points.map(q => [q[0] * atlasGeometry.width, q[1] * atlasGeometry.height]);
      return points.slice(1).map((b, i) => {
        const a = points[i], d = b.map((v, j) => v - a[j]);
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2 || 1)));
        const point = a.map((v, j) => v + t * d[j]);
        return { point, distance: Math.hypot(point[0] - p[0], point[1] - p[1]) };
      }).sort((a, b) => a.distance - b.distance)[0].point;
    }, { id: choice.id, camera: panned.camera });
    const panProjectionError = distance(JSON.parse(panned.target), panProjection);
    assert(panProjectionError < 12, 'Native pan targets the actual resting camera center within motion target hysteresis: ' +
      JSON.stringify({ id: choice.id, panProjectionError, panError, target: panned.target, camera: panned.camera }));
    // Clear the pan target; only a native click/tap may select the next journey.
    await page.evaluate(to => atlasGpuDebug.motion.placeAtLocation(to), storyIds.includes(choice.to) ? choice.to : choice.from);
    const screen = await page.evaluate(point => atlasGpuDebug.camera.worldToScreen([point[0] * 1536, point[1] * 1024]), near);
    if (width < 600) await page.touchscreen.tap(box.x + screen[0], box.y + screen[1]);
    else await page.mouse.click(box.x + screen[0], box.y + screen[1]);
    await page.waitForTimeout(100);
    const tapped = await state(page);
    assert.equal(tapped.route, choice.id, 'Native click/tap chooses the new alternative from its other story');
    assert(tapped.strokes.some(stroke => stroke.alpha > .8), 'Native input creates highlighted journey');
    let reverseFlow = fullRun ? await branchFlow(page, choice) : null;
    let directionDot = fullRun ? forwardFlow.tangent.reduce((sum, v, i) => sum + v * reverseFlow.tangent[i], 0) /
      (Math.hypot(...forwardFlow.tangent) * Math.hypot(...reverseFlow.tangent)) : null;
    let loopTurn = null;
    if (fullRun && directionDot >= -.99) {
      loopTurn = await nativeLoopTurn(page, choice, width);
      reverseFlow = loopTurn.reverseFlow;
      directionDot = forwardFlow.tangent.reduce((sum, v, i) => sum + v * reverseFlow.tangent[i], 0) /
        (Math.hypot(...forwardFlow.tangent) * Math.hypot(...reverseFlow.tangent));
    }
    if (fullRun) assert(directionDot < -.99, choice.id + ': branch white-flow reverses on an actual return journey');
    measured.push({ ...choice, actualRoute: s.route, targetError: error, panError, panProjectionError,
      nativePanRoute: panned.route, nativeTapRoute: tapped.route, nativeInput: width < 600 ? 'CDP touch drag and touchscreen tap' : 'mouse drag and click',
      forwardFlow, reverseFlow, directionDot, loopTurn,
      screenshot: await capture(page, width + '-' + choice.id + '-terrain') });
  }
  } finally {
    await page.evaluate(strength => { atlasGpuDebug.renderer.setBokehStrength(strength); atlasGpuDebug.motion.update(); }, strength);
  }
  return measured;
}

async function nativeLoopTurn(page, choice, width) {
  const before = await state(page), target = JSON.parse(before.target);
  const terminal = before.strokes.find(s => s.alpha > .8 && distance(s.points.at(-1), target) < .1);
  assert(terminal, 'Loop journey has a directed final segment');
  const a = terminal.points[0], b = terminal.points.at(-1), length = distance(a, b);
  const backDistance = Math.min(24, length * .95);
  assert(backDistance > 12, 'Loop reversal target must exceed existing target hysteresis');
  const reverseTarget = b.map((v, i) => v + (a[i] - v) * backDistance / length);
  const start = performance.now();
  console.log('Walking ' + choice.id + ' to its loop target before native reversal.');
  await page.evaluate(() => atlasGpuDebug.motion.toggle());
  await page.waitForFunction(target => {
    const d = atlasGpuDebug.motionCanvas.dataset;
    return Math.hypot(Number(d.x) - target[0], Number(d.y) - target[1]) < .5;
  }, target, { timeout: 60000 });
  await pause(page);
  const arrival = await state(page), elapsedMs = performance.now() - start;
  const box = await page.locator('#world-canvas').boundingBox();
  const screen = await page.evaluate(point => atlasGpuDebug.camera.worldToScreen(point), reverseTarget);
  if (width < 600) await page.touchscreen.tap(box.x + screen[0], box.y + screen[1]);
  else await page.mouse.click(box.x + screen[0], box.y + screen[1]);
  await page.waitForTimeout(100);
  const reversed = await state(page);
  assert.equal(reversed.route, choice.id, 'Native reversal stays on the same approved loop');
  const reverseFlow = await branchFlow(page, choice);
  return { method: 'Real-time production RAF walk to loop target, then native click/tap back along the same segment',
    elapsedMs, target, arrival: [Number(arrival.x), Number(arrival.y)], reverseTarget, reverseFlow };
}

async function branchFlow(page, choice) {
  const before = await state(page), target = JSON.parse(before.target);
  const stroke = before.strokes.find(s => s.alpha > .8 && distance(s.points.at(-1), target) < .1);
  assert(stroke, choice.id + ': directed selected stroke ends at requested branch target');
  const observed = await page.evaluate(points => {
    const x = Math.max(0, Math.floor(Math.min(...points.map(p => p[0]))) - 5);
    const y = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))) - 5);
    const w = Math.ceil(Math.max(...points.map(p => p[0]))) - x + 5;
    const h = Math.ceil(Math.max(...points.map(p => p[1]))) - y + 5;
    const data = atlasGpuDebug.motionCanvas.getContext('2d').getImageData(x, y, w, h).data;
    routeProbe.branchPixels = { x, y, w, h, data };
    return { x, y, w, h };
  }, stroke.points);
  await page.evaluate(() => atlasGpuDebug.motion.toggle());
  await page.waitForTimeout(180);
  await pause(page);
  const after = await state(page);
  const same = after.strokes.find(s => JSON.stringify(s.points) === JSON.stringify(stroke.points));
  assert(same, 'Observed branch stroke persists during real animation frames');
  const phaseDelta = ((same.offset - stroke.offset + 8) % 16 + 16) % 16 - 8;
  assert(phaseDelta < -.01, 'White dash pattern advances along directed branch stroke');
  const pixelDelta = await page.evaluate(() => {
    const { x, y, w, h, data: a } = routeProbe.branchPixels;
    const b = atlasGpuDebug.motionCanvas.getContext('2d').getImageData(x, y, w, h).data;
    let before = 0, after = 0, changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      const aw = a[i] > 230 && a[i + 1] > 230 && a[i + 2] > 230 && a[i + 3] > 175;
      const bw = b[i] > 230 && b[i + 1] > 230 && b[i + 2] > 230 && b[i + 3] > 175;
      before += Number(aw); after += Number(bw); changed += Number(aw !== bw);
    }
    return { before, after, changed };
  });
  assert(pixelDelta.before > 3 && pixelDelta.after > 3 && pixelDelta.changed > 2,
    'White branch dash pixels are visible and moving: ' + JSON.stringify(pixelDelta));
  return { tangent: stroke.points.at(-1).map((v, i) => v - stroke.points[0][i]), phaseDelta, pixelDelta, sampleRect: observed };
}

async function benchmark(page) {
  await pause(page);
  const measured = await page.evaluate(() => {
    atlasGpuDebug.motion.placeAtLocation('home');
    const choices = atlasGeometry.routes.flatMap(r => [r.points[0], r.points.at(-1), r.points[Math.floor(r.points.length / 2)]]);
    const durations = []; let accepted = 0;
    routeProbe.enabled = false;
    try {
      for (let i = 0; i < 130; i++) {
        const point = choices[i % choices.length], before = atlasGpuDebug.motionCanvas.dataset.target;
        const start = performance.now(); atlasGpuDebug.motion.setTarget(point); const duration = performance.now() - start;
        if (i >= 10 && before !== atlasGpuDebug.motionCanvas.dataset.target) { durations.push(duration); accepted++; }
      }
    } finally { routeProbe.enabled = true; atlasGpuDebug.motion.update(); }
    const sorted = durations.slice().sort((a, b) => a - b), total = durations.reduce((a, b) => a + b, 0);
    return { paused: atlasGpuDebug.motion.paused, calls: 120, accepted, measuredCalls: durations.length,
      totalMs: total, meanMs: total / durations.length, p50Ms: sorted[Math.floor(sorted.length * .5)],
      p95Ms: sorted[Math.floor(sorted.length * .95)], maxMs: sorted.at(-1) };
  });
  assert(measured.paused && measured.accepted >= 90, 'Benchmark actually plans distinct paused targets without coalescing');
  assert(measured.totalMs < 5000 && measured.p95Ms < 60 && measured.maxMs < 250,
    'Bounded setTarget including plan, trail rebuild, and immediate canvas draw: ' + JSON.stringify(measured));
  return measured;
}

async function controls(page, mobile) {
  await page.locator('#atlas-language-toggle').click();
  assert(await page.locator('#atlas-languages').isVisible());
  await page.locator('[data-lang="es"]').click();
  assert.equal(await page.locator('[data-lang="es"]').getAttribute('aria-pressed'), 'true');
  await page.locator('#atlas-language-toggle').click();
  await page.locator('[data-lang="en"]').click();
  const canvas = page.locator('#world-canvas');
  await canvas.focus(); await page.keyboard.press('Home'); await page.waitForTimeout(350);
  const fit = await page.evaluate(() => atlasGpuDebug.camera.snapshot);
  await page.keyboard.press('+'); await page.waitForTimeout(350);
  const zoom = await page.evaluate(() => atlasGpuDebug.camera.snapshot);
  assert(zoom.scale > fit.scale, 'Keyboard zoom control works');
  const box = await canvas.boundingBox(), x = box.x + box.width * .5, y = box.y + box.height * .7;
  if (mobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: x + i * 8, y: y + i * 3 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  } else {
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + 100, y + 35, { steps: 8 }); await page.mouse.up();
  }
  await page.waitForTimeout(550);
  const pan = await page.evaluate(() => atlasGpuDebug.camera.snapshot);
  assert(Math.hypot(pan.x - zoom.x, pan.y - zoom.y) > 10, 'Pointer pan moves camera');
  const hiddenControls = await page.locator('.map-controls').evaluate(el => ({ hidden: el.hidden, inert: el.inert }));
  assert.deepEqual(hiddenControls, { hidden: true, inert: true }, 'Current hidden toolbar stays hidden');
  await page.evaluate(() => document.getElementById('motion-toggle').click());
  assert.equal(await page.evaluate(() => atlasGpuDebug.motion.paused), false, 'Pause/play handler resumes motion');
  await page.waitForFunction(() => atlasGpuDebug.renderer.stats.scenery.uploads > 3);
  const before = await state(page); await page.waitForTimeout(600); const after = await state(page);
  assert(after.renderer.scenery.uploads > before.renderer.scenery.uploads, 'Video resumes decoded-frame uploads');
  assert(after.renderer.scenery.media.currentTime !== before.renderer.scenery.media.currentTime, 'Video playback time advances');
  await page.evaluate(() => document.getElementById('motion-toggle').click()); await page.waitForTimeout(150);
  const stopped = await state(page); await page.waitForTimeout(250); const still = await state(page);
  assert.equal(still.renderer.scenery.uploads, stopped.renderer.scenery.uploads, 'Paused video stops uploading');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
  return { language: true, keyboardZoom: true, panInput: mobile ? 'CDP touch' : 'mouse',
    panDistance: Math.hypot(pan.x - zoom.x, pan.y - zoom.y), hiddenControls,
    resumedVideoUploads: after.renderer.scenery.uploads - before.renderer.scenery.uploads, pausedVideo: true };
}

async function overviewOverlay(page) {
  const data = await page.evaluate(() => ({ routes: atlasGeometry.routes, width: atlasGeometry.width, height: atlasGeometry.height }));
  const preview = await page.context().newPage();
  try {
    await preview.setViewportSize({ width: 1536, height: 1100 });
    await preview.setContent('<style>body{margin:0;background:white;font:16px system-ui}p{margin:12px}canvas{display:block}</style><p>Debug route overlay on original artwork. Colored paths and point markers are verification aids, not production styling.</p><canvas></canvas>');
    await preview.evaluate(async ({ data, src }) => {
      const art = new Image(); art.src = src; await art.decode();
      const canvas = document.querySelector('canvas'); canvas.width = data.width; canvas.height = data.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(art, 0, 0, data.width, data.height);
      const colors = ['#cf183a', '#3158db', '#037662', '#c2429c', '#007cba', '#be6300'];
      data.routes.forEach((route, index) => {
        const points = route.points.map(([x, y]) => [x * data.width, y * data.height]);
        ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.strokeStyle = 'white'; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = colors[index % colors.length]; ctx.lineWidth = 2.5; ctx.stroke();
        for (const [x, y] of points) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); }
        const [x, y] = points[Math.floor(points.length / 2)]; ctx.font = 'bold 13px system-ui';
        ctx.lineWidth = 4; ctx.strokeStyle = 'white'; ctx.strokeText(route.id, x + 7, y - 8);
        ctx.fillStyle = '#121212'; ctx.fillText(route.id, x + 7, y - 8);
      });
    }, { data, src: base + 'images/atlas/shire-v1.webp' });
    const file = path.join(output, 'original-art-debug-overview.png');
    await preview.screenshot({ path: file, fullPage: true }); screenshots.push(file); return { file };
  } finally { await preview.close(); }
}

async function terrainCloseups(page, width) {
  await pause(page);
  const strength = await page.evaluate(() => {
    const value = atlasGpuDebug.renderer.stats.bokehStrength;
    atlasGpuDebug.renderer.setBokehStrength(0); return value;
  });
  const views = [
    { name: 'picnic-food-clearance', center: [1200, 635], worldWidth: 430, place: 'bridge' },
    { name: 'tractor-bottom-connected-loop', center: [1230, 795], worldWidth: 530, place: 'bridge' },
    { name: 'left-bank-return-connection', center: [810, 740], worldWidth: 500, place: 'home' }
  ];
  const shots = [];
  try {
    for (const view of views) {
      await page.evaluate(view => {
        const camera = atlasGpuDebug.camera;
        camera.focus(view.center, camera.snapshot.width / view.worldWidth);
      }, view);
      await page.waitForTimeout(450);
      await page.evaluate(view => atlasGpuDebug.motion.placeAtLocation(view.place), view);
      shots.push({ name: view.name, camera: (await state(page)).camera,
        screenshot: await capture(page, width + '-' + view.name) });
      if (view.name === 'picnic-food-clearance') {
        const box = await page.locator('#world-canvas').boundingBox();
        const x = box.x + box.width * .3, y = box.y + box.height * .75;
        let cdp;
        try {
          if (width < 600) {
            cdp = await page.context().newCDPSession(page);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 8, y }] });
          } else {
            await page.mouse.move(x, y); await page.mouse.down();
            await page.mouse.move(x + 8, y, { steps: 2 });
          }
          shots.push({ name: 'picnic-character-standing', camera: (await state(page)).camera,
            character: [Number((await state(page)).x), Number((await state(page)).y)],
            method: 'Native drag held while paused; existing story banner remains visible; no DOM or production changes',
            screenshot: await capture(page, width + '-picnic-character-standing') });
        } finally {
          if (cdp) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); }
          else await page.mouse.up();
        }
      }
    }
  } finally {
    await page.evaluate(strength => { atlasGpuDebug.renderer.setBokehStrength(strength); atlasGpuDebug.motion.update(); }, strength);
  }
  return shots;
}

async function focusedActual(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 },
    isMobile: width < 600, hasTouch: width < 600, reducedMotion: 'no-preference' });
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(instrument);
  try {
    await page.goto(base + 'atlas-webgpu.html');
    await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.draws > 2 &&
      atlasGpuDebug.motionCanvas.dataset.sprite === 'ready' && atlasGpuDebug.renderer.stats.scenery.uploads > 3);
    assert.equal(await page.evaluate(() => atlasGpuDebug.renderer.backend), 'webgpu');
    await capture(page, width + '-default');
    if (width === 1440) await check('v7 tractor through-connection, loop, and full sprite clearance', async () => {
      const graph = await topology(page), terrain = await terrainSafety(page);
      const metadata = await page.evaluate(() => ({ stories: atlasGeometry.regions.map(r => r.id),
        poi: atlasGeometry.navigationDestinations }));
      assert.deepEqual(metadata.stories.slice().sort(), storyIds.slice().sort(), 'No new tractor story region');
      assert(metadata.poi.some(p => p.id === 'tractor' && distance(p.point.map((v, i) => v * (i ? 1024 : 1536)), approvedPoi.tractor) < 1));
      return { routeIds: graph.routeIds, leaves: graph.leaves, tractorDegree: graph.tractorDegree, tractorCycle: graph.tractorCycle,
        minimumVehicleGap: terrain.minimumVehicleGap, minimumPicnicGap: terrain.minimumPicnicGap,
        spriteExtent: terrain.spriteExtent, originalTwoTraces: 'unchanged', picnicFoodHits: terrain.foodHits.length,
        extraVisibleRiverCrossings: terrain.waterCrossings.length, tractorStoryUI: false };
    });
    await check(width + ' native lower-road pan and tap', async () => {
      const detail = await targets(page, width);
      return detail.map(d => ({ id: d.id, nativeInput: d.nativeInput, route: d.nativeTapRoute,
        targetError: d.targetError, panProjectionError: d.panProjectionError }));
    });
    if (width === 1440) {
      await pause(page);
      await page.evaluate(() => {
        atlasGpuDebug.renderer.setBokehStrength(0);
        atlasGpuDebug.camera.focus([1200, 635], atlasGpuDebug.camera.snapshot.width / 430);
      });
      await page.waitForTimeout(350);
      await page.evaluate(() => atlasGpuDebug.motion.placeAtLocation('bridge'));
      await capture(page, width + '-picnic-clearance');
    }
    await check(width + ' curved travel and actual tractor arrival pose', async () => {
      await pause(page);
      await page.evaluate(point => {
        atlasGpuDebug.motion.placeAtLocation('home');
        atlasGpuDebug.motion.setTarget([point[0] / 1536, point[1] / 1024]);
      }, approvedPoi.tractor);
      const wallStart = performance.now();
      // Advance only the test clock; production motion, route geometry and sprite remain unmodified.
      await page.clock.install();
      await page.evaluate(() => atlasGpuDebug.motion.toggle());
      await page.clock.runFor(40);
      let simulatedMs = 40, samples = 0, maxPathError = 0;
      for (let i = 0; i < 12; i++) {
        await page.clock.fastForward(5000); simulatedMs += 5000;
        const sample = await page.evaluate(() => {
          const d = atlasGpuDebug.motionCanvas.dataset, p = [Number(d.x), Number(d.y)];
          let gap = Infinity;
          for (const route of atlasGeometry.routes) for (let j = 1; j < route.points.length; j++) {
            const a = route.points[j - 1].map((v, axis) => v * (axis ? 1024 : 1536));
            const b = route.points[j].map((v, axis) => v * (axis ? 1024 : 1536));
            const v = b.map((n, axis) => n - a[axis]);
            const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]) / (v[0] ** 2 + v[1] ** 2 || 1)));
            gap = Math.min(gap, Math.hypot(p[0] - a[0] - t * v[0], p[1] - a[1] - t * v[1]));
          }
          return { point: p, gap, arrived: d.arrived === 'true' };
        });
        samples++; maxPathError = Math.max(maxPathError, sample.gap);
        assert(sample.gap < .05, 'Character stays on the baked curved centerline');
        if (sample.arrived) break;
      }
      await pause(page); await page.clock.resume();
      const arrival = await state(page), point = [Number(arrival.x), Number(arrival.y)];
      assert.equal(arrival.arrived, 'true');
      assert(distance(point, approvedPoi.tractor) < 1, 'Character actually reaches the approved tractor foot point');
      await page.evaluate(() => {
        atlasGpuDebug.renderer.setBokehStrength(0);
        atlasGpuDebug.camera.focus([1335, 795], atlasGpuDebug.camera.snapshot.width / 460);
      });
      await page.waitForTimeout(350);
      await capture(page, width + '-tractor-arrival');
      return { point, samples, maxPathError, simulatedMs, wallMs: performance.now() - wallStart,
        timing: 'Playwright clock accelerated the unmodified production motion to arrival; not a real-time traversal benchmark' };
    });
    await check(width + ' tractor to picnic and back actual movement', async () => {
      await pause(page);
      await page.evaluate(() => {
        atlasGpuDebug.renderer.setBokehStrength(0);
        atlasGpuDebug.camera.focus([1260, 734], atlasGpuDebug.camera.snapshot.width / 340);
      });
      const journeys = [];
      for (const [name, target] of [['tractor-to-picnic', [1260, 642]], ['picnic-to-tractor', approvedPoi.tractor]]) {
        const before = await state(page), start = [Number(before.x), Number(before.y)];
        assert(distance(start, name === 'tractor-to-picnic' ? approvedPoi.tractor : [1260, 642]) < 1);
        await page.evaluate(point => {
          atlasGpuDebug.motion.setTarget([point[0] / 1536, point[1] / 1024]);
          atlasGpuDebug.motion.toggle();
        }, target);
        await page.clock.runFor(40);
        const samples = [];
        for (let i = 0; i < 10; i++) {
          await page.clock.fastForward(600);
          const sample = await state(page), point = [Number(sample.x), Number(sample.y)];
          assert(point[0] >= 1228 && point[0] <= 1265 && point[1] >= 641 && point[1] <= 821,
            'Actual movement stays in the west bypass corridor');
          samples.push(point);
          if (i === 3) {
            await pause(page); await page.clock.resume();
            await capture(page, width + '-' + name + '-moving');
            await page.evaluate(() => atlasGpuDebug.motion.toggle());
            await page.clock.runFor(40);
          }
          if (sample.arrived === 'true') break;
        }
        await pause(page); await page.clock.resume();
        const arrival = await state(page), end = [Number(arrival.x), Number(arrival.y)];
        assert.equal(arrival.arrived, 'true');
        assert(distance(end, target) < 1, name + ': actual arrival');
        assert(samples.some(point => distance(point, start) > 20 && distance(point, target) > 20),
          'Observed intermediate walking position, not endpoint placement');
        await capture(page, width + '-' + name + '-arrival');
        journeys.push({ name, start, end, samples, timing: 'accelerated Playwright clock, unmodified production motion' });
      }
      return journeys;
    });
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    return { browser: browser.version(), viewport: width, errors };
  } finally { await context.close(); }
}

async function actual(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 },
    isMobile: width < 600, hasTouch: width < 600, reducedMotion: 'no-preference' });
  const page = await context.newPage(), requests = [], errors = [], failedRequests = [], httpFailures = [];
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => {
    if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() });
  });
  await page.addInitScript(instrument);
  try {
    await page.goto(base + 'atlas-webgpu.html');
    await page.waitForFunction(() => window.atlasGpuDebug?.renderer?.stats.draws > 2 &&
      atlasGpuDebug.motionCanvas.dataset.sprite === 'ready' && atlasGpuDebug.renderer.stats.scenery.uploads > 3);
    await check(width + ' actual Chrome WebGPU and default framing', async () => {
      assert.equal(await page.evaluate(() => atlasGpuDebug.renderer.backend), 'webgpu');
      assert.equal(await page.evaluate(() => atlasGpuDebug.rendererError), null);
      return { version: browser.version(), camera: (await state(page)).camera, screenshot: await capture(page, width + '-default') };
    });
    await check(width + ' early sharp runtime overview', async () => {
      await pause(page);
      const strength = await page.evaluate(() => {
        const strength = atlasGpuDebug.renderer.stats.bokehStrength;
        atlasGpuDebug.renderer.setBokehStrength(0); atlasGpuDebug.camera.fit(); return strength;
      });
      try {
        await page.waitForTimeout(450);
        return await capture(page, width + '-overview-bokeh0');
      } finally {
        await page.evaluate(strength => { atlasGpuDebug.renderer.setBokehStrength(strength); atlasGpuDebug.motion.update(); }, strength);
      }
    });
    if (width === 1440) await check('original artwork route review overlay', () => overviewOverlay(page));
    await check(width + ' connected rendered topology', () => topology(page));
    await check(width + ' picnic clearance and no extra river crossing', () => terrainSafety(page));
    await check(width + ' picnic, tractor loop, and left-bank runtime closeups', () => terrainCloseups(page, width));
    await check(width + ' forward chosen journey and flowing dashes', () => movement(page, false));
    await check(width + ' reverse chosen journey and flowing dashes', () => movement(page, true));
    await check(width + ' overview', async () => {
      await page.evaluate(() => atlasGpuDebug.camera.fit()); await page.waitForTimeout(450);
      return capture(page, width + '-overview');
    });
    await check(width + ' interstory alternatives via nearby setTarget and native pan/tap', () => targets(page, width));
    await check(width + ' measured paused planning benchmark', () => benchmark(page));
    await check(width + ' controls, pan, and video', () => controls(page, width < 600));
    await check(width + ' runtime and network', async () => {
      assert.deepEqual(errors, [], 'No uncaught browser errors');
      const planningImages = requests.filter(url => /shire-(?:routes|regions)-v\d+\.(?:png|webp|jpe?g)(?:\?|$)/.test(url));
      assert.deepEqual(planningImages, [], 'Generated planning images are never fetched by production atlas');
      const video = [...new Set(requests.filter(url => /\.mp4(?:\?|$)/.test(url)))];
      assert.equal(video.length, 1, 'One video source');
      assert(video[0].includes(width < 600 ? 'mobile' : 'desktop'), 'Correct viewport video variant');
      const abortedRequests = failedRequests.filter(request => request.error === 'net::ERR_ABORTED');
      const transportFailures = failedRequests.filter(request => request.error !== 'net::ERR_ABORTED');
      assert.deepEqual(httpFailures, [], 'No observed HTTP 4xx/5xx responses');
      assert.deepEqual(transportFailures, [], 'No non-abort transport failures');
      return { requests: requests.length, planningImages, video, errors, httpFailures, transportFailures,
        abortedRequestCount: abortedRequests.length,
        abortClassification: 'Browser canceled these requests; ERR_ABORTED is not an HTTP missing-file status. Canceled resources are not certified loaded.',
        abortedRequests };
    });
  } finally { await context.close(); }
}

function writeReport() {
  if (!fullRun) {
    fs.writeFileSync(report, ['# V7 Focused Browser Smoke', '',
      `${results.filter(r => r.pass).length}/${results.length} checks passed; wall ${((Date.now() - startedAt.getTime()) / 1000).toFixed(2)}s.`,
      `URL: ${base}atlas-webgpu.html`,
      'Actual Chrome WebGPU: 1440x1000 desktop and 390x844 emulated touch viewport.',
      `Geometry: ${sourceHashes.geometry}; motion: ${sourceHashes.motion}.`, '',
      ...results.map(r => `- ${r.pass ? 'PASS' : 'FAIL'} ${r.name} (${(r.elapsedMs || 0).toFixed(1)}ms): ${JSON.stringify(r.pass ? r.detail : r.error.split('\n')[0])}`),
      '', '## Screenshots', '', ...screenshots.map(file => `- ${file}`), '',
      'Scope: native lower-road pan/tap, tractor through-connection and loop, original two traces, full sprite clearance against picnic and tractor, sampled curved travel, and actual tractor/picnic travel in both directions. The public story regions remain unchanged.',
      'Arrival timing is accelerated with the Playwright clock; wall and simulated time are separate. Existing motion tests cover direction/return behavior. Manual obstacle polygons and the visible river centerline do not certify all terrain or hidden water. No broad eight-route walk matrix, full control audit or performance benchmark was rerun.', ''].join('\n'));
    return;
  }
  fs.writeFileSync(report, ['# Atlas route browser verification', '',
    `${results.filter(r => r.pass).length}/${results.length} checks passed.`,
    `Started: ${startedAt.toISOString()}; finished: ${new Date().toISOString()}; wall seconds: ${((Date.now() - startedAt.getTime()) / 1000).toFixed(2)}.`,
    `URL: ${base}atlas-webgpu.html`, 'Command: node scripts/verify-atlas-route-network.cjs',
    'Browser: installed Google Chrome, actual WebGPU, desktop 1440x1000 and emulated touch/mobile viewport 390x844.', '',
    '## Failures', '', ...(results.filter(r => !r.pass).map(r => `- ${r.name}: ${r.error.split('\n')[0]}`)),
    ...(results.every(r => r.pass) ? ['None.'] : []), '',
    '## Source hashes', '', '```json', JSON.stringify(sourceHashes, null, 2), '```', '',
    ...results.flatMap(r => [`## ${r.pass ? 'PASS' : 'FAIL'} ${r.name}`, '', '```json',
      JSON.stringify({ elapsedMs: r.elapsedMs, ...(r.pass ? { detail: r.detail } : { error: r.error }) }, null, 2), '```', '']),
    '## Screenshots', '', ...screenshots.map(file => `- ${file}`), '',
    'Measurement limits: planning timings include the real paused motion.setTarget planner, trail rebuild, and synchronous canvas draw, with stroke instrumentation disabled. They are not isolated planner or GPU timings. Graph counts come from the unselected rendered graph after home placement. Every branch return is verified with the production planner in an isolated VM, not a full real-time walk of every branch. Mobile is a Chrome touch viewport, not physical phone hardware. Hidden toolbar handlers are checked programmatically; visible language controls, keyboard zoom, mouse/touch pan and route targeting are exercised through native input. Camera focus is used only to prepare a view offset from each branch; native dragging centers and selects it. The deterministic colored overlay is a separate browser canvas on the original art. Parent reviews artistic terrain alignment and appearance.', ''].join('\n'));
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  try {
    await waitForWorkers();
    await check('route endpoint and midpoint return plans', () => {
      const detail = branchReturns();
      return fullRun ? detail : { routes: detail.length, plans: detail.reduce((sum, d) => sum + d.successfulPlans, 0), tractor: 'approved POI, not a story' };
    });
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      for (const width of [1440, 390]) await check(width + ' browser session', () => fullRun ? actual(browser, width) : focusedActual(browser, width));
      await check('production sources unchanged during verification', async () => {
        assert.equal(hash(fs.readFileSync(path.join(root, 'atlas-geometry.js'))), sourceHashes.geometry);
        assert.equal(hash(fs.readFileSync(path.join(root, 'atlas-motion.js'))), sourceHashes.motion);
        return sourceHashes;
      });
    } finally { await browser.close(); }
  } catch (error) { results.push({ name: 'verification startup', pass: false, error: error.stack }); }
  finally { writeReport(); }
  if (results.some(r => !r.pass)) process.exitCode = 1;
  console.log('Report: ' + report);
})();
