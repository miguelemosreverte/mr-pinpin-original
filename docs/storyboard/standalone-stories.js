(() => {
  const languages = ['en', 'es', 'ru'];
  const ids = ['timber-tractor'];
  const prefix = 'images/standalone/timber-tractor/';
  const sceneIds = [
    'scene-01', 'scene-02', 'scene-03', 'scene-04', 'scene-05', 'scene-06', 'scene-07',
    'scene-08', 'scene-09', 'scene-10', 'scene-11', 'scene-12', 'scene-13', 'scene-14',
    'scene-19', 'scene-20', 'scene-15', 'scene-16', 'scene-17', 'scene-18'
  ];
  const localized = value => languages.every(lang => typeof value?.[lang] === 'string' && value[lang].trim());

  function complete(story) {
    if (story?.id !== 'timber-tractor' || !localized(story.title) || !localized(story.cover) ||
        !Array.isArray(story.scenes) || story.scenes.length !== sceneIds.length ||
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

  async function load(id) {
    if (!ids.includes(id)) return null;
    try {
      const response = await fetch(`stories/${id}.json`, {cache:'no-cache'});
      if (!response.ok) return null;
      const story = await response.json();
      return complete(story) ? story : null;
    } catch { return null; }
  }

  function edition(story, lang) {
    return {
      title:story.title[lang], scenes:story.scenes.map(scene => ({paragraphs:scene.paragraphs[lang]})),
      images:story.scenes.map((scene, index) => ({...scene, scene:index + 1, src:index === 0 ? story.cover[lang] : scene.image}))
    };
  }
  window.standaloneStories = {complete, load, edition, available:async () => (await Promise.all(ids.map(load))).filter(Boolean)};
})();
