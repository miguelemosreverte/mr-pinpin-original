const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {validateManifest, inventory, prepareFamily} = require('./prepare-atlas-family-production.cjs');
const {measureGrid, measureFrame, verifySheet} = require('./verify-atlas-directions.cjs');
const {measureQuality} = require('./atlas-family-production-quality.cjs');

const angles = [0, 30, 60, 90];
const item = (extra = {}) => ({characterId: 'pinpin', sheetId: 'a', sheetAngles: angles, sourcePath: 'source.png', ...extra});
const manifest = sheets => ({schemaVersion: 1, version: 'v1', sheets});
function fixture(mode) {
  const width = 128, height = 128, data = Buffer.alloc(width * height * 4);
  const pixel = (x, y, color) => data.set(color, (y * width + x) * 4);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    const shift = mode === 'shift-only' ? col : 0;
    for (let y = 8; y < 25; y++) for (let x = 9; x < 22; x++)
      pixel(col * 32 + x + shift, row * 32 + y,
        [mode === 'shift-only' || mode === 'duplicate' ? 80 : 40 + row * 30 + col * 4, 100, 180, 255]);
    // Invisible RGB still participates in exact-codec preservation checks.
    pixel(col * 32 + 3, row * 32 + 3, [row + 1, col + 1, 99, 0]);
    if (mode !== 'shift-only' && mode !== 'duplicate') pixel(col * 32 + 9, row * 32 + 8, [80, 120, 160, 80]);
  }
  if (mode === 'clipped') for (let x = 9; x < 22; x++) pixel(x, height - 1, [80, 100, 180, 255]);
  if (mode === 'opaque') for (let i = 3; i < data.length; i += 4) data[i] = 255;
  if (mode === 'empty') data.fill(0);
  if (mode === 'duplicate') for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++)
    pixel(col * 32 + 3, row * 32 + 3, [0, 0, 0, 0]);
  const sheet = {file: 'synthetic.png', width, height, colorType: 6, data};
  sheet.grid = measureGrid(sheet);
  sheet.frames = Array.from({length: 16}, (_, index) => measureFrame(sheet, Math.floor(index / 4), index % 4, sheet.grid));
  try { verifySheet(sheet); sheet.pixelValidation = 'PASS'; }
  catch (error) { sheet.pixelValidation = 'FAIL'; sheet.issue = error.message; }
  return {sheet, data};
}

test('input contract accepts sparse row order and rejects overlapping or invalid headings/names', () => {
  assert.equal(validateManifest(manifest([item()])), 'v1');
  assert.equal(validateManifest(manifest([])), 'v1');
  for (const bad of [item({characterId: 'other'}), item({sheetAngles: [0, 30, 60, 60]}),
    item({sheetAngles: [0, 10, 20, 30]}), item({sheetId: '../a'}), item({referenceWidth: 0})])
    assert.throws(() => validateManifest(manifest([bad])));
  assert.throws(() => validateManifest(manifest([item(), item({sheetId: 'b'})])), /Duplicate character heading/);
  assert.throws(() => validateManifest(manifest([item(), item({sheetAngles: [120, 150, 180, 210]})])), /Duplicate output name/);
});

test('inventory never invents visual approval, even with all 288 frames prepared', () => {
  const partial = inventory([{...item(), status: 'prepared'}]);
  assert.equal(partial.technicalInventoryComplete, false);
  assert.equal(partial.characters[0].preparedFrames, 16);
  assert.equal(partial.characters[0].missingAngles.length, 20);
  assert.equal(partial.characters[1].missingAngles.length, 24);
  const sheets = ['pinpin', 'mama', 'mr-pompom'].flatMap(characterId => Array.from({length: 6}, (_, group) =>
    ({characterId, status: 'prepared', sheetAngles: Array.from({length: 4}, (_, row) => (group * 4 + row) * 15)})));
  const complete = inventory(sheets);
  assert.equal(complete.technicalInventoryComplete, true);
  assert.equal(complete.productionReady, false);
  assert.equal(complete.reviewStatus, 'awaiting-visual-review');
});

test('shared alpha/gutter rules reject clipping, opaque/empty sheets, and duplicate cells', () => {
  assert.equal(fixture().sheet.pixelValidation, 'PASS');
  for (const mode of ['clipped', 'opaque', 'empty', 'duplicate'])
    assert.equal(fixture(mode).sheet.pixelValidation, 'FAIL', mode);
  const {sheet, data} = fixture('clipped');
  const quality = measureQuality(sheet, data, angles);
  assert(quality.frames.some(frame => frame.gutter.outerEdgePixels > 0 || frame.gutter.visibleEdgePixels > 0));
});

test('metrics ignore transparent RGB and detect translation-only frames without claiming gait quality', () => {
  const {sheet, data} = fixture('shift-only');
  assert.equal(sheet.pixelValidation, 'PASS');
  const quality = measureQuality(sheet, data, angles);
  assert.equal(quality.gaitDifference.assessment, 'metrics-only-not-gait-quality-approval');
  for (const row of quality.gaitDifference.rows) assert.equal(row.identicalAnchoredPairs.length, 6);
  const changed = fixture();
  for (const row of measureQuality(changed.sheet, changed.data, angles).gaitDifference.rows)
    assert(row.pairs.every(pair => pair.changedPixels > 0));
  assert(quality.frames.every(frame => frame.alpha.transparentFraction > 0.1 && frame.gutter.left > 0));
});

const tool = name => process.env[name.toUpperCase()] ||
  (fs.existsSync('/opt/homebrew/bin/' + name) ? '/opt/homebrew/bin/' + name : name);
test('real codecs preserve PNG and all RGBA bytes; sequential arrivals refresh inventory without rewriting assets', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'family-prep-test-'));
  try {
    const manifestPath = path.join(temp, 'inputs.json'), outDir = path.join(temp, 'prepared');
    const source = path.join(temp, 'source.png'), {sheet, data} = fixture();
    execFileSync(tool('magick'), ['-size', `${sheet.width}x${sheet.height}`, '-depth', '8', 'rgba:-', 'PNG32:' + source], {input: data});
    const write = sheets => fs.writeFileSync(manifestPath, JSON.stringify(manifest(sheets)));
    write([item(), item({characterId: 'mama', sourcePath: 'later.png'})]);
    const first = prepareFamily({manifestPath, outDir});
    assert.equal(first.readiness.preparedSheets, 1);
    assert.equal(first.readiness.missingSheets, 17);
    assert.equal(first.readiness.declaredMissingSheets, 1);
    assert(fs.readFileSync(source).equals(fs.readFileSync(path.join(outDir, 'pinpin-a-v1.png'))));
    const metadataPath = path.join(outDir, 'pinpin-a-v1.json'), metadataBytes = fs.readFileSync(metadataPath);
    const details = JSON.parse(metadataBytes);
    assert.equal(details.encoding.decodedRgbaExact, true);
    assert.equal(new Set(details.directions.map(direction => direction.referenceWidth)).size, 1);
    assert.deepEqual(details.directions[0].frames[0], {rect: sheet.frames[0].rect, anchor: sheet.frames[0].anchor});
    assert.equal(details.source.width, 128);
    assert.equal(details.productionReady, false);
    fs.copyFileSync(source, path.join(temp, 'later.png'));
    write([item(), item({characterId: 'mama', sourcePath: 'later.png'}), item({characterId: 'mr-pompom', sourcePath: null})]);
    const second = prepareFamily({manifestPath, outDir});
    assert.equal(second.readiness.preparedSheets, 2);
    assert(metadataBytes.equals(fs.readFileSync(metadataPath)));
    assert.deepEqual(prepareFamily({manifestPath, outDir}), second);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(outDir, 'atlas-family-v1.prepare.json'))), second);
    const clipped = fixture('clipped');
    execFileSync(tool('magick'), ['-size', '128x128', '-depth', '8', 'rgba:-', 'PNG32:' + path.join(temp, 'clipped.png')], {input: clipped.data});
    write([item({sourcePath: 'clipped.png', sheetId: 'bad'})]);
    const rejected = prepareFamily({manifestPath, outDir});
    assert.equal(rejected.readiness.rejectedSheets, 1);
    assert(!fs.existsSync(path.join(outDir, 'pinpin-bad-v1.png')));
    assert(!fs.readdirSync(outDir).some(file => file.startsWith('.family-')));
    write([item({referenceWidth: 999})]);
    assert.equal(prepareFamily({manifestPath, outDir}).readiness.rejectedSheets, 1);
    assert(metadataBytes.equals(fs.readFileSync(metadataPath)), 'existing asset metadata must stay immutable');
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});
