const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {createHash} = require('node:crypto');
const {test} = require('node:test');
const vm = require('node:vm');

const root = join(__dirname, '../docs/storyboard');
const registry = JSON.parse(readFileSync(join(root, 'covers.json'), 'utf8'));
const languages = ['en', 'es', 'ru'];
const localized = prefix => Object.fromEntries(languages.map(lang => [lang, `${prefix}-${lang}`]));

function setup(data = structuredClone(registry), {search = '', missing = () => false} = {}) {
  const decoded = [], loaded = [];
  const context = vm.createContext({
    URLSearchParams, location:{search},
    fetch:async path => ({ok:true, json:async () => {
      if (path === 'covers.json') return data;
      if (path === 'illustrations.json') return {chapters:{
        'chapter-01':[{src:'lake-scene.png', alt:localized('lake-scene')}],
        'chapter-02':[{src:'elder-scene.png', alt:localized('elder-scene')}]
      }};
      if (path === 'translations.json') return Object.fromEntries(['chapter-01', 'chapter-02'].map(id =>
        [id, Object.fromEntries(languages.map(lang => [lang, {title:`${id}-${lang}`}]))]));
      if (path === 'book.json') return {chapters:[]};
      throw new Error(path);
    }}),
    Image:class {
      removeAttribute(name) { delete this[name]; }
      async decode() {
        decoded.push(this.src);
        if (missing(this.src)) throw new Error('Missing image');
      }
    },
    window:{
      chapterEditions:{available:async () => new Set(['1', '2']),
        editions:{'1':{id:'chapter-01'}, '2':{id:'chapter-02'}}},
      standaloneStories:{load:async id => { loaded.push(id); return {title:localized(id),
        cover:Object.fromEntries(languages.map(lang => [lang, `${id}-${lang}.png`])),
        scenes:[{image:`${id}-scene.png`, alt:localized(`${id}-scene`)}]}; }}
    }
  });
  for (const file of ['title-covers.js', 'atlas-stories.js']) {
    vm.runInContext(readFileSync(join(root, file), 'utf8'), context, {filename:file});
  }
  return {...context.window, decoded, loaded};
}

test('all registered miniature files match dimensions and provenance hashes', () => {
  for (const [id, cover] of Object.entries(registry.covers)) {
    const mini = cover.miniature;
    assert.equal(mini.asset, `images/covers/${id}/miniature/miniature-v${mini.version}.png`);
    const png = readFileSync(join(root, mini.asset));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), mini.width);
    assert.equal(png.readUInt32BE(20), mini.height);
    const record = JSON.parse(readFileSync(join(root, mini.asset.replace('.png', '.json')), 'utf8'));
    assert.equal(createHash('sha256').update(png).digest('hex'), record.sha256);
    for (const asset of Object.values(cover.assets)) assert.ok(readFileSync(join(root, asset)).length);
  }
});

test('miniature approval is opt-in and does not relax title approval', async () => {
  const {titleCovers} = setup();
  await titleCovers.load();
  for (const [id, cover] of Object.entries(registry.covers)) {
    assert.equal(Boolean(titleCovers.resolveMiniature(id, 'en')), cover.miniature.status === 'approved');
    assert.equal(titleCovers.resolveMiniature(id, 'en', {allowProposed:true}).src, cover.miniature.asset);
    assert.equal(Boolean(titleCovers.resolve(id, 'en')), cover.status === 'approved');
  }
  assert.equal(titleCovers.resolveMiniature('chapter-01', 'en', {allowProposed:'true'}), null);
  assert.equal(titleCovers.resolveMiniature('chapter-01', 'fr', {allowProposed:true}), null);
});

test('Atlas decodes all four shared bitmaps with localized metadata and links', async () => {
  const {AtlasStories, decoded} = setup();
  for (const [id, entry] of Object.entries(AtlasStories.entries)) {
    for (const lang of languages) {
      const result = await AtlasStories.miniature(id, lang);
      assert.equal(result.src, registry.covers[entry.coverId].miniature.asset);
      assert.equal(decoded.at(-1), result.src);
      assert.equal(result.alt, registry.covers[entry.coverId].title[lang]);
      assert.equal(result.title, `${entry.coverId}-${lang}`);
      assert.equal(result.href, `index.html?${entry.route}&lang=${lang}`);
    }
  }
  assert.equal(await AtlasStories.miniature('unknown', 'en'), null);
  assert.equal(await AtlasStories.miniature('toString', 'en'), null);
  assert.match((await AtlasStories.miniature('home', 'fr')).href, /lang=en$/);
});

test('full previews still choose localized title art in each language', async () => {
  const {AtlasStories} = setup(undefined, {search:'?coverPreview=1'});
  for (const [id, entry] of Object.entries(AtlasStories.entries)) {
    for (const lang of languages) {
      const result = await AtlasStories.preview(id, lang);
      assert.equal(result.src, registry.covers[entry.coverId].assets[lang]);
      assert.match(result.href, /coverPreview=1$/);
    }
  }
});

test('absent, invalid, or undecodable miniatures never fetch full title art', async () => {
  const cases = [
    cover => { delete cover.miniature; },
    cover => { cover.miniature.asset = '../outside.png'; },
    cover => { cover.miniature.width = 1; },
    cover => { cover.miniature.languageIndependent = false; },
    cover => { cover.miniature.status = 'rejected'; }
  ];
  for (const change of cases) {
    const data = structuredClone(registry);
    change(data.covers['home-sweet-home']);
    const {AtlasStories, decoded} = setup(data);
    assert.equal(await AtlasStories.miniature('home', 'es'), null);
    assert.equal(decoded.length, 0);
  }
  const {AtlasStories} = setup(undefined, {missing:src => src.includes('/miniature/')});
  assert.equal(await AtlasStories.miniature('lake', 'ru'), null);
  assert.equal(await AtlasStories.miniature('home', 'ru'), null);
  const broken = setup(undefined, {missing:() => true});
  assert.equal(await broken.AtlasStories.miniature('home', 'en'), null);
});

test('concurrent availability, miniatures and previews share successful resolution', async () => {
  const {AtlasStories, loaded} = setup();
  await Promise.all([AtlasStories.available(), AtlasStories.available(), AtlasStories.miniature('home', 'en')]);
  await AtlasStories.preview('home', 'ru');
  await AtlasStories.miniature('bridge', 'es');
  assert.deepEqual(loaded.sort(), ['home-sweet-home', 'timber-tractor']);
});

test('transient unavailable stories are retried, including rejected loads', async () => {
  for (const reject of [false, true]) {
    const {AtlasStories, standaloneStories} = setup();
    const original = standaloneStories.load;
    let attempts = 0;
    standaloneStories.load = async (...args) => {
      if (++attempts === 1) {
        if (reject) throw new Error('Transient');
        return null;
      }
      return original(...args);
    };
    assert.equal(await AtlasStories.miniature('home', 'en'), null);
    assert.ok(await AtlasStories.miniature('home', 'en'));
    assert.equal(attempts, 2);
  }
});

test('a persistent decoded banner is reused across languages', async () => {
  const {AtlasStories, decoded} = setup();
  const image = {src:'', complete:false, naturalWidth:0, getAttribute() { return this.src; },
    async decode() { this.complete=true; this.naturalWidth=256; decoded.push(this.src); }};
  for (const lang of languages) assert.ok(await AtlasStories.miniature('home', lang, {image}));
  assert.equal(decoded.length, 1);
});

test('invalid derivative paths do not override original artwork', async () => {
  const data = structuredClone(registry);
  data.covers['home-sweet-home'].miniature.derivatives[0].src = '../outside.webp';
  const {titleCovers} = setup(data);
  await titleCovers.load();
  const cover = titleCovers.resolveMiniature('home-sweet-home', 'en');
  assert.equal(cover.srcset, undefined);
  assert.equal(cover.src, registry.covers['home-sweet-home'].miniature.asset);
});

test('derivative dimensions and hashes retain the original source provenance', () => {
  for (const cover of Object.values(registry.covers)) {
    const mini = cover.miniature;
    const sourceHash = createHash('sha256').update(readFileSync(join(root, mini.asset))).digest('hex');
    for (const derivative of mini.derivatives) {
      const bytes = readFileSync(join(root, derivative.src));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      const provenance = JSON.parse(readFileSync(join(root, derivative.src.replace('.webp', '.json')), 'utf8'));
      assert.equal(provenance.source, mini.asset);
      assert.equal(provenance.sourceSha256, sourceHash);
      assert.equal(provenance.sha256, createHash('sha256').update(bytes).digest('hex'));
      assert.equal(provenance.width, derivative.width);
      assert.equal(provenance.height, derivative.height);
      assert.equal(provenance.encoding, 'lossy WebP');
      assert.equal(provenance.quality, 92);
      assert.equal(provenance.sharpYuv, true);
    }
  }
});
