(() => {
  const languages = ['ru', 'en', 'es'];
  let registry = {}, pending;
  const localized = value => languages.every(lang => typeof value?.[lang] === 'string' && value[lang].trim());

  function valid(id, cover) {
    return /^[a-z0-9-]+$/.test(id) && ['approved', 'proposed'].includes(cover?.status) &&
      Number.isInteger(cover.version) && cover.version > 0 && cover.width === 1024 && cover.height === 1536 &&
      ['prepend', 'replace'].includes(cover.placement) && localized(cover.title) && localized(cover.alt) &&
      localized(cover.assets) && languages.every(lang =>
        cover.assets[lang] === `images/covers/${id}/title-${lang}-v${cover.version}.png`);
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

  // Miniature approval is independent of the localized title cover's approval.
  function resolveMiniature(id, lang, {allowProposed = false} = {}) {
    const cover = registry[id], miniature = cover?.miniature;
    if (!languages.includes(lang) || !miniature ||
        !['approved', 'proposed'].includes(miniature.status) ||
        (miniature.status !== 'approved' && allowProposed !== true) ||
        !Number.isInteger(miniature.version) || miniature.version < 1 ||
        miniature.width !== 1024 || miniature.height !== 1536 ||
        miniature.textFree !== true || miniature.languageIndependent !== true ||
        miniature.asset !== `images/covers/${id}/miniature/miniature-v${miniature.version}.png`) return null;
    const derivatives = miniature.derivatives;
    const responsive = Array.isArray(derivatives) && derivatives.length === 3 &&
      derivatives.every((asset, index) => asset.width === [256, 512, 1024][index] &&
        asset.height === asset.width * 3 / 2 &&
        asset.src === miniature.asset.replace('.png', `-${asset.width}.webp`));
    return {...miniature, id, src:miniature.asset, title:cover.title, alt:cover.title,
      ...(responsive ? {srcset:derivatives.map(asset => `${asset.src} ${asset.width}w`).join(', ')} : {})};
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

  window.titleCovers = {load, resolve, resolveMiniature, apply};
})();
