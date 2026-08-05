import type { Messages } from './messages'

export const de: Messages = {
  locale: 'de',
  app: {
    loading: 'Bibliothek wird geladen …',
    loadError: (message) => `Bibliothek konnte nicht geladen werden: ${message}`,
    incompatibleNotice:
      'Die im Browser gespeicherte Bibliothek stammt aus einer älteren Version der Anwendung ' +
      'und kann nicht mehr gelesen werden — bitte den Export einmal neu hochladen.',
    replaceLibrary: 'Bibliothek wechseln',
    navAria: 'Ansichten',
  },
  nav: {
    shelf: 'Regal',
    timeline: 'Erwerb & Lektüre',
    knowledge: 'Wissenslandkarte',
    tagTrends: 'Tag-Trends',
    network: 'Tag-Netzwerk',
    languages: 'Sprachfluss',
    years: 'Ausgabe × Erwerb',
    pace: 'Lesetempo',
    canon: 'Kanon',
  },
  upload: {
    intro: (
      <>
        <em>Tsundoku</em> (積ん読) — Bücher kaufen und stapeln, ohne sie zu lesen. Diese Anwendung
        erkundet eine LibraryThing-Bibliothek interaktiv: acht verknüpfte Ansichten, vom
        maßstabsgetreu gezeichneten Regal über Zeitleisten und Tag-Netzwerk bis zum Sprachfluss —
        und jede Ansicht ist zugleich Filter für alle anderen. Die zentrale Frage dabei: Was
        verrät die Differenz zwischen dem, was man <em>erwirbt</em>, und dem, was man{' '}
        <em>liest</em>?
      </>
    ),
    title: 'Bibliothek laden',
    ltIntro: (
      <>
        Die Anwendung liest Exporte von{' '}
        <a href="https://www.librarything.com" target="_blank" rel="noopener noreferrer">
          LibraryThing
        </a>
        , einem Online-Dienst zum Katalogisieren der eigenen Büchersammlung. Exportiere deine
        Bibliothek dort auf{' '}
        <a href="https://www.librarything.com/export.php" target="_blank" rel="noopener noreferrer">
          librarything.com/export.php
        </a>{' '}
        im Format <strong>JSON</strong> und lade die Datei hier. Sie wird direkt im Browser
        eingelesen und <strong>verlässt deinen Rechner nicht</strong>.
      </>
    ),
    dropHere: 'Export-Datei hierher ziehen oder',
    chooseFile: 'Datei auswählen',
    working: 'Wird normalisiert …',
    backToLoaded: 'Zurück zur geladenen Bibliothek',
    errorPrefix: 'Fehler:',
    errInvalidJson: 'Datei ist kein gültiges JSON.',
    errTooLarge: (mbFmt, limitMbFmt) =>
      `Datei ist ${mbFmt} MB groß — Obergrenze ${limitMbFmt} MB. LibraryThing erlaubt gefilterte Exporte (z. B. eine Sammlung).`,
    errTooMany: (maxFmt) =>
      `der Export enthält mehr als ${maxFmt} Einträge. ` +
      'Die Ansichten halten alles im Speicher; bitte einen gefilterten Export wählen (LibraryThing kann z. B. nach Sammlung exportieren).',
    errNotAnExport: 'kein LibraryThing-Export (erwartet: JSON-Objekt mit Buch-IDs als Schlüsseln)',
    errNoBooks: 'kein LibraryThing-Export — die Datei enthält keine Buch-Einträge',
  },
  report: {
    title: 'Deine Bibliothek ist bereit',
    note:
      'Beim Einlesen wurden kleine Unstimmigkeiten des Katalogs behoben — etwa vertauschte ' +
      'Buchmaße, fehlende Angaben oder kaputte Sonderzeichen. Nichts davon passiert im ' +
      'Verborgenen: Die Übersicht zeigt, was mit deinen Daten geschehen ist.',
    entries: 'Einträge',
    media: 'Medien',
    read: 'Gelesen',
    readValue: (readFmt, knownFmt, datedFmt, minYear) =>
      `${readFmt} (Lesejahr bekannt: ${knownFmt}, davon ${datedFmt} tagesgenau${minYear !== null ? `, ab ${minYear}` : ''})`,
    pagesTotal: 'Seiten gesamt',
    readDays: 'Lesedauer',
    readDaysValue: (median, p90, max) => `meist ${median} Tage, selten über ${p90}, längste ${max}`,
    tags: 'Tags',
    tagsValue: (normFmt, rawFmt) => `${normFmt} vereinheitlicht (im Export: ${rawFmt})`,
    dimsSwapped: 'Vertauschte Buchmaße',
    dimsSwappedValue: (sortedFmt, discardedFmt) => `${sortedFmt} korrigiert, ${discardedFmt} verworfen`,
    dimsEstimated: 'Geschätzte Buchmaße',
    dimsEstimatedValue: (nFmt) => `${nFmt} Bücher (aus der Seitenzahl)`,
    origLangInferred: 'Originalsprache ergänzt',
    origLangInferredValue: (nFmt) => `${nFmt} Bücher (aus der Ausgabesprache)`,
    entitiesDecoded: 'Sonderzeichen repariert',
    entitiesDecodedValue: (nFmt) => `${nFmt} Felder`,
    bulkImport: 'Massenimport erkannt',
    bulkImportValue: (nFmt) => `${nFmt} Einträge`,
    toLibrary: 'Zur Bibliothek',
    otherFile: 'Andere Datei wählen',
  },
  media: {
    book: 'Buch',
    ebook: 'E-Book',
    film: 'Film',
    vinyl: 'Schallplatte',
  },
  ddc: {
    labels: {
      0: 'Allgemeines & Informatik',
      1: 'Philosophie & Psychologie',
      2: 'Religion',
      3: 'Sozialwissenschaften',
      4: 'Sprache',
      5: 'Naturwissenschaften',
      6: 'Technik & Medizin',
      7: 'Künste & Unterhaltung',
      8: 'Literatur',
      9: 'Geschichte & Geographie',
    },
    short: {
      0: 'Informatik',
      1: 'Philosophie',
      2: 'Religion',
      3: 'Sozialwissenschaften',
      4: 'Sprache',
      5: 'Naturwissenschaften',
      6: 'Technik',
      7: 'Künste',
      8: 'Literatur',
      9: 'Geschichte',
    },
  },
  lang: {
    other: 'andere',
    unknown: 'unbekannt',
  },
  filter: {
    tag: (v) => `Tag: ${v}`,
    language: (label) => `Sprache: ${label}`,
    originalLanguage: (label) => `Original: ${label}`,
    ddcTop: (label) => `Wissensgebiet: ${label}`,
    mediaType: (label) => `Medium: ${label}`,
    collection: (v) => `Sammlung: ${v}`,
    author: (v) => `Autor·in: ${v}`,
    award: (v) => `Liste: ${v}`,
    acquired: (from, to) => `Erworben: ${from}–${to}`,
    read: (from, to) => `Gelesen: ${from}–${to}`,
    edition: (from, to) => `Ausgabe: ${from}–${to}`,
    statusRead: 'Status: gelesen',
    statusUnread: 'Status: ungelesen',
  },
  chips: {
    regionAria: 'Aktive Filter',
    removeAria: (label) => `Filter entfernen: ${label}`,
    clearAll: 'Alle Filter lösen',
  },
  filterEditor: {
    openAria: 'Filter hinzufügen',
    title: 'Filter',
    status: 'Status',
    medium: 'Medium',
    collection: 'Sammlung',
    read: 'Gelesen',
    unread: 'Ungelesen',
    close: 'Schließen',
  },
  empty: {
    title: 'Keine Titel im aktuellen Filter',
    active: 'Diese Filter greifen gerade:',
    release: 'lösen',
  },
  summary: {
    titles: 'Titel',
    read: 'davon gelesen',
    pages: 'Seiten',
    filteredFrom: (totalFmt) => `gefiltert aus ${totalFmt} Titeln`,
  },
  coverage: {
    frame: (covered, total, unit) => (
      <>
        {covered} von {total} {unit}
      </>
    ),
    unitTitles: 'Titeln',
    unitTags: 'Tags',
  },
  detail: {
    original: 'Original',
    editionYear: 'Jahr dieser Ausgabe',
    language: 'Sprache',
    originalLanguage: 'Originalsprache',
    pages: 'Seiten',
    ddc: 'Wissensgebiet',
    acquired: 'Erworben',
    read: 'Gelesen',
    readTagged: (year) => `${year} (Jahres-Tag)`,
    rating: 'Bewertung',
    boughtAt: 'Gekauft bei',
    series: 'Reihe',
    isbn: 'ISBN',
    tags: 'Tags',
    toggleFilterAria: (label) => `Filter ${label} umschalten`,
    filterByAuthorAria: (name) => `Nach ${name} filtern`,
    viewOnLt: 'Auf LibraryThing ansehen ↗',
    coverAlt: (title) => `Cover: ${title}`,
    coverLoad: 'Cover von OpenLibrary laden',
    coverNote: 'Dabei wird die ISBN an covers.openlibrary.org übermittelt. Einmal zustimmen genügt — abschaltbar in der Fußzeile.',
    coverNone: 'Kein Cover',
    coverZoomAria: 'Cover vergrößern',
    viewOnOl: 'Bei OpenLibrary ansehen ↗',
    close: 'Schließen',
  },
  rangeForm: {
    dimensionAria: 'Dimension des Zeitraumfilters',
    acquired: 'Erwerb',
    read: 'Lektüre',
    from: 'von',
    to: 'bis',
    submit: 'Zeitraum filtern',
  },
  views: {
    shelf: {
      title: 'Das Regal',
      coverage: (estimatedFmt, unmeasuredFmt, nonBooksFmt) => (
        <>
          stehen im Regal — davon {estimatedFmt} mit aus der Seitenzahl geschätzten Maßen
          (halbtransparent, gestrichelte Kontur). {unmeasuredFmt} ohne Maße und Seitenzahl unten,{' '}
          {nonBooksFmt} Nicht-Bücher nicht dargestellt.
        </>
      ),
      sort: 'Sortierung',
      color: 'Farbe',
      sortLabels: { acquired: 'Erwerb', author: 'Autor·in', height: 'Höhe', ddc: 'Wissensgebiet' },
      colorLabels: { ddc: 'Wissensgebiet', language: 'Sprache', readStatus: 'Lesestatus', acquiredYear: 'Erwerbsjahr' },
      svgAria: (countFmt) => `Regal mit ${countFmt} Büchern`,
      estimatedSuffix: ' (Maße geschätzt)',
      estimatedShort: 'Maße geschätzt',
      unmeasuredAria: 'Bücher ohne Maßangaben',
      unmeasuredTitle: (countFmt) =>
        `ohne Maße und ohne Seitenzahl zur Schätzung (${countFmt}) — Einheitsgröße, nicht maßstäblich`,
      legendAria: 'Farblegende',
      noInfo: 'ohne Angabe',
      legendRead: 'gelesen',
      legendUnread: 'ungelesen (Kontur)',
      noAcqYear: 'ohne Erwerbsjahr',
      decade: (decade) => `${decade}er`,
    },
    timeline: {
      title: 'Erwerb und Lektüre',
      coverage: (readKnownFmt, taggedOnlyFmt) => (
        <>
          haben ein Erwerbsjahr; {readKnownFmt} ein Lesejahr, davon {taggedOnlyFmt} nur über
          Jahres-Tags.
        </>
      ),
      noYears: 'im aktuellen Filter haben ein Erwerbs- oder Lesejahr.',
      svgAria: 'Erwerb (nach oben) und Lektüre (nach unten) pro Jahr',
      maxGap: (year) => `größte Schere: ${year}`,
      brushAcquired: 'Erwerb',
      brushRead: 'Lektüre',
      unreadSvgAria: 'Ungelesener Bestand, kumulativ',
      unreadPanelLabel: 'ungelesener Bestand (nur Titel mit Erwerbsjahr)',
      legendAcquired: 'Erwerb',
      legendReadDated: 'Lektüre (tagesgenau)',
      legendReadTagged: 'Lektüre (Jahres-Tag)',
      filterUnread: 'Ungelesene filtern',
      hint:
        'Zeitraum wählen: im Diagramm horizontal ziehen — über der Nulllinie filtert nach Erwerbsjahr, ' +
        'darunter nach Lesejahr; ein Klick wählt ein einzelnes Jahr, Esc bricht die Auswahl ab.',
      tooltipAcquired: (countFmt) => `${countFmt} erworben`,
      tooltipRead: (countFmt) => `${countFmt} gelesen`,
      andMore: (countFmt) => `… und ${countFmt} weitere`,
      tooltipUnread: (countFmt) => `${countFmt} ungelesen im Bestand`,
    },
    knowledge: {
      title: 'Wissenslandkarte',
      coverage: (deltaFmt) => (
        <>haben DDC-Code und Erwerbsjahr ({deltaFmt} mit Erwerbsjahr, aber ohne DDC).</>
      ),
      noData: 'im aktuellen Filter haben DDC-Code und Erwerbsjahr.',
      controlsAria: 'Darstellung',
      absolute: 'absolut',
      share: 'Anteile',
      smooth: 'Dreijahresschnitt',
      svgAria: 'DDC-Hauptklassen über Erwerbsjahre',
      streamTitle: (ddcClass, label, countFmt) => `${ddcClass} ${label}: ${countFmt} Titel`,
      hint:
        'Zeitraum wählen: horizontal über das Diagramm ziehen filtert nach Erwerbsjahr, Esc bricht die ' +
        'Auswahl ab; ein Klick auf einen Strom filtert nach dem Wissensgebiet.',
    },
    tagTrends: {
      title: 'Tag-Trends',
      coverageAcquired: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          haben ein Erwerbsjahr — die Zeitachse dieser Ansicht; ohne Jahr: {missingFmt}. Als Tags
          ausgeblendet: {yearTagsFmt} Jahres-Tags, {statusFmt} Statusmarker, {seriesFmt} Reihenkürzel.
        </>
      ),
      coverageRead: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          haben ein Lesejahr — die Zeitachse dieser Ansicht; ohne Jahr: {missingFmt}. Als Tags
          ausgeblendet: {yearTagsFmt} Jahres-Tags, {statusFmt} Statusmarker, {seriesFmt} Reihenkürzel.
        </>
      ),
      noData: 'Kein Titel der aktuellen Auswahl trägt ein Jahr auf dieser Zeitachse.',
      axisAria: 'Zeitachse',
      axisAcquired: 'Erwerb',
      axisRead: 'Lektüre',
      modeAria: 'Darstellung',
      modeLines: 'Linien',
      modeHeatmap: 'Heatmap',
      svgAria: 'Tag-Häufigkeiten über die Zeit',
      labelsAria: 'Tags im Trend-Panel',
      tagButtonTitle: (tag, countFmt) => `${tag}: ${countFmt} Titel — Klick filtert`,
      rankingTitle: (from, to) => (from === to ? `Besonders häufig ${from}` : `Besonders häufig ${from}–${to}`),
      rankingHint: (minFmt) => `gegenüber der aktuellen Filtermenge; mindestens ${minFmt} Titel im Abschnitt`,
      rankingEmpty: 'Kein Tag ist in diesem Abschnitt auffällig häufiger als sonst.',
      rankingCount: (inSliceFmt, totalFmt) => `${inSliceFmt} von ${totalFmt} Titeln`,
      factor: (factorFmt) => `×${factorFmt}`,
      pinAria: (tag) => `„${tag}" ins Trend-Panel übernehmen`,
      unpinAria: (tag) => `„${tag}" aus dem Trend-Panel entfernen`,
      pinLimitTitle: 'Höchstens 8 zugewählte Tags',
      tooltip: (tag, year, countFmt, factorFmt) => `${tag} — ${year}: ${countFmt} Titel (×${factorFmt})`,
      andMore: (countFmt) => `… und ${countFmt} weitere`,
      hint: 'Ziehen wählt den Zeitabschnitt der Rangliste, Klick ein Einzeljahr — die Auswahl filtert nicht.',
    },
    network: {
      title: 'Tag-Netzwerk',
      coverage: (minCount, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          haben ≥ {minCount} Titel und sind im Netz; ausgeblendet: {yearTagsFmt} Jahres-Tags,{' '}
          {statusFmt} Statusmarker, {seriesFmt} Reihenkürzel.
        </>
      ),
      minCountLabel: 'Mindestanzahl Titel:',
      searchPlaceholder: 'Tag suchen …',
      searchAria: 'Tag suchen',
      zoomLabel: 'Zoom:',
      zoomAria: 'Zoomfaktor',
      fit: 'Einpassen',
      unisolate: (tag) => `Isolation aufheben (${tag})`,
      svgAria: 'Netzwerk gemeinsam vergebener Tags',
      nodeAria: (tag, countFmt) => `Tag ${tag}, ${countFmt} Titel`,
      nodeTitle: (tag, countFmt) =>
        `${tag}: ${countFmt} Titel (Klick = filtern, Shift-Klick = Nachbarschaft isolieren)`,
    },
    languages: {
      title: 'Sprachfluss',
      coverage: (inferredFmt) => (
        <>
          haben eine Ausgabesprache; bei {inferredFmt} davon gilt sie mangels erfasster
          Originalsprache zugleich als Original (Erfassungskonvention).
        </>
      ),
      noData: 'im aktuellen Filter haben eine Ausgabesprache.',
      svgAria: 'Fluss von Originalsprache zu Ausgabesprache',
      linkLabel: (source, target, countFmt) => `${source} → ${target}: ${countFmt} Titel`,
      linkAriaFilter: (label) => `${label}. Enter filtert auf diese Kombination.`,
      origSide: 'Originalsprache',
      edSide: 'Ausgabesprache',
      nodeAria: (side, lang, countFmt) => `${side} ${lang}, ${countFmt} Titel`,
      nodeTitle: (side, lang, countFmt) => `${side} ${lang}: ${countFmt} Titel (Klick filtert nur diese Sprache)`,
    },
    years: {
      title: 'Ausgabejahr gegen Erwerbsjahr',
      coverage: (
        <>
          haben beide Jahre. Achtung: das ist das Jahr <em>dieser Ausgabe</em>, nicht des Werks —
          eine Reclam-Sophokles-Ausgabe zählt als 1998.
        </>
      ),
      noData: 'im aktuellen Filter haben Ausgabe- und Erwerbsjahr (ab 1900).',
      underflow: (countFmt) => `${countFmt} Ausgaben vor 1900 nicht dargestellt.`,
      svgAria: 'Heatmap Ausgabejahr × Erwerbsjahr',
      axisEdition: 'Jahr dieser Ausgabe →',
      axisAcquired: 'Erwerbsjahr →',
      edition: 'Ausgabe',
      acquired: 'Erwerb',
      edFromAria: 'Ausgabejahr von',
      edToAria: 'Ausgabejahr bis',
      acqFromAria: 'Erwerbsjahr von',
      acqToAria: 'Erwerbsjahr bis',
      submit: 'Bereich filtern',
      tooltip: (ed, acq, countFmt) => `Ausgabe ${ed}, erworben ${acq}: ${countFmt} Titel`,
      tooltipEdition: (year, countFmt) => `Ausgabe ${year}: ${countFmt} Titel`,
      tooltipAcquired: (year, countFmt) => `Erworben ${year}: ${countFmt} Titel`,
    },
    pace: {
      title: 'Lesetempo',
      coverage: 'haben Lesedauer und Seitenzahl — überproportional die bewusst getrackten.',
      discarded: (countFmt) => <>{countFmt} negative Dauern verworfen.</>,
      noData: (pointsFmt) => (
        <>
          im aktuellen Filter haben Start- und Enddatum (davon {pointsFmt} auch eine Seitenzahl).
        </>
      ),
      facetToggle: 'nach Sprache facettieren',
      svgAria: (langLabel) => `Seiten gegen Lesedauer${langLabel ? `, ${langLabel}` : ''}`,
      rateLabel: (rate) => `${rate} S./Tag`,
      dotAria: (title, pagesFmt, daysFmt) => `${title}: ${pagesFmt} Seiten in ${daysFmt} Tagen`,
      dotTitle: (title, pagesFmt, daysFmt, suspect) =>
        `${title} — ${pagesFmt} S. / ${daysFmt} Tage${suspect ? ' (über 100 Tage: offen, ob durchgehend gelesen)' : ''}`,
      axisPages: 'Seiten',
      axisDays: 'Tage',
      note: 'Hohle Punkte: über 100 Tage — offen, ob durchgehend gelesen; nicht als Tempo interpretieren.',
    },
    canon: {
      title: 'Kanonabgleich',
      coverage:
        'stehen auf mindestens einer Liste. Angaben sind „im Bestand", nicht „von der ' +
        'Liste erledigt" — der Listenumfang ist aus dem Export nicht bekannt.',
      noData: 'im aktuellen Filter stehen auf einer Auszeichnungs- oder Kanonliste.',
      showLists: 'Listen anzeigen:',
      onlyUnread: 'Nur Ungelesene → Leseliste',
      counts: (ownedFmt, readFmt) => `${ownedFmt} im Bestand · ${readFmt} gelesen`,
    },
  },
  footer: {
    license: 'MIT-Lizenz',
    embedded: 'Lizenzen eingebetteter Schriften & Bibliotheken',
    covers: 'Cover von OpenLibrary',
    languageAria: 'Sprache',
  },
}
