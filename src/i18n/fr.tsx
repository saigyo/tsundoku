import type { Messages } from './messages'

export const fr: Messages = {
  locale: 'fr',
  app: {
    loading: 'Chargement de la bibliothèque…',
    loadError: (message) => `La bibliothèque n’a pas pu être chargée : ${message}`,
    incompatibleNotice:
      'La bibliothèque enregistrée dans le navigateur provient d’une version antérieure de ' +
      'l’application et ne peut plus être lue — merci de charger votre export une nouvelle fois.',
    replaceLibrary: 'Changer de bibliothèque',
    navAria: 'Vues',
  },
  nav: {
    shelf: 'Étagère',
    timeline: 'Acquisitions & lectures',
    knowledge: 'Carte des savoirs',
    tagTrends: 'Tendances des tags',
    network: 'Réseau de tags',
    languages: 'Flux des langues',
    years: 'Édition × acquisition',
    pace: 'Rythme de lecture',
    canon: 'Canon',
  },
  upload: {
    intro: (
      <>
        <em>Tsundoku</em> (積ん読) — acheter des livres et les empiler sans les lire. Cette
        application explore une bibliothèque LibraryThing de manière interactive : huit vues
        liées, de l’étagère dessinée à l’échelle au flux des langues, en passant par les
        chronologies et le réseau de tags — et chaque vue sert en même temps de filtre pour
        toutes les autres. La question centrale : que révèle l’écart entre ce que l’on{' '}
        <em>acquiert</em> et ce que l’on <em>lit</em> ?
      </>
    ),
    title: 'Charger votre bibliothèque',
    ltIntro: (
      <>
        L’application lit les exports de{' '}
        <a href="https://www.librarything.com" target="_blank" rel="noopener noreferrer">
          LibraryThing
        </a>
        , un service en ligne de catalogage de votre collection de livres. Exportez-y votre
        bibliothèque sur{' '}
        <a href="https://www.librarything.com/export.php" target="_blank" rel="noopener noreferrer">
          librarything.com/export.php
        </a>{' '}
        au format <strong>JSON</strong> et chargez le fichier ici. Il est lu directement dans le
        navigateur et <strong>ne quitte pas votre ordinateur</strong>.
      </>
    ),
    dropHere: 'Déposez votre fichier d’export ici ou',
    chooseFile: 'choisissez un fichier',
    working: 'Normalisation en cours…',
    backToLoaded: 'Retour à la bibliothèque chargée',
    errorPrefix: 'Erreur :',
    errInvalidJson: 'Le fichier n’est pas un JSON valide.',
    errTooLarge: (mbFmt, limitMbFmt) =>
      `Le fichier fait ${mbFmt} Mo — la limite est de ${limitMbFmt} Mo. LibraryThing permet des exports filtrés (une seule collection, par exemple).`,
    errTooMany: (maxFmt) =>
      `l’export contient plus de ${maxFmt} entrées. ` +
      'Les vues gardent tout en mémoire ; merci de choisir un export filtré (LibraryThing peut par exemple exporter une seule collection).',
    errNotAnExport:
      'pas un export LibraryThing (attendu : un objet JSON avec les identifiants de livres comme clés)',
    errNoBooks: 'pas un export LibraryThing — le fichier ne contient aucune entrée de livre',
  },
  report: {
    title: 'Votre bibliothèque est prête',
    note:
      'Lors de la lecture de l’export, de petites incohérences du catalogue ont été corrigées — ' +
      'dimensions de livres inversées, valeurs manquantes, caractères spéciaux abîmés. Rien de ' +
      'tout cela ne se fait en silence : cette vue d’ensemble montre ce qui est arrivé à vos données.',
    entries: 'Entrées',
    media: 'Supports',
    read: 'Lus',
    readValue: (readFmt, knownFmt, datedFmt, minYear) =>
      `${readFmt} (année de lecture connue pour ${knownFmt}, dont ${datedFmt} datés au jour près${minYear !== null ? `, à partir de ${minYear}` : ''})`,
    pagesTotal: 'Pages au total',
    readDays: 'Durée de lecture',
    readDaysValue: (median, p90, max) =>
      `le plus souvent ${median} jours, rarement plus de ${p90}, au maximum ${max}`,
    tags: 'Tags',
    tagsValue: (normFmt, rawFmt) => `${normFmt} après unification (dans l’export : ${rawFmt})`,
    dimsSwapped: 'Dimensions de livres inversées',
    dimsSwappedValue: (sortedFmt, discardedFmt) => `${sortedFmt} corrigées, ${discardedFmt} écartées`,
    dimsEstimated: 'Dimensions de livres estimées',
    dimsEstimatedValue: (nFmt) => `${nFmt} livres (d’après le nombre de pages)`,
    origLangInferred: 'Langue originale complétée',
    origLangInferredValue: (nFmt) => `${nFmt} livres (d’après la langue de l’édition)`,
    entitiesDecoded: 'Caractères spéciaux réparés',
    entitiesDecodedValue: (nFmt) => `${nFmt} champs`,
    bulkImport: 'Import en masse détecté',
    bulkImportValue: (nFmt) => `${nFmt} entrées`,
    toLibrary: 'Ouvrir la bibliothèque',
    otherFile: 'Choisir un autre fichier',
  },
  media: {
    book: 'Livre',
    ebook: 'Livre numérique',
    film: 'Film',
    vinyl: 'Vinyle',
  },
  ddc: {
    labels: {
      0: 'Généralités & informatique',
      1: 'Philosophie & psychologie',
      2: 'Religion',
      3: 'Sciences sociales',
      4: 'Langues',
      5: 'Sciences de la nature',
      6: 'Technologie & médecine',
      7: 'Arts & loisirs',
      8: 'Littérature',
      9: 'Histoire & géographie',
    },
    short: {
      0: 'Informatique',
      1: 'Philosophie',
      2: 'Religion',
      3: 'Sciences sociales',
      4: 'Langues',
      5: 'Sciences',
      6: 'Technologie',
      7: 'Arts',
      8: 'Littérature',
      9: 'Histoire',
    },
  },
  lang: {
    other: 'autre',
    unknown: 'inconnue',
  },
  filter: {
    tag: (v) => `Tag : ${v}`,
    language: (label) => `Langue : ${label}`,
    originalLanguage: (label) => `Original : ${label}`,
    ddcTop: (label) => `Domaine : ${label}`,
    mediaType: (label) => `Support : ${label}`,
    collection: (v) => `Collection : ${v}`,
    author: (v) => `Auteur·rice : ${v}`,
    award: (v) => `Liste : ${v}`,
    acquired: (from, to) => `Acquis : ${from}–${to}`,
    read: (from, to) => `Lus : ${from}–${to}`,
    edition: (from, to) => `Édition : ${from}–${to}`,
    statusRead: 'Statut : lu',
    statusUnread: 'Statut : non lu',
  },
  chips: {
    regionAria: 'Filtres actifs',
    removeAria: (label) => `Retirer le filtre : ${label}`,
    clearAll: 'Effacer tous les filtres',
  },
  filterEditor: {
    openAria: 'Ajouter un filtre',
    title: 'Filtres',
    status: 'Statut',
    medium: 'Support',
    collection: 'Collection',
    read: 'Lu',
    unread: 'Non lu',
    close: 'Fermer',
  },
  empty: {
    title: 'Aucun titre ne correspond aux filtres actuels',
    active: 'Filtres actuellement actifs :',
    release: 'retirer',
  },
  summary: {
    titles: 'titres',
    read: 'lus',
    pages: 'pages',
    filteredFrom: (totalFmt) => `filtrés parmi ${totalFmt} titres`,
  },
  coverage: {
    frame: (covered, total, unit) => (
      <>
        {covered} sur {total} {unit}
      </>
    ),
    unitTitles: 'titres',
    unitTags: 'tags',
  },
  detail: {
    original: 'Original',
    editionYear: 'Année de cette édition',
    language: 'Langue',
    originalLanguage: 'Langue originale',
    pages: 'Pages',
    ddc: 'Domaine',
    acquired: 'Acquis',
    read: 'Lu',
    readTagged: (year) => `${year} (tag d’année)`,
    rating: 'Note',
    boughtAt: 'Acheté chez',
    series: 'Série',
    isbn: 'ISBN',
    tags: 'Tags',
    toggleFilterAria: (label) => `Basculer le filtre ${label}`,
    filterByAuthorAria: (name) => `Filtrer par ${name}`,
    viewOnLt: 'Voir sur LibraryThing ↗',
    coverAlt: (title) => `Couverture : ${title}`,
    coverLoad: 'Charger la couverture depuis OpenLibrary',
    coverNote: 'L’ISBN est alors transmis à covers.openlibrary.org. Un seul accord suffit — désactivable à tout moment dans le pied de page.',
    coverNone: 'Pas de couverture',
    coverZoomAria: 'Agrandir la couverture',
    viewOnOl: 'Voir sur OpenLibrary ↗',
    close: 'Fermer',
  },
  rangeForm: {
    dimensionAria: 'Dimension du filtre temporel',
    acquired: 'Acquisition',
    read: 'Lecture',
    from: 'de',
    to: 'à',
    submit: 'Filtrer la période',
  },
  views: {
    shelf: {
      title: 'L’Étagère',
      coverage: (estimatedFmt, unmeasuredFmt, nonBooksFmt) => (
        <>
          sont sur l’étagère — dont {estimatedFmt} avec des dimensions estimées d’après le nombre
          de pages (semi-transparents, contour en pointillé). {unmeasuredFmt} sans dimensions ni
          nombre de pages figurent en bas, {nonBooksFmt} non-livres ne sont pas représentés.
        </>
      ),
      sort: 'Tri',
      color: 'Couleur',
      sortLabels: { acquired: 'Acquisition', author: 'Auteur·rice', height: 'Hauteur', ddc: 'Domaine' },
      colorLabels: { ddc: 'Domaine', language: 'Langue', readStatus: 'Statut de lecture', acquiredYear: 'Année d’acquisition' },
      svgAria: (countFmt) => `Étagère de ${countFmt} livres`,
      estimatedSuffix: ' (dimensions estimées)',
      estimatedShort: 'dimensions estimées',
      unmeasuredAria: 'Livres sans dimensions',
      unmeasuredTitle: (countFmt) =>
        `sans dimensions ni nombre de pages pour les estimer (${countFmt}) — taille uniforme, hors échelle`,
      legendAria: 'Légende des couleurs',
      noInfo: 'non renseigné',
      legendRead: 'lu',
      legendUnread: 'non lu (contour)',
      noAcqYear: 'sans année d’acquisition',
      decade: (decade) => `années ${decade}`,
    },
    timeline: {
      title: 'Acquisitions et lectures',
      coverage: (readKnownFmt, taggedOnlyFmt) => (
        <>
          ont une année d’acquisition ; {readKnownFmt} ont une année de lecture, dont{' '}
          {taggedOnlyFmt} seulement par tags d’année.
        </>
      ),
      noYears: 'dans le filtre actuel ont une année d’acquisition ou de lecture.',
      svgAria: 'Acquisitions (vers le haut) et lectures (vers le bas) par année',
      maxGap: (year) => `écart maximal : ${year}`,
      brushAcquired: 'Acquisition',
      brushRead: 'Lecture',
      unreadSvgAria: 'Pile à lire, en cumulé',
      unreadPanelLabel: 'pile à lire (seulement les titres avec une année d’acquisition)',
      legendAcquired: 'acquisitions',
      legendReadDated: 'lectures (au jour près)',
      legendReadTagged: 'lectures (tag d’année)',
      filterUnread: 'Filtrer les non-lus',
      hint:
        'Pour choisir une période, faites glisser horizontalement sur le graphique — au-dessus de la ' +
        'ligne zéro, le filtre porte sur l’année d’acquisition, en dessous sur l’année de lecture ; ' +
        'un clic sélectionne une seule année, Échap annule la sélection.',
      tooltipAcquired: (countFmt) => `${countFmt} acquis`,
      tooltipRead: (countFmt) => `${countFmt} lus`,
      andMore: (countFmt) => `… et ${countFmt} autres`,
      tooltipUnread: (countFmt) => `${countFmt} non lus dans la pile`,
    },
    knowledge: {
      title: 'Carte des savoirs',
      coverage: (deltaFmt) => (
        <>ont un code CDD et une année d’acquisition ({deltaFmt} avec une année d’acquisition mais sans CDD).</>
      ),
      noData: 'dans le filtre actuel ont un code CDD et une année d’acquisition.',
      controlsAria: 'Affichage',
      absolute: 'absolu',
      share: 'parts',
      smooth: 'moyenne sur trois ans',
      svgAria: 'Classes principales de la CDD au fil des années d’acquisition',
      streamTitle: (ddcClass, label, countFmt) => `${ddcClass} ${label} : ${countFmt} titres`,
      hint:
        'Pour choisir une période, faites glisser horizontalement sur le graphique : le filtre porte ' +
        'sur l’année d’acquisition, Échap annule la sélection ; un clic sur un flux filtre par domaine.',
    },
    tagTrends: {
      title: 'Tendances des tags',
      coverageAcquired: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          ont une année d'acquisition — l'axe temporel de cette vue ; sans année : {missingFmt}.
          Masqués comme tags : {yearTagsFmt} tags d'année, {statusFmt} marqueurs de statut,{' '}
          {seriesFmt} sigles de série.
        </>
      ),
      coverageRead: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          ont une année de lecture — l'axe temporel de cette vue ; sans année : {missingFmt}.
          Masqués comme tags : {yearTagsFmt} tags d'année, {statusFmt} marqueurs de statut,{' '}
          {seriesFmt} sigles de série.
        </>
      ),
      noData: 'Aucun titre de la sélection actuelle n’a d’année sur cet axe temporel.',
      axisAria: 'Axe temporel',
      axisAcquired: 'Acquisition',
      axisRead: 'Lecture',
      modeAria: 'Affichage',
      modeLines: 'Courbes',
      modeHeatmap: 'Carte thermique',
      svgAria: 'Fréquence des tags au fil du temps',
      labelsAria: 'Tags du panneau de tendances',
      tagButtonTitle: (tag, countFmt) => `${tag} : ${countFmt} titres — cliquer pour filtrer`,
      rankingTitle: (from, to) =>
        from === to ? `Particulièrement fréquents en ${from}` : `Particulièrement fréquents ${from}–${to}`,
      rankingHint: (minFmt) => `par rapport à la sélection filtrée ; au moins ${minFmt} titres dans la période`,
      rankingEmpty: 'Aucun tag n’est nettement plus fréquent dans cette période qu’à l’accoutumée.',
      rankingCount: (inSliceFmt, totalFmt) => `${inSliceFmt} sur ${totalFmt} titres`,
      factor: (factorFmt) => `×${factorFmt}`,
      pinAria: (tag) => `Ajouter « ${tag} » au panneau de tendances`,
      unpinAria: (tag) => `Retirer « ${tag} » du panneau de tendances`,
      pinLimitTitle: 'Au plus 8 tags ajoutés',
      tooltip: (tag, year, countFmt, factorFmt) => `${tag} — ${year} : ${countFmt} titres (×${factorFmt})`,
      andMore: (countFmt) => `… et ${countFmt} de plus`,
      hint: 'Glisser choisit la période du classement, cliquer une seule année — la sélection ne filtre pas.',
    },
    network: {
      title: 'Réseau de tags',
      coverage: (minCount, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          ont ≥ {minCount} titres et figurent dans le réseau ; masqués : {yearTagsFmt} tags
          d’année, {statusFmt} marqueurs de statut, {seriesFmt} sigles de série.
        </>
      ),
      minCountLabel: 'Nombre minimal de titres :',
      searchPlaceholder: 'Rechercher un tag…',
      searchAria: 'Rechercher un tag',
      zoomLabel: 'Zoom :',
      zoomAria: 'Facteur de zoom',
      fit: 'Ajuster',
      unisolate: (tag) => `Lever l’isolement (${tag})`,
      svgAria: 'Réseau des tags attribués ensemble',
      nodeAria: (tag, countFmt) => `Tag ${tag}, ${countFmt} titres`,
      nodeTitle: (tag, countFmt) =>
        `${tag} : ${countFmt} titres (clic = filtrer, Maj-clic = isoler le voisinage)`,
    },
    languages: {
      title: 'Flux des langues',
      coverage: (inferredFmt) => (
        <>
          ont une langue d’édition ; pour {inferredFmt} d’entre eux, faute de langue originale
          saisie, elle vaut aussi comme original (convention de catalogage).
        </>
      ),
      noData: 'dans le filtre actuel ont une langue d’édition.',
      svgAria: 'Flux de la langue originale vers la langue d’édition',
      linkLabel: (source, target, countFmt) => `${source} → ${target} : ${countFmt} titres`,
      linkAriaFilter: (label) => `${label}. Appuyez sur Entrée pour filtrer sur cette combinaison.`,
      origSide: 'Langue originale',
      edSide: 'Langue d’édition',
      nodeAria: (side, lang, countFmt) => `${side} ${lang}, ${countFmt} titres`,
      nodeTitle: (side, lang, countFmt) =>
        `${side} ${lang} : ${countFmt} titres (un clic filtre sur cette seule langue)`,
    },
    years: {
      title: 'Année d’édition contre année d’acquisition',
      coverage: (
        <>
          ont les deux années. Attention : il s’agit de l’année de <em>cette édition</em>, pas de
          l’œuvre — une édition Reclam de Sophocle compte pour 1998.
        </>
      ),
      noData: 'dans le filtre actuel ont une année d’édition et une année d’acquisition (à partir de 1900).',
      underflow: (countFmt) => `${countFmt} éditions antérieures à 1900 non représentées.`,
      svgAria: 'Carte de chaleur année d’édition × année d’acquisition',
      axisEdition: 'Année de cette édition →',
      axisAcquired: 'Année d’acquisition →',
      edition: 'Édition',
      acquired: 'Acquisition',
      edFromAria: 'Année d’édition de',
      edToAria: 'Année d’édition à',
      acqFromAria: 'Année d’acquisition de',
      acqToAria: 'Année d’acquisition à',
      submit: 'Filtrer la plage',
      tooltip: (ed, acq, countFmt) => `Édition ${ed}, acquis ${acq} : ${countFmt} titres`,
      tooltipEdition: (year, countFmt) => `Édition ${year} : ${countFmt} titres`,
      tooltipAcquired: (year, countFmt) => `Acquis ${year} : ${countFmt} titres`,
    },
    pace: {
      title: 'Rythme de lecture',
      coverage:
        'ont une durée de lecture et un nombre de pages — les lectures suivies délibérément y sont surreprésentées.',
      discarded: (countFmt) => <>{countFmt} durées négatives écartées.</>,
      noData: (pointsFmt) => (
        <>
          dans le filtre actuel ont une date de début et de fin (dont {pointsFmt} avec aussi un
          nombre de pages).
        </>
      ),
      facetToggle: 'ventiler par langue',
      svgAria: (langLabel) => `Pages contre durée de lecture${langLabel ? `, ${langLabel}` : ''}`,
      rateLabel: (rate) => `${rate} p./jour`,
      dotAria: (title, pagesFmt, daysFmt) => `${title} : ${pagesFmt} pages en ${daysFmt} jours`,
      dotTitle: (title, pagesFmt, daysFmt, suspect) =>
        `${title} — ${pagesFmt} p. / ${daysFmt} jours${suspect ? ' (plus de 100 jours : lecture continue incertaine)' : ''}`,
      axisPages: 'Pages',
      axisDays: 'Jours',
      note: 'Points évidés : plus de 100 jours — on ignore si la lecture a été continue ; à ne pas interpréter comme un rythme.',
    },
    canon: {
      title: 'Comparaison au canon',
      coverage:
        'figurent sur au moins une liste. Les chiffres signifient « dans la collection », pas ' +
        '« rayé de la liste » — l’export ne révèle pas l’étendue des listes.',
      noData: 'dans le filtre actuel figurent sur une liste de prix littéraires ou de canon.',
      showLists: 'Afficher les listes :',
      onlyUnread: 'Non lus seulement → liste de lecture',
      counts: (ownedFmt, readFmt) => `${ownedFmt} dans la collection · ${readFmt} lus`,
    },
  },
  footer: {
    license: 'Licence MIT',
    embedded: 'Licences des polices et bibliothèques embarquées',
    covers: 'Couvertures OpenLibrary',
    languageAria: 'Langue',
  },
}
