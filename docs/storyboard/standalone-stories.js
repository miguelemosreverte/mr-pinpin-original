(() => {
  const languages = ['en', 'es', 'ru'];
  const chapters = [1, 2];
  const prefix = 'images/standalone/timber-tractor/';
  const sceneIds = [
    'scene-01', 'scene-02', 'scene-03', 'scene-04', 'scene-05', 'scene-06', 'scene-07',
    'scene-08', 'scene-09', 'scene-10', 'scene-11', 'scene-12', 'scene-13', 'scene-14',
    'scene-19', 'scene-20', 'scene-15', 'scene-16', 'scene-17', 'scene-18'
  ];
  const localized = value => languages.every(lang => typeof value?.[lang] === 'string' && value[lang].trim());

  function chapterNumber(value) {
    if (value === undefined || value === null) return 1;
    return value === 1 || value === '1' ? 1 : value === 2 || value === '2' ? 2 : null;
  }

  function complete(story, chapter = story?.number ?? 1) {
    const number = chapterNumber(chapter);
    if (!number || story?.id !== 'timber-tractor' ||
        (number === 1 ? story.number !== undefined && story.number !== 1 : story.number !== 2) ||
        !localized(story.title) || !localized(story.cover)) return false;
    if (number === 2) return completeHome(story);
    if (!Array.isArray(story.scenes) || story.scenes.length !== sceneIds.length ||
        !Array.isArray(story.spreads) || story.spreads.length !== 14) return false;
    if (!languages.every(lang => story.cover[lang] === prefix + (lang === 'en' ? 'title-v1.png' : `title-${lang}-v1.png`))) return false;
    if (!story.scenes.every((scene, index) => scene?.id === sceneIds[index] && typeof scene.image === 'string' &&
        (index === 0 ? scene.image === prefix + 'title-v1.png' :
          new RegExp(`^${prefix}${sceneIds[index]}(?:-v[1-9][0-9]*)?\\.png$`).exec(scene.image)?.[0] === scene.image) &&
        scene.width === (index === 0 ? 1024 : 1536) && scene.height === (index === 0 ? 1536 : 1024) &&
        localized(scene.alt) && languages.every(lang => Array.isArray(scene.paragraphs?.[lang]) &&
          scene.paragraphs[lang].every(p => typeof p === 'string' && p.trim()) &&
          (index === 0 ? scene.paragraphs[lang].length === 0 : scene.paragraphs[lang].length > 0)))) return false;
    if (!story.spreads.every(spread => spread && typeof spread.style === 'string' &&
        /^[a-z][a-z-]*$/.exec(spread.style)?.[0] === spread.style &&
        ['portrait', 'landscape'].includes(spread.paper) && Array.isArray(spread.scenes) && spread.scenes.length > 0 &&
        spread.scenes.every(Number.isInteger))) return false;
    if (story.spreads.flatMap(spread => spread.scenes).join(',') !== sceneIds.map((_, i) => i).join(',')) return false;
    if (story.spreads[0].style !== 'cover' || story.spreads[0].paper !== 'portrait' || story.spreads[0].scenes.length !== 1) return false;
    if (!['scene-19', 'scene-20'].every(id => story.spreads.some(spread =>
        spread.paper === 'landscape' && spread.scenes.length === 1 && spread.scenes[0] === sceneIds.indexOf(id)))) return false;
    // Keep the willow-twig answer behind a page turn after both setup shots.
    return story.spreads.at(-1).scenes.length === 1 && story.spreads.at(-1).scenes[0] === sceneIds.indexOf('scene-18');
  }

  function completeHome(story) {
    const homePrefix = prefix + 'chapter-02/';
    const groups = [[0,1],[2,3],[4],[5],[6],[7],[8],[9]];
    if (!languages.every(lang => story.cover[lang] === homePrefix + 'scene-05.png') ||
        !Array.isArray(story.scenes) || story.scenes.length !== 10 ||
        !Array.isArray(story.spreads) || story.spreads.length !== groups.length) return false;
    if (!story.scenes.every((scene, index) => {
      const id = 'scene-' + String(index + 1).padStart(2, '0');
      return scene?.id === id && typeof scene.image === 'string' &&
        new RegExp(`^${homePrefix}${id}(?:-v[1-9][0-9]*)?\\.png$`).exec(scene.image)?.[0] === scene.image &&
        scene.width === 1536 && scene.height === 1024 && localized(scene.alt) &&
        languages.every(lang => Array.isArray(scene.paragraphs?.[lang]) && scene.paragraphs[lang].length > 0 &&
          scene.paragraphs[lang].every(p => typeof p === 'string' && p.trim()));
    })) return false;
    return story.spreads.every((spread, index) => spread && typeof spread.style === 'string' &&
      /^[a-z][a-z-]*$/.exec(spread.style)?.[0] === spread.style && spread.style !== 'cover' &&
      spread.paper === (index < 2 ? 'portrait' : 'landscape') && Array.isArray(spread.scenes) &&
      spread.scenes.every(Number.isInteger) && spread.scenes.join(',') === groups[index].join(','));
  }

  async function load(id, chapter) {
    const number = chapterNumber(chapter);
    if (id !== 'timber-tractor' || !number) return null;
    try {
      const suffix = number === 1 ? '' : '-chapter-02';
      const response = await fetch(`stories/${id}${suffix}.json`, {cache:'no-cache'});
      if (!response.ok) return null;
      const story = await response.json();
      return complete(story, number) ? story : null;
    } catch { return null; }
  }

  function edition(story, lang) {
    return {
      title:story.title[lang], scenes:story.scenes.map(scene => ({paragraphs:scene.paragraphs[lang]})),
      images:story.scenes.map((scene, index) => ({...scene, scene:index + 1,
        src:index === 0 && (story.number ?? 1) === 1 ? story.cover[lang] : scene.image}))
    };
  }
  window.standaloneStories = {complete, load, edition,
    available:async () => (await Promise.all(chapters.map(chapter => load('timber-tractor', chapter)))).filter(Boolean)};
})();
