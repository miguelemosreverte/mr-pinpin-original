#!/usr/bin/env node
// Dependency-free checks of the registry, assets, and actual reader/library scripts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const base = path.resolve(__dirname, '../docs/storyboard');
const read = name => fs.readFileSync(path.join(base, name), 'utf8');
const registry = JSON.parse(read('covers.json'));
const languages = ['ru', 'en', 'es'];
const ids = ['chapter-01', 'chapter-02', 'timber-tractor', 'home-sweet-home'];

class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.dataset = {}; this.style = {setProperty() {}}; this.attributes = {}; this.value = ''; this.options = []; this.classList = {toggle() {}, remove() {}, contains() { return false; }}; }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener() {}
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); }
  decode() { return Promise.resolve(); }
}
const descendants = node => node.children.flatMap(child => [child, ...descendants(child)]);
const classIs = (node, value) => (node.className || '').split(' ').includes(value);
const nodes = (page, root, predicate) => descendants(page.elements[root]).filter(predicate);

async function page(kind, search, missingRegistry = false, registryOverride) {
  const elements = {};
  const document = {documentElement:new Element('html'), fonts:{ready:Promise.resolve()},
    getElementById:id => elements[id] ||= new Element(), createElement:tag => new Element(tag),
    createTextNode:text => Object.assign(new Element('#text'), {textContent:text}), querySelectorAll:() => []};
  document.getElementById('chapter-filter').value = 'all';
  const context = {URL, URLSearchParams, Set, Intl, document, location:new URL('https://example.test/storyboard/' + search),
    fetch:async name => ({ok:!(missingRegistry && name === 'covers.json'), status:missingRegistry ? 404 : 200,
      json:async () => name === 'covers.json' && registryOverride ? registryOverride : JSON.parse(read(name))}),
    addEventListener() {}, requestAnimationFrame() {}, ResizeObserver:class { observe() {} },
    innerHeight:800, scrollY:0, history:{}, console};
  context.history.replaceState = context.history.pushState = (_, __, url) => { context.location = new URL(url, context.location); };
  context.window = context;
  context.scrollTo = () => {};
  vm.createContext(context);
  for (const script of ['locale.js', 'chapter-editions.js', 'standalone-stories.js', 'title-covers.js', `${kind}.js`]) {
    vm.runInContext(read(script), context, {filename:script});
  }
  for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(elements[kind === 'reader' ? 'reader' : 'chapter-library'].attributes['aria-busy'], 'false');
  if (kind === 'reader') assert.equal(elements.reader.children[0].tagName, 'article', 'Reader must remain available');
  return {context, elements};
}
const readerImages = result => nodes(result, 'reader', node => node.tagName === 'img');
const sceneSignature = result => nodes(result, 'reader', node => classIs(node, 'scene')).map(node => ({
  id:node.id, sceneId:node.dataset.sceneId,
  paragraphs:descendants(node).filter(child => child.tagName === 'p').map(child => ({text:child.textContent, children:child.children.map(item => item.textContent)}))
}));
const spreadSignature = result => nodes(result, 'reader', node => classIs(node, 'spread') && node.id !== 'title-cover').map(node => ({id:node.id, className:node.className}));

(async () => {
  assert.equal(registry.schemaVersion, 1);
  for (const id of ids) assert.ok(registry.covers[id], `${id} legacy cover remains registered`);
  for (const id of ids) {
    const cover = registry.covers[id];
    assert.equal(cover.status, 'approved', `${id} release approval state`);
    assert.deepEqual(cover.route, id.startsWith('chapter-') ? {chapter:String(Number(id.slice(-2)))} : {story:id});
    assert.equal(cover.placement, id.startsWith('chapter-') ? 'prepend' : 'replace');
    assert.equal(cover.width, 1024); assert.equal(cover.height, 1536);
    for (const lang of languages) {
      assert.ok(cover.title[lang]?.trim()); assert.ok(cover.alt[lang]?.trim());
      assert.ok([
        `images/covers/${id}/title/title-${lang}-v${cover.version}.png`,
        `images/covers/${id}/title-${lang}-v${cover.version}.png`
      ].includes(cover.assets[lang]), `${id}/${lang} canonical or preserved legacy cover path`);
      const file = path.join(base, cover.assets[lang]);
      const bytes = fs.readFileSync(file);
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(bytes.readUInt32BE(16), 1024); assert.equal(bytes.readUInt32BE(20), 1536);
      const metadata = JSON.parse(fs.readFileSync(file.replace(/\.png$/, '.json'), 'utf8'));
      assert.ok(fs.readFileSync(file.replace(/\.png$/, '.md'), 'utf8').trim());
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      assert.equal(metadata.sha256, hash, `${id}/${lang}: asset hash matches its sidecar`);
      assert.equal(metadata.status, cover.status, `${id}/${lang}: sidecar approval matches registry`);
      const provenance = metadata.provenance;
      if (provenance?.originalPath || provenance?.originalSha256 || provenance?.legacyURL) {
        assert.equal(provenance.originalSha256, hash, 'Copied assets must be byte-identical');
        assert.ok(provenance.originalPath && provenance.legacyURL);
      }
    }
  }
  // Exercise proposals independently of the release's actual approval state.
  const proposedRegistry = structuredClone(registry);
  for (const cover of Object.values(proposedRegistry.covers)) cover.status = 'proposed';
  for (const testedRegistry of [registry, proposedRegistry]) for (const lang of languages) for (const preview of [false, true]) {
    const search = `?lang=${lang}${preview ? '&coverPreview=1' : ''}`;
    const library = await page('library', search, false, testedRegistry);
    for (const id of ids) {
      const cover = testedRegistry.covers[id];
      const route = new URLSearchParams(cover.route).toString();
      const reader = await page('reader', search + '&' + route, false, testedRegistry);
      const baseline = await page('reader', search + '&' + route, true);
      assert.deepEqual(sceneSignature(reader), sceneSignature(baseline), `${id}: scenes and prose stay intact`);
      assert.deepEqual(spreadSignature(reader), spreadSignature(baseline), `${id}: spread IDs and styles stay intact`);
      const firstImage = readerImages(reader)[0];
      const root = id.startsWith('chapter-') ? 'chapter-library' : 'adventure-library';
      const card = nodes(library, root, node => node.dataset.story === id || node.dataset.chapter === Number(cover.route.chapter))[0];
      assert.ok(card, `${id} library card`);
      const thumbnail = descendants(card).find(node => node.tagName === 'img');
      const link = descendants(card).find(node => node.tagName === 'a');
      assert.equal(new URL(link.href).searchParams.get('coverPreview'), preview ? '1' : null);
      const enabled = preview || cover.status === 'approved';
      assert.equal(firstImage.src, enabled ? cover.assets[lang] : readerImages(baseline)[0].src);
      assert.equal(thumbnail.src, firstImage.src, `${id}/${lang}: reader and library agree`);
      assert.equal(nodes(reader, 'reader', node => node.id === 'title-cover').length, id.startsWith('chapter-') && enabled ? 1 : 0);
      if (id.startsWith('chapter-')) assert.equal(sceneSignature(reader).length, id === 'chapter-01' ? 15 : 16);
      if (enabled) {
        firstImage.onerror();
        assert.equal(readerImages(reader)[0].src, readerImages(baseline)[0].src, `${id}: missing PNG falls back`);
        assert.deepEqual(sceneSignature(reader), sceneSignature(baseline));
        thumbnail.onerror();
        assert.equal(thumbnail.src, readerImages(baseline)[0].src);
      }
    }
  }
  // A malformed entry also fails closed; only exact coverPreview=1 unlocks proposals.
  const probe = await page('reader', '?chapter=1&lang=en', false, proposedRegistry);
  assert.equal(probe.context.titleCovers.resolve('chapter-01', 'en'), null);
  assert.equal(probe.context.titleCovers.resolve('chapter-01', 'en', '?coverPreview=true'), null);
  assert.equal(probe.context.titleCovers.resolve('chapter-01', 'en', '?coverPreview=0'), null);
  assert.equal(probe.context.titleCovers.resolve('chapter-01', 'en', '?coverPreview=1').src, registry.covers['chapter-01'].assets.en);
  assert.equal(probe.context.titleCovers.resolve('chapter-01', 'xx', '?coverPreview=1'), null);
  assert.equal(probe.context.titleCovers.resolve('missing', 'en', '?coverPreview=1'), null);
  const malformed = structuredClone(registry);
  malformed.covers['chapter-01'].assets.en = '../untrusted.png';
  const invalid = await page('reader', '?chapter=1&lang=en&coverPreview=1', false, malformed);
  assert.equal(invalid.context.titleCovers.resolve('chapter-01', 'en'), null);
  assert.equal(nodes(invalid, 'reader', node => node.id === 'title-cover').length, 0);
  const missingLibrary = await page('library', '?lang=en&coverPreview=1', true);
  const standaloneIds = ['timber-tractor', 'home-sweet-home', 'one-day-in-the-forest'];
  for (const id of standaloneIds) assert.ok(
    nodes(missingLibrary, 'adventure-library', node => node.dataset.story === id).length === 1,
    `${id} library card remains available without cover registry`);
  assert.equal(nodes(missingLibrary, 'adventure-library', node => node.tagName === 'img').length, standaloneIds.length);
  console.log('Title covers verified: 12 approved PNGs/sidecars; generated and copied asset hashes; 48 reader/library release and synthetic-proposal route-language-mode cases; original scene/prose/spread preservation; missing registry and missing image fallbacks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
