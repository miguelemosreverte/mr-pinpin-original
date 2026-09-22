const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../docs/storyboard');
const story = JSON.parse(fs.readFileSync(path.join(root, 'stories/home-sweet-home.json')));

function setup(missing) {
  const requests = [];
  const context = vm.createContext({window:{}, fetch:async (name, options) => {
    requests.push({name, method:options?.method});
    return {ok:name !== missing, json:async () => structuredClone(story)};
  }});
  vm.runInContext(fs.readFileSync(path.join(root, 'standalone-stories.js'), 'utf8'), context);
  return {api:context.window.standaloneStories, requests};
}

test('canonical Home number 3 and bedtime-cover load all twenty narrative scenes', async () => {
  const {api, requests} = setup();
  assert.equal(story.number, 3);
  assert.equal(story.scenes[0].id, 'bedtime-cover');
  assert.equal(story.scenes.length, 21);
  assert.equal(story.spreads.length, 21);
  assert.equal(api.complete(story), true);
  for (const chapter of [undefined, '1', '3']) {
    const loaded = await api.load('home-sweet-home', chapter);
    assert.equal(loaded.number, 3);
    assert.deepEqual(loaded.scenes, story.scenes);
  }
  assert.equal(new Set(requests.filter(request => request.method === 'HEAD').map(request => request.name)).size, 23);
});

test('Home keeps localized original cover fallbacks and rejects incomplete content', () => {
  const {api} = setup();
  for (const lang of ['en', 'es', 'ru']) {
    const edition = api.edition(story, lang);
    assert.equal(edition.images[0].src, story.cover[lang]);
    assert.equal(edition.title, story.title[lang]);
    assert.equal(edition.images[20].src, story.scenes[20].image);
  }
  for (const change of [value => { value.number = 1; }, value => { value.scenes[0].id = 'title'; },
    value => { value.scenes.pop(); }, value => { value.scenes[1].paragraphs.es = []; }]) {
    const invalid = structuredClone(story);
    change(invalid);
    assert.equal(api.complete(invalid), false);
  }
});

test('missing narrative artwork blocks Home but optional standardized covers do not', async () => {
  assert.equal(await setup(story.scenes[20].image).api.load('home-sweet-home'), null);
  assert.ok(await setup('images/covers/home-sweet-home/title-es-v1.png').api.load('home-sweet-home'));
});
