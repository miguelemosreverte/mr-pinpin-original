const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../docs/storyboard/atlas-sprite-cache.js'), 'utf8');
const base = 'https://atlas.example/storyboard/atlas.html';

function harness(options = {}) {
  const images = [], notifications = [], window = {};
  let cache;
  class Image {
    constructor() {
      this.src = '';
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.decodeCalls = 0;
      images.push(this);
    }
    decode() {
      this.decodeCalls++;
      return new Promise((resolve, reject) => {
        this.succeed = (width = 10, height = 10) => {
          this.naturalWidth = width;
          this.naturalHeight = height;
          resolve();
        };
        this.fail = () => reject(new Error('Decode failed'));
      });
    }
  }
  vm.runInNewContext(source, {window, Image, URL, location: {href: base}},
    {filename: 'atlas-sprite-cache.js'});
  cache = window.AtlasSpriteCache.create({
    ...options,
    onReady() { notifications.push({...cache.stats}); }
  });
  async function ready(src, width = 10, height = 10) {
    const result = cache.load(src), image = images.at(-1);
    image.succeed(width, height);
    assert.equal(await result, image);
    return image;
  }
  return {cache, images, notifications, ready};
}

test('at most three decodes run at once and a denied get can retry after a slot opens', async () => {
  const {cache, images, notifications} = harness();
  const first = cache.load('a.png'), second = cache.load('b.png'), third = cache.load('c.png');
  assert.equal(cache.stats.pending, 3);
  assert.equal(cache.get('d.png'), null);
  assert.equal(images.length, 3);
  assert.equal(cache.stats.loads, 3);
  images[1].succeed();
  await second;
  assert.equal(cache.stats.pending, 2);
  const fourth = cache.load('d.png');
  assert.equal(cache.stats.pending, 3);
  assert.equal(images.length, 4);
  images[0].succeed();
  images[2].succeed();
  images[3].succeed();
  await Promise.all([first, third, fourth]);
  assert.equal(cache.stats.pending, 0);
  assert.equal(notifications.length, 4);
  assert(notifications.every(stats => stats.pending >= 0 && stats.pending <= 3));
});

test('repeated get and concurrent load reuse one image while pending and after decoding', async () => {
  const {cache, images, notifications} = harness();
  assert.equal(cache.get('images/body.png'), null);
  for (let i = 0; i < 100; i++) assert.equal(cache.get('images/body.png'), null);
  const one = cache.load('images/body.png'), two = cache.load('images/body.png');
  assert.equal(images.length, 1);
  assert.equal(images[0].decodeCalls, 1);
  assert.equal(images[0].src, new URL('images/body.png', base).href);
  images[0].succeed(20, 30);
  assert.equal(await one, images[0]);
  assert.equal(await two, images[0]);
  for (let i = 0; i < 100; i++) assert.equal(cache.get('images/body.png'), images[0]);
  assert.equal(await cache.load('images/body.png'), images[0]);
  assert.equal(cache.stats.loads, 1);
  assert.equal(cache.stats.bytes, 20 * 30 * 4);
  assert.equal(notifications.length, 1);
});

test('ready hits still work when all three decode slots are occupied', async () => {
  const {cache, images, ready} = harness();
  const body = await ready('body.png');
  const pending = ['a.png', 'b.png', 'c.png'].map(src => cache.load(src));
  assert.equal(cache.stats.pending, 3);
  assert.equal(cache.get('body.png'), body);
  assert.equal(await cache.load('body.png'), body);
  for (const image of images.slice(1)) image.succeed();
  await Promise.all(pending);
  assert.equal(cache.stats.loads, 4);
});

test('get refreshes LRU ordering and evicted image handles are released', async () => {
  const {cache, ready} = harness({maxEntries: 2});
  const a = await ready('a.png'), b = await ready('b.png');
  assert.equal(cache.get('a.png'), a);
  const c = await ready('c.png');
  assert.equal(cache.peek('a.png'), a);
  assert.equal(cache.peek('b.png'), null);
  assert.equal(cache.peek('c.png'), c);
  assert.equal(b.src, '');
  assert.equal(cache.stats.entries, 2);
  assert.equal(cache.stats.bytes, 800);
  assert.equal(cache.stats.evictions, 1);
});

test('peek observes a decoded entry without making it more recent', async () => {
  const {cache, ready} = harness({maxEntries: 2});
  const a = await ready('a.png'), b = await ready('b.png');
  assert.equal(cache.peek('a.png'), a);
  await ready('c.png');
  assert.equal(cache.peek('a.png'), null);
  assert.equal(cache.peek('b.png'), b);
});

test('pinned sheets survive entry pressure even when they are least recently used', async () => {
  const {cache, ready} = harness({maxEntries: 2});
  const pinned = await ready('pinned.png');
  cache.protect(['pinned.png', null, '']);
  const disposable = await ready('disposable.png');
  await ready('incoming.png');
  assert.equal(cache.peek('pinned.png'), pinned);
  assert.notEqual(pinned.src, '');
  assert.equal(cache.peek('disposable.png'), null);
  assert.equal(disposable.src, '');
  assert.equal(cache.stats.entries, 2);
});

test('pins retain active artwork over soft budgets and replacing pins prunes immediately', async () => {
  const {cache, ready} = harness({maxEntries: 1, maxBytes: 400});
  cache.protect(['a.png', 'b.png']);
  const a = await ready('a.png'), b = await ready('b.png');
  assert.equal(cache.peek('a.png'), a);
  assert.equal(cache.peek('b.png'), b);
  assert.equal(cache.stats.entries, 2);
  assert.equal(cache.stats.bytes, 800);
  cache.protect(['b.png']);
  assert.equal(cache.peek('a.png'), null);
  assert.equal(a.src, '');
  assert.equal(cache.peek('b.png'), b);
  assert.equal(cache.stats.entries, 1);
  assert.equal(cache.stats.bytes, 400);
});

test('byte pressure evicts enough LRU entries using decoded RGBA dimensions', async () => {
  const {cache, ready} = harness({maxEntries: 10, maxBytes: 1600});
  const a = await ready('a.png', 10, 20), b = await ready('b.png', 20, 10);
  assert.equal(cache.stats.bytes, 1600);
  const c = await ready('c.png', 20, 20);
  assert.equal(cache.peek('a.png'), null);
  assert.equal(cache.peek('b.png'), null);
  assert.equal(cache.peek('c.png'), c);
  assert.equal(a.src, '');
  assert.equal(b.src, '');
  assert.equal(cache.stats.bytes, 1600);
  assert.equal(cache.stats.entries, 1);
  assert.equal(cache.stats.evictions, 2);
});

test('decode failures resolve null, release a slot, consume no bytes and notify once', async () => {
  const {cache, images, notifications} = harness();
  const bad = cache.load('bad.png'), a = cache.load('a.png'), b = cache.load('b.png');
  images[0].fail();
  assert.equal(await bad, null);
  assert.equal(cache.peek('bad.png'), null);
  assert.equal(cache.stats.pending, 2);
  assert.equal(cache.stats.bytes, 0);
  assert.equal(notifications.length, 1);
  const c = cache.load('c.png');
  assert.equal(cache.stats.pending, 3);
  images[1].succeed();
  images[2].succeed();
  images[3].succeed();
  await Promise.all([a, b, c]);
  assert.equal(cache.stats.pending, 0);
  assert.equal(cache.stats.bytes, 1200);
  assert.equal(notifications.length, 4);
});

test('failed entries can be evicted without corrupting byte accounting', async () => {
  const {cache, images, ready} = harness({maxEntries: 1});
  const bad = cache.load('bad.png');
  images[0].fail();
  assert.equal(await bad, null);
  await ready('good.png');
  assert.equal(cache.stats.entries, 1);
  assert.equal(cache.stats.bytes, 400);
  const retry = cache.load('bad.png');
  assert.equal(images.length, 3);
  images[2].succeed();
  assert.equal(await retry, images[2]);
  assert.equal(cache.stats.bytes, 400);
  assert.equal(cache.stats.pending, 0);
});

test('empty sources neither allocate nor start decoding', async () => {
  const {cache, images} = harness();
  for (const src of ['', null, undefined]) {
    assert.equal(cache.get(src), null);
    assert.equal(cache.peek(src), null);
    assert.equal(await cache.load(src), null);
  }
  assert.equal(images.length, 0);
  assert.equal(cache.stats.loads, 0);
  assert.equal(cache.stats.bytes, 0);
});

test('an oversized unpinned load never resolves to an image already cleared by eviction', async () => {
  const {cache, images} = harness({maxBytes: 100});
  const pending = cache.load('oversized.png');
  images[0].succeed(10, 10);
  const result = await pending;
  assert.equal(cache.stats.pending, 0);
  assert.equal(cache.stats.entries, 0);
  assert.equal(cache.stats.bytes, 0);
  assert(result === null || result.src !== '', 'load returned an evicted image with an empty src');
});

test('entry pressure while decoding never reports a cleared image as a successful load', async () => {
  const {cache, images} = harness({maxEntries: 1});
  const first = cache.load('first.png'), second = cache.load('second.png');
  images[0].succeed();
  const result = await first;
  const usableAtResolution = result === null || result.src !== '';
  images[1].succeed();
  await second;
  assert.equal(cache.stats.pending, 0);
  assert(cache.stats.entries <= 1);
  assert(usableAtResolution, 'first load returned a cleared image while second was pending');
});
