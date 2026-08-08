import { beforeAll, describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  toPages,
  toMm,
  toGrams,
  normTag,
  mediaType,
  fixPermutedDimensions,
  decodeEntities,
  estimateMissingDimensions,
  inferOriginalLanguages,
  bulkPhaseMonths,
  normalize,
} from './normalize.mjs'

// Regeln aus docs/datenprofil.md, Abschnitt „Bereinigungsregeln"

describe('toPages (Regel 2: semikolonsepariert)', () => {
  it('summiert arabische Teile', () => {
    expect(toPages('500; 442; 258')).toBe(1200)
  })
  it('ignoriert römischen Vorspann', () => {
    expect(toPages('xvi; 342')).toBe(342)
  })
  it('verwirft Ergebnisse über 20.000', () => {
    expect(toPages('999999')).toBeNull()
  })
  it('fehlender Wert bleibt null', () => {
    expect(toPages(null)).toBeNull()
    expect(toPages('')).toBeNull()
  })
})

describe('toMm / toGrams (Regel 3: imperiale Einheiten, Einheit aus dem String)', () => {
  it('Zoll nach mm', () => {
    expect(toMm('8 inches')).toBe(203)
  })
  it('cm-Ausreißer werden als cm gelesen', () => {
    expect(toMm('22 cm')).toBe(220)
  })
  it('Pfund nach Gramm', () => {
    expect(toGrams('1 lb')).toBe(454)
  })
  it('kg-Ausreißer werden als kg gelesen', () => {
    expect(toGrams('1.2 kg')).toBe(1200)
  })
})

describe('normTag (Regel 4: DE/EN-Aliase)', () => {
  it('führt englische Variante auf kanonischen Tag zurück', () => {
    // konkretes Mapping vor dem Schreiben in scripts/tag-aliases.json nachgeschlagen:
    // "japanese literature" / "japanische literatur" -> "japanische Literatur"
    expect(normTag('Japanese literature')).toBe(normTag('japanische Literatur'))
  })
})

describe('fixPermutedDimensions (Regel 9: permutierte height/thickness/length)', () => {
  it('lässt unauffällige Maße unangetastet (thickness <= height)', () => {
    expect(fixPermutedDimensions(210, 22, 137)).toEqual({
      heightMm: 210,
      thicknessMm: 22,
      lengthMm: 137,
      correction: null,
    })
  })
  it('sortiert das Tripel, wenn die Dicke nicht der kleinste Wert ist (volle Rotation)', () => {
    // realer Fall aus dem Export: height 231, thickness 325, length 12 (Comic-Album 325 mm hoch)
    expect(fixPermutedDimensions(231, 325, 12)).toEqual({
      heightMm: 325,
      thicknessMm: 12,
      lengthMm: 231,
      correction: 'sorted',
    })
  })
  it('sortiert auch, wenn thickness < height, aber die echte Dicke in length steht', () => {
    // realer Fall 135981392: Fotoband 11.77 × 1.38 × 10 Zoll, Export hält thickness=254, length=35
    expect(fixPermutedDimensions(299, 254, 35)).toEqual({
      heightMm: 299,
      thicknessMm: 35,
      lengthMm: 254,
      correction: 'sorted',
    })
  })
  it('sortiert dreifach verdrehte Tripel (kleinster Wert im height-Feld)', () => {
    expect(fixPermutedDimensions(17, 207, 152)).toEqual({
      heightMm: 207,
      thicknessMm: 17,
      lengthMm: 152,
      correction: 'sorted',
    })
  })
  it('füllt nie ein leeres Feld: ohne height wird nur thickness/length geordnet', () => {
    expect(fixPermutedDimensions(null, 207, 20)).toEqual({
      heightMm: null,
      thicknessMm: 20,
      lengthMm: 207,
      correction: 'sorted',
    })
  })
  it('verwirft thickness, wenn auch der kleinste Wert keine plausible Dicke ist', () => {
    expect(fixPermutedDimensions(138, 213, null)).toEqual({
      heightMm: 138,
      thicknessMm: null,
      lengthMm: null,
      correction: 'discarded',
    })
    expect(fixPermutedDimensions(300, 250, 200)).toEqual({
      heightMm: 300,
      thicknessMm: null,
      lengthMm: 200,
      correction: 'discarded',
    })
  })
  it('lässt fehlende Maße unangetastet', () => {
    expect(fixPermutedDimensions(null, null, null)).toEqual({
      heightMm: null,
      thicknessMm: null,
      lengthMm: null,
      correction: null,
    })
  })
})

describe('estimateMissingDimensions (Regel 11: Maße aus Seitenzahl schätzen)', () => {
  const phys = (heightMm, thicknessMm) => ({ heightMm, thicknessMm, lengthMm: null, weightG: null })
  const mk = (over) => ({ mediaType: 'book', pages: null, physical: phys(null, null), physicalEstimated: false, ...over })

  // Referenzbestand: 200 Seiten -> 20 mm (0,1 mm/Seite), Hoehe 200/210/220 -> Median 210
  const reference = [
    mk({ pages: 200, physical: phys(200, 20) }),
    mk({ pages: 300, physical: phys(210, 30) }),
    mk({ pages: 400, physical: phys(220, 40) }),
  ]

  it('schätzt Dicke aus Seitenzahl und Höhe als Median, setzt das Flag', () => {
    const target = mk({ pages: 100 })
    const { estimated } = estimateMissingDimensions([...reference, target])
    expect(estimated).toBe(1)
    expect(target.physical.thicknessMm).toBe(10) // 100 Seiten × 0,1 mm/Seite
    expect(target.physical.heightMm).toBe(210)   // Medianhöhe
    expect(target.physicalEstimated).toBe(true)
  })
  it('füllt nur fehlende Felder, echte Werte bleiben stehen', () => {
    const target = mk({ pages: 100, physical: phys(180, null) })
    estimateMissingDimensions([...reference, target])
    expect(target.physical.heightMm).toBe(180)
    expect(target.physical.thicknessMm).toBe(10)
    expect(target.physicalEstimated).toBe(true)
  })
  it('ohne Seitenzahl keine Schätzung — das Buch bleibt unvermessen', () => {
    const target = mk({})
    const { estimated } = estimateMissingDimensions([...reference, target])
    expect(estimated).toBe(0)
    expect(target.physical.thicknessMm).toBeNull()
    expect(target.physicalEstimated).toBe(false)
  })
  it('Nicht-Bücher und vollständig vermessene Bücher bleiben unangetastet', () => {
    const vinyl = mk({ mediaType: 'vinyl', pages: 100 })
    const done = mk({ pages: 100, physical: phys(200, 20) })
    const { estimated } = estimateMissingDimensions([...reference, vinyl, done])
    expect(estimated).toBe(0)
    expect(vinyl.physicalEstimated).toBe(false)
    expect(done.physicalEstimated).toBe(false)
  })
})

describe('inferOriginalLanguages (Regel 12: Ausgabesprache als Original, wenn keins erfasst)', () => {
  it('übernimmt die Ausgabesprache, wenn keine Originalsprache erfasst ist', () => {
    expect(inferOriginalLanguages(['German'], [])).toEqual({
      originalLanguages: ['German'],
      inferred: true,
    })
  })
  it('lässt eine erfasste Originalsprache unangetastet', () => {
    expect(inferOriginalLanguages(['German'], ['Japanese'])).toEqual({
      originalLanguages: ['Japanese'],
      inferred: false,
    })
  })
  it('ohne jede Sprache bleibt es leer — unbekannt nur noch hier', () => {
    expect(inferOriginalLanguages([], [])).toEqual({
      originalLanguages: [],
      inferred: false,
    })
  })
})

describe('decodeEntities (Regel 10: rohe HTML-Entities)', () => {
  it('dekodiert numerische CJK-Entities', () => {
    // realer originalTitle aus dem Export: 宴のあと (Mishima, "Nach dem Bankett")
    expect(decodeEntities('&#23476;&#12398;&#12354;&#12392;')).toBe('宴のあと')
  })
  it('dekodiert benannte Umlaut-Entities', () => {
    expect(decodeEntities('Tageb&uuml;cher')).toBe('Tagebücher')
    expect(decodeEntities('Habermas, J&uuml;rgen')).toBe('Habermas, Jürgen')
  })
  it('dekodiert numerisches Apostroph', () => {
    expect(decodeEntities("George O&#039;Brien")).toBe("George O'Brien")
  })
  it('lässt Strings ohne Entities unverändert', () => {
    expect(decodeEntities('Die Verwandlung')).toBe('Die Verwandlung')
  })
  it('lässt null/undefined unverändert', () => {
    expect(decodeEntities(null)).toBeNull()
    expect(decodeEntities(undefined)).toBeUndefined()
  })
})

describe('mediaType (Regel 5)', () => {
  it('erkennt Vinyl über die Sammlung', () => {
    expect(mediaType(['Tonaufnahme, Schallplatte'], ['Vinyl records'])).toBe('vinyl')
  })
  it('Buch als Default', () => {
    expect(mediaType(['Paperback'], ['Your library'])).toBe('book')
  })
})

/** normalize() erwartet den Rohexport als Objekt { books_id: record }. */
const records_to_raw = (records) => Object.fromEntries(records.map((r) => [r.books_id, r]))

describe('bulkPhaseMonths (Regel 1: Erstkatalogisierungsphase)', () => {
  // Records brauchen nur entrydate/dateacquired; books_id/title für normalize().
  const rec = (id, entrydate, dateacquired) => ({ books_id: String(id), title: `B${id}`, entrydate, dateacquired })

  it('zusammenhängende Monate ab Kontostart mit >= 2/3 ohne dateacquired', () => {
    const records = [
      // 2020-01: 3 Einträge, 3 ohne dateacquired -> Phase
      rec(1, '2020-01-05'), rec(2, '2020-01-06'), rec(3, '2020-01-07'),
      // 2020-02: 3 Einträge, 2 ohne (2/3 erfüllt) -> Phase
      rec(4, '2020-02-01'), rec(5, '2020-02-02'), rec(6, '2020-02-03', '2020-02-03'),
      // 2020-03: 3 Einträge, 1 ohne (< 2/3) -> Ende der Phase
      rec(7, '2020-03-01'), rec(8, '2020-03-02', '2020-03-02'), rec(9, '2020-03-03', '2020-03-03'),
      // 2020-04: wieder 100 % ohne — bleibt trotzdem draußen (Phase ist zusammenhängend)
      rec(10, '2020-04-01'), rec(11, '2020-04-02'),
    ]
    expect(bulkPhaseMonths(records)).toEqual(new Set(['2020-01', '2020-02']))
  })

  it('leere/kaputte entrydates zählen nicht mit', () => {
    const records = [rec(1, '2020-01-05'), rec(2, undefined), rec(3, '')]
    expect(bulkPhaseMonths(records)).toEqual(new Set(['2020-01']))
  })

  it('Phase markiert Bücher als bulkImport, Tages-Schwelle gilt weiterhin danach', () => {
    const records = [
      // Phase: 2020-01 (alle ohne dateacquired, nur 3 Einträge — unter der Tagesschwelle)
      rec(1, '2020-01-05'), rec(2, '2020-01-06'), rec(3, '2020-01-07'),
      // Normalmonat beendet die Phase
      rec(4, '2020-02-01', '2020-02-01'), rec(5, '2020-02-02', '2020-02-02'), rec(6, '2020-02-03', '2020-02-03'),
      // Späterer Massenimport-Tag: 50 Einträge am selben Tag
      ...Array.from({ length: 50 }, (_, i) => rec(100 + i, '2021-06-01')),
      // Normaler Einzeleintrag danach
      rec(999, '2021-07-01'),
    ]
    const { books } = normalize(records_to_raw(records))
    const byId = (id) => books.find((b) => b.id === String(id))
    expect(byId(1).bulkImport).toBe(true)   // Phase
    expect(byId(4).bulkImport).toBe(false)  // Normalmonat
    expect(byId(100).bulkImport).toBe(true) // Tages-Schwelle
    expect(byId(999).bulkImport).toBe(false)
  })
})

describe('effektives Erwerbssignal (Regel 13: entrydate-Proxy mit Bulk-Sperre)', () => {
  const rec = (id, entrydate, dateacquired) => ({ books_id: String(id), title: `B${id}`, entrydate, dateacquired })
  // Phase unterdrücken: Monat mit dateacquired-Mehrheit vorweg
  const normalMonth = [rec(90, '2019-01-01', '2019-01-01'), rec(91, '2019-01-02', '2019-01-02')]

  it('direkt: dateacquired gewinnt immer', () => {
    const { books } = normalize(records_to_raw([...normalMonth, rec(1, '2020-05-10', '2018-03-04')]))
    const b = books.find((x) => x.id === '1')
    expect(b.acquiredDateEffective).toBe('2018-03-04')
    expect(b.acquiredYearEffective).toBe(2018)
    expect(b.acquiredYearSource).toBe('dateacquired')
  })

  it('Fallback: entrydate als Proxy, volle Datumsgranularität', () => {
    const { books } = normalize(records_to_raw([...normalMonth, rec(1, '2020-05-10')]))
    const b = books.find((x) => x.id === '1')
    expect(b.acquiredDateEffective).toBe('2020-05-10')
    expect(b.acquiredYearEffective).toBe(2020)
    expect(b.acquiredYearSource).toBe('entrydate')
  })

  it('Jahres-only dateacquired (kein Volldatum) zählt trotzdem als direkt', () => {
    // toDate() liefert hier { date: null, year: 1998 } — die Bedingung
    // muss auf das Jahr prüfen, nicht auf das Volldatum, sonst rutscht der
    // Eintrag fälschlich in den entrydate-Fallback (siehe task-2-report.md).
    const { books } = normalize(records_to_raw([...normalMonth, rec(1, '2019-06-15', '1998')]))
    const b = books.find((x) => x.id === '1')
    expect(b.acquiredDateEffective).toBe(null)
    expect(b.acquiredYearEffective).toBe(1998)
    expect(b.acquiredYearSource).toBe('dateacquired')
  })

  it('Bulk sperrt den Fallback (Tages-Schwelle)', () => {
    const bulkDay = Array.from({ length: 50 }, (_, i) => rec(100 + i, '2021-06-01'))
    const { books } = normalize(records_to_raw([...normalMonth, ...bulkDay]))
    const b = books.find((x) => x.id === '100')
    expect(b.bulkImport).toBe(true)
    expect(b.acquiredYearEffective).toBe(null)
    expect(b.acquiredYearSource).toBe(null)
  })

  it('Bulk sperrt den Fallback (Phase), echtes dateacquired zählt trotzdem direkt', () => {
    const phase = [rec(1, '2020-01-05'), rec(2, '2020-01-06'), rec(3, '2020-01-07', '2015-09-01')]
    const after = [rec(4, '2020-02-01', '2020-02-01'), rec(5, '2020-02-02', '2020-02-02')]
    const { books } = normalize(records_to_raw([...phase, ...after]))
    expect(books.find((x) => x.id === '1').acquiredYearSource).toBe(null)
    const withDate = books.find((x) => x.id === '3')
    expect(withDate.bulkImport).toBe(true)
    expect(withDate.acquiredYearSource).toBe('dateacquired')
    expect(withDate.acquiredYearEffective).toBe(2015)
  })

  it('weder dateacquired noch entrydate -> null', () => {
    const { books } = normalize(records_to_raw([...normalMonth, rec(1, undefined)]))
    const b = books.find((x) => x.id === '1')
    expect(b.acquiredDateEffective).toBe(null)
    expect(b.acquiredYearSource).toBe(null)
  })

  it('stats.withAcquiredEffective zählt direkt + Proxy', () => {
    const { stats } = normalize(records_to_raw([...normalMonth, rec(1, '2020-05-10')]))
    expect(stats.withAcquiredEffective).toBe(3) // 2× direkt + 1× Proxy
  })
})

describe('abandoned (Regel 14: angefangen, nicht abgeschlossen)', () => {
  it('startedDate ohne Abschluss -> abandoned (dateread-Modus)', () => {
    const raw = records_to_raw([{ books_id: '1', title: 'B1', datestarted: '2020-01-01' }])
    expect(normalize(raw).books[0].abandoned).toBe(true)
  })
  it('startedDate mit Abschluss -> kein Flag', () => {
    const raw = records_to_raw([
      { books_id: '1', title: 'B1', datestarted: '2020-01-01', dateread: '2020-02-01' },
    ])
    const b = normalize(raw).books[0]
    expect(b.hasRead).toBe(true)
    expect(b.abandoned).toBe(false)
  })
  it('unfinished-Tag flaggt auch Bücher in „Have read" — hasRead bleibt true', () => {
    const raw = records_to_raw([
      { books_id: '1', title: 'B1', collections: ['Have read'], tags: ['unfinished'] },
      { books_id: '2', title: 'B2', collections: ['Your library'] },
    ])
    const b = normalize(raw).books.find((x) => x.id === '1')
    expect(b.hasRead).toBe(true)
    expect(b.abandoned).toBe(true)
  })
  it('Currently reading schützt vor beiden Zweigen', () => {
    const raw = records_to_raw([
      { books_id: '1', title: 'B1', datestarted: '2020-01-01', collections: ['Currently reading'] },
      { books_id: '2', title: 'B2', tags: ['unfinished'], collections: ['Currently reading'] },
    ])
    for (const b of normalize(raw).books) expect(b.abandoned).toBe(false)
  })
  it('stats.abandoned zählt die Treffer', () => {
    const raw = records_to_raw([
      { books_id: '1', title: 'B1', datestarted: '2020-01-01' },
      { books_id: '2', title: 'B2' },
    ])
    expect(normalize(raw).stats.abandoned).toBe(1)
  })
  it('unfinished-Tag wirkt schreibungsunabhängig (Fremdexporte)', () => {
    const raw = records_to_raw([
      { books_id: '1', title: 'B1', collections: ['Have read'], tags: ['Unfinished'] },
      { books_id: '2', title: 'B2', collections: ['Your library'] },
    ])
    expect(normalize(raw).books.find((b) => b.id === '1').abandoned).toBe(true)
  })
})

describe('feindliche Eingaben (öffentlicher Upload-Pfad)', () => {
  it('normTag greift nicht in die Prototype-Kette', () => {
    expect(normTag('constructor')).toBe('constructor')
    expect(normTag('__proto__')).toBe('__proto__')
    expect(normTag('toString')).toBe('toString')
  })
  it('degenerierte Records (null, Strings, Arrays, ohne books_id) werden übersprungen', () => {
    const raw = { a: null, b: 'quatsch', c: 42, d: [1, 2], e: {}, f: { books_id: '9', title: 'Echt' } }
    const { books } = normalize(raw)
    expect(books).toHaveLength(1)
    expect(books[0].id).toBe('9')
  })
  it('hasRead: ohne Have-read-Sammlungen zählen dateread und Jahres-Tags', () => {
    const raw = {
      1: { books_id: '1', title: 'A', dateread: '2020-01-05' },
      2: { books_id: '2', title: 'B', tags: ['2019'] },
      3: { books_id: '3', title: 'C' },
    }
    const { books, stats } = normalize(raw)
    expect(books.map((b) => b.hasRead)).toEqual([true, true, false])
    expect(stats.read).toBe(2)
  })
  it('hasRead: mit Have-read-Sammlungen bleibt die Sammlung maßgeblich', () => {
    const raw = {
      1: { books_id: '1', title: 'A', collections: ['Have read'] },
      // Lesedatum, aber bewusst nicht in Have read -> gilt nicht als gelesen
      2: { books_id: '2', title: 'B', dateread: '2020-01-05' },
    }
    const { books } = normalize(raw)
    expect(books.map((b) => b.hasRead)).toEqual([true, false])
  })
  it('Bulk-Tageszählung ignoriert identisch kaputte entrydate-Werte', () => {
    // >= 50 Records mit demselben kaputten entrydate dürfen keinen
    // gemeinsamen Map-Key bilden und so fälschlich als Massenimport-Tag
    // zählen (Copilot-Finding PR #24).
    const garbage = Array.from({ length: 50 }, (_, i) => ({
      books_id: String(1000 + i),
      title: `G${i}`,
      entrydate: 'garbage',
    }))
    // Ein paar normale Records mit gültigem entrydate + dateacquired, damit
    // kein Monat in die Erstkatalogisierungsphase (Regel 1) rutscht — die
    // Phase wird ohnehin nur aus gültigen ISO-Monaten gebildet.
    const normal = [
      { books_id: '1', title: 'A', entrydate: '2019-01-01', dateacquired: '2019-01-01' },
      { books_id: '2', title: 'B', entrydate: '2019-01-02', dateacquired: '2019-01-02' },
    ]
    const { books } = normalize(records_to_raw([...garbage, ...normal]))
    expect(books.filter((b) => b.bulkImport).length).toBe(0)
  })
})

describe('normalize-core bleibt browserfähig', () => {
  it('keine node:-Imports im Kern (läuft auch im Browser)', () => {
    const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'normalize-core.mjs'), 'utf8')
    expect(src).not.toMatch(/from 'node:/)
  })
})

describe('workCode (LibraryThing-Werkschlüssel)', () => {
  it('übernimmt workcode aus dem Rohdatensatz', () => {
    const raw = { 42: { books_id: '42', title: 'T', workcode: '199744' } }
    expect(normalize(raw).books[0].workCode).toBe('199744')
  })
  it('null, wenn workcode fehlt', () => {
    const raw = { 42: { books_id: '42', title: 'T' } }
    expect(normalize(raw).books[0].workCode).toBe(null)
  })
})

// Hinweis: bewusst kein `new URL(..., import.meta.url)` — Vite/Vitest behandelt
// dieses Muster als Asset-URL-Sonderfall und loest es gegen den Dev-Server auf
// (http://localhost:.../@fs/...) statt gegen das Dateisystem, was existsSync/
// readFileSync in Node unter Vitest fehlschlagen laesst.
const HERE = dirname(fileURLToPath(import.meta.url))
const EXPORT_PATH = resolve(HERE, '../librarything_kaixo_202607210219.json')

describe.skipIf(!existsSync(EXPORT_PATH))('Goldene Kennzahlen am realen Export', () => {
  // Lazy in beforeAll: der describe-Body laeuft bei der Collection auch dann,
  // wenn die Suite per skipIf uebersprungen wird — ein eager readFileSync
  // wuerde ohne Export (z. B. in CI) die ganze Suite crashen statt skippen.
  let books
  beforeAll(() => {
    const raw = JSON.parse(readFileSync(EXPORT_PATH, 'utf8'))
    books = normalize(raw).books
  })

  it('4865 Einträge', () => {
    expect(books.length).toBe(4865)
  })
  it('Medien-Split', () => {
    const count = (m) => books.filter((b) => b.mediaType === m).length
    expect(count('book')).toBe(4527)
    expect(count('ebook')).toBe(179)
    expect(count('film')).toBe(87)
    expect(count('vinyl')).toBe(72)
  })
  it('1334 gelesen, Lesejahre ab 1988', () => {
    const read = books.filter((b) => b.hasRead)
    expect(read.length).toBe(1334)
    const years = books.map((b) => b.readYearEffective).filter((y) => y !== null)
    expect(years.length).toBe(1334)
    expect(Math.min(...years)).toBe(1988)
  })
  it('Seiten gesamt 1.359.074', () => {
    expect(books.reduce((s, b) => s + (b.pages ?? 0), 0)).toBe(1359074)
  })
  it('935 mit dateread, Rest aus Jahres-Tags', () => {
    expect(books.filter((b) => b.readYearSource === 'dateread').length).toBe(935)
  })
  it('alle Einträge haben einen workCode', () => {
    expect(books.filter((b) => b.workCode !== null).length).toBe(4865)
  })
  it('Regel 1: 1016 Bulk-Einträge (Phase Aug 2006–Jan 2007 + Tages-Schwelle)', () => {
    expect(books.filter((b) => b.bulkImport).length).toBe(1016)
  })
  it('Regel 13: Erwerbssignal 3601 direkt + 273 Proxy = 3874, Proxy ab 2007', () => {
    expect(books.filter((b) => b.acquiredYearSource === 'dateacquired').length).toBe(3601)
    const proxy = books.filter((b) => b.acquiredYearSource === 'entrydate')
    expect(proxy.length).toBe(273)
    expect(Math.min(...proxy.map((b) => b.acquiredYearEffective))).toBe(2007)
    expect(books.filter((b) => b.acquiredYearEffective !== null).length).toBe(3874)
    expect(books.filter((b) => b.bulkImport && b.acquiredYearSource === 'dateacquired').length).toBe(25)
  })
  it('Regel 14: 419 angefangen ohne Abschluss', () => {
    expect(books.filter((b) => b.abandoned).length).toBe(419)
  })
})
