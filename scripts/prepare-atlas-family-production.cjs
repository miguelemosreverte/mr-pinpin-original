// Offline preparation only. Source PNG bytes are copied; only WebP compression is performed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {measureSheet} = require('./prepare-atlas-intermediate-sprites.cjs');
const {header} = require('./verify-atlas-directions.cjs');
const {measureQuality} = require('./atlas-family-production-quality.cjs');

const CHARACTERS = ['pinpin', 'mama', 'mr-pompom'];
const ANGLES = Array.from({length: 24}, (_, index) => index * 15);
const ENCODER_ARGS = ['-lossless', '-exact', '-m', '6', '-q', '100', '-metadata', 'all'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const tool = name => process.env[name.toUpperCase()] ||
  (fs.existsSync('/opt/homebrew/bin/' + name) ? '/opt/homebrew/bin/' + name : name);
const run = (name, args) => execFileSync(tool(name), args, {
  maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
});

function validateManifest(manifest, version = manifest.version) {
  assert.equal(manifest.schemaVersion, 1, 'Expected schemaVersion: 1');
  assert(typeof version === 'string' && /^v[1-9][0-9]*$/.test(version), 'Expected version vN (N >= 1)');
  assert(Array.isArray(manifest.sheets), 'Expected sheets array (may be empty)');
  const occupied = new Set();
  const names = new Set();
  for (const item of manifest.sheets) {
    assert(CHARACTERS.includes(item.characterId), 'Expected characterId pinpin, mama, or mr-pompom');
    assert(item.sheetId === undefined || /^[a-z][a-z0-9-]*$/.test(item.sheetId), 'sheetId must be a lowercase slug');
    assert(Array.isArray(item.sheetAngles) && item.sheetAngles.length === 4, 'Expected four sheetAngles in source row order');
    for (const angle of item.sheetAngles) {
      assert(ANGLES.includes(angle), 'Angles must be integers from 0 to 345 in 15-degree increments');
      const key = `${item.characterId}:${angle}`;
      assert(!occupied.has(key), 'Duplicate character heading: ' + key);
      occupied.add(key);
    }
    assert(item.sourcePath === undefined || item.sourcePath === null ||
      (typeof item.sourcePath === 'string' && item.sourcePath.trim()), 'sourcePath must be a nonempty path or null');
    assert(item.referenceWidth === undefined || (Number.isFinite(item.referenceWidth) && item.referenceWidth > 0),
      'referenceWidth must be positive when supplied');
    const name = `${item.characterId}-${item.sheetId || item.sheetAngles.join('-')}`;
    assert(!names.has(name), 'Duplicate output name: ' + name);
    names.add(name);
  }
  return version;
}

function inventory(sheets) {
  const characters = CHARACTERS.map(characterId => {
    const records = sheets.filter(sheet => sheet.characterId === characterId);
    const headings = state => records.filter(sheet => sheet.status === state).flatMap(sheet => sheet.sheetAngles).sort((a, b) => a - b);
    const preparedAngles = headings('prepared'), rejectedAngles = headings('rejected');
    return {characterId, expectedHeadings: 24, preparedAngles, rejectedAngles,
      missingAngles: ANGLES.filter(angle => !preparedAngles.includes(angle) && !rejectedAngles.includes(angle)),
      preparedFrames: preparedAngles.length * 4, technicalInventoryComplete: preparedAngles.length === 24};
  });
  return {expectedCharacters: 3, expectedSheets: 18, expectedFrames: 288,
    preparedSheets: sheets.filter(sheet => sheet.status === 'prepared').length,
    missingSheets: 18 - sheets.filter(sheet => sheet.status !== 'missing').length,
    declaredMissingSheets: sheets.filter(sheet => sheet.status === 'missing').length,
    rejectedSheets: sheets.filter(sheet => sheet.status === 'rejected').length,
    technicalInventoryComplete: characters.every(character => character.technicalInventoryComplete),
    productionReady: false, reviewStatus: 'awaiting-visual-review',
    requiredReviews: ['character-identity', 'heading-accuracy', 'gait-quality', 'scale-and-foot-grounding'], characters};
}

function publish(outputs) {
  for (const {file, bytes} of outputs) assert(!fs.existsSync(file) || fs.readFileSync(file).equals(bytes),
    file + ': exists with different contents; use a new version or output directory');
  for (const {file, bytes} of outputs) if (!fs.existsSync(file)) fs.writeFileSync(file, bytes, {flag: 'wx'});
}

function prepareSheet(item, context) {
  const {outDir, version, manifestPath, tooling} = context;
  const record = {characterId: item.characterId, sheetAngles: item.sheetAngles, status: 'missing'};
  if (!item.sourcePath) return {...record, reason: 'sourcePath not supplied'};
  const sourcePath = path.resolve(path.dirname(manifestPath), item.sourcePath);
  record.sourcePath = sourcePath;
  try { fs.accessSync(sourcePath); }
  catch (error) {
    if (error.code === 'ENOENT') return {...record, reason: 'source file not present'};
    throw error;
  }
  const stem = `${item.characterId}-${item.sheetId || item.sheetAngles.join('-')}-${version}`;
  const temp = fs.mkdtempSync(path.join(outDir, '.family-prep-'));
  try {
    // Measure and encode the same snapshot even if a producer replaces its source concurrently.
    const snapshot = path.join(temp, 'source.png');
    fs.copyFileSync(sourcePath, snapshot);
    const {sheet, data} = measureSheet(snapshot);
    sheet.file = sourcePath;
    if (sheet.issue) sheet.issue = sheet.issue.replaceAll(snapshot, sourcePath);
    record.sourceSha256 = sheet.sha256;
    record.quality = measureQuality(sheet, data, item.sheetAngles);
    if (sheet.pixelValidation !== 'PASS') return {...record, status: 'rejected', reason: sheet.issue};
    const encoded = path.join(temp, 'runtime.webp'), decoded = path.join(temp, 'decoded.png');
    run('cwebp', [...ENCODER_ARGS, '-quiet', snapshot, '-o', encoded]);
    run('dwebp', [encoded, '-quiet', '-o', decoded]);
    const decodedHeader = header(decoded);
    assert.deepEqual([decodedHeader.width, decodedHeader.height], [sheet.width, sheet.height], 'WebP dimensions changed');
    const decodedRgba = run('magick', [decoded, '-alpha', 'on', '-depth', '8', 'rgba:-']);
    assert(data.equals(decodedRgba), 'WebP decoded RGBA differs from original');
    const png = fs.readFileSync(snapshot), webp = fs.readFileSync(encoded);
    assert.equal(hash(png), sheet.sha256, 'Source snapshot changed during preparation');
    const referenceWidth = item.referenceWidth ?? Math.max(...sheet.frames.map(frame => frame.rect[2]));
    const details = {schemaVersion: 1, assetVersion: version, characterId: item.characterId, sheetAngles: item.sheetAngles,
      reviewStatus: 'awaiting-visual-review', productionReady: false,
      headingAssessment: 'Requested row labels, not visually certified angles.',
      source: {file: sourcePath, sha256: sheet.sha256, width: sheet.width, height: sheet.height},
      provenance: {manifestPath, inputRecordSha256: hash(JSON.stringify(item)), tooling,
        operation: 'unchanged-PNG-copy-and-exact-lossless-WebP'},
      thresholds: {cropAlphaAbove: 15, bodyAlphaAbove: 127, cropPaddingPixels: 4,
        minimumTransparentFractionExclusive: 0.1, minimumBodyFractionExclusive: 0.01, maximumVisibleEdgePixels: 0},
      scaling: {referenceWidth, selection: item.referenceWidth === undefined
        ? 'measured-max-crop-width-awaiting-visual-calibration' : 'input-fixed-sheet-width-awaiting-visual-review'},
      sheet: {src: stem + '.png', runtimeSrc: stem + '.webp', width: sheet.width, height: sheet.height,
        grid: sheet.grid, referenceWidth, sha256: sheet.sha256},
      measurements: {grid: sheet.grid, frames: sheet.frames}, quality: record.quality,
      directions: item.sheetAngles.map((angle, row) => ({angle, src: stem + '.png', runtimeSrc: stem + '.webp', referenceWidth,
        frames: sheet.frames.filter(frame => frame.row === row).map(({rect, anchor}) => ({rect, anchor}))})),
      encoding: {name: 'cwebp', version: run('cwebp', ['-version']).toString().trim(), args: ENCODER_ARGS,
        sourceBytes: png.length, runtimeBytes: webp.length, savedBytes: png.length - webp.length,
        runtimeSha256: hash(webp), rgbaSha256: hash(data), decodedRgbaExact: true}};
    publish([{file: path.join(outDir, stem + '.png'), bytes: png}, {file: path.join(outDir, stem + '.webp'), bytes: webp},
      {file: path.join(outDir, stem + '.json'), bytes: Buffer.from(JSON.stringify(details, null, 2) + '\n')}]);
    return {...record, status: 'prepared', preparation: stem + '.json', png: stem + '.png', webp: stem + '.webp'};
  } catch (error) {
    return {...record, status: 'rejected', reason: error.message};
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
}

function prepareFamily({manifestPath, outDir, version}) {
  manifestPath = path.resolve(manifestPath);
  outDir = path.resolve(outDir);
  const manifestBytes = fs.readFileSync(manifestPath), manifest = JSON.parse(manifestBytes);
  version = validateManifest(manifest, version);
  const report = path.join(outDir, `atlas-family-${version}.prepare.json`);
  assert.notEqual(report, manifestPath, 'Input manifest must not be the inventory report');
  fs.mkdirSync(outDir, {recursive: true});
  const tooling = ['prepare-atlas-family-production.cjs', 'atlas-family-production-quality.cjs',
    'prepare-atlas-intermediate-sprites.cjs', 'verify-atlas-directions.cjs'].map(file =>
    ({file, sha256: hash(fs.readFileSync(path.join(__dirname, file)))}));
  const context = {outDir, version, manifestPath, manifestSha256: hash(manifestBytes), tooling};
  const sheets = manifest.sheets.map(item => prepareSheet(item, context));
  const result = {schemaVersion: 1, assetVersion: version,
    provenance: {manifestPath, manifestSha256: context.manifestSha256, tooling}, readiness: inventory(sheets), sheets};
  const reportTemp = fs.mkdtempSync(path.join(outDir, '.family-report-'));
  try {
    const stagedReport = path.join(reportTemp, 'report.json');
    fs.writeFileSync(stagedReport, JSON.stringify(result, null, 2) + '\n');
    fs.renameSync(stagedReport, report);
  } finally { fs.rmSync(reportTemp, {recursive: true, force: true}); }
  return result;
}

function main(args = process.argv.slice(2)) {
  const {values, positionals} = parseArgs({args, allowPositionals: true,
    options: {'out-dir': {type: 'string'}, version: {type: 'string'}, help: {type: 'boolean'}}});
  if (values.help) {
    console.log('node scripts/prepare-atlas-family-production.cjs INPUTS.json --out-dir STAGING_DIR [--version vN]\n' +
      'Manifest: {schemaVersion:1, version:"v1", sheets:[{characterId:"pinpin", sheetId:"a", sheetAngles:[0,30,60,90], sourcePath:"sheet.png", referenceWidth:400}]}\n' +
      'Paths resolve relative to INPUTS.json. sourcePath may be null/missing; referenceWidth is optional.\n' +
      'Outputs versioned PNG/WebP/JSON per accepted sheet and refreshes atlas-family-vN.prepare.json inventory.\n' +
      'Incomplete inventory is allowed. Rejected sheets exit 1. All visual reviews remain pending.\n' +
      'Sheet outputs are immutable; additions refresh inventory. Changed sheet inputs need a new version or directory.');
    return;
  }
  assert(positionals.length === 1 && values['out-dir'], 'Specify INPUTS.json and --out-dir; see --help');
  const result = prepareFamily({manifestPath: positionals[0], outDir: values['out-dir'], version: values.version});
  console.log(JSON.stringify(result.readiness, null, 2));
  if (result.readiness.rejectedSheets) process.exitCode = 1;
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {validateManifest, inventory, prepareFamily, main};
