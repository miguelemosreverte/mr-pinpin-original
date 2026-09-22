// Requires cwebp, dwebp and ImageMagick; override paths with CWEBP, DWEBP, MAGICK.
// node scripts/build-atlas-web-assets.cjs [--check]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');

const root = path.resolve(__dirname, '../docs/storyboard');
const manifestPath = path.join(root, 'images/atlas/web-assets-v1.json');
const names = [
  'shire-v1', 'shire-depth-v1', 'shire-floral-tile-v1',
  'pinpin-directions-a-v1', 'pinpin-directions-b-v1',
  'pinpin-directions-c-v1', 'pinpin-walk-v1'
];
const encoderArgs = ['-lossless', '-exact', '-m', '6', '-q', '100', '-metadata', 'all'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const tool = name => process.env[name.toUpperCase()] ||
  (fs.existsSync('/opt/homebrew/bin/' + name) ? '/opt/homebrew/bin/' + name : name);
const run = (name, args) => execFileSync(tool(name), args, {
  maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
});

function pngSize(bytes) {
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Expected PNG');
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
  assert.equal(bytes[24], 8, 'Only 8-bit sources are supported');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function rgba(file, width, height) {
  // Native decoding avoids canvas premultiplication losing hidden RGB/low-alpha precision.
  const bytes = run('magick', [file, '-alpha', 'on', '-depth', '8', 'rgba:-']);
  assert.equal(bytes.length, width * height * 4, file + ': unexpected RGBA length');
  return bytes;
}

function main() {
  assert(process.argv.slice(2).every(arg => arg === '--check'), 'Only --check is supported');
  const check = process.argv.includes('--check');
  const encoderVersion = run('cwebp', ['-version']).toString().trim();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-web-assets-'));
  try {
    const pending = [], assets = [];
    for (const name of names) {
      const src = 'images/atlas/' + name + '.png';
      const runtimeSrc = 'images/atlas/' + name + '.webp';
      const sourceFile = path.join(root, src);
      const sourceBytes = fs.readFileSync(sourceFile);
      const [width, height] = pngSize(sourceBytes);
      const encodedFile = path.join(temp, name + '.webp');
      const decodedFile = path.join(temp, name + '.png');
      run('cwebp', [...encoderArgs, '-quiet', sourceFile, '-o', encodedFile]);
      run('dwebp', [encodedFile, '-quiet', '-o', decodedFile]);
      assert.deepEqual(pngSize(fs.readFileSync(decodedFile)), [width, height], src + ': dimensions changed');
      const sourceRgba = rgba(sourceFile, width, height);
      const decodedRgba = rgba(decodedFile, width, height);
      assert(sourceRgba.equals(decodedRgba), src + ': decoded RGBA differs (including transparent RGB)');
      const encodedBytes = fs.readFileSync(encodedFile);
      assert(encodedBytes.length < sourceBytes.length, src + ': derivative is not smaller');
      assets.push({
        src, runtimeSrc, width, height,
        sourceBytes: sourceBytes.length, runtimeBytes: encodedBytes.length,
        savedBytes: sourceBytes.length - encodedBytes.length,
        sourceSha256: hash(sourceBytes), runtimeSha256: hash(encodedBytes),
        rgbaSha256: hash(sourceRgba), decodedRgbaExact: true
      });
      pending.push({file: path.join(root, runtimeSrc), bytes: encodedBytes});
      console.log(name + ': ' + sourceBytes.length + ' -> ' + encodedBytes.length + ' bytes; RGBA exact');
    }
    const sourceBytes = assets.reduce((sum, asset) => sum + asset.sourceBytes, 0);
    const runtimeBytes = assets.reduce((sum, asset) => sum + asset.runtimeBytes, 0);
    const manifest = {
      version: 1, format: 'image/webp',
      encoder: {name: 'cwebp', version: encoderVersion, args: encoderArgs},
      verification: 'Native PNG and dwebp PNG decoded to unassociated RGBA8; every byte equal, including RGB at alpha zero.',
      provenance: 'PNG originals and their generation metadata remain authoritative. Runtime substitution only; no resizing or sprite geometry changes.',
      totals: {sourceBytes, runtimeBytes, savedBytes: sourceBytes - runtimeBytes},
      assets
    };
    pending.push({file: manifestPath, bytes: Buffer.from(JSON.stringify(manifest, null, 2) + '\n')});
    // Validate all derivatives before replacing output files. Check mode only writes temp files.
    for (const {file, bytes} of pending) {
      if (check) assert(fs.readFileSync(file).equals(bytes), file + ': differs from deterministic build');
      else fs.writeFileSync(file, bytes);
    }
    console.log(JSON.stringify({action: check ? 'verified' : 'built', ...manifest.totals,
      reductionPercent: 100 * (1 - runtimeBytes / sourceBytes)}, null, 2));
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
}

try { main(); }
catch (error) {
  console.error(error.message);
  if (error.stderr) console.error(error.stderr.toString());
  process.exitCode = 1;
}
