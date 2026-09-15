(() => {
  const $ = id => document.getElementById(id);
  let artwork, translations, language = 'ru', printing = false;
  const chapterId = 'chapter-01';

  function route(lang) {
    const url = new URL(location.href);
    url.searchParams.set('chapter', '1');
    url.searchParams.set('lang', lang);
    url.hash = '';
    return url;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function render(fraction = 0) {
    const requested = new URL(location.href).searchParams.get('lang');
    language = ['ru', 'en', 'es'].includes(requested) ? requested : 'ru';
    history.replaceState(null, '', route(language));
    const ui = window.readerLabels[language];
    const translated = translations[chapterId]?.[language];
    const scenes = translated?.scenes || artwork.scenes[chapterId];
    const images = artwork.chapters[chapterId];
    document.documentElement.lang = language;
    document.title = ui.book + ' - ' + ui.chapter + ' 1';
    $('brand').replaceChildren(document.createTextNode(ui.book), element('span', '', ui.subtitle));
    $('brand').href = route(language);
    $('print').title = ui.print;
    $('print').setAttribute('aria-label', ui.print);
    $('print').disabled = false;
    $('export-status').textContent = '';
    document.querySelectorAll('[data-lang]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
    const article = element('article');
    article.lang = language;
    const header = element('header', 'chapter-heading');
    header.append(element('p', 'eyebrow', ui.chapter + ' 1'));
    header.append(element('h1', '', translated?.title || ui.title));
    article.append(header);
    scenes.forEach((scene, index) => {
      const section = element('section', 'scene');
      section.id = 'scene-' + (index + 1);
      section.setAttribute('aria-label', ui.scene + ' ' + (index + 1));
      const asset = images.find(image => image.scene === index + 1);
      const figure = element('figure', 'scene-art');
      const image = element('img');
      image.src = asset.src;
      image.alt = asset.alt[language] || asset.alt.en;
      image.width = asset.width;
      image.height = asset.height;
      image.loading = index === 0 ? 'eager' : 'lazy';
      image.decoding = 'async';
      if (index === 0) image.fetchPriority = 'high';
      figure.append(image);
      section.append(figure);
      section.append(element('div', 'scene-number',
        String(index + 1).padStart(2, '0') + ' / ' + String(scenes.length).padStart(2, '0')));
      if (scene.paragraphs.length) {
        const prose = element('div', 'prose');
        scene.paragraphs.forEach(paragraph => prose.append(element('p', '', paragraph)));
        section.append(prose);
      }
      article.append(section);
    });
    $('reader').replaceChildren(article);
    $('reader').setAttribute('aria-busy', 'false');
    requestAnimationFrame(() => {
      window.scrollTo(0, Math.max(0, document.documentElement.scrollHeight - innerHeight) * fraction);
      updateProgress();
    });
  }

  function updateProgress() {
    const range = document.documentElement.scrollHeight - innerHeight;
    $('progress').style.width = (range > 0 ? Math.min(100, Math.max(0, scrollY / range * 100)) : 100) + '%';
  }

  // Decode every illustration before opening the print dialog, including lazy images.
  async function preparePrint() {
    const images = [...document.querySelectorAll('.scene-art img')];
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(image => image.decode()));
    await document.fonts.ready;
  }
  window.prepareChapterPrint = preparePrint;

  $('print').onclick = async () => {
    if (printing || !artwork) return;
    printing = true;
    const ui = window.readerLabels[language];
    const controls = [...document.querySelectorAll('.toolbar button')];
    controls.forEach(button => { button.disabled = true; });
    $('export-status').textContent = ui.preparing;
    $('print').setAttribute('aria-busy', 'true');
    try {
      await preparePrint();
      $('export-status').textContent = '';
      window.print();
    } catch {
      $('export-status').textContent = ui.printError;
    } finally {
      controls.forEach(button => { button.disabled = false; });
      $('print').removeAttribute('aria-busy');
      printing = false;
    }
  };
  addEventListener('beforeprint', () =>
    document.querySelectorAll('.scene-art img').forEach(image => { image.loading = 'eager'; }));
  document.querySelectorAll('[data-lang]').forEach(button => {
    button.onclick = () => {
      if (!artwork || printing) return;
      const range = document.documentElement.scrollHeight - innerHeight;
      const fraction = range > 0 ? scrollY / range : 0;
      history.pushState(null, '', route(button.dataset.lang));
      render(fraction);
    };
  });
  addEventListener('popstate', () => { if (artwork && !printing) render(); });
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  new ResizeObserver(entries => {
    document.documentElement.style.setProperty('--toolbar-height', entries[0].target.getBoundingClientRect().height + 'px');
  }).observe(document.querySelector('.toolbar'));

  Promise.all(['illustrations.json', 'translations.json'].map(async path => {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(path + ': ' + response.status);
    return response.json();
  })).then(([art, text]) => {
    artwork = art;
    translations = text;
    render();
    window.lucide?.createIcons();
  }).catch(() => {
    $('reader').setAttribute('aria-busy', 'false');
    const lang = new URL(location.href).searchParams.get('lang');
    const ui = window.readerLabels[lang] || window.readerLabels.ru;
    const message = element('p', 'error', ui.loadError + ' ');
    const retry = element('a', '', ui.retry);
    retry.href = location.href;
    message.append(retry);
    $('reader').replaceChildren(message);
  });
})();
