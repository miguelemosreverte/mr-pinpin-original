const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

const ROOT = path.resolve(__dirname, '../docs/storyboard');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
const close = (data, offset, color, tolerance = 48) => data[offset + 3] > 127 &&
  color.every((value, channel) => Math.abs(data[offset + channel] - value) <= tolerance);

async function decode(page, file) {
  const bytes = fs.readFileSync(file);
  assert(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), file + ': expected PNG');
  const result = await page.evaluate(async source => {
    const image = new Image(); image.src = source; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', {willReadFrequently: true});
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const chunks = [];
    for (let i = 0; i < pixels.length; i += 32768) chunks.push(String.fromCharCode(...pixels.subarray(i, i + 32768)));
    return {width: canvas.width, height: canvas.height, encoded: btoa(chunks.join(''))};
  }, 'data:image/png;base64,' + bytes.toString('base64'));
  return {width: result.width, height: result.height, data: Buffer.from(result.encoded, 'base64'), sha256: hash(bytes)};
}

function colorStats(image, color) {
  let count = 0, exact = 0, x0 = image.width, y0 = image.height, x1 = 0, y1 = 0;
  for (let offset = 0; offset < image.data.length; offset += 4) {
    if (!close(image.data, offset, color)) continue;
    const pixel = offset / 4, x = pixel % image.width, y = Math.floor(pixel / image.width);
    count++; if (close(image.data, offset, color, 0)) exact++;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return {count, exact, bounds: count ? [x0 / image.width, y0 / image.height,
    (x1 - x0 + 1) / image.width, (y1 - y0 + 1) / image.height] : null};
}

function aligned(image, x, y, color, radius = 8) {
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    if (dx * dx + dy * dy > radius * radius) continue;
    const px = Math.round(x) + dx, py = Math.round(y) + dy;
    if (px >= 0 && py >= 0 && px < image.width && py < image.height &&
        close(image.data, (py * image.width + px) * 4, color, 64)) return true;
  }
  return false;
}

async function audit(page) {
  const context = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'atlas-geometry.js'), 'utf8'), context, {timeout: 1000});
  const geometry = JSON.parse(JSON.stringify(context.window.atlasGeometry));
  assert.deepEqual([geometry.width, geometry.height], [1536, 1024]);
  const asset = source => {
    assert(typeof source === 'string' && source.startsWith('images/atlas/') && !source.includes('..'));
    return path.join(ROOT, source);
  };
  const mask = await decode(page, asset(geometry.mask));
  const routes = await decode(page, asset(geometry.pathSource));
  assert.equal(geometry.routePlanSource, undefined, 'Rejected v3 must not be an active planning source');
  assert.equal(geometry.rejectedRoutePlanSource, 'images/atlas/shire-routes-v3.png');
  assert.equal(geometry.routeSurveyVersion, 7);
  const sprite = await decode(page, asset(geometry.sprite.src));
  for (const image of [mask, routes]) assert.deepEqual([image.width, image.height], [geometry.width, geometry.height]);
  assert(geometry.generationReview?.length, 'Missing generation review references');
  for (const source of geometry.generationReview) assert(fs.statSync(asset(source)).isFile(), 'Missing generation review: ' + source);
  for (const [source, image] of [[geometry.mask, mask], [geometry.pathSource, routes], [geometry.sprite.src, sprite]]) {
    const reviewSource = source.replace(/\.png$/, '.json');
    assert(geometry.generationReview.includes(reviewSource), source + ': missing generation provenance');
    const record = JSON.parse(fs.readFileSync(asset(reviewSource), 'utf8'));
    assert.equal(record.tool, 'built-in imagegen', source + ': unexpected generation tool');
    assert.equal(record.sha256, image.sha256, source + ': image differs from generation record');
    assert.deepEqual([record.width, record.height], [image.width, image.height], source + ': recorded dimensions differ');
    assert(typeof record.review === 'string' && record.review.trim(), source + ': missing visual review');
  }
  const expected = {lake: [255,0,0], elder: [128,0,255], home: [0,255,0], bridge: [0,255,255]};
  assert.deepEqual(geometry.regions.map(region => region.id).sort(), Object.keys(expected).sort());
  const regions = geometry.regions.map(region => {
    assert.deepEqual(region.color, expected[region.id], region.id + ': semantic palette');
    const stats = colorStats(mask, region.color);
    assert(stats.count > 1000, region.id + ': missing mask region');
    assert(region.center.length === 2 && region.center.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    assert(aligned(mask, region.center[0] * mask.width, region.center[1] * mask.height, region.color, 0), region.id + ': center outside mask');
    assert(region.bounds.length === 4 && region.bounds.every((value, i) => Math.abs(value - stats.bounds[i]) <= 0.003), region.id + ': inaccurate bounds');
    return {id: region.id, ...stats};
  });
  const background = colorStats(mask, [0,0,0]);
  assert(background.count > mask.width * mask.height * 0.1, 'Mask background is not black');
  const classified = background.count + regions.reduce((sum, region) => sum + region.count, 0);
  assert(classified / (mask.width * mask.height) > 0.97, 'Mask is not predominantly flat region colors');
  let grayscale = 0;
  for (let i = 0; i < routes.data.length; i += 4) {
    if (Math.max(routes.data[i], routes.data[i + 1], routes.data[i + 2]) -
        Math.min(routes.data[i], routes.data[i + 1], routes.data[i + 2]) <= 12) grayscale++;
  }
  assert(grayscale / (routes.width * routes.height) > 0.9, 'Route overlay background is not grayscale');
  const originals = {'home-to-lake': ['home','lake'], 'lake-to-elder': ['lake','elder']};
  const junctions = new Set([...Object.keys(expected), 'west-bridge', 'east-bridge', 'east-bank', 'picnic-approach', 'tractor']);
  assert.equal(geometry.pathSource, 'images/atlas/shire-routes-v2.png', 'Original paths retain their strict v2 trace source');
  assert.equal(new Set(geometry.routes.map(route => route.id)).size, geometry.routes.length, 'Duplicate route id');
  for (const id of Object.keys(originals)) assert(geometry.routes.some(route => route.id === id), 'Missing original route: ' + id);
  const routeResults = geometry.routes.map(route => {
    assert(junctions.has(route.from) && junctions.has(route.to), route.id + ': unknown region/junction');
    assert(/^#[0-9a-f]{6}$/i.test(route.color), route.id + ': invalid color');
    assert(route.points.length > 2, route.id + ': expected traced polyline');
    assert(route.points.every(point => point.length === 2 && point.every(value => Number.isFinite(value) && value >= 0 && value <= 1)));
    if (!Object.hasOwn(originals, route.id)) {
      assert.equal(route.provenance, route.id === 'tractor-west-to-picnic'
        ? 'manual-original-art-survey-v7' : 'manual-original-art-survey-v6', route.id + ': missing survey provenance');
      if (route.id === 'lake-to-bridge') assert.deepEqual([route.from, route.to], ['lake','bridge'],
        'Resurveyed picnic retains its existing story identity');
      assert.equal(geometry.routeSurveySource, 'images/atlas/shire-v1.png', route.id + ': survey must use original terrain');
      assert(fs.statSync(asset(geometry.routeSurveySource)).isFile(), 'Missing terrain survey artwork');
      // These are manually corrected paths, so generated-line alignment is not evidence of safety.
      return {id: route.id, validation: route.provenance,
        surveySource: geometry.routeSurveySource, segments: route.points.length - 1};
    }
    assert.deepEqual([route.from, route.to], originals[route.id], route.id + ': original story regions changed');
    let samples = 0, hits = 0;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      const steps = Math.max(1, Math.ceil(Math.hypot((b[0] - a[0]) * routes.width, (b[1] - a[1]) * routes.height) / 3));
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        samples++; if (aligned(routes, (a[0] + (b[0] - a[0]) * t) * routes.width,
          (a[1] + (b[1] - a[1]) * t) * routes.height, rgb(route.color))) hits++;
      }
    }
    assert(hits / samples >= 0.97, route.id + ': traced path misses generated line (' + hits + '/' + samples + ')');
    return {id: route.id, samples, hits, alignedFraction: hits / samples};
  });
  assert(geometry.routes.some(route => route.id === 'lake-to-bridge'), 'Missing resurveyed picnic route');
  assert.deepEqual([geometry.sprite.columns, geometry.sprite.rows, geometry.sprite.frames], [2,2,4]);
  assert.deepEqual([sprite.width, sprite.height], [geometry.sprite.width, geometry.sprite.height]);
  assert.equal(geometry.sprite.frameRects.length, 4);
  assert.equal(geometry.sprite.frameAnchors.length, 4);
  assert.equal(sprite.width % 2, 0, 'Sprite width cannot divide into two equal columns');
  assert.equal(sprite.height % 2, 0, 'Sprite height cannot divide into two equal rows');
  const frameWidth = sprite.width / 2, frameHeight = sprite.height / 2;
  const frames = Array.from({length: 4}, (_, index) => {
    let transparent = 0, visible = 0, touchesEdge = 0, outsideCrop = 0, fringePixels = 0, fringeMaxAlpha = 0;
    let minX = frameWidth, minY = frameHeight, maxX = 0, maxY = 0;
    const rect = geometry.sprite.frameRects[index], anchor = geometry.sprite.frameAnchors[index];
    const tileX = index % 2 * frameWidth, tileY = Math.floor(index / 2) * frameHeight;
    assert(rect.length === 4 && rect.every(Number.isInteger), 'Invalid frame rectangle');
    assert(rect[0] >= tileX && rect[1] >= tileY && rect[0] + rect[2] <= tileX + frameWidth &&
      rect[1] + rect[3] <= tileY + frameHeight, 'Frame rectangle escapes its tile');
    const pixels = [];
    for (let y = 0; y < frameHeight; y++) for (let x = 0; x < frameWidth; x++) {
      const offset = ((y + Math.floor(index / 2) * frameHeight) * sprite.width + (index % 2) * frameWidth + x) * 4;
      pixels.push(...sprite.data.slice(offset, offset + 4));
      if (sprite.data[offset + 3] === 0) transparent++;
      const [red, green, blue, alpha] = sprite.data.subarray(offset, offset + 4);
      if (alpha > 15 && (x + tileX < rect[0] || y + tileY < rect[1] ||
          x + tileX >= rect[0] + rect[2] || y + tileY >= rect[1] + rect[3])) outsideCrop++;
      if (alpha && red > 220 && blue < 60 && (green < 60 || green > 220)) {
        fringePixels++; fringeMaxAlpha = Math.max(fringeMaxAlpha, alpha);
      }
      if (sprite.data[offset + 3] > 127) {
        visible++;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        if (x === 0 || x === frameWidth - 1 || y === 0 || y === frameHeight - 1) touchesEdge++;
      }
    }
    assert(transparent > frameWidth * frameHeight * 0.1, 'Sprite frame ' + index + ': missing genuine alpha; do not erase white fur');
    assert(visible > frameWidth * frameHeight * 0.01, 'Sprite frame ' + index + ': empty');
    assert.equal(touchesEdge, 0, 'Sprite frame ' + index + ': artwork crosses frame boundary');
    assert.equal(outsideCrop, 0, 'Sprite frame ' + index + ': crop clips visible artwork');
    assert.deepEqual(anchor, [(minX + maxX) / 2 + tileX - rect[0], maxY + 1 + tileY - rect[1]],
      'Sprite frame ' + index + ': foot anchor mismatch');
    return {index, transparent, visible, frameRect: rect, footAnchor: anchor,
      fringePixels, fringeMaxAlpha, sha256: hash(Buffer.from(pixels))};
  });
  assert.equal(new Set(frames.map(frame => frame.sha256)).size, 4, 'Expected four distinct sprite frames');
  return {result: 'PASS', mask: {sha256: mask.sha256, regions, classifiedFraction: classified / (mask.width * mask.height)},
    routes: {source: geometry.pathSource, sha256: routes.sha256,
      surveyVersion: geometry.routeSurveyVersion, rejectedHistoricalPlan: geometry.rejectedRoutePlanSource, paths: routeResults},
    sprite: {width: sprite.width, height: sprite.height, sha256: sprite.sha256, frames}};
}

async function main() {
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    const page = await browser.newPage();
    if (process.argv[2] === '--inspect') {
      for (const file of process.argv.slice(3)) {
        const image = await decode(page, path.resolve(file));
        const colors = new Map(); let transparent = 0;
        for (let i = 0; i < image.data.length; i += 4) {
          const key = image.data.slice(i, i + 4).join(','); colors.set(key, (colors.get(key) || 0) + 1);
          if (image.data[i + 3] === 0) transparent++;
        }
        console.log(JSON.stringify({file, width: image.width, height: image.height, sha256: image.sha256,
          transparent, colors: [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
          regions: [[255,0,0], [128,0,255], [0,255,0], [0,255,255]].map(color => ({color, ...colorStats(image, color)}))}, null, 2));
      }
    } else console.log(JSON.stringify(await audit(page), null, 2));
  } finally { await browser.close(); }
}

if (require.main === module) main().catch(error => { console.error('FAIL: ' + error.message); process.exitCode = 1; });
module.exports = {decode, colorStats, aligned, audit};
