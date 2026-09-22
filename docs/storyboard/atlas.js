(async () => {
  'use strict';
  const {createCoverLayer}=await import('./atlas-cover-layer.js');
  const {createCoverSelection}=await import('./atlas-cover-selection.js');
  const $=id => document.getElementById(id), storageKey='pinpin.atlas.v1', languages=['en','es','ru'];
  const returnStorageKey='pinpin.atlas.return.v1', places=['home','lake','elder','bridge'];
  const cameraStorageKey='pinpin.atlas.leaflet-camera.v1';
  const words={
    en:{title:'The Shire',author:'Mr. PinPin',lake:'Crystal Lake',elder:"Elder's Oak",home:'Home, Sweet Home',bridge:'The Timber Bridge',available:'Open story',opened:'Opened',locked:'Locked: open Crystal Lake first',soon:'Coming soon',library:'Library',language:'Language',stories:'Stories',view:'Map view',in:'Zoom in',out:'Zoom out',fit:'Fit map',pause:'Pause animation',play:'Play animation',close:'Close',unavailable:'Preview unavailable',alt:"The Shire: Crystal Lake, the Elder's oak, home and the bridge"},
    es:{title:'La Comarca',author:'Señor PinPin',lake:'Lago Cristal',elder:'Roble del anciano',home:'Hogar, dulce hogar',bridge:'El puente de madera',available:'Abrir historia',opened:'Abierta',locked:'Bloqueada: abre primero el Lago Cristal',soon:'Próximamente',library:'Biblioteca',language:'Idioma',stories:'Historias',view:'Vista del mapa',in:'Acercar',out:'Alejar',fit:'Ver todo el mapa',pause:'Pausar animación',play:'Reproducir animación',close:'Cerrar',unavailable:'Vista previa no disponible',alt:'La Comarca: el lago Cristal, el roble del anciano, el hogar y el puente'},
    ru:{title:'Шир',author:'Мистер Пин-Пин',lake:'Кристальное озеро',elder:'Дуб Старейшины',home:'Милый дом',bridge:'Деревянный мост',available:'Открыть историю',opened:'Открыта',locked:'Закрыто: сначала откройте Кристальное озеро',soon:'Скоро',library:'Библиотека',language:'Язык',stories:'Истории',view:'Вид карты',in:'Приблизить',out:'Отдалить',fit:'Вся карта',pause:'Приостановить анимацию',play:'Воспроизвести анимацию',close:'Закрыть',unavailable:'Предпросмотр недоступен',alt:'Шир: Кристальное озеро, дуб Старейшины, дом и мост'}
  };
  const routes={lake:'chapter=1',elder:'chapter=2',bridge:'story=timber-tractor',home:'story=home-sweet-home'};
  let availableStories=new Set(['lake','elder','bridge']);
  const geometry=window.atlasGeometry, regions=geometry.regions;
  const viewport=$('map-viewport'), bounds=L.latLngBounds([[0,0],[geometry.height,geometry.width]]);
  const xy=([x,y]) => L.latLng((1-y)*geometry.height,x*geometry.width);
  const normalized=p => [p.lng/geometry.width,1-p.lat/geometry.height];
  const map=L.map(viewport,{crs:L.CRS.Simple,minZoom:-5,maxZoom:3,zoomSnap:0,zoomDelta:.4,
    zoomControl:false,attributionControl:false,maxBounds:bounds,maxBoundsViscosity:1,
    bounceAtZoomLimits:false,scrollWheelZoom:true,wheelPxPerZoomLevel:100,touchZoom:true});
  map.setView(bounds.getCenter(),map.getBoundsZoom(bounds));
  const art=L.imageOverlay('images/atlas/shire-v1.png',bounds,{alt:words.en.alt,interactive:false}).addTo(map);
  art.getElement().id='map-art';
  const canvas=document.createElement('canvas'); canvas.id='map-motion'; canvas.setAttribute('aria-hidden','true');
  canvas.width=geometry.width; canvas.height=geometry.height;
  // ImageOverlay's layer transform registers the fixed canvas without resizing its pixels.
  const MotionLayer=L.ImageOverlay.extend({_initImage() {
    this._image=canvas;
    L.DomUtil.addClass(canvas,'leaflet-image-layer');
    if (this._zoomAnimated) L.DomUtil.addClass(canvas,'leaflet-zoom-animated');
    canvas.onselectstart=L.Util.falseFn; canvas.onmousemove=L.Util.falseFn;
  }});
  new MotionLayer('',bounds,{interactive:false}).addTo(map);
  let state={version:1,lang:'en',opened:[]}, lang='en', fitZoom=-1, fitted=false, initialView=true;
  let detector=null, focused=null, settleTimer=0, moving=false, keyboardRequest=null, targetPending=false, focusAllowed=false;
  let selection=null, arrival=null, suppressClickUntil=0;
  let bookRequest=0, previewPending=false;
  let coverPoint=null;
  let motion;
  motion=window.AtlasMotion?.create(canvas,geometry,event => {
    if (event?.type==='arrival') arrive(event.point); else renderMotion();
  });
  restoreReturnPlace();
  const preview=window.AtlasPreview.create({canOpen,onOpen:recordOpen,onClose() {
    if (!moving) { keyboardRequest=focused; chooseBook(); }
  }});
  const languageMenu=window.AtlasPreview.createLanguage();
  const bannerRoot=document.createElement('div');
  bannerRoot.id='book-overlay'; viewport.append(bannerRoot);
  const covers=createCoverLayer({regions,viewport,root:bannerRoot,status,
    project(point) { const p=map.latLngToContainerPoint(xy(point)); return [p.x,p.y]; },
    view() { const size=map.getSize(); return {width:size.x,height:size.y,scale:2**map.getZoom(),
      openingScale:2*Math.max(size.x/geometry.width,size.y/geometry.height)}; },
    activate:openBook,
    bind(button) {
      // Let pointer starts reach Leaflet so banners remain valid drag surfaces.
      for (const name of ['click','dblclick']) button.addEventListener(name,event => event.stopPropagation());
    }
  });
  const coverSelection=createCoverSelection({onChange(id) { covers.select(id); showBook(id); }});
  map.on('move zoom',() => covers.position());
  new MutationObserver(syncCharacterCover).observe(canvas,{attributes:true,attributeFilter:['data-x','data-y']});
  function save() { try { localStorage.setItem(storageKey,JSON.stringify(state)); } catch { /* In-memory progress remains usable. */ } }
  function restore() {
    try {
      const parsed=JSON.parse(localStorage.getItem(storageKey));
      state={version:1,lang:parsed?.version===1 && languages.includes(parsed.lang) ? parsed.lang : 'en',
        opened:parsed?.version===1 && Array.isArray(parsed.opened) ? [...new Set(parsed.opened.filter(id => Object.hasOwn(routes,id)))] : []};
      if (!state.opened.includes('lake')) state.opened=state.opened.filter(id => id!=='elder');
    } catch { /* Keep in-memory state when storage is blocked. */ }
  }
  function status(id) { return !availableStories.has(id) ? 'soon' : id==='elder' && !state.opened.includes('lake') ? 'locked' : state.opened.includes(id) ? 'opened' : 'available'; }
  function canOpen(id) { return Object.hasOwn(routes,id) && !['locked','soon'].includes(status(id)); }
  function storyHref(id) {
    const url=new URL(window.AtlasStories?.href(id,lang) || './?'+routes[id]+'&lang='+lang,location.href);
    url.searchParams.set('returnTo','atlas.html'); url.searchParams.set('returnPlace',id);
    return url.href;
  }
  async function refreshStories() {
    if (!window.AtlasStories) return;
    try { availableStories=await window.AtlasStories.available(); }
    catch { availableStories=new Set(); }
    render();
  }
  function recordOpen(id) {
    restore(); if (!canOpen(id)) return;
    try { sessionStorage.setItem(returnStorageKey,JSON.stringify({place:id,pending:true})); } catch { /* The reader URL also carries the location. */ }
    if (!state.opened.includes(id)) state.opened.push(id);
    state.lang=lang; save(); motion?.update(state.opened);
  }
  function restoreReturnPlace() {
    const url=new URL(location.href), requested=url.searchParams.get('returnPlace');
    if (url.searchParams.has('returnPlace') && !places.includes(requested)) return;
    let saved;
    try { saved=JSON.parse(sessionStorage.getItem(returnStorageKey)); } catch { /* Ignore blocked or corrupt storage. */ }
    const stored=places.includes(saved?.place) ? saved.place : null;
    const id=saved?.pending===true && stored ? stored : requested || stored;
    if (!id || !motion?.placeAtLocation(id)) return;
    clearTimeout(settleTimer); targetPending=false; selection=null; arrival=null;
    url.searchParams.set('returnPlace',id); history.replaceState(history.state,'',url);
    try { sessionStorage.setItem(returnStorageKey,JSON.stringify({place:id,pending:false})); } catch { /* Keep the URL fallback. */ }
  }
  function renderMotion() {
    const button=$('motion-toggle'), paused=motion?.paused ?? true, label=words[lang][paused ? 'play' : 'pause'];
    button.title=label; button.setAttribute('aria-label',label); button.setAttribute('aria-pressed',String(!paused));
    button.replaceChildren(icon(paused ? 'play' : 'pause')); window.lucide?.createIcons();
  }
  function icon(name) {
    const node=document.createElement('i'); node.dataset.lucide=name; node.setAttribute('aria-hidden','true'); return node;
  }
  function chooseBook() {
    syncCharacterCover();
    covers.hide(previewPending || preview.open);
  }
  function syncCharacterCover() {
    if (!detector) return;
    const x=Number(canvas.dataset.x),y=Number(canvas.dataset.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || (coverPoint?.[0]===x && coverPoint?.[1]===y)) return;
    coverPoint=[x,y];
    const sample=detector.sampleRegion([x/geometry.width,y/geometry.height]);
    const confidence=String(sample.confidence);
    if (viewport.dataset.coverConfidence!==confidence) viewport.dataset.coverConfidence=confidence;
    coverSelection.update(sample);
  }
  function arrive(point) {
    const doorway=geometry.routes.find(route => route.id==='home-to-lake')?.points[0];
    // Only the completed walk into the doorway enters the house, not the wider home region.
    if (doorway && point && Math.hypot((point[0]-doorway[0])*geometry.width,(point[1]-doorway[1])*geometry.height)<=2) {
      saveCamera(); state.lang=lang; save();
      try { sessionStorage.setItem(returnStorageKey,JSON.stringify({place:'home',pending:false})); } catch { /* The menu URL preserves the language. */ }
      const menu=new URL('../',location.href); menu.searchParams.set('lang',lang);
      location.assign(menu.href);
      return;
    }
    chooseBook();
  }
  function showBook(id) {
    focused=id; viewport.dataset.focus=id || '';
    motion?.focus?.(id);
    $('map-status').textContent=id ? words[lang][id]+': '+words[lang][status(id)] : '';
    if (keyboardRequest===id) { covers.focus(id); keyboardRequest=null; }
  }
  async function openBook(id) {
    if (moving || previewPending || preview.open || performance.now()<suppressClickUntil || !canOpen(id)) return;
    clearTimeout(settleTimer); targetPending=false; arrival=null; focused=id;
    const opening=++bookRequest; previewPending=true; covers.hide(true);
    await preview.show(id,lang,words[lang],storyHref(id));
    if (opening===bookRequest) { previewPending=false; covers.hide(preview.open); }
  }
  function settle() {
    clearTimeout(settleTimer);
    settleTimer=setTimeout(() => {
      moving=false;
      if (preview.open) { targetPending=false; arrival=null; return; }
      chooseBook();
      if (targetPending) { motion?.setTarget?.(normalized(map.getCenter())); targetPending=false; }
      $('zoom-out').disabled=map.getZoom()<=fitZoom+.01;
      $('zoom-in').disabled=map.getZoom()>=map.getMaxZoom()-.01;
    },180);
  }
  function startMove() {
    clearTimeout(settleTimer); moving=true;
    bookRequest++; previewPending=false;
    arrival=null;
    preview.dismiss(); covers.hide(false);
  }
  map.on('dragstart',() => { selection=null; interact(); });
  map.on('dragend',() => { suppressClickUntil=performance.now()+350; });
  map.on('movestart zoomstart',startMove); map.on('moveend zoomend',settle);
  map.on('zoomend',() => { fitted=Math.abs(map.getZoom()-fitZoom)<.01; });
  function focusDestination(id) {
    const region=regions.find(r => r.id===id); if (!region) return;
    keyboardRequest=id; fitted=false; targetPending=true; focusAllowed=true;
    selection={id,point:region.center}; arrival=null;
    const size=map.getSize(), [,,w,h]=region.bounds;
    const regionZoom=Math.log2(Math.min(size.x/(w*geometry.width*1.6),size.y/(h*geometry.height*1.6)));
    const [x,y]=region.center;
    const centerZoom=Math.log2(Math.max(size.x/(2*Math.min(x,1-x)*geometry.width),size.y/(2*Math.min(y,1-y)*geometry.height)))+.02;
    map.flyTo(xy(region.center),Math.min(map.getMaxZoom(),Math.max(fitZoom+1.8,regionZoom,centerZoom)),
      {animate:!matchMedia('(prefers-reduced-motion: reduce)').matches,duration:.5});
  }
  function render() {
    const requested=new URL(location.href).searchParams.get('lang');
    lang=languages.includes(requested) ? requested : state.lang; state.lang=lang;
    const ui=words[lang]; document.documentElement.lang=lang; document.title=ui.title+' - '+ui.author;
    $('atlas-title').textContent=ui.title; $('atlas-author').textContent=ui.author;
    art.getElement().alt=ui.alt; viewport.setAttribute('aria-label',ui.title);
    document.querySelector('.language-selector').setAttribute('aria-label',ui.language);
    document.querySelector('.atlas-actions').setAttribute('aria-label',ui.language);
    languageMenu.update(lang,ui.language);
    document.querySelector('.map-controls').setAttribute('aria-label',ui.view);
    $('map-regions').setAttribute('aria-label',ui.stories);
    for (const [id,label] of [['atlas-library',ui.library],['zoom-in',ui.in],['zoom-out',ui.out],['zoom-fit',ui.fit]]) {
      $(id).title=label; $(id).setAttribute('aria-label',label);
    }
    $('atlas-library').href='library.html?lang='+lang;
    document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.lang===lang)));
    $('map-regions').replaceChildren(...regions.map(region => {
      const link=document.createElement('a'); link.className='map-region'; link.dataset.place=region.id;
      link.dataset.state=status(region.id); link.href='#map-viewport';
      link.textContent=ui[region.id]+': '+ui[status(region.id)];
      link.setAttribute('aria-label',link.textContent);
      // Anchors always explore, including locked and unpublished destinations.
      link.addEventListener('focus',() => focusDestination(region.id));
      link.addEventListener('click',event => { event.preventDefault(); focusDestination(region.id); });
      return link;
    }));
    covers.update(lang,ui).then(() => { if (keyboardRequest) covers.focus(keyboardRequest); });
    motion?.update(state.opened); renderMotion();
    if (!moving && !preview.open) chooseBook();
  }
  function fit() { selection=null; arrival=null; fitted=true; map.setView(bounds.getCenter(),fitZoom); settle(); }
  function readCamera() {
    try {
      const saved=JSON.parse(sessionStorage.getItem(cameraStorageKey));
      if (saved && [saved.x,saved.y,saved.zoom].every(Number.isFinite) &&
          saved.x>=-.25 && saved.x<=1.25 && saved.y>=-.25 && saved.y<=1.25 &&
          saved.zoom>=-5 && saved.zoom<=16) return saved;
    } catch { /* Keep the opening view when storage is blocked or corrupt. */ }
    return null;
  }
  function saveCamera() {
    if (initialView) return;
    const [x,y]=normalized(map.getCenter());
    try { sessionStorage.setItem(cameraStorageKey,JSON.stringify({x,y,zoom:map.getZoom()})); } catch { /* Interaction remains available. */ }
  }
  function resize() {
    const wasFitted=fitted; map.invalidateSize({pan:false});
    fitZoom=map.getBoundsZoom(bounds); map.setMinZoom(fitZoom); map.setMaxZoom(Math.max(2,fitZoom+4));
    if (initialView) {
      const saved=readCamera();
      initialView=false;
      const phone=viewport.clientWidth<600;
      map.setView(xy(saved ? [saved.x,saved.y] : [phone ? .30 : .36,.5]),
        saved ? saved.zoom : map.getBoundsZoom(bounds,true)+(phone ? .3 : .65),{animate:false});
      focusAllowed=Boolean(saved);
      settle();
    } else if (wasFitted) fit(); else {
      map.setView(map.getCenter(),Math.max(map.getZoom(),map.getBoundsZoom(bounds,true)),{animate:false});
      map.panInsideBounds(bounds,{animate:false}); settle();
    }
  }
  function interact() { targetPending=true; focusAllowed=true; }
  $('zoom-in').onclick=() => { interact(); map.zoomIn(.4); };
  $('zoom-out').onclick=() => { interact(); map.zoomOut(.4); };
  $('zoom-fit').onclick=() => { interact(); fit(); }; $('motion-toggle').onclick=() => motion?.toggle();
  const pointers=new Set();
  function target(event) {
    if (event.target.closest('.atlas-book') || pointers.size>1) return;
    const rect=viewport.getBoundingClientRect();
    motion?.setTarget?.(normalized(map.containerPointToLatLng([event.clientX-rect.left,event.clientY-rect.top])));
  }
  map.on('click',event => {
    if (moving || preview.open || pointers.size>1 || performance.now()<suppressClickUntil) return;
    const point=normalized(event.latlng), id=detector?.regionAt(point,{nearby:true});
    if (!id) return;
    clearTimeout(settleTimer); targetPending=false; focusAllowed=true;
    selection={id,point}; arrival=null;
    motion?.setTarget?.(point); chooseBook();
  });
  viewport.addEventListener('pointerdown',event => {
    pointers.add(event.pointerId);
    if (pointers.size>1) { suppressClickUntil=Infinity; startMove(); }
  },{passive:true});
  viewport.addEventListener('wheel',interact,{passive:true});
  viewport.addEventListener('keydown',event => { if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','-'].includes(event.key)) interact(); });
  viewport.addEventListener('pointermove',event => { if (event.pointerType==='mouse' || pointers.has(event.pointerId)) target(event); },{passive:true});
  for (const event of ['pointerup','pointercancel']) addEventListener(event,e => {
    pointers.delete(e.pointerId);
    if (!pointers.size && suppressClickUntil===Infinity) { suppressClickUntil=performance.now()+450; settle(); }
  },{passive:true});
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click',() => {
    bookRequest++; previewPending=false;
    preview.dismiss(true);
    if (history.state?.atlasPreview) history.replaceState(null,'');
    const url=new URL(location.href); url.searchParams.set('lang',button.dataset.lang); history.pushState(null,'',url); render(); save();
  }));
  function refresh() { restore(); render(); }
  map.on('moveend zoomend',saveCamera);
  addEventListener('pagehide',saveCamera);
  addEventListener('pageshow',event => { if (event.persisted) restoreReturnPlace(); refresh(); resize(); });
  addEventListener('popstate',refresh);
  addEventListener('storage',event => {
    if (event.key===storageKey || event.key===null) { preview.dismiss(); refresh(); }
  });
  addEventListener('resize',resize);
  refresh(); resize();
  refreshStories();
  window.AtlasFocus.create(geometry).then(value => { detector=value; viewport.dataset.mask='ready'; chooseBook(); settle(); })
    .catch(() => { viewport.dataset.mask='unavailable'; $('map-status').textContent=words[lang].unavailable; });
  window.atlasDebug=Object.freeze({map,xy,normalized,focusDestination,covers,coverSelection,
    get focus() { return detector?.diagnostic || {id:null}; },get fitZoom() { return fitZoom; }});
})();
