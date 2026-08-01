/**
 * Tsundoku – Normalisierung des LibraryThing-JSON-Exports (reiner Kern).
 *
 * Der Rohexport ist ein Objekt { books_id: record }. normalize() erzeugt
 * daraus ein flaches, typisiertes Array plus Facetten-Statistiken und wendet
 * dabei die in docs/datenprofil.md dokumentierten Bereinigungsregeln an.
 *
 * Dieses Modul ist bewusst frei von Node-APIs: es laeuft identisch im
 * Browser (Upload-Pfad der App) und in der CLI-Huelle scripts/normalize.mjs.
 *
 * Wichtig: keine Heuristik ohne Dokumentation. Jede Regel, die hier Daten
 * veraendert oder verwirft, steht auch in docs/datenprofil.md.
 */

import aliasesRaw from './tag-aliases.json' with { type: 'json' }

const aliases = { ...aliasesRaw }
delete aliases._comment

const DDC_TOP = {
  0: 'Informatik & Allgemeines',
  1: 'Philosophie & Psychologie',
  2: 'Religion',
  3: 'Sozialwissenschaften',
  4: 'Sprache',
  5: 'Naturwissenschaften',
  6: 'Technik & Medizin',
  7: 'Künste & Freizeit',
  8: 'Literatur',
  9: 'Geschichte & Geografie',
}

const MM_PER_INCH = 25.4
const G_PER_POUND = 453.592

/** "9 inches" | "23 cm" -> Millimeter */
function toMm(raw) {
  if (!raw) return null
  const m = String(raw).match(/([\d.]+)\s*(inch|inches|cm|mm)?/i)
  if (!m) return null
  const v = parseFloat(m[1])
  if (!isFinite(v) || v <= 0) return null
  const unit = (m[2] ?? 'inches').toLowerCase()
  if (unit.startsWith('inch')) return Math.round(v * MM_PER_INCH)
  if (unit === 'cm') return Math.round(v * 10)
  return Math.round(v)
}

/**
 * Regel 9 (permutierte Maße): Bei ~830 vermessenen Titeln hält `thickness`
 * nicht die kleinste der drei Kanten — LibraryThing hat die Felder beim
 * Import vertauscht (mal voll rotiert, mal nur thickness/length getauscht;
 * die `dimensions`-Zeichenkette zeigt jeweils die echte Reihenfolge).
 *
 * Invariante: die Dicke eines Buchs ist stets die kleinste seiner drei
 * Kanten. Wird sie verletzt, wird das Tripel sortiert und in kanonischer
 * Reihenfolge neu zugewiesen — Höhe = größter, Länge (Breite) = mittlerer,
 * Dicke = kleinster Wert; fehlende Felder werden dabei nie befüllt.
 * Datensätze, die die Invariante erfüllen, bleiben unangetastet — das
 * schützt legitime dicke Schuber (max. 94 mm im Korpus) und Querformate.
 *
 * Ist auch der kleinste Wert keine plausible Dicke (>= 80 mm — die dickste
 * unauffällige Dicke im Korpus liegt bei 79 mm), lässt sich das Tripel
 * nicht sicher auflösen; dann wird nur `thicknessMm` verworfen (Buch landet
 * im unvermessenen Regal-Segment), `height`/`length` bleiben unangetastet.
 */
function fixPermutedDimensions(heightMm, thicknessMm, lengthMm) {
  const untouched = { heightMm, thicknessMm, lengthMm, correction: null }
  if (thicknessMm == null) return untouched
  const others = [heightMm, lengthMm].filter((v) => v != null)
  if (others.length === 0 || thicknessMm <= Math.min(...others)) return untouched
  const vals = [heightMm, lengthMm, thicknessMm].filter((v) => v != null)
  if (Math.min(...vals) >= 80) {
    return { heightMm, thicknessMm: null, lengthMm, correction: 'discarded' }
  }
  vals.sort((a, b) => b - a)
  const out = { heightMm, thicknessMm, lengthMm, correction: 'sorted' }
  for (const field of ['heightMm', 'lengthMm', 'thicknessMm']) {
    if (out[field] != null) out[field] = vals.shift()
  }
  return out
}

/**
 * Regel 11 (geschätzte Maße): Bücher ohne Höhe/Dicke, aber mit Seitenzahl,
 * bekommen eine aus dem eigenen Bestand extrapolierte Dicke (Seiten ×
 * Median-Seitendicke der vollständig vermessenen Bücher, ~0,078 mm/Seite;
 * Schätzfehler rückwärts geprüft: Median 4,7 mm, p90 12,8 mm) und, wo die
 * Höhe fehlt, die Medianhöhe. Geschätzte Bücher tragen
 * `physicalEstimated: true` und werden im Regal sichtbar markiert —
 * keine stille Korrektur. Bücher ohne Seitenzahl bleiben unvermessen:
 * für sie gäbe es nur bezugslose Platzhalterwerte.
 */
function estimateMissingDimensions(books) {
  const median = (values) => {
    if (!values.length) return null
    const s = [...values].sort((a, b) => a - b)
    return s[Math.floor(s.length / 2)]
  }
  const reference = books.filter(
    (b) =>
      b.mediaType === 'book' &&
      b.physical.thicknessMm != null &&
      b.physical.thicknessMm >= 2 &&
      b.pages != null &&
      b.pages > 20,
  )
  const mmPerPage = median(reference.map((b) => b.physical.thicknessMm / b.pages))
  const medianHeight = median(
    books.filter((b) => b.mediaType === 'book' && b.physical.heightMm != null).map((b) => b.physical.heightMm),
  )
  if (mmPerPage == null || medianHeight == null) return { estimated: 0, mmPerPage, medianHeight }

  let estimated = 0
  for (const b of books) {
    if (b.mediaType !== 'book' || b.pages == null) continue
    const p = b.physical
    if (p.heightMm != null && p.thicknessMm != null) continue
    if (p.thicknessMm == null) p.thicknessMm = Math.min(120, Math.max(1, Math.round(b.pages * mmPerPage)))
    if (p.heightMm == null) p.heightMm = medianHeight
    b.physicalEstimated = true
    estimated++
  }
  return { estimated, mmPerPage, medianHeight }
}

/**
 * Regel 12 (abgeleitete Originalsprache): Erfassungskonvention dieser
 * Bibliothek — eine Originalsprache wurde nur eingetragen, wenn sie von der
 * Ausgabesprache abweicht (Übersetzung). Fehlt sie, gilt die Ausgabesprache
 * als Original. Abgeleitete Werte tragen `originalLanguagesInferred: true`;
 * „unbekannt" bleibt nur für Bücher ganz ohne Sprachangabe.
 */
function inferOriginalLanguages(languages, originalLanguages) {
  if (originalLanguages.length === 0 && languages.length > 0) {
    return { originalLanguages: languages, inferred: true }
  }
  return { originalLanguages, inferred: false }
}

/** "1.1 pounds" | "0.5 kg" -> Gramm */
function toGrams(raw) {
  if (!raw) return null
  const m = String(raw).match(/([\d.]+)\s*(pounds?|kg|g)?/i)
  if (!m) return null
  const v = parseFloat(m[1])
  if (!isFinite(v) || v <= 0) return null
  const unit = (m[2] ?? 'pounds').toLowerCase()
  if (unit.startsWith('pound')) return Math.round(v * G_PER_POUND)
  if (unit === 'kg') return Math.round(v * 1000)
  return Math.round(v)
}

/**
 * Seitenzahlen. Mehrbaender und Vorspann stehen semikolonsepariert drin
 * ("500; 442; 258", "xvi; 342"). Roemische Zaehlung wird ignoriert,
 * arabische Teile werden summiert.
 */
function toPages(raw) {
  if (!raw) return null
  const parts = String(raw)
    .split(';')
    .map((p) => p.replace(/[^0-9]/g, ''))
    .filter(Boolean)
    .map(Number)
  if (!parts.length) return null
  const sum = parts.reduce((a, b) => a + b, 0)
  // Alles jenseits davon ist mit hoher Wahrscheinlichkeit ein Parsefehler.
  if (sum < 1 || sum > 20000) return null
  return sum
}

/** "$14.95 (USD)" -> { amount: 14.95, currency: 'USD' } */
function toPrice(raw) {
  if (!raw) return null
  const s = String(raw)
  const amount = parseFloat((s.match(/([\d.,]+)/)?.[1] ?? '').replace(',', '.'))
  if (!isFinite(amount)) return null
  const currency =
    s.match(/\(([A-Z]{3})\)/)?.[1] ??
    (s.includes('€') ? 'EUR' : s.includes('£') ? 'GBP' : s.includes('DM') ? 'DEM' : 'USD')
  return { amount, currency }
}

/** ISO-Datum oder blosses Jahr -> { date, year } */
function toDate(raw) {
  if (!raw) return { date: null, year: null }
  const s = String(raw).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return { date: s, year: Number(iso[1]) }
  const y = s.match(/^(\d{4})/)
  return { date: null, year: y ? Number(y[1]) : null }
}

function daysBetween(a, b) {
  if (!a || !b) return null
  const d = (Date.parse(b) - Date.parse(a)) / 86_400_000
  return isFinite(d) ? Math.round(d) : null
}

function normTag(tag) {
  const t = String(tag).trim()
  return aliases[t.toLowerCase()] ?? t
}

/**
 * Regel 10 (rohe HTML-Entities): Titel und Autorennamen enthalten teils
 * unaufgelöste HTML-Entities — numerisch (CJK-Zeichen als `&#23476;`,
 * kyrillische/griechische Buchstaben) und benannt (`&uuml;`, `&#039;`).
 * Vermutlich ein Re-Import-Artefakt aus LibraryThings eigener Anzeige.
 * Namensmenge unten deckt exakt das ab, was im realen Export vorkommt
 * (per `node -e` gegen den Rohexport geprüft) plus die vier XML-Basisentities
 * als Sicherheitsnetz — keine vollständige HTML5-Tabelle.
 */
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', acirc: 'â', agrave: 'à', aring: 'å', atilde: 'ã', auml: 'ä',
  ccedil: 'ç', eacute: 'é', ecirc: 'ê', egrave: 'è', euml: 'ë',
  iacute: 'í', icirc: 'î', ntilde: 'ñ', oacute: 'ó', ocirc: 'ô', Ocirc: 'Ô',
  oslash: 'ø', ouml: 'ö', Ouml: 'Ö', szlig: 'ß', ucirc: 'û', uuml: 'ü', Uuml: 'Ü',
  ndash: '–', laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›',
  // Griechische Buchstaben (Autoren-/Werktitel in Altgriechisch)
  alpha: 'α', chi: 'χ', epsilon: 'ε', eta: 'η', iota: 'ι', kappa: 'κ',
  lambda: 'λ', Lambda: 'Λ', mu: 'μ', nu: 'ν', Nu: 'Ν', omicron: 'ο',
  pi: 'π', Pi: 'Π', psi: 'ψ', rho: 'ρ', sigma: 'σ', Sigma: 'Σ', sigmaf: 'ς',
  tau: 'τ', Tau: 'Τ', theta: 'θ', upsilon: 'υ',
}

const ENTITY_RE = /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g

/** Dekodiert numerische (dezimal/hex) und die oben gelisteten benannten Entities. */
function decodeEntities(raw) {
  if (raw == null) return raw
  const s = String(raw)
  return s.replace(ENTITY_RE, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return isFinite(code) ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[body] ?? match
  })
}

const YEAR_TAG = /^(19|20)\d{2}$/

/** Medientyp: die Bibliothek enthaelt auch Platten und Filme. */
function mediaType(formats, collections) {
  const f = formats.join(' ')
  if (/schallplatte|tonaufnahme|vinyl/i.test(f) || collections.some((c) => /vinyl/i.test(c))) return 'vinyl'
  if (/blu-?ray|dvd/i.test(f) || collections.some((c) => /movie/i.test(c))) return 'film'
  if (/e-?book/i.test(f) || collections.some((c) => /e-books/i.test(c))) return 'ebook'
  return 'book'
}

// ---------------------------------------------------------------------------

/**
 * Reine Transformation: Rohexport { books_id: record } -> { stats, books }.
 * Kein I/O hier — lesen/schreiben/drucken macht ausschliesslich main().
 * `source` ist rein informativ fuer stats.source und optional, damit die
 * Funktion auch ausserhalb des CLI-Kontexts (z. B. in Tests) mit nur einem
 * Argument aufgerufen werden kann.
 */
function normalize(raw, source = null) {
  const records = Object.values(raw)

  // Massenimporte erkennen: Tage mit auffaellig vielen Eintraegen sind
  // Katalogisierungs-Sessions, kein Erwerbsverhalten.
  const perEntryDate = new Map()
  for (const r of records) perEntryDate.set(r.entrydate, (perEntryDate.get(r.entrydate) ?? 0) + 1)
  const BULK_THRESHOLD = 50
  const bulkDates = new Set([...perEntryDate].filter(([, n]) => n >= BULK_THRESHOLD).map(([d]) => d))

  // Regel 9: permutierte height/thickness/length (siehe fixPermutedDimensions).
  let dimsSorted = 0
  let dimsDiscarded = 0

  // Regel 12: abgeleitete Originalsprachen (siehe inferOriginalLanguages).
  let origLangInferred = 0

  // Regel 10: HTML-Entities in Freitextfeldern (siehe decodeEntities).
  let entitiesDecoded = 0
  const decode = (s) => {
    if (s == null) return s
    const out = decodeEntities(s)
    if (out !== s) entitiesDecoded++
    return out
  }

  const books = records.map((r) => {
    const collections = r.collections ?? []
    const formats = (r.format ?? []).map((f) => (typeof f === 'string' ? f : f.text)).filter(Boolean)
    const acquired = toDate(r.dateacquired)
    const entry = toDate(r.entrydate)
    const started = toDate(r.datestarted)
    const read = toDate(r.dateread)
    const ddcCode = r.ddc?.code?.[0] ?? null
    const tags = (r.tags ?? []).map(String)
    // Jahres-Tags sind das aelteste Lesetagebuch: 912 von 917 pruefbaren Faellen
    // stimmen exakt mit dateread ueberein. Sie reichen bis 1988 zurueck.
    const yearTags = tags.filter((t) => YEAR_TAG.test(t)).map(Number).sort()

    return {
      id: r.books_id,
      workCode: r.workcode ?? null,
      title: decode(r.title),
      originalTitle: decode(r.originaltitle ?? null),
      primaryAuthor: decode(r.primaryauthor ?? null),
      authors: (r.authors ?? []).map((a) => ({
        name: decode(a.fl),
        sort: decode(a.lf),
        role: decode(a.role ?? null),
      })),
      tags,
      tagsNorm: [...new Set(tags.map(normTag))],
      collections,
      genres: r.genre ?? [],
      series: r.series ?? [],
      awards: r.awards ?? [],
      ddc: ddcCode
        ? { code: ddcCode, top: Number(String(ddcCode)[0]), topLabel: DDC_TOP[Number(String(ddcCode)[0])] ?? null }
        : null,
      languages: r.language ?? [],
      // Regel 12: fehlt die Originalsprache, gilt die Ausgabesprache als Original.
      ...(() => {
        const inf = inferOriginalLanguages(r.language ?? [], r.originallanguage ?? [])
        if (inf.inferred) origLangInferred++
        return { originalLanguages: inf.originalLanguages, originalLanguagesInferred: inf.inferred }
      })(),
      // Achtung: r.date ist das Jahr DIESER Ausgabe, nicht der Erstveroeffentlichung.
      editionYear: toDate(r.date).year,
      formats,
      mediaType: mediaType(formats, collections),
      pages: toPages(r.pages),
      volumes: r.volumes ? Number(r.volumes) : null,
      physical: (() => {
        const dims = fixPermutedDimensions(toMm(r.height), toMm(r.thickness), toMm(r.length))
        if (dims.correction === 'sorted') dimsSorted++
        else if (dims.correction === 'discarded') dimsDiscarded++
        return {
          heightMm: dims.heightMm,
          thicknessMm: dims.thicknessMm,
          lengthMm: dims.lengthMm,
          weightG: toGrams(r.weight),
        }
      })(),
      // Regel 11: wird ggf. nach dem Aufbau aller Buecher gesetzt.
      physicalEstimated: false,
      rating: typeof r.rating === 'number' ? r.rating : null,
      acquiredDate: acquired.date,
      acquiredYear: acquired.year,
      entryDate: entry.date,
      entryYear: entry.year,
      bulkImport: bulkDates.has(r.entrydate),
      startedDate: started.date,
      readDate: read.date,
      readYear: read.year,
      yearTags,
      // Fuer alle Zeitreihen zur Lektuere: bevorzugt dateread, sonst Jahres-Tag.
      readYearEffective: read.year ?? yearTags[0] ?? null,
      readYearSource: read.year ? 'dateread' : yearTags.length ? 'tag' : null,
      readDays: daysBetween(started.date, read.date),
      hasRead: collections.includes('Have read') || collections.includes('Read but unowned'),
      fromWhere: r.fromwhere ?? null,
      price: toPrice(r.price),
      comment: r.comment ?? null,
      isbn: r.originalisbn ?? null,
    }
  })

  // Regel 11: fehlende Maße aus der Seitenzahl schätzen (nach dem Aufbau
  // aller Bücher, weil die Mediane den ganzen Bestand brauchen).
  const dimsEstimate = estimateMissingDimensions(books)

  // --- Facetten & Kennzahlen fuer die Startansicht ---------------------------

  /** Facettenzaehlung als Array von [Wert, Anzahl], absteigend sortiert.
   *  Bewusst kein Objekt: JS sortiert integer-artige Keys ("2004") nach vorne. */
  const count = (fn) => {
    const m = new Map()
    for (const b of books) for (const v of fn(b) ?? []) if (v != null) m.set(v, (m.get(v) ?? 0) + 1)
    return [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
  }

  const durations = books.map((b) => b.readDays).filter((d) => d != null && d >= 0).sort((a, b) => a - b)
  const pct = (arr, p) => (arr.length ? arr[Math.floor(arr.length * p)] : null)

  const stats = {
    generatedAt: new Date().toISOString(),
    source,
    total: books.length,
    byMediaType: count((b) => [b.mediaType]),
    read: books.filter((b) => b.hasRead).length,
    withAcquiredDate: books.filter((b) => b.acquiredYear).length,
    withReadDate: books.filter((b) => b.readYear).length,
    withReadYearEffective: books.filter((b) => b.readYearEffective).length,
    withRating: books.filter((b) => b.rating != null).length,
    bulkImported: books.filter((b) => b.bulkImport).length,
    dimsSorted,
    dimsDiscarded,
    dimsEstimated: dimsEstimate.estimated,
    origLangInferred,
    entitiesDecoded,
    pagesTotal: books.reduce((a, b) => a + (b.pages ?? 0), 0),
    readDays: { median: pct(durations, 0.5), p90: pct(durations, 0.9), max: durations.at(-1) ?? null },
    languages: count((b) => b.languages),
    originalLanguages: count((b) => b.originalLanguages),
    collections: count((b) => b.collections),
    genres: count((b) => b.genres),
    ddcTop: count((b) => (b.ddc ? [b.ddc.topLabel] : [])),
    formats: count((b) => b.formats),
    tagsNorm: count((b) => b.tagsNorm),
    authors: count((b) => (b.primaryAuthor ? [b.primaryAuthor] : [])),
    series: count((b) => b.series),
    awards: count((b) => b.awards),
    fromWhere: count((b) => (b.fromWhere ? [b.fromWhere] : [])),
    acquiredPerYear: count((b) => (b.acquiredYear ? [b.acquiredYear] : [])),
    readPerYear: count((b) => (b.readYear ? [b.readYear] : [])),
    readPerYearEffective: count((b) => (b.readYearEffective ? [b.readYearEffective] : [])),
  }

  return { stats, books }
}


export {
  toPages,
  toMm,
  toGrams,
  toPrice,
  toDate,
  daysBetween,
  normTag,
  mediaType,
  fixPermutedDimensions,
  decodeEntities,
  estimateMissingDimensions,
  inferOriginalLanguages,
  normalize,
}
