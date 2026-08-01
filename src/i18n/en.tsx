import type { Messages } from './messages'

export const en: Messages = {
  locale: 'en',
  app: {
    loading: 'Loading library…',
    loadError: (message) => `The library could not be loaded: ${message}`,
    incompatibleNotice:
      'The library stored in your browser was saved by an older version of this app ' +
      'and can no longer be read—please upload your export once more.',
    replaceLibrary: 'Switch library',
    navAria: 'Views',
  },
  nav: {
    shelf: 'Shelf',
    timeline: 'Acquisitions & Reading',
    knowledge: 'Knowledge Map',
    network: 'Tag Network',
    languages: 'Language Flow',
    years: 'Edition × Acquisition',
    pace: 'Reading Pace',
    canon: 'Canon',
  },
  upload: {
    intro: (
      <>
        <em>Tsundoku</em> (積ん読)—buying books and letting them pile up, unread. This app explores
        a LibraryThing library interactively: eight linked views, from a bookshelf drawn to scale
        through timelines and a tag network to the flow of languages—and every view doubles as a
        filter for all the others. The question at its heart: what does the gap between what you{' '}
        <em>acquire</em> and what you <em>read</em> reveal about you?
      </>
    ),
    title: 'Load your library',
    ltIntro: (
      <>
        The app reads exports from{' '}
        <a href="https://www.librarything.com" target="_blank" rel="noopener noreferrer">
          LibraryThing
        </a>
        , an online service for cataloging your own book collection. Export your library there at{' '}
        <a href="https://www.librarything.com/export.php" target="_blank" rel="noopener noreferrer">
          librarything.com/export.php
        </a>{' '}
        in <strong>JSON</strong> format and load the file here. It is read entirely in your browser
        and <strong>never leaves your machine</strong>.
      </>
    ),
    dropHere: 'Drag your export file here, or',
    chooseFile: 'choose a file',
    working: 'Normalizing…',
    backToLoaded: 'Back to the loaded library',
    errorPrefix: 'Error:',
    errInvalidJson: 'The file is not valid JSON.',
    errTooLarge: (mbFmt, limitMbFmt) =>
      `The file is ${mbFmt} MB—the limit is ${limitMbFmt} MB. LibraryThing can export filtered subsets (a single collection, for example).`,
    errTooMany: (maxFmt) =>
      `the export contains more than ${maxFmt} entries. ` +
      'The views keep everything in memory; please choose a filtered export (LibraryThing can export a single collection, for example).',
    errNotAnExport: 'not a LibraryThing export (expected a JSON object with book IDs as keys)',
    errNoBooks: 'not a LibraryThing export—the file contains no book entries',
  },
  report: {
    title: 'Your library is ready',
    note:
      'While reading the export, a few small inconsistencies in the catalog were fixed—swapped ' +
      'book dimensions, missing values, garbled special characters. None of it happens ' +
      'silently: this overview shows exactly what was done to your data.',
    entries: 'Entries',
    media: 'Media',
    read: 'Read',
    readValue: (readFmt, knownFmt, datedFmt, minYear) =>
      `${readFmt} (reading year known for ${knownFmt}, ${datedFmt} of them dated to the day${minYear !== null ? `, from ${minYear} onwards` : ''})`,
    pagesTotal: 'Total pages',
    readDays: 'Reading time',
    readDaysValue: (median, p90, max) => `typically ${median} days, rarely over ${p90}, longest ${max}`,
    tags: 'Tags',
    tagsValue: (normFmt, rawFmt) => `${normFmt} after normalization (${rawFmt} in the export)`,
    dimsSwapped: 'Swapped book dimensions',
    dimsSwappedValue: (sortedFmt, discardedFmt) => `${sortedFmt} corrected, ${discardedFmt} discarded`,
    dimsEstimated: 'Estimated book dimensions',
    dimsEstimatedValue: (nFmt) => `${nFmt} books (from the page count)`,
    origLangInferred: 'Original language filled in',
    origLangInferredValue: (nFmt) => `${nFmt} books (from the edition language)`,
    entitiesDecoded: 'Special characters repaired',
    entitiesDecodedValue: (nFmt) => `${nFmt} fields`,
    bulkImport: 'Bulk import detected',
    bulkImportValue: (nFmt) => `${nFmt} entries`,
    toLibrary: 'Open the library',
    otherFile: 'Choose a different file',
  },
  media: {
    book: 'Book',
    ebook: 'E-book',
    film: 'Film',
    vinyl: 'Vinyl',
  },
  ddc: {
    labels: {
      0: 'General works & computer science',
      1: 'Philosophy & psychology',
      2: 'Religion',
      3: 'Social sciences',
      4: 'Language',
      5: 'Natural sciences',
      6: 'Technology & medicine',
      7: 'Arts & recreation',
      8: 'Literature',
      9: 'History & geography',
    },
    short: {
      0: 'Computer science',
      1: 'Philosophy',
      2: 'Religion',
      3: 'Social sciences',
      4: 'Language',
      5: 'Science',
      6: 'Technology',
      7: 'Arts',
      8: 'Literature',
      9: 'History',
    },
  },
  lang: {
    other: 'other',
    unknown: 'unknown',
  },
  filter: {
    tag: (v) => `Tag: ${v}`,
    language: (label) => `Language: ${label}`,
    originalLanguage: (label) => `Original: ${label}`,
    ddcTop: (label) => `Subject area: ${label}`,
    mediaType: (label) => `Medium: ${label}`,
    collection: (v) => `Collection: ${v}`,
    author: (v) => `Author: ${v}`,
    award: (v) => `List: ${v}`,
    acquired: (from, to) => `Acquired: ${from}–${to}`,
    read: (from, to) => `Read: ${from}–${to}`,
    edition: (from, to) => `Edition: ${from}–${to}`,
    statusRead: 'Status: read',
    statusUnread: 'Status: unread',
  },
  chips: {
    regionAria: 'Active filters',
    removeAria: (label) => `Remove filter: ${label}`,
    clearAll: 'Clear all filters',
  },
  empty: {
    title: 'No titles match the current filters',
    active: 'These filters are currently active:',
    release: 'clear',
  },
  summary: {
    titles: 'titles',
    read: 'of them read',
    pages: 'pages',
    filteredFrom: (totalFmt) => `filtered from ${totalFmt} titles`,
  },
  coverage: {
    frame: (covered, total, unit) => (
      <>
        {covered} of {total} {unit}
      </>
    ),
    unitTitles: 'titles',
    unitTags: 'tags',
  },
  detail: {
    original: 'Original',
    editionYear: 'Year of this edition',
    language: 'Language',
    originalLanguage: 'Original language',
    pages: 'Pages',
    ddc: 'Subject area',
    acquired: 'Acquired',
    read: 'Read',
    readTagged: (year) => `${year} (year tag)`,
    rating: 'Rating',
    boughtAt: 'Bought at',
    series: 'Series',
    isbn: 'ISBN',
    tags: 'Tags',
    toggleFilterAria: (label) => `Toggle filter: ${label}`,
    filterByAuthorAria: (name) => `Filter by ${name}`,
    viewOnLt: 'View on LibraryThing ↗',
    close: 'Close',
  },
  rangeForm: {
    dimensionAria: 'Dimension of the time-range filter',
    acquired: 'Acquisition',
    read: 'Reading',
    from: 'from',
    to: 'to',
    submit: 'Filter range',
  },
  views: {
    shelf: {
      title: 'The Shelf',
      coverage: (estimatedFmt, unmeasuredFmt, nonBooksFmt) => (
        <>
          stand on the shelf—{estimatedFmt} of them with dimensions estimated from the page count
          (semi-transparent, dashed outline). {unmeasuredFmt} without dimensions or page count are
          shown below; {nonBooksFmt} non-books are not drawn.
        </>
      ),
      sort: 'Sort',
      color: 'Color',
      sortLabels: { acquired: 'Acquisition', author: 'Author', height: 'Height', ddc: 'Subject area' },
      colorLabels: { ddc: 'Subject area', language: 'Language', readStatus: 'Read status', acquiredYear: 'Acquisition year' },
      svgAria: (countFmt) => `Shelf holding ${countFmt} books`,
      estimatedSuffix: ' (dimensions estimated)',
      estimatedShort: 'dimensions estimated',
      unmeasuredAria: 'Books without dimensions',
      unmeasuredTitle: (countFmt) =>
        `no dimensions and no page count to estimate from (${countFmt})—uniform size, not to scale`,
      legendAria: 'Color legend',
      noInfo: 'not specified',
      legendRead: 'read',
      legendUnread: 'unread (outline)',
      noAcqYear: 'no acquisition year',
      decade: (decade) => `${decade}s`,
    },
    timeline: {
      title: 'Acquisitions and Reading',
      coverage: (readKnownFmt, taggedOnlyFmt) => (
        <>
          have an acquisition year; {readKnownFmt} have a reading year, {taggedOnlyFmt} of those
          only through year tags.
        </>
      ),
      noYears: 'in the current filter have an acquisition or reading year.',
      svgAria: 'Acquisitions (upwards) and reading (downwards) per year',
      maxGap: (year) => `widest gap: ${year}`,
      brushAcquired: 'Acquisition',
      brushRead: 'Reading',
      unreadSvgAria: 'Unread backlog, cumulative',
      unreadPanelLabel: 'unread backlog (only titles with an acquisition year)',
      legendAcquired: 'acquired',
      legendReadDated: 'read (exact date)',
      legendReadTagged: 'read (year tag)',
      filterUnread: 'Filter unread',
      hint:
        'To select a period, drag horizontally across the chart—above the zero line filters by acquisition year, ' +
        'below it by reading year; a click selects a single year, Esc cancels the selection.',
      tooltipAcquired: (countFmt) => `${countFmt} acquired`,
      andMore: (countFmt) => `… and ${countFmt} more`,
      tooltipUnread: (countFmt) => `${countFmt} unread in the backlog`,
    },
    knowledge: {
      title: 'Knowledge Map',
      coverage: (deltaFmt) => (
        <>have a DDC code and an acquisition year ({deltaFmt} have an acquisition year but no DDC).</>
      ),
      noData: 'in the current filter have both a DDC code and an acquisition year.',
      controlsAria: 'Display',
      absolute: 'absolute',
      share: 'share',
      smooth: 'three-year average',
      svgAria: 'DDC main classes across acquisition years',
      streamTitle: (ddcClass, label, countFmt) => `${ddcClass} ${label}: ${countFmt} titles`,
      hint:
        'To select a period, drag horizontally across the chart to filter by acquisition year; Esc cancels the ' +
        'selection. Clicking a stream filters by that subject area.',
    },
    network: {
      title: 'Tag Network',
      coverage: (minCount, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          have ≥ {minCount} titles and appear in the network; hidden: {yearTagsFmt} year tags,{' '}
          {statusFmt} status markers, {seriesFmt} series abbreviations.
        </>
      ),
      minCountLabel: 'Minimum titles:',
      searchPlaceholder: 'Search tags…',
      searchAria: 'Search tags',
      zoomLabel: 'Zoom:',
      zoomAria: 'Zoom factor',
      fit: 'Fit to view',
      unisolate: (tag) => `Exit isolation (${tag})`,
      svgAria: 'Network of tags assigned together',
      nodeAria: (tag, countFmt) => `Tag ${tag}, ${countFmt} titles`,
      nodeTitle: (tag, countFmt) =>
        `${tag}: ${countFmt} titles (click to filter, shift-click to isolate its neighborhood)`,
    },
    languages: {
      title: 'Language Flow',
      coverage: (inferredFmt) => (
        <>
          have an edition language; for {inferredFmt} of them it also counts as the original,
          since no original language was recorded (a cataloging convention).
        </>
      ),
      noData: 'in the current filter have an edition language.',
      svgAria: 'Flow from original language to edition language',
      linkLabel: (source, target, countFmt) => `${source} → ${target}: ${countFmt} titles`,
      linkAriaFilter: (label) => `${label}. Press Enter to filter by this combination.`,
      origSide: 'Original language',
      edSide: 'Edition language',
      nodeAria: (side, lang, countFmt) => `${side} ${lang}, ${countFmt} titles`,
      nodeTitle: (side, lang, countFmt) => `${side} ${lang}: ${countFmt} titles (click to filter by this language only)`,
    },
    years: {
      title: 'Edition Year versus Acquisition Year',
      coverage: (
        <>
          have both years. Note that this is the year of <em>this edition</em>, not of the work—a
          Reclam edition of Sophocles counts as 1998.
        </>
      ),
      noData: 'in the current filter have both an edition year and an acquisition year (1900 onwards).',
      underflow: (countFmt) => `${countFmt} editions from before 1900 are not shown.`,
      svgAria: 'Heatmap of edition year × acquisition year',
      axisEdition: 'Year of this edition →',
      axisAcquired: 'Acquisition year →',
      edition: 'Edition',
      acquired: 'Acquisition',
      edFromAria: 'Edition year from',
      edToAria: 'Edition year to',
      acqFromAria: 'Acquisition year from',
      acqToAria: 'Acquisition year to',
      submit: 'Filter range',
      tooltip: (ed, acq, countFmt) => `Edition ${ed}, acquired ${acq}: ${countFmt} titles`,
    },
    pace: {
      title: 'Reading Pace',
      coverage: 'have a reading duration and a page count—disproportionately the ones tracked deliberately.',
      discarded: (countFmt) => <>{countFmt} negative durations discarded.</>,
      noData: (pointsFmt) => (
        <>
          in the current filter have a start and end date ({pointsFmt} of them also have a page count).
        </>
      ),
      facetToggle: 'facet by language',
      svgAria: (langLabel) => `Pages versus reading duration${langLabel ? `, ${langLabel}` : ''}`,
      rateLabel: (rate) => `${rate} pages/day`,
      dotAria: (title, pagesFmt, daysFmt) => `${title}: ${pagesFmt} pages in ${daysFmt} days`,
      dotTitle: (title, pagesFmt, daysFmt, suspect) =>
        `${title}—${pagesFmt} pages / ${daysFmt} days${suspect ? ' (over 100 days: unclear whether it was read continuously)' : ''}`,
      axisPages: 'Pages',
      axisDays: 'Days',
      note: 'Hollow dots: over 100 days—unclear whether these were read continuously; do not read them as pace.',
    },
    canon: {
      title: 'Canon Comparison',
      coverage:
        'appear on at least one list. The counts mean “owned”, not “checked off the list”—the ' +
        'export does not reveal how long each list is.',
      noData: 'in the current filter appear on an award or canon list.',
      showLists: 'Show lists:',
      onlyUnread: 'Unread only → reading list',
      counts: (ownedFmt, readFmt) => `${ownedFmt} owned · ${readFmt} read`,
    },
  },
  footer: {
    license: 'MIT license',
    embedded: 'Licenses for embedded fonts & libraries',
    languageAria: 'Language',
  },
}
