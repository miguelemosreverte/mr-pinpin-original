const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {decode} = require('./verify-atlas-assets.cjs');

const ROOT = path.resolve(__dirname, '../docs/storyboard');
const bounds = (x0, y0, x1, y1) => x1 < x0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];

function header(file) {
  const bytes = fs.readFileSync(file);
  assert(bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), file + ': expected PNG');
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR', file + ': missing IHDR');
  return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bitDepth: bytes[24], colorType: bytes[25]};
}

function measureGrid(image) {
  const occupiedX = new Uint8Array(image.width), occupiedY = new Uint8Array(image.height);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    if (image.data[(y * image.width + x) * 4 + 3] > 15) { occupiedX[x] = 1; occupiedY[y] = 1; }
  }
  const splits = occupied => [0, ...[1,2,3].map(index => {
    const expected = Math.floor(index * occupied.length / 4);
    if (!occupied[expected] && !occupied[expected - 1]) return expected;
    // Generated rows sometimes drift. Only move a boundary into a fully clear gutter.
    const radius = Math.floor(occupied.length / 16), candidates = [];
    let start = null;
    for (let value = expected - radius; value <= expected + radius; value++) {
      if (!occupied[value] && start === null) start = value;
      if ((occupied[value] || value === expected + radius) && start !== null) {
        if (value - start >= 8) candidates.push(Math.floor((start + value) / 2));
        start = null;
      }
    }
    return candidates.sort((a,b) => Math.abs(a - expected) - Math.abs(b - expected))[0] ?? expected;
  }), occupied.length];
  return {x: splits(occupiedX), y: splits(occupiedY)};
}

function measureFrame(image, row, column, grid) {
  const left = grid?.x[column] ?? Math.floor(column * image.width / 4);
  const top = grid?.y[row] ?? Math.floor(row * image.height / 4);
  const right = grid?.x[column + 1] ?? Math.floor((column + 1) * image.width / 4);
  const bottom = grid?.y[row + 1] ?? Math.floor((row + 1) * image.height / 4);
  let x0 = right, y0 = bottom, x1 = -1, y1 = -1;
  let bx0 = right, by0 = bottom, bx1 = -1, by1 = -1;
  let transparent = 0, visible = 0, semitransparent = 0, edgePixels = 0, faintEdgePixels = 0;
  const fringe = {pixels: 0, maxAlpha: 0, aboveCropThreshold: 0, aboveBodyThreshold: 0};
  const digest = createHash('sha256');
  for (let y = top; y < bottom; y++) {
    digest.update(image.data.subarray((y * image.width + left) * 4, (y * image.width + right) * 4));
    for (let x = left; x < right; x++) {
      const offset = (y * image.width + x) * 4;
      const [red, green, blue, alpha] = image.data.subarray(offset, offset + 4);
      const edge = x === left || x === right - 1 || y === top || y === bottom - 1;
      if (alpha === 0) transparent++;
      if (alpha > 0 && alpha < 255) semitransparent++;
      if (edge && alpha > 0) faintEdgePixels++;
      if (alpha && red > 220 && blue < 60 && (green < 60 || green > 220)) {
        fringe.pixels++; fringe.maxAlpha = Math.max(fringe.maxAlpha, alpha);
        if (alpha > 15) fringe.aboveCropThreshold++;
        if (alpha > 127) fringe.aboveBodyThreshold++;
      }
      if (alpha > 15) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        if (edge) edgePixels++;
      }
      if (alpha > 127) {
        visible++;
        bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
      }
    }
  }
  const artworkBounds = bounds(x0, y0, x1, y1), bodyBounds = bounds(bx0, by0, bx1, by1);
  const cropLeft = Math.max(left, x0 - 4), cropTop = Math.max(top, y0 - 4);
  const rect = artworkBounds ? [cropLeft, cropTop, Math.min(right, x1 + 5) - cropLeft, Math.min(bottom, y1 + 5) - cropTop] : null;
  const anchor = bodyBounds && rect ? [(bx0 + bx1) / 2 - rect[0], by1 + 1 - rect[1]] : null;
  return {row, column, cell: [left, top, right - left, bottom - top], artworkBounds, bodyBounds, rect, anchor,
    transparent, visible, semitransparent, edgePixels, faintEdgePixels, fringe, sha256: digest.digest('hex')};
}

async function measure(page, file) {
  const png = header(file), image = await decode(page, file);
  assert.deepEqual([image.width, image.height], [png.width, png.height], file + ': decoder/header dimensions disagree');
  const grid = measureGrid(image);
  const frames = Array.from({length: 16}, (_, index) => measureFrame(image, Math.floor(index / 4), index % 4, grid));
  return {file, ...png, grid, sha256: image.sha256, referenceWidth: Math.max(...frames.map(frame => frame.rect?.[2] || 0)), frames};
}

function verifySheet(sheet) {
  assert.equal(sheet.colorType, 6, sheet.file + ': expected RGBA PNG');
  assert.equal(sheet.frames.length, 16, sheet.file + ': expected 16 cells');
  assert(sheet.width >= 4 && sheet.height >= 4, sheet.file + ': sheet too small');
  for (const frame of sheet.frames) {
    const label = sheet.file + ' row ' + (frame.row + 1) + ' frame ' + (frame.column + 1);
    const area = frame.cell[2] * frame.cell[3];
    assert(frame.transparent > area * .1, label + ': missing genuine alpha');
    assert(frame.visible > area * .01, label + ': empty or near-empty cell');
    assert.equal(frame.edgePixels, 0, label + ': artwork touches/crosses cell edge');
    assert.equal(frame.fringe.aboveCropThreshold, 0, label + ': visible red/yellow alpha fringe');
    assert(frame.rect && frame.anchor, label + ': missing artwork/foot bounds');
  }
  assert.equal(new Set(sheet.frames.map(frame => frame.sha256)).size, 16, sheet.file + ': duplicate cells');
}

async function contactSheet(page, sheets, output) {
  const sources = sheets.map(sheet => ({name: path.basename(sheet.file), width: sheet.width, height: sheet.height,
    grid: sheet.grid,
    source: 'data:image/png;base64,' + fs.readFileSync(sheet.file).toString('base64')}));
  await page.setViewportSize({width: 1040, height: 1000});
  await page.setContent('<!doctype html><html><head><style>body{margin:20px;font:16px system-ui;background:#fff;color:#171717}section{margin-bottom:24px}h2{font-size:20px}.row{display:grid;grid-template-columns:112px repeat(4,1fr);gap:8px;align-items:center;margin-bottom:8px}canvas{width:100%;height:auto;background:#c5ddd1}p{margin:0}</style></head><body></body></html>');
  await page.evaluate(async sources => {
    for (const sheet of sources) {
      const image = new Image(); image.src = sheet.source; await image.decode();
      const section = document.createElement('section'), title = document.createElement('h2');
      title.textContent = sheet.name + ' (' + sheet.width + ' x ' + sheet.height + ')'; section.append(title);
      for (let row = 0; row < 4; row++) {
        const line = document.createElement('div'); line.className = 'row';
        const label = document.createElement('p'); label.textContent = 'Row ' + (row + 1) + ' / heading unreviewed'; line.append(label);
        for (let column = 0; column < 4; column++) {
          const x = sheet.grid.x[column], y = sheet.grid.y[row];
          const width = sheet.grid.x[column + 1] - x, height = sheet.grid.y[row + 1] - y;
          const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(image, x, y, width, height, 0, 0, width, height); line.append(canvas);
        }
        section.append(line);
      }
      document.body.append(section);
    }
  }, sources);
  await page.screenshot({path: output, fullPage: true});
}

async function audit(page) {
  const context = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'atlas-directions.js'), 'utf8'), context, {timeout: 1000});
  const spec = JSON.parse(JSON.stringify(context.window.atlasDirections));
  assert.equal(spec.angleConvention, 'clockwise-image-plane');
  assert.equal(spec.reviewStatus, 'reviewed-approximate-azimuths', 'Direction artwork still awaiting visual review/correction');
  assert.equal(spec.version, 2);
  assert(Number.isFinite(spec.displayWidth) && spec.displayWidth > 0);
  assert.equal(spec.directions.length, 24, 'Expected twenty-four reviewed directions');
  assert.deepEqual(spec.directions.map(direction => direction.angle).sort((a,b) => a-b), Array.from({length:24}, (_,i) => i*15));
  assert.equal(spec.sheets.length, 6, 'Expected three original and three intermediate sheets');
  const measured = [];
  for (const {src} of spec.sheets) {
    const sheet = await measure(page, path.join(ROOT, src)); verifySheet(sheet); measured.push(sheet);
    const record = spec.sheets.find(item => item.src === src);
    assert(record, src + ': missing sheet metadata');
    assert.equal(record.sha256, sheet.sha256, src + ': image changed since review');
    assert.deepEqual([record.width, record.height], [sheet.width, sheet.height]);
    assert.deepEqual(record.grid, sheet.grid, src + ': cell boundaries differ from clear gutters');
    if (record.preparation) {
      const prepared = JSON.parse(fs.readFileSync(path.join(ROOT, record.preparation), 'utf8'));
      assert.equal(prepared.source.sha256, sheet.sha256, src + ': scale calibration refers to another source');
      assert.equal(record.referenceWidth, prepared.scaling.referenceWidth, src + ': scale differs from fixed-sheet calibration');
      assert(record.referenceWidth > sheet.referenceWidth * .7 && record.referenceWidth < sheet.referenceWidth * 1.3,
        src + ': calibrated scale is out of bounds');
    } else assert.equal(record.referenceWidth, sheet.referenceWidth, src + ': reference width differs from measurement');
    assert(typeof record.visualReview === 'string' && record.visualReview.trim(), src + ': missing heading review');
    const directions = spec.directions.filter(direction => direction.src === src);
    assert.equal(directions.length, 4, src + ': expected four heading rows');
    const occupied = new Set();
    for (const direction of directions) {
      assert.equal(direction.referenceWidth, record.referenceWidth, src + ': per-heading normalization is forbidden');
      assert.equal(direction.frames.length, 4, src + ': expected four walk frames per heading');
      let row;
      for (const [column, frame] of direction.frames.entries()) {
        const match = sheet.frames.find(item => JSON.stringify(item.rect) === JSON.stringify(frame.rect));
        assert(match, src + ': crop differs from measured alpha bounds');
        assert.equal(match.column, column, src + ': frame order must follow source columns');
        if (column === 0) row = match.row;
        assert.equal(match.row, row, src + ': heading mixes source rows');
        assert.deepEqual(frame.anchor, match.anchor, src + ': foot anchor mismatch');
        const index = match.row * 4 + column;
        assert(!occupied.has(index), src + ': source frame reused'); occupied.add(index);
      }
    }
    assert.equal(occupied.size, 16, src + ': incomplete frame coverage');
  }
  assert.equal(new Set(measured.flatMap(sheet => sheet.frames.map(frame => frame.sha256))).size, 96,
    'Expected 96 distinct source frames across all six sheets');
  return {result: 'PASS', headingAssessment: 'Visually reviewed approximate azimuths; not exact angular metrology',
    directions: spec.directions.length, frames: 96, sheets: measured};
}

async function main() {
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    const page = await browser.newPage();
    if (process.argv[2] === '--inspect') {
      const args = process.argv.slice(3), contactIndex = args.indexOf('--contact-sheet');
      const output = contactIndex < 0 ? null : args[contactIndex + 1];
      assert(contactIndex < 0 || (output && contactIndex === args.length - 2), 'Use --inspect FILE... [--contact-sheet OUTPUT.png]');
      const files = contactIndex < 0 ? args : args.slice(0, contactIndex);
      assert(files.length, 'Specify at least one PNG to inspect');
      const sheets = [];
      for (const file of files) {
        const sheet = await measure(page, path.resolve(file));
        try { verifySheet(sheet); sheet.pixelValidation = 'PASS'; }
        catch (error) { sheet.pixelValidation = 'FAIL'; sheet.issue = error.message; process.exitCode = 1; }
        sheets.push(sheet);
      }
      if (output) await contactSheet(page, sheets, output);
      console.log(JSON.stringify({reviewStatus: 'unreviewed', sheets}, null, 2));
    } else console.log(JSON.stringify(await audit(page), null, 2));
  } finally { await browser.close(); }
}

if (require.main === module) main().catch(error => { console.error('FAIL: ' + error.message); process.exitCode = 1; });
module.exports = {header, measureGrid, measureFrame, measure, verifySheet, contactSheet, audit};
