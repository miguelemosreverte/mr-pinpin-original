// Offline compatibility of unchanged sprites at their actual anchored runtime scale.
// node scripts/build-atlas-blend-transitions.cjs [--write | --check]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

const ROOT = path.resolve(__dirname, '../docs/storyboard');
const FILE = path.join(ROOT, 'atlas-directions.js');
const SIZE = 128;
const RULES = {minAlphaIoU: .82, maxCentroidDistance: 2,
  maxFaceCentroidDistance: 2, maxFaceBoundsDistance: 3,
  minFacePixels: 12, maxAngleDistance: 15, durationMs: 80};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rounded = number => Math.round(number * 10000) / 10000;
const BEGIN = '// BEGIN GENERATED ATLAS BLEND TRANSITIONS';
const END = '// END GENERATED ATLAS BLEND TRANSITIONS';

function readMetadata(source) {
  const context = {window: {}};
  vm.runInNewContext(source, context, {timeout: 1000});
  return JSON.parse(JSON.stringify(context.window.atlasDirections));
}

function largestComponent(mask) {
  const visited = new Uint8Array(mask.length), queue = new Int32Array(mask.length);
  let largest = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let head = 0, tail = 1;
    queue[0] = start; visited[start] = 1;
    while (head < tail) {
      const pixel = queue[head++], x = pixel % SIZE, y = Math.floor(pixel / SIZE);
      const neighbors = [x ? pixel - 1 : -1, x < SIZE - 1 ? pixel + 1 : -1,
        y ? pixel - SIZE : -1, y < SIZE - 1 ? pixel + SIZE : -1];
      for (const next of neighbors) if (next >= 0 && mask[next] && !visited[next]) {
        visited[next] = 1; queue[tail++] = next;
      }
    }
    if (tail > largest.length) largest = Array.from(queue.subarray(0, tail));
  }
  const result = new Uint8Array(mask.length);
  for (const pixel of largest) result[pixel] = 1;
  return result;
}

function features(rgba) {
  assert.equal(rgba.length, SIZE * SIZE * 4);
  const alpha = new Float64Array(SIZE * SIZE), cream = new Uint8Array(SIZE * SIZE);
  for (let pixel = 0; pixel < alpha.length; pixel++) {
    const offset = pixel * 4, a = rgba[offset + 3], r = rgba[offset], g = rgba[offset + 1], b = rgba[offset + 2];
    // Ignore invisible diagnostic fringe; connected pale fur distinguishes face from spine tips.
    alpha[pixel] = a > 15 ? a / 255 : 0;
    cream[pixel] = Number(a > 127 && r > 150 && g > 115 && b > 75 && g / r > .74 && b / r > .48);
  }
  return {alpha, face: largestComponent(cream)};
}

function statistics(mask) {
  let mass = 0, xSum = 0, ySum = 0, left = SIZE, right = -1, top = SIZE, bottom = -1;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    const x = i % SIZE, y = Math.floor(i / SIZE), weight = mask[i];
    mass += weight; xSum += x * weight; ySum += y * weight;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return {mass, centroid: mass ? [xSum / mass, ySum / mass] : null, bounds: [left, top, right, bottom]};
}

function overlap(a, b) {
  let intersection = 0, union = 0;
  for (let i = 0; i < a.length; i++) { intersection += Math.min(a[i], b[i]); union += Math.max(a[i], b[i]); }
  return union ? intersection / union : 0;
}

function compare(a, b) {
  const sa = statistics(a.alpha), sb = statistics(b.alpha), fa = statistics(a.face), fb = statistics(b.face);
  const distance = (x, y) => x && y ? Math.hypot(x[0] - y[0], x[1] - y[1]) : null;
  const facesPresent = fa.mass >= RULES.minFacePixels && fb.mass >= RULES.minFacePixels;
  const neitherFace = fa.mass < RULES.minFacePixels && fb.mass < RULES.minFacePixels;
  return {alphaIoU: overlap(a.alpha, b.alpha), centroidDistance: distance(sa.centroid, sb.centroid),
    faceIoU: facesPresent ? overlap(a.face, b.face) : null,
    faceCentroidDistance: facesPresent ? distance(fa.centroid, fb.centroid) : null,
    faceBoundsDistance: facesPresent ? Math.max(...fa.bounds.map((value, i) => Math.abs(value - fb.bounds[i]))) : null,
    facePixels: [fa.mass, fb.mass], faceMode: facesPresent ? 'both-visible' : neitherFace ? 'both-small' : 'visibility-mismatch'};
}

function assessPair(from, to, a, b) {
  const distance = Math.min((to - from + 360) % 360, (from - to + 360) % 360);
  const comparisons = a.flatMap((left, phaseA) => b.map((right, phaseB) => ({phaseA, phaseB, ...compare(left, right)})));
  const min = key => Math.min(...comparisons.filter(c => c[key] !== null).map(c => c[key]));
  const max = key => Math.max(0, ...comparisons.filter(c => c[key] !== null).map(c => c[key]));
  const summary = {minAlphaIoU: min('alphaIoU'), maxCentroidDistance: max('centroidDistance'),
    minFaceIoU: comparisons.some(c => c.faceIoU !== null) ? min('faceIoU') : null,
    maxFaceCentroidDistance: max('faceCentroidDistance'), maxFaceBoundsDistance: max('faceBoundsDistance'),
    faceVisibilityMismatch: comparisons.some(c => c.faceMode === 'visibility-mismatch')};
  const reasons = [];
  if (distance !== RULES.maxAngleDistance) reasons.push('not-adjacent-15-degrees');
  if (summary.minAlphaIoU < RULES.minAlphaIoU) reasons.push('silhouette-overlap');
  if (summary.maxCentroidDistance > RULES.maxCentroidDistance) reasons.push('silhouette-displacement');
  if (summary.faceVisibilityMismatch) reasons.push('face-visibility');
  if (summary.maxFaceCentroidDistance > RULES.maxFaceCentroidDistance) reasons.push('face-displacement');
  if (summary.maxFaceBoundsDistance > RULES.maxFaceBoundsDistance) reasons.push('face-bounds');
  return {from, to, allowed: reasons.length === 0, durationMs: RULES.durationMs,
    score: rounded(summary.minAlphaIoU), summary, reasons, comparisons};
}

async function build(metadata) {
  assert.equal(metadata.displayWidth, 56);
  const directions = [...metadata.directions].sort((a, b) => a.angle - b.angle);
  assert.deepEqual(directions.map(d => d.angle), Array.from({length: 24}, (_, i) => i * 15));
  const files = [...new Set(directions.flatMap(d => [d.src, d.runtimeSrc || d.src]))].sort();
  const sources = files.map(src => ({src, sha256: hash(fs.readFileSync(path.join(ROOT, src)))}));
  const urls = Object.fromEntries(files.map(src => [src, 'data:image/' + (src.endsWith('.webp') ? 'webp' : 'png') + ';base64,' +
    fs.readFileSync(path.join(ROOT, src)).toString('base64')]));
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/miguel_lemos/.npm/_npx/705bc6b22212b352/node_modules/playwright');
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  let rendered;
  try {
    const page = await browser.newPage();
    rendered = await page.evaluate(async ({directions, urls}) => {
      const images = {};
      for (const [src, url] of Object.entries(urls)) { const image = new Image(); image.src = url; await image.decode(); images[src] = image; }
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const context = canvas.getContext('2d', {willReadFrequently: true});
      return directions.map(direction => direction.frames.map(frame => {
        const scale = 56 / direction.referenceWidth;
        context.clearRect(0, 0, 128, 128);
        context.drawImage(images[direction.runtimeSrc || direction.src], ...frame.rect,
          64 - frame.anchor[0] * scale, 112 - frame.anchor[1] * scale, frame.rect[2] * scale, frame.rect[3] * scale);
        const pixels = context.getImageData(0, 0, 128, 128).data;
        let text = ''; for (let i = 0; i < pixels.length; i += 8192) text += String.fromCharCode(...pixels.subarray(i, i + 8192));
        return btoa(text);
      }));
    }, {directions, urls});
  } finally { await browser.close(); }
  const masks = rendered.map(frames => frames.map(bytes => features(Buffer.from(bytes, 'base64'))));
  const pairs = directions.map((direction, i) => assessPair(direction.angle, directions[(i + 1) % 24].angle,
    masks[i], masks[(i + 1) % 24]));
  return {provenance: {version: 1, method: 'anchored-alpha-and-connected-cream-region-v1',
    displayWidth: 56, canvas: [128, 128], anchor: [64, 112], gaitComparison: 'all-16-phase-combinations',
    rules: RULES, sources, geometrySha256: hash(JSON.stringify({displayWidth: metadata.displayWidth, directions})),
    rendering: 'Chrome Canvas2D drawImage, default image smoothing, runtime WebP sources; unchanged PNG sources also hashed.'}, pairs};
}

function generatedBlock(result) {
  const records = result.pairs.map(({from, to, allowed, durationMs, score}) => ({from, to, allowed, durationMs, score}));
  return BEGIN + '\nwindow.atlasDirections.blendTransitionProvenance = ' + JSON.stringify(result.provenance, null, 2) + ';\n' +
    'window.atlasDirections.blendTransitions = [\n' + records.map(record => '  ' + JSON.stringify(record)).join(',\n') + '\n];\n' + END;
}

async function main(args = process.argv.slice(2)) {
  assert(args.every(arg => ['--write', '--check'].includes(arg)) && args.length <= 1, 'Use --write or --check, or no arguments to measure');
  const source = fs.readFileSync(FILE, 'utf8'), result = await build(readMetadata(source)), block = generatedBlock(result);
  const start = source.indexOf(BEGIN), end = source.indexOf(END);
  assert((start < 0 && end < 0) || (start >= 0 && end > start), 'Malformed generated metadata markers');
  if (args.includes('--check')) assert.equal(start < 0 ? '' : source.slice(start, end + END.length), block, 'Blend metadata is stale; rerun --write');
  if (args.includes('--write')) {
    assert.equal(fs.readFileSync(FILE, 'utf8'), source, 'Atlas metadata changed while measuring; retry');
    fs.writeFileSync(FILE, start < 0 ? source.trimEnd() + '\n\n' + block + '\n' : source.slice(0, start) + block + source.slice(end + END.length));
  }
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {RULES, features, statistics, overlap, assessPair, build, generatedBlock};
