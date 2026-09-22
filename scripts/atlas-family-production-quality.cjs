const {createHash} = require('node:crypto');

const round = value => Math.round(value * 1e6) / 1e6;

// Compare at measured foot anchors on an integer grid, without resampling artwork.
function visiblePixels(sheet, data, frame) {
  const [left, top, width, height] = frame.cell;
  const footX = Math.floor(frame.rect[0] + frame.anchor[0]);
  const footY = frame.rect[1] + frame.anchor[1];
  const pixels = new Map();
  for (let y = top; y < top + height; y++) for (let x = left; x < left + width; x++) {
    const offset = (y * sheet.width + x) * 4, alpha = data[offset + 3];
    if (alpha > 0) pixels.set(`${x - footX},${y - footY}`,
      [data[offset] * alpha / 255, data[offset + 1] * alpha / 255, data[offset + 2] * alpha / 255, alpha]);
  }
  return pixels;
}

function difference(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let changed = 0, absoluteError = 0;
  for (const key of keys) {
    const first = a.get(key) || [0, 0, 0, 0], second = b.get(key) || [0, 0, 0, 0];
    const error = first.reduce((sum, value, channel) => sum + Math.abs(value - second[channel]), 0);
    if (error > 0) changed++;
    absoluteError += error;
  }
  return {comparedPixels: keys.size, changedPixels: changed,
    changedFraction: keys.size ? round(changed / keys.size) : 0,
    meanAbsolutePremultipliedRgbaDifference: keys.size ? round(absoluteError / (keys.size * 4 * 255)) : 0};
}

function measureQuality(sheet, data, angles) {
  const frames = sheet.frames.map(frame => {
    const [x, y, width, height] = frame.cell, bounds = frame.artworkBounds;
    return {row: frame.row, column: frame.column,
      alpha: {transparentFraction: round(frame.transparent / (width * height)),
        bodyFraction: round(frame.visible / (width * height)), semitransparentPixels: frame.semitransparent},
      gutter: {left: bounds && bounds[0] - x, top: bounds && bounds[1] - y,
        right: bounds && x + width - bounds[0] - bounds[2], bottom: bounds && y + height - bounds[1] - bounds[3],
        visibleEdgePixels: frame.edgePixels, nonzeroAlphaEdgePixels: frame.faintEdgePixels,
        outerEdgePixels: frame.outerEdgePixels},
      crop: frame.rect, footAnchor: frame.anchor};
  });
  const rows = angles.map((angle, row) => {
    const sourceFrames = sheet.frames.filter(frame => frame.row === row);
    if (sourceFrames.some(frame => !frame.rect || !frame.anchor)) return {angle, row, measurable: false, pairs: []};
    const pixels = sourceFrames.map(frame => visiblePixels(sheet, data, frame)), pairs = [];
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      pairs.push({columns: [a, b], ...difference(pixels[a], pixels[b])});
    }
    return {angle, row, measurable: true, pairs,
      identicalAnchoredPairs: pairs.filter(pair => pair.changedPixels === 0).map(pair => pair.columns)};
  });
  return {pixelValidation: sheet.pixelValidation, issue: sheet.issue || null, frames,
    gaitDifference: {assessment: 'metrics-only-not-gait-quality-approval',
      method: 'All six pairs per row; integer foot-anchor alignment (floor x), alpha-premultiplied RGBA, transparent RGB ignored.', rows},
    rgbaSha256: createHash('sha256').update(data).digest('hex')};
}

module.exports = {measureQuality, difference};
