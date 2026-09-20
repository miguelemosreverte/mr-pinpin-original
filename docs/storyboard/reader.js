(() => {
  const $ = id => document.getElementById(id);
  let artwork, translations, book, published, edition, story, language = 'ru', printing = false;
  let adjacentStories = [], loadedKey, navigation = 0;

  function route(lang) {
    const url = new URL(location.href);
    if (story) {
      url.searchParams.set('story', story.id);
      if (story.number === 2) url.searchParams.set('chapter', '2');
    } else {
      url.searchParams.delete('story');
      url.searchParams.set('chapter', String(edition.number));
    }
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
    closeControls();
    edition = story || window.chapterEditions.resolve(new URL(location.href).searchParams.get('chapter'), published);
    const { id:chapterId, number:chapterNumber, spreads } = edition;
    const requested = new URL(location.href).searchParams.get('lang');
    language = ['ru', 'en', 'es'].includes(requested) ? requested : 'ru';
    history.replaceState(null, '', route(language));
    const ui = window.readerLabels[language];
    document.querySelectorAll('.library-link').forEach(link => {
      link.href = libraryURL(language);
      link.title = ui.contents;
      link.setAttribute('aria-label', ui.contents);
    });
    $('library-label').textContent = ui.contents;
    const preview = new URL(location.href).searchParams.get('view') === 'print';
    document.documentElement.classList.toggle('print-preview', preview);
    $('paper-styles').media = preview ? 'all' : 'print';
    $('preview').setAttribute('aria-pressed', String(preview));
    $('preview').title = preview ? ui.reading : ui.preview;
    $('preview').setAttribute('aria-label', ui.preview);
    $('preview').disabled = false;
    const translated = story ? window.standaloneStories.edition(story, language) : translations[chapterId]?.[language];
    const scenes = translated?.scenes || artwork.scenes[chapterId];
    const images = story ? translated.images : artwork.chapters[chapterId];
    document.documentElement.lang = language;
    document.title = story ? translated.title : ui.book + ' - ' + ui.chapter + ' ' + chapterNumber;
    $('print').title = ui.print;
    $('print').setAttribute('aria-label', ui.print);
    $('print').disabled = false;
    $('export-status').textContent = '';
    document.querySelectorAll('[data-lang]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
    const article = element('article');
    if (story) {
      article.dataset.story = story.id;
      article.dataset.storyChapter = story.number ?? 1;
      article.setAttribute('aria-label', translated.title);
    } else article.dataset.chapter = chapterId;
    article.lang = language;
    const header = element('header', 'chapter-heading');
    if (!story) header.append(element('p', 'eyebrow', ui.chapter + ' ' + chapterNumber));
    header.append(element('h1', '', translated?.title || (chapterNumber === 1 ? ui.title :
      book.chapters.find(chapter => chapter.id === chapterId).title.replace(/^Глава\s*\d*\s*:\s*/, ''))));
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
          scene.paragraphs.forEach((paragraph, paragraphIndex) => {
            const p = element('p');
            if (!story && index === 0 && chapterNumber === 2 && paragraphIndex === 0) {
              p.append(element('span', 'opening-lead', paragraph));
            } else if (index === 0 && chapterNumber === 1 && typeof Intl.Segmenter === 'function') {
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
    renderChapterLinks();
    requestAnimationFrame(() => {
      resizePreview();
      window.scrollTo(0, Math.max(0, document.documentElement.scrollHeight - innerHeight) * fraction);
      updateProgress();
    });
  }

  function libraryURL(lang) {
    const url = new URL('library.html', location.href);
    url.search = location.search;
    url.searchParams.delete('story');
    url.searchParams.delete('chapter');
    url.searchParams.set('lang', lang);
    return url.href;
  }

  function renderChapterLinks() {
    $('story-chapters')?.remove();
    if (!story || !adjacentStories.length) return;
    const labels = {
      en:{previous:'Previous chapter',next:'Next chapter'},
      es:{previous:'Capítulo anterior',next:'Capítulo siguiente'},
      ru:{previous:'Предыдущая глава',next:'Следующая глава'}
    }[language];
    const links = element('span', 'story-chapters');
    links.id = 'story-chapters';
    adjacentStories.forEach(adjacent => {
      const previous = (adjacent.number ?? 1) < (story.number ?? 1);
      const url = route(language);
      url.searchParams.set('chapter', String(adjacent.number ?? 1));
      const link = element('a', '', labels[previous ? 'previous' : 'next']);
      link.href = url.href;
      link.rel = previous ? 'prev' : 'next';
      link.title = adjacent.title[language];
      link.onclick = event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        history.pushState(null, '', url);
        openRoute();
      };
      links.append(link);
    });
    document.querySelector('.reader-footer').append(links);
  }

  function position() {
    const range = document.documentElement.scrollHeight - innerHeight;
    return range > 0 ? scrollY / range : 0;
  }
  function closeControls() {
    document.documentElement.classList.remove('controls-open');
    $('controls-toggle').setAttribute('aria-expanded', 'false');
  }
  $('controls-toggle').onclick = () => {
    const open = document.documentElement.classList.toggle('controls-open');
    $('controls-toggle').setAttribute('aria-expanded', String(open));
  };
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.documentElement.classList.contains('controls-open')) {
      closeControls();
      $('controls-toggle').focus();
    }
  });
  addEventListener('click', event => {
    if (!event.target.closest('.toolbar,.controls-toggle')) closeControls();
  });
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
  addEventListener('popstate', () => { if (!printing) openRoute(); });
  addEventListener('scroll', updateProgress, { passive: true });
  $('reader').addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', () => { resizePreview(); updateProgress(); });
  new ResizeObserver(() => { resizePreview(); updateProgress(); }).observe($('reader'));

  async function initialize(url) {
    const requestedStory = url.searchParams.get('story');
    if (requestedStory !== null) {
      const selected = await window.standaloneStories.load(requestedStory, url.searchParams.get('chapter'));
      if (!selected) throw new Error('Story is not available');
      const adjacent = await window.standaloneStories.load(requestedStory, selected.number === 2 ? 1 : 2);
      return {story:selected, artwork:{}, published:new Set(), adjacentStories:adjacent ? [adjacent] : []};
    }
    const [art, text, original] = await Promise.all(['illustrations.json', 'translations.json', 'book.json'].map(async path => {
      const response = await fetch(path, { cache: 'no-cache' });
      if (!response.ok) throw new Error(path + ': ' + response.status);
      return response.json();
    }));
    return {published:await window.chapterEditions.available(art, text), artwork:art,
      translations:text, book:original, story:null, adjacentStories:[]};
  }
  function showError() {
    artwork = null;
    loadedKey = null;
    $('print').disabled = true;
    $('preview').disabled = true;
    $('story-chapters')?.remove();
    $('reader').setAttribute('aria-busy', 'false');
    const requested = new URL(location.href).searchParams.get('lang');
    const lang = ['en','es','ru'].includes(requested) ? requested : 'ru';
    const ui = window.readerLabels[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll('.library-link').forEach(link => {
      link.href = libraryURL(lang);
      link.title = ui.contents;
      link.setAttribute('aria-label', ui.contents);
    });
    $('library-label').textContent = ui.contents;
    const unavailable = {en:'This story is not available yet.', es:'Esta historia todavía no está disponible.', ru:'Эта история пока недоступна.'};
    const message = element('p', 'error', (new URL(location.href).searchParams.has('story') ? unavailable[lang] || unavailable.en : ui.loadError) + ' ');
    const retry = element('a', '', ui.retry);
    retry.href = location.href;
    message.append(retry);
    $('reader').replaceChildren(message);
    window.lucide?.createIcons();
  }

  async function openRoute() {
    const current = ++navigation;
    const url = new URL(location.href);
    const key = JSON.stringify([url.searchParams.get('story'), url.searchParams.get('chapter')]);
    if (loadedKey === key && artwork) { render(); return; }
    $('reader').setAttribute('aria-busy', 'true');
    $('print').disabled = true;
    $('preview').disabled = true;
    artwork = null;
    try {
      const data = await initialize(url);
      if (current !== navigation) return;
      ({artwork, translations, book, published, story, adjacentStories} = data);
      render();
      const rendered = new URL(location.href);
      loadedKey = JSON.stringify([rendered.searchParams.get('story'), rendered.searchParams.get('chapter')]);
      window.lucide?.createIcons();
    } catch {
      if (current === navigation) showError();
    }
  }
  openRoute();
})();
