(() => {
  const $ = id => document.getElementById(id);
  let artwork, translations, language = 'ru', printing = false;
  const chapterId = 'chapter-01';
  const spreads = [
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
  ];

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
    const preview = new URL(location.href).searchParams.get('view') === 'print';
    document.documentElement.classList.toggle('print-preview', preview);
    $('paper-styles').media = preview ? 'all' : 'print';
    $('preview').setAttribute('aria-pressed', String(preview));
    $('preview').title = preview ? ui.reading : ui.preview;
    $('preview').setAttribute('aria-label', ui.preview);
    $('preview').disabled = false;
    const translated = translations[chapterId]?.[language];
    const scenes = translated?.scenes || artwork.scenes[chapterId];
    const images = artwork.chapters[chapterId];
    document.documentElement.lang = language;
    document.title = ui.book + ' - ' + ui.chapter + ' 1';
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
    spreads.forEach((spread, spreadIndex) => {
      const sheet = element('section', 'spread spread-' + spread.style + ' paper-' + spread.paper);
      sheet.id = 'spread-' + (spreadIndex + 1);
      spread.scenes.forEach(index => {
        const scene = scenes[index];
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
        image.loading = index === 0 || preview ? 'eager' : 'lazy';
        image.decoding = 'async';
        if (index === 0) image.fetchPriority = 'high';
        figure.append(image);
        section.append(figure);
        if (scene.paragraphs.length) {
          const prose = element('div', 'prose');
          if (index === 0) prose.append(header);
          scene.paragraphs.forEach(paragraph => {
            const p = element('p');
            if (index === 0 && typeof Intl.Segmenter === 'function') {
              const first = new Intl.Segmenter(language, { granularity:'sentence' }).segment(paragraph)[Symbol.iterator]().next().value.segment;
              p.append(element('span', 'opening-lead', first), document.createTextNode(paragraph.slice(first.length)));
            } else p.textContent = paragraph;
            prose.append(p);
          });
          section.append(prose);
        }
        sheet.append(section);
      });
      const folio = element('div', 'folio');
      const ornament = element('span', 'asterism', '* * *');
      ornament.setAttribute('aria-hidden', 'true');
      folio.append(ornament, element('span', 'page-number', String(spreadIndex + 1).padStart(2, '0')));
      sheet.append(folio);
      const slot = element('div', 'page-slot');
      slot.dataset.paper = spread.paper;
      const frame = element('div', 'page-frame');
      frame.append(sheet);
      slot.append(frame);
      article.append(slot);
    });
    $('reader').replaceChildren(article);
    $('reader').setAttribute('aria-busy', 'false');
    requestAnimationFrame(() => {
      resizePreview();
      if (mobilePaging()) $('reader').scrollLeft = ($('reader').scrollWidth - $('reader').clientWidth) * fraction;
      else window.scrollTo(0, Math.max(0, document.documentElement.scrollHeight - innerHeight) * fraction);
      updateProgress();
    });
  }

  function mobilePaging() {
    return innerWidth <= 600 && !document.documentElement.classList.contains('print-preview');
  }
  function position() {
    const range = mobilePaging() ? $('reader').scrollWidth - $('reader').clientWidth : document.documentElement.scrollHeight - innerHeight;
    return range > 0 ? (mobilePaging() ? $('reader').scrollLeft : scrollY) / range : 0;
  }
  function updateProgress() {
    $('progress').style.height = Math.min(100, Math.max(0, position() * 100)) + '%';
  }

  function resizePreview() {
    if (!document.documentElement.classList.contains('print-preview')) return;
    document.querySelectorAll('.page-slot').forEach(slot => {
      const paperWidth = (slot.dataset.paper === 'landscape' ? 297 : 210) * 96 / 25.4;
      slot.style.setProperty('--page-scale', slot.clientWidth / paperWidth);
    });
  }

  $('preview').onclick = () => {
    if (!artwork || printing) return;
    const fraction = position();
    const url = route(language);
    if (url.searchParams.get('view') === 'print') url.searchParams.delete('view');
    else url.searchParams.set('view', 'print');
    history.pushState(null, '', url);
    render(fraction);
  };

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
      const fraction = position();
      history.pushState(null, '', route(button.dataset.lang));
      render(fraction);
    };
  });
  addEventListener('popstate', () => { if (artwork && !printing) render(); });
  addEventListener('scroll', updateProgress, { passive: true });
  $('reader').addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', () => { resizePreview(); updateProgress(); });
  new ResizeObserver(() => { resizePreview(); updateProgress(); }).observe($('reader'));

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
