'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { BUCKET, BEGIN, END, assetPath, validateReceipt, applyReceipt, externalCache } = require('./sync.cjs');

// Fixture repositories must not inherit user templates, filters, or fsmonitor.
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.GIT_CONFIG_GLOBAL = os.devNull;
process.env.GIT_TEMPLATE_DIR = '';

function asset(name, content, role = 'archive') {
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  return { path: name, role, bytes: Buffer.byteLength(content), sha256,
    object: `sha256/${sha256.slice(0, 2)}/${sha256}/${path.posix.basename(name)}` };
}

function proof(entries) {
  return { version: 1, action: 'push', bucket: BUCKET, dry_run: false, verified: true,
    entries: entries.map(entry => ({ ...entry, verified: true, remote_verified: true })) };
}

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pinpin-sync-test-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'repo');
  fs.mkdirSync(root);
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  git('init', '-q');
  function write(name, content) {
    const filename = path.join(root, name);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, content);
  }
  const archive = asset('docs/archive.bin', 'archive');
  const production = asset('docs/production.webp', 'production', 'production');
  write(archive.path, 'archive');
  write(production.path, 'production');
  write('.gitignore', '# personal rules\n.env\n');
  git('add', '--', '.gitignore', archive.path, production.path);
  const manifest = { version: 1, bucket: BUCKET, assets: [archive, production] };
  const receipt = proof([archive]);
  const snapshot = () => ({ index: fs.readFileSync(path.join(root, '.git/index')), ignore: fs.readFileSync(path.join(root, '.gitignore')) });
  return { base, root, git, write, archive, production, manifest, receipt, snapshot };
}

test('missing, incomplete, or mismatched receipts refuse all Git changes', async t => {
  const f = fixture(t);
  const before = f.snapshot();
  const bad = [undefined, { bucket: BUCKET, entries: [] },
    { ...f.receipt, bucket: 'someone/else' }, { ...f.receipt, dry_run: true },
    { ...f.receipt, action: 'pull' }, { ...f.receipt, verified: false },
    ...['version', 'action', 'dry_run', 'verified'].map(field => ({ ...f.receipt, [field]: undefined })),
    { ...f.receipt, entries: [f.receipt.entries[0], f.receipt.entries[0]] },
    ...[{ verified: false }, { remote_verified: false }, { remote_verified: undefined },
      { role: undefined }, { role: 'production' }, { object: undefined }, { object: '../escape' },
      { bytes: 42 }, { sha256: '0'.repeat(64) }]
      .map(change => ({ ...f.receipt, entries: [{ ...f.receipt.entries[0], ...change }] }))];
  for (const receipt of bad) {
    await assert.rejects(applyReceipt({ root: f.root, manifest: f.manifest, receipt }), /receipt/i);
    assert.deepEqual(f.snapshot(), before);
  }
});

test('receipt verification covers every archive and no production or extra paths', t => {
  const f = fixture(t);
  assert.throws(() => validateReceipt({ ...f.manifest, assets: [...f.manifest.assets, asset('docs/other.bin', 'x')] }, f.receipt), /missing/);
  assert.throws(() => validateReceipt(f.manifest, { ...f.receipt, entries: [...f.receipt.entries,
    { ...f.production, verified: true }] }), /unexpected/);
});

test('path traversal, absolute paths, secret paths, and malformed objects fail closed', async t => {
  const f = fixture(t);
  const before = f.snapshot();
  for (const name of ['../escape', '/docs/x', 'C:/docs/x', 'docs/../x', 'docs//x',
    'docs/./x', 'docs/a\\b', 'docs/a\nb', 'docs/.env', 'docs/.env.local', 'docs/.git/config',
    'docs/secrets.json', 'docs/credentials.json', 'docs/id_rsa', 'docs/private.key']) {
    assert.throws(() => assetPath(name));
    await assert.rejects(applyReceipt({ root: f.root,
      manifest: { ...f.manifest, assets: [asset(name, 'x')] }, receipt: f.receipt }));
  }
  await assert.rejects(applyReceipt({ root: f.root, receipt: f.receipt,
    manifest: { ...f.manifest, assets: [{ ...f.archive, object: '../escape' }] } }), /immutable/);
  assert.deepEqual(f.snapshot(), before);
});

test('local edits after upload abort before index or ignore changes, even at equal size', async t => {
  const f = fixture(t);
  f.write(f.archive.path, 'ARCHIVE');
  const before = f.snapshot();
  await assert.rejects(applyReceipt(f), /source changed/);
  assert.deepEqual(f.snapshot(), before);
  assert.equal(fs.readFileSync(path.join(f.root, f.archive.path), 'utf8'), 'ARCHIVE');
});

test('unverified staged archive bytes are preserved even when working bytes match the receipt', async t => {
  const f = fixture(t);
  f.write(f.archive.path, 'staged different content');
  f.git('add', '--', f.archive.path);
  f.write(f.archive.path, 'archive');
  const before = f.snapshot();
  await assert.rejects(applyReceipt(f), /Staged archive differs/);
  assert.deepEqual(f.snapshot(), before);
});

test('verified staged modifications untrack while working files and production remain', async t => {
  const f = fixture(t);
  const productionIndex = f.git('ls-files', '--stage', '--', f.production.path);
  f.write(f.archive.path, 'updated archive');
  f.git('add', '--', f.archive.path);
  f.archive = asset(f.archive.path, 'updated archive');
  f.manifest.assets = [f.archive, f.production];
  f.receipt = proof([f.archive]);
  const result = await applyReceipt(f);
  assert.deepEqual(result.untrack, [f.archive.path]);
  assert.equal(f.git('ls-files', '--', f.archive.path), '');
  assert.equal(f.git('ls-files', '--stage', '--', f.production.path), productionIndex);
  assert.equal(fs.readFileSync(path.join(f.root, f.archive.path), 'utf8'), 'updated archive');
  assert.equal(fs.readFileSync(path.join(f.root, f.production.path), 'utf8'), 'production');
  assert.equal(f.git('check-ignore', '--', f.archive.path).trim(), f.archive.path);
  assert.deepEqual((await applyReceipt(f)).untrack, []);
});

test('missing locally archived files are accepted with a complete verified receipt', async t => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.root, f.archive.path));
  await applyReceipt(f);
  assert.equal(f.git('ls-files', '--', f.archive.path), '');
  assert.equal(fs.existsSync(path.join(f.root, f.archive.path)), false);
});

test('dry-run application makes no filesystem or index changes', async t => {
  const f = fixture(t);
  const before = f.snapshot();
  const result = await applyReceipt({ ...f, dryRun: true });
  assert.deepEqual(result.untrack, [f.archive.path]);
  assert.equal(result.applied, false);
  assert.deepEqual(f.snapshot(), before);
});

test('outside ignore content is preserved and metacharacter paths are exact', async t => {
  const f = fixture(t);
  const prefix = '# keep\r\n.env\r\n';
  const suffix = '\r\n# after\r\nlocal-only\r\n';
  f.write('.gitignore', `${prefix}${BEGIN}\r\n/docs/old.bin\r\n${END}${suffix}`);
  const name = 'docs/a [x]*?!.bin';
  const entry = asset(name, 'x');
  f.write(name, 'x');
  f.git('add', '--', name);
  const manifest = { ...f.manifest, assets: [entry, f.production] };
  await applyReceipt({ root: f.root, manifest, receipt: proof([entry]) });
  const ignore = fs.readFileSync(path.join(f.root, '.gitignore'), 'utf8');
  assert.ok(ignore.startsWith(prefix));
  assert.ok(ignore.endsWith(suffix));
  assert.ok(!ignore.includes('/docs/old.bin'));
  assert.equal(f.git('check-ignore', '--', name).trim(), name);
  assert.throws(() => f.git('check-ignore', '--', 'docs/a xZ!.bin'), error => error.status === 1);
});

function linkFixture(t, extra) {
  const f = fixture(t);
  const name = 'docs/storyboard/models/pinpin-v3/renders';
  const target = path.join(f.base, 'external-renders');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'frame.png'), 'frame');
  if (extra) fs.writeFileSync(path.join(target, extra), 'extra');
  fs.mkdirSync(path.dirname(path.join(f.root, name)), { recursive: true });
  fs.symlinkSync(target, path.join(f.root, name));
  f.write('assets/policy.json', JSON.stringify({ managedSymlinks: [name] }));
  f.git('add', '--', name);
  const entry = asset(`${name}/frame.png`, 'frame');
  f.manifest.assets.push(entry);
  f.receipt.entries.push({ ...entry, verified: true, remote_verified: true });
  return { ...f, name, target, entry };
}

test('fully archived managed directory symlink is ignored and untracked without deleting target or link', async t => {
  const f = linkFixture(t);
  const result = await applyReceipt(f);
  assert.ok(result.untrack.includes(f.name));
  assert.ok(result.ignored.includes(f.name));
  assert.ok(!result.ignored.includes(f.entry.path));
  assert.equal(f.git('ls-files', '--', f.name), '');
  assert.equal(f.git('check-ignore', '--', f.name).trim(), f.name);
  assert.equal(fs.readlinkSync(path.join(f.root, f.name)), f.target);
  assert.equal(fs.readFileSync(path.join(f.target, 'frame.png'), 'utf8'), 'frame');
});

test('changed staged managed link target is retained even when current archive bytes verify', async t => {
  const f = linkFixture(t);
  fs.unlinkSync(path.join(f.root, f.name));
  fs.symlinkSync(path.join(f.base, 'different-target'), path.join(f.root, f.name));
  f.git('add', '--', f.name);
  fs.unlinkSync(path.join(f.root, f.name));
  fs.symlinkSync(f.target, path.join(f.root, f.name));
  const before = f.snapshot();
  await assert.rejects(applyReceipt(f), /Staged archive symlink differs/);
  assert.deepEqual(f.snapshot(), before);
  assert.equal(fs.readFileSync(path.join(f.target, 'frame.png'), 'utf8'), 'frame');
});

test('unknown files or production children prevent ignoring or untracking a parent symlink', async t => {
  for (const production of [false, true]) {
    const f = linkFixture(t, 'notes.md');
    if (production) f.manifest.assets.push(asset(`${f.name}/notes.md`, 'extra', 'production'));
    const before = f.git('ls-files', '--stage', '--', f.name);
    const result = await applyReceipt(f);
    assert.ok(!result.untrack.includes(f.name));
    assert.ok(!result.ignored.includes(f.name));
    assert.deepEqual(result.pendingSymlinks, [f.name]);
    assert.equal(f.git('ls-files', '--stage', '--', f.name), before);
  }
});

test('unmanaged symlinks and .gitignore symlinks cannot cause writes outside root', async t => {
  const f = fixture(t);
  const target = path.join(f.base, 'outside.bin');
  fs.writeFileSync(target, 'archive');
  fs.unlinkSync(path.join(f.root, f.archive.path));
  fs.symlinkSync(target, path.join(f.root, f.archive.path));
  const before = f.snapshot();
  await assert.rejects(applyReceipt(f), /Unmanaged symlink/);
  assert.deepEqual(f.snapshot(), before);
  fs.unlinkSync(path.join(f.root, f.archive.path));
  f.write(f.archive.path, 'archive');
  fs.unlinkSync(path.join(f.root, '.gitignore'));
  fs.symlinkSync(target, path.join(f.root, '.gitignore'));
  await assert.rejects(applyReceipt(f), /regular file/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'archive');
});

test('no archives pending means no Git writes or blanket git rm', async t => {
  const f = fixture(t);
  const before = f.snapshot();
  const result = await applyReceipt({ root: f.root, manifest: { ...f.manifest, assets: [f.production] },
    receipt: proof([]) });
  assert.deepEqual(result.untrack, []);
  assert.equal(result.applied, false);
  assert.deepEqual(f.snapshot(), before);
});

test('cache must be outside the checkout, including aliases through a symlink', t => {
  const f = fixture(t);
  assert.throws(() => externalCache(f.root, path.join(f.root, 'cache')), /outside/);
  const alias = path.join(f.base, 'alias');
  fs.symlinkSync(f.root, alias);
  assert.throws(() => externalCache(f.root, path.join(alias, 'cache')), /outside/);
  assert.equal(externalCache(f.root, path.join(f.base, 'cache')), path.join(fs.realpathSync(f.base), 'cache'));
});

test('CLI apply-receipt reports a missing receipt without modifying Git', t => {
  const f = fixture(t);
  f.write('assets/manifest.json', JSON.stringify(f.manifest));
  const before = f.snapshot();
  assert.throws(() => execFileSync(process.execPath, [path.join(__dirname, 'sync.cjs'), '--root', f.root,
    '--apply-receipt', path.join(f.base, 'missing.json')], { stdio: 'pipe' }), /valid JSON/);
  assert.deepEqual(f.snapshot(), before);
});

test('CLI dry-run uses current catalog in memory without writing a manifest or contacting HF', t => {
  const f = fixture(t);
  f.write('assets/policy.json', JSON.stringify({ version: 1, bucket: BUCKET, roots: ['docs'],
    extensions: ['.bin', '.webp'], production: [f.production.path], archive: [f.archive.path] }));
  const before = f.snapshot();
  const output = execFileSync(process.execPath, [path.join(__dirname, 'sync.cjs'), '--root', f.root, '--dry-run'],
    { encoding: 'utf8', env: { ...process.env, PINPIN_PYTHON: '/nonexistent/no-upload-allowed' } });
  assert.match(output, /no uploads or Git writes/);
  assert.equal(fs.existsSync(path.join(f.root, 'assets/manifest.json')), false);
  assert.equal(fs.existsSync(path.join(f.root, 'assets/archive.gitignore')), false);
  assert.deepEqual(f.snapshot(), before);
});
