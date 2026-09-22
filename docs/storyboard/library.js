(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const languages = ['ru','en','es'];
  const words = {
    ru:{title:'Наша библиотека',eyebrow:'В гостях у Пин-Пина',intro:'Выберите книжку, чтобы скачать её и читать вместе.',home:'Домой',atlas:'Карта леса',search:'Найти книжку',loading:'Загружаем библиотеку…',error:'Не получилось открыть библиотеку. Попробуйте ещё раз.',retry:'Попробовать ещё раз',empty:'Такой книжки пока нет на этой полке.',count:n=>`Книжек на полке: ${n}`,pages:n=>`${n} стр.`,coloring:'3 страницы для раскрашивания',download:'Скачать PDF',unavailable:'Книжка готовится',note:'Книжки для семейного чтения · PDF',permissions:'Правила использования',original:'Оригинальная книга',cancel:'Отменить',downloading:'Скачиваем',checking:'Проверяем книжку…',done:'Книжка готова. Скачивание началось.',failed:'Не получилось скачать книжку. Нажмите на обложку, чтобы попробовать ещё раз.',cancelled:'Скачивание отменено.',shelf:n=>`Полка ${n}`,skip:'Перейти к книжкам',language:'Язык книжек'},
    en:{title:'Our little library',eyebrow:'At home with PinPin',intro:'Choose a book to download and read together.',home:'Back home',atlas:'Forest map',search:'Find a book',loading:'Opening the library…',error:'The library could not be opened. Please try again.',retry:'Try again',empty:'No books on this shelf match your search.',count:n=>`${n} books on the shelf`,pages:n=>`${n} pages`,coloring:'3 coloring pages',download:'Download PDF',unavailable:'Book coming soon',note:'Books for reading together · PDF',permissions:'Permissions',original:'Original book',cancel:'Cancel',downloading:'Downloading',checking:'Checking your book…',done:'Your book is ready. The download has started.',failed:'The book could not be downloaded. Select its cover to try again.',cancelled:'Download cancelled.',shelf:n=>`Shelf ${n}`,skip:'Skip to the books',language:'Book language'},
    es:{title:'Nuestra biblioteca',eyebrow:'En casa de PinPin',intro:'Elige un libro para descargarlo y leer juntos.',home:'Volver a casa',atlas:'Mapa del bosque',search:'Buscar un libro',loading:'Abriendo la biblioteca…',error:'No se pudo abrir la biblioteca. Inténtalo de nuevo.',retry:'Intentar de nuevo',empty:'Ningún libro de esta estantería coincide con la búsqueda.',count:n=>`${n} libros en la estantería`,pages:n=>`${n} páginas`,coloring:'3 páginas para colorear',download:'Descargar PDF',unavailable:'Libro en preparación',note:'Libros para leer en familia · PDF',permissions:'Permisos',original:'Libro original',cancel:'Cancelar',downloading:'Descargando',checking:'Comprobando tu libro…',done:'Tu libro está listo. La descarga ha comenzado.',failed:'No se pudo descargar el libro. Selecciona su portada para intentarlo de nuevo.',cancelled:'Descarga cancelada.',shelf:n=>`Estante ${n}`,skip:'Ir a los libros',language:'Idioma de los libros'}
  };
  const language = () => languages.includes(new URL(location.href).searchParams.get('lang')) ? new URL(location.href).searchParams.get('lang') : 'ru';
  let chapters = [], loaded = false, loading = false, task = null, lastMessage = '';
  const shelfMedia = [matchMedia('(max-width:599px)'), matchMedia('(max-width:959px)')];
  const columns = () => shelfMedia[0].matches ? 1 : shelfMedia[1].matches ? 2 : 3;
  const localized = (value, lang) => typeof value === 'string' ? value : value?.[lang] || value?.en || value?.ru || '';
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function pictureURL(value) {
    if (typeof value !== 'string' || !value) return null;
    try { const url = new URL(value, location.href); return url.origin === location.origin && ['http:','https:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  }
  function renderDownloadState() {
    const lang = language(), ui = words[lang];
    $('download-tray').hidden = !task;
    if (!task) return;
    const title = localized(task.chapter.title, task.lang);
    const percent = Math.min(100, Math.floor(task.received / task.total * 100));
    const text = task.phase === 'checking' ? ui.checking : `${ui.downloading} · ${title} · ${percent}%`;
    if (text !== lastMessage) { $('download-status').textContent = text; lastMessage = text; }
    $('download-progress').value = percent;
    $('download-progress').setAttribute('aria-label', text);
    $('cancel-download').textContent = ui.cancel;
  }
  async function startDownload(chapter) {
    if (task) return;
    const lang = language(), pdf = chapter.pdf?.[lang];
    if (!window.libraryDownload.validPDF(pdf)) return;
    task = {chapter, lang, controller:new AbortController(), received:0, total:pdf.bytes, phase:'downloading'};
    const active = task;
    $('library-status').textContent = '';
    render();
    try {
      await window.libraryDownload.download(pdf, {signal:active.controller.signal, filename:`${chapter.id}-${lang}.pdf`, onProgress:progress => { Object.assign(active, progress); renderDownloadState(); }});
      $('library-status').textContent = words[language()].done;
    } catch (error) {
      $('library-status').textContent = error.name === 'AbortError' ? words[language()].cancelled : words[language()].failed;
    } finally {
      task = null; renderDownloadState(); updateButtons();
      document.querySelector(`[data-download="${chapter.id}"]`)?.focus({preventScroll:true});
    }
  }
  function updateButtons() {
    const lang = language();
    document.querySelectorAll('[data-download]').forEach(button => {
      const chapter = chapters.find(chapter => chapter.id === button.dataset.download);
      button.disabled = Boolean(task) || !window.libraryDownload.validPDF(chapter?.pdf?.[lang]);
      button.classList.toggle('is-downloading', task?.chapter.id === chapter.id);
      button.setAttribute('aria-busy', String(task?.chapter.id === chapter.id));
    });
  }
  function magazine(chapter, lang) {
    const ui = words[lang], title = localized(chapter.title, lang);
    const article = element('article', 'magazine'); article.dataset.story = chapter.id;
    const art = element('div','magazine-art');
    const button = element('button','magazine-button'); button.type = 'button'; button.dataset.download = chapter.id;
    button.setAttribute('aria-labelledby', `title-${chapter.id}`); button.setAttribute('aria-describedby', `hint-${chapter.id}`);
    const frame = element('span','cover-frame');
    const image = element('img'); image.width = 1024; image.height = 1536; image.alt = '';
    const miniature = Object.values(chapter.cover || {}).includes(chapter.miniature) ? null : chapter.miniature;
    image.src = pictureURL(miniature) || pictureURL(localized(chapter.cover, lang)) || '';
    image.loading = 'lazy'; image.decoding = 'async';
    const fallback = pictureURL(localized(chapter.cover, lang));
    image.addEventListener('error', () => { if (fallback && image.src !== fallback) image.src = fallback; }, {once:true});
    frame.append(image);
    const mark = element('span','download-mark'); mark.setAttribute('aria-hidden','true');
    mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg>';
    frame.append(mark); button.append(frame); art.append(button);
    const heading = element('h2','magazine-title',title); heading.id = `title-${chapter.id}`;
    const pdf = chapter.pdf?.[lang];
    const size = pdf?.bytes ? ` · ${new Intl.NumberFormat(lang,{maximumFractionDigits:1}).format(pdf.bytes/1048576)} MB` : '';
    const meta = element('p','magazine-meta',`${ui.pages(pdf?.pageCount || chapter.pageCount)}${size}`);
    const hint = element('p','download-hint',window.libraryDownload.validPDF(pdf) ? ui.download : ui.unavailable); hint.id = `hint-${chapter.id}`;
    article.append(art,heading,meta);
    if (chapter.coloringPageCount === 3) article.append(element('p','magazine-meta coloring-note',ui.coloring));
    if (chapter.editionLabel) article.append(element('span','edition-label',localized(chapter.editionLabel,lang)));
    article.append(hint); button.addEventListener('click',()=>startDownload(chapter));
    return article;
  }
  function render() {
    const lang = language(), ui = words[lang];
    document.documentElement.lang = lang; document.title = `Mr. PinPin · ${ui.title}`;
    for (const [id,key] of Object.entries({'library-title':'title','library-eyebrow':'eyebrow','library-intro':'intro','home-label':'home','atlas-label':'atlas','search-label':'search','library-note':'note','permissions-link':'permissions','original-book':'original','retry-library':'retry'})) $(id).textContent = ui[key];
    document.querySelector('.skip-link').textContent = ui.skip;
    document.querySelector('.language-selector').setAttribute('aria-label',ui.language);
    $('library-home').href = '../?lang='+lang; $('library-atlas').href = 'atlas-webgpu.html?lang='+lang;
    $('chapter-search').placeholder = ui.search;
    document.querySelectorAll('[data-lang]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lang===lang)));
    const query = $('chapter-search').value.trim().toLocaleLowerCase(lang);
    const shown = chapters.filter(chapter => !query || Object.values(chapter.title).join(' ').toLocaleLowerCase(lang).includes(query));
    $('library-count').textContent = loaded ? ui.count(shown.length) : '';
    const focused = document.activeElement?.dataset.download;
    const fragment = document.createDocumentFragment();
    for (let start=0;start<shown.length;start+=columns()) {
      const shelf = element('section','shelf'); shelf.setAttribute('aria-label',ui.shelf(Math.floor(start/columns())+1));
      shown.slice(start,start+columns()).forEach(chapter=>shelf.append(magazine(chapter,lang))); fragment.append(shelf);
    }
    $('chapter-library').replaceChildren(fragment); $('chapter-library').setAttribute('aria-busy',String(loading));
    if (loaded && !shown.length) $('library-status').textContent = ui.empty;
    else if (loading) $('library-status').textContent = ui.loading;
    else if (!task) $('library-status').textContent = '';
    updateButtons(); renderDownloadState();
    if (focused) document.querySelector(`[data-download="${focused}"]`)?.focus({preventScroll:true});
  }
  async function load() {
    if (loading) return;
    loading = true; $('retry-library').hidden = true; render();
    try {
      const response = await fetch('library-pdfs.json',{cache:'no-cache'});
      if (!response.ok) throw new Error('Catalog unavailable');
      const catalog = await response.json();
      if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.chapters)) throw new Error('Invalid catalog');
      const seen = new Set();
      chapters = catalog.chapters.map(chapter => {
        if (!/^[a-z0-9-]+$/.test(chapter.id) || seen.has(chapter.id) || !languages.every(lang=>typeof chapter.title?.[lang]==='string') || !Number.isInteger(chapter.pageCount) || chapter.pageCount<1) throw new Error('Invalid chapter');
        seen.add(chapter.id); return chapter;
      });
      loaded = true; loading = false; render();
    } catch {
      loading = false; $('chapter-library').setAttribute('aria-busy','false'); $('library-status').textContent = words[language()].error; $('retry-library').hidden = false;
    }
  }
  document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('lang',button.dataset.lang);history.pushState(null,'',url);render()}));
  $('chapter-search').addEventListener('input',render); $('retry-library').addEventListener('click',load);
  $('cancel-download').addEventListener('click',()=>task?.controller.abort());
  shelfMedia.forEach(media=>media.addEventListener('change',render)); addEventListener('popstate',render);
  load();
})();
