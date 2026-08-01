#!/usr/bin/env node
/**
 * Tsundoku – Normalisierung des LibraryThing-JSON-Exports.
 *
 *   node scripts/normalize.mjs <export.json> [out=public/data/library.json]
 *
 * Der Rohexport ist ein Objekt { books_id: record }. Dieses Skript erzeugt
 * daraus ein flaches, typisiertes Array plus Facetten-Statistiken und wendet
 * dabei die in docs/datenprofil.md dokumentierten Bereinigungsregeln an.
 *
 * Wichtig: keine Heuristik ohne Dokumentation. Jede Regel, die hier Daten
 * veraendert oder verwirft, steht auch in docs/datenprofil.md.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

const aliases = JSON.parse(readFileSync(resolve(HERE, 'tag-aliases.json'), 'utf8'))
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
 * Regel 9 (permutierte Maße): Bei ~20 % der vermessenen Titel steht die
 * längste der drei Kanten in `thickness` statt in `height` — LibraryThing
 * hat height/thickness/length beim Import um eine Position rotiert.
 * Erkennbar an `thicknessMm > heightMm` (ein Buch ist nie dicker als hoch).
 *
 * Verifiziert an mehreren realen Fällen (`node -e` gegen den Rohexport):
 * bei den betroffenen Datensaetzen liegt `heightMm` im Wertebereich der
 * echten Buchbreite (Median 138 mm ≈ `length` unauffälliger Datensätze,
 * Median 137 mm), `thicknessMm` im Wertebereich der echten Höhe (Median
 * 213 mm ≈ `height` unauffälliger Datensätze, Median 210 mm) und `length`
 * im Wertebereich der echten Dicke (Median 25 mm ≈ `thickness`
 * unauffälliger Datensätze, Median 22 mm). Die drei Felder sind also um
 * eine Position rotiert: `height` <- `thickness`, `length` <- `height`,
 * `thickness` <- `length`.
 *
 * Das gilt nur, wenn `length` selbst eine plausible Dicke ist (> 0 und
 * < 80 mm — die dickste unauffällige Dicke im Korpus liegt bei 79 mm).
 * Ist `length` fehlend oder selbst zu groß für eine Dicke, ist das Tripel
 * auf eine Weise verdreht, die sich nicht sicher auflösen lässt; hier wird
 * nur `thicknessMm` verworfen (Buch landet im unvermessenen Regal-Segment),
 * `height`/`length` bleiben unangetastet statt eine zweite Heuristik zu raten.
 */
function fixPermutedDimensions(heightMm, thicknessMm, lengthMm) {
  if (heightMm == null || thicknessMm == null || thicknessMm <= heightMm) {
    return { heightMm, thicknessMm, lengthMm, correction: null }
  }
  if (lengthMm != null && lengthMm > 0 && lengthMm < 80) {
    return { heightMm: thicknessMm, thicknessMm: lengthMm, lengthMm: heightMm, correction: 'rotated' }
  }
  return { heightMm, thicknessMm: null, lengthMm, correction: 'discarded' }
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
  let dimsRotated = 0
  let dimsDiscarded = 0

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
      title: r.title,
      originalTitle: r.originaltitle ?? null,
      primaryAuthor: r.primaryauthor ?? null,
      authors: (r.authors ?? []).map((a) => ({ name: a.fl, sort: a.lf, role: a.role ?? null })),
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
      originalLanguages: r.originallanguage ?? [],
      // Achtung: r.date ist das Jahr DIESER Ausgabe, nicht der Erstveroeffentlichung.
      editionYear: toDate(r.date).year,
      formats,
      mediaType: mediaType(formats, collections),
      pages: toPages(r.pages),
      volumes: r.volumes ? Number(r.volumes) : null,
      physical: (() => {
        const dims = fixPermutedDimensions(toMm(r.height), toMm(r.thickness), toMm(r.length))
        if (dims.correction === 'rotated') dimsRotated++
        else if (dims.correction === 'discarded') dimsDiscarded++
        return {
          heightMm: dims.heightMm,
          thicknessMm: dims.thicknessMm,
          lengthMm: dims.lengthMm,
          weightG: toGrams(r.weight),
        }
      })(),
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
    dimsRotated,
    dimsDiscarded,
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

// ---------------------------------------------------------------------------

/** I/O-Huelle: Argumente lesen, Datei einlesen, normalize() aufrufen, schreiben, drucken. */
function main() {
  const inPath = process.argv[2]
  const outPath = process.argv[3] ?? resolve(HERE, '../public/data/library.json')

  if (!inPath) {
    console.error('Usage: node scripts/normalize.mjs <export.json> [out.json]')
    process.exit(1)
  }

  const raw = JSON.parse(readFileSync(inPath, 'utf8'))
  const { stats, books } = normalize(raw, inPath)

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify({ stats, books }))

  console.log(`${books.length} Einträge -> ${outPath}`)
  console.log(
    `  Medien: ${JSON.stringify(stats.byMediaType)} | gelesen: ${stats.read} | Massenimport-Flag: ${stats.bulkImported}`,
  )
  console.log(
    `  Maße permutiert: ${stats.dimsRotated} korrigiert (height/thickness/length rotiert), ` +
      `${stats.dimsDiscarded} verworfen (thickness > height, length nicht als Dicke plausibel)`,
  )
  console.log(
    `  Seiten gesamt: ${stats.pagesTotal.toLocaleString('de-DE')} | Lesedauer Median/p90/max: ` +
      `${stats.readDays.median}/${stats.readDays.p90}/${stats.readDays.max} Tage`,
  )
  console.log(`  Tags: ${stats.tagsNorm.length} normalisiert (roh: ${new Set(books.flatMap((b) => b.tags)).size})`)
  console.log(
    `  Lesejahr bekannt: ${stats.withReadYearEffective} (davon ${stats.withReadDate} per dateread, Rest aus Jahres-Tags), ` +
      `ab ${Math.min(...stats.readPerYearEffective.map(([y]) => y))}`,
  )
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
  normalize,
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isCli) main()
