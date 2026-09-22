const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const EXPECTED = Array.from({length: 24}, (_, i) => i * 15);
const CHARACTERS = [
  {id: 'pinpin', name: 'Mr. Pinpin', displayWidth: 56},
  {id: 'mama', name: 'Mama', displayWidth: 84},
  {id: 'mr-pompom', name: 'Mr. PomPom', displayWidth: 28}
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function assemble({root = path.resolve(__dirname, '../docs/storyboard'),
  outDir = path.join(root, 'images/atlas/family-production-v1'), version = 'v1', write = true} = {}) {
  root = path.resolve(root); outDir = path.resolve(outDir);
  assert(/^v[1-9][0-9]*$/.test(version), 'Expected vN');
  const prefix = path.relative(root, outDir).split(path.sep).join('/');
  assert(prefix && !prefix.startsWith('..') && !path.isAbsolute(prefix), 'Assets must be inside storyboard root');
  const reportPath = path.join(outDir, `atlas-family-${version}.prepare.json`);
  const report = JSON.parse(fs.readFileSync(reportPath));
  assert.equal(report.assetVersion, version);
  const relative = name => {
    assert(typeof name === 'string' && path.basename(name) === name, 'Expected asset basename');
    return prefix + '/' + name;
  };
  const characters = CHARACTERS.map(config => {
    const records = report.sheets.filter(item => item.characterId === config.id && item.status === 'prepared');
    const sheets = [], directions = [];
    for (const record of records) {
      const details = JSON.parse(fs.readFileSync(path.join(outDir, record.preparation)));
      assert(!details.kind || details.kind === 'body', 'Expression assets must not enter body directions');
      assert.equal(details.characterId, config.id);
      assert.equal(details.assetVersion, version);
      assert.equal(details.quality.pixelValidation, 'PASS');
      assert.equal(details.encoding.decodedRgbaExact, true);
      assert.deepEqual(details.sheetAngles, record.sheetAngles);
      assert.equal(details.directions.length, 4);
      assert.equal(details.source.sha256, record.sourceSha256);
      assert.equal(hash(fs.readFileSync(path.join(outDir, record.png))), details.source.sha256, 'PNG changed after preparation');
      assert.equal(hash(fs.readFileSync(path.join(outDir, record.webp))), details.encoding.runtimeSha256, 'WebP changed after preparation');
      const src = relative(record.png), runtimeSrc = relative(record.webp);
      const promptName = record.png.replace(/\.png$/, '.md');
      sheets.push({...details.sheet, src, runtimeSrc, reviewStatus: details.reviewStatus,
        preparation: relative(record.preparation),
        ...(fs.existsSync(path.join(outDir, promptName)) ? {prompt: relative(promptName)} : {})});
      for (const [row, direction] of details.directions.entries()) {
        assert.equal(direction.angle, record.sheetAngles[row]);
        assert.equal(direction.referenceWidth, details.sheet.referenceWidth);
        assert.equal(direction.frames.length, 4);
        for (const [column, frame] of direction.frames.entries()) {
          const measured = details.measurements.frames.find(item => item.row === row && item.column === column);
          assert.deepEqual(frame, {rect: measured.rect, anchor: measured.anchor}, 'Crop or foot anchor changed');
        }
        directions.push({...direction, src, runtimeSrc});
      }
    }
    directions.sort((a, b) => a.angle - b.angle);
    const angles = directions.map(direction => direction.angle);
    assert(angles.every(angle => EXPECTED.includes(angle)) && new Set(angles).size === angles.length, 'Duplicate or invalid headings');
    const missingAngles = EXPECTED.filter(angle => !angles.includes(angle));
    const fullCircle = missingAngles.length === 0;
    return {...config, fullCircle, reviewStatus: fullCircle ? 'prepared-awaiting-visual-review' : angles.length ? 'partial' : 'missing',
      productionReady: false, headingAssessment: 'Requested approximate azimuth bins; no exact-angle certification.',
      readiness: {preparedDirections: angles.length, expectedDirections: 24, preparedFrames: angles.length * 4,
        missingAngles, technicalInventoryComplete: fullCircle}, sheets, directions};
  });
  const fullCircle = characters.every(character => character.fullCircle);
  const manifest = {version: 1, assetVersion: version, reviewStatus: fullCircle ? 'prepared-awaiting-visual-review' : 'partial',
    fullCircle, productionReady: false, angleConvention: 'clockwise-image-plane', angles: EXPECTED,
    preparation: relative(path.basename(reportPath)), characters};
  if (write) {
    const temp = fs.mkdtempSync(path.join(outDir, '.family-manifest-'));
    try {
      const outputs = [{file: path.join(root, 'family-production.json'), data: manifest},
        ...characters.filter(character => character.directions.length).map(character =>
          ({file: path.join(outDir, `${character.id}-${version}.character.json`), data: character}))];
      for (const [index, output] of outputs.entries()) {
        const staged = path.join(temp, String(index) + '.json');
        fs.writeFileSync(staged, JSON.stringify(output.data, null, 2) + '\n');
        fs.renameSync(staged, output.file);
      }
    } finally { fs.rmSync(temp, {recursive: true, force: true}); }
  }
  return manifest;
}

module.exports = {assemble};
