(() => {
  const languages = ['ru', 'en', 'es'];
  let registry = {}, pending;
  const localized = value => languages.every(lang => typeof value?.[lang] === 'string' && value[lang].trim());

  const elderParts = ['papa-home', 'family-morning', 'forest-path', 'elder-house', 'beneath-roots'];
  function assetMatches(id, cover, lang) {
    const part = id === 'one-day-in-the-forest' ? 'papa-home' :
      elderParts.find(part => id === 'elder-' + part);
    if (part) return cover.assets[lang] === `images/published/elder-cycle/${part}-title-${lang}.webp`;
    return cover.assets[lang] === `images/covers/${id}/title/title-${lang}-v${cover.version}.png` ||
      cover.assets[lang] === `images/covers/${id}/title-${lang}-v${cover.version}.png`;
  }

  function valid(id, cover) {
    return /^[a-z0-9-]+$/.test(id) && ['approved', 'proposed'].includes(cover?.status) &&
      Number.isInteger(cover.version) && cover.version > 0 && cover.width === 1024 && cover.height === 1536 &&
      ['prepend', 'replace'].includes(cover.placement) && localized(cover.title) && localized(cover.alt) &&
      localized(cover.assets) && languages.every(lang =>
        assetMatches(id, cover, lang));
  }

  // Covers are optional: a missing registry never makes an existing book unavailable.
  function load() {
    return pending ||= (async () => {
      try {
        const response = await fetch('covers.json', {cache:'no-cache'});
        if (!response.ok) return;
        const data = await response.json();
        if (data.schemaVersion === 1) registry = Object.fromEntries(
          Object.entries(data.covers || {}).filter(([id, cover]) => valid(id, cover)));
      } catch { /* Existing scene artwork remains the fallback. */ }
    })();
  }

  // The reader and library use this same approval gate and localized lookup.
  function resolve(id, lang, search = location.search) {
    const cover = registry[id];
    if (!cover || !languages.includes(lang) ||
        (cover.status !== 'approved' && new URLSearchParams(search).get('coverPreview') !== '1')) return null;
    return {...cover, id, src:cover.assets[lang]};
  }

  function apply(image, cover, lang, fallback, onMissing) {
    function assign(asset) {
      image.src = asset.src;
      image.alt = asset.alt[lang] || asset.alt.en;
      image.width = asset.width;
      image.height = asset.height;
    }
    image.onerror = () => {
      image.onerror = null;
      if (fallback) assign(fallback);
      if (onMissing) onMissing();
    };
    assign(cover);
  }

  window.titleCovers = {load, resolve, apply};
})();
