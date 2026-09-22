// Candidate-only integration. Reuses existing measurements and exact WebP verification.
// node docs/storyboard/images/atlas/family-proofs/prepare-candidate.cjs SHEET.png --id pinpin --version v1
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {parseArgs} = require('node:util');
const {measureSheet, prepare} = require('../../../../../scripts/prepare-atlas-intermediate-sprites.cjs');

const ROOT = path.resolve(__dirname, '../../..');
const MANIFEST = path.join(ROOT, 'family-sprites.json');
const ANGLES = [15, 45, 75, 105];
const CHARACTERS = {
  pinpin: {name: 'Mr. Pinpin', displayWidth: 56, stem: 'pinpin-eyes'},
  mama: {name: 'Mama', displayWidth: 84, stem: 'mama-walk'},
  'mr-pompom': {name: 'Mr. PomPom', displayWidth: 28, stem: 'pompom-walk'}
};
const median = values => { const v = [...values].sort((a, b) => a - b); return (v[1] + v[2]) / 2; };
const round = value => Math.round(value * 1000) / 1000;

function main() {
  const {values, positionals} = parseArgs({allowPositionals: true,
    options: {id: {type: 'string'}, version: {type: 'string'}}});
  assert.equal(positionals.length, 1, 'Specify one generated sheet path');
  const config = CHARACTERS[values.id];
  assert(config, 'Expected --id pinpin, mama, or mr-pompom');
  assert(/^v[0-9]+$/.test(values.version || ''), 'Expected --version vN');
  const file = path.resolve(positionals[0]), {sheet} = measureSheet(file);
  assert.equal(sheet.pixelValidation, 'PASS', sheet.issue);
  const context = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'atlas-directions.js'), 'utf8'), context, {timeout: 1000});
  const source = context.window.atlasDirections.sheets.find(s => s.src === 'images/atlas/pinpin-directions-intermediate-a-v2.png');
  assert(source, 'Missing active Pinpin A v2 calibration reference');
  const reference = measureSheet(path.join(ROOT, source.src)).sheet;
  assert.equal(reference.pixelValidation, 'PASS', reference.issue);
  assert.equal(reference.sha256, source.sha256, 'Pinpin calibration reference changed');
  const dimensions = (item, row) => [2, 3].map(axis => median(item.frames.filter(f => f.row === row).map(f => f.bodyBounds[axis])));
  const rows = ANGLES.map((angle, row) => {
    const bodyPixels = dimensions(sheet, row), referenceBodyPixels = dimensions(reference, row);
    return {angle, bodyPixels, referenceBodyPixels, suggestedReferenceWidth: round(source.referenceWidth *
      Math.sqrt(bodyPixels[0] * bodyPixels[1] / (referenceBodyPixels[0] * referenceBodyPixels[1])))};
  });
  const referenceWidth = round(median(rows.map(row => row.suggestedReferenceWidth)));
  for (const row of rows) row.bodyMapPixels = row.bodyPixels.map(value => round(value * config.displayWidth / referenceWidth));
  const stem = config.stem + '-' + values.version;
  const src = 'images/atlas/family-proofs/' + stem + '.png', runtimeSrc = src.replace(/\.png$/, '.webp');
  const calibration = {method: 'Median same-heading body-area ratio to production Pinpin A v2; one fixed sheet scale.',
    referenceSrc: source.src, referenceSha256: source.sha256, referenceWidth: source.referenceWidth,
    chosenReferenceWidth: referenceWidth, relativeDisplaySize: config.displayWidth / 56, rows};
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-family-proof-'));
  try {
    const prepared = prepare({file, angles: ANGLES, version: values.version, name: stem, referenceWidth, outDir: temp});
    const candidate = {id: values.id, name: config.name, displayWidth: config.displayWidth, src, runtimeSrc,
      width: sheet.width, height: sheet.height, referenceWidth, grid: sheet.grid, sha256: sheet.sha256,
      reviewStatus: 'candidate', headingAssessment: values.id === 'mama'
        ? 'Requested approximate azimuth bins, not certified angles. Parent notes the final 105-degree row is more oblique-left than requested.'
        : values.id === 'mr-pompom'
        ? 'Requested approximate azimuth bins, not certified angles. Open and closed mouth vary across the gait cycle as a candidate artistic choice.'
        : 'Requested approximate azimuth bins, not certified angles.',
      preparation: 'images/atlas/family-proofs/' + stem + '.prepare.json',
      directions: prepared.directions.map(direction => ({...direction, src, runtimeSrc}))};
    const details = {schemaVersion: 1, reviewStatus: 'candidate', source: prepared.source,
      candidate, calibration, measurements: prepared.measurements, encoding: prepared.encoding};
    const outputs = ['png', 'webp'].map(extension => ({file: path.join(__dirname, stem + '.' + extension),
      bytes: fs.readFileSync(path.join(temp, stem + '.' + extension))}));
    outputs.push({file: path.join(__dirname, stem + '.prepare.json'), bytes: Buffer.from(JSON.stringify(details, null, 2) + '\n')});
    for (const output of outputs) assert(!fs.existsSync(output.file) || fs.readFileSync(output.file).equals(output.bytes),
      output.file + ': already exists with different contents; use a new version');
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const existing = manifest.characters.find(c => c.id === values.id);
    assert(!existing || existing.src === candidate.src, 'Candidate already published for this id; review replacement explicitly');
    for (const output of outputs) if (!fs.existsSync(output.file)) fs.writeFileSync(output.file, output.bytes, {flag: 'wx'});
    manifest.characters = [...manifest.characters.filter(c => c.id !== values.id), candidate]
      .sort((a, b) => Object.keys(CHARACTERS).indexOf(a.id) - Object.keys(CHARACTERS).indexOf(b.id));
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({candidate, calibration, encoding: prepared.encoding}, null, 2));
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
}

try { main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
