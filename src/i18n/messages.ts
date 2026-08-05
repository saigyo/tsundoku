import type { ReactNode } from 'react'
import type { MediaType, ViewId } from '../lib/types'

export const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'es', 'ja'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

/** Endonyme für den Umschalter — bewusst in keiner Sprache übersetzt. */
export const LOCALE_NAMES: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  ja: '日本語',
}

/**
 * Alle UI-Texte der App. Konventionen:
 * - Zahlen kommen vorformatiert als String an (Parameter `…Fmt`),
 *   Jahreszahlen als number (keine Tausendertrennung).
 * - Schlüssel mit Markup liefern ReactNode (Bundles sind .tsx).
 * - Datenwerte (Tags, Autor·innen, Titel, Listennamen) werden nie übersetzt.
 */
export interface Messages {
  locale: Locale
  app: {
    loading: string
    loadError: (message: string) => string
    incompatibleNotice: string
    replaceLibrary: string
    navAria: string
  }
  nav: Record<ViewId, string>
  upload: {
    intro: ReactNode
    title: string
    ltIntro: ReactNode
    dropHere: string
    chooseFile: string
    working: string
    backToLoaded: string
    errorPrefix: string
    errInvalidJson: string
    errTooLarge: (mbFmt: string, limitMbFmt: string) => string
    errTooMany: (maxFmt: string) => string
    errNotAnExport: string
    errNoBooks: string
  }
  report: {
    title: string
    note: string
    entries: string
    media: string
    read: string
    readValue: (readFmt: string, knownFmt: string, datedFmt: string, minYear: number | null) => string
    pagesTotal: string
    readDays: string
    readDaysValue: (median: number, p90: number, max: number) => string
    tags: string
    tagsValue: (normFmt: string, rawFmt: string) => string
    dimsSwapped: string
    dimsSwappedValue: (sortedFmt: string, discardedFmt: string) => string
    dimsEstimated: string
    dimsEstimatedValue: (nFmt: string) => string
    origLangInferred: string
    origLangInferredValue: (nFmt: string) => string
    entitiesDecoded: string
    entitiesDecodedValue: (nFmt: string) => string
    bulkImport: string
    bulkImportValue: (nFmt: string) => string
    toLibrary: string
    otherFile: string
  }
  media: Record<MediaType, string>
  ddc: {
    labels: Record<number, string>
    short: Record<number, string>
  }
  lang: {
    other: string
    unknown: string
  }
  filter: {
    tag: (v: string) => string
    language: (label: string) => string
    originalLanguage: (label: string) => string
    ddcTop: (label: string) => string
    mediaType: (label: string) => string
    collection: (v: string) => string
    author: (v: string) => string
    award: (v: string) => string
    acquired: (from: number, to: number) => string
    read: (from: number, to: number) => string
    edition: (from: number, to: number) => string
    statusRead: string
    statusUnread: string
  }
  chips: {
    regionAria: string
    removeAria: (label: string) => string
    clearAll: string
  }
  filterEditor: {
    openAria: string
    title: string
    status: string
    medium: string
    collection: string
    read: string
    unread: string
    close: string
  }
  empty: {
    title: string
    active: string
    release: string
  }
  summary: {
    titles: string
    read: string
    pages: string
    filteredFrom: (totalFmt: string) => string
  }
  coverage: {
    frame: (covered: ReactNode, total: ReactNode, unit: string) => ReactNode
    unitTitles: string
    unitTags: string
  }
  detail: {
    original: string
    editionYear: string
    language: string
    originalLanguage: string
    pages: string
    ddc: string
    acquired: string
    read: string
    readTagged: (year: number) => string
    rating: string
    boughtAt: string
    series: string
    isbn: string
    tags: string
    toggleFilterAria: (label: string) => string
    filterByAuthorAria: (name: string) => string
    viewOnLt: string
    coverAlt: (title: string) => string
    coverLoad: string
    coverNote: string
    coverNone: string
    coverZoomAria: string
    viewOnOl: string
    close: string
  }
  bookListPopup: {
    listAria: (context: string) => string
    scrollHint: (countFmt: string) => string
    openDetailAria: (title: string) => string
  }
  rangeForm: {
    dimensionAria: string
    acquired: string
    read: string
    from: string
    to: string
    submit: string
  }
  views: {
    shelf: {
      title: string
      coverage: (estimatedFmt: ReactNode, unmeasuredFmt: ReactNode, nonBooksFmt: ReactNode) => ReactNode
      sort: string
      color: string
      sortLabels: { acquired: string; author: string; height: string; ddc: string }
      colorLabels: { ddc: string; language: string; readStatus: string; acquiredYear: string }
      svgAria: (countFmt: string) => string
      estimatedSuffix: string
      estimatedShort: string
      unmeasuredAria: string
      unmeasuredTitle: (countFmt: string) => string
      legendAria: string
      noInfo: string
      legendRead: string
      legendUnread: string
      noAcqYear: string
      decade: (decade: number) => string
    }
    timeline: {
      title: string
      coverage: (readKnownFmt: ReactNode, taggedOnlyFmt: ReactNode) => ReactNode
      noYears: string
      svgAria: string
      maxGap: (year: number) => string
      brushAcquired: string
      brushRead: string
      unreadSvgAria: string
      unreadPanelLabel: string
      legendAcquired: string
      legendReadDated: string
      legendReadTagged: string
      filterUnread: string
      hint: string
      tooltipAcquired: (countFmt: string) => string
      tooltipRead: (countFmt: string) => string
      andMore: (countFmt: string) => string
      tooltipUnread: (countFmt: string) => string
    }
    knowledge: {
      title: string
      coverage: (deltaFmt: ReactNode) => ReactNode
      noData: string
      controlsAria: string
      absolute: string
      share: string
      smooth: string
      svgAria: string
      streamTitle: (ddcClass: number, label: string, countFmt: string) => string
      hint: string
    }
    tagTrends: {
      title: string
      coverageAcquired: (missingFmt: ReactNode, yearTagsFmt: ReactNode, statusFmt: ReactNode, seriesFmt: ReactNode) => ReactNode
      coverageRead: (missingFmt: ReactNode, yearTagsFmt: ReactNode, statusFmt: ReactNode, seriesFmt: ReactNode) => ReactNode
      noData: string
      axisAria: string
      axisAcquired: string
      axisRead: string
      modeAria: string
      modeLines: string
      modeHeatmap: string
      svgAria: string
      labelsAria: string
      tagButtonTitle: (tag: string, countFmt: string) => string
      rankingTitle: (from: number, to: number) => string
      rankingHint: (minFmt: string) => string
      rankingEmpty: string
      rankingCount: (inSliceFmt: string, totalFmt: string) => string
      factor: (factorFmt: string) => string
      pinAria: (tag: string) => string
      unpinAria: (tag: string) => string
      pinLimitTitle: string
      tooltip: (tag: string, year: number, countFmt: string, factorFmt: string) => string
      andMore: (countFmt: string) => string
      hint: string
    }
    network: {
      title: string
      coverage: (minCount: number, yearTagsFmt: ReactNode, statusFmt: ReactNode, seriesFmt: ReactNode) => ReactNode
      minCountLabel: string
      searchPlaceholder: string
      searchAria: string
      zoomLabel: string
      zoomAria: string
      fit: string
      unisolate: (tag: string) => string
      svgAria: string
      nodeAria: (tag: string, countFmt: string) => string
      nodeTitle: (tag: string, countFmt: string) => string
    }
    languages: {
      title: string
      coverage: (inferredFmt: ReactNode) => ReactNode
      noData: string
      svgAria: string
      linkLabel: (source: string, target: string, countFmt: string) => string
      linkAriaFilter: (label: string) => string
      origSide: string
      edSide: string
      nodeAria: (side: string, lang: string, countFmt: string) => string
      nodeTitle: (side: string, lang: string, countFmt: string) => string
    }
    years: {
      title: string
      coverage: ReactNode
      noData: string
      underflow: (countFmt: string) => string
      svgAria: string
      axisEdition: string
      axisAcquired: string
      edition: string
      acquired: string
      edFromAria: string
      edToAria: string
      acqFromAria: string
      acqToAria: string
      submit: string
      tooltip: (ed: number, acq: number, countFmt: string) => string
      tooltipEdition: (year: number, countFmt: string) => string
      tooltipAcquired: (year: number, countFmt: string) => string
    }
    pace: {
      title: string
      coverage: ReactNode
      discarded: (countFmt: ReactNode) => ReactNode
      noData: (pointsFmt: ReactNode) => ReactNode
      facetToggle: string
      svgAria: (langLabel: string | null) => string
      rateLabel: (rate: number) => string
      dotAria: (title: string, pagesFmt: string, daysFmt: string) => string
      dotTitle: (title: string, pagesFmt: string, daysFmt: string, suspect: boolean) => string
      axisPages: string
      axisDays: string
      note: string
    }
    canon: {
      title: string
      coverage: string
      noData: string
      showLists: string
      onlyUnread: string
      counts: (ownedFmt: string, readFmt: string) => string
    }
  }
  footer: {
    license: string
    embedded: string
    covers: string
    languageAria: string
  }
}
