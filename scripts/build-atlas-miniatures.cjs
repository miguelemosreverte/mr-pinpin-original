'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const root = path.join(__dirname, '../docs/storyboard');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'covers.json'), 'utf8'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-miniatures-'));
try {
  for (const cover of Object.values(registry.covers)) {
    const mini = cover.miniature, source = path.join(root, mini.asset);
    const original = JSON.parse(fs.readFileSync(source.replace('.png', '.json'), 'utf8'));
    if (hash(source) !== original.sha256) throw new Error('Original provenance mismatch: ' + source);
    for (const width of [256, 512, 1024]) {
      const height = width * 3 / 2;
      const asset = mini.asset.replace('.png', `-${width}.webp`), target = path.join(root, asset);
      const resized = path.join(temp, 'resized.png');
      if (width !== mini.width) execFileSync('magick', [source, '-filter', 'Lanczos', '-resize', `${width}x${height}!`, resized]);
      execFileSync('cwebp', ['-quiet', '-q', '92', '-sharp_yuv', '-alpha_q', '100', '-m', '6', width === mini.width ? source : resized, '-o', target]);
      fs.writeFileSync(target.replace('.webp', '.json'), JSON.stringify({
        schemaVersion:1, source:mini.asset, sourceSha256:hash(source), asset, sha256:hash(target),
        width, height, encoding:'lossy WebP', quality:92, sharpYuv:true, alphaQuality:100,
        resize:width === mini.width ? 'none' : 'Lanczos',
        build:'node scripts/build-atlas-miniatures.cjs',
        approval:'Inherits miniature approval; this derivative does not approve the source artwork.'
      }, null, 2) + '\n');
      console.log(asset + ': ' + fs.statSync(target).size + ' bytes');
    }
  }
} finally { fs.rmSync(temp, {recursive:true, force:true}); }
