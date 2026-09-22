'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { run, readConfig, sidecars, boundedFetch, metadata } = require('./generate-atlas-video.cjs');

async function fixture(t, extra = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-video-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'outside-repo.mp4');
  const configPath = path.join(dir, 'config.json');
  await fs.writeFile(configPath, JSON.stringify({ model: 'fal-ai/example/video',
    input: { prompt: 'Quiet water', duration: '5' }, output, ...extra }));
  return { dir, output, configPath, files: sidecars(output) };
}

test('approved image endpoints match; sidecars allowlist config and strip secrets', async t => {
  const secret = 'test-key-id:super-secret-value';
  const h = await fixture(t, { credentials: secret,
    priceEstimate: { amount: 0.5, currency: 'USD', basis: 'estimate only', api_key: secret },
    input: { prompt: `water ${secret}`, api_key: secret, authorization: 'other-secret',
      video_url: 'https://user:password@example.test/a.mp4?token=private#secret' } });
  await fs.writeFile(path.join(h.dir, 'approved.png'), 'approved image');
  const config = JSON.parse(await fs.readFile(h.configPath));
  config.sourceImage = path.join(h.dir, 'approved.png');
  await fs.writeFile(h.configPath, JSON.stringify(config));
  let calls = 0;
  const deps = { key: secret, client: { storage: { upload: async file => {
    assert.equal(await file.text(), 'approved image');
    return 'https://example.test/approved.png?token=upload-secret';
  } }, queue: { submit: async (model, { input }) => {
    calls++;
    assert.equal(input.start_image_url, input.end_image_url);
    assert.equal(JSON.parse(await fs.readFile(h.files.json)).status, 'submitting');
    return { request_id: 'request-1', credentials: secret };
  } } } };
  await run('submit', h.configPath, deps);
  const json = await fs.readFile(h.files.json, 'utf8');
  const md = await fs.readFile(h.files.md, 'utf8');
  for (const text of [json, md]) for (const forbidden of [secret, 'super-secret-value', 'api_key',
    'credentials', 'authorization', 'other-secret', 'password', 'token=', 'upload-secret']) assert(!text.includes(forbidden), forbidden);
  const state = JSON.parse(json);
  assert.equal(state.sourceHash, createHash('sha256').update('approved image').digest('hex'));
  assert.deepEqual(state.priceEstimate, { amount: 0.5, currency: 'USD', basis: 'estimate only' });
  assert.equal(state.requestId, 'request-1');
  await assert.rejects(run('submit', h.configPath, deps), /submit refused/);
  assert.equal(calls, 1);
});

test('Seedance uses image_url and matching end frame without Kling start_image_url', async t => {
  const h = await fixture(t, { model: 'bytedance/seedance-2.0/image-to-video', sourceImageField: 'image_url' });
  const image = path.join(h.dir, 'map.png');
  await fs.writeFile(image, 'approved map');
  const config = JSON.parse(await fs.readFile(h.configPath));
  config.sourceImage = image;
  await fs.writeFile(h.configPath, JSON.stringify(config));
  const state = await run('submit', h.configPath, { client: {
    storage: { upload: async () => 'https://example.test/map.png' },
    queue: { submit: async (_model, { input }) => {
      assert.equal(input.image_url, 'https://example.test/map.png');
      assert.equal(input.end_image_url, input.image_url);
      assert.equal(input.start_image_url, undefined);
      return { request_id: 'seedance-test' };
    } }
  } });
  assert.equal(state.config.sourceImageField, 'image_url');
  assert.equal(state.input.image_url, state.input.end_image_url);
});

test('PixVerse preserves first/end image conditioning and explicit one-second controls', async t => {
  for (const matchEndFrame of [true, false]) {
    const h = await fixture(t, { model: 'fal-ai/pixverse/v6/transition',
      sourceImageField: 'first_image_url', matchEndFrame,
      input: { prompt: 'One natural four-legged walking cycle in place.', duration: 1,
        resolution: '720p', aspect_ratio: '16:9', generate_audio_switch: false,
        generate_multi_clip_switch: false, thinking_type: 'disabled' } });
    const image = path.join(h.dir, 'book-only.png');
    await fs.writeFile(image, 'book-only reference');
    const config = JSON.parse(await fs.readFile(h.configPath));
    config.sourceImage = image;
    await fs.writeFile(h.configPath, JSON.stringify(config));
    let calls = 0;
    const state = await run('submit', h.configPath, { client: {
      storage: { upload: async () => 'https://example.test/book-only.png' },
      queue: { submit: async (model, { input }) => {
        calls++;
        assert.equal(model, 'fal-ai/pixverse/v6/transition');
        assert.equal(input.first_image_url, 'https://example.test/book-only.png');
        assert.equal(input.end_image_url, matchEndFrame ? input.first_image_url : undefined);
        for (const field of ['image_url', 'start_image_url', 'last_image_url']) assert.equal(input[field], undefined);
        assert.equal(input.duration, 1);
        return { request_id: 'pixverse-test' };
      } }
    } });
    assert.equal(calls, 1);
    assert.equal(state.config.sourceImageField, 'first_image_url');
    assert.equal(state.input.first_image_url, 'https://example.test/book-only.png');
    assert.equal(state.input.end_image_url, matchEndFrame ? state.input.first_image_url : undefined);
    assert.equal(state.input.generate_audio_switch, false);
    assert.equal(state.input.generate_multi_clip_switch, false);
    assert.equal(state.input.thinking_type, 'disabled');
    assert.equal(state.input.duration, 1);
  }
});

test('motion trials can omit end conditioning and preserve prompt expansion settings', async t => {
  const h = await fixture(t, { sourceImageField: 'image_url', matchEndFrame: false,
    input: { prompt: 'Wind ripples', prompt_expansion_mode: 'disabled',
      camera_fixed: true, audio: false, enable_prompt_expansion: false } });
  const image = path.join(h.dir, 'map.png');
  await fs.writeFile(image, 'approved map');
  const config = JSON.parse(await fs.readFile(h.configPath));
  config.sourceImage = image;
  await fs.writeFile(h.configPath, JSON.stringify(config));
  const state = await run('submit', h.configPath, { client: {
    storage: { upload: async () => 'https://example.test/map.png' },
    queue: { submit: async (_model, { input }) => {
      assert.equal(input.image_url, 'https://example.test/map.png');
      assert.equal(input.end_image_url, undefined);
      assert.equal(input.prompt_expansion_mode, 'disabled');
      return { request_id: 'motion-test' };
    } }
  } });
  assert.equal(state.config.matchEndFrame, false);
  assert.equal(state.input.prompt_expansion_mode, 'disabled');
  assert.equal(state.input.camera_fixed, true);
  assert.equal(state.input.audio, false);
  assert.equal(state.input.enable_prompt_expansion, false);
});

test('ambiguous paid submission cannot be retried, including concurrent invocations', async t => {
  const h = await fixture(t);
  let calls = 0;
  const deps = { client: { queue: { submit: async () => { calls++; throw Error('secret-server-body'); } } } };
  const results = await Promise.allSettled([run('submit', h.configPath, deps), run('submit', h.configPath, deps)]);
  assert(results.every(result => result.status === 'rejected'));
  assert.equal(calls, 1);
  const state = JSON.parse(await fs.readFile(h.files.json));
  assert.equal(state.status, 'submitting');
  assert.equal(state.events.at(-1).type, 'submission_outcome_unknown');
  await assert.rejects(run('submit', h.configPath, deps));
  await assert.rejects(run('collect', h.configPath, deps), /no saved request ID/);
  assert.equal(calls, 1);
  assert(!(await fs.readFile(h.files.md, 'utf8')).includes('secret-server-body'));
});

test('installed SDK makes exactly one transport POST on 503, timeout, and redirect', async () => {
  const requireClient = createRequire(path.join(process.env.FAL_CLIENT_ROOT || path.join(os.homedir(), 'Desktop/image-generation'), 'package.json'));
  const { createFalClient } = requireClient('@fal-ai/client');
  for (const status of [503, 307, 'timeout']) {
    let calls = 0;
    const client = createFalClient({ credentials: 'fake-test-key', fetch: boundedFetch(async (_url, options) => {
      calls++;
      assert.equal(options.redirect, 'error');
      if (status === 'timeout') throw Error('private-network-message');
      return new Response('{}', { status });
    }) });
    await assert.rejects(client.queue.submit('fal-ai/example/video', { input: {} }));
    assert.equal(calls, 1);
  }
});

test('upscale preserves local provenance; collect records codec, frames, audio and chronological sidecars', async t => {
  const upscaleFields = { H264_output: true, recover_detail: 0.4, noise: 0, halo: 0.1, compression: 0.2, grain: 0 };
  const h = await fixture(t, { input: { video_url: 'https://example.test/upscale.mp4', ...upscaleFields } });
  const sourceVideo = path.join(h.dir, 'source.mp4');
  await fs.writeFile(sourceVideo, 'source video');
  const config = JSON.parse(await fs.readFile(h.configPath));
  config.sourceVideo = sourceVideo;
  await fs.writeFile(h.configPath, JSON.stringify(config));
  let checks = 0, uploads = 0, results = 0;
  const deps = { client: { storage: { upload: async () => { uploads++; } }, queue: {
    submit: async (_model, { input }) => { assert(input.video_url); return { request_id: 'saved-id' }; },
    status: async (_model, options) => {
      assert.equal(options.requestId, 'saved-id');
      return { status: ++checks === 1 ? 'IN_PROGRESS' : 'COMPLETED' };
    },
    result: async () => { results++; return { data: { video: { url: 'https://example.test/video.mp4?token=private' } } }; }
  } }, download: async (_url, filename) => fs.writeFile(filename, 'video bytes'),
  probe: () => JSON.stringify({ streams: [{ codec_type: 'video', codec_name: 'h264', width: 1920,
    height: 1080, avg_frame_rate: '24000/1001', nb_frames: '126' }, { codec_type: 'audio' }], format: { duration: '5.25' } }) };
  const submitted = await run('submit', h.configPath, deps);
  assert.equal(submitted.sourceVideoHash, createHash('sha256').update('source video').digest('hex'));
  assert.equal(submitted.config.sourceVideo, sourceVideo);
  for (const [key, value] of Object.entries(upscaleFields)) assert.equal(submitted.input[key], value);
  assert.equal((await run('collect', h.configPath, deps)).status, 'pending');
  assert.equal(checks, 1); assert.equal(results, 0);
  const state = await run('collect', h.configPath, deps);
  assert.equal(state.status, 'complete');
  assert.equal(state.metadata.width, 1920); assert.equal(state.metadata.height, 1080);
  assert.equal(state.metadata.duration, 5.25); assert.equal(state.metadata.bytes, 11);
  assert.equal(state.metadata.codec_name, 'h264'); assert.equal(state.metadata.avg_frame_rate, '24000/1001');
  assert.equal(state.metadata.frameCount, 126); assert.equal(state.metadata.hasAudio, true);
  assert.equal(state.metadata.sha256, createHash('sha256').update('video bytes').digest('hex'));
  assert.equal(await fs.readFile(h.output, 'utf8'), 'video bytes');
  assert.equal(uploads, 0); assert.equal(checks, 2); assert.equal(results, 1);
  assert.deepEqual(state.events.map(item => item.type), ['submitting', 'submitted', 'in_progress', 'completed', 'complete']);
  assert.deepEqual(state.events.map(item => item.at), state.events.map(item => item.at).sort());
  assert(!(await fs.readFile(h.files.json, 'utf8')).includes('token='));
  await run('collect', h.configPath, deps);
  assert.equal(checks, 2);
});

test('failed collection cleans partial output and permits collection retry only', async t => {
  const h = await fixture(t);
  const deps = { client: { queue: {
    submit: async () => ({ request_id: 'saved-id' }), status: async () => ({ status: 'COMPLETED' }),
    result: async () => ({ data: { video: { url: 'https://example.test/video.mp4' } } })
  } }, download: async (_url, filename) => { await fs.writeFile(filename, 'partial'); throw Error('secret'); } };
  await run('submit', h.configPath, deps);
  await assert.rejects(run('collect', h.configPath, deps), /Retry collect/);
  assert.equal(JSON.parse(await fs.readFile(h.files.json)).status, 'collect_failed');
  assert(!(await fs.readdir(h.dir)).some(name => name.includes('.part.') || name.endsWith('.lock')));
  await assert.rejects(run('submit', h.configPath, deps));
});

test('metadata rejects a nonvideo or unusable duration', async t => {
  const h = await fixture(t);
  await fs.writeFile(h.output, 'not video');
  await assert.rejects(metadata(h.output, () => '{"streams":[],"format":{}}'), /invalid video metadata/);
  const result = await metadata(h.output, () => JSON.stringify({
    streams: [{ codec_type: 'video', width: 10, height: 10, nb_frames: 'N/A' }], format: { duration: '1' }
  }));
  assert.equal(result.frameCount, null); assert.equal(result.hasAudio, false);
});

test('config paths resolve from invocation cwd, including output outside the repo', async t => {
  const h = await fixture(t);
  const config = JSON.parse(await fs.readFile(h.configPath));
  config.output = path.relative(process.cwd(), h.output);
  config.sourceImage = 'docs/storyboard/images/atlas/shire-v1.png';
  config.sourceVideo = 'docs/storyboard/videos/original.mp4';
  await fs.writeFile(h.configPath, JSON.stringify(config));
  const resolved = readConfig(h.configPath);
  assert.equal(resolved.output, h.output);
  assert.equal(resolved.sourceImage, path.resolve(config.sourceImage));
  assert.equal(resolved.sourceVideo, path.resolve(config.sourceVideo));
});
