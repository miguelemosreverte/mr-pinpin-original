#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');

const BUCKET = 'miguelemosreverte/mr-pinpin-archive';
const BEGIN = '# BEGIN PINPIN VERIFIED ARCHIVE (assets:sync)';
const END = '# END PINPIN VERIFIED ARCHIVE (assets:sync)';

function assetPath(value) {
  if (typeof value !== 'string' || !value.startsWith('docs/') ||
      /[\\:\x00-\x1f\x7f]/.test(value) ||
      value.split('/').some(p => !p || p === '.' || p === '..')) {
    throw new Error('Asset path must be a normalized relative docs/ path');
  }
  const secret = /^(?:\.env(?:\..*)?|\.git|\.ssh|\.aws|\.huggingface|credentials?(?:\..*)?|secrets?(?:\..*)?|tokens?(?:\..*)?|id_(?:rsa|dsa|ecdsa|ed25519)(?:\..*)?)$/i;
  if (value.split('/').some(p => secret.test(p)) || /\.(?:pem|key|p12|pfx)$/i.test(value)) {
    throw new Error('Secret or repository-control paths cannot be assets');
  }
  return value;
}

function validateManifest(manifest) {
  if (!manifest || manifest.version !== 1 || manifest.bucket !== BUCKET || !Array.isArray(manifest.assets)) {
    throw new Error('Expected version 1 manifest for the Pinpin archive bucket');
  }
  const seen = new Set();
  for (const entry of manifest.assets) {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid asset entry');
    assetPath(entry.path);
    if (seen.has(entry.path)) throw new Error('Duplicate manifest path');
    seen.add(entry.path);
    if (!['archive', 'production'].includes(entry.role) ||
        !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 ||
        typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error('Invalid asset role, bytes, or SHA-256');
    }
    const object = `sha256/${entry.sha256.slice(0, 2)}/${entry.sha256}/${path.posix.basename(entry.path)}`;
    if (entry.object !== object) throw new Error('Asset object does not match its immutable content key');
  }
  for (const name of seen) {
    const parts = name.split('/');
    while (parts.length > 1) {
      parts.pop();
      if (seen.has(parts.join('/'))) throw new Error('Manifest paths overlap a file and its children');
    }
  }
  return manifest.assets.filter(e => e.role === 'archive');
}

function validateReceipt(manifest, receipt) {
  const archives = validateManifest(manifest);
  if (!receipt || receipt.version !== 1 || receipt.bucket !== manifest.bucket || !Array.isArray(receipt.entries) ||
      receipt.dry_run !== false || receipt.verified !== true ||
      !['push', 'verify'].includes(receipt.action)) {
    throw new Error('A complete verified push/verify receipt is required');
  }
  const expected = new Map(archives.map(e => [e.path, e]));
  const seen = new Set();
  for (const entry of receipt.entries) {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid receipt entry');
    assetPath(entry.path);
    const asset = expected.get(entry.path);
    if (!asset || seen.has(entry.path) || entry.verified !== true || entry.remote_verified !== true ||
        entry.role !== asset.role || entry.object !== asset.object ||
        entry.bytes !== asset.bytes || entry.sha256 !== asset.sha256) {
      throw new Error('Receipt contains an unverified, duplicate, unexpected, or mismatched asset');
    }
    seen.add(entry.path);
  }
  if (seen.size !== archives.length) throw new Error('Receipt is missing archive entries');
  return archives;
}

function readJSON(filename) {
  try { return JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch { throw new Error(`Cannot read valid JSON: ${path.basename(filename)}`); }
}

function maybeStat(filename) {
  try { return fs.lstatSync(filename); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function managedLinks(root) {
  const filename = path.join(root, 'assets/policy.json');
  if (!maybeStat(filename)) return new Set();
  const links = readJSON(filename).managedSymlinks || [];
  if (!Array.isArray(links)) throw new Error('Invalid managedSymlinks policy');
  return new Set(links.map(assetPath));
}

// Only explicit policy links may lead outside the checkout. Descendant links
// are still refused, so an arbitrary symlink cannot extend that exception.
function locate(root, name, managed) {
  const parts = assetPath(name).split('/');
  let current = root;
  const links = [];
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const stat = maybeStat(current);
    if (!stat) return { filename: current, missing: true, links };
    if (stat.isSymbolicLink()) {
      const logical = parts.slice(0, i + 1).join('/');
      if (!managed.has(logical) || links.length) throw new Error(`Unmanaged symlink in asset: ${name}`);
      links.push(logical);
      try { current = fs.realpathSync(current); }
      catch (error) { if (error.code === 'ENOENT') return { missing: true, links }; throw error; }
    }
    if (i < parts.length - 1 && !fs.statSync(current).isDirectory()) {
      throw new Error(`Non-directory asset ancestor: ${name}`);
    }
  }
  return { filename: current, missing: false, links };
}

async function hashFile(filename) {
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile()) throw new Error('Archive source must be a regular file');
    const hash = crypto.createHash('sha256');
    let bytes = 0;
    for await (const block of fs.createReadStream(filename, { fd, autoClose: false })) {
      hash.update(block);
      bytes += block.length;
    }
    const after = fs.fstatSync(fd);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      throw new Error('Archive source changed while hashing');
    }
    return { bytes, sha256: hash.digest('hex') };
  } finally { fs.closeSync(fd); }
}

async function checkSources(root, archives, managed, allowMissing) {
  for (const entry of archives) {
    const source = locate(root, entry.path, managed);
    if (source.missing) {
      if (!allowMissing) throw new Error(`Archive source missing: ${entry.path}`);
      continue;
    }
    const identity = await hashFile(source.filename);
    if (identity.bytes !== entry.bytes || identity.sha256 !== entry.sha256) {
      throw new Error(`Archive source changed since manifest/receipt: ${entry.path}`);
    }
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
  // Child stderr can contain HTTP headers or credentials. Keep failure output bounded
  // to the operation, and never echo the process environment or raw remote errors.
  if (result.error || result.status !== 0) throw new Error(`${path.basename(command)} ${args[0] || ''} failed`);
  return result.stdout;
}

function git(root, args, options = {}) {
  return run('git', ['--literal-pathspecs', '-C', root, ...args], options);
}

async function checkIndex(root, indexed, archives) {
  const expected = new Map(archives.map(entry => [entry.path, entry]));
  for (const item of indexed) {
    if (item.mode === '120000') {
      const target = fs.readlinkSync(path.join(root, item.name), { encoding: 'buffer' });
      if (git(root, ['hash-object', '--stdin'], { input: target }).trim() !== item.oid) {
        throw new Error(`Staged archive symlink differs from verified source: ${item.name}`);
      }
      continue;
    }
    const entry = expected.get(item.name);
    const child = spawn('git', ['-C', root, 'cat-file', 'blob', item.oid], { stdio: ['ignore', 'pipe', 'ignore'] });
    const completion = new Promise(resolve => {
      child.once('error', () => resolve(false));
      child.once('close', code => resolve(code === 0));
    });
    const hash = crypto.createHash('sha256');
    let bytes = 0;
    for await (const block of child.stdout) { hash.update(block); bytes += block.length; }
    if (!await completion || bytes !== entry.bytes || hash.digest('hex') !== entry.sha256) {
      throw new Error(`Staged archive differs from verified receipt: ${item.name}`);
    }
  }
}

function directoryIsArchive(root, name, managed, entries) {
  const descendants = [...entries.values()].filter(e => e.path.startsWith(`${name}/`));
  if (!descendants.length || descendants.some(e => e.role !== 'archive')) return false;
  const source = locate(root, name, managed);
  if (source.missing || !fs.statSync(source.filename).isDirectory()) return false;
  function walk(directory, logical) {
    for (const dirent of fs.readdirSync(directory, { withFileTypes: true })) {
      const child = `${logical}/${dirent.name}`;
      if (dirent.isSymbolicLink()) return false;
      if (dirent.isDirectory()) {
        if (!walk(path.join(directory, dirent.name), child)) return false;
      } else if (!dirent.isFile() || entries.get(child)?.role !== 'archive') return false;
    }
    return true;
  }
  return walk(source.filename, name);
}

function escapeIgnore(name) {
  return '/' + name.replace(/[ *?\[\]!#]/g, '\\$&');
}

function ignoreText(previous, ignored) {
  const begin = [...previous.matchAll(new RegExp(`^${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?$`, 'gm'))];
  const end = [...previous.matchAll(new RegExp(`^${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?$`, 'gm'))];
  if (begin.length !== end.length || begin.length > 1 || (begin.length && begin[0].index >= end[0].index)) {
    throw new Error('Malformed or duplicate managed .gitignore block');
  }
  const newline = previous.includes('\r\n') ? '\r\n' : '\n';
  const block = [BEGIN, ...ignored.map(escapeIgnore), END].join(newline);
  if (begin.length) {
    return previous.slice(0, begin[0].index) + block + previous.slice(end[0].index + END.length);
  }
  return previous + (previous && !previous.endsWith('\n') ? newline : '') + block + newline;
}

function makePlan(root, manifest, managed) {
  const entries = new Map(manifest.assets.map(e => [e.path, e]));
  const ignored = new Set(manifest.assets.filter(e => e.role === 'archive').map(e => e.path));
  const pendingSymlinks = [];
  for (const name of managed) {
    if (!maybeStat(path.join(root, name))?.isSymbolicLink()) continue;
    if (![...ignored].some(p => p.startsWith(`${name}/`))) continue;
    if (directoryIsArchive(root, name, managed, entries)) {
      for (const child of ignored) if (child.startsWith(`${name}/`)) ignored.delete(child);
      ignored.add(name);
    } else pendingSymlinks.push(name);
  }
  const indexed = git(root, ['ls-files', '--stage', '-z']).split('\0').filter(Boolean).map(record => {
    const tab = record.indexOf('\t');
    const [mode, oid, stage] = record.slice(0, tab).split(' ');
    return { mode, oid, stage, name: record.slice(tab + 1) };
  });
  const untrack = [];
  for (const item of indexed) {
    if (!ignored.has(item.name) && entries.get(item.name)?.role !== 'archive') continue;
    if (item.stage !== '0') throw new Error('Resolve archive index conflicts before syncing');
    if (!entries.has(item.name) && item.mode !== '120000') {
      throw new Error('Only a verified archive or managed directory symlink may be untracked');
    }
    untrack.push(item.name);
  }
  const ignorePath = path.join(root, '.gitignore');
  const stat = maybeStat(ignorePath);
  if (stat && !stat.isFile()) throw new Error('.gitignore must be a regular file');
  const previous = stat ? fs.readFileSync(ignorePath, 'utf8') : '';
  return { ignored: [...ignored].sort(), untrack, indexed: indexed.filter(item => untrack.includes(item.name)),
    pendingSymlinks, previous,
    next: ignoreText(previous, [...ignored].sort()) };
}

async function applyReceipt({ root, manifest, receipt, dryRun = false }) {
  root = fs.realpathSync(root);
  const archives = validateReceipt(manifest, receipt);
  if (!archives.length) return { ignored: [], untrack: [], pendingSymlinks: [], applied: false };
  if (fs.realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim()) !== root) {
    throw new Error('Root must be the Git checkout root');
  }
  const managed = managedLinks(root);
  const plan = makePlan(root, manifest, managed);
  await checkSources(root, archives, managed, true);
  await checkIndex(root, plan.indexed, archives);
  if (dryRun) return { ...plan, applied: false };
  // Hashing can take time; rebuild directory coverage immediately before mutation.
  const current = makePlan(root, manifest, managed);
  if (JSON.stringify(current) !== JSON.stringify(plan)) throw new Error('Checkout changed during archive verification; retry');
  if (plan.untrack.length) {
    git(root, ['rm', '--cached', '-f', '--ignore-unmatch', '--pathspec-from-file=-', '--pathspec-file-nul'],
      { input: plan.untrack.join('\0') + '\0' });
  }
  if (plan.next !== plan.previous) fs.writeFileSync(path.join(root, '.gitignore'), plan.next);
  return { ...plan, applied: true };
}

function options(argv) {
  const result = { root: path.resolve(__dirname, '../..'), dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') result.dryRun = true;
    else if (arg === '--help' || arg === '-h') result.help = true;
    else if (['--root', '--cache', '--apply-receipt'].includes(arg)) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`);
      result[{ '--root': 'root', '--cache': 'cache', '--apply-receipt': 'receipt' }[arg]] = path.resolve(argv[++i]);
    } else throw new Error(`Unknown option: ${arg}`);
  }
  return result;
}

function externalCache(root, requested) {
  root = fs.realpathSync(root);
  const cache = path.resolve(requested || process.env.PINPIN_ASSET_CACHE ||
    path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'mr-pinpin', 'assets'));
  let ancestor = cache;
  const missing = [];
  while (!maybeStat(ancestor)) { missing.unshift(path.basename(ancestor)); ancestor = path.dirname(ancestor); }
  const resolved = path.join(fs.realpathSync(ancestor), ...missing);
  const relative = path.relative(root, resolved);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Asset cache must be outside the repository');
  }
  return resolved;
}

async function main(argv = process.argv.slice(2)) {
  const config = options(argv);
  if (config.help) {
    console.log('Usage: npm run assets:sync -- [--dry-run] [--apply-receipt FILE] [--root ROOT] [--cache CACHE]');
    return;
  }
  const root = fs.realpathSync(config.root);
  const manifestPath = path.join(root, 'assets/manifest.json');
  let receiptPath = config.receipt;
  let manifest;
  if (!receiptPath) {
    console.log('assets:sync: cataloging asset roles and content hashes');
    if (config.dryRun) {
      const { buildCatalog } = require('./catalog.cjs');
      const previous = maybeStat(manifestPath) ? readJSON(manifestPath) : undefined;
      manifest = (await buildCatalog(root, readJSON(path.join(root, 'assets/policy.json')), previous)).manifest;
    } else {
      run(process.execPath, [path.join(__dirname, 'catalog.cjs'), '--root', root], { cwd: root });
    }
  }
  manifest ||= readJSON(manifestPath);
  const archives = validateManifest(manifest);
  if (!archives.length) {
    if (receiptPath) validateReceipt(manifest, readJSON(receiptPath));
    console.log('assets:sync: no archive entries; no Git changes');
    return;
  }
  if (!receiptPath && config.dryRun) {
    await checkSources(root, archives, managedLinks(root), false);
    const plan = makePlan(root, manifest, managedLinks(root));
    await checkIndex(root, plan.indexed, archives);
    console.log(`assets:sync: dry run; ${archives.length} archive entries, ${plan.untrack.length} tracked paths; no uploads or Git writes`);
    return;
  }
  if (!receiptPath) {
    const cache = externalCache(root, config.cache);
    fs.mkdirSync(cache, { recursive: true });
    receiptPath = path.join(cache, `sync-receipt-${crypto.randomUUID()}.json`);
    await checkSources(root, archives, managedLinks(root), false);
    await checkIndex(root, makePlan(root, manifest, managedLinks(root)).indexed, archives);
    console.log(`assets:sync: uploading and remotely verifying ${archives.length} archive entries`);
    run(process.env.PINPIN_PYTHON || 'python3', [path.join(__dirname, 'hf_store.py'), 'push',
      '--manifest', manifestPath, '--root', root, '--cache', cache, '--profile', 'archive', '--receipt', receiptPath,
      ...(managedLinks(root).size ? ['--allow-source-symlinks'] : [])], { cwd: root });
  }
  const result = await applyReceipt({ root, manifest, receipt: readJSON(receiptPath), dryRun: config.dryRun });
  console.log(`assets:sync: ${config.dryRun ? 'would untrack' : 'untracked'} ${result.untrack.length} paths; working files retained`);
  if (result.pendingSymlinks.length) console.log(`assets:sync: retained ${result.pendingSymlinks.length} directory symlinks with incomplete archive coverage`);
  console.log(`assets:sync: receipt ${receiptPath}`);
}

module.exports = { BUCKET, BEGIN, END, assetPath, validateManifest, validateReceipt, ignoreText,
  applyReceipt, externalCache, main };

if (require.main === module) main().catch(error => {
  console.error(`assets:sync: ${error.message}`);
  process.exitCode = 1;
});
