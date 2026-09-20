(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const storageKey = 'pinpin.atlas.v1';
  const languages = ['en', 'es', 'ru'];
  const words = {
    en: {title:'The Shire',author:'Mr. PinPin',lake:'Crystal Lake',elder:"Elder's Oak",home:'Home, Sweet Home',bridge:'The Timber Bridge',available:'Open story',opened:'Opened',locked:'After Crystal Lake',soon:'Coming soon',library:'Library',language:'Language',view:'Map view',in:'Zoom in',out:'Zoom out',fit:'Fit map',alt:"The Shire: Crystal Lake, the Elder's oak, home and the bridge"},
    es: {title:'La Comarca',author:'Señor PinPin',lake:'Lago Cristal',elder:'Roble del anciano',home:'Hogar, dulce hogar',bridge:'El puente de madera',available:'Abrir historia',opened:'Abierta',locked:'Después del lago',soon:'Próximamente',library:'Biblioteca',language:'Idioma',view:'Vista del mapa',in:'Acercar',out:'Alejar',fit:'Ver todo el mapa',alt:'La Comarca: el lago Cristal, el roble del anciano, el hogar y el puente'},
    ru: {title:'Шир',author:'Мистер Пин-Пин',lake:'Кристальное озеро',elder:'Дуб Старейшины',home:'Милый дом',bridge:'Деревянный мост',available:'Открыть историю',opened:'Открыта',locked:'После озера',soon:'Скоро',library:'Библиотека',language:'Язык',view:'Вид карты',in:'Приблизить',out:'Отдалить',fit:'Вся карта',alt:'Шир: Кристальное озеро, дуб Старейшины, дом и мост'}
  };
  // Coordinates are fractions of the complete bitmap, independent of zoom.
  const places = [
    {id:'lake',x:.44,y:.43,dy:30,icon:'waves',route:'chapter=1'},
    {id:'elder',x:.74,y:.29,dy:30,icon:'tree-deciduous',route:'chapter=2'},
    {id:'home',x:.23,y:.76,dy:30,icon:'house'},
    {id:'bridge',x:.72,y:.61,dy:30,icon:'tractor',route:'story=timber-tractor'}
  ];
  let state = {version:1,lang:'en',opened:[]};
  let lang = 'en', mapWidth = 0, ratio = 1.5, fitted = false;
  const viewport = $('map-viewport'), scene = $('map-scene');
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* In-memory navigation still works. */ }
  }
  function restore() {
    try {
      const raw = localStorage.getItem(storageKey);
      let parsed = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { /* Malformed data resets the journey. */ }
      state = {
        version:1,
        lang:parsed?.version === 1 && languages.includes(parsed.lang) ? parsed.lang : 'en',
        opened:parsed?.version === 1 && Array.isArray(parsed.opened)
          ? [...new Set(parsed.opened.filter(id => ['lake','elder','bridge'].includes(id)))] : []
      };
      if (!state.opened.includes('lake')) state.opened = state.opened.filter(id => id !== 'elder');
    } catch { /* Preserve this page's state if storage is unavailable. */ }
  }
  function icon(name) {
    const node = document.createElement('i');
    node.dataset.lucide = name;
    node.setAttribute('aria-hidden','true');
    return node;
  }
  function render() {
    const requested = new URL(location.href).searchParams.get('lang');
    lang = languages.includes(requested) ? requested : state.lang;
    state.lang = lang;
    save();
    const ui = words[lang];
    document.documentElement.lang = lang;
    document.title = ui.title + ' - ' + ui.author;
    $('atlas-title').textContent = ui.title;
    $('atlas-author').textContent = ui.author;
    $('map-art').alt = ui.alt;
    viewport.setAttribute('aria-label',ui.title);
    document.querySelector('.language-selector').setAttribute('aria-label',ui.language);
    document.querySelector('.atlas-actions').setAttribute('aria-label',ui.library);
    document.querySelector('.map-controls').setAttribute('aria-label',ui.view);
    for (const [id, label] of [['atlas-library',ui.library],['zoom-in',ui.in],['zoom-out',ui.out],['zoom-fit',ui.fit]]) {
      $(id).title = label; $(id).setAttribute('aria-label',label);
    }
    $('atlas-library').href = 'library.html?lang=' + lang;
    document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.lang === lang)));
    $('map-pins').replaceChildren(...places.map(place => {
      const status = !place.route ? 'soon' : place.id === 'elder' && !state.opened.includes('lake') ? 'locked' : state.opened.includes(place.id) ? 'opened' : 'available';
      const enabled = status === 'available' || status === 'opened';
      const pin = document.createElement(enabled ? 'a' : 'button');
      pin.className = 'map-pin'; pin.dataset.place = place.id; pin.dataset.state = status;
      pin.style.left = place.x * 100 + '%'; pin.style.top = place.y * 100 + '%';
      pin.setAttribute('aria-label',ui[place.id] + ': ' + ui[status]);
      if (enabled) {
        pin.href = './?' + place.route + '&lang=' + lang;
        const record = () => {
          restore();
          if (!state.opened.includes(place.id)) state.opened.push(place.id);
          state.lang = lang; save();
        };
        pin.addEventListener('click',record);
        pin.addEventListener('auxclick',event => { if (event.button === 1) record(); });
      } else {
        pin.type = 'button'; pin.setAttribute('aria-disabled','true');
      }
      pin.append(icon(enabled ? place.icon : status === 'soon' ? 'clock-3' : 'lock-keyhole'));
      const label = document.createElement('span'); label.className = 'pin-label';
      const name = document.createElement('span'); name.className = 'pin-name'; name.textContent = ui[place.id];
      const detail = document.createElement('span'); detail.className = 'pin-status';
      if (status === 'opened') detail.append(icon('check'));
      detail.append(document.createTextNode(ui[status]));
      label.append(name,detail); pin.append(label);
      return pin;
    }));
    window.lucide?.createIcons();
    positionLabels();
  }
  function positionLabels() {
    places.forEach(place => {
      const label = document.querySelector('[data-place="' + place.id + '"] .pin-label');
      if (!label) return;
      const x = place.x * mapWidth, y = place.y * mapWidth / ratio;
      const compact = mapWidth < 600;
      const targetX = x - label.offsetWidth / 2;
      const above = -label.offsetHeight - 28;
      const offsetY = compact ? y + above >= 6 ? above : 28 : place.dy;
      const left = Math.max(6,Math.min(targetX,mapWidth - label.offsetWidth - 6));
      const top = Math.max(6,Math.min(y + offsetY,mapWidth / ratio - label.offsetHeight - 6));
      label.style.left = left - x + 19 + 'px';
      label.style.top = top - y + 19 + 'px';
    });
  }
  function fitWidth() { return Math.min(viewport.clientWidth,viewport.clientHeight * ratio); }
  function resize(width, center = null) {
    const old = scene.getBoundingClientRect(), area = viewport.getBoundingClientRect();
    const focus = center || {x:(area.left + area.width / 2 - old.left) / old.width,y:(area.top + area.height / 2 - old.top) / old.height};
    mapWidth = Math.max(fitWidth(),Math.min(width,3072));
    scene.classList.toggle('is-overview',mapWidth < 600);
    scene.style.width = mapWidth + 'px'; scene.style.height = mapWidth / ratio + 'px';
    viewport.scrollLeft = scene.offsetLeft + focus.x * mapWidth - viewport.clientWidth / 2;
    viewport.scrollTop = scene.offsetTop + focus.y * mapWidth / ratio - viewport.clientHeight / 2;
    $('zoom-out').disabled = mapWidth <= fitWidth() + 1;
    $('zoom-in').disabled = mapWidth >= 3072;
    positionLabels();
  }
  function initialSize() {
    fitted = viewport.clientWidth > 600;
    resize(fitted ? fitWidth() : Math.max(960,viewport.clientHeight * ratio),{x:.42,y:.4});
  }
  $('zoom-in').onclick = () => { fitted = false; resize(mapWidth * 1.3); };
  $('zoom-out').onclick = () => { resize(mapWidth / 1.3); fitted = mapWidth <= fitWidth() + 1; };
  $('zoom-fit').onclick = () => { fitted = true; resize(fitWidth(),{x:.5,y:.5}); };
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click',() => {
    const url = new URL(location.href); url.searchParams.set('lang',button.dataset.lang);
    history.pushState(null,'',url); render();
  }));
  function refresh() { restore(); render(); }
  addEventListener('pageshow',refresh);
  addEventListener('popstate',refresh);
  addEventListener('storage',event => { if (event.key === storageKey || event.key === null) refresh(); });
  addEventListener('resize',() => resize(fitted ? fitWidth() : mapWidth));
  $('map-art').addEventListener('load',() => {
    ratio = $('map-art').naturalWidth / $('map-art').naturalHeight;
    resize(fitted ? fitWidth() : mapWidth);
  });
  if ($('map-art').naturalWidth) ratio = $('map-art').naturalWidth / $('map-art').naturalHeight;
  refresh(); initialSize();
})();
