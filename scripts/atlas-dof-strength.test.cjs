const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../docs/storyboard/gpu/dof.js'), 'utf8');

function fixture(width = 1536, height = 1024) {
  const textures = [], buffers = [], writes = [], pending = [];
  let wakes = 0, peakBytes = 0;
  const resource = extra => ({ ...extra, destroyed: false, destroyCount: 0,
    destroy() { this.destroyed = true; this.destroyCount++; },
    createView() { assert.equal(this.destroyed, false); return { texture: this }; }
  });
  const device = {
    createBuffer() { const buffer = resource({}); buffers.push(buffer); return buffer; },
    createTexture({ size }) {
      const texture = resource({ width: size[0], height: size[1], bytes: size[0] * size[1] * 4 });
      textures.push(texture);
      peakBytes = Math.max(peakBytes, textures.filter(t => !t.destroyed).reduce((n, t) => n + t.bytes, 0));
      return texture;
    },
    createBindGroup({ entries }) {
      for (const entry of entries) assert.equal((entry.resource.buffer || entry.resource.texture).destroyed, false);
      return {};
    },
    queue: {
      writeBuffer(buffer, offset, data) { assert.equal(buffer.destroyed, false); writes.push(Array.from(data)); },
      onSubmittedWorkDone() { return new Promise((resolve, reject) => pending.push({ resolve, reject })); }
    }
  };
  const context = vm.createContext({ GPUBufferUsage: { UNIFORM: 1, COPY_DST: 2 },
    GPUTextureUsage: { TEXTURE_BINDING: 1, STORAGE_BINDING: 2 } });
  vm.runInContext(source.replaceAll('export ', '') + '\nthis.createDofCache = createDofCache;', context);
  const art = resource({ width, height }), depth = resource({ width, height });
  const cache = context.createDofCache({ device, pipeline: { getBindGroupLayout: () => ({}) },
    art, depth, lookup: point => point[0], wake: () => wakes++ });
  const encoder = { beginComputePass: () => ({ setPipeline() {}, setBindGroup() {}, dispatchWorkgroups() {}, end() {} }) };
  return { cache, art, depth, textures, buffers, writes, pending,
    frame: (now = 1000, focus = 0.5, enabled = true) => cache.frame(encoder, [focus, 0], enabled, now),
    async complete(failed = false) {
      cache.submitted();
      const work = pending.shift();
      assert(work, 'Expected pending GPU work');
      if (failed) work.reject(new Error('device lost')); else work.resolve();
      await Promise.resolve();
    },
    get wakes() { return wakes; }, get peakBytes() { return peakBytes; }
  };
}

test('default preserves the original blend and bake; zero returns sharp with no GPU work', async () => {
  const f = fixture();
  assert.equal(f.cache.stats.strength, 1);
  assert.equal(f.frame().strength, 0);
  assert.equal(f.writes[0][1], 1);
  await f.complete();
  assert.equal(f.frame(1600).strength, 0.55);
  await f.complete();
  f.cache.setStrength(0);
  const sharp = f.frame(1800);
  assert.equal(sharp.a, f.art);
  assert.equal(sharp.b, f.art);
  assert.equal(sharp.strength, 0);
  assert.equal(sharp.needsFrame, false);
  assert.equal(f.cache.stats.baked, 2);
  assert.equal(f.cache.stats.sliceBytes, 0);
  f.cache.destroy();
});

test('higher strengths scale bake reach and cap the blend at one', async () => {
  for (const strength of [0.5, 1, 3, 4]) {
    const f = fixture();
    f.cache.setStrength(strength);
    f.frame();
    await f.complete();
    const state = f.frame(1600);
    assert.equal(state.strength, Math.min(1, 0.55 * strength));
    assert.equal(f.writes[0][1], strength);
    assert.equal(f.cache.stats.strength, strength);
    await f.complete();
    f.cache.destroy();
  }
});

test('finite clamp, unchanged values and insignificant input noise do not invalidate', async () => {
  const f = fixture();
  f.frame();
  await f.complete();
  f.frame(1600);
  await f.complete();
  const slices = f.textures.slice(), wakes = f.wakes;
  for (const value of [1, 1.00001, NaN, Infinity, -Infinity, undefined, null, '3']) {
    assert.equal(f.cache.setStrength(value), 1);
  }
  assert.equal(f.wakes, wakes);
  assert(slices.every(t => !t.destroyed));
  for (let now = 1700; now < 2700; now += 16) assert.equal(f.frame(now).needsFrame, false);
  assert.equal(f.cache.stats.baked, 2);
  assert.equal(f.cache.setStrength(99), 4);
  assert(slices.every(t => t.destroyCount === 1));
  assert.equal(f.cache.setStrength(-99), 0);
  f.cache.destroy();
});

test('strength changes coalesce while a stale bake is pending, including before submit', async () => {
  const f = fixture();
  f.frame();
  const old = f.textures[0];
  for (const value of [2, 2.5, 3, 4]) f.cache.setStrength(value);
  assert.equal(old.destroyed, false, 'Encoded work still owns its texture');
  assert.equal(f.cache.stats.sliceBytes, 6 * 1024 * 1024);
  assert.equal(f.frame(1600).a, f.art);
  assert.equal(f.textures.length, 1);
  f.cache.submitted();
  f.cache.submitted();
  assert.equal(f.pending.length, 1, 'Only one completion callback per submission');
  await f.complete();
  assert.equal(old.destroyCount, 1);
  assert.equal(f.cache.stats.slices, 0, 'Stale completion cannot repopulate the cache');
  f.frame(1700);
  assert.equal(f.writes.at(-1)[1], 4, 'Only latest strength gets baked');
  assert.equal(f.cache.stats.inFlight, true);
  await f.complete();
  f.cache.destroy();
});

test('suspend suppresses stale wakeups and allocation; resume uses latest strength', async () => {
  const f = fixture();
  f.frame();
  f.cache.submitted();
  f.cache.suspend(true);
  const wakes = f.wakes;
  f.cache.setStrength(3);
  assert.equal(f.frame(1600).needsFrame, false);
  await f.complete();
  assert.equal(f.wakes, wakes);
  assert.equal(f.textures[0].destroyCount, 1);
  f.cache.suspend(false);
  assert.equal(f.wakes, wakes + 1);
  f.frame(1700);
  assert.equal(f.writes.at(-1)[1], 3);
  await f.complete();
  f.cache.destroy();
});

test('destroy is idempotent and late resolve/reject cannot wake or retain GPU handles', async () => {
  for (const submitted of [false, true]) for (const failed of [false, true]) {
    const f = fixture();
    f.frame();
    if (submitted) f.cache.submitted();
    f.cache.setStrength(3);
    f.cache.destroy();
    f.cache.destroy();
    const wakes = f.wakes;
    if (submitted) await f.complete(failed);
    f.cache.submitted();
    f.cache.setStrength(2);
    f.cache.suspend(false);
    assert.equal(f.frame(1600).needsFrame, false);
    assert.equal(f.wakes, wakes);
    assert.equal(f.cache.stats.inFlight, false);
    assert.equal(f.cache.stats.sliceBytes, 0);
    assert(f.textures.concat(f.buffers).every(t => t.destroyCount === 1));
    assert.equal(f.art.destroyed, false);
    assert.equal(f.depth.destroyed, false);
  }
});

test('rejected work releases invalid slices without scheduling a retry loop', async () => {
  const f = fixture();
  f.frame();
  const wakes = f.wakes;
  await f.complete(true);
  assert.equal(f.wakes, wakes);
  assert.equal(f.cache.stats.inFlight, false);
  assert.equal(f.cache.stats.sliceBytes, 0);
  assert.equal(f.textures[0].destroyCount, 1);
  f.cache.destroy();
});

test('focus traversal and strength churn stay within four textures and 24 MiB', async () => {
  for (const dimensions of [[1536, 1024], [4096, 4096]]) {
    const f = fixture(...dimensions);
    for (let i = 0; i < 80; i++) {
      const now = 1000 + i * 10000, focus = ((i * 7) % 16 + 0.75) / 16;
      f.frame(now, focus);
      assert(f.textures.filter(t => !t.destroyed).length <= 4);
      if (i % 5 === 4) f.cache.setStrength(i % 3 + 1);
      assert(f.cache.stats.sliceBytes <= 24 * 1024 * 1024);
      if (f.cache.stats.inFlight) await f.complete();
    }
    assert(f.peakBytes <= 24 * 1024 * 1024);
    f.cache.destroy();
    assert(f.textures.concat(f.buffers).every(t => t.destroyCount === 1));
  }
});

test('focus smoothing and fade remain based on elapsed time', async () => {
  const run = async step => {
    const f = fixture();
    f.frame(1000, 0.1);
    await f.complete();
    let state;
    for (let now = 1000 + step; now <= 1600; now += step) {
      state = f.frame(now, 0.9);
      if (f.cache.stats.inFlight) await f.complete();
    }
    f.cache.destroy();
    return state;
  };
  const fast = await run(10), slow = await run(100);
  assert(Math.abs(fast.focus - slow.focus) < 1e-12);
  assert.equal(fast.strength, 0.55);
  assert.equal(slow.strength, fast.strength);
});
