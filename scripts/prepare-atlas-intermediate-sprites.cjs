// Offline preparation only; generation prompts and visual review belong to the parent.
// node scripts/prepare-atlas-intermediate-sprites.cjs SHEET.png --angles 15,45,75,105 --version v1
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {parseArgs} = require('node:util');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {header, measureGrid, measureFrame, verifySheet} = require('./verify-atlas-directions.cjs');

const ROOT = path.resolve(__dirname, '../docs/storyboard');
const ENCODER_ARGS = ['-lossless', '-exact', '-m', '6', '-q', '100', '-metadata', 'all'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const rounded = value => Math.round(value * 1000) / 1000;
const tool = name => process.env[name.toUpperCase()] ||
  (fs.existsSync('/opt/homebrew/bin/' + name) ? '/opt/homebrew/bin/' + name : name);
const run = (name, args) => execFileSync(tool(name), args, {
  maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
});

function readMetadata() {
  const context = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'atlas-directions.js'), 'utf8'), context, {timeout: 1000});
  return JSON.parse(JSON.stringify(context.window.atlasDirections));
}

function decode(file, width, height) {
  const data = run('magick', [file, '-alpha', 'on', '-depth', '8', 'rgba:-']);
  assert.equal(data.length, width * height * 4, file + ': unexpected RGBA length');
  return data;
}

function measureSheet(file) {
  const png = header(file);
  assert.equal(png.bitDepth, 8, 'Only 8-bit PNG sources are supported');
  assert.equal(png.colorType, 6, 'Expected a genuine RGBA PNG');
  const data = decode(file, png.width, png.height);
  const image = {...png, data}, grid = measureGrid(image);
  const frames = Array.from({length: 16}, (_, index) => measureFrame(image, Math.floor(index / 4), index % 4, grid));
  for (const frame of frames) {
    const [left, top, width, height] = frame.cell;
    let outerEdgePixels = 0;
    const count = (x, y) => { if (data[(y * png.width + x) * 4 + 3] > 15) outerEdgePixels++; };
    for (let y = top; y < top + height; y++) {
      if (left === 0) count(0, y);
      if (left + width === png.width) count(png.width - 1, y);
    }
    for (let x = Math.max(1, left); x < Math.min(png.width - 1, left + width); x++) {
      if (top === 0) count(x, 0);
      if (top + height === png.height) count(x, png.height - 1);
    }
    frame.outerEdgePixels = outerEdgePixels;
  }
  const sheet = {file, ...png, grid, sha256: hash(fs.readFileSync(file)), frames};
  try { verifySheet(sheet); sheet.pixelValidation = 'PASS'; }
  catch (error) { sheet.pixelValidation = 'FAIL'; sheet.issue = error.message; }
  return {sheet, data};
}

function scaleMeasurements(sheet, angles, metadata) {
  const legacy = metadata.directions.filter(direction => direction.angle % 30 === 0)
    .sort((a, b) => a.angle - b.angle);
  assert.equal(legacy.length, 12, 'Expected the twelve legacy headings for scale comparison');
  const cache = new Map();
  const size = direction => {
    if (!cache.has(direction.src)) {
      const measured = measureSheet(path.join(ROOT, direction.src)).sheet;
      assert.equal(measured.pixelValidation, 'PASS', measured.issue);
      cache.set(direction.src, measured);
    }
    const source = cache.get(direction.src);
    const frames = direction.frames.map(frame => {
      const measured = source.frames.find(item => JSON.stringify(item.rect) === JSON.stringify(frame.rect));
      assert(measured, direction.src + ': legacy crop no longer matches source');
      return measured;
    });
    return [2, 3].map(axis => median(frames.map(frame => frame.bodyBounds[axis])) *
      metadata.displayWidth / direction.referenceWidth);
  };
  const rows = angles.map((angle, row) => {
    const lower = legacy.filter(direction => direction.angle < angle).at(-1) || legacy.at(-1);
    const upper = legacy.find(direction => direction.angle > angle) || legacy[0];
    const lowerSize = size(lower), upperSize = size(upper);
    const span = (upper.angle - lower.angle + 360) % 360;
    const mix = ((angle - lower.angle + 360) % 360) / span;
    const target = lowerSize.map((value, index) => value + (upperSize[index] - value) * mix);
    const frames = sheet.frames.filter(frame => frame.row === row);
    const measured = [2, 3].map(axis => median(frames.map(frame => frame.bodyBounds[axis])));
    const candidate = metadata.displayWidth * Math.sqrt(measured[0] * measured[1] / (target[0] * target[1]));
    return {angle, adjacentAngles: [lower.angle, upper.angle], bodyPixels: measured,
      targetBodyMapPixels: target.map(rounded), suggestedReferenceWidth: rounded(candidate)};
  });
  return {method: 'One fixed sheet scale: median bounding-body-area ratio to adjacent legacy headings. Requires visual confirmation.',
    suggestedReferenceWidth: rounded(median(rows.map(row => row.suggestedReferenceWidth))), rows};
}

function prepare(options) {
  const {sheet, data} = measureSheet(options.file), metadata = readMetadata();
  assert.equal(metadata.displayWidth, 56, 'Expected current atlas displayWidth 56');
  const scaling = scaleMeasurements(sheet, options.angles, metadata);
  const referenceWidth = options.referenceWidth || scaling.suggestedReferenceWidth;
  scaling.referenceWidth = referenceWidth;
  scaling.selection = options.referenceWidth ? 'explicit-fixed-sheet-override' : 'measured-suggestion-awaiting-visual-review';
  for (const row of scaling.rows) {
    row.bodyMapPixels = row.bodyPixels.map(value => rounded(value * 56 / referenceWidth));
    row.targetRatio = row.bodyMapPixels.map((value, axis) => rounded(value / row.targetBodyMapPixels[axis]));
  }
  const stem = options.name || 'pinpin-directions-intermediate-' + options.angles.join('-') + '-' + options.version;
  const src = 'images/atlas/' + stem + '.png', runtimeSrc = 'images/atlas/' + stem + '.webp';
  const result = {
    schemaVersion: 1, assetVersion: options.version, reviewStatus: 'awaiting-parent-visual-review',
    displayWidth: 56, angles: options.angles,
    thresholds: {cropAlphaAbove: 15, bodyAlphaAbove: 127, cropPaddingPixels: 4},
    source: {file: path.resolve(options.file), width: sheet.width, height: sheet.height, sha256: sheet.sha256},
    scaling, measurements: {pixelValidation: sheet.pixelValidation, issue: sheet.issue, grid: sheet.grid, frames: sheet.frames},
    sheet: {src, runtimeSrc, width: sheet.width, height: sheet.height, referenceWidth,
      grid: sheet.grid, sha256: sheet.sha256, reviewStatus: 'awaiting-parent-visual-review'},
    directions: options.angles.map((angle, row) => ({angle, src, runtimeSrc, referenceWidth,
      frames: sheet.frames.filter(frame => frame.row === row).map(({rect, anchor}) => ({rect, anchor}))}))
  };
  if (options.measureOnly) return result;
  assert.notEqual(sheet.pixelValidation, 'FAIL', sheet.issue);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-intermediate-'));
  try {
    const encoded = path.join(temp, 'runtime.webp'), decoded = path.join(temp, 'decoded.png');
    run('cwebp', [...ENCODER_ARGS, '-quiet', path.resolve(options.file), '-o', encoded]);
    run('dwebp', [encoded, '-quiet', '-o', decoded]);
    const decodedHeader = header(decoded);
    assert.deepEqual([decodedHeader.width, decodedHeader.height], [sheet.width, sheet.height], 'WebP dimensions changed');
    assert(data.equals(decode(decoded, sheet.width, sheet.height)), 'WebP decoded RGBA differs from original');
    const png = fs.readFileSync(options.file), webp = fs.readFileSync(encoded);
    assert(webp.length < png.length, 'WebP derivative is not smaller than source PNG');
    result.encoding = {name: 'cwebp', version: run('cwebp', ['-version']).toString().trim(), args: ENCODER_ARGS,
      sourceBytes: png.length, runtimeBytes: webp.length, savedBytes: png.length - webp.length,
      runtimeSha256: hash(webp), rgbaSha256: hash(data), decodedRgbaExact: true};
    const outputs = [
      [stem + '.png', png], [stem + '.webp', webp],
      [stem + '.prepare.json', Buffer.from(JSON.stringify(result, null, 2) + '\n')]
    ].map(([name, bytes]) => ({file: path.join(options.outDir, name), bytes}));
    // Refuse different pre-existing outputs; re-running an identical preparation is safe.
    for (const output of outputs) {
      assert(!fs.existsSync(output.file) || fs.readFileSync(output.file).equals(output.bytes),
        output.file + ': exists with different contents; use a new version or staging directory');
    }
    fs.mkdirSync(options.outDir, {recursive: true});
    for (const output of outputs) if (!fs.existsSync(output.file)) fs.writeFileSync(output.file, output.bytes, {flag: 'wx'});
    return result;
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
}

function main(args = process.argv.slice(2)) {
  const {values, positionals} = parseArgs({args, allowPositionals: true, options: {
    angles: {type: 'string'}, version: {type: 'string'}, name: {type: 'string'}, 'out-dir': {type: 'string'},
    'reference-width': {type: 'string'}, 'measure-only': {type: 'boolean'}, help: {type: 'boolean'}
  }});
  if (values.help) {
    console.log('node scripts/prepare-atlas-intermediate-sprites.cjs SHEET.png --angles 15,45,75,105 --version v1\n' +
      '  [--name ASSET-STEM] [--out-dir DIR] [--reference-width PIXELS] [--measure-only]\n' +
      'Outputs unchanged PNG, exact lossless WebP, and .prepare.json. Never edits live atlas metadata.');
    return;
  }
  assert.equal(positionals.length, 1, 'Specify one source PNG; see --help');
  assert(values.angles && values.version, '--angles and --version are required');
  const angles = values.angles.split(',').map(Number);
  assert.equal(angles.length, 4, 'Specify exactly four row angles');
  assert(angles.every((angle, index) => Number.isInteger(angle) && angle >= 0 && angle < 360 && angle % 30 === 15 &&
    (index === 0 || angle === angles[index - 1] + 30)), 'Angles must be four ascending intermediate headings spaced 30 degrees apart');
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(values.version), 'Invalid version');
  assert(values.name === undefined || /^pinpin-directions-intermediate-[A-Za-z0-9][A-Za-z0-9._-]*$/.test(values.name), 'Invalid asset name');
  const referenceWidth = values['reference-width'] === undefined ? undefined : Number(values['reference-width']);
  assert(referenceWidth === undefined || (Number.isFinite(referenceWidth) && referenceWidth > 0), 'Invalid reference width');
  const result = prepare({file: path.resolve(positionals[0]), angles, version: values.version, name: values.name, referenceWidth,
    outDir: path.resolve(values['out-dir'] || path.join(ROOT, 'images/atlas')), measureOnly: values['measure-only']});
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error.message);
    if (error.stderr) console.error(error.stderr.toString());
    process.exitCode = 1;
  }
}
module.exports = {measureSheet, scaleMeasurements, prepare, main};
