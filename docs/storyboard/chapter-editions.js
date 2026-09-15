(() => {
  const editions = {
    '1': { id:'chapter-01', number:1, sceneCount:15, spreads:[
      { style:'opening', paper:'portrait', scenes:[0] },
      { style:'walk', paper:'portrait', scenes:[1] },
      { style:'discovery', paper:'portrait', scenes:[2,3] },
      { style:'magic', paper:'portrait', scenes:[4,5] },
      { style:'spring', paper:'portrait', scenes:[6,7] },
      { style:'return', paper:'portrait', scenes:[8,9] },
      { style:'dive', paper:'portrait', scenes:[10,11] },
      { style:'sunlight', paper:'landscape', scenes:[12] },
      { style:'surface', paper:'landscape', scenes:[13] },
      { style:'hello', paper:'landscape', scenes:[14] }
    ] },
    '2': { id:'chapter-02', number:2, sceneCount:16, spreads:[
      { style:'opening', paper:'portrait', scenes:[0] },
      { style:'arrival', paper:'portrait', scenes:[1,2] },
      { style:'greeting', paper:'portrait', scenes:[3,4] },
      { style:'listening', paper:'landscape', scenes:[5] },
      { style:'wisdom', paper:'portrait', scenes:[6,7] },
      { style:'question', paper:'landscape', scenes:[8] },
      { style:'memory', paper:'portrait', scenes:[9,10] },
      { style:'lesson', paper:'portrait', scenes:[11,12] },
      { style:'sunset', paper:'landscape', scenes:[13] },
      { style:'pause', paper:'landscape', scenes:[14] },
      { style:'reveal', paper:'landscape', scenes:[15] }
    ] }
  };

  function complete(edition, art, translations) {
    const images = art.chapters?.[edition.id];
    const validScenes = scenes => Array.isArray(scenes) && scenes.length === edition.sceneCount &&
      scenes.every(scene => Array.isArray(scene?.paragraphs) && scene.paragraphs.every(p => typeof p === 'string' && p.trim())) &&
      scenes.slice(0,14).every(scene => scene.paragraphs.length > 0) &&
      scenes[14].paragraphs.length === 0 && scenes[15].paragraphs.length === 0;
    return Array.isArray(images) && images.length === edition.sceneCount &&
      Array.from({length:edition.sceneCount}, (_, i) => i + 1).every(number => {
        const matches = images.filter(asset => asset.scene === number);
        const asset = matches[0];
        return matches.length === 1 && typeof asset.src === 'string' && asset.src.startsWith('images/') &&
          Number.isInteger(asset.width) && asset.width > 0 && Number.isInteger(asset.height) && asset.height > 0 &&
          ['en','es','ru'].every(lang => typeof asset.alt?.[lang] === 'string' && asset.alt[lang].trim());
      }) && validScenes(art.scenes?.[edition.id]) && ['en','es'].every(lang => {
        const text = translations[edition.id]?.[lang];
        return typeof text?.title === 'string' && text.title.trim() && validScenes(text.scenes);
      }) && (!translations[edition.id]?.ru || validScenes(translations[edition.id].ru.scenes));
  }

  function available(art, translations) {
    const published = new Set(['1']);
    const edition = editions['2'];
    if (complete(edition, art, translations)) published.add('2');
    return published;
  }

  window.chapterEditions = { editions, available, resolve:(requested, published) =>
    editions[published.has(requested) ? requested : '1'] };
})();
