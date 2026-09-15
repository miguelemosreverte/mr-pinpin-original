(() => {
  const $ = id => document.getElementById(id);
  let book, artwork, translations, chapterIndex = 0, language = 'ru';
  const titleFor = chapter => translations[chapter.id]?.[language]?.title || shortTitle(chapter.title);

  function route(index, lang) {
    const url = new URL(location.href);
    url.searchParams.set('chapter', String(index + 1));
    url.searchParams.set('lang', lang);
    url.hash = '';
    return url;
  }

  function readRoute() {
    const url = new URL(location.href);
    const value = url.searchParams.get('chapter') || url.hash.replace('#chapter-', '') || '1';
    const number = /^\d+$/.test(value) ? Number(value) : 1;
    chapterIndex = Math.min(book.chapters.length - 1, Math.max(0, number - 1));
    language = ['ru', 'en', 'es'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : 'ru';
    history.replaceState(null, '', route(chapterIndex, language));
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const shortTitle = title => title.replace(/^(?:Глава|Chapter)\s*\d*\s*:\s*/u, '');
  const artFor = chapter => artwork.chapters[chapter.id] || [];
  const sceneCount = chapter => artwork.scenes[chapter.id]?.length || 0;
  const complete = chapter => sceneCount(chapter) > 0 && artwork.scenes[chapter.id]
    .every((scene, index) => artFor(chapter).some(asset => asset.scene === index + 1));

  function illustration(asset, eager = false) {
    const image = el('img');
    image.src = asset.src;
    image.alt = typeof asset.alt === 'object' ? asset.alt[language] : asset.alt || '';
    image.width = asset.width;
    image.height = asset.height;
    image.loading = eager ? 'eager' : 'lazy';
    image.decoding = 'async';
    if (eager) image.fetchPriority = 'high';
    return image;
  }

  function go(index, lang = language, preservePosition = false) {
    if (!book || index < 0 || index >= book.chapters.length) return;
    const range = document.documentElement.scrollHeight - innerHeight;
    const fraction = preservePosition && range > 0 ? scrollY / range : 0;
    history.pushState(null, '', route(index, lang));
    render(fraction);
  }

  function render(fraction = 0) {
    readRoute();
    const ui = window.readerLabels[language];
    const chapter = book.chapters[chapterIndex];
    const translated = translations[chapter.id]?.[language];
    const scenes = translated?.scenes || artwork.scenes[chapter.id];
    const images = artFor(chapter);
    document.documentElement.lang = language;
    document.title = titleFor(chapter) + ' · ' + ui.book;
    $('brand').replaceChildren(document.createTextNode(ui.book), el('span', '', ui.subtitle));
    $('brand').href = route(0, language);
    $('brand').onclick = event => { event.preventDefault(); go(0); };
    $('original-link').textContent = ui.original;
    $('chapter-list').setAttribute('aria-label', ui.contents);
    document.querySelector('.chapter-strip').setAttribute('aria-label', ui.contents);
    for (const [id, key] of [['previous','previous'], ['next','next']]) {
      $(id).title = ui[key];
      $(id).setAttribute('aria-label', ui[key]);
    }
    document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
    const article = el('article');
    article.lang = translated ? language : 'ru';
    const header = el('header', 'chapter-heading');
    header.append(el('p', 'eyebrow', `${ui.chapter} ${chapterIndex + 1} / ${book.chapters.length}`));
    const heading = el('h1', '', titleFor(chapter));
    heading.tabIndex = -1;
    header.append(heading);
    header.append(el('p', 'status', complete(chapter) ? ui.illustrated : `${ui.newArt}: ${images.length} / ${scenes.length}`));
    if (language !== 'ru' && !translated) header.append(el('p', 'translation-notice', ui.fallback));
    article.append(header);

    scenes.forEach((scene, index) => {
      const section = el('section', 'scene');
      section.id = `scene-${index + 1}`;
      section.setAttribute('aria-label', `${ui.scene} ${index + 1}`);
      const asset = images.find(image => image.scene === index + 1);
      if (asset) {
        const figure = el('figure', 'scene-art');
        figure.append(illustration(asset, index === 0));
        section.append(figure);
      }
      section.append(el('div', 'scene-number', `${String(index + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`));
      const prose = el('div', 'prose');
      for (const paragraph of scene.paragraphs) prose.append(el('p', '', paragraph));
      section.append(prose);
      article.append(section);
    });

    const originals = chapter.blocks.flat().filter(part => part.type === 'image');
    if (originals.length) {
      const details = el('section', 'original-art');
      details.append(el('h2', '', ui.originalArt));
      const gallery = el('div', 'gallery');
      originals.forEach((asset, index) => gallery.append(illustration({...asset, alt: `${ui.originalArt}: ${index + 1}`})));
      details.append(gallery);
      article.append(details);
    }
    $('reader').replaceChildren(article);
    $('reader').setAttribute('aria-busy', 'false');
    $('previous').disabled = chapterIndex === 0;
    $('next').disabled = chapterIndex === book.chapters.length - 1;
    $('chapter-counter').textContent = `${chapterIndex + 1} / ${book.chapters.length}`;
    $('edition-count').textContent = `${ui.completed}: ${book.chapters.filter(complete).length} / ${book.chapters.length}`;
    $('chapter-list').replaceChildren(...book.chapters.map((item, index) => {
      const li = el('li'), link = el('a');
      link.href = route(index, language);
      if (index === chapterIndex) link.setAttribute('aria-current', 'page');
      link.textContent = String(index + 1).padStart(2, '0');
      link.title = `${ui.chapter} ${index + 1}: ${titleFor(item)} (${artFor(item).length} / ${sceneCount(item)} ${ui.illustrations})`;
      link.setAttribute('aria-label', link.title);
      link.onclick = event => { event.preventDefault(); go(index); };
      li.append(link);
      return li;
    }));
    requestAnimationFrame(() => {
      const selected = $('chapter-list').querySelector('[aria-current="page"]');
      if (selected) {
        const link = selected.getBoundingClientRect(), rail = $('chapter-list').getBoundingClientRect();
        $('chapter-list').scrollLeft += link.left - rail.left - (rail.width - link.width) / 2;
      }
      window.scrollTo(0, Math.max(0, document.documentElement.scrollHeight - innerHeight) * fraction);
      updateProgress();
    });
  }

  function updateProgress() {
    const range = document.documentElement.scrollHeight - innerHeight;
    $('progress').style.width = (range > 0 ? Math.min(100, Math.max(0, scrollY / range * 100)) : 100) + '%';
  }

  $('previous').onclick = () => go(chapterIndex - 1);
  $('next').onclick = () => go(chapterIndex + 1);
  document.querySelectorAll('[data-lang]').forEach(button => {
    button.onclick = () => go(chapterIndex, button.dataset.lang, true);
  });
  addEventListener('popstate', () => { if (book) render(); });
  addEventListener('scroll', updateProgress, {passive:true});
  addEventListener('resize', updateProgress);
  new ResizeObserver(entries => {
    document.documentElement.style.setProperty('--toolbar-height', entries[0].target.getBoundingClientRect().height + 'px');
  }).observe(document.querySelector('.toolbar'));
  addEventListener('keydown', event => {
    if (!book || /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(event.target.tagName)) return;
    if (event.key === 'ArrowLeft') go(chapterIndex - 1);
    if (event.key === 'ArrowRight') go(chapterIndex + 1);
  });
  Promise.all(['book.json', 'illustrations.json', 'translations.json'].map(async path => {
    const response = await fetch(path, {cache:'no-cache'});
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  })).then(([text, art, translated]) => {
    book = text; artwork = art; translations = translated;
    render();
    if (window.lucide) lucide.createIcons();
  }).catch(() => {
    $('reader').setAttribute('aria-busy', 'false');
    const message = el('p', 'error', 'Не удалось загрузить книгу. ');
    const retry = el('a', '', 'Попробовать снова');
    retry.href = location.href;
    message.append(retry);
    $('reader').replaceChildren(message);
  });
})();
