# Datenqualitäts-View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue View „Datenqualität" (Kennzahlen-Kacheln, Feldabdeckung, sechs klickbare Qualitäts-Flags, globale Import-Bereinigung) samt Normalizer-Regel 14 (`abandoned`) und neuer Filterdimension `{ kind: 'flag' }`.

**Architecture:** Regel 14 liefert das `abandoned`-Flag; `src/lib/flags.ts` bündelt die sechs Flag-Prädikate; `src/lib/viewData/quality.ts` berechnet Kacheln/Abdeckung/Flag-Zeilen aus dem gefilterten Bestand; die View kombiniert das mit den globalen `stats`-Zählern. Die Flag-Filterdimension verhält sich wie Tags/Genres (UND). Spec: `docs/superpowers/specs/2026-08-08-data-quality-view-design.md`.

**Tech Stack:** Vite + React + TypeScript, Vitest, Zustand, CSS Modules.

## Global Constraints

- Basis: Branch `feat/data-quality-view`, abgezweigt von `feat/acquired-effective` (gestaffelter PR — braucht `acquiredYearSource` und `bulkImport` inkl. Erstkatalogisierungsphase aus Plan A).
- Deutsche UI-Texte/Kommentare/Doku, englische Bezeichner; `de.tsx` ist die i18n-Referenz, immer alle fünf Sprachen (de/en/fr/es/ja) gemeinsam; fr nutzt `\u202f` vor `%` (als Escape-Sequenz im Quelltext, nie als literales Zeichen), ja Vollbreiten-Interpunktion (`：`／`（）`), Separator ` · ` überall.
- Keine stille Datenkorrektur; `hasRead` bleibt unangetastet. Erwartete Zähler (ungefiltert): abandoned **419**, bulkImport **1.016**, origLangInferred **1.016**, physicalEstimated **563**, readYearTag **399**, acquiredEntry **273**; Kacheln **79,6 / 97,0 / 20,9 / 78,8 / 25,1 %**. Abweichungen klären und dokumentieren, nicht wegcasten.
- Schwellwerte: Abdeckung ≥ 80 % rikyū / 50–79 % kon / < 50 % enji; Massenimport invertiert ≤ 5 % / 5–20 % / > 20 %. Farbe nie alleiniger Träger — Prozentzahl steht immer dabei.
- Kein Titel-Popup in dieser View; Feldabdeckungs-Zeilen sind reine Anzeige ohne Hover-Tönung, Flag-Zeilen klickbar mit Hover-Tönung.
- Inkompatible `Book`/`Stats`-Änderung ⇒ `SCHEMA_VERSION` in `src/lib/libraryStore.ts` erhöhen (2 → 3).
- Commits per `git commit -F <datei>` mit BEIDEN Trailern:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` und
  `Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP`
- `public/data/**` und `*librarything*.json` nie committen; Playwright nur auf eigenem Dev-Server **Port 5199** (5174 nie anfassen); nur `tsc`/`vitest`/Vite-Build zählen (IDE-Diagnostik stale).

---

### Task 1: Normalizer — Regel 14 (`abandoned`)

**Files:**
- Modify: `scripts/normalize-core.mjs` (Buchaufbau, `stats`), `scripts/normalize.mjs` (Konsole)
- Modify: `scripts/normalize.test.mjs`
- Modify: `docs/datenprofil.md` (Regel 14), `CLAUDE.md` (Erwartungsblock)

**Interfaces:**
- Produces: `Book.abandoned: boolean`, `stats.abandoned: number`. Tasks 2–6 lesen genau diese Namen.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/normalize.test.mjs` (nutzt den vorhandenen Helfer `records_to_raw` aus Plan A):

```js
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
})
```

In der Golden-Suite:

```js
  it('Regel 14: 419 angefangen ohne Abschluss', () => {
    expect(books.filter((b) => b.abandoned).length).toBe(419)
  })
```

- [ ] **Step 2: Tests laufen lassen — FAIL erwartet** (`abandoned` undefined).

Run: `npx vitest run scripts/normalize.test.mjs`

- [ ] **Step 3: Implementierung in `normalize-core.mjs`**

Im `records.map`-Callback sind `tagsNorm` und `hasRead` bisher Inline-Ausdrücke im Objektliteral — beide vor das `return` heben und im Literal referenzieren (`tagsNorm,` bzw. `hasRead,`):

```js
    const tagsNorm = [...new Set(tags.map(normTag))]
    const hasRead = usesReadCollections
      ? collections.includes('Have read') || collections.includes('Read but unowned')
      : read.year !== null || yearTags.length > 0
    // Regel 14: angefangen, nicht abgeschlossen — datestarted ohne Abschluss
    // (abgebrochen ODER Abschluss nie eingetragen; die Daten unterscheiden
    // das nicht) sowie der Tag 'unfinished' (35 Abbrüche liegen trotzdem in
    // „Have read"). Laufende Lektüren („Currently reading") sind ausgenommen.
    // hasRead bleibt unangetastet — keine stille Korrektur.
    const abandoned =
      ((started.date !== null && !hasRead) || tagsNorm.includes('unfinished')) &&
      !collections.includes('Currently reading')
```

Im Objektliteral nach `hasRead`: `abandoned,` — im `stats`-Objekt nach `bulkImported`:

```js
    abandoned: books.filter((b) => b.abandoned).length,
```

In `scripts/normalize.mjs` nach der `Erwerbssignal`-Zeile:

```js
  console.log(`  Angefangen, nicht abgeschlossen: ${stats.abandoned} Bücher (abandoned-Flag, Regel 14)`)
```

- [ ] **Step 4: Tests grün** — `npx vitest run scripts/normalize.test.mjs` (inkl. Golden 419).

- [ ] **Step 5: Daten regenerieren**

```bash
node scripts/normalize.mjs librarything_kaixo_202607210219.json public/data/hidden/library.json
```

Expected: `Angefangen, nicht abgeschlossen: 419 Bücher`. Nicht committen.

- [ ] **Step 6: Doku**

`docs/datenprofil.md`, Regel 14 ans Ende der Bereinigungsregeln:

```markdown
14. **Angefangen, nicht abgeschlossen (`abandoned`).** `datestarted` ohne
    Abschluss (kein `dateread`, kein Jahres-Tag, nicht in „Have read")
    kann „abgebrochen" oder „Abschluss nie eingetragen" bedeuten — die
    Daten unterscheiden das nicht (396 Fälle). Der Tag `unfinished`
    markiert zusätzlich 35 Abbrüche, die trotzdem in „Have read" liegen
    (Schnittmenge leer). Bücher in „Currently reading" sind ausgenommen
    (12 laufende Lektüren). `hasRead` bleibt unverändert; zusammen 419.
```

`CLAUDE.md`-Erwartungsblock: Zeile `Angefangen, nicht abgeschlossen: 419` ergänzen.

- [ ] **Step 7: Commit** — `feat(normalize): abandoned-Flag (Regel 14)` + Trailer.

```bash
git add scripts/normalize-core.mjs scripts/normalize.mjs scripts/normalize.test.mjs docs/datenprofil.md CLAUDE.md
git commit -F <msgdatei>
```

---

### Task 2: Frontend-Typen, Fixtures, Schema-Version, `flags.ts`

**Files:**
- Modify: `src/lib/types.ts` (Book nach `hasRead`, Stats nach `bulkImported`), `src/lib/fixtures.ts` (`abandoned: false`), `src/lib/libraryStore.ts:11` (`SCHEMA_VERSION = 3`)
- Create: `src/lib/flags.ts`
- Test: `src/lib/flags.test.ts`

**Interfaces:**
- Consumes: `Book.abandoned` (Task 1), `acquiredYearSource`/`readYearSource`/`bulkImport`/`physicalEstimated`/`originalLanguagesInferred` (bestehend).
- Produces: `FLAG_IDS` (as-const-Tupel), `FlagId`, `hasFlag(b: Book, id: string): boolean`. Tasks 3–6 nutzen genau diese Namen.

- [ ] **Step 1: Failing Test schreiben** — `src/lib/flags.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from './fixtures'
import { FLAG_IDS, hasFlag } from './flags'

describe('hasFlag', () => {
  it('trifft jedes der sechs Flags über sein Buchfeld', () => {
    expect(hasFlag(mkBook({ bulkImport: true }), 'bulkImport')).toBe(true)
    expect(hasFlag(mkBook({ physicalEstimated: true }), 'physicalEstimated')).toBe(true)
    expect(hasFlag(mkBook({ originalLanguagesInferred: true }), 'origLangInferred')).toBe(true)
    expect(hasFlag(mkBook({ readYearSource: 'tag' }), 'readYearTag')).toBe(true)
    expect(hasFlag(mkBook({ acquiredYearSource: 'entrydate' }), 'acquiredEntry')).toBe(true)
    expect(hasFlag(mkBook({ abandoned: true }), 'abandoned')).toBe(true)
  })
  it('Default-Buch trägt kein Flag', () => {
    for (const id of FLAG_IDS) expect(hasFlag(mkBook(), id)).toBe(false)
  })
  it('unbekannte Id -> false (URL-Eingaben)', () => {
    expect(hasFlag(mkBook(), 'nonsense')).toBe(false)
  })
})
```

- [ ] **Step 2: FAIL verifizieren** — `npx vitest run src/lib/flags.test.ts`

- [ ] **Step 3: Implementierung**

`src/lib/types.ts`, in `Book` nach `hasRead`:

```ts
  /** Regel 14: angefangen, nicht abgeschlossen (startedDate ohne Abschluss oder Tag 'unfinished'; „Currently reading" ausgenommen). */
  abandoned: boolean
```

In `Stats` nach `bulkImported`: `abandoned: number`. — `src/lib/fixtures.ts`: `abandoned: false,` nach `hasRead`. — `SCHEMA_VERSION = 3` (Kommentar „3: abandoned-Flag (Regel 14)").

`src/lib/flags.ts` (neu):

```ts
import type { Book } from './types'

/**
 * Qualitäts-Flags der Datenqualitäts-View (Spec „Datenqualitäts-View"):
 * buchbezogene Befunde, die als Filterdimension { kind: 'flag' } klickbar
 * sind. Reihenfolge = Anzeige-Tiebreaker bei gleicher Trefferzahl.
 */
export const FLAG_IDS = [
  'bulkImport',
  'physicalEstimated',
  'origLangInferred',
  'readYearTag',
  'acquiredEntry',
  'abandoned',
] as const

export type FlagId = (typeof FLAG_IDS)[number]

const PREDICATES: Record<FlagId, (b: Book) => boolean> = {
  bulkImport: (b) => b.bulkImport,
  physicalEstimated: (b) => b.physicalEstimated,
  origLangInferred: (b) => b.originalLanguagesInferred,
  readYearTag: (b) => b.readYearSource === 'tag',
  acquiredEntry: (b) => b.acquiredYearSource === 'entrydate',
  abandoned: (b) => b.abandoned,
}

/** id ist string, nicht FlagId: URL-Parameter sind Nutzereingaben. */
export function hasFlag(b: Book, id: string): boolean {
  return (PREDICATES as Record<string, (b: Book) => boolean | undefined>)[id]?.(b) ?? false
}
```

- [ ] **Step 4: Tests + Typen grün** — `npx vitest run src/lib/flags.test.ts && npx tsc --noEmit`

- [ ] **Step 5: Commit** — `feat(model): abandoned-Feld und Flag-Prädikate` + Trailer.

```bash
git add src/lib/types.ts src/lib/fixtures.ts src/lib/libraryStore.ts src/lib/flags.ts src/lib/flags.test.ts
git commit -F <msgdatei>
```

---

### Task 3: `viewData/quality.ts` — Kacheln, Abdeckung, Flag-Zeilen, Schwellwert-Zonen

**Files:**
- Create: `src/lib/viewData/quality.ts`
- Test: `src/lib/viewData/quality.test.ts`

**Interfaces:**
- Consumes: `FLAG_IDS`, `hasFlag` (Task 2).
- Produces: `QUALITY_FIELD_IDS`, `QualityFieldId`, `qualityData(books: Book[]): QualityData`, `tileZone(pct: number, inverted?: boolean): TileZone` — von Task 4 (Messages-Typ) und Task 6 (View) verwendet.

- [ ] **Step 1: Failing Tests schreiben** — `src/lib/viewData/quality.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { qualityData, tileZone } from './quality'

describe('tileZone (Schwellwerte der Kacheln)', () => {
  it('Abdeckung: >=80 good, 50-79 mid, <50 bad', () => {
    expect(tileZone(80)).toBe('good')
    expect(tileZone(79)).toBe('mid')
    expect(tileZone(50)).toBe('mid')
    expect(tileZone(49)).toBe('bad')
  })
  it('invertiert (Massenimport): <=5 good, 5-20 mid, >20 bad', () => {
    expect(tileZone(5, true)).toBe('good')
    expect(tileZone(6, true)).toBe('mid')
    expect(tileZone(20, true)).toBe('mid')
    expect(tileZone(21, true)).toBe('bad')
  })
})

describe('qualityData', () => {
  it('Erwerbssignal-Kachel: direkt / Proxy / fehlend', () => {
    const books = [
      mkBook({ acquiredYear: 2010 }), // Fixture spiegelt -> source 'dateacquired'
      mkBook({ acquiredYearEffective: 2012, acquiredDateEffective: '2012-01-01', acquiredYearSource: 'entrydate' }),
      mkBook({}),
    ]
    expect(qualityData(books).tiles.acquired).toEqual({ direct: 1, proxy: 1, missing: 1, total: 3 })
  })
  it('Lesejahr-Kachel: Nenner sind die gelesenen', () => {
    const books = [
      mkBook({ hasRead: true, readYearEffective: 2001, readYearSource: 'dateread' }),
      mkBook({ hasRead: true, readYearEffective: 2002, readYearSource: 'tag' }),
      mkBook({ hasRead: true }), // gelesen ohne Jahr
      mkBook({}),                // ungelesen zählt nicht in den Nenner
    ]
    expect(qualityData(books).tiles.readYear).toEqual({ withYear: 2, tagOnly: 1, read: 3 })
  })
  it('Maße-Kachel: vermessen / geschätzt / ohne', () => {
    const books = [
      mkBook({ physical: { heightMm: 200, thicknessMm: 20, lengthMm: 130, weightG: null } }),
      mkBook({ physical: { heightMm: 200, thicknessMm: 20, lengthMm: null, weightG: null }, physicalEstimated: true }),
      mkBook({}),
    ]
    expect(qualityData(books).tiles.dims).toEqual({ measured: 1, estimated: 1, missing: 1, total: 3 })
  })
  it('Feldabdeckung absteigend sortiert, Flag-Zeilen mit FLAG_IDS-Tiebreaker', () => {
    const books = [
      mkBook({ ddc: { code: '100', top: 1, topLabel: 'Philosophie & Psychologie' }, pages: 200 }),
      mkBook({ pages: 100 }),
    ]
    const { coverage, flags } = qualityData(books)
    expect(coverage[0]).toEqual({ id: 'pages', n: 2 })
    expect(coverage[1]).toEqual({ id: 'ddc', n: 1 })
    // alle n gleich (0): Reihenfolge = FLAG_IDS
    expect(flags.map((f) => f.id)).toEqual([
      'bulkImport', 'physicalEstimated', 'origLangInferred', 'readYearTag', 'acquiredEntry', 'abandoned',
    ])
  })
})
```

- [ ] **Step 2: FAIL verifizieren** — `npx vitest run src/lib/viewData/quality.test.ts`

- [ ] **Step 3: Implementierung** — `src/lib/viewData/quality.ts`:

```ts
import { FLAG_IDS, hasFlag, type FlagId } from '../flags'
import type { Book } from '../types'

/**
 * Datengrundlage der Datenqualitäts-View (Spec „Datenqualitäts-View"):
 * alles aus dem GEFILTERTEN Bestand — die globalen Import-Zähler (Block 4)
 * kommen direkt aus stats und laufen nicht durch dieses Modul.
 */

/** Feldinventar der Abdeckungs-Balken; Reihenfolge = Tiebreaker. */
export const QUALITY_FIELD_IDS = [
  'ddc',
  'pages',
  'dimsMeasured',
  'origLangRecorded',
  'acquiredDirect',
  'weight',
  'awards',
  'started',
  'price',
  'rating',
  'readDate',
  'series',
  'fromWhere',
] as const

export type QualityFieldId = (typeof QUALITY_FIELD_IDS)[number]

const FIELD_PREDICATES: Record<QualityFieldId, (b: Book) => boolean> = {
  ddc: (b) => b.ddc !== null,
  pages: (b) => b.pages !== null,
  dimsMeasured: (b) => !b.physicalEstimated && b.physical.heightMm !== null,
  origLangRecorded: (b) => b.originalLanguages.length > 0 && !b.originalLanguagesInferred,
  // bewusst acquiredYear (direkt), nicht effective — der Proxy hat seine eigene Flag-Zeile
  acquiredDirect: (b) => b.acquiredYear !== null,
  weight: (b) => b.physical.weightG !== null,
  awards: (b) => b.awards.length > 0,
  started: (b) => b.startedDate !== null,
  price: (b) => b.price !== null,
  rating: (b) => b.rating !== null,
  readDate: (b) => b.readDate !== null,
  series: (b) => b.series.length > 0,
  fromWhere: (b) => b.fromWhere !== null,
}

export interface QualityTiles {
  acquired: { direct: number; proxy: number; missing: number; total: number }
  readYear: { withYear: number; tagOnly: number; read: number }
  bulk: { n: number; total: number }
  dims: { measured: number; estimated: number; missing: number; total: number }
  rating: { n: number; total: number }
}

export interface CountRow<I extends string> {
  id: I
  n: number
}

export interface QualityData {
  tiles: QualityTiles
  /** absteigend nach n; Gleichstand: QUALITY_FIELD_IDS-Reihenfolge */
  coverage: CountRow<QualityFieldId>[]
  /** absteigend nach n; Gleichstand: FLAG_IDS-Reihenfolge */
  flags: CountRow<FlagId>[]
  total: number
}

export type TileZone = 'good' | 'mid' | 'bad'

/** Schwellwert-Zone einer Kachel (Spec, Block 1). pct in Prozentpunkten. */
export function tileZone(pct: number, inverted = false): TileZone {
  if (inverted) return pct <= 5 ? 'good' : pct <= 20 ? 'mid' : 'bad'
  return pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'bad'
}

export function qualityData(books: Book[]): QualityData {
  const total = books.length
  const read = books.filter((b) => b.hasRead)
  const measured = books.filter((b) => FIELD_PREDICATES.dimsMeasured(b)).length
  const estimated = books.filter((b) => b.physicalEstimated).length
  const direct = books.filter((b) => b.acquiredYearSource === 'dateacquired').length
  const proxy = books.filter((b) => b.acquiredYearSource === 'entrydate').length

  const tiles: QualityTiles = {
    acquired: { direct, proxy, missing: total - direct - proxy, total },
    readYear: {
      withYear: read.filter((b) => b.readYearEffective !== null).length,
      tagOnly: read.filter((b) => b.readYearSource === 'tag').length,
      read: read.length,
    },
    bulk: { n: books.filter((b) => b.bulkImport).length, total },
    dims: { measured, estimated, missing: total - measured - estimated, total },
    rating: { n: books.filter((b) => b.rating !== null).length, total },
  }

  const coverage = QUALITY_FIELD_IDS.map((id) => ({ id, n: books.filter(FIELD_PREDICATES[id]).length }))
    .sort((a, z) => z.n - a.n || QUALITY_FIELD_IDS.indexOf(a.id) - QUALITY_FIELD_IDS.indexOf(z.id))
  const flags = FLAG_IDS.map((id) => ({ id, n: books.filter((b) => hasFlag(b, id)).length }))
    .sort((a, z) => z.n - a.n || FLAG_IDS.indexOf(a.id) - FLAG_IDS.indexOf(z.id))

  return { tiles, coverage, flags, total }
}
```

- [ ] **Step 4: Tests grün** — `npx vitest run src/lib/viewData/quality.test.ts && npx tsc --noEmit`

- [ ] **Step 5: Commit** — `feat(viewData): Qualitäts-Berechnung (Kacheln, Abdeckung, Flags)` + Trailer.

```bash
git add src/lib/viewData/quality.ts src/lib/viewData/quality.test.ts
git commit -F <msgdatei>
```

---

### Task 4: i18n — Message-Interface, fünf Bundles, View-Id `quality`

**Files:**
- Modify: `src/lib/types.ts` (VIEW_IDS um `'quality'` am Ende)
- Modify: `src/i18n/messages.ts`, `de.tsx`, `en.tsx`, `fr.tsx`, `es.tsx`, `ja.tsx`
- Modify: `src/lib/flags.ts` (`flagLabel`)

**Interfaces:**
- Consumes: `FlagId` (Task 2), `QualityFieldId` (Task 3).
- Produces: `m.nav.quality`, `m.views.quality.*`, `m.flagNames`, `m.filter.flag`, `flagLabel(value: string, m: Messages): string`. Tasks 5–6 nutzen genau diese Schlüssel.

- [ ] **Step 1: `VIEW_IDS` erweitern** — in `src/lib/types.ts` `'quality'` als letzten Eintrag aufnehmen. (`nav: Record<ViewId, string>` erzwingt ab jetzt den Schlüssel in allen Bundles — deshalb liegt das in dieser Task.)

- [ ] **Step 2: Interface in `messages.ts`**

Im `filter`-Block nach `genre`: `flag: (label: string) => string`. Auf oberster Ebene neben `genreNames`: `flagNames: Record<FlagId, string>` (Import `type { FlagId } from '../lib/flags'`). Im `views`-Block nach `genres`:

```ts
    quality: {
      title: string
      tiles: {
        acquired: string
        acquiredParts: (directFmt: string, proxyFmt: string, missingFmt: string) => string
        readYear: string
        readYearParts: (tagOnlyFmt: string) => string
        bulk: string
        bulkNote: string
        dims: string
        dimsParts: (estimatedFmt: string, missingFmt: string) => string
        rating: string
        ratingParts: (nFmt: string) => string
      }
      /** Prozentdarstellung der Kacheln und Zeilen (fr: schmales Leerzeichen). */
      pct: (pFmt: string) => string
      rowCounts: (nFmt: string, totalFmt: string, pctFmt: string) => string
      coverageTitle: string
      flagsTitle: string
      globalTitle: string
      fields: Record<QualityFieldId, string>
      global: {
        entities: string
        dimsSorted: string
        dimsDiscarded: string
        dimsEstimated: string
        origLang: string
        tags: string
        tagsValue: (rawFmt: string, normFmt: string) => string
      }
    }
```

(Import `type { QualityFieldId } from '../lib/viewData/quality'`.)

- [ ] **Step 3: `flagLabel` in `src/lib/flags.ts` ergänzen** (jetzt existiert `Messages.flagNames`):

```ts
import type { Messages } from '../i18n/messages'

/** Übersetzter Flag-Name; unbekannte Werte (URL) fallen auf die Id zurück. */
export function flagLabel(value: string, m: Messages): string {
  return (m.flagNames as Record<string, string>)[value] ?? value
}
```

- [ ] **Step 4: Fünf Bundles füllen**

`de.tsx` (Referenz):

```ts
  // nav:
  quality: 'Datenqualität',
  // filter:
  flag: (label) => `Qualität: ${label}`,
  // top-level:
  flagNames: {
    bulkImport: 'Massenimport-Eintrag',
    physicalEstimated: 'Maße geschätzt',
    origLangInferred: 'Originalsprache abgeleitet',
    readYearTag: 'Lesejahr nur per Jahres-Tag',
    acquiredEntry: 'Erwerb nur per Katalogisierungsdatum',
    abandoned: 'Angefangen, nicht abgeschlossen',
  },
  // views.quality:
  quality: {
    title: 'Datenqualität',
    tiles: {
      acquired: 'Erwerbssignal',
      acquiredParts: (d, p, mi) => `${d} direkt · ${p} per Katalogisierung · ${mi} ohne`,
      readYear: 'Lesejahr der gelesenen Titel',
      readYearParts: (t) => `davon ${t} nur per Jahres-Tag`,
      bulk: 'Massenimport',
      bulkNote: 'Katalogisierungs-Sessions, kein Erwerbsverhalten',
      dims: 'Maße vermessen',
      dimsParts: (e, mi) => `${e} geschätzt · ${mi} ohne`,
      rating: 'Bewertet',
      ratingParts: (n) => `${n} bewertet`,
    },
    pct: (p) => `${p} %`,
    rowCounts: (n, t, p) => `${n} von ${t} · ${p} %`,
    coverageTitle: 'Feldabdeckung',
    flagsTitle: 'Qualitäts-Flags — Klick filtert',
    globalTitle: 'Beim Import bereinigt (ganze Bibliothek)',
    fields: {
      ddc: 'DDC-Klassifikation',
      pages: 'Seitenzahl',
      dimsMeasured: 'Maße vermessen',
      origLangRecorded: 'Originalsprache erfasst',
      acquiredDirect: 'Erwerbsdatum direkt',
      weight: 'Gewicht',
      awards: 'Auszeichnungen',
      started: 'Lesebeginn',
      price: 'Preis',
      rating: 'Bewertung',
      readDate: 'Lesedatum',
      series: 'Serie',
      fromWhere: 'Bezugsquelle',
    },
    global: {
      entities: 'HTML-Entities dekodiert',
      dimsSorted: 'Maße umsortiert (permutiert)',
      dimsDiscarded: 'Maße verworfen',
      dimsEstimated: 'Maße aus Seitenzahl geschätzt',
      origLang: 'Originalsprachen abgeleitet',
      tags: 'Tags zusammengeführt',
      tagsValue: (raw, norm) => `${raw} roh → ${norm} normalisiert`,
    },
  },
```

`en.tsx`:

```ts
  quality: 'Data quality',
  flag: (label) => `Quality: ${label}`,
  flagNames: {
    bulkImport: 'Bulk import entry',
    physicalEstimated: 'Dimensions estimated',
    origLangInferred: 'Original language inferred',
    readYearTag: 'Read year via year tag only',
    acquiredEntry: 'Acquisition via entry date only',
    abandoned: 'Started, never finished',
  },
  quality: {
    title: 'Data quality',
    tiles: {
      acquired: 'Acquisition signal',
      acquiredParts: (d, p, mi) => `${d} direct · ${p} via entry date · ${mi} none`,
      readYear: 'Read year of finished books',
      readYearParts: (t) => `${t} via year tag only`,
      bulk: 'Bulk import',
      bulkNote: 'Cataloging sessions, not acquisition behavior',
      dims: 'Dimensions measured',
      dimsParts: (e, mi) => `${e} estimated · ${mi} none`,
      rating: 'Rated',
      ratingParts: (n) => `${n} rated`,
    },
    pct: (p) => `${p}%`,
    rowCounts: (n, t, p) => `${n} of ${t} · ${p}%`,
    coverageTitle: 'Field coverage',
    flagsTitle: 'Quality flags — click to filter',
    globalTitle: 'Cleaned at import (whole library)',
    fields: {
      ddc: 'DDC classification',
      pages: 'Page count',
      dimsMeasured: 'Dimensions measured',
      origLangRecorded: 'Original language recorded',
      acquiredDirect: 'Acquisition date direct',
      weight: 'Weight',
      awards: 'Awards',
      started: 'Reading started',
      price: 'Price',
      rating: 'Rating',
      readDate: 'Read date',
      series: 'Series',
      fromWhere: 'Place of purchase',
    },
    global: {
      entities: 'HTML entities decoded',
      dimsSorted: 'Dimensions reordered (permuted)',
      dimsDiscarded: 'Dimensions discarded',
      dimsEstimated: 'Dimensions estimated from page count',
      origLang: 'Original languages inferred',
      tags: 'Tags merged',
      tagsValue: (raw, norm) => `${raw} raw → ${norm} normalized`,
    },
  },
```

`fr.tsx` (`\u202f` als Escape-Sequenz, `’`-Apostroph):

```ts
  quality: 'Qualité des données',
  flag: (label) => `Qualité\u202f: ${label}`,
  flagNames: {
    bulkImport: 'Entrée d’import en masse',
    physicalEstimated: 'Dimensions estimées',
    origLangInferred: 'Langue originale déduite',
    readYearTag: 'Année de lecture par étiquette seulement',
    acquiredEntry: 'Acquisition par date de saisie seulement',
    abandoned: 'Commencé, jamais terminé',
  },
  quality: {
    title: 'Qualité des données',
    tiles: {
      acquired: 'Signal d’acquisition',
      acquiredParts: (d, p, mi) => `${d} directs · ${p} via la date de saisie · ${mi} sans`,
      readYear: 'Année de lecture des livres lus',
      readYearParts: (t) => `dont ${t} par étiquette d’année seulement`,
      bulk: 'Import en masse',
      bulkNote: 'Sessions de catalogage, pas un comportement d’acquisition',
      dims: 'Dimensions mesurées',
      dimsParts: (e, mi) => `${e} estimées · ${mi} sans`,
      rating: 'Notés',
      ratingParts: (n) => `${n} notés`,
    },
    pct: (p) => `${p}\u202f%`,
    rowCounts: (n, t, p) => `${n} sur ${t} · ${p}\u202f%`,
    coverageTitle: 'Couverture des champs',
    flagsTitle: 'Indicateurs de qualité — cliquer pour filtrer',
    globalTitle: 'Nettoyé à l’import (bibliothèque entière)',
    fields: {
      ddc: 'Classification DDC',
      pages: 'Nombre de pages',
      dimsMeasured: 'Dimensions mesurées',
      origLangRecorded: 'Langue originale renseignée',
      acquiredDirect: 'Date d’acquisition directe',
      weight: 'Poids',
      awards: 'Distinctions',
      started: 'Lecture commencée',
      price: 'Prix',
      rating: 'Note',
      readDate: 'Date de lecture',
      series: 'Série',
      fromWhere: 'Lieu d’achat',
    },
    global: {
      entities: 'Entités HTML décodées',
      dimsSorted: 'Dimensions réordonnées (permutées)',
      dimsDiscarded: 'Dimensions écartées',
      dimsEstimated: 'Dimensions estimées d’après les pages',
      origLang: 'Langues originales déduites',
      tags: 'Étiquettes fusionnées',
      tagsValue: (raw, norm) => `${raw} brutes → ${norm} normalisées`,
    },
  },
```

`es.tsx`:

```ts
  quality: 'Calidad de datos',
  flag: (label) => `Calidad: ${label}`,
  flagNames: {
    bulkImport: 'Entrada de importación masiva',
    physicalEstimated: 'Dimensiones estimadas',
    origLangInferred: 'Idioma original deducido',
    readYearTag: 'Año de lectura solo por etiqueta',
    acquiredEntry: 'Adquisición solo por fecha de registro',
    abandoned: 'Empezado, nunca terminado',
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
```

`ja.tsx` (Vollbreiten-Interpunktion):

```ts
  quality: 'データ品質',
  flag: (label) => `品質：${label}`,
  flagNames: {
    bulkImport: '一括インポートの項目',
    physicalEstimated: '寸法は推定',
    origLangInferred: '原語は推定',
    readYearTag: '読了年は年タグのみ',
    acquiredEntry: '入手は登録日のみ',
    abandoned: '読みかけ・未完',
  },
  quality: {
    title: 'データ品質',
    tiles: {
      acquired: '入手シグナル',
      acquiredParts: (d, p, mi) => `直接 ${d} 件 · 登録日による ${p} 件 · なし ${mi} 件`,
      readYear: '読了本の読了年',
      readYearParts: (t) => `うち ${t} 件は年タグのみ`,
      bulk: '一括インポート',
      bulkNote: '目録作成セッションであり、入手行動ではない',
      dims: '寸法実測',
      dimsParts: (e, mi) => `推定 ${e} 件 · なし ${mi} 件`,
      rating: '評価あり',
      ratingParts: (n) => `${n} 件評価済み`,
    },
    pct: (p) => `${p}%`,
    rowCounts: (n, t, p) => `${t} 件中 ${n} 件 · ${p}%`,
    coverageTitle: 'フィールドの充足率',
    flagsTitle: '品質フラグ — クリックで絞り込み',
    globalTitle: 'インポート時に整理（蔵書全体）',
    fields: {
      ddc: 'DDC分類',
      pages: 'ページ数',
      dimsMeasured: '寸法実測',
      origLangRecorded: '原語の記録あり',
      acquiredDirect: '入手日（直接）',
      weight: '重量',
      awards: '受賞・選定',
      started: '読書開始日',
      price: '価格',
      rating: '評価',
      readDate: '読了日',
      series: 'シリーズ',
      fromWhere: '購入店',
    },
    global: {
      entities: 'HTMLエンティティを復号',
      dimsSorted: '寸法を並べ替え（置換）',
      dimsDiscarded: '寸法を破棄',
      dimsEstimated: 'ページ数から寸法を推定',
      origLang: '原語を推定',
      tags: 'タグを統合',
      tagsValue: (raw, norm) => `元 ${raw} → 正規化 ${norm}`,
    },
  },
```

(Die zwei `quality`-Schlüssel je Bundle liegen in verschiedenen Objekten: `nav.quality` und `views.quality`.)

- [ ] **Step 5: Typen prüfen** — `npx vitest run && npx tsc --noEmit`. tsc erzwingt Vollständigkeit aller fünf Bundles; die App baut weiter, weil `VIEW_REGISTRY` `Partial` ist und `quality` noch nicht registriert wurde.

- [ ] **Step 6: Commit** — `feat(i18n): Datenqualitäts-Texte in fünf Sprachen + View-Id` + Trailer.

```bash
git add src/lib/types.ts src/lib/flags.ts src/i18n/
git commit -F <msgdatei>
```

---

### Task 5: Filterdimension `flag`

**Files:**
- Modify: `src/lib/types.ts` (Filter-Union), `src/store/filters.ts` (matches, UND-Ausnahme, filterLabel), `src/store/urlSync.ts` (PARAMS, parseOne)
- Modify: `CLAUDE.md` (Architektur-Notiz zur UND-Ausnahme)
- Test: `src/store/filters.test.ts`, `src/store/urlSync.test.ts`

**Interfaces:**
- Consumes: `hasFlag`, `FLAG_IDS`, `flagLabel` (Tasks 2/4).
- Produces: `{ kind: 'flag'; value: string }` in der Filter-Union; URL-Param `flag`.

- [ ] **Step 1: Failing Tests schreiben**

`src/store/filters.test.ts`:

```ts
  it('flag-Filter matcht über hasFlag', () => {
    const b = mkBook({ abandoned: true })
    expect(filterBooks([b, mkBook()], [{ kind: 'flag', value: 'abandoned' }])).toEqual([b])
  })
  it('mehrere Flags verengen als UND', () => {
    const both = mkBook({ abandoned: true, bulkImport: true })
    const one = mkBook({ abandoned: true })
    const out = filterBooks(
      [both, one],
      [{ kind: 'flag', value: 'abandoned' }, { kind: 'flag', value: 'bulkImport' }],
    )
    expect(out).toEqual([both])
  })
```

`src/store/urlSync.test.ts` (Stil der Nachbartests):

```ts
  it('flag-Filter überlebt den URL-Roundtrip', () => {
    const filters: Filter[] = [{ kind: 'flag', value: 'abandoned' }]
    expect(queryToState(stateToQuery(DEFAULT_VIEW, filters)).filters).toEqual(filters)
  })
  it('unbekannter flag-Wert wird verworfen', () => {
    expect(queryToState('?flag=nonsense').filters).toEqual([])
  })
```

- [ ] **Step 2: FAIL verifizieren** — `npx vitest run src/store/`

- [ ] **Step 3: Implementierung**

`types.ts`, Filter-Union nach `genre`: `| { kind: 'flag'; value: string }` (string wie bei genre — URL-Werte werden beim Parsen validiert).

`filters.ts`: Import `flagLabel, hasFlag` aus `../lib/flags`; in `matches` nach `genre`:

```ts
    case 'flag':
      return hasFlag(b, f.value)
```

UND-Ausnahme in `filterBooks` erweitern (Bedingung UND Doku-Kommentar):

```ts
      kind === 'tag' || kind === 'genre' || kind === 'flag' ? g.every((f) => matches(b, f)) : g.some((f) => matches(b, f)),
```

Kommentar dort: „Ausnahme Tags, Genres und Qualitäts-Flags: …" — und in `CLAUDE.md` den Satz zur UND-Ausnahme („Mehrere Tags verknüpfen sich als UND …") um Genres und Flags ergänzen, falls dort noch nur Tags stehen.

`filterLabel` nach `genre`:

```ts
    case 'flag':
      return m.filter.flag(flagLabel(f.value, m))
```

`urlSync.ts`: `['flag', 'flag'],` in PARAMS (nach `genre`); in `parseOne` vor `default`:

```ts
    case 'flag':
      return (FLAG_IDS as readonly string[]).includes(raw) ? { kind, value: raw } : null
```

(Import `FLAG_IDS` aus `../lib/flags`.)

- [ ] **Step 4: Suite grün** — `npx vitest run && npx tsc --noEmit`

- [ ] **Step 5: Commit** — `feat(filter): Qualitäts-Flags als Filterdimension (UND, URL-Param flag)` + Trailer.

```bash
git add src/lib/types.ts src/store/ CLAUDE.md
git commit -F <msgdatei>
```

---

### Task 6: View `DataQuality` + CSS + Registrierung

**Files:**
- Create: `src/views/DataQuality.tsx`, `src/views/DataQuality.module.css`
- Modify: `src/App.tsx` (VIEW_REGISTRY + VIEW_ORDER, `quality` ans Ende)

**Interfaces:**
- Consumes: `qualityData`, `tileZone`, `QUALITY_FIELD_IDS`-Typen (Task 3), `flagLabel` (Task 4), Filter `{ kind: 'flag' }` (Task 5), `useLibraryData` (`books`, `stats`, `filtered`), Messages (Task 4).

- [ ] **Step 1: Komponente schreiben** — `src/views/DataQuality.tsx`:

```tsx
import { useMemo } from 'react'
import { EmptyState } from '../components/EmptyState'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { flagLabel } from '../lib/flags'
import { qualityData, tileZone, type TileZone } from '../lib/viewData/quality'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './DataQuality.module.css'

export function DataQuality() {
  const { m, fmtNum } = useI18n()
  const { books, stats, filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const data = useMemo(() => qualityData(filtered), [filtered])
  // Block 4 ist global: rohe Tag-Zahl aus dem GESAMT-Bestand, wie im
  // Import-Bericht (DataUpload) — stats hält nur die normalisierte Facette.
  const rawTagCount = useMemo(() => new Set(books.flatMap((b) => b.tags)).size, [books])

  if (filtered.length === 0) return <EmptyState />

  const q = m.views.quality
  const t = data.tiles
  const pctOf = (n: number, den: number) => (den === 0 ? null : Math.round((100 * n) / den))
  const ZONE_CLASS: Record<TileZone, string> = {
    good: styles.zoneGood,
    mid: styles.zoneMid,
    bad: styles.zoneBad,
  }

  // Kachel: großer Prozentwert, Label, Untersatz. Färbung nur Tönung —
  // die Zahl steht immer dabei (Farbe nie alleiniger Träger). Nenner 0
  // (z. B. keine gelesenen Titel nach Filter) -> „—" ohne Zone.
  const tile = (id: string, label: string, n: number, den: number, sub: string, inverted = false) => {
    const pct = pctOf(n, den)
    const zone = pct === null ? null : tileZone(pct, inverted)
    return (
      <div key={id} className={`${styles.tile} ${zone !== null ? ZONE_CLASS[zone] : ''}`}>
        <div className={styles.tileValue}>{pct === null ? '—' : q.pct(fmtNum(pct))}</div>
        <div className={styles.tileLabel}>{label}</div>
        <div className={styles.tileSub}>{sub}</div>
      </div>
    )
  }

  const rowCounts = (n: number) =>
    q.rowCounts(fmtNum(n), fmtNum(data.total), fmtNum(pctOf(n, data.total) ?? 0))
  const barWidth = (n: number) => `${data.total === 0 ? 0 : (n / data.total) * 100}%`
  const isActive = (value: string) => filters.some((f) => sameFilter(f, { kind: 'flag', value }))

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h2>{q.title}</h2>
      </header>

      <div className={styles.tiles}>
        {tile('acquired', q.tiles.acquired, t.acquired.direct + t.acquired.proxy, t.acquired.total,
          q.tiles.acquiredParts(fmtNum(t.acquired.direct), fmtNum(t.acquired.proxy), fmtNum(t.acquired.missing)))}
        {tile('readYear', q.tiles.readYear, t.readYear.withYear, t.readYear.read,
          q.tiles.readYearParts(fmtNum(t.readYear.tagOnly)))}
        {tile('bulk', q.tiles.bulk, t.bulk.n, t.bulk.total, q.tiles.bulkNote, true)}
        {tile('dims', q.tiles.dims, t.dims.measured, t.dims.total,
          q.tiles.dimsParts(fmtNum(t.dims.estimated), fmtNum(t.dims.missing)))}
        {tile('rating', q.tiles.rating, t.rating.n, t.rating.total,
          q.tiles.ratingParts(fmtNum(t.rating.n)))}
      </div>

      <h3 className={styles.blockTitle}>{q.coverageTitle}</h3>
      {/* Reine Anzeige: keine Klick-/Hover-Semantik — die Tönung ist in
          dieser App das Signal für Klickbarkeit (Spec, Block 2). */}
      <ol className={styles.rows}>
        {data.coverage.map((r) => (
          <li key={r.id} className={styles.staticRow}>
            <span className={styles.listName}>{q.fields[r.id]}</span>
            <span className={styles.barTrack}>
              <span className={styles.barOwned} style={{ width: barWidth(r.n) }} />
            </span>
            <span className={styles.counts}>{rowCounts(r.n)}</span>
          </li>
        ))}
      </ol>

      <h3 className={styles.blockTitle}>{q.flagsTitle}</h3>
      <ol className={styles.rows}>
        {data.flags.map((r) => (
          <li key={r.id}>
            <button
              className={styles.row}
              aria-pressed={isActive(r.id)}
              onClick={() => toggleFilter({ kind: 'flag', value: r.id })}
            >
              <span className={styles.listName}>{flagLabel(r.id, m)}</span>
              <span className={styles.barTrack}>
                <span className={styles.barOwned} style={{ width: barWidth(r.n) }} />
              </span>
              <span className={styles.counts}>{rowCounts(r.n)}</span>
            </button>
          </li>
        ))}
      </ol>

      <h3 className={styles.blockTitle}>{q.globalTitle}</h3>
      {/* Bewusst global (stats vom Import) — reagiert nicht auf Filter. */}
      <dl className={styles.global}>
        <div><dt>{q.global.entities}</dt><dd>{fmtNum(stats.entitiesDecoded)}</dd></div>
        <div><dt>{q.global.dimsSorted}</dt><dd>{fmtNum(stats.dimsSorted)}</dd></div>
        <div><dt>{q.global.dimsDiscarded}</dt><dd>{fmtNum(stats.dimsDiscarded)}</dd></div>
        <div><dt>{q.global.dimsEstimated}</dt><dd>{fmtNum(stats.dimsEstimated)}</dd></div>
        <div><dt>{q.global.origLang}</dt><dd>{fmtNum(stats.origLangInferred)}</dd></div>
        <div><dt>{q.global.tags}</dt><dd>{q.global.tagsValue(fmtNum(rawTagCount), fmtNum(stats.tagsNorm.length))}</dd></div>
      </dl>
    </div>
  )
}
```

- [ ] **Step 2: CSS schreiben** — `src/views/DataQuality.module.css` (Zeilen-Optik aus `Genres.module.css` übernommen; `.staticRow` = `.row`-Raster ohne Interaktionszustände):

```css
.wrap {
  max-width: 72rem;
}

.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: var(--space-3);
  margin: var(--space-3) 0 var(--space-5);
}

.tile {
  background: var(--paper);
  border-radius: var(--radius);
  padding: var(--space-3);
}

/* Schwellwert-Tönungen (Spec, Block 1): Hintergrund-Tönung über --paper,
   Text bleibt --sumi — die Prozentzahl trägt die Aussage, nicht die Farbe. */
.zoneGood { background: color-mix(in srgb, var(--rikyu) 16%, var(--paper)); }
.zoneMid  { background: color-mix(in srgb, var(--kon) 12%, var(--paper)); }
.zoneBad  { background: color-mix(in srgb, var(--enji) 14%, var(--paper)); }

.tileValue {
  font-family: var(--font-mono);
  font-size: 28px;
}

.tileLabel {
  font-weight: 600;
  margin-top: var(--space-1);
}

.tileSub {
  font-size: 13px;
  color: var(--ink-70);
  margin-top: var(--space-1);
}

.blockTitle {
  margin: var(--space-5) 0 var(--space-2);
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-1);
}

.row,
.staticRow {
  display: grid;
  grid-template-columns: minmax(12rem, 20rem) 1fr max-content;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-1) var(--space-2);
  text-align: left;
  font-size: 14px;
}

.row {
  border: none;
  background: none;
}

.row[aria-pressed='true'] {
  outline: 1px solid var(--kon);
  background: var(--paper);
}

/* Tönung nur auf den klickbaren Flag-Zeilen — sie signalisiert Klickbarkeit
   (die Abdeckungszeilen darüber sind reine Anzeige und bleiben still). */
.row:hover,
.row:focus-visible {
  background: var(--ink-08);
}

.listName {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.barTrack {
  display: block;
  height: 14px;
}

.barOwned {
  display: block;
  height: 100%;
  background: var(--ink-15);
}

.counts {
  font-family: var(--font-mono);
  color: var(--ink-70);
  white-space: nowrap;
}

.global {
  margin: 0;
  display: grid;
  gap: var(--space-1);
  max-width: 40rem;
}

.global > div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--ink-15);
  font-size: 14px;
}

.global dd {
  margin: 0;
  font-family: var(--font-mono);
}
```

- [ ] **Step 3: Registrieren** — `src/App.tsx`: Import `DataQuality`; `quality: DataQuality,` in `VIEW_REGISTRY`; `'quality'` ans Ende von `VIEW_ORDER` (nach `'pace'`).

- [ ] **Step 4: Suite + Build** — `npx vitest run && npx tsc --noEmit && npx vite build`

- [ ] **Step 5: Smoke am Dev-Server (Port 5199)** — View öffnen: fünf Kacheln mit Werten 79,6 / 97,0 / 20,9 / 78,8 / 25,1 % (Locale de), Massenimport-Kachel enji-getönt; Flag-Klick setzt Chip; Abdeckungszeilen ohne Hover-Reaktion. Server danach beenden.

- [ ] **Step 6: Commit** — `feat(views): Datenqualitäts-View mit Kacheln, Abdeckung und Flag-Filtern` + Trailer.

```bash
git add src/views/DataQuality.tsx src/views/DataQuality.module.css src/App.tsx
git commit -F <msgdatei>
```

---

### Task 7: DoD-Verifikation (Playwright) + `docs/visualisierungen.md`

**Files:**
- Modify: `docs/visualisierungen.md` („Später"-Eintrag ersetzen)

- [ ] **Step 1: Doku** — in `docs/visualisierungen.md` den Aufzählungspunkt „**Datenqualitätsansicht:** …" aus „Später, wenn Lust besteht" entfernen und davor als eigenen Abschnitt einfügen:

```markdown
## 9 — Datenqualität

**Frage:** Wie belastbar sind die Aussagen der übrigen Ansichten?

**Daten:** Feldabdeckung und Qualitäts-Flags aus dem gefilterten Bestand;
Import-Bereinigungszähler global aus `stats`.

**Darstellung:** Fünf schwellwertgefärbte Kennzahlen-Kacheln
(Erwerbssignal, Lesejahr, Massenimport invertiert, Maße, Rating), darunter
Feldabdeckungs-Balken (reine Anzeige) und sechs klickbare Qualitäts-Flags,
zuletzt die globale Import-Bereinigung als Liste.

**Interaktion:** Flag-Klick togglet `{ kind: 'flag' }` (UND wie Tags);
alles außer der globalen Liste reagiert auf Filter.

**Fertig, wenn:** die Kacheln im ungefilterten Bestand
79,6 / 97,0 / 20,9 / 78,8 / 25,1 % zeigen und kein Prozentwert ohne
sichtbare absolute Zahlen erscheint.
```

- [ ] **Step 2: Gesamtsuite** — `npx vitest run && npx tsc --noEmit && npx vite build`
- [ ] **Step 3: Playwright-DoD (Port 5199, IndexedDB-Seed mit `schemaVersion: 3`):** (a) Kachelwerte + Untersätze wie Spec; (b) Flag-Klick „Angefangen, nicht abgeschlossen" → Chip, Regal zeigt 419; zweites Flag verengt; (c) Genre-Filter aus anderer View verändert Kacheln/Balken, Block 4 unverändert; (d) `?flag=abandoned` stellt Zustand her, `?flag=nonsense` wird ignoriert; (e) Stichprobe ja/fr (Vollbreiten-`：`, `\u202f%`).
- [ ] **Step 4:** `.playwright-mcp/`-Artefakte löschen, Server beenden; Befunde als Fix-Runden in die Verursacher-Task; Commit der Doku (`docs: Datenqualität als View 9 dokumentiert` + Trailer).

```bash
git add docs/visualisierungen.md
git commit -F <msgdatei>
```
