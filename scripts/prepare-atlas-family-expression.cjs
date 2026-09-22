const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {prepareFamily} = require('./prepare-atlas-family-production.cjs');
const {measureSheet} = require('./prepare-atlas-intermediate-sprites.cjs');

function prepareExpression({sourcePath, neutralPath, outDir, version = 'v1', generation = null}) {
  outDir = path.resolve(outDir); neutralPath = path.resolve(neutralPath); sourcePath = path.resolve(sourcePath);
  const neutral = JSON.parse(fs.readFileSync(neutralPath));
  const stem = path.basename(neutralPath).replace(/-v[0-9]+\.json$/, '-blink-' + version);
  assert.notEqual(stem, path.basename(neutralPath), 'Expected versioned neutral metadata');
  const neutralImage = path.join(path.dirname(neutralPath), neutral.sheet.src);
  assert.equal(createHash('sha256').update(fs.readFileSync(neutralImage)).digest('hex'), neutral.source.sha256);
  const root = path.resolve(__dirname, '../docs/storyboard');
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  assert(!relative(outDir).startsWith('..'), 'Output must be within storyboard');
  const stage = fs.mkdtempSync(path.join(outDir, '.expression-prep-'));
  try {
    const input = {schemaVersion:1, version, sheets:[{characterId:neutral.characterId,
      sheetId:stem.slice(neutral.characterId.length + 1, -(version.length + 1)),
      sheetAngles:neutral.sheetAngles, sourcePath, referenceWidth:neutral.sheet.referenceWidth}]};
    const inputPath = path.join(stage, 'input.json');
    fs.writeFileSync(inputPath, JSON.stringify(input));
    const result = prepareFamily({manifestPath:inputPath, outDir:stage});
    const record = result.sheets[0];
    assert.equal(record.status, 'prepared', record.reason);
    const metadata = JSON.parse(fs.readFileSync(path.join(stage, record.preparation)));
    assert.deepEqual([metadata.sheet.width, metadata.sheet.height], [neutral.sheet.width, neutral.sheet.height],
      'Expression canvas dimensions differ from neutral body');
    const {sheet, data} = measureSheet(sourcePath);
    const frames = sheet.frames.map(frame => {
      const original = neutral.measurements.frames.find(item => item.row === frame.row && item.column === frame.column);
      const foot = item => [item.rect[0] + item.anchor[0], item.rect[1] + item.anchor[1]];
      const a = foot(original), b = foot(frame);
      const [cx,cy,cw,ch] = original.rect, [x,y,w,h] = frame.cell;
      let artworkOutsideNeutralCrop = 0;
      for (let py=y;py<y+h;py++) for(let px=x;px<x+w;px++)
        if (data[(py*sheet.width+px)*4+3]>15 && (px<cx || px>=cx+cw || py<cy || py>=cy+ch)) artworkOutsideNeutralCrop++;
      return {row:frame.row,column:frame.column,neutralRect:original.rect,neutralAnchor:original.anchor,
        measuredExpressionRect:frame.rect,measuredExpressionAnchor:frame.anchor,
        sheetFootDelta:[b[0]-a[0],b[1]-a[1]],artworkOutsideNeutralCrop};
    });
    const src = relative(path.join(outDir, record.png)), runtimeSrc = relative(path.join(outDir, record.webp));
    metadata.kind = 'blink';
    metadata.src = src; metadata.runtimeSrc = runtimeSrc;
    metadata.neutralSrc = relative(neutralImage);
    metadata.neutralPreparation = relative(neutralPath);
    metadata.neutralSha256 = neutral.source.sha256;
    metadata.provenance.inputRecord = input.sheets[0];
    delete metadata.provenance.manifestPath;
    metadata.generation = generation;
    metadata.registration = {status:'awaiting-eye-region-registration-review',
      runtimeCoordinates:'neutral-body-crops-and-foot-anchors',pixelRegistrationCertified:false,
      matchingCanvasDimensions:true,neutralGrid:neutral.sheet.grid,expressionGrid:metadata.sheet.grid,
      fullSheetSwapApproved:false,frames};
    metadata.measuredDirections = metadata.directions;
    metadata.directions = neutral.directions.map(direction => ({...direction,src,runtimeSrc}));
    fs.writeFileSync(path.join(stage, record.preparation), JSON.stringify(metadata,null,2)+'\n');
    for(const file of [record.png,record.webp,record.preparation]) assert(!fs.existsSync(path.join(outDir,file)) ||
      fs.readFileSync(path.join(outDir,file)).equals(fs.readFileSync(path.join(stage,file))), 'Existing expression differs; use a new version');
    for(const file of [record.png,record.webp,record.preparation]) if(!fs.existsSync(path.join(outDir,file)))
      fs.copyFileSync(path.join(stage,file),path.join(outDir,file),fs.constants.COPYFILE_EXCL);
    return {kind:'blink',characterId:neutral.characterId,angles:neutral.sheetAngles,src,runtimeSrc,
      preparation:relative(path.join(outDir,record.preparation)),neutralSrc:metadata.neutralSrc,
      registration:metadata.registration,encoding:metadata.encoding};
  } finally {fs.rmSync(stage,{recursive:true,force:true});}
}

module.exports = {prepareExpression};
