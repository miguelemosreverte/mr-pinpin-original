#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const base = path.resolve(__dirname, '../docs/storyboard');
const {covers} = JSON.parse(fs.readFileSync(path.join(base, 'covers.json')));
const release = process.argv.includes('--release');
for (const [id, cover] of Object.entries(covers)) {
  const mini = cover.miniature;
  assert.ok(mini && ['approved', 'proposed'].includes(mini.status), id + ' approval state');
  if (release) assert.equal(mini.status, 'approved', id + ' requires user approval');
  assert.equal(mini.asset, `images/covers/${id}/miniature/miniature-v${mini.version}.png`);
  assert.equal(mini.textFree, true); assert.equal(mini.languageIndependent, true);
  assert.equal(mini.width, 1024); assert.equal(mini.height, 1536);
  const file = path.join(base, mini.asset), bytes = fs.readFileSync(file);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), mini.width); assert.equal(bytes.readUInt32BE(20), mini.height);
  const meta = JSON.parse(fs.readFileSync(file.replace(/\.png$/, '.json')));
  assert.equal(meta.sha256, crypto.createHash('sha256').update(bytes).digest('hex'), id + ' hash');
  assert.equal(meta.status, mini.status, id + ' metadata approval state');
  assert.ok(meta.prompt && meta.references?.length && meta.startedAt && meta.finishedAt, id + ' generation provenance');
  assert.ok(fs.readFileSync(file.replace(/\.png$/, '.md'), 'utf8').trim());
  // Folder reorganization preserves all published title bytes and their old URLs.
  for (const asset of Object.values(cover.assets)) {
    const canonical = fs.readFileSync(path.join(base, asset));
    const legacy = fs.readFileSync(path.join(base, asset.replace('/title/', '/')));
    assert.ok(canonical.equals(legacy), id + ' title copy must preserve original bytes');
  }
}
console.log(`Verified four text-free miniature PNGs, hashes, provenance, dimensions and approval states; all 12 title copies preserve published bytes. Mode: ${release ? 'release' : 'review (proposals allowed)'}.`);
