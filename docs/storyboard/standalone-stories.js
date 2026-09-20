(() => {
  const languages = ['en', 'es', 'ru'];
  const ids = ['timber-tractor'];
  const prefix = 'images/standalone/timber-tractor/';
  const localized = value => languages.every(lang => typeof value?.[lang] === 'string' && value[lang].trim());

  function complete(story) {
    if (story?.id !== 'timber-tractor' || !localized(story.title) || !localized(story.cover) ||
        !Array.isArray(story.scenes) || story.scenes.length !== 18 || !Array.isArray(story.spreads)) return false;
    if (!languages.every(lang => story.cover[lang] === prefix + (lang === 'en' ? 'title-v1.png' : `title-${lang}-v1.png`))) return false;
    if (!story.scenes.every((scene, index) => scene.id === `scene-${String(index + 1).padStart(2, '0')}` &&
        (index === 0 ? scene.image === prefix + 'title-v1.png' :
          new RegExp(`^${prefix}scene-${String(index + 1).padStart(2, '0')}(?:-v[1-9][0-9]*)?\\.png$`).test(scene.image)) &&
        scene.width === (index === 0 ? 1024 : 1536) && scene.height === (index === 0 ? 1536 : 1024) &&
        localized(scene.alt) && languages.every(lang => Array.isArray(scene.paragraphs?.[lang]) &&
          scene.paragraphs[lang].every(p => typeof p === 'string' && p.trim()) &&
          (index === 0 ? scene.paragraphs[lang].length === 0 : scene.paragraphs[lang].length > 0)))) return false;
    if (!story.spreads.length || !story.spreads.every(spread => /^[a-z][a-z-]*$/.test(spread.style) &&
        ['portrait', 'landscape'].includes(spread.paper) && Array.isArray(spread.scenes) && spread.scenes.length > 0 &&
        spread.scenes.every(Number.isInteger))) return false;
    if (story.spreads.flatMap(spread => spread.scenes).join(',') !== Array.from({length:18}, (_, i) => i).join(',')) return false;
    if (story.spreads[0].style !== 'cover' || story.spreads[0].paper !== 'portrait' || story.spreads[0].scenes.length !== 1) return false;
    // Keep the willow-twig answer behind a page turn after both setup shots.
    return story.spreads.at(-1).scenes.length === 1 && story.spreads.at(-1).scenes[0] === 17;
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
