#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { createHash, randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { execFileSync } = require('node:child_process');

const DEFAULT_ROOT = path.join(os.homedir(), 'Desktop/image-generation');
const INPUT_FIELDS = new Set(('prompt negative_prompt duration aspect_ratio resolution seed fps num_frames '
  + 'guidance_scale num_inference_steps cfg_scale camera_fixed enable_safety_checker generate_audio '
  + 'audio_url image_url start_image_url end_image_url video_url scale upscale_factor target_fps '
  + 'output_format output_quality creativity mode model version strength motion_bucket_id '
  + 'noise_aug_strength loop H264_output recover_detail noise halo compression grain '
  + 'upscale_mode target_resolution noise_scale output_write_mode sync_mode prompt_expansion_mode '
  + 'audio enable_prompt_expansion enable_thinking').split(' '));
const SCHEMA_FIELDS = new Set(['title', 'description', 'type', 'properties', 'required', 'items',
  'enum', 'default', 'minimum', 'maximum', 'additionalProperties', '$schema', ...INPUT_FIELDS]);
class WorkflowError extends Error {}
const fail = message => { throw new WorkflowError(message); };

function redact(value, key = '') {
  let text = String(value);
  for (const secret of [key, ...key.split(':')].filter(s => s.length >= 4)) {
    text = text.split(secret).join('[REDACTED]');
    text = text.split(encodeURIComponent(secret)).join('[REDACTED]');
  }
  text = text.replace(/\b(?:Bearer|Key)\s+[^\s"<>]+/gi, '[REDACTED]');
  return text.replace(/https?:\/\/[^\s"<>]+/gi, raw => {
    try {
      const url = new URL(raw);
      url.username = ''; url.password = ''; url.search = ''; url.hash = '';
      return url.toString();
    } catch { return '[REDACTED URL]'; }
  });
}

function project(value, fields, key) {
  if (typeof value === 'string') return redact(value, key);
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(item => project(item, fields, key));
  if (!value || typeof value !== 'object') return undefined;
  return Object.fromEntries(Object.entries(value).filter(([name]) => fields.has(name))
    .map(([name, item]) => [name, project(item, fields, key)]));
}

// The SDK overrides retry.maxRetries for queue.submit. Guard the actual transport.
function boundedFetch(fetchImpl = globalThis.fetch) {
  let submitted = false;
  return async (url, options = {}) => {
    const target = new URL(url);
    const isSubmit = target.hostname === 'queue.fal.run' && (options.method || 'GET').toUpperCase() === 'POST';
    if (isSubmit && submitted) fail('Submission transport already used; no retry permitted.');
    if (isSubmit) submitted = true;
    try {
      const response = await fetchImpl(url, { ...options, redirect: 'error',
        signal: options.signal || AbortSignal.timeout(120000) });
      if (!response.ok) {
        await response.body?.cancel();
        fail(`fal request failed (HTTP ${Number(response.status)}); no automatic retry.`);
      }
      return response;
    } catch (error) {
      if (error instanceof WorkflowError) throw error;
      fail('fal transport failed; remote outcome may be unknown.');
    }
  };
}

function loadClient(env = process.env, fetchImpl) {
  const root = path.resolve(env.FAL_CLIENT_ROOT || DEFAULT_ROOT);
  const requireClient = createRequire(path.join(root, 'package.json'));
  let key = env.FAL_KEY;
  if (!key) {
    const dotenv = requireClient('dotenv');
    key = dotenv.parse(fs.readFileSync(env.FAL_ENV_FILE || path.join(root, '.env'))).FAL_KEY;
  }
  if (!key || typeof key !== 'string') fail('FAL_KEY is missing.');
  const { createFalClient } = requireClient('@fal-ai/client');
  return { key, client: createFalClient({ credentials: key, retry: { maxRetries: 0 },
    fetch: boundedFetch(fetchImpl) }) };
}

function readConfig(filename) {
  const configPath = path.resolve(filename);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config || typeof config !== 'object' || Array.isArray(config)
      || typeof config.model !== 'string' || !/^[\w-]+\/[\w./-]+$/.test(config.model)
      || config.model.includes('..') || !config.input || typeof config.input !== 'object'
      || Array.isArray(config.input) || typeof config.output !== 'string'
      || !config.output.toLowerCase().endsWith('.mp4')) {
    fail('Config requires a fal model ID, input object, and local .mp4 output path.');
  }
  const resolve = name => path.resolve(name);
  if (/^[a-z]+:\/\//i.test(config.output)) fail('Output must be a local .mp4 path.');
  if (config.sourceImage !== undefined && typeof config.sourceImage !== 'string') fail('sourceImage must be a local path.');
  if (config.sourceImageField !== undefined && !['image_url', 'start_image_url'].includes(config.sourceImageField)) {
    fail('sourceImageField must be image_url or start_image_url.');
  }
  if (config.sourceVideo !== undefined && typeof config.sourceVideo !== 'string') fail('sourceVideo must be a local path.');
  if (config.matchEndFrame !== undefined && typeof config.matchEndFrame !== 'boolean') fail('matchEndFrame must be boolean.');
  return { ...config, configPath, output: resolve(config.output),
    sourceImage: config.sourceImage ? resolve(config.sourceImage) : undefined,
    sourceVideo: config.sourceVideo ? resolve(config.sourceVideo) : undefined };
}

function sidecars(output) {
  const stem = output.slice(0, -4);
  return { json: `${stem}.json`, md: `${stem}.md`, lock: `${stem}.collect.lock` };
}

async function writeFile(filename, text, exclusive = false) {
  const temporary = exclusive ? filename : `${filename}.${randomUUID()}.tmp`;
  const handle = await fsp.open(temporary, 'wx', 0o600);
  try { await handle.writeFile(text); await handle.sync(); } finally { await handle.close(); }
  if (!exclusive) await fsp.rename(temporary, filename);
}

async function save(state, output, key, exclusive = false) {
  const files = sidecars(output);
  const json = JSON.stringify(state, (_name, value) => typeof value === 'string' ? redact(value, key) : value, 2);
  await writeFile(files.json, `${json}\n`, exclusive);
  await writeFile(files.md, `# Atlas video workflow\n\nUpdated: ${state.updatedAt}\n\n\`\`\`json\n${json}\n\`\`\`\n`);
}

function event(state, type) {
  const at = new Date().toISOString();
  state.updatedAt = at;
  state.events.push({ at, type });
}

async function fileHash(filename) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

async function metadata(filename, probe = file => execFileSync(process.env.FFPROBE || 'ffprobe',
  ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file],
  { encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })) {
  const result = JSON.parse(await probe(filename));
  const stream = result.streams?.find(item => item.codec_type === 'video');
  const width = Number(stream?.width), height = Number(stream?.height);
  const duration = Number(result.format?.duration ?? stream?.duration);
  if (!(width > 0 && height > 0 && duration > 0)) fail('ffprobe returned invalid video metadata.');
  const frames = Number(stream.nb_frames ?? stream.nb_read_frames);
  return { width, height, duration, codec_name: stream.codec_name ?? null,
    avg_frame_rate: stream.avg_frame_rate ?? null,
    frameCount: Number.isInteger(frames) && frames > 0 ? frames : null,
    hasAudio: result.streams.some(item => item.codec_type === 'audio'),
    bytes: (await fsp.stat(filename)).size, sha256: await fileHash(filename) };
}

async function download(url, filename, fetchImpl = globalThis.fetch) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password) fail('Result must be an HTTPS video URL.');
  const response = await fetchImpl(target, { signal: AbortSignal.timeout(600000) });
  if (!response.ok || !response.body) fail('Video download failed.');
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filename, { flags: 'wx', mode: 0o600 }));
}

async function submit(config, deps) {
  const files = sidecars(config.output);
  await fsp.mkdir(path.dirname(config.output), { recursive: true });
  if ([files.json, files.md, config.output].some(file => fs.existsSync(file))) {
    fail('Output or sidecar already exists; submit refused. Use collect for saved requests.');
  }
  const { client, key = '' } = deps;
  const input = { ...config.input };
  const source = config.sourceImage ? await fsp.readFile(config.sourceImage) : null;
  const safeConfig = { model: config.model, input: project(input, INPUT_FIELDS, key), output: config.output };
  if (config.sourceImage) safeConfig.sourceImage = config.sourceImage;
  if (config.sourceImageField) safeConfig.sourceImageField = config.sourceImageField;
  if (config.matchEndFrame !== undefined) safeConfig.matchEndFrame = config.matchEndFrame;
  if (config.sourceVideo) safeConfig.sourceVideo = config.sourceVideo;
  if (config.schema !== undefined) safeConfig.schema = project(config.schema, SCHEMA_FIELDS, key);
  if (config.priceEstimate !== undefined) safeConfig.priceEstimate = project(config.priceEstimate,
    new Set(['amount', 'currency', 'unit', 'quantity', 'total', 'usd', 'rate', 'notes', 'basis', 'source']), key);
  const state = { schemaVersion: 1, status: 'submitting', model: config.model, input: safeConfig.input,
    config: safeConfig, configPath: config.configPath, sourceHash: source ? createHash('sha256').update(source).digest('hex') : null,
    createdAt: new Date().toISOString(), events: [] };
  if (config.sourceVideo) state.sourceVideoHash = await fileHash(config.sourceVideo);
  if (safeConfig.priceEstimate !== undefined) state.priceEstimate = safeConfig.priceEstimate;
  event(state, 'submitting');
  // Exclusive creation is the cross-process paid-request guard; never remove it on failure.
  await save(state, config.output, key, true);
  try {
    if (source) {
      const ext = path.extname(config.sourceImage).toLowerCase();
      const type = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' })[ext];
      if (!type) fail('sourceImage must be PNG, JPEG, or WebP.');
      const url = await client.storage.upload(new File([source], `approved-map${ext}`, { type }));
      input[config.sourceImageField || 'start_image_url'] = url;
      if (config.matchEndFrame !== false) input.end_image_url = url;
      state.input = project(input, INPUT_FIELDS, key);
      event(state, 'source_uploaded');
      await save(state, config.output, key);
    }
    const result = await client.queue.submit(config.model, { input });
    if (typeof result.request_id !== 'string' || !/^[\w-]+$/.test(result.request_id)) fail('Submission response has no valid request ID.');
    state.requestId = result.request_id;
    state.status = 'submitted';
    event(state, 'submitted');
    await save(state, config.output, key);
    return state;
  } catch {
    event(state, state.requestId ? 'submission_save_failed' : 'submission_outcome_unknown');
    await save(state, config.output, key).catch(() => {});
    fail('Submission did not finish cleanly. State retained; do not resubmit. Inspect sidecar/request in fal dashboard.');
  }
}

async function collect(config, deps) {
  const files = sidecars(config.output);
  const lock = await fsp.open(files.lock, 'wx', 0o600);
  let temporary;
  try {
    const state = JSON.parse(await fsp.readFile(files.json, 'utf8'));
    if (!state.requestId) fail('Ambiguous submission: no saved request ID. Do not resubmit; reconcile in fal dashboard.');
    if (state.config.output !== config.output || state.model !== config.model) fail('Config does not match saved output/model.');
    if (state.status === 'complete' && fs.existsSync(config.output)) return state;
    const status = await deps.client.queue.status(state.model, { requestId: state.requestId, logs: false });
    if (!['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED'].includes(status.status)) fail('Unexpected fal status; inspect request in dashboard.');
    state.status = status.status === 'COMPLETED' ? 'downloading' : 'pending';
    state.queueStatus = status.status;
    event(state, status.status.toLowerCase());
    await save(state, config.output, deps.key);
    if (status.status !== 'COMPLETED') return state;
    try {
      const result = await deps.client.queue.result(state.model, { requestId: state.requestId });
      const url = result.data?.video?.url || result.data?.video_url;
      if (typeof url !== 'string') fail('Completed result has no video URL.');
      temporary = `${config.output}.${randomUUID()}.part.mp4`;
      await (deps.download || download)(url, temporary);
      state.metadata = await metadata(temporary, deps.probe);
      state.videoUrl = redact(url, deps.key);
      await fsp.rename(temporary, config.output);
      temporary = undefined;
      state.status = 'complete';
      event(state, 'complete');
      await save(state, config.output, deps.key);
      return state;
    } catch {
      state.status = 'collect_failed';
      event(state, 'collect_failed');
      await save(state, config.output, deps.key);
      fail('Collection failed; saved request is retained. Retry collect, never submit.');
    }
  } finally {
    if (temporary) await fsp.unlink(temporary).catch(() => {});
    await lock.close();
    await fsp.unlink(files.lock);
  }
}

async function run(command, filename, deps) {
  if (!['submit', 'collect'].includes(command) || !filename) fail('Usage: node scripts/generate-atlas-video.cjs submit|collect CONFIG.json');
  const config = readConfig(filename);
  return (command === 'submit' ? submit : collect)(config, deps || loadClient());
}

if (require.main === module) {
  run(process.argv[2], process.argv[3]).then(state => {
    console.log(JSON.stringify({ status: state.status, requestId: state.requestId, metadata: state.metadata }));
  }).catch(error => {
    console.error(error instanceof WorkflowError ? error.message : 'Workflow failed locally. Check config, dependency root, credentials file, ffprobe, or existing state/lock; raw errors suppressed.');
    process.exitCode = 1;
  });
}

module.exports = { run, readConfig, sidecars, redact, project, boundedFetch, loadClient, metadata };
