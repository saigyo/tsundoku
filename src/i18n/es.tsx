import type { Messages } from './messages'

export const es: Messages = {
  locale: 'es',
  app: {
    loading: 'Cargando la biblioteca…',
    loadError: (message) => `No se pudo cargar la biblioteca: ${message}`,
    incompatibleNotice:
      'La biblioteca guardada en el navegador proviene de una versión anterior de la aplicación ' +
      'y ya no puede leerse — vuelve a cargar tu exportación.',
    replaceLibrary: 'Cambiar de biblioteca',
    navAria: 'Vistas',
    moreMenu: 'Más',
  },
  nav: {
    shelf: 'Estantería',
    timeline: 'Adquisición y lectura',
    knowledge: 'Mapa del conocimiento',
    tagTrends: 'Tendencias de etiquetas',
    network: 'Red de etiquetas',
    languages: 'Flujo de idiomas',
    years: 'Edición × adquisición',
    pace: 'Ritmo de lectura',
    canon: 'Canon',
    genres: 'Géneros',
    quality: 'Calidad de datos',
  },
  upload: {
    intro: (
      <>
        <em>Tsundoku</em> (積ん読) — comprar libros y dejarlos apilarse sin leerlos. Esta
        aplicación explora una biblioteca de LibraryThing de forma interactiva: ocho vistas
        enlazadas, desde la estantería dibujada a escala hasta el flujo de idiomas, pasando por
        las cronologías y la red de etiquetas — y cada vista es a la vez filtro para todas las
        demás. La pregunta central: ¿qué revela la diferencia entre lo que uno <em>adquiere</em>{' '}
        y lo que uno <em>lee</em>?
      </>
    ),
    title: 'Cargar tu biblioteca',
    ltIntro: (
      <>
        La aplicación lee exportaciones de{' '}
        <a href="https://www.librarything.com" target="_blank" rel="noopener noreferrer">
          LibraryThing
        </a>
        , un servicio en línea para catalogar tu colección de libros. Exporta allí tu biblioteca
        en{' '}
        <a href="https://www.librarything.com/export.php" target="_blank" rel="noopener noreferrer">
          librarything.com/export.php
        </a>{' '}
        en formato <strong>JSON</strong> y carga aquí el archivo. Se lee directamente en el
        navegador y <strong>no sale de tu equipo</strong>.
      </>
    ),
    dropHere: 'Arrastra aquí tu archivo de exportación o',
    chooseFile: 'elige un archivo',
    working: 'Normalizando…',
    backToLoaded: 'Volver a la biblioteca cargada',
    errorPrefix: 'Error:',
    errInvalidJson: 'El archivo no es JSON válido.',
    errTooLarge: (mbFmt, limitMbFmt) =>
      `El archivo ocupa ${mbFmt} MB — el límite es ${limitMbFmt} MB. LibraryThing permite exportaciones filtradas (por ejemplo, una sola colección).`,
    errTooMany: (maxFmt) =>
      `la exportación contiene más de ${maxFmt} entradas. ` +
      'Las vistas lo mantienen todo en memoria; elige una exportación filtrada (LibraryThing puede exportar, por ejemplo, una sola colección).',
    errNotAnExport:
      'no es una exportación de LibraryThing (se esperaba un objeto JSON con identificadores de libros como claves)',
    errNoBooks: 'no es una exportación de LibraryThing — el archivo no contiene entradas de libros',
  },
  report: {
    title: 'Tu biblioteca está lista',
    note:
      'Al leer la exportación se corrigieron pequeñas incoherencias del catálogo — medidas de ' +
      'libros intercambiadas, datos ausentes, caracteres especiales rotos. Nada de esto ocurre ' +
      'a escondidas: este resumen muestra qué ha pasado con tus datos.',
    entries: 'Entradas',
    media: 'Medios',
    read: 'Leídos',
    readValue: (readFmt, knownFmt, datedFmt, minYear) =>
      `${readFmt} (año de lectura conocido: ${knownFmt}, de ellos ${datedFmt} con fecha exacta${minYear !== null ? `, desde ${minYear}` : ''})`,
    pagesTotal: 'Páginas en total',
    readDays: 'Duración de lectura',
    readDaysValue: (median, p90, max) =>
      `normalmente ${median} días, rara vez más de ${p90}, la más larga ${max}`,
    tags: 'Etiquetas',
    tagsValue: (normFmt, rawFmt) => `${normFmt} unificadas (en la exportación: ${rawFmt})`,
    dimsSwapped: 'Medidas de libros intercambiadas',
    dimsSwappedValue: (sortedFmt, discardedFmt) => `${sortedFmt} corregidas, ${discardedFmt} descartadas`,
    dimsEstimated: 'Medidas de libros estimadas',
    dimsEstimatedValue: (nFmt) => `${nFmt} libros (a partir del número de páginas)`,
    origLangInferred: 'Idioma original completado',
    origLangInferredValue: (nFmt) => `${nFmt} libros (a partir del idioma de la edición)`,
    entitiesDecoded: 'Caracteres especiales reparados',
    entitiesDecodedValue: (nFmt) => `${nFmt} campos`,
    bulkImport: 'Importación masiva detectada',
    bulkImportValue: (nFmt) => `${nFmt} entradas`,
    acquired: 'Señal de adquisición',
    acquiredValue: (d, p, t) => `${d} directas + ${p} por fecha de registro = ${t}`,
    toLibrary: 'Ir a la biblioteca',
    otherFile: 'Elegir otro archivo',
  },
  media: {
    book: 'Libro',
    ebook: 'Libro electrónico',
    film: 'Película',
    vinyl: 'Vinilo',
  },
  ddc: {
    labels: {
      0: 'Generalidades e informática',
      1: 'Filosofía y psicología',
      2: 'Religión',
      3: 'Ciencias sociales',
      4: 'Lenguas',
      5: 'Ciencias naturales',
      6: 'Tecnología y medicina',
      7: 'Artes y entretenimiento',
      8: 'Literatura',
      9: 'Historia y geografía',
    },
    short: {
      0: 'Informática',
      1: 'Filosofía',
      2: 'Religión',
      3: 'Ciencias sociales',
      4: 'Lenguas',
      5: 'Ciencias naturales',
      6: 'Tecnología',
      7: 'Artes',
      8: 'Literatura',
      9: 'Historia',
    },
  },
  lang: {
    other: 'otro',
    unknown: 'desconocido',
  },
  filter: {
    tag: (v) => `Etiqueta: ${v}`,
    language: (label) => `Idioma: ${label}`,
    originalLanguage: (label) => `Original: ${label}`,
    ddcTop: (label) => `Materia: ${label}`,
    mediaType: (label) => `Medio: ${label}`,
    collection: (v) => `Colección: ${v}`,
    author: (v) => `Autor/a: ${v}`,
    award: (v) => `Lista: ${v}`,
    genre: (label) => `Género: ${label}`,
    flag: (label) => `Calidad: ${label}`,
    acquired: (from, to) => `Adquiridos: ${from}–${to}`,
    read: (from, to) => `Leídos: ${from}–${to}`,
    edition: (from, to) => `Edición: ${from}–${to}`,
    statusRead: 'Estado: leído',
    statusUnread: 'Estado: sin leer',
  },
  chips: {
    regionAria: 'Filtros activos',
    removeAria: (label) => `Quitar el filtro: ${label}`,
    clearAll: 'Quitar todos los filtros',
  },
  filterEditor: {
    openAria: 'Añadir filtro',
    title: 'Filtros',
    status: 'Estado',
    medium: 'Medio',
    collection: 'Colección',
    read: 'Leído',
    unread: 'Sin leer',
    close: 'Cerrar',
  },
  empty: {
    title: 'Ningún título coincide con el filtro actual',
    active: 'Estos filtros están activos:',
    release: 'quitar',
  },
  summary: {
    titles: 'títulos',
    read: 'leídos',
    pages: 'páginas',
    filteredFrom: (totalFmt) => `filtrados de ${totalFmt} títulos`,
  },
  coverage: {
    frame: (covered, total, unit) => (
      <>
        {covered} de {total} {unit}
      </>
    ),
    unitTitles: 'títulos',
    unitTags: 'etiquetas',
  },
  detail: {
    original: 'Original',
    editionYear: 'Año de esta edición',
    language: 'Idioma',
    originalLanguage: 'Idioma original',
    pages: 'Páginas',
    ddc: 'Materia',
    acquired: 'Adquirido',
    read: 'Leído',
    readTagged: (year) => `${year} (etiqueta de año)`,
    acquiredProxy: (v) => `${v} (según la fecha de registro)`,
    rating: 'Valoración',
    boughtAt: 'Comprado en',
    series: 'Serie',
    isbn: 'ISBN',
    tags: 'Etiquetas',
    genres: 'Géneros',
    toggleFilterAria: (label) => `Alternar el filtro ${label}`,
    filterByAuthorAria: (name) => `Filtrar por ${name}`,
    viewOnLt: 'Ver en LibraryThing ↗',
    coverAlt: (title) => `Portada: ${title}`,
    coverLoad: 'Cargar la portada desde OpenLibrary',
    coverNote: 'Esto envía el ISBN a covers.openlibrary.org. Basta con aceptar una vez — puedes desactivarlo en el pie de página.',
    coverNone: 'Sin portada',
    coverZoomAria: 'Ampliar la portada',
    viewOnOl: 'Ver en OpenLibrary ↗',
    close: 'Cerrar',
  },
  bookListPopup: {
    listAria: (context) => `Lista de títulos: ${context}`,
    scrollHint: (countFmt) => `↕ ${countFmt} títulos — desplázate para ver más`,
    openDetailAria: (title) => `Abrir los detalles de «${title}»`,
  },
  rangeForm: {
    dimensionAria: 'Dimensión del filtro temporal',
    acquired: 'Adquisición',
    read: 'Lectura',
    from: 'desde',
    to: 'hasta',
    submit: 'Filtrar el periodo',
  },
  views: {
    shelf: {
      title: 'La Estantería',
      coverage: (estimatedFmt, unmeasuredFmt, nonBooksFmt) => (
        <>
          están en la estantería — de ellos {estimatedFmt} con medidas estimadas a partir del
          número de páginas (semitransparentes, contorno discontinuo). {unmeasuredFmt} sin
          medidas ni número de páginas figuran abajo; {nonBooksFmt} elementos que no son libros
          quedan fuera.
        </>
      ),
      sort: 'Orden',
      color: 'Color',
      sortLabels: { acquired: 'Adquisición', author: 'Autor/a', height: 'Altura', ddc: 'Materia' },
      colorLabels: { ddc: 'Materia', language: 'Idioma', readStatus: 'Estado de lectura', acquiredYear: 'Año de adquisición' },
      svgAria: (countFmt) => `Estantería con ${countFmt} libros`,
      estimatedSuffix: ' (medidas estimadas)',
      estimatedShort: 'medidas estimadas',
      unmeasuredAria: 'Libros sin medidas',
      unmeasuredTitle: (countFmt) =>
        `sin medidas ni número de páginas para estimarlas (${countFmt}) — tamaño uniforme, fuera de escala`,
      legendAria: 'Leyenda de colores',
      noInfo: 'sin datos',
      legendRead: 'leído',
      legendUnread: 'sin leer (contorno)',
      noAcqYear: 'sin año de adquisición',
      decade: (decade) => `década de ${decade}`,
    },
    timeline: {
      title: 'Adquisición y lectura',
      coverage: (readKnownFmt, taggedOnlyFmt) => (
        <>
          tienen año de adquisición; {readKnownFmt} tienen año de lectura, de ellos{' '}
          {taggedOnlyFmt} solo por etiquetas de año.
        </>
      ),
      noYears: 'en el filtro actual tienen año de adquisición o de lectura.',
      svgAria: 'Adquisiciones (hacia arriba) y lecturas (hacia abajo) por año',
      maxGap: (year) => `mayor brecha: ${year}`,
      brushAcquired: 'Adquisición',
      brushRead: 'Lectura',
      unreadSvgAria: 'Pendientes de lectura, acumulados',
      unreadPanelLabel: 'pendientes de lectura (solo títulos con año de adquisición)',
      legendAcquired: 'adquisiciones',
      legendReadDated: 'lecturas (fecha exacta)',
      legendReadTagged: 'lecturas (etiqueta de año)',
      filterUnread: 'Filtrar los pendientes',
      hint:
        'Para elegir un periodo, arrastra horizontalmente sobre el gráfico — por encima de la línea ' +
        'cero se filtra por año de adquisición, por debajo por año de lectura; un clic selecciona ' +
        'un solo año y Esc cancela la selección.',
      tooltipAcquired: (countFmt) => `${countFmt} adquiridos`,
      tooltipRead: (countFmt) => `${countFmt} leídos`,
      tooltipUnread: (countFmt) => `${countFmt} pendientes de lectura`,
    },
    knowledge: {
      title: 'Mapa del conocimiento',
      coverage: (deltaFmt) => (
        <>tienen código CDD y año de adquisición ({deltaFmt} con año de adquisición pero sin CDD).</>
      ),
      noData: 'en el filtro actual tienen código CDD y año de adquisición.',
      controlsAria: 'Visualización',
      absolute: 'absoluto',
      share: 'proporciones',
      smooth: 'media de tres años',
      svgAria: 'Clases principales de la CDD a lo largo de los años de adquisición',
      streamTitle: (ddcClass, label, countFmt) => `${ddcClass} ${label}: ${countFmt} títulos`,
      hint:
        'Para elegir un periodo, arrastra horizontalmente sobre el gráfico: se filtra por año de ' +
        'adquisición y Esc cancela la selección; un clic en una corriente filtra por la materia.',
    },
    tagTrends: {
      title: 'Tendencias de etiquetas',
      coverageAcquired: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          tienen año de adquisición — el eje temporal de esta vista; sin año: {missingFmt}. Ocultas
          como etiquetas: {yearTagsFmt} etiquetas de año, {statusFmt} marcadores de estado,{' '}
          {seriesFmt} siglas de serie.
        </>
      ),
      coverageRead: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          tienen año de lectura — el eje temporal de esta vista; sin año: {missingFmt}. Ocultas
          como etiquetas: {yearTagsFmt} etiquetas de año, {statusFmt} marcadores de estado,{' '}
          {seriesFmt} siglas de serie.
        </>
      ),
      noData: 'Ningún título de la selección actual tiene año en este eje temporal.',
      axisAria: 'Eje temporal',
      axisAcquired: 'Adquisición',
      axisRead: 'Lectura',
      modeAria: 'Representación',
      modeLines: 'Líneas',
      modeHeatmap: 'Mapa de calor',
      svgAria: 'Frecuencia de las etiquetas a lo largo del tiempo',
      labelsAria: 'Etiquetas del panel de tendencias',
      tagButtonTitle: (tag, countFmt) => `${tag}: ${countFmt} títulos — clic para filtrar`,
      rankingTitle: (from, to) =>
        from === to ? `Especialmente frecuentes en ${from}` : `Especialmente frecuentes ${from}–${to}`,
      rankingHint: (minFmt) => `frente a la selección filtrada; al menos ${minFmt} títulos en el periodo`,
      rankingEmpty: 'Ninguna etiqueta es notablemente más frecuente en este periodo que de costumbre.',
      rankingCount: (inSliceFmt, totalFmt) => `${inSliceFmt} de ${totalFmt} títulos`,
      factor: (factorFmt) => `×${factorFmt}`,
      pinAria: (tag) => `Añadir «${tag}» al panel de tendencias`,
      unpinAria: (tag) => `Quitar «${tag}» del panel de tendencias`,
      pinLimitTitle: 'Como máximo 8 etiquetas añadidas',
      tooltip: (tag, year, countFmt, factorFmt) => `${tag} — ${year}: ${countFmt} títulos (×${factorFmt})`,
      hint: 'Arrastrar elige el periodo de la clasificación; clic, un solo año — la selección no filtra.',
    },
    network: {
      title: 'Red de etiquetas',
      coverage: (minCount, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          tienen ≥ {minCount} títulos y aparecen en la red; no se muestran: {yearTagsFmt}{' '}
          etiquetas de año, {statusFmt} marcadores de estado, {seriesFmt} siglas de serie.
        </>
      ),
      minCountLabel: 'Número mínimo de títulos:',
      searchPlaceholder: 'Buscar etiqueta…',
      searchAria: 'Buscar etiqueta',
      zoomLabel: 'Zoom:',
      zoomAria: 'Factor de zoom',
      fit: 'Ajustar',
      unisolate: (tag) => `Quitar el aislamiento (${tag})`,
      svgAria: 'Red de etiquetas asignadas conjuntamente',
      nodeAria: (tag, countFmt) => `Etiqueta ${tag}, ${countFmt} títulos`,
      nodeTitle: (tag, countFmt) =>
        `${tag}: ${countFmt} títulos (clic = filtrar, Mayús + clic = aislar el vecindario)`,
    },
    languages: {
      title: 'Flujo de idiomas',
      coverage: (inferredFmt) => (
        <>
          tienen idioma de edición; en {inferredFmt} de ellos, al no constar el idioma original,
          se toma también como original (convención de catalogación).
        </>
      ),
      noData: 'en el filtro actual tienen idioma de edición.',
      svgAria: 'Flujo del idioma original al idioma de edición',
      linkLabel: (source, target, countFmt) => `${source} → ${target}: ${countFmt} títulos`,
      linkAriaFilter: (label) => `${label}. Pulsa Intro para filtrar por esta combinación.`,
      origSide: 'Idioma original',
      edSide: 'Idioma de edición',
      nodeAria: (side, lang, countFmt) => `${side}: ${lang}, ${countFmt} títulos`,
      nodeTitle: (side, lang, countFmt) =>
        `${side}: ${lang} — ${countFmt} títulos (un clic filtra solo este idioma)`,
    },
    years: {
      title: 'Año de edición frente a año de adquisición',
      coverage: (
        <>
          tienen ambos años. Atención: se trata del año de <em>esta edición</em>, no de la obra —
          una edición Reclam de Sófocles cuenta como 1998.
        </>
      ),
      noData: 'en el filtro actual tienen año de edición y de adquisición (desde 1900).',
      underflow: (countFmt) => `${countFmt} ediciones anteriores a 1900 no se muestran.`,
      svgAria: 'Mapa de calor año de edición × año de adquisición',
      axisEdition: 'Año de esta edición →',
      axisAcquired: 'Año de adquisición →',
      edition: 'Edición',
      acquired: 'Adquisición',
      edFromAria: 'Año de edición desde',
      edToAria: 'Año de edición hasta',
      acqFromAria: 'Año de adquisición desde',
      acqToAria: 'Año de adquisición hasta',
      submit: 'Filtrar el rango',
      tooltip: (ed, acq, countFmt) => `Edición ${ed}, adquisición ${acq}: ${countFmt} títulos`,
      tooltipEdition: (year, countFmt) => `Edición ${year}: ${countFmt} títulos`,
      tooltipAcquired: (year, countFmt) => `Adquisición ${year}: ${countFmt} títulos`,
    },
    pace: {
      title: 'Ritmo de lectura',
      coverage:
        'tienen duración de lectura y número de páginas — las lecturas registradas a conciencia están sobrerrepresentadas.',
      discarded: (countFmt) => <>{countFmt} duraciones negativas descartadas.</>,
      noData: (pointsFmt) => (
        <>
          en el filtro actual tienen fecha de inicio y de fin (de ellos {pointsFmt} también con
          número de páginas).
        </>
      ),
      facetToggle: 'desglosar por idioma',
      svgAria: (langLabel) => `Páginas frente a duración de lectura${langLabel ? `, ${langLabel}` : ''}`,
      rateLabel: (rate) => `${rate} págs./día`,
      dotAria: (title, pagesFmt, daysFmt) => `${title}: ${pagesFmt} páginas en ${daysFmt} días`,
      dotTitle: (title, pagesFmt, daysFmt, suspect) =>
        `${title} — ${pagesFmt} págs. / ${daysFmt} días${suspect ? ' (más de 100 días: no consta si la lectura fue continua)' : ''}`,
      axisPages: 'Páginas',
      axisDays: 'Días',
      note: 'Puntos huecos: más de 100 días — no consta si la lectura fue continua; no interpretar como ritmo.',
    },
    canon: {
      title: 'Contraste con el canon',
      coverage:
        'figuran en al menos una lista. Las cifras significan «en la biblioteca», no «tachado ' +
        'de la lista» — la extensión de las listas no consta en la exportación.',
      noData: 'en el filtro actual figuran en alguna lista de premios o de canon.',
      showLists: 'Mostrar listas:',
      onlyUnread: 'Solo pendientes → lista de lectura',
      counts: (ownedFmt, readFmt) => `${ownedFmt} en la biblioteca · ${readFmt} leídos`,
    },
    genres: {
      title: 'Géneros',
      coverage: (noGenreFmt, noAxisFmt) =>
        `llevan un género más allá de «Sin género». Los ${noGenreFmt} títulos sin género son ` +
        `casi exclusivamente vinilos y películas; otros ${noAxisFmt} solo llevan géneros ` +
        `específicos, sin clasificación ficción/no ficción.`,
      counts: (ownedFmt, readFmt, pctFmt) => `${ownedFmt} en la biblioteca · ${readFmt} leídos · ${pctFmt} %`,
      sortLabel: 'Orden:',
      sortByOwned: 'Fondo',
      sortByRate: 'Tasa de lectura',
    },
    quality: {
      title: 'Calidad de datos',
      tiles: {
        acquired: 'Señal de adquisición',
        acquiredParts: (d, p, mi) => `${d} directas · ${p} por fecha de registro · ${mi} sin dato`,
        readYear: 'Año de lectura de los leídos',
        readYearParts: (t) => `de ellos ${t} solo por etiqueta de año`,
        bulk: 'Importación masiva',
        bulkNote: 'Sesiones de catalogación, no comportamiento de adquisición',
        dims: 'Dimensiones medidas',
        dimsParts: (e, mi) => `${e} estimadas · ${mi} sin dato`,
        rating: 'Valorados',
        ratingParts: (n) => `${n} valorados`,
      },
      pct: (p) => `${p} %`,
      rowCounts: (n, t, p) => `${n} de ${t} · ${p} %`,
      coverageTitle: 'Cobertura de campos',
      flagsTitle: 'Indicadores de calidad — clic para filtrar',
      globalTitle: 'Limpiado al importar (biblioteca completa)',
      fields: {
        ddc: 'Clasificación DDC',
        pages: 'Número de páginas',
        dimsMeasured: 'Dimensiones medidas',
        origLangRecorded: 'Idioma original registrado',
        acquiredDirect: 'Fecha de adquisición directa',
        weight: 'Peso',
        awards: 'Distinciones',
        started: 'Lectura iniciada',
        price: 'Precio',
        rating: 'Valoración',
        readDate: 'Fecha de lectura',
        series: 'Serie',
        fromWhere: 'Lugar de compra',
      },
      global: {
        entities: 'Entidades HTML descodificadas',
        dimsSorted: 'Dimensiones reordenadas (permutadas)',
        dimsDiscarded: 'Dimensiones descartadas',
        dimsEstimated: 'Dimensiones estimadas por páginas',
        origLang: 'Idiomas originales deducidos',
        tags: 'Etiquetas fusionadas',
        tagsValue: (raw, norm) => `${raw} brutas → ${norm} normalizadas`,
      },
    },
  },
  genreNames: {
    'Fiction': 'Ficción',
    'General Fiction': 'Ficción general',
    'Nonfiction': 'No ficción',
    'General Nonfiction': 'No ficción general',
    'No Genre': 'Sin género',
    'Anthropology': 'Antropología',
    'Art & Design': 'Arte y diseño',
    'Biography & Memoir': 'Biografías y memorias',
    'Business': 'Empresa y negocios',
    "Children's Books": 'Libros infantiles',
    'Comics': 'Cómic',
    'Economics': 'Economía',
    'Fantasy': 'Fantasía',
    'Food & Cooking': 'Cocina y gastronomía',
    'Health & Wellness': 'Salud y bienestar',
    'Historical Fiction': 'Novela histórica',
    'History': 'Historia',
    'Home & Garden': 'Hogar y jardín',
    'Horror': 'Terror',
    'Hunting and Fishing': 'Caza y pesca',
    'Kids': 'Niños',
    'LGBTQ+': 'LGBTQ+',
    'Literature Studies and Criticism': 'Estudios literarios y crítica',
    'Music': 'Música',
    'Mystery': 'Novela negra',
    'Philosophy': 'Filosofía',
    'Picture Books': 'Álbumes ilustrados',
    'Poetry': 'Poesía',
    'Politics, Government, Law and Public Policy': 'Política, derecho y sociedad',
    'Recent Fiction': 'Ficción reciente',
    'Reference': 'Obras de referencia',
    'Religion & Spirituality': 'Religión y espiritualidad',
    'Romance': 'Romántica',
    'Science & Nature': 'Ciencia y naturaleza',
    'Science Fiction': 'Ciencia ficción',
    'Sexuality and Gender Studies': 'Sexualidad y estudios de género',
    'Sociology': 'Sociología',
    'Sports and Leisure': 'Deporte y ocio',
    'Suspense & Thriller': 'Suspense y thriller',
    'Technology': 'Tecnología',
    'Teen': 'Adolescente',
    'Travel': 'Viajes',
    'Tween': 'Preadolescente',
    'Young Adult': 'Juvenil',
  },
  flagNames: {
    bulkImport: 'Entrada de importación masiva',
    physicalEstimated: 'Dimensiones estimadas',
    origLangInferred: 'Idioma original deducido',
    readYearTag: 'Año de lectura solo por etiqueta',
    acquiredEntry: 'Adquisición solo por fecha de registro',
    abandoned: 'Empezado, nunca terminado',
  },
  footer: {
    license: 'Licencia MIT',
    embedded: 'Licencias de las fuentes y bibliotecas incorporadas',
    covers: 'Portadas de OpenLibrary',
    languageAria: 'Idioma',
  },
}
