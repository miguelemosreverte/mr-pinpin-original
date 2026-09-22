(() => {
  const $ = id => document.getElementById(id), angles = Array.from({ length: 24 }, (_, i) => i * 15);
  const labels = { pinpin: 'PinPin', mama: 'Mama', 'mr-pompom': 'Mr. PomPom' };
  const views = new Map(), visible = new Set(), failed = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, duration = 190, paused = reduced.matches, raf = 0, last = null, elapsed = 0, loading = false, manifest;
  let stage = null, stageVisible = true, activeElapsed = 0, manualFrame = null, lastStagePaint = -Infinity;
  const cache = AtlasSpriteCache.create({ maxEntries: 10, maxBytes: 64 * 1024 * 1024,
    onReady() { stage?.invalidateFaces(); paintVisible(); paintStage(); } });
  const url = src => new URL('../' + src, location.href).href;
  const source = (spec, direction) => direction.runtimeSrc || direction.src || spec.runtimeSrc || spec.src;
  function node(tag, text, className) {
    const value = document.createElement(tag); if (text) value.textContent = text; if (className) value.className = className; return value;
  }
  function link(text, href) { const value = node('a', text); value.href = href; return value; }
  function controls() {
    $('play').title = $('play').ariaLabel = paused ? 'Play animation' : 'Pause animation';
    $('play').innerHTML = '<i data-lucide="' + (paused ? 'play' : 'pause') + '" aria-hidden="true"></i>';
    document.querySelector(`input[name="frame"][value="${frame}"]`).checked = true;
    document.body.dataset.frame = String(frame); document.body.dataset.paused = String(paused);
    window.lucide?.createIcons();
  }
  function paint(view) {
    if (!view.direction) return;
    const image = cache.peek(view.src), { canvas, width, height } = view;
    if (!image) {
      view.status.textContent = failed.has(view.src) ? 'Source unavailable' : 'Loading source...';
      view.status.dataset.error = String(failed.has(view.src)); return;
    }
    const dpr = Math.min(3, devicePixelRatio || 1);
    if (canvas.width !== Math.ceil(width * dpr)) canvas.width = Math.ceil(width * dpr);
    if (canvas.height !== Math.ceil(height * dpr)) canvas.height = Math.ceil(height * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const item = view.direction.frames[frame], scale = view.scale;
    ctx.strokeStyle = document.body.dataset.background === 'dark' ? '#6c8173' : '#c9d4cc';
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, view.ground + .5); ctx.lineTo(width - 10, view.ground + .5); ctx.stroke();
    ctx.drawImage(image, ...item.rect, view.anchorX - item.anchor[0] * scale, view.ground - item.anchor[1] * scale,
      item.rect[2] * scale, item.rect[3] * scale);
    canvas.dataset.frame = String(frame); canvas.dataset.ready = 'true';
    view.status.textContent = ''; view.status.dataset.error = 'false';
  }
  function paintVisible() { for (const view of visible) paint(view); }
  function paintStage() {
    if (!stage || !stageVisible) return;
    stage.paint(activeElapsed, manualFrame, duration);
    $('clock').textContent = (activeElapsed / 1000).toFixed(1) + ' s';
    if ($('face-diagnostics').open) $('face-data').textContent = JSON.stringify(stage.diagnostics, null, 2);
  }
  function sourcesNeeded() { return [...new Set([...(stageVisible ? stage?.sources || [] : []), ...[...visible].map(view => view.src).filter(Boolean)])]; }
  async function loadVisible() {
    if (loading) return;
    loading = true;
    try {
      for (;;) {
        const sources = sourcesNeeded();
        cache.protect(sources);
        const src = sources.find(src => !cache.peek(src) && !failed.has(src));
        if (!src) break;
        if (!await cache.load(src)) failed.add(src);
        paintVisible(); paintStage();
      }
    } finally { loading = false; }
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const view = views.get(entry.target);
      if (entry.isIntersecting) { visible.add(view); paint(view); }
      else {
        visible.delete(view); view.canvas.width = view.canvas.height = 1; view.canvas.dataset.ready = 'false';
      }
    }
    cache.protect(sourcesNeeded()); loadVisible();
  }, { rootMargin: '160px' });
  new IntersectionObserver(entries => {
    stageVisible = entries[0].isIntersecting;
    if (stageVisible) paintStage();
    cache.protect(sourcesNeeded()); loadVisible();
  }, { rootMargin: '100px' }).observe($('walking'));
  function preview(parent, spec, angle, zoom, label, cohort, common) {
    const direction = spec?.directions?.find(item => item.angle === angle);
    const figure = node('figure'), caption = node('figcaption');
    caption.append(node('span', label), node('span', `${zoom}x / ${spec.displayWidth} world px`));
    const scroll = node('div', null, 'canvas-scroll'), canvas = node('canvas'), status = node('p', '', 'asset-status');
    figure.append(caption, scroll, status); scroll.append(canvas); parent.append(figure);
    canvas.dataset.character = spec.id; canvas.dataset.angle = String(angle); canvas.dataset.zoom = String(zoom); canvas.dataset.cohort = cohort;
    canvas.ariaLabel = `${label}, ${angle} degrees, ${zoom} times world size`;
    if (!direction || direction.frames?.length !== 4 || !(direction.referenceWidth || spec.referenceWidth)) {
      status.textContent = 'Heading unavailable'; status.dataset.error = 'true'; canvas.style.height = '120px'; return;
    }
    const scale = spec.displayWidth * zoom / (direction.referenceWidth || spec.referenceWidth);
    const width = Math.ceil(Math.max(220, (common.left + common.right) * zoom + 24));
    const height = Math.ceil(Math.max(110, (common.above + common.below) * zoom + 24));
    const ground = height - common.below * zoom - 12, anchorX = (width + (common.left - common.right) * zoom) / 2;
    canvas.width = canvas.height = 1; canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    const view = { canvas, direction, scale, width, height, ground, anchorX, status, src: url(source(spec, direction)) };
    views.set(canvas, view); observer.observe(canvas);
  }
  function extents(spec, angle) {
    const d = spec?.directions?.find(item => item.angle === angle);
    if (!d?.frames?.length || !(d.referenceWidth || spec.referenceWidth)) return { left: 0, right: 0, above: 0, below: 0 };
    const scale = spec.displayWidth / (d.referenceWidth || spec.referenceWidth);
    return { left: Math.max(...d.frames.map(f => f.anchor[0] * scale)),
      right: Math.max(...d.frames.map(f => (f.rect[2] - f.anchor[0]) * scale)),
      above: Math.max(...d.frames.map(f => f.anchor[1] * scale)),
      below: Math.max(...d.frames.map(f => (f.rect[3] - f.anchor[1]) * scale)) };
  }
  function build() {
    const original = { ...window.atlasDirections, id: 'pinpin', displayWidth: 56 };
    for (const id of ['pinpin', 'mama', 'mr-pompom']) {
      const spec = manifest.characters.find(character => character.id === id);
      if (!spec) continue;
      const section = node('section', null, 'character ' + id); section.id = id;
      const heading = node('div', null, 'character-heading');
      heading.append(node('h2', labels[id]), node('p', `${spec.directions.length}/24 headings / ${spec.displayWidth} world px / ${spec.reviewStatus || manifest.reviewStatus}`));
      section.append(heading); $('characters').append(section);
      for (const angle of angles) {
        const direction = spec.directions.find(item => item.angle === angle), row = node('article', null, 'heading-row');
        row.dataset.character = id; row.dataset.angle = String(angle); row.id = id + '-' + angle;
        const title = node('div', null, 'row-heading');
        title.append(node('h3', angle + '\u00b0'), node('p', `Reference ${direction?.referenceWidth || spec.referenceWidth || '?'} source px / ${direction?.frames?.length || 0} frames`));
        row.append(title); section.append(row);
        const grid = node('div', null, 'sprite-grid'); row.append(grid);
        const common = extents(spec, angle);
        if (id === 'pinpin') {
          const before = extents(original, angle);
          for (const key of Object.keys(common)) common[key] = Math.max(common[key], before[key]);
          preview(grid, original, angle, 1, 'Before', 'before', common);
          preview(grid, spec, angle, 1, 'Production', 'production', common);
          preview(grid, original, angle, 4, 'Before', 'before', common);
          preview(grid, spec, angle, 4, 'Production', 'production', common);
        } else {
          preview(grid, spec, angle, 1, labels[id], 'production', common);
          preview(grid, spec, angle, 4, labels[id], 'production', common);
        }
        const links = node('div', null, 'row-links'); row.append(links);
        if (direction) links.append(link('Production sheet', url(direction.src || source(spec, direction))));
        if (id === 'pinpin') {
          const before = original.directions.find(d => d.angle === angle);
          if (before) links.append(link('Before sheet', url(before.src || source(original, before))));
        }
        const detail = node('details'), summary = node('summary', 'Metadata');
        detail.append(summary, node('pre', JSON.stringify({ character: id, angle, displayWidth: spec.displayWidth,
          headingAssessment: spec.headingAssessment, direction, before: id === 'pinpin' ? original.directions.find(d => d.angle === angle) : undefined }, null, 2)));
        row.append(detail);
      }
    }
    const count = manifest.characters.reduce((sum, c) => sum + c.directions.reduce((n, d) => n + d.frames.length, 0), 0);
    $('status').textContent = `${manifest.characters.length} characters / ${count} frames / ${manifest.reviewStatus}`;
    $('inventory').textContent = `${manifest.angleConvention} / ${manifest.assetVersion}`;
    document.body.dataset.ready = 'true';
  }
  function tick(now) {
    raf = 0; if (paused || document.hidden) return;
    const delta = last === null ? 0 : now - last;
    activeElapsed += delta; elapsed += delta; last = now;
    if (now - lastStagePaint >= 33) { paintStage(); lastStagePaint = now; }
    if (elapsed >= duration) {
      frame = (frame + Math.floor(elapsed / duration)) % 4; elapsed %= duration;
      document.querySelector(`input[name="frame"][value="${frame}"]`).checked = true;
      document.body.dataset.frame = String(frame); paintVisible();
    }
    raf = requestAnimationFrame(tick);
  }
  function run() { cancelAnimationFrame(raf); raf = 0; last = null; if (!paused && !document.hidden) raf = requestAnimationFrame(tick); }
  function selectFrame(value) { frame = (value + 4) % 4; manualFrame = frame; paused = true; elapsed = 0; controls(); run(); paintVisible(); paintStage(); }
  $('play').onclick = () => { paused = !paused; if (!paused) manualFrame = null; controls(); run(); };
  $('previous').onclick = () => selectFrame(frame - 1); $('next').onclick = () => selectFrame(frame + 1);
  document.querySelectorAll('input[name="frame"]').forEach(input => input.onchange = () => selectFrame(Number(input.value)));
  document.querySelectorAll('input[name="background"]').forEach(input => input.onchange = () => { document.body.dataset.background = input.value; paintVisible(); });
  $('duration').onchange = () => { duration = Math.max(50, Math.min(1000, Number($('duration').value) || 190)); $('duration').value = duration; elapsed = 0; };
  $('reload').onclick = () => location.reload();
  document.addEventListener('visibilitychange', run); addEventListener('resize', () => { paintVisible(); paintStage(); });
  addEventListener('pagehide', () => { cancelAnimationFrame(raf); raf = 0; }); addEventListener('pageshow', run);
  reduced.addEventListener('change', event => { stage?.setReducedMotion(event.matches); if (event.matches) { paused = true; controls(); run(); } });
  $('face-diagnostics').ontoggle = () => {
    if (stage && $('face-diagnostics').open) $('face-data').textContent = JSON.stringify(stage.diagnostics, null, 2);
  };
  function angleStep(delta) { if (!stage) return; stage.setAngle(stage.angle + delta); $('stage-angle').textContent = stage.angle + '\u00b0'; loadVisible(); }
  $('angle-back').onclick = () => angleStep(-15); $('angle-next').onclick = () => angleStep(15);
  window.familyProductionReview = Object.freeze({ get stats() { return { frame, paused, canvases: views.size,
    visible: visible.size, cache: cache.stats, failed: [...failed], characters: manifest?.characters.length || 0,
    elapsed: activeElapsed, stage: stage?.diagnostics }; } });
  controls();
  fetch('../family-production.json', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw Error('Production manifest unavailable'); return response.json();
  }).then(async value => {
    manifest = value;
    const faces = await fetch('../family-faces.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : { frames: {} }).catch(() => ({ frames: {} }));
    stage = FamilyProductionStage.create({ canvas: $('walking-canvas'), manifest, faceMetadata: faces, cache, url, reducedMotion: reduced.matches });
    paintStage(); build(); loadVisible(); run();
  }).catch(error => { $('status').textContent = error.message; $('status').dataset.error = 'true'; });
})();
