// Actual Chrome verification of the opt-in family trial; no implementation mutations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');

const BASE = (process.env.ATLAS_BASE_URL || 'http://127.0.0.1:8767/storyboard/').replace(/\/?$/, '/');
const OUTPUT = process.env.ATLAS_FAMILY_OUTPUT || '/tmp/atlas-family-formation';
const results = [];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function project(point, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length)) : 0;
  return {point: [a[0] + t * dx, a[1] + t * dy], t};
}

function traceProjection(point, trace, expectedArc = Infinity) {
  let best = {distance: Infinity, arc: 0};
  for (let i = 1; i < trace.length; i++) {
    const projected = project(point, trace[i - 1].point, trace[i].point);
    const gap = distance(point, projected.point);
    const arc = trace[i - 1].arc + projected.t * (trace[i].arc - trace[i - 1].arc);
    if (gap < best.distance - .001 || (Math.abs(gap - best.distance) <= .001 &&
        Math.abs(arc - expectedArc) < Math.abs(best.arc - expectedArc))) best = {distance: gap, arc};
  }
  return best;
}

async function snapshot(page) {
  return page.evaluate(() => {
    const d = atlasGpuDebug, motion = d.motion;
    const family = motion.familyState || motion.family;
    if (!family) return {missingFamilyHook: true, motionKeys: Object.keys(motion), dataset: {...d.motionCanvas.dataset}};
    return {family, paused: motion.paused, dataset: {...d.motionCanvas.dataset}, renderer: d.renderer.stats};
  });
}

function assertFormation(state, trace, metrics) {
  assert(!state.missingFamilyHook, 'Family debug hook missing: ' + JSON.stringify(state));
  const family = state.family;
  assert.equal(family.members.length, 3, 'Three family members');
  assert.deepEqual(family.members.map(member => [member.id, member.displayWidth]),
    [['pinpin', 56], ['mr-pompom', 28], ['mama', 84]], 'Single-file leader, baby, Mama ordering and map sizes');
  assert(Number.isInteger(family.historyLength) && family.historyLength <= family.historyLimit && family.historyLimit <= 4096,
    'History is explicitly bounded');
  metrics.maxHistory = Math.max(metrics.maxHistory, family.historyLength);
  const leader = family.members[0].point;
  const previous = trace.at(-1), moved = previous ? distance(previous.point, leader) : 0;
  if (!previous || moved > .001) trace.push({point: leader, arc: (previous?.arc || 0) + moved});
  if (trace.length < 3) return;
  const total = trace.at(-1).arc;
  for (const member of family.members.slice(1)) {
    assert(member.point.every(Number.isFinite), member.id + ': finite feet position');
    if (total < member.lag + 15) continue;
    const projected = traceProjection(member.point, trace, total - member.lag);
    assert(projected.distance <= 1.5, member.id + ': follower cuts off the observed leader path by ' + projected.distance);
    const lag = total - projected.arc;
    assert(Math.abs(lag - member.lag) <= 3, member.id + ': path-distance separation ' + lag + ' expected ' + member.lag);
    metrics.maxTraceError = Math.max(metrics.maxTraceError, projected.distance);
    metrics.followSamples++;
    const angle = family.members[0].heading * Math.PI / 180;
    const straight = [leader[0] - member.lag * Math.cos(angle), leader[1] - member.lag * Math.sin(angle)];
    if (distance(member.point, straight) > 6) metrics.cornerSamples++;
  }
}

async function setTarget(page, point) {
  await page.evaluate(point => atlasGpuDebug.motion.setTarget([point[0] / atlasGeometry.width, point[1] / atlasGeometry.height]), point);
}

async function walk(page, target, trace, metrics) {
  await setTarget(page, target);
  let arrived = false;
  for (let step = 0; step < 1200; step++) {
    await page.clock.runFor(100);
    const state = await snapshot(page);
    assertFormation(state, trace, metrics);
    if (state.dataset.arrived === 'true') { arrived = true; break; }
  }
  assert(arrived, 'Journey arrives within bounded simulation time');
}

function stableFamily(state) {
  return {members: state.family.members, historyLength: state.family.historyLength};
}

async function tractorView(page, width) {
  const target = await page.evaluate(() => {
    const wanted = [1430, 803]; let best, gap = Infinity;
    for (const edge of atlasGpuDebug.motion.navigation.edges) {
      if (!edge.route?.startsWith('tractor')) continue;
      const dx = edge.b[0] - edge.a[0], dy = edge.b[1] - edge.a[1], square = dx * dx + dy * dy;
      const t = square ? Math.max(0, Math.min(1, ((wanted[0] - edge.a[0]) * dx + (wanted[1] - edge.a[1]) * dy) / square)) : 0;
      const point = [edge.a[0] + t * dx, edge.a[1] + t * dy], distance = Math.hypot(point[0] - wanted[0], point[1] - wanted[1]);
      if (distance < gap) { gap = distance; best = point; }
    }
    return best;
  });
  assert(target, 'Connected tractor road exists');
  await page.evaluate(() => {
    const d = atlasGpuDebug;
    d.camera.focus([1370, 785], d.camera.snapshot.width / (innerWidth < 600 ? 360 : 550));
  });
  await page.clock.runFor(500);
  return {target, screenshot: path.join(OUTPUT, width + '-tractor-formation.png')};
}

async function verifyViewport(browser, width) {
  const context = await browser.newContext({viewport: {width, height: width < 600 ? 844 : 1000},
    isMobile: width < 600, hasTouch: width < 600});
  const errors = [], failedRequests = [], metrics = {width, maxHistory: 0, maxTraceError: 0, followSamples: 0, cornerSamples: 0};
  try {
    await context.addInitScript(() => localStorage.setItem('pinpin.atlas.motion.v1', 'paused'));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failedRequests.push({url: request.url(), error: request.failure()?.errorText}));
    await page.goto(BASE + 'atlas-webgpu.html?family=1');
    await page.waitForFunction(() => window.atlasGpuDebug?.renderer && atlasGpuDebug.motion.spriteLayer?.ready,
      null, {timeout: 30000});
    if (process.argv.includes('--inspect')) {
      console.log(JSON.stringify(await snapshot(page), null, 2));
      return;
    }
    const initial = await snapshot(page);
    assert(!initial.missingFamilyHook, 'Family trial not ready: ' + JSON.stringify(initial));
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.evaluate(() => {
      atlasGpuDebug.motion.placeAtLocation('home');
      atlasGpuDebug.renderer.setBokehStrength(0);
    });
    const trace = [];
    assertFormation(await snapshot(page), trace, metrics);
    const paused = await snapshot(page);
    await page.clock.runFor(800);
    assert.deepEqual(stableFamily(await snapshot(page)), stableFamily(paused), 'Pause holds family position, gait and history');
    await page.evaluate(() => atlasGpuDebug.motion.toggle());
    const destinations = await page.evaluate(() => ['lake', 'bridge'].map(id => {
      const route = atlasGeometry.routes.find(route => route.id === (id === 'lake' ? 'home-to-lake' : 'lake-to-' + id));
      const p = route.points.at(-1); return [p[0] * atlasGeometry.width, p[1] * atlasGeometry.height];
    }));
    for (const target of destinations) await walk(page, target, trace, metrics);
    const tractor = await tractorView(page, width);
    await walk(page, tractor.target, trace, metrics);
    const idle = await snapshot(page);
    await page.clock.runFor(1000);
    assert.deepEqual(stableFamily(await snapshot(page)), stableFamily(idle), 'Arrival idle stops gait and history growth');
    await page.screenshot({path: tractor.screenshot});
    metrics.screenshot = tractor.screenshot;
    await page.evaluate(() => atlasGpuDebug.motion.toggle());
    const stopped = await snapshot(page);
    await page.clock.runFor(800);
    assert.deepEqual(stableFamily(await snapshot(page)), stableFamily(stopped), 'Pause after travel retains formation');
    assert(metrics.followSamples > 20 && metrics.cornerSamples > 3, 'Observed real path-following around bends');
    assert.deepEqual(errors, [], 'No browser errors');
    metrics.failedRequests = failedRequests;
    results.push(metrics);
    console.log(JSON.stringify(metrics));
  } finally { await context.close(); }
}

async function main() {
  fs.mkdirSync(OUTPUT, {recursive: true});
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try { for (const width of process.argv.includes('--inspect') ? [1440] : [1440, 390]) await verifyViewport(browser, width); }
  finally { await browser.close(); fs.writeFileSync(path.join(OUTPUT, 'results.json'), JSON.stringify(results, null, 2) + '\n'); }
}
if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });
module.exports = {project, traceProjection};
