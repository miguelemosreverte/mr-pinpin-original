(() => {
  'use strict';
  const text = {
    ru: {title:'Дом Мистера Пин-Пина',door:'Открыть дверь в лес',bookcase:'Открыть книжный шкаф',scene:'Уютная комната Мистера Пин-Пина: дверь в лес между двумя круглыми окнами, книжный шкаф справа.',choose:'Выберите дверь или книжный шкаф',skip:'Перейти к комнате'},
    en: {title:'Mr. PinPin’s House',door:'Open the door to the forest',bookcase:'Open the bookcase',scene:'Mr. PinPin’s cozy room, with a forest door between two round windows and a bookcase on the right.',choose:'Choose the door or bookcase',skip:'Go to the room'},
    es: {title:'La casa del señor PinPin',door:'Abrir la puerta al bosque',bookcase:'Abrir la biblioteca',scene:'La acogedora habitación del señor PinPin, con una puerta al bosque entre dos ventanas redondas y una biblioteca a la derecha.',choose:'Elige la puerta o la biblioteca',skip:'Ir a la habitación'}
  };
  const requested = new URLSearchParams(location.search).get('lang');
  const lang = Object.hasOwn(text, requested) ? requested : 'ru';
  const words = text[lang];
  document.documentElement.lang = lang;
  document.title = words.title;
  document.querySelector('.home').setAttribute('aria-label', words.title);
  document.querySelectorAll('[data-language]').forEach(link => {
    if (link.dataset.language === lang) link.setAttribute('aria-current', 'true');
  });
  const destinations = {atlas:'storyboard/atlas-webgpu.html',library:'storyboard/library.html'};
  document.querySelectorAll('[data-destination]').forEach(link => {
    link.setAttribute('href', destinations[link.dataset.destination] + '?lang=' + lang);
  });
  document.querySelector('#door-link').setAttribute('aria-label', words.door);
  document.querySelector('#bookcase-link').setAttribute('aria-label', words.bookcase);
  document.querySelector('.room-art').alt = words.scene;
  document.querySelector('.room-links').setAttribute('aria-label', words.choose);
  document.querySelector('.skip-link').textContent = words.skip;
})();
