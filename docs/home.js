(() => {
  'use strict';
  const text = {
    ru: {welcome:'Добро пожаловать',title:'Дом Мистера Пин-Пина',forest:'В лес',books:'Книги',original:'Оригинальная книга',invitation:'Откройте дверь в лес или выберите книгу.',door:'Открыть дверь в лес',bookcase:'Открыть книжный шкаф',scene:'Уютная комната Мистера Пин-Пина: дверь в лес слева и книжный шкаф справа.',choose:'Выберите дверь или книжный шкаф',destinations:'Куда пойдём?',skip:'Перейти к ссылкам'},
    en: {welcome:'Welcome home',title:'Mr. PinPin’s House',forest:'Into the forest',books:'The books',original:'Original book',invitation:'Open the door to the forest, or choose a book.',door:'Open the door to the forest',bookcase:'Open the bookcase',scene:'Mr. PinPin’s cozy room, with a forest door on the left and a bookcase on the right.',choose:'Choose the door or bookcase',destinations:'Where shall we go?',skip:'Skip to the links'},
    es: {welcome:'Bienvenidos a casa',title:'La casa del señor PinPin',forest:'Al bosque',books:'Los libros',original:'Libro original',invitation:'Abre la puerta al bosque o elige un libro.',door:'Abrir la puerta al bosque',bookcase:'Abrir la biblioteca',scene:'La acogedora habitación del señor PinPin, con una puerta al bosque a la izquierda y una biblioteca a la derecha.',choose:'Elige la puerta o la biblioteca',destinations:'¿Adónde vamos?',skip:'Ir a los enlaces'}
  };
  const requested = new URLSearchParams(location.search).get('lang');
  const lang = Object.hasOwn(text, requested) ? requested : 'ru';
  const words = text[lang];
  document.documentElement.lang = lang;
  document.title = words.title;
  document.querySelectorAll('[data-text]').forEach(node => { node.textContent = words[node.dataset.text]; });
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
  document.querySelector('#destinations').setAttribute('aria-label', words.destinations);
  document.querySelector('.skip-link').textContent = words.skip;
})();
