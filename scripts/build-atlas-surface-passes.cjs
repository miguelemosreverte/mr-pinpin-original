// Deterministic technical derivatives; requires ImageMagick and cwebp.
// node scripts/build-atlas-surface-passes.cjs [--check]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname, '../docs/storyboard/images/atlas');
const SETTINGS = Object.freeze({ radius: 4, spatialSigma: 2.5, rangeSigma: 0.035,
  passes: 2, normalRadius: 3, edgeThreshold: 0.045, depthScale: 0.75,
  sampleWidth: 256, sampleHeight: 171, groundFar: 0.85, groundSpan: 0.65,
  occluderGain: 0.30, maxOccluderLift: 0.12 });
// Artistic ground reference sampled from v1, with explicit endpoint assumptions.
const OLD_GROUND = [[0, 0.80], [205, 111 / 255], [400, 125 / 255],
  [575, 101 / 255], [640, 91 / 255], [740, 66 / 255], [1024, 0.08]];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const tool = name => process.env[name.toUpperCase()] ||
  (fs.existsSync('/opt/homebrew/bin/' + name) ? '/opt/homebrew/bin/' + name : name);
const run = (name, args, input) => execFileSync(tool(name), args,
  { input, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, MAGICK_THREAD_LIMIT: '1' } });

function smoothDepth(source, width, height, settings = SETTINGS) {
  assert.equal(source.length, width * height);
  let current = Float32Array.from(source);
  const taps = [];
  for (let dy = -settings.radius; dy <= settings.radius; dy++) {
    for (let dx = -settings.radius; dx <= settings.radius; dx++) {
      taps.push([dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * settings.spatialSigma ** 2))]);
    }
  }
  const range = 2 * settings.rangeSigma ** 2;
  for (let pass = 0; pass < settings.passes; pass++) {
    const next = new Float32Array(current.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const center = current[y * width + x];
      let sum = 0, weights = 0;
      for (const [dx, dy, spatial] of taps) {
        const value = current[clamp(y + dy, 0, height - 1) * width + clamp(x + dx, 0, width - 1)];
        const weight = spatial * Math.exp(-((value - center) ** 2) / range);
        sum += weight * value; weights += weight;
      }
      next[y * width + x] = sum / weights;
    }
    current = next;
  }
  return current;
}

function calibrateDepth(source, width, height) {
  const field = new Float32Array(source.length);
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height, sourceY = v * 1024;
    const index = Math.max(1, OLD_GROUND.findIndex(([py]) => py >= sourceY));
    const [ay, ad] = OLD_GROUND[index - 1], [by, bd] = OLD_GROUND[index];
    const reference = ad + (bd - ad) * (sourceY - ay) / (by - ay);
    const ground = SETTINGS.groundFar - SETTINGS.groundSpan * v;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      // Bright paint/water cannot push the ground farther away. Only bounded near relief survives.
      const lift = clamp((reference - source[i]) * SETTINGS.occluderGain, 0, SETTINGS.maxOccluderLift);
      field[i] = ground - lift;
    }
  }
  return field;
}

function derivative(field, width, height, x, y, axis, settings) {
  const pos = axis ? y : x, size = axis ? height : width;
  const a = Math.max(0, pos - settings.normalRadius), b = Math.min(size - 1, pos + settings.normalRadius);
  const at = p => field[axis ? p * width + x : y * width + p];
  const center = at(pos), before = at(a), after = at(b);
  const left = pos - a, right = b - pos;
  if (!left) return right ? (after - center) / right : 0;
  if (!right) return (center - before) / left;
  // At a silhouette, use the same-side tangent instead of bridging two objects.
  const da = Math.abs(center - before), db = Math.abs(after - center);
  if (Math.max(da, db) > settings.edgeThreshold) {
    return da <= db ? (center - before) / left : (after - center) / right;
  }
  return (after - before) / (b - a);
}

function normalField(depth, width, height, settings = SETTINGS) {
  const rgb = Buffer.alloc(width * height * 3), scale = settings.depthScale * height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const nx = scale * derivative(depth, width, height, x, y, 0, settings);
    const ny = -scale * derivative(depth, width, height, x, y, 1, settings);
    const length = Math.hypot(nx, ny, 1), i = (y * width + x) * 3;
    rgb[i] = Math.round((nx / length * 0.5 + 0.5) * 255);
    rgb[i + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
    rgb[i + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
  }
  return rgb;
}

function linearLuminance(rgb) {
  const linear = Array.from({ length: 256 }, (_, i) => {
    const c = i / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const values = Buffer.alloc(rgb.length / 3);
  for (let i = 0; i < values.length; i++) values[i] = Math.round(255 *
    (0.2126 * linear[rgb[i * 3]] + 0.7152 * linear[rgb[i * 3 + 1]] + 0.0722 * linear[rgb[i * 3 + 2]]));
  return values;
}

function compactNormals(rgb, width, height) {
  const out = Buffer.alloc(SETTINGS.sampleWidth * SETTINGS.sampleHeight * 3);
  for (let y = 0; y < SETTINGS.sampleHeight; y++) for (let x = 0; x < SETTINGS.sampleWidth; x++) {
    const sx = Math.min(width - 1, Math.floor((x + 0.5) / SETTINGS.sampleWidth * width));
    const sy = Math.min(height - 1, Math.floor((y + 0.5) / SETTINGS.sampleHeight * height));
    rgb.copy(out, (y * SETTINGS.sampleWidth + x) * 3, (sy * width + sx) * 3, (sy * width + sx) * 3 + 3);
  }
  return out;
}

// Hand-reviewed image-space regions, expressed in the original 1536x1024 grid.
const MOTION_REGIONS = {
  water: [
    [[432,170],[545,193],[655,244],[797,280],[893,353],[966,378],[979,430],[923,476],[836,500],[785,536],[692,505],[634,481],[566,463],[492,491],[367,463],[321,427],[404,397],[472,364],[491,293],[445,247]],
    [[175,1],[208,8],[211,35],[237,43],[229,67],[253,85],[270,100],[263,123],[227,151],[213,143],[213,116],[197,98],[204,75],[184,54]],
    [[802,514],[842,525],[860,546],[907,563],[924,583],[900,600],[875,578],[830,563]],
    [[947,634],[995,632],[1013,672],[1046,699],[1068,741],[1105,758],[1128,796],[1106,817],[1076,783],[1043,756],[1020,715],[1001,691],[970,677]]
  ],
  // Canopy upper lobes only: center x/y, radii x/y. Never a whole-tree silhouette.
  canopies: [[340,183,98,61],[406,245,59,43],[618,47,58,45],[680,521,50,32],
    [825,649,50,44],[1240,391,34,72],[1457,415,65,44],[913,843,73,40],
    [1172,835,69,41],[1338,830,40,45],[83,691,38,43],[102,347,30,43]],
  exclusions: [
    [[275,256],[359,271],[384,376],[293,375]],
    [[812,281],[897,277],[913,328],[868,357],[805,341]],
    [[875,572],[1043,561],[1049,634],[904,653]],
    [[143,580],[430,579],[465,714],[220,755],[150,704]],
    [[1098,0],[1296,0],[1334,216],[1176,252],[1063,188]],
    [[1064,589],[1234,580],[1268,665],[1090,672]],
    [[1261,684],[1486,684],[1490,810],[1247,803]],
    [[565,456],[616,452],[640,512],[565,524]],
    [[913,438],[949,438],[956,472],[917,479]],
    [[1050,769],[1095,778],[1104,824],[1064,837]]
  ]
};

function polygonDistance(x, y, polygon) {
  let inside = false, distance = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[j], [bx, by] = polygon[i];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    distance = Math.min(distance, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return inside ? distance : -distance;
}

function motionMask(rgb, width, height) {
  const mw = 512, mh = 342, out = Buffer.alloc(mw * mh);
  const smooth = v => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const px = (x + 0.5) / mw * 1536, py = (y + 0.5) / mh * 1024;
    const sx = Math.min(width - 1, Math.floor((x + 0.5) / mw * width));
    const sy = Math.min(height - 1, Math.floor((y + 0.5) / mh * height));
    const i = (sy * width + sx) * 3, r = rgb[i] / 255, g = rgb[i + 1] / 255, b = rgb[i + 2] / 255;
    const waterCoverage = Math.max(...MOTION_REGIONS.water.map(p => smooth(polygonDistance(px, py, p) / 6)));
    const cyan = smooth((Math.min(b - r, g - r) - 0.01) / 0.08);
    const foam = smooth((Math.min(r, g, b) - 0.4) / 0.3) * (1 - smooth((Math.max(r, g, b) - Math.min(r, g, b) - 0.06) / 0.12));
    let canopy = 0;
    for (const [cx, cy, rx, ry] of MOTION_REGIONS.canopies) {
      const edge = (1 - Math.hypot((px - cx) / rx, (py - cy) / ry)) * Math.min(rx, ry);
      canopy = Math.max(canopy, 0.22 * smooth(edge / 10));
    }
    const leaves = smooth((g - b - 0.025) / 0.1) * smooth((g - 0.88 * r) / 0.08);
    const exclusion = Math.min(...MOTION_REGIONS.exclusions.map(p => smooth(-polygonDistance(px, py, p) / 6)));
    out[y * mw + x] = Math.round(255 * Math.max(waterCoverage * Math.max(cyan, foam), canopy * leaves) * exclusion);
  }
  return out;
}

function main() {
  assert(process.argv.slice(2).every(arg => arg === '--check'), 'Only --check is supported');
  const check = process.argv.includes('--check');
  const sources = ['shire-v1.png', 'shire-depth-v1.png'].map(file => {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    return { file, sha256: hash(bytes), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  });
  const { width, height } = sources[0];
  assert.deepEqual([sources[1].width, sources[1].height], [width, height], 'Sources must be registered');
  const rgb = run('magick', [path.join(ROOT, sources[0].file), '-colorspace', 'sRGB', '-alpha', 'off', '-depth', '8', 'rgb:-']);
  const sourceDepth = run('magick', [path.join(ROOT, sources[1].file), '-alpha', 'off', '-channel', 'R', '-separate', '-depth', '8', 'gray:-']);
  assert.equal(rgb.length, width * height * 3);
  assert.equal(sourceDepth.length, width * height);
  const smoothed = smoothDepth(Float32Array.from(sourceDepth, v => v / 255), width, height);
  const depth = calibrateDepth(smoothed, width, height);
  const normals = normalField(depth, width, height), highlights = linearLuminance(rgb);
  const depth16 = Buffer.alloc(depth.length * 2);
  depth.forEach((v, i) => depth16.writeUInt16BE(Math.round(v * 65535), i * 2));
  const specs = [
    { name: 'shire-depth-continuous-v2', bytes: depth16, bits: 16, channels: 1,
      meaning: 'Calibrated artistic lens depth, black near / white far: ground(v)=0.85-0.65*v, minus clamp(0.30*(authoredOldGround(y)-bilaterallySmoothedV1),0,0.12). Bright lake values follow the monotonic ground plane; local darker occluders receive bounded lifts. Not v1 occlusion depth; use matching groundDepthV2 for ground focus.',
      encoding: 'GRAY16 linear scalar UNORM; WebP and preview are quantized GRAY8. No sRGB transfer when sampling depth.' },
    { name: 'shire-normal-v2', bytes: normals, bits: 8, channels: 3,
      meaning: 'Estimated outward view-space surface normals from smoothed artistic depth; not ground-truth geometry or world-space orientation.',
      encoding: 'RGB8 UNORM: normalize(2 * rgb / 255 - 1). No sRGB transfer. +X right, +Y up, +Z toward viewer; right-handed camera space.' },
    { name: 'shire-highlight-v2', bytes: highlights, bits: 8, channels: 1,
      meaning: 'Estimated linear luminance / bright specular-candidate weight from painted SDR color. Bright diffuse paint and reflections cannot be separated; not emission, light-source segmentation, radiance or HDR.',
      encoding: 'GRAY8 = round(255 * (0.2126 Rlinear + 0.7152 Glinear + 0.0722 Blinear)); inverse-sRGB transfer applied to original RGB only. Sample as linear UNORM.' },
    { name: 'shire-motion-mask-v1', bytes: motionMask(rgb, width, height), bits: 8, channels: 1, width: 512, height: 342,
      meaning: 'Estimated motion coverage: lake and waterfall interiors gated by cyan/foam color; selected canopy tops capped at 0.22. Authored polygons exclude roads, buildings, trunks, bridge and rocks; conservative coverage intentionally omits uncertain areas.',
      encoding: 'GRAY8 linear coverage, red=green=blue; black 0, white 1. Six source-pixel inward water feather, ten-pixel canopy feather. Multiply the scene overlay blend (e.g. 0.35) by red coverage.' }
  ];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-surface-'));
  const pending = [];
  const timestamp = process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString() : new Date().toISOString();
  const generatorSha256 = hash(fs.readFileSync(__filename));
  try {
    for (const spec of specs) {
      const passWidth = spec.width || width, passHeight = spec.height || height;
      const file = spec.name + '.png', target = path.join(temp, file);
      run('magick', ['-size', `${passWidth}x${passHeight}`, '-depth', String(spec.bits), '-endian', 'MSB',
        (spec.channels === 3 ? 'rgb' : 'gray') + ':-', '-strip', '-define', 'png:exclude-chunks=date,time,gAMA,cHRM,sRGB,iCCP',
        '-define', 'png:compression-level=9', '-define', 'png:color-type=' + (spec.channels === 3 ? '2' : '0'), target], spec.bytes);
      const outputs = [];
      const collect = name => {
        const bytes = fs.readFileSync(path.join(temp, name));
        pending.push({ file: path.join(ROOT, name), bytes });
        outputs.push({ file: name, bytes: bytes.length, sha256: hash(bytes) });
      };
      collect(file);
      const webpInput = path.join(temp, spec.name + '-8.png');
      run('magick', [target, '-depth', '8', '-strip', webpInput]);
      run('cwebp', ['-quiet', '-lossless', '-exact', '-m', '6', '-q', '100', webpInput, '-o', path.join(temp, spec.name + '.webp')]);
      collect(spec.name + '.webp');
      const preview = path.join(temp, 'preview.png');
      // Point sampling keeps packed normal/data values in their original encoding.
      run('magick', [webpInput, '-sample', spec.width ? '512x342!' : '768x512!', '-strip', preview]);
      run('cwebp', ['-quiet', '-lossless', '-exact', '-m', '6', preview, '-o', path.join(temp, spec.name + '-preview.webp')]);
      collect(spec.name + '-preview.webp');
      let compact;
      if (spec.channels === 3) {
        const bytes = compactNormals(normals, width, height), file = spec.name + '.rgb.bin';
        pending.push({ file: path.join(ROOT, file), bytes });
        compact = { file, width: SETTINGS.sampleWidth, height: SETTINGS.sampleHeight, channels: 3,
          bytes: bytes.length, sha256: hash(bytes), sampling: 'Nearest source pixel at each compact texel center; no axis flip.' };
      }
      const manifestFile = path.join(ROOT, spec.name + '.json');
      const old = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile)) : null;
      const signature = hash(JSON.stringify({ generatorSha256, sources, settings: SETTINGS, outputs, compact }));
      const generatedAt = old?.signature === signature ? old.generatedAt : timestamp;
      const manifest = { version: 2, estimated: true, generatedAt, signature,
        command: 'node scripts/build-atlas-surface-passes.cjs', generatorSha256,
        tools: { magick: run('magick', ['-version']).toString().split('\n')[0], cwebp: run('cwebp', ['-version']).toString().trim() },
        sources, width: passWidth, height: passHeight, settings: SETTINGS, oldGroundReference: OLD_GROUND,
        ...(spec.width ? { motionRegions: MOTION_REGIONS } : {}), meaning: spec.meaning, encoding: spec.encoding,
        assumptions: 'Orthographic P=(x-W/2,H/2-y,-s*H*d), s=0.75, d in [0,1]. N=normalize(s*H*dd/dx,-s*H*dd/dy,1). Arbitrary affine distance scale; no intrinsics or physical units. Depth offset does not affect N. Ground receding upward gives positive Ny; no extra global tilt applied. Silhouettes use lower-jump one-sided tangents, not cross-object slopes.',
        limitations: 'Artistic recalibration, not geometry recovery. Monotonic ground plane intentionally replaces far-distance brightness bias. Bounded occluder lifts still inherit dark-paint/shadow errors and may miss bright occluders. Pixel grid/framing are registered; true silhouettes are not guaranteed. Water is assumed on the ground plane; waterfalls are not reconstructed. V1 stays authoritative for existing occlusion. Brightness does not recover actual emission.',
        outputs, ...(compact ? { compact } : {}) };
      pending.push({ file: manifestFile, bytes: Buffer.from(JSON.stringify(manifest, null, 2) + '\n') });
      const md = `# ${spec.name}\n\n${spec.meaning}\n\n${spec.encoding}\n\n${manifest.assumptions}\n\n${manifest.limitations}\n\nGenerated: ${generatedAt}\n\nCommand: \`${manifest.command}\` (\`--check\` rebuilds in temporary storage and compares bytes).\n\nGenerator SHA-256: \`${generatorSha256}\`\n\n${sources.map(s => `- ${s.file}: \`${s.sha256}\``).join('\n')}\n\nFull pass: ${passWidth}x${passHeight}. Preview: ${spec.width ? '512x342' : '768x512'}. Sidecar JSON records settings, encoders, output hashes and compact field when applicable. No original input is modified. Timestamp is retained for identical outputs; SOURCE_DATE_EPOCH sets it on new builds.\n`;
      pending.push({ file: path.join(ROOT, spec.name + '.md'), bytes: Buffer.from(md) });
      console.log(JSON.stringify({ pass: spec.name, outputs, compact }));
    }
    for (const source of sources) assert.equal(hash(fs.readFileSync(path.join(ROOT, source.file))), source.sha256, 'Source changed during build');
    for (const item of pending) {
      if (check) assert(fs.readFileSync(item.file).equals(item.bytes), item.file + ': differs from deterministic output');
      else fs.writeFileSync(item.file, item.bytes);
    }
    console.log(check ? 'All surface passes verified byte-for-byte.' : 'Surface passes built; original inputs unchanged.');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

module.exports = { SETTINGS, OLD_GROUND, smoothDepth, calibrateDepth, normalField, linearLuminance, compactNormals, motionMask, MOTION_REGIONS };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
