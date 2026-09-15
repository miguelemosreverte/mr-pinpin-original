window.readerLabels = {
  ru: {book:'Мистер Пин-Пин', subtitle:'Истории Шепчущего леса', chapter:'ГЛАВА', scene:'Сцена', contents:'Оглавление', close:'Закрыть', previous:'Предыдущая глава', next:'Следующая глава', illustrated:'Иллюстрированная глава', illustrations:'иллюстраций', newArt:'Новые иллюстрации', original:'Оригинальная книга', originalArt:'Иллюстрации оригинала', completed:'Иллюстрировано глав', fallback:''},
  en: {book:'Mr. PinPin', subtitle:'Tales of the Whispering Forest', chapter:'CHAPTER', scene:'Scene', contents:'Contents', close:'Close', previous:'Previous chapter', next:'Next chapter', illustrated:'Illustrated chapter', illustrations:'illustrations', newArt:'New illustrations', original:'Original book', originalArt:'Original illustrations', completed:'Chapters illustrated', fallback:'English translation in progress. Russian original below.'},
  es: {book:'Señor PinPin', subtitle:'Historias del Bosque Susurrante', chapter:'CAPÍTULO', scene:'Escena', contents:'Índice', close:'Cerrar', previous:'Capítulo anterior', next:'Capítulo siguiente', illustrated:'Capítulo ilustrado', illustrations:'ilustraciones', newArt:'Nuevas ilustraciones', original:'Libro original', originalArt:'Ilustraciones originales', completed:'Capítulos ilustrados', fallback:'Traducción al español en preparación. Original ruso a continuación.'}
};
Object.assign(window.readerLabels.ru, {
  title:'Мистер Пин-Пин и его загадочный лес', print:'Печать / Сохранить PDF',
  preparing:'Подготовка иллюстраций…', printError:'Не удалось подготовить PDF. Попробуйте ещё раз.',
  loadError:'Не удалось загрузить главу.', retry:'Попробовать снова'
});
Object.assign(window.readerLabels.en, {
  print:'Print / Save PDF', preparing:'Preparing illustrations…',
  printError:'Could not prepare the PDF. Please try again.', loadError:'Could not load the chapter.', retry:'Try again'
});
Object.assign(window.readerLabels.es, {
  print:'Imprimir / Guardar PDF', preparing:'Preparando las ilustraciones…',
  printError:'No se pudo preparar el PDF. Inténtalo de nuevo.', loadError:'No se pudo cargar el capítulo.', retry:'Intentar de nuevo'
});
