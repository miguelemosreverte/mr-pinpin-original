(() => {
  const $ = id => document.getElementById(id);
  const labels = {
    en:{eyebrow:'The illustrated book',search:'Find a chapter',all:'All chapters',published:'Published',upcoming:'Upcoming',ready:'Read chapter',next:'Next adaptation',planned:'Not yet adapted',original:'Original artwork',empty:'No matching chapters.',error:'The chapters could not be loaded. Please reload.'},
    es:{eyebrow:'El libro ilustrado',search:'Buscar un capítulo',all:'Todos los capítulos',published:'Publicados',upcoming:'Próximamente',ready:'Leer capítulo',next:'Próxima adaptación',planned:'Aún sin adaptar',original:'Ilustración original',empty:'No hay capítulos que coincidan.',error:'No se pudieron cargar los capítulos. Vuelve a cargar la página.'},
    ru:{eyebrow:'Иллюстрированная книга',search:'Найти главу',all:'Все главы',published:'Опубликовано',upcoming:'Впереди',ready:'Читать главу',next:'Следующая адаптация',planned:'Ещё не адаптировано',original:'Оригинальная иллюстрация',empty:'Главы не найдены.',error:'Не удалось загрузить главы. Обновите страницу.'}
  };
  const titles = {
    en:['Mr. PinPin and His Mysterious Forest','The Wisdom of the Elder','Home, Sweet Home','The Forest Academy','Dad and a Game of Chess','Magic Soup for Mum','Berry Picking on a Dewy Morning','A Home for Mr. Pipilini','Exchanging Nature\'s Gifts','Seeking Master Thornstick\'s Wisdom','Battle in the Skies','A Throbbing Nightmare','An Unexpected Transformation','The First Snow','Sudden Snow','A First Snowy Journey and a Warm Welcome Home','The Next Morning','More Breakfasts','Negotiations with the Squirrels','The Hidden Underground Store','Planning an Underground Shelter','The Squirrels\' Secret Plan','The Squirrels\' Secret Plans','The Night Shift','The Squirrels\' Secret Gift','A Mysterious Expansion','Magic Hanging Carrot Buckets','Endless Mysteries of the Underground World','Mr. PinPin\'s Secret Observations','The Magic Squirrel of the Underground World','The Magic Squirrel: Continued','Flight in the Night Forest','A Goodnight Kiss and Magical Dreams','Mr. PinPin\'s Early Morning','Breakfast in the PinPin Home','Morning Chores in the PinPin Household','Morning Chores: Continued','An Important Day'],
    es:['El señor PinPin y su bosque misterioso','La sabiduría del anciano','Hogar, dulce hogar','La academia del bosque','Papá y una partida de ajedrez','Sopa mágica para mamá','Recogiendo bayas una mañana de rocío','Un hogar para el señor Pipilini','Intercambiando regalos de la naturaleza','En busca de la sabiduría del maestro Paloespinoso','Batalla en el cielo','Una pesadilla palpitante','Una transformación inesperada','La primera nieve','Nieve repentina','El primer viaje por la nieve y una cálida bienvenida','La mañana siguiente','Más desayunos','Negociaciones con las ardillas','La reserva subterránea oculta','Planeando un refugio subterráneo','El plan secreto de las ardillas','Los planes secretos de las ardillas','El turno de noche','El regalo secreto de las ardillas','Una expansión misteriosa','Cubos mágicos de zanahorias colgantes','Misterios sin fin del mundo subterráneo','Las observaciones secretas del señor PinPin','La ardilla mágica del mundo subterráneo','La ardilla mágica: continuación','Vuelo por el bosque nocturno','Un beso de buenas noches y sueños mágicos','La madrugada del señor PinPin','El desayuno en casa de los PinPin','Las tareas matutinas de los PinPin','Las tareas matutinas: continuación','Un día importante']
  };
  const standaloneLabels = {
    en:{search:'Find a chapter or adventure',all:'All stories',band:'Standalone adventures',main:'The main book',read:'Read adventure',empty:'No matching stories.'},
    es:{search:'Buscar un capítulo o aventura',all:'Todas las historias',published:'Publicadas',band:'Aventuras independientes',main:'El libro principal',read:'Leer aventura',empty:'No hay historias que coincidan.'},
    ru:{search:'Найти главу или приключение',all:'Все истории',band:'Отдельные приключения',main:'Основная книга',read:'Читать приключение',empty:'Истории не найдены.'}
  };
  let book, art, translations, published, stories = [];
  function render() {
    const url = new URL(location.href);
    const lang = ['en','es','ru'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : 'en';
    url.searchParams.set('lang',lang);
    history.replaceState(null,'',url);
    const ui = {...labels[lang], ...standaloneLabels[lang]};
    document.documentElement.lang = lang;
    const atlasTitle = {en:'The Shire',es:'La Comarca',ru:'Шир'}[lang];
    $('library-atlas').href = 'atlas-webgpu.html?lang=' + lang;
    $('library-atlas').title = atlasTitle;
    $('library-atlas').setAttribute('aria-label',atlasTitle);
    document.title = window.readerLabels[lang].book + ' - ' + ui.all;
    $('library-title').textContent = window.readerLabels[lang].book;
    $('original-book').textContent = window.readerLabels[lang].original;
    $('library-eyebrow').textContent = ui.eyebrow;
    $('chapter-search').placeholder = ui.search;
    $('chapter-search').setAttribute('aria-label',ui.search);
    $('chapter-filter').setAttribute('aria-label',ui.all);
    [...$('chapter-filter').options].forEach(option => { option.textContent = ui[option.value]; });
    document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.lang === lang)));
    const query = $('chapter-search').value.trim().toLocaleLowerCase(lang);
    const filter = $('chapter-filter').value;
    $('adventure-title').textContent = ui.band;
    $('main-book-title').textContent = ui.main;
    const adventures = stories.filter(story => filter !== 'upcoming' && (!query ||
      [...Object.values(story.title), ...Object.values(story.continuationTitles || {})]
        .join(' ').toLocaleLowerCase(lang).includes(query))).map(story => {
      const card = document.createElement('article');
      card.className = 'adventure-cover published';
      card.dataset.story = story.id;
      const link = document.createElement('a');
      const destination = new URL('./', location.href);
      destination.search = url.search;
      destination.searchParams.set('story', story.id);
      destination.searchParams.delete('chapter');
      destination.searchParams.set('lang', lang);
      link.href = destination.href;
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.src = story.cover[lang];
      const cover = story.scenes[0];
      image.alt = cover.alt[lang];
      image.width = cover.width; image.height = cover.height; image.decoding = 'async';
      const titleCover = window.titleCovers.resolve(story.id, lang);
      if (titleCover) window.titleCovers.apply(image, titleCover, lang, {...cover, src:story.cover[lang]});
      figure.style.aspectRatio = cover.width + ' / ' + cover.height;
      figure.append(image);
      const title = document.createElement('h3');
      title.textContent = story.title[lang];
      const status = document.createElement('p');
      status.className = 'availability'; status.textContent = ui.read;
      link.append(figure, title, status); card.append(link);
      return card;
    });
    $('adventure-library').replaceChildren(...adventures);
    $('standalone-adventures').hidden = adventures.length === 0;
    const cards = [];
    book.chapters.forEach((chapter,index) => {
      const ready = published.has(String(index + 1));
      const title = index === 0 ? translations['chapter-01'][lang]?.title || window.readerLabels.ru.title :
        (ready && translations[chapter.id]?.[lang]?.title) || titles[lang]?.[index] || chapter.title.replace(/^Глава\s*\d*\s*:\s*/, '');
      if (filter !== 'all' && filter !== (ready ? 'published' : 'upcoming')) return;
      if (query && !(String(index+1) + ' ' + title + ' ' + chapter.title).toLocaleLowerCase(lang).includes(query)) return;
      const card = document.createElement('article');
      card.className = 'chapter-cover' + (ready ? ' published' : '');
      card.dataset.chapter = index + 1;
      const content = document.createElement(ready ? 'a' : 'div');
      if (ready) {
        const destination = new URL('./', location.href);
        destination.search = url.search;
        destination.searchParams.delete('story');
        destination.searchParams.set('chapter', String(index + 1));
        destination.searchParams.set('lang', lang);
        content.href = destination.href;
      }
      const original = chapter.blocks.flat().find(block => block.type === 'image');
      const asset = ready ? art.chapters[chapter.id].find(image => image.scene === 1) : original;
      const titleCover = ready ? window.titleCovers.resolve(chapter.id, lang) : null;
      if (asset) {
        const figure = document.createElement('figure');
        const image = document.createElement('img');
        image.src = asset.src;
        image.width = asset.width; image.height = asset.height;
        image.alt = ready ? asset.alt[lang] : ui.original + ': ' + title;
        if (titleCover) {
          figure.style.aspectRatio = titleCover.width + ' / ' + titleCover.height;
          window.titleCovers.apply(image, titleCover, lang, asset, () => { figure.style.aspectRatio = ''; });
        }
        image.loading = index < 3 ? 'eager' : 'lazy'; image.decoding = 'async';
        figure.append(image); content.append(figure);
      } else {
        const placeholder = document.createElement('figure');
        placeholder.className = 'unillustrated';
        placeholder.setAttribute('aria-hidden','true');
        placeholder.textContent = String(index+1).padStart(2,'0');
        content.append(placeholder);
      }
      for (const [tag,cls,text] of [
        ['p','cover-number',window.readerLabels[lang].chapter + ' ' + String(index+1).padStart(2,'0')],
        ['h2','',title],
        ['p','availability',ready ? ui.ready : ui.planned + (original ? ' · ' + ui.original : '')]
      ]) { const node = document.createElement(tag); node.className = cls; node.textContent = text; content.append(node); }
      card.append(content);
      cards.push(card);
    });
    $('chapter-library').replaceChildren(...cards);
    $('chapter-library').setAttribute('aria-busy','false');
    $('main-book-title').hidden = cards.length === 0;
    $('library-status').textContent = cards.length || adventures.length ? '' : ui.empty;
  }
  document.querySelectorAll('[data-lang]').forEach(button => { button.onclick = () => {
    const url = new URL(location.href); url.searchParams.set('lang',button.dataset.lang);
    history.pushState(null,'',url); if (book) render();
  }; });
  $('chapter-search').addEventListener('input',() => { if (book) render(); });
  $('chapter-filter').addEventListener('change',() => { if (book) render(); });
  addEventListener('popstate',() => { if (book) render(); });
  Promise.all(['book.json','illustrations.json','translations.json'].map(async path => {
    const response = await fetch(path, {cache:'no-cache'}); if (!response.ok) throw new Error(path); return response.json();
  })).then(async data => {
    const [original, images, text] = data;
    await window.titleCovers.load();
    published = await window.chapterEditions.available(images, text);
    stories = await window.standaloneStories.available();
    [book,art,translations] = [original, images, text];
    render(); window.lucide?.createIcons();
  })
    .catch(() => { $('library-status').textContent = labels[document.documentElement.lang]?.error || labels.en.error; $('chapter-library').setAttribute('aria-busy','false'); });
})();
