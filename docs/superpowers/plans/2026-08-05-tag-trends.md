# Tag-Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Ansicht „Tag-Trends": Tag-Häufigkeiten über die Zeit (Linien/Heatmap umschaltbar, feste Label-Spalte) plus Überrepräsentations-Rangliste für einen view-lokal wählbaren Zeitabschnitt; dazu wandert „Bibliothek wechseln" in die Fußzeile.

**Architecture:** Ein Datenmodul (`tagTrendRows` + `tagRanking`) zählt einmal über die Bücher; die View projiziert daraus beide Modi. Neues wiederverwendbares `ToggleSwitch`-Widget (Radios unter der Haube). Store, URL-Sync und Filterlogik bleiben unangetastet — die View liest `filtered` und ruft `toggleFilter`.

**Tech Stack:** React + TypeScript, d3-shape (`line`, `curveMonotoneX`), d3-scale (`scaleLinear`), Zustand (lesend), CSS Modules, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-05-tag-trends-design.md` (freigegeben).

## Global Constraints

- Vergleichsbasis der Rangliste ist die **aktuelle Filtermenge** (usable auf der Achse), nie der Gesamtbestand; `lift = (n_t,S / N_S) / (n_t / N)`; Mindest-Support 3, lift > 1, Top 15.
- Der Zeitabschnitt ist **view-lokaler Zustand** — niemals `setRange`/globaler Filter. Voreinstellung: letzte fünf Jahre der Achse.
- Label-Spalte links, in beiden Modi identisch sortiert: `total` absteigend, bei Gleichstand alphabetisch (`localeCompare`).
- Tag-Ausschlüsse aus `tagNetwork.ts` wiederverwenden (`YEAR_TAG`, `STATUS_TAGS`, `SERIES_MARKER_TAGS`) — keine Kopien der Regeln.
- Konstanten: Linien Top-12, Heatmap Top-30, max. 8 Pins, Heatmap-Zeile 18 px.
- Heatmap-Zellfarbe: `log2(lift)` auf ±2 geklemmt; Enji `#9e3d3b` = über, Kon `#223a70` = unter, 0 Titel = keine Zelle.
- Nav-Reihenfolge: `shelf, timeline, knowledge, tagTrends, network, languages, years, pace, canon`.
- UI-Texte nur über i18n (fünf Bundles vollständig); FR: schmales geschütztes Leerzeichen **U+202F** vor `:` und `;` (Bestandskonvention); JA zählt Titel mit **点** (gemischter Bestand).
- Kommentare/Doku Deutsch, Bezeichner Englisch. Keine neuen Dependencies.
- Rules of Hooks: alle Hooks vor Early-Returns.
- Vor jedem Commit (Repo-Root): `npx tsc --noEmit` sauber, `npx vitest run` grün, bei View-/App-Tasks zusätzlich `npx vite build`. Kein Dev-Server, Port 5174 nie anfassen.

---

### Task 1: Datenmodul `tagTrends`

**Files:**
- Modify: `src/lib/viewData/tagNetwork.ts:9` (nur `export` ergänzen)
- Create: `src/lib/viewData/tagTrends.ts`
- Test: `src/lib/viewData/tagTrends.test.ts`

**Interfaces:**
- Consumes: `STATUS_TAGS`, `SERIES_MARKER_TAGS` (exportiert), `YEAR_TAG` (wird exportiert) aus `./tagNetwork`; `Book` aus `../types`; `mkBook` aus `../fixtures`.
- Produces (Task 4 verlässt sich exakt hierauf):
  - `type TrendAxis = 'acquired' | 'read'`
  - `axisYear(b: Book, axis: TrendAxis): number | null`
  - `tagTrendRows(books: Book[], axis: TrendAxis): TagTrendData` mit `TagTrendData = { years: number[]; totalsPerYear: number[]; rows: TagRow[]; usable: number; excluded: { yearTags: number; status: number; seriesMarkers: number } }` und `TagRow = { tag: string; total: number; counts: number[] }`
  - `tagRanking(data: TagTrendData, from: number, to: number, opts?: { minSupport?: number; limit?: number }): RankedTag[]` mit `RankedTag = { tag: string; lift: number; inSlice: number; total: number }`

- [ ] **Step 1: `YEAR_TAG` exportieren** — in `src/lib/viewData/tagNetwork.ts` wird aus

```ts
const YEAR_TAG = /^(19|20)\d{2}$/
```

```ts
export const YEAR_TAG = /^(19|20)\d{2}$/
```

- [ ] **Step 2: Fehlschlagende Tests schreiben** — `src/lib/viewData/tagTrends.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { tagRanking, tagTrendRows } from './tagTrends'

/** Buch mit Erwerbsjahr, Tags und optionalem effektivem Lesejahr. */
const b = (year: number | null, tags: string[], read: number | null = null) =>
  mkBook({ acquiredYear: year, readYearEffective: read, tagsNorm: tags })

describe('tagTrendRows', () => {
  it('schließt Jahres-, Status- und Reihen-Tags aus und beziffert sie', () => {
    const data = tagTrendRows(
      [b(2000, ['Japan', '1998', 'gelesen', 'RUB']), b(2001, ['Japan', '2004'])],
      'acquired',
    )
    expect(data.rows.map((r) => r.tag)).toEqual(['Japan'])
    expect(data.excluded).toEqual({ yearTags: 2, status: 1, seriesMarkers: 1 })
  })

  it('sortiert nach Gesamtzahl absteigend, bei Gleichstand alphabetisch', () => {
    const data = tagTrendRows(
      [b(2000, ['b-tag', 'a-tag', 'Japan']), b(2001, ['Japan'])],
      'acquired',
    )
    expect(data.rows.map((r) => r.tag)).toEqual(['Japan', 'a-tag', 'b-tag'])
  })

  it('richtet counts an einer lückenlosen Jahresachse aus', () => {
    const data = tagTrendRows([b(2000, ['Japan']), b(2003, ['Japan'])], 'acquired')
    expect(data.years).toEqual([2000, 2001, 2002, 2003])
    expect(data.totalsPerYear).toEqual([1, 0, 0, 1])
    expect(data.rows[0].counts).toEqual([1, 0, 0, 1])
  })

  it('zählt einen doppelt normalisierten Tag je Buch nur einmal', () => {
    const data = tagTrendRows([b(2000, ['Japan', 'Japan'])], 'acquired')
    expect(data.rows[0].total).toBe(1)
  })

  it('nutzt auf der Lektüre-Achse readYearEffective', () => {
    const data = tagTrendRows([b(2000, ['Japan'], 1995), b(2001, ['Japan'], null)], 'read')
    expect(data.usable).toBe(1)
    expect(data.years).toEqual([1995])
  })

  it('liefert bei leerer Achse leere Strukturen', () => {
    const data = tagTrendRows([b(null, ['Japan'])], 'acquired')
    expect(data.years).toEqual([])
    expect(data.rows).toEqual([])
    expect(data.usable).toBe(0)
  })
})

describe('tagRanking', () => {
  // 10 Bücher: 2000 → 3× {phase, klein} + 3× {Japan}; 2001 → 4× {Japan}.
  // Summen: phase 3, klein 3, Japan 7; usable 10.
  const books = [
    ...Array.from({ length: 3 }, () => b(2000, ['phase', 'klein'])),
    ...Array.from({ length: 3 }, () => b(2000, ['Japan'])),
    ...Array.from({ length: 4 }, () => b(2001, ['Japan'])),
  ]
  const data = tagTrendRows(books, 'acquired')

  it('berechnet den Lift als Anteils-Quotient', () => {
    const r = tagRanking(data, 2001, 2001)
    // Japan: (4/4) / (7/10) = 10/7 ≈ 1,43; phase/klein haben 0 im Abschnitt
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ tag: 'Japan', inSlice: 4, total: 7 })
    expect(r[0].lift).toBeCloseTo(10 / 7)
  })

  it('verwirft Tags unter dem Mindest-Support', () => {
    expect(tagRanking(data, 2001, 2001, { minSupport: 5 })).toEqual([])
  })

  it('verwirft lift ≤ 1, bricht Gleichstände alphabetisch und respektiert das Limit', () => {
    // 2000: phase/klein je (3/6)/(3/10) = 5/3; Japan (3/6)/(7/10) < 1 → raus
    expect(tagRanking(data, 2000, 2000).map((x) => x.tag)).toEqual(['klein', 'phase'])
    expect(tagRanking(data, 2000, 2000, { limit: 1 }).map((x) => x.tag)).toEqual(['klein'])
  })

  it('liefert außerhalb der Achse eine leere Liste', () => {
    expect(tagRanking(data, 1990, 1995)).toEqual([])
  })
})
```

- [ ] **Step 3: Tests laufen lassen — sie müssen fehlschlagen**

Run (Repo-Root): `npx vitest run src/lib/viewData/tagTrends.test.ts`
Expected: FAIL („Cannot find module './tagTrends'" o. ä.)

- [ ] **Step 4: Implementierung** — `src/lib/viewData/tagTrends.ts`:

```ts
import type { Book } from '../types'
import { SERIES_MARKER_TAGS, STATUS_TAGS, YEAR_TAG } from './tagNetwork'

export type TrendAxis = 'acquired' | 'read'

/** Jahr eines Buchs auf der gewählten Achse (Lektüre = readYearEffective). */
export function axisYear(b: Book, axis: TrendAxis): number | null {
  return axis === 'acquired' ? b.acquiredYear : b.readYearEffective
}

export interface TagRow {
  tag: string
  /** Titel mit diesem Tag in der Basis (Filtermenge mit Jahr auf der Achse). */
  total: number
  /** Titel je Jahr, indexparallel zu years. */
  counts: number[]
}

export interface TagTrendData {
  /** Lückenlos von min bis max — Heatmap-Spalten und Linien teilen die Achse. */
  years: number[]
  /** Basis-Titel je Jahr, indexparallel zu years. */
  totalsPerYear: number[]
  /** Alle geeigneten Tags: total absteigend, bei Gleichstand alphabetisch. */
  rows: TagRow[]
  /** Titel der Filtermenge mit Jahr auf der Achse. */
  usable: number
  excluded: { yearTags: number; status: number; seriesMarkers: number }
}

export function tagTrendRows(books: Book[], axis: TrendAxis): TagTrendData {
  const excludedSets = {
    yearTags: new Set<string>(),
    status: new Set<string>(),
    seriesMarkers: new Set<string>(),
  }
  const eligible = (tag: string): boolean => {
    if (YEAR_TAG.test(tag)) {
      excludedSets.yearTags.add(tag)
      return false
    }
    if (STATUS_TAGS.has(tag)) {
      excludedSets.status.add(tag)
      return false
    }
    if (SERIES_MARKER_TAGS.has(tag)) {
      excludedSets.seriesMarkers.add(tag)
      return false
    }
    return true
  }
  const usable = books.filter((b) => axisYear(b, axis) !== null)
  if (usable.length === 0) {
    return {
      years: [],
      totalsPerYear: [],
      rows: [],
      usable: 0,
      excluded: { yearTags: 0, status: 0, seriesMarkers: 0 },
    }
  }
  const yearVals = usable.map((b) => axisYear(b, axis) as number)
  const minYear = Math.min(...yearVals)
  const maxYear = Math.max(...yearVals)
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
  const totalsPerYear = new Array<number>(years.length).fill(0)
  const byTag = new Map<string, number[]>()
  for (const book of usable) {
    const i = (axisYear(book, axis) as number) - minYear
    totalsPerYear[i] += 1
    // Set: die Alias-Normalisierung kann denselben Tag mehrfach in tagsNorm
    // hinterlassen — ein Buch zählt je Tag und Jahr genau einmal.
    for (const t of new Set(book.tagsNorm)) {
      if (!eligible(t)) continue
      let arr = byTag.get(t)
      if (!arr) {
        arr = new Array<number>(years.length).fill(0)
        byTag.set(t, arr)
      }
      arr[i] += 1
    }
  }
  const rows: TagRow[] = [...byTag]
    .map(([tag, counts]) => ({ tag, total: counts.reduce((s, c) => s + c, 0), counts }))
    .sort((a, z) => z.total - a.total || a.tag.localeCompare(z.tag))
  return {
    years,
    totalsPerYear,
    rows,
    usable: usable.length,
    excluded: {
      yearTags: excludedSets.yearTags.size,
      status: excludedSets.status.size,
      seriesMarkers: excludedSets.seriesMarkers.size,
    },
  }
}

export interface RankedTag {
  tag: string
  /** Anteil im Abschnitt ÷ Anteil in der Basis (Spec: Maß). */
  lift: number
  inSlice: number
  total: number
}

/** Überrepräsentations-Rangliste für den Abschnitt [from, to] (inklusive). */
export function tagRanking(
  data: TagTrendData,
  from: number,
  to: number,
  opts: { minSupport?: number; limit?: number } = {},
): RankedTag[] {
  const minSupport = opts.minSupport ?? 3
  const limit = opts.limit ?? 15
  if (data.years.length === 0) return []
  const i0 = Math.max(0, from - data.years[0])
  const i1 = Math.min(data.years.length - 1, to - data.years[0])
  if (i1 < i0) return []
  const sliceTotal = data.totalsPerYear.slice(i0, i1 + 1).reduce((s, c) => s + c, 0)
  if (sliceTotal === 0) return []
  const ranked: RankedTag[] = []
  for (const row of data.rows) {
    const inSlice = row.counts.slice(i0, i1 + 1).reduce((s, c) => s + c, 0)
    if (inSlice < minSupport) continue
    const lift = (inSlice / sliceTotal) / (row.total / data.usable)
    if (lift <= 1) continue
    ranked.push({ tag: row.tag, lift, inSlice, total: row.total })
  }
  ranked.sort((a, z) => z.lift - a.lift || z.inSlice - a.inSlice || a.tag.localeCompare(z.tag))
  return ranked.slice(0, limit)
}
```

- [ ] **Step 5: Tests laufen lassen — alle grün**

Run: `npx vitest run` (gesamte Suite; die bestehenden `tagNetwork`-Tests dürfen durch den Export nicht brechen), dann `npx tsc --noEmit`.
Expected: PASS, 0 Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/lib/viewData/tagNetwork.ts src/lib/viewData/tagTrends.ts src/lib/viewData/tagTrends.test.ts
git commit -m "feat(tag-trends): Datenmodul mit Jahresmatrix und Lift-Rangliste"
```

---

### Task 2: `ToggleSwitch`-Komponente

**Files:**
- Create: `src/components/ToggleSwitch.tsx`
- Create: `src/components/ToggleSwitch.module.css`

**Interfaces:**
- Consumes: nur React (`useId`) und das CSS-Modul.
- Produces: `ToggleSwitch<V extends string>({ value, options, onChange, ariaLabel })` mit `options: readonly [{ value: V; label: string }, { value: V; label: string }]` — Task 4 setzt sie zweimal ein.

- [ ] **Step 1: Komponente** — `src/components/ToggleSwitch.tsx`:

```tsx
import { useId } from 'react'
import styles from './ToggleSwitch.module.css'

interface Option<V extends string> {
  value: V
  label: string
}

/** Zweiwertiger Schiebeschalter: visuell ein Segment-Widget mit gleitendem
 *  Daumen, technisch eine Radio-Gruppe — Tastatur- und Screenreader-Semantik
 *  kommen von den nativen Inputs, nicht von ARIA-Nachbauten. */
export function ToggleSwitch<V extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: V
  options: readonly [Option<V>, Option<V>]
  onChange: (v: V) => void
  ariaLabel: string
}) {
  const name = useId()
  return (
    <span
      className={styles.switch}
      role="radiogroup"
      aria-label={ariaLabel}
      data-side={value === options[1].value ? 'b' : 'a'}
    >
      <span className={styles.thumb} aria-hidden="true" />
      {options.map((o) => (
        <label key={o.value} className={value === o.value ? styles.optionChecked : styles.option}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </span>
  )
}
```

- [ ] **Step 2: Styles** — `src/components/ToggleSwitch.module.css`:

```css
.switch {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--ink-45);
  border-radius: 999px;
  background: var(--paper);
  font-size: 13px;
  vertical-align: middle;
}

.switch:focus-within {
  outline: var(--focus-ring);
  outline-offset: 1px;
}

.thumb {
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  width: calc(50% - 2px);
  border-radius: 999px;
  background: var(--kon);
  transition: transform 160ms ease;
}

.switch[data-side='b'] .thumb {
  /* Eigene Breite (50 % − 2 px) plus die 2 px Versatz beider Ränder. */
  transform: translateX(calc(100% + 2px));
}

@media (prefers-reduced-motion: reduce) {
  .thumb {
    transition: none;
  }
}

.option,
.optionChecked {
  position: relative;
  z-index: 1;
  padding: 2px 12px;
  text-align: center;
  cursor: pointer;
  color: var(--ink-70);
}

.optionChecked {
  color: var(--shironeri);
}

.option input,
.optionChecked input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
```

- [ ] **Step 3: Verifizieren**

Run: `npx tsc --noEmit` (sauber), `npx vitest run` (unverändert grün).

- [ ] **Step 4: Commit**

```bash
git add src/components/ToggleSwitch.tsx src/components/ToggleSwitch.module.css
git commit -m "feat(components): ToggleSwitch — Schiebeschalter über nativer Radio-Gruppe"
```

---

### Task 3: View-Id und i18n (atomar)

`nav` ist als `Record<ViewId, string>` typisiert — die neue Id und alle fünf Bundles müssen im selben Commit landen, sonst kompiliert es nicht.

**Files:**
- Modify: `src/lib/types.ts:131-140` (`VIEW_IDS`)
- Modify: `src/i18n/messages.ts` (`views`-Interface)
- Modify: `src/i18n/de.tsx`, `en.tsx`, `fr.tsx`, `es.tsx`, `ja.tsx`

**Interfaces:**
- Produces: `ViewId` enthält `'tagTrends'`; `m.nav.tagTrends`; Namespace `m.views.tagTrends` (Signaturen unten) — Task 4 konsumiert exakt diese Schlüssel.

- [ ] **Step 1: `VIEW_IDS` erweitern** — in `src/lib/types.ts` wird aus

```ts
export const VIEW_IDS = [
  'timeline',
  'knowledge',
  'network',
```

```ts
export const VIEW_IDS = [
  'timeline',
  'knowledge',
  'tagTrends',
  'network',
```

- [ ] **Step 2: Interface** — in `src/i18n/messages.ts` direkt nach dem kompletten `knowledge: { … }`-Block (vor `network: {`) einfügen:

```ts
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
```

- [ ] **Step 3: Deutsche Referenzfassung** — in `src/i18n/de.tsx`: im `nav`-Block `tagTrends: 'Tag-Trends',` nach `knowledge: 'Wissenslandkarte',` einfügen; im `views`-Objekt nach dem `knowledge`-Block:

```tsx
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
      pinAria: (tag) => `„${tag}“ ins Trend-Panel übernehmen`,
      unpinAria: (tag) => `„${tag}“ aus dem Trend-Panel entfernen`,
      pinLimitTitle: 'Höchstens 8 zugewählte Tags',
      tooltip: (tag, year, countFmt, factorFmt) => `${tag} — ${year}: ${countFmt} Titel (×${factorFmt})`,
      andMore: (countFmt) => `… und ${countFmt} weitere`,
      hint: 'Ziehen wählt den Zeitabschnitt der Rangliste, Klick ein Einzeljahr — die Auswahl filtert nicht.',
    },
```

- [ ] **Step 4: Englisch** — `en.tsx`: `nav`-Eintrag `tagTrends: 'Tag Trends',`; `views`:

```tsx
    tagTrends: {
      title: 'Tag Trends',
      coverageAcquired: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          have an acquisition year — this view’s time axis; without a year: {missingFmt}. Hidden as
          tags: {yearTagsFmt} year tags, {statusFmt} status markers, {seriesFmt} series abbreviations.
        </>
      ),
      coverageRead: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          have a reading year — this view’s time axis; without a year: {missingFmt}. Hidden as
          tags: {yearTagsFmt} year tags, {statusFmt} status markers, {seriesFmt} series abbreviations.
        </>
      ),
      noData: 'No title in the current selection has a year on this time axis.',
      axisAria: 'Time axis',
      axisAcquired: 'Acquired',
      axisRead: 'Read',
      modeAria: 'Display',
      modeLines: 'Lines',
      modeHeatmap: 'Heatmap',
      svgAria: 'Tag frequencies over time',
      labelsAria: 'Tags in the trend panel',
      tagButtonTitle: (tag, countFmt) => `${tag}: ${countFmt} titles — click to filter`,
      rankingTitle: (from, to) => (from === to ? `Distinctive in ${from}` : `Distinctive in ${from}–${to}`),
      rankingHint: (minFmt) => `compared with the current filter set; at least ${minFmt} titles in the period`,
      rankingEmpty: 'No tag is notably more frequent in this period than usual.',
      rankingCount: (inSliceFmt, totalFmt) => `${inSliceFmt} of ${totalFmt} titles`,
      factor: (factorFmt) => `×${factorFmt}`,
      pinAria: (tag) => `Add “${tag}” to the trend panel`,
      unpinAria: (tag) => `Remove “${tag}” from the trend panel`,
      pinLimitTitle: 'At most 8 added tags',
      tooltip: (tag, year, countFmt, factorFmt) => `${tag} — ${year}: ${countFmt} titles (×${factorFmt})`,
      andMore: (countFmt) => `… and ${countFmt} more`,
      hint: 'Drag to choose the ranking period, click for a single year — the selection does not filter.',
    },
```

- [ ] **Step 5: Französisch** — `fr.tsx`: `nav`-Eintrag `tagTrends: 'Tendances des tags',`; `views` (⚠ vor jedem `:` und `;` im Fließtext steht U+202F, das schmale geschützte Leerzeichen der Bestandsdatei — beim Transkribieren aus einer bestehenden FR-Zeile kopieren, nicht neu tippen):

```tsx
    tagTrends: {
      title: 'Tendances des tags',
      coverageAcquired: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          ont une année d’acquisition — l’axe temporel de cette vue ; sans année : {missingFmt}.
          Masqués comme tags : {yearTagsFmt} tags d’année, {statusFmt} marqueurs de statut,{' '}
          {seriesFmt} sigles de série.
        </>
      ),
      coverageRead: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          ont une année de lecture — l’axe temporel de cette vue ; sans année : {missingFmt}.
          Masqués comme tags : {yearTagsFmt} tags d’année, {statusFmt} marqueurs de statut,{' '}
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
```

- [ ] **Step 6: Spanisch** — `es.tsx`: `nav`-Eintrag `tagTrends: 'Tendencias de etiquetas',`; `views`:

```tsx
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
      andMore: (countFmt) => `… y ${countFmt} más`,
      hint: 'Arrastrar elige el periodo de la clasificación; clic, un solo año — la selección no filtra.',
    },
```

- [ ] **Step 7: Japanisch** — `ja.tsx`: `nav`-Eintrag `tagTrends: 'タグの推移',`; `views` (Titel zählen mit 点 — gemischter Bestand; Tags/Kategorien mit 件, wie im Tag-Netzwerk):

```tsx
    tagTrends: {
      title: 'タグの推移',
      coverageAcquired: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          入手年があります — このビューの時間軸です。年のないもの：{missingFmt} 点。タグとして非表示：年タグ {yearTagsFmt} 件、状態を示すタグ {statusFmt} 件、シリーズ略号 {seriesFmt} 件。
        </>
      ),
      coverageRead: (missingFmt, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          読了年があります — このビューの時間軸です。年のないもの：{missingFmt} 点。タグとして非表示：年タグ {yearTagsFmt} 件、状態を示すタグ {statusFmt} 件、シリーズ略号 {seriesFmt} 件。
        </>
      ),
      noData: '現在の絞り込みには、この時間軸の年を持つタイトルがありません。',
      axisAria: '時間軸',
      axisAcquired: '入手',
      axisRead: '読書',
      modeAria: '表示形式',
      modeLines: '折れ線',
      modeHeatmap: 'ヒートマップ',
      svgAria: 'タグの出現数の推移',
      labelsAria: 'トレンドパネルのタグ',
      tagButtonTitle: (tag, countFmt) => `${tag}：${countFmt} 点 — クリックで絞り込み`,
      rankingTitle: (from, to) => (from === to ? `${from}年に特に多いタグ` : `${from}–${to}年に特に多いタグ`),
      rankingHint: (minFmt) => `現在の絞り込みとの比較。期間内 ${minFmt} 点以上`,
      rankingEmpty: 'この期間に目立って多いタグはありません。',
      rankingCount: (inSliceFmt, totalFmt) => `${totalFmt} 点中 ${inSliceFmt} 点`,
      factor: (factorFmt) => `×${factorFmt}`,
      pinAria: (tag) => `「${tag}」をトレンドパネルに追加`,
      unpinAria: (tag) => `「${tag}」をトレンドパネルから外す`,
      pinLimitTitle: '追加できるタグは 8 件まで',
      tooltip: (tag, year, countFmt, factorFmt) => `${tag} — ${year}年：${countFmt} 点（×${factorFmt}）`,
      andMore: (countFmt) => `…ほか ${countFmt} 点`,
      hint: 'ドラッグでランキングの期間を、クリックで単年を選択します。この選択は絞り込みではありません。',
    },
```

- [ ] **Step 8: Verifizieren**

Run: `npx tsc --noEmit` — sauber; genau hier fällt jeder fehlende Bundle-Schlüssel auf. Dann `npx vitest run` (grün).

- [ ] **Step 9: Commit**

```bash
git add src/lib/types.ts src/i18n/messages.ts src/i18n/de.tsx src/i18n/en.tsx src/i18n/fr.tsx src/i18n/es.tsx src/i18n/ja.tsx
git commit -m "feat(tag-trends): View-Id und i18n-Namespace in allen fünf Bundles"
```

---

### Task 4: View `TagTrends`

**Files:**
- Create: `src/views/TagTrends.tsx`
- Create: `src/views/TagTrends.module.css`

**Interfaces:**
- Consumes: `tagTrendRows`, `tagRanking`, `axisYear`, `TrendAxis`, `TagRow` aus `../lib/viewData/tagTrends` (Task 1); `ToggleSwitch` (Task 2); `m.views.tagTrends.*` (Task 3); `AxisBottom`, `AxisLeft`, `CoverageNote`, `Num`, `EmptyState`, `Tooltip`, `useI18n`, `useLibraryData`, `useMeasure`, `sameFilter`, `useFilterStore` (bestehend).
- Produces: `export function TagTrends()` — Task 5 registriert sie.

- [ ] **Step 1: View-Komponente** — `src/views/TagTrends.tsx`:

```tsx
import { scaleLinear } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { Tooltip } from '../components/Tooltip'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { useMeasure } from '../lib/useMeasure'
import { axisYear, tagRanking, tagTrendRows, type TagRow, type TrendAxis } from '../lib/viewData/tagTrends'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './TagTrends.module.css'

const LINES_N = 12
const HEAT_N = 30
const MAX_PINS = 8
const MIN_SUPPORT = 3
const ROW_H = 18
const LINES_H = 320
const M = { top: 8, right: 8, bottom: 26, left: 40 }

/** Kategoriale Linienfarben in Palettennähe; Zuordnung nach sichtbarem Index —
 *  stabil, solange sich die sichtbare Tag-Menge nicht ändert (Spec). */
const TREND_COLORS = [
  '#223a70', '#9e3d3b', '#7a8b4a', '#8a6fae', '#b07d2f', '#3f7d6e',
  '#a4535f', '#54609c', '#867049', '#5b8a9e', '#75584d', '#4a6741',
]

type Mode = 'lines' | 'heat'

export function TagTrends() {
  const { m, fmtNum } = useI18n()
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const [axis, setAxis] = useState<TrendAxis>('acquired')
  const [mode, setMode] = useState<Mode>('lines')
  const [pinned, setPinned] = useState<string[]>([])
  const [hover, setHover] = useState<{ tag: string; year: number; px: number; py: number } | null>(null)
  const [hoverTag, setHoverTag] = useState<string | null>(null)
  const [selRaw, setSelRaw] = useState<{ from: number; to: number } | null>(null)
  const [drag, setDrag] = useState<{ x0: number; x1: number } | null>(null)
  const dragMoved = useRef(false)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()

  const data = useMemo(() => tagTrendRows(filtered, axis), [filtered, axis])

  // Abschnitt: view-lokal (nie setRange — sonst kollabiert die Vergleichsbasis
  // auf den Abschnitt selbst). Roh-Auswahl wird auf die Achse geklemmt;
  // ungültig/leer fällt auf die letzten fünf Jahre zurück.
  const sel = useMemo(() => {
    const ys = data.years
    if (ys.length === 0) return null
    const last = ys[ys.length - 1]
    const fallback = { from: Math.max(ys[0], last - 4), to: last }
    if (selRaw === null) return fallback
    const from = Math.max(ys[0], selRaw.from)
    const to = Math.min(last, selRaw.to)
    return from > to ? fallback : { from, to }
  }, [data.years, selRaw])

  // Sichtbare Zeilen: Top-N des Modus plus gepinnte, in der Sortierung des
  // Gesamtrankings (total desc, dann alphabetisch) — beide Modi identisch.
  const visible = useMemo(() => {
    const top = data.rows.slice(0, mode === 'lines' ? LINES_N : HEAT_N)
    const extra = data.rows.filter((r) => pinned.includes(r.tag) && !top.includes(r))
    return [...top, ...extra].sort((a, z) => z.total - a.total || a.tag.localeCompare(z.tag))
  }, [data.rows, mode, pinned])

  const ranking = useMemo(
    () => (sel === null ? [] : tagRanking(data, sel.from, sel.to, { minSupport: MIN_SUPPORT })),
    [data, sel],
  )

  // Verwaister Hover: Moduswechsel, Pin-Entfernung oder Filterwechsel können
  // die gehoverte Zeile entfernen, ohne dass ihr pointerleave feuert.
  useEffect(() => {
    if (hover !== null && !visible.some((r) => r.tag === hover.tag)) setHover(null)
    if (hoverTag !== null && !visible.some((r) => r.tag === hoverTag)) setHoverTag(null)
  }, [visible, hover, hoverTag])

  // Während des Brushs: Textselektion global aus, Escape bricht ab
  // (Muster aus Timeline/Wissenslandkarte).
  const dragging = drag !== null
  useEffect(() => {
    if (!dragging) return
    document.body.style.userSelect = 'none'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrag(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.userSelect = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [dragging])

  if (filtered.length === 0) return <EmptyState />
  if (data.years.length === 0 || sel === null) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        {m.views.tagTrends.noData}
      </CoverageNote>
    )
  }

  const t = m.views.tagTrends
  const innerW = Math.max(200, width - M.left - M.right)
  const cellW = innerW / data.years.length
  const xc = (i: number) => i * cellW + cellW / 2
  const yearAt = (px: number) =>
    data.years[Math.max(0, Math.min(data.years.length - 1, Math.floor(px / cellW)))]
  const height = mode === 'lines' ? LINES_H : M.top + visible.length * ROW_H + M.bottom
  const maxCount = Math.max(1, ...visible.flatMap((r) => r.counts))
  const y = scaleLinear().domain([0, maxCount]).range([LINES_H - M.bottom, M.top]).nice()
  const mkLine = line<number>()
    .x((_, i) => xc(i))
    .y((c) => y(c))
    .curve(curveMonotoneX)

  const factorAt = (row: TagRow, yearIdx: number): number => {
    const total = data.totalsPerYear[yearIdx]
    if (total === 0 || row.total === 0) return 1
    return row.counts[yearIdx] / total / (row.total / data.usable)
  }
  const fmtFactor = (f: number) => fmtNum(Math.round(f * 10) / 10)

  const localX = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    return Math.max(0, Math.min(innerW, clientX - (rect?.left ?? 0) - M.left))
  }
  const tipPos = (e: React.PointerEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    return { px: e.clientX - (rect?.left ?? 0), py: e.clientY - (rect?.top ?? 0) }
  }

  const effHover = hover?.tag ?? hoverTag
  const hoverBooks =
    hover === null
      ? []
      : filtered
          .filter((b) => axisYear(b, axis) === hover.year && b.tagsNorm.includes(hover.tag))
          .map((b) => b.title)
  const hoverRow = hover === null ? null : (visible.find((r) => r.tag === hover.tag) ?? null)

  const tickEvery = Math.max(1, Math.ceil(data.years.length / Math.floor(innerW / 60)))
  const xTicks = data.years
    .filter((yr) => yr % tickEvery === 0)
    .map((yr) => ({ x: xc(data.years.indexOf(yr)), label: String(yr) }))
  const maxLift = ranking.length === 0 ? 1 : ranking[0].lift

  const selRect = (() => {
    const i0 = data.years.indexOf(sel.from)
    const i1 = data.years.indexOf(sel.to)
    return { x: i0 * cellW, w: (i1 - i0 + 1) * cellW }
  })()

  const cellFill = (row: TagRow, i: number): string | null => {
    if (row.counts[i] === 0) return null
    const clamped = Math.max(-1, Math.min(1, Math.log2(factorAt(row, i)) / 2))
    // Enji = überrepräsentiert, Kon = unterrepräsentiert; |t| skaliert die Deckkraft.
    return clamped >= 0
      ? `rgba(158, 61, 59, ${0.12 + 0.68 * clamped})`
      : `rgba(34, 58, 112, ${0.12 + 0.68 * -clamped})`
  }

  return (
    <div>
      <header className={styles.head}>
        <h2>{t.title}</h2>
        <CoverageNote covered={data.usable} total={filtered.length}>
          {(axis === 'acquired' ? t.coverageAcquired : t.coverageRead)(
            <Num>{fmtNum(filtered.length - data.usable)}</Num>,
            <Num>{fmtNum(data.excluded.yearTags)}</Num>,
            <Num>{fmtNum(data.excluded.status)}</Num>,
            <Num>{fmtNum(data.excluded.seriesMarkers)}</Num>,
          )}
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <span className={styles.ctl}>
          {t.axisAria}
          <ToggleSwitch
            value={axis}
            options={[
              { value: 'acquired', label: t.axisAcquired },
              { value: 'read', label: t.axisRead },
            ]}
            onChange={setAxis}
            ariaLabel={t.axisAria}
          />
        </span>
        <span className={styles.ctl}>
          {t.modeAria}
          <ToggleSwitch
            value={mode}
            options={[
              { value: 'lines', label: t.modeLines },
              { value: 'heat', label: t.modeHeatmap },
            ]}
            onChange={setMode}
            ariaLabel={t.modeAria}
          />
        </span>
      </div>

      <div className={styles.panel}>
        <ul className={styles.labels} aria-label={t.labelsAria} style={{ paddingTop: M.top }}>
          {visible.map((r, i) => {
            const active = filters.some((g) => sameFilter(g, { kind: 'tag', value: r.tag }))
            const cls = active ? styles.labelBtnActive : effHover === r.tag ? styles.labelBtnHover : styles.labelBtn
            return (
              <li key={r.tag}>
                <button
                  className={cls}
                  aria-pressed={active}
                  title={t.tagButtonTitle(r.tag, fmtNum(r.total))}
                  onClick={() => toggleFilter({ kind: 'tag', value: r.tag })}
                  onPointerEnter={() => setHoverTag(r.tag)}
                  onPointerLeave={() => setHoverTag(null)}
                >
                  {mode === 'lines' && (
                    <i style={{ background: TREND_COLORS[i % TREND_COLORS.length] }} />
                  )}
                  <span className={styles.labelText}>{r.tag}</span>
                  {pinned.includes(r.tag) && <span aria-hidden="true">📌</span>}
                  <span className={styles.labelCount}>{fmtNum(r.total)}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className={styles.chartWrap} ref={wrapRef}>
          <svg
            width={Math.max(200, width)}
            height={height}
            role="img"
            aria-label={t.svgAria}
            className={styles.brushArea}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.preventDefault()
              dragMoved.current = false
              const px = localX(e.clientX)
              setDrag({ x0: px, x1: px })
            }}
            onPointerMove={(e) => {
              if (!drag) return
              const px = localX(e.clientX)
              if (!dragMoved.current && Math.abs(px - drag.x0) > 3) {
                dragMoved.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
              }
              setDrag((d) => (d ? { ...d, x1: px } : d))
            }}
            onPointerUp={() => {
              if (drag) {
                // Zug = Bereich, Klick = Einzeljahr; beides bleibt view-lokal.
                const a = yearAt(Math.min(drag.x0, drag.x1))
                const b = yearAt(Math.max(drag.x0, drag.x1))
                setSelRaw(dragMoved.current ? { from: a, to: b } : { from: b, to: b })
              }
              dragMoved.current = false
              setDrag(null)
            }}
          >
            <g transform={`translate(${M.left},0)`}>
              <rect
                x={selRect.x}
                y={M.top}
                width={selRect.w}
                height={height - M.top - M.bottom}
                fill="var(--kon)"
                opacity={0.1}
              />
              {mode === 'lines' ? (
                <>
                  <AxisLeft x={0} ticks={y.ticks(5).map((v) => ({ y: y(v), label: fmtNum(v) }))} />
                  {visible.map((r, i) => {
                    const d = mkLine(r.counts) ?? ''
                    const dim = effHover !== null && effHover !== r.tag
                    return (
                      <g key={r.tag}>
                        <path
                          d={d}
                          fill="none"
                          stroke={TREND_COLORS[i % TREND_COLORS.length]}
                          strokeWidth={1.8}
                          opacity={dim ? 0.25 : 0.9}
                        />
                        <path
                          d={d}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={12}
                          onPointerMove={(e) => {
                            const yr = yearAt(localX(e.clientX))
                            setHover({ tag: r.tag, year: yr, ...tipPos(e) })
                          }}
                          onPointerLeave={() => setHover(null)}
                        />
                      </g>
                    )
                  })}
                </>
              ) : (
                visible.map((r, ri) => (
                  <g key={r.tag}>
                    {effHover === r.tag && (
                      <rect
                        x={0}
                        y={M.top + ri * ROW_H}
                        width={innerW}
                        height={ROW_H}
                        fill="var(--ink-08)"
                        pointerEvents="none"
                      />
                    )}
                    {data.years.map((yr, i) => {
                      const fill = cellFill(r, i)
                      if (fill === null) return null
                      return (
                        <rect
                          key={yr}
                          x={i * cellW + 0.5}
                          y={M.top + ri * ROW_H + 1}
                          width={Math.max(0.5, cellW - 1)}
                          height={ROW_H - 2}
                          fill={fill}
                          onPointerMove={(e) => setHover({ tag: r.tag, year: yr, ...tipPos(e) })}
                          onPointerLeave={() => setHover(null)}
                        />
                      )
                    })}
                  </g>
                ))
              )}
              {(() => {
                const left = Math.min(...(drag && dragMoved.current ? [drag.x0, drag.x1] : [selRect.x]))
                const right = drag && dragMoved.current ? Math.max(drag.x0, drag.x1) : selRect.x + selRect.w
                const a = drag && dragMoved.current ? yearAt(left) : sel.from
                const b = drag && dragMoved.current ? yearAt(right) : sel.to
                return (
                  <g>
                    {drag && dragMoved.current && (
                      <rect
                        x={left}
                        y={M.top}
                        width={right - left}
                        height={height - M.top - M.bottom}
                        fill="var(--kon)"
                        opacity={0.15}
                      />
                    )}
                    <text x={left - 4} y={M.top + 12} textAnchor="end" className={styles.annotation}>
                      {a}
                    </text>
                    {b !== a && (
                      <text x={right + 4} y={M.top + 12} textAnchor="start" className={styles.annotation}>
                        {b}
                      </text>
                    )}
                  </g>
                )
              })()}
              <AxisBottom ticks={xTicks} y={height - M.bottom + 2} />
            </g>
          </svg>
          {hover && !drag && hoverRow && (
            <Tooltip x={hover.px} y={hover.py}>
              {t.tooltip(
                hover.tag,
                hover.year,
                fmtNum(hoverBooks.length),
                fmtFactor(factorAt(hoverRow, hover.year - data.years[0])),
              )}
              {hoverBooks.length > 0 && (
                <ul className={styles.tipList}>
                  {hoverBooks.slice(0, 10).map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                  {hoverBooks.length > 10 && <li>{t.andMore(fmtNum(hoverBooks.length - 10))}</li>}
                </ul>
              )}
            </Tooltip>
          )}
        </div>
      </div>
      <p className={styles.hint}>{t.hint}</p>

      <section className={styles.ranking}>
        <h3>
          {t.rankingTitle(sel.from, sel.to)}
          <span className={styles.rankingHint}>{t.rankingHint(fmtNum(MIN_SUPPORT))}</span>
        </h3>
        {ranking.length === 0 ? (
          <p className={styles.rankingEmpty}>{t.rankingEmpty}</p>
        ) : (
          <ol className={styles.rankingList}>
            {ranking.map((r) => {
              const active = filters.some((g) => sameFilter(g, { kind: 'tag', value: r.tag }))
              const isPinned = pinned.includes(r.tag)
              const pinFull = !isPinned && pinned.length >= MAX_PINS
              return (
                <li key={r.tag}>
                  <button
                    className={active ? styles.rankTagActive : styles.rankTag}
                    aria-pressed={active}
                    title={t.tagButtonTitle(r.tag, fmtNum(r.total))}
                    onClick={() => toggleFilter({ kind: 'tag', value: r.tag })}
                  >
                    {r.tag}
                  </button>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span className={styles.bar} style={{ width: `${(r.lift / maxLift) * 100}%` }} />
                  </span>
                  <span className={styles.factor}>{t.factor(fmtFactor(r.lift))}</span>
                  <span className={styles.rankCount}>
                    {t.rankingCount(fmtNum(r.inSlice), fmtNum(r.total))}
                  </span>
                  <button
                    className={isPinned ? styles.pinActive : styles.pin}
                    aria-pressed={isPinned}
                    aria-label={isPinned ? t.unpinAria(r.tag) : t.pinAria(r.tag)}
                    disabled={pinFull}
                    title={pinFull ? t.pinLimitTitle : undefined}
                    onClick={() =>
                      setPinned((p) => (isPinned ? p.filter((x) => x !== r.tag) : [...p, r.tag]))
                    }
                  >
                    📌
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Styles** — `src/views/TagTrends.module.css`:

```css
.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.controls {
  display: flex;
  gap: var(--space-5);
  align-items: center;
  flex-wrap: wrap;
  font-size: 14px;
  margin: var(--space-2) 0 var(--space-3);
}

.ctl {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.panel {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.labels {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 14rem;
  flex: none;
}

.labels li {
  height: 18px; /* = ROW_H: Heatmap-Zeilen liegen exakt neben den Labels */
  display: flex;
}

/* Ruhe wie Text, Hover mit Rahmen, aktiv Kon-Rahmen plus Fläche —
   dasselbe Muster wie Regal- und Wissenslandkarten-Legende. */
.labelBtn,
.labelBtnHover,
.labelBtnActive {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  width: 100%;
  min-width: 0;
  border: 1px solid transparent;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 12px;
  text-align: left;
  padding: 0 var(--space-1);
  border-radius: var(--radius);
  cursor: pointer;
}

.labelBtn:hover,
.labelBtn:focus-visible,
.labelBtnHover {
  border-color: var(--ink-45);
}

.labelBtnActive {
  border-color: var(--kon);
  background: var(--ink-08);
}

.labelBtn i,
.labelBtnHover i,
.labelBtnActive i {
  width: 10px;
  height: 10px;
  flex: none;
}

.labelText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.labelCount {
  font-family: var(--font-mono);
  color: var(--ink-70);
  flex: none;
}

.chartWrap {
  flex: 1;
  min-width: 0;
  position: relative; /* Bezugssystem für den Tooltip */
}

.brushArea {
  cursor: crosshair;
  touch-action: none;
}

.annotation {
  font-size: 11px;
  font-family: var(--font-mono);
  fill: var(--ink-70);
}

.hint {
  font-size: 12px;
  color: var(--ink-45);
  margin: var(--space-2) 0 0;
}

.tipList {
  margin: var(--space-1) 0 0;
  padding-left: var(--space-4);
  max-width: 24rem;
}

.ranking {
  margin-top: var(--space-4);
  max-width: 52rem;
}

.ranking h3 {
  font-size: 15px;
  margin: 0 0 var(--space-2);
}

.rankingHint {
  font-weight: 400;
  font-size: 12px;
  color: var(--ink-45);
  margin-left: var(--space-2);
}

.rankingEmpty {
  font-size: 13px;
  color: var(--ink-70);
}

.rankingList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rankingList li {
  display: grid;
  grid-template-columns: minmax(8rem, 13rem) 8rem 3.5rem 1fr auto;
  gap: var(--space-2);
  align-items: center;
  font-size: 13px;
}

.rankTag,
.rankTagActive {
  border: 1px solid transparent;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: left;
  padding: 1px var(--space-1);
  border-radius: var(--radius);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rankTag:hover,
.rankTag:focus-visible {
  border-color: var(--ink-45);
}

.rankTagActive {
  border-color: var(--kon);
  background: var(--ink-08);
}

.barTrack {
  display: block;
  height: 9px;
  background: var(--ink-08);
  border-radius: var(--radius);
}

.bar {
  display: block;
  height: 100%;
  background: var(--enji);
  border-radius: var(--radius);
}

.factor {
  font-family: var(--font-mono);
}

.rankCount {
  color: var(--ink-70);
  font-size: 12px;
}

.pin,
.pinActive {
  border: 1px solid transparent;
  background: none;
  font: inherit;
  padding: 0 var(--space-1);
  border-radius: var(--radius);
  cursor: pointer;
  opacity: 0.45;
}

.pinActive {
  opacity: 1;
  border-color: var(--kon);
  background: var(--ink-08);
}

.pin:hover,
.pin:focus-visible {
  opacity: 1;
  border-color: var(--ink-45);
}

.pin:disabled {
  cursor: not-allowed;
  opacity: 0.25;
}
```

- [ ] **Step 3: Verifizieren**

Run: `npx tsc --noEmit` (sauber), `npx vitest run` (grün), `npx vite build` (fehlerfrei — die View ist noch nicht registriert, muss aber kompilieren).

- [ ] **Step 4: Commit**

```bash
git add src/views/TagTrends.tsx src/views/TagTrends.module.css
git commit -m "feat(tag-trends): View mit Linien/Heatmap, Label-Spalte, Abschnitt und Rangliste"
```

---

### Task 5: Registrierung in der App

**Files:**
- Modify: `src/App.tsx:23-37`

**Interfaces:**
- Consumes: `TagTrends` aus `./views/TagTrends` (Task 4); `m.nav.tagTrends` existiert (Task 3).

- [ ] **Step 1: Registrieren** — in `src/App.tsx`: Import `import { TagTrends } from './views/TagTrends'` alphabetisch zwischen `Shelf` und `TagNetwork` einfügen; in `VIEW_REGISTRY` nach `knowledge: KnowledgeMap,` die Zeile `tagTrends: TagTrends,` ergänzen; `VIEW_ORDER` wird zu

```ts
export const VIEW_ORDER: ViewId[] = [
  'shelf', 'timeline', 'knowledge', 'tagTrends', 'network', 'languages', 'years', 'pace', 'canon',
]
```

- [ ] **Step 2: Verifizieren**

Run: `npx tsc --noEmit`, `npx vitest run`, `npx vite build` — alles sauber.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(tag-trends): Ansicht zwischen Wissenslandkarte und Tag-Netzwerk einhängen"
```

---

### Task 6: „Bibliothek wechseln" in die Fußzeile

**Files:**
- Modify: `src/App.tsx` (Header-Knopf raus, Prop an `Footer`)
- Modify: `src/App.module.css` (`.replaceLibrary`-Regeln raus, Budget-Kommentar anpassen)
- Modify: `src/components/Footer.tsx` (optionale Prop + Knopf)
- Modify: `src/components/Footer.module.css` (Knopf-Stil)

**Interfaces:**
- Produces: `Footer({ onReplaceLibrary }: { onReplaceLibrary?: () => void })` — nur `App` konsumiert sie.

- [ ] **Step 1: `Footer` erweitern** — in `src/components/Footer.tsx` Signatur ändern zu

```tsx
export function Footer({ onReplaceLibrary }: { onReplaceLibrary?: () => void }) {
```

und zwischen dem `{m.footer.embedded}`-Link und dem `<span className={styles.sep} …>·</span>` vor dem Cover-Label einfügen:

```tsx
      {onReplaceLibrary && (
        <>
          <span className={styles.sep} aria-hidden="true">·</span>
          <button className={styles.replaceLibrary} onClick={onReplaceLibrary}>
            {m.app.replaceLibrary}
          </button>
        </>
      )}
```

- [ ] **Step 2: Fußzeilen-Stil** — in `src/components/Footer.module.css` ergänzen:

```css
/* Knopf im Link-Gewand: gehört optisch zur Fußzeilen-Reihe, bleibt aber
   semantisch ein Button (öffnet den Upload-Dialog, navigiert nicht). */
.replaceLibrary {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 13px;
  color: var(--ink-70);
  cursor: pointer;
}

.replaceLibrary:hover {
  color: var(--sumi);
}
```

- [ ] **Step 3: `App` umbauen** — in `src/App.tsx`:
  1. `<Footer />` wird zu

```tsx
      <Footer
        onReplaceLibrary={
          load.state === 'ready' && load.source === 'browser' && !replacing
            ? () => setReplacing(true)
            : undefined
        }
      />
```

  2. In `Shell`: den kompletten Block `{onReplaceLibrary && ( <button className={styles.replaceLibrary} …> … )}` entfernen; die Prop verschwindet aus der Signatur — aus `function Shell({ onReplaceLibrary }: { onReplaceLibrary?: () => void })` wird `function Shell()`, der Aufruf `<Shell onReplaceLibrary={…} />` wird `<Shell />`.

- [ ] **Step 4: Header-CSS aufräumen** — in `src/App.module.css`: die Regeln `.replaceLibrary { … }` und `.replaceLibrary:lang(fr), .replaceLibrary:lang(es) { … }` samt ihrer Kommentare komplett löschen. Den Budget-Kommentar über `.navItem:lang(fr), .navItem:lang(es)` ersetzen durch:

```css
/* Engere Tab-Abstände für die breiten FR/ES-Labels: neun Tabs plus Marke
   müssen bei 1440 px Fensterbreite einzeilig bleiben (der Wechseln-Knopf
   wohnt seit dem neunten Tab in der Fußzeile). */
```

- [ ] **Step 5: Verifizieren**

Run: `npx tsc --noEmit`, `npx vitest run`, `npx vite build` — alles sauber. Sichtprüfung übernimmt die Abschluss-Verifikation (FR/ES-Kopfzeile, Fußzeilen-Knopf nur bei Browser-Quelle).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.module.css src/components/Footer.tsx src/components/Footer.module.css
git commit -m "feat(app): Bibliothek-wechseln-Knopf in die Fußzeile verlegt"
```

---

## Abschluss-Verifikation (durch die Koordination, nach den Tasks)

Playwright gegen die Definition of Done der Spec, mit realen Daten (eigener Server, nie Port 5174):

1. Nav zeigt „Tag-Trends" zwischen Wissenslandkarte und Tag-Netzwerk; View lädt mit Linien-Modus, Erwerbsachse, Voreinstellung „letzte fünf Jahre" in der Ranglisten-Überschrift.
2. Schiebeschalter Darstellung: Heatmap zeigt Top-30 neben denselben Labels in derselben Reihenfolge (Tag Nr. 3 identisch in beiden Modi); Umschalten erhält Abschnitt und Pins.
3. Achsen-Schalter Lektüre: Coverage-Zahlen wechseln; mit Filter „Ungelesen" erscheint der noData-Hinweis (akzeptierte Leere).
4. Brush über mehrere Jahre → Ranglisten-Überschrift nennt den Bereich; Klick auf ein Jahr → Einzeljahr; kein Filter-Chip entsteht; Escape bricht den Zug ab.
5. Rangliste: Faktor > 1, „n von m Titeln"; 📌 pinnt (max. 8, dann disabled mit Titel), Tag erscheint in Label-Spalte und Trend; zweites 📌 entfernt.
6. Label-Klick erzeugt Tag-Chip, `aria-pressed` und Markierung wie in den Legenden; Klick auf gehoverte Linie/Zeile plus Abwahl hinterlässt keinen verwaisten Hover.
7. Tooltip auf Linie und Zelle: „Tag — Jahr: N Titel (×F)" plus Titelliste; Faktor deckt sich mit der Zellfarbe (Stichprobe).
8. Fußzeile: „Bibliothek wechseln" zwischen Lizenzen und Cover-Schalter (nur Browser-Quelle), öffnet den Upload-Dialog; Kopfzeile bricht in FR und ES bei 1280 px nicht um.
9. `prefers-reduced-motion`: Daumen springt ohne Animation.
