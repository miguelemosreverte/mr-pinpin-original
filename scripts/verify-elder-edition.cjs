#!/usr/bin/env node
// Public Elder edition validation: release assets, localizations, route whitelist and negative schema cases.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..', 'docs', 'storyboard');
const parts = ['papa-home', 'family-morning', 'forest-path', 'elder-house', 'beneath-roots'];
const ids = ['one-day-in-the-forest', ...parts.map(p => 'elder-' + p)];
const languages = ['en', 'ru', 'es'];
const schemaOnly = process.argv.includes('--schema-only');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const context = {window:{}, URLSearchParams, location:{search:''}, fetch:async (file,options) => {
  if(options?.method === 'HEAD') return {ok:fs.existsSync(path.join(root,file)) || fs.existsSync(path.resolve(root,'../../../mr-pinpin-original/docs/storyboard',file))};
  try {const data = read(file); return {ok:true, json:async () => data};}
  catch {return {ok:false};}
}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'standalone-stories.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'title-covers.js'), 'utf8'), context);
const api = context.window.standaloneStories;
const clone = value => JSON.parse(JSON.stringify(value));
(async () => {
  const cycle = read('stories/one-day-in-the-forest.json');
  const assets = new Set();
  for (const [i,id] of ids.entries()) {
    const story = read(`stories/${id}.json`);
    assert(api.complete(story), `${id} invalid`);
    assert.equal((await api.load(id)).id, id);
    assert.equal(story.scenes.length, [178,28,21,23,36,70][i]);
    for (const lang of languages) {
      const edition = api.edition(story, lang);
      for (const scene of story.scenes) {
        assets.add(scene.image);
        if (scene.role === 'title') {
          Object.values(scene.images).forEach(src => assets.add(src));
          assert.equal(edition.images[story.scenes.indexOf(scene)].src, scene.images[lang], `${id} internal cover localization`);
        }
      }
    }
    assets.add(story.miniature);
  }
  const invalidCases = [
    ['wrong edition version', s => {s.editionVersion = 1;}],
    ['unapproved arrival revision', s => {s.scenes[3].image = s.scenes[3].image.replace('-v4.webp', '-v3.webp');}],
    ['unknown arrival id', s => {s.scenes[3].id = 'arrival-99';}],
    ['wrong arrival order', s => {[s.scenes[3], s.scenes[4]] = [s.scenes[4], s.scenes[3]];}],
    ['wrong original window revision', s => {s.scenes[2].image = 'images/published/elder-cycle/elder-r6-family-002.webp';}],
    ['unknown id', s => {s.id = 'unlisted-elder-story';}],
    ['traversal image', s => {s.scenes[1].image = 'images/published/elder-cycle/../../secret.webp';}],
    ['remote image', s => {s.scenes[1].image = 'https://example.com/image.webp';}],
    ['duplicate scene id', s => {s.scenes[2].id = s.scenes[1].id;}],
    ['missing Russian cover', s => {delete s.scenes[s.chapterNav[1].startScene].images.ru;}],
    ['wrong localized interior cover', s => {s.scenes[s.chapterNav[1].startScene].images.ru = s.scenes[0].images.ru;}],
    ['empty narrative', s => {s.scenes[1].paragraphs.es = [];}],
    ['missing scene', s => {s.scenes.pop();}],
    ['wrong chapter number', s => {s.chapterNav[1].number = 1;}],
    ['wrong nav anchor', s => {s.chapterNav[1].startScene++;}],
    ['duplicate spread', s => {s.spreads[2].scenes = [1];}],
  ];
  for (const [name, mutate] of invalidCases) {const bad = clone(cycle); mutate(bad); assert(!api.complete(bad), name);}
  assert.equal(await api.load('../one-day-in-the-forest'), null);
  const available = await api.available();
  assert.equal(available.filter(s => s.id === cycle.id).length, 1);
  assert(!available.some(s => s.id.startsWith('elder-')), 'Do not duplicate cycle into six library cards');
  // Existing standalone validators and composition retain their accepted fixtures.
  for (const id of ['timber-tractor', 'home-sweet-home']) assert(await api.load(id), `${id} legacy load`);
  await context.window.titleCovers.load();
  for (const id of ids) for (const lang of languages) {
    const cover = context.window.titleCovers.resolve(id, lang);
    assert(cover, `${id} registry ${lang}`);
    assert.equal(cover.src, read(`stories/${id}.json`).cover[lang]);
  }
  for (const id of ['chapter-01','chapter-02','timber-tractor','home-sweet-home']) {
    for (const lang of languages) assert(context.window.titleCovers.resolve(id, lang), `${id} legacy canonical registry`);
  }
  const oldRegistry = clone(read('covers.json'));
  for (const id of ['chapter-01','chapter-02','timber-tractor','home-sweet-home']) {
    for (const lang of languages) oldRegistry.covers[id].assets[lang] = oldRegistry.covers[id].assets[lang].replace('/title/title-', '/title-');
  }
  const oldContext = {window:{}, URLSearchParams, location:{search:''}, fetch:async () => ({ok:true,json:async()=>oldRegistry})};
  vm.createContext(oldContext);
  vm.runInContext(fs.readFileSync(path.join(root,'title-covers.js'),'utf8'), oldContext);
  await oldContext.window.titleCovers.load();
  for (const id of ['chapter-01','chapter-02','timber-tractor','home-sweet-home']) assert(oldContext.window.titleCovers.resolve(id,'ru'), `${id} old flat registry`);
  if (!schemaOnly) for (const asset of assets) {
    const file = path.join(root, asset);
    assert(fs.existsSync(file), `Missing release asset: ${asset}`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.toString('ascii',0,4), 'RIFF', asset);
    assert.equal(bytes.toString('ascii',8,12), 'WEBP', asset);
  }
  console.log(`PASS six editions (178/28/21/23/36/70), all title languages, whitelist/negative cases, old stories/covers, ${assets.size} unique assets${schemaOnly?' (asset presence deferred)':''}`);
})().catch(error => {console.error(error); process.exitCode = 1;});
