/* Local proposal reader. No writes, external services, or official-reader integration. */
(() => {
  'use strict';
  const languages = ['ru', 'en', 'es'];
  const chapters = ['elder', 'academy'];
  const views = ['reading', 'preproduction', 'production'];
  const copy = {
    ru: {brand:'Мистер Пин-Пин',badge:'Мастерская · Черновики',eyebrow:'ИСТОРИИ В РАБОТЕ',heading:'Две главы. Целый лес.',intro:'Читайте главы целиком, а затем загляните в подготовку: герои, места и решения, которые связывают каждую сцену.',notice:'Предложения для просмотра. Ещё не опубликованы.',chapter:'Глава',reading:'Читать',preproduction:'Подготовка',production:'Разбор сцен',refresh:'Обновить',sequence:'Часть',footer:'Локальная мастерская · Опубликованные главы не изменены',workflow:'Рабочий процесс ↗',skip:'К содержанию',elder:'Мудрость Старейшины',academy:'Лесная академия',loading:'Загружаем главу…',updated:'Черновик загружен',pendingTitle:'Глава ещё готовится',pending:'Здесь появится полный черновик, когда он будет сохранён. Обновите страницу немного позже.',noScenes:'Иллюстрации и текст ещё готовятся. Подготовку можно посмотреть в соседней вкладке.',imagePending:'Иллюстрация ещё не готова',retry:'Проверить ещё раз',textPending:'Текст на этом языке ещё готовится.',scene:'Сцена',of:'из',previous:'Предыдущая сцена',next:'Следующая сцена',proposed:'ПРЕДЛОЖЕНИЕ ДЛЯ ПРОСМОТРА',packTitle:'Прежде чем оживёт история',packIntro:'Образы героев и планы мест помогают сценам оставаться частью одного мира. Это иллюстрированные ориентиры, а не точная трёхмерная модель.',packPending:'Подготовительные иллюстрации появятся после внутренней проверки.',productionTitle:'Как связаны сцены',productionIntro:'Источник, камера и непрерывность действия. Если сохранена предыдущая версия, она показана рядом с предложенной.',before:'Раньше',after:'Предложение',noBefore:'Для этой сцены сравнение с прежней версией не задано.',silent:'Пауза без слов',invalid:'Не удалось прочитать черновик. Проверьте файл главы и обновите страницу.'},
    en: {brand:'Mr. PinPin',badge:'Workshop · Drafts',eyebrow:'STORIES IN PROGRESS',heading:'Two chapters. A whole forest.',intro:'Read each chapter in full, then step into its preparation: the characters, places and decisions that connect every scene.',notice:'Proposals for review. Not yet published.',chapter:'Chapter',reading:'Read',preproduction:'Preparation',production:'Scene review',refresh:'Refresh',sequence:'Sequence',footer:'Local workshop · Published chapters unchanged',workflow:'Production workflow ↗',skip:'Skip to content',elder:'The Elder’s Wisdom',academy:'Forest Academy',loading:'Loading chapter…',updated:'Draft loaded',pendingTitle:'The chapter is taking shape',pending:'The full draft will appear here when it is saved. Refresh a little later.',noScenes:'Illustrations and narration are still in progress. You can explore the preparation in the next tab.',imagePending:'Illustration in progress',retry:'Check again',textPending:'Narration in this language is still in progress.',scene:'Scene',of:'of',previous:'Previous scene',next:'Next scene',proposed:'PROPOSAL FOR REVIEW',packTitle:'Before the story comes to life',packIntro:'Character studies and location plans keep the scenes in one coherent world. These are illustrated continuity references, not a calibrated 3D model.',packPending:'The preparation images will appear after their internal review.',productionTitle:'How the scenes connect',productionIntro:'Source, camera and continuity. Where an earlier version has been recorded, it appears beside the proposal.',before:'Earlier version',after:'Proposal',noBefore:'No earlier image is assigned to this scene.',silent:'A silent beat',invalid:'The draft could not be read. Check the chapter file and refresh.'},
    es: {brand:'El señor PinPin',badge:'Taller · Borradores',eyebrow:'HISTORIAS EN PREPARACIÓN',heading:'Dos capítulos. Todo un bosque.',intro:'Lee cada capítulo completo y descubre su preparación: los personajes, los lugares y las decisiones que conectan cada escena.',notice:'Propuestas para revisar. Aún no publicadas.',chapter:'Capítulo',reading:'Leer',preproduction:'Preparación',production:'Revisar escenas',refresh:'Actualizar',sequence:'Secuencia',footer:'Taller local · Los capítulos publicados no cambian',workflow:'Proceso de producción ↗',skip:'Ir al contenido',elder:'La sabiduría del anciano',academy:'La academia del bosque',loading:'Cargando el capítulo…',updated:'Borrador cargado',pendingTitle:'El capítulo está tomando forma',pending:'El borrador completo aparecerá aquí cuando se guarde. Actualiza un poco más tarde.',noScenes:'Las ilustraciones y el texto siguen en preparación. Puedes explorar la preparación en la otra pestaña.',imagePending:'Ilustración en preparación',retry:'Volver a comprobar',textPending:'El texto en este idioma sigue en preparación.',scene:'Escena',of:'de',previous:'Escena anterior',next:'Escena siguiente',proposed:'PROPUESTA PARA REVISAR',packTitle:'Antes de que la historia cobre vida',packIntro:'Los estudios de personajes y planos de lugares mantienen las escenas en un mismo mundo. Son referencias ilustradas de continuidad, no un modelo 3D calibrado.',packPending:'Las ilustraciones de preparación aparecerán después de su revisión interna.',productionTitle:'Cómo se conectan las escenas',productionIntro:'Fuente, cámara y continuidad. Cuando se ha registrado una versión anterior, aparece junto a la propuesta.',before:'Versión anterior',after:'Propuesta',noBefore:'No se ha asignado una imagen anterior a esta escena.',silent:'Una pausa sin palabras',invalid:'No se pudo leer el borrador. Revisa el archivo del capítulo y actualiza.'}
  };
  Object.assign(copy.ru,{version:'Версия',revision1:'Предыдущее предложение',revision2:'Новое предложение',beforeTextMissing:'Текст предыдущей версии не указан.',beforeContext:'Контекст сравнения',planningDiagram:'План пространства'});
  Object.assign(copy.en,{version:'Version',revision1:'Previous proposal',revision2:'Revised proposal',beforeTextMissing:'Earlier narration has not been recorded.',beforeContext:'Comparison context',planningDiagram:'Space plan'});
  Object.assign(copy.es,{version:'Versión',revision1:'Propuesta anterior',revision2:'Propuesta revisada',beforeTextMissing:'No se ha registrado el texto anterior.',beforeContext:'Contexto de la comparación',planningDiagram:'Plano del espacio'});
  copy.ru.revision3='Третье предложение · Старейшина';
  copy.en.revision3='Third proposal · Elder';
  copy.es.revision3='Tercera propuesta · Anciano';
  copy.ru.revision4='Четвёртое предложение · Старейшина';
  copy.en.revision4='Fourth proposal · Elder';
  copy.es.revision4='Cuarta propuesta · Anciano';
  copy.ru.revision5='Пятое предложение · Старейшина';
  copy.en.revision5='Fifth proposal · Elder';
  copy.es.revision5='Quinta propuesta · Anciano';
  const params = new URLSearchParams(location.search);
  const state = {revision:['2','3','4','5'].includes(params.get('revision'))?params.get('revision'):'1',lang:languages.includes(params.get('lang'))?params.get('lang'):'ru',chapter:chapters.includes(params.get('chapter'))?params.get('chapter'):'elder',view:views.includes(params.get('view'))?params.get('view'):'reading',scene:params.get('scene')||'',data:null,request:0,observer:null};
  // Revisions 3, 4 and 5 change only Elder. Academy keeps its actual revision-2 URL and identity.
  const normalizeRevision = () => {if(state.chapter==='academy'&&['3','4','5'].includes(state.revision))state.revision='2';};
  normalizeRevision();
  const $ = id => document.getElementById(id);
  const t = key => copy[state.lang][key] || key;
  const el = (tag, className, text) => { const node=document.createElement(tag); if(className)node.className=className; if(text!==undefined)node.textContent=String(text); return node; };
  const localized = value => typeof value==='string'?value:(value?.[state.lang]||'');
  const safePath = value => typeof value==='string' && /^images\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp)$/i.test(value) && !value.split('/').some(part=>part==='..'||part==='.'||part==='');
  const assetURL = value => safePath(value)?'../'+value:null;
  const chapterFolder = () => `../production/chapters-02-04/${state.revision==='1'?'':`revision-0${state.revision}/`}${state.chapter}`;
  const manifestURL = () => `${chapterFolder()}/chapter.json`;
  function updateURL() {
    const search = new URLSearchParams({revision:state.revision,chapter:state.chapter,lang:state.lang,view:state.view});
    if(state.scene && state.view!=='preproduction')search.set('scene',state.scene);
    history.replaceState(null,'',`${location.pathname}?${search}`);
  }
  function controls() {
    document.documentElement.lang=state.lang;
    document.title=`${t('brand')} · ${t('badge')}`;
    document.querySelectorAll('[data-copy]').forEach(node=>node.textContent=t(node.dataset.copy));
    document.querySelectorAll('[data-lang]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lang===state.lang)));
    document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===state.view)));
    [...$('chapter-select').options].forEach(option=>option.textContent=t(option.value));
    $('chapter-select').value=state.chapter;
    [...$('revision-select').options].forEach(option=>{option.textContent=t(`revision${option.value}`);option.disabled=['3','4','5'].includes(option.value)&&state.chapter==='academy';});
    $('revision-select').value=state.revision;
    $('previous-scene').setAttribute('aria-label',t('previous'));
    $('next-scene').setAttribute('aria-label',t('next'));
    $('scene-navigation').setAttribute('aria-label',t('sequence'));
  }
  function picture(src, alt, dimensions={}, eager=false) {
    const frame=el('figure','picture-frame pending');
    if(dimensions.width>0 && dimensions.height>0)frame.style.setProperty('--image-ratio',`${dimensions.width}/${dimensions.height}`);
    const link=el('a'); const image=el('img'); const note=el('div','image-pending',t('imagePending'));
    const retry=el('button','',t('retry'));retry.type='button';note.append(retry);
    image.alt=alt||'';image.loading=eager?'eager':'lazy';image.decoding='async';
    if(dimensions.width>0 && dimensions.height>0){image.width=dimensions.width;image.height=dimensions.height;}
    const url=assetURL(src);
    if(url){link.href=url;link.target='_blank';link.rel='noopener';}
    image.onload=()=>{frame.classList.remove('pending');note.hidden=true;};
    image.onerror=()=>{frame.classList.add('pending');note.hidden=false;};
    retry.onclick=()=>{if(url)image.src=`${url}?retry=${Date.now()}`;};
    link.append(image);frame.append(link,note);
    if(url)image.src=url;else retry.disabled=true;
    return frame;
  }
  function pending(text=t('pending'), title=t('pendingTitle')) {
    const panel=el('section','pending-panel');panel.append(el('h2','',title),el('p','',text));return panel;
  }
  function heading() {
    const data=state.data;const cover=data.cover?.[state.lang];
    const node=el('section',`chapter-heading${cover?'':' no-cover'}`);const text=el('div');
    text.append(el('div','eyebrow',t('proposed')),el('h2','',localized(data.title)||t(state.chapter)),el('p','chapter-summary',localized(data.summary)));
    node.append(text);if(cover)node.append(picture(cover,localized(data.title),{width:1024,height:1536},true));return node;
  }
  function narration(scene, production=false) {
    const block=el('div',production?'production-text':'narration');const paragraphs=scene.text?.[state.lang];
    if(Array.isArray(paragraphs)&&paragraphs.length){paragraphs.forEach(text=>block.append(el('p','',text)));}
    else if(scene.source?.kind==='silent'){const silence=el('div','silent-beat','· · ·');silence.setAttribute('aria-label',t('silent'));block.append(silence);}
    else block.append(el('p','comparison-note',t('textPending')));
    return block;
  }
  function reading() {
    const fragment=document.createDocumentFragment();fragment.append(heading());
    if(!state.data.scenes.length){fragment.append(pending(t('noScenes')));return fragment;}
    // Follow manifest scene order exactly; do not regroup or hide invalid sequence IDs.
    let sequenceID=null;let group=null;let sectionNumber=0;
    for(const [index,scene] of state.data.scenes.entries()){
      if(sequenceID!==scene.sequence){sequenceID=scene.sequence;sectionNumber++;group=el('section','reading-sequence');const sequence=state.data.sequences.find(item=>item.id===sequenceID);const title=el('div','sequence-heading');title.append(el('span','sequence-number',String(sectionNumber).padStart(2,'0')),el('h3','',localized(sequence?.title)||`${t('sequence')} ${sectionNumber}`));group.append(title);fragment.append(group);}
      const article=el('article','reading-scene');article.id=`scene-${scene.id}`;article.dataset.scene=scene.id;article.setAttribute('aria-label',`${t('scene')} ${index+1}`);
      article.append(picture(scene.src,localized(scene.alt),scene,index===0),narration(scene));group.append(article);
    }
    return fragment;
  }
  function documentLinks(){
    const links=el('div','document-links');
    const diagram=state.data?.planningDiagram;
    if(typeof diagram==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(svg|png)$/i.test(diagram)){const link=el('a','',t('planningDiagram'));link.href=`${chapterFolder()}/${diagram}`;link.target='_blank';link.rel='noopener';links.append(link);}
    for(const [file,label] of [['bible.md','Chapter bible'],['shot-plan.json','Shot plan'],['chapter.json','Chapter manifest'],['REPORT.md','Production report']]){const link=el('a','',label);link.href=`${chapterFolder()}/${file}`;link.target='_blank';link.rel='noopener';links.append(link);}
    return links;
  }
  function recordLink(src){const link=el('a','record-link','Prompt & production record ↗');const url=assetURL(src);if(url){link.href=url.replace(/\.(png|jpe?g|webp)$/i,'.md');link.target='_blank';link.rel='noopener';}return link;}
  function panelHeading(title,intro){const panel=el('div','panel-heading');panel.append(el('h2','',title),el('p','',intro));return panel;}
  function notes(){
    const node=el('aside','production-notes');
    for(const [field,label] of [['editorialNotes','Editorial decisions'],['continuityNotes','Continuity notes']]){const values=state.data[field];if(!Array.isArray(values)||!values.length)continue;node.append(el('h3','',label));const list=el('ul');values.forEach(value=>list.append(el('li','',value)));node.append(list);}
    return node.childNodes.length?node:document.createDocumentFragment();
  }
  function preproduction(){
    const fragment=document.createDocumentFragment();fragment.append(panelHeading(t('packTitle'),t('packIntro')),documentLinks());
    const refs=[...(state.data.preproduction||[])];
    const miniature=typeof state.data.miniature==='string'?state.data.miniature:state.data.miniature?.src;
    if(miniature&&!refs.some(reference=>reference.src===miniature))refs.push({id:'miniature',title:'Text-free miniature',src:miniature,description:'Optional small-display cover proposal. Its approval state is recorded in the adjacent production record.',width:1024,height:1536});
    if(!refs.length)fragment.append(pending(t('packPending')));
    const grid=el('div','preproduction-grid');
    for(const reference of refs){const card=el('article','reference-card');card.append(picture(reference.src,localized(reference.title),reference),el('h3','',localized(reference.title)),el('p','',localized(reference.description)),recordLink(reference.src));grid.append(card);}
    fragment.append(grid,notes());return fragment;
  }
  function production(){
    const fragment=document.createDocumentFragment();fragment.append(panelHeading(t('productionTitle'),t('productionIntro')),documentLinks(),notes());
    if(!state.data.scenes.length){fragment.append(pending(t('noScenes')));return fragment;}
    state.data.scenes.forEach((scene,index)=>{
      const article=el('article','production-scene');article.id=`scene-${scene.id}`;article.dataset.scene=scene.id;
      const title=el('div','production-scene-heading');title.append(el('strong','',`${String(index+1).padStart(2,'0')} · ${scene.id}`),el('span','source-tag',scene.source?.kind||'pending'),el('span','comparison-note',scene.reused?'Reviewed reuse':'New illustration'));article.append(title);
      if(scene.before){
        if(scene.beforeNote)article.append(el('p','comparison-context',`${t('beforeContext')}: ${localized(scene.beforeNote)}`));
        const pair=el('div','comparison-grid');
        for(const previous of [true,false]){
          const label=t(previous?'before':'after'),src=previous?scene.before:scene.src;
          const panel=el('section',`comparison-panel ${previous?'comparison-before':'comparison-after'}`);
          panel.append(el('h3','comparison-label',label),picture(src,previous?label:localized(scene.alt),previous?{}:scene));
          if(previous){
            if(scene.beforeText)panel.append(narration({text:scene.beforeText,source:{kind:Array.isArray(scene.beforeText[state.lang])&&scene.beforeText[state.lang].length===0?'silent':'original'}},true));
            else panel.append(el('p','comparison-note',t('beforeTextMissing')));
          }else panel.append(narration(scene,true));
          pair.append(panel);
        }
        article.append(pair);
      }
      else {article.append(picture(scene.src,localized(scene.alt),scene),el('p','comparison-note',t('noBefore')));if(scene.beforeNote)article.append(el('p','comparison-context',localized(scene.beforeNote)));}
      const details=el('dl','production-details');
      for(const [label,value] of [['Sequence',scene.sequence],['Source',`${scene.source?.kind||'pending'} · blocks: ${(scene.source?.blocks||[]).join(', ')||'—'}\n${scene.source?.note||''}`],['Camera',scene.camera],['Continuity',scene.continuity],['Visual review',scene.review]]){details.append(el('dt','',label),el('dd','',typeof value==='string'?value:JSON.stringify(value||'')));}
      article.append(details);
      if(scene.cameraTransform){const transform=el('details','camera-transform');const label={ru:'План камеры и персонажей',en:'Camera and character plan',es:'Plan de cámara y personajes'}[state.lang];transform.append(el('summary','',label),el('pre','',JSON.stringify(scene.cameraTransform,null,2)));article.append(transform);}
      if(!scene.before)article.append(narration(scene,true));article.append(recordLink(scene.src));fragment.append(article);
    });return fragment;
  }
  function sceneIndex(){const scenes=state.data?.scenes||[];return Math.max(0,scenes.findIndex(scene=>scene.id===state.scene));}
  function updateNavigation(){
    const scenes=state.data?.scenes||[];const active=scenes[sceneIndex()];
    $('scene-navigation').hidden=state.view==='preproduction'||!scenes.length;
    if(!active)return;
    const index=scenes.indexOf(active);state.scene=active.id;
    $('scene-counter').textContent=`${t('scene')} ${index+1} ${t('of')} ${scenes.length}`;
    $('sequence-select').value=active.sequence;
    $('previous-scene').disabled=index===0;$('next-scene').disabled=index===scenes.length-1;
  }
  function observeScenes(){
    state.observer?.disconnect();
    if(!('IntersectionObserver' in window))return;
    state.observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>Math.abs(a.boundingClientRect.top)-Math.abs(b.boundingClientRect.top));
      if(visible.length){state.scene=visible[0].target.dataset.scene;updateNavigation();updateURL();}
    },{rootMargin:'-8% 0px -68% 0px',threshold:0});
    document.querySelectorAll('[data-scene]').forEach(node=>state.observer.observe(node));
  }
  function goToScene(id, scroll=true){
    const scene=state.data?.scenes.find(item=>item.id===id);if(!scene)return;
    state.scene=id;updateNavigation();updateURL();
    if(scroll)document.getElementById(`scene-${id}`)?.scrollIntoView({block:'start'});
  }
  function render(restore=false){
    controls();const content=$('content');content.replaceChildren();
    if(!state.data){content.append(pending());content.setAttribute('aria-busy','false');$('scene-navigation').hidden=true;return;}
    content.append(state.view==='reading'?reading():state.view==='preproduction'?preproduction():production());content.setAttribute('aria-busy','false');
    const select=$('sequence-select');select.replaceChildren();
    for(const [index,sequence] of state.data.sequences.entries()){const option=el('option','',localized(sequence.title)||`${t('sequence')} ${index+1}`);option.value=sequence.id;select.append(option);}
    updateNavigation();if(restore&&state.scene&&state.view!=='preproduction')requestAnimationFrame(()=>goToScene(state.scene));
    observeScenes();updateURL();
  }
  async function load(){
    const request=++state.request;const chapter=state.chapter;
    state.observer?.disconnect();$('content').setAttribute('aria-busy','true');$('load-status').textContent=t('loading');$('refresh').disabled=true;
    try{
      const response=await fetch(manifestURL(),{cache:'no-store'});
      if(request!==state.request)return;
      if(!response.ok){if(response.status===404){state.data=null;render();$('load-status').textContent=t('pendingTitle');return;}throw Error(`HTTP ${response.status}`);}
      const data=await response.json();if(request!==state.request)return;
      if(data.schemaVersion!==1||data.id!==chapter||!Array.isArray(data.scenes)||!Array.isArray(data.sequences))throw Error('Invalid chapter manifest');
      state.data=data;render(Boolean(state.scene));$('load-status').textContent=`${t('updated')} · ${new Date().toLocaleTimeString(state.lang,{hour:'2-digit',minute:'2-digit'})}`;
    }catch(error){if(request!==state.request)return;state.data=null;render();$('load-status').textContent=t('invalid');console.warn('Chapter workshop:',error.message);}
    finally{if(request===state.request){$('refresh').disabled=false;$('content').setAttribute('aria-busy','false');}}
  }
  document.querySelectorAll('[data-lang]').forEach(button=>button.onclick=()=>{state.lang=button.dataset.lang;render(Boolean(state.scene));$('load-status').textContent=state.data?t('updated'):t('pendingTitle');});
  document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{state.view=button.dataset.view;render(false);});
  $('chapter-select').onchange=()=>{state.chapter=$('chapter-select').value;normalizeRevision();state.scene='';state.data=null;render();updateURL();load();};
  $('revision-select').onchange=()=>{state.revision=$('revision-select').value;normalizeRevision();state.scene='';state.data=null;render();updateURL();load();};
  $('refresh').onclick=()=>load();
  $('previous-scene').onclick=()=>goToScene(state.data.scenes[Math.max(0,sceneIndex()-1)].id);
  $('next-scene').onclick=()=>goToScene(state.data.scenes[Math.min(state.data.scenes.length-1,sceneIndex()+1)].id);
  $('sequence-select').onchange=()=>{const scene=state.data.scenes.find(item=>item.sequence===$('sequence-select').value);if(scene)goToScene(scene.id);};
  controls();load();
})();
