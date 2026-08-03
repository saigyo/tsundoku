# Aktive Regal-Legende Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Farblegende der Regal-Ansicht wandert über das Regal und wird Filtereingang: Klick togglet die Kategorie, Zählung mit Ausschluss der eigenen Dimension, passive Einträge für fehlende Werte.

**Architecture:** `buildLegend` wird aus `Shelf.tsx` in eine pure, getestete Funktion `shelfLegend` (`src/lib/viewData/shelfLegend.ts`) extrahiert und um den Filter je Eintrag erweitert (`filter: Filter | null`). Die Komponente berechnet die Legendenmenge per `filterBooks` ohne die Filter der eigenen Dimension (Muster aus `facetCounts`) und rendert die Einträge als Toggle-Buttons zwischen Steuerzeile und Regal-SVG. Store, URL-Sync und i18n bleiben unverändert.

**Tech Stack:** React + TypeScript, Zustand (bestehender `useFilterStore`), d3-scale, CSS Modules, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-shelf-legend-design.md` (freigegeben).

## Global Constraints

- Keine neuen i18n-Keys; alle Labels über bestehende Keys (`m.ddc.short`, `m.views.shelf.*`, `langLabel`). UI-Texte nie hart in Komponenten; Kommentare auf Deutsch, Bezeichner auf Englisch.
- Ausschluss-Semantik verbindlich: Legende zählt gegen `filterBooks(books, filters ohne LEGEND_KIND[color])`, Population `mediaType === 'book'`.
- Passive Einträge (fehlende Werte) sind nicht klickbar: `filter: null`.
- Barrierefreiheit: interaktive Einträge als `<button>` mit `aria-pressed`; Aktiv-Zustand über Rahmen `--kon` **plus** Fläche `--ink-08` (Farbe nie alleiniger Träger).
- `yearScale` bekommt `.clamp(true)` (keine extrapolierten Dekadenfarben).
- Tests aus dem Repo-Root (`npx vitest run`), sonst löst `vitest.setup.ts` nicht auf.
- Vor jedem Commit: `npx tsc --noEmit` sauber und `npx vitest run` grün.

---

### Task 1: `shelfLegend` — pure Legendenfunktion mit Filterzuordnung

**Files:**
- Create: `src/lib/viewData/shelfLegend.ts`
- Test: `src/lib/viewData/shelfLegend.test.ts`

**Interfaces:**
- Consumes: `DDC_COLORS` aus `../ddc`, `langLabel`/`LANG_COLORS` aus `../languages`, `mkBook` aus `../fixtures`, `de`-Bundle aus `../../i18n/de`, Typen `Book`, `Filter` aus `../types`, `Messages` aus `../../i18n/messages` (alles existiert).
- Produces (Task 2 verlässt sich darauf):
  ```ts
  export type ColorMode = 'ddc' | 'language' | 'readStatus' | 'acquiredYear'
  export const NEUTRAL: string // '#b9b2a5'
  export const LEGEND_KIND: Record<ColorMode, Filter['kind']>
  export interface LegendEntry { label: string; color: string; count: number; filter: Filter | null }
  export function shelfLegend(mode: ColorMode, books: Book[], yearScale: (y: number) => string, m: Messages): LegendEntry[]
  ```

- [ ] **Step 1: Fehlschlagenden Test schreiben** — `src/lib/viewData/shelfLegend.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { de } from '../../i18n/de'
import { mkBook } from '../fixtures'
import { shelfLegend } from './shelfLegend'

// Stub statt echter d3-Skala: macht den Swatch-Abgriff (Dekaden-Mittelpunkt) prüfbar.
const scale = (y: number) => `scale(${y})`

describe('shelfLegend', () => {
  it('ddc: Klasse mit ddcTop-Filter, fehlende DDC passiv', () => {
    const entries = shelfLegend(
      'ddc',
      [
        mkBook({ ddc: { code: '100', top: 1, topLabel: 'Philosophie' } }),
        mkBook({ ddc: { code: '150', top: 1, topLabel: 'Philosophie' } }),
        mkBook({ ddc: null }),
      ],
      scale,
      de,
    )
    expect(entries[0].label).toBe(de.ddc.short[1])
    expect(entries[0].count).toBe(2)
    expect(entries[0].filter).toEqual({ kind: 'ddcTop', value: 1 })
    const passive = entries.find((e) => e.label === de.views.shelf.noInfo)
    expect(passive?.count).toBe(1)
    expect(passive?.filter).toBeNull()
  })

  it('language: roher LT-Sprachname als Filterwert, Label übersetzt, ohne Sprache passiv', () => {
    // Die Daten führen LibraryThing-Namen ('Japanese'), keine ISO-Codes —
    // der Filterwert muss der Rohwert sein (matches() vergleicht includes).
    const entries = shelfLegend(
      'language',
      [
        mkBook({ languages: ['Japanese'] }),
        mkBook({ languages: ['Japanese', 'German'] }),
        mkBook({ languages: [] }),
      ],
      scale,
      de,
    )
    const ja = entries.find((e) => e.filter !== null)
    expect(ja?.label).toBe('Japanisch') // via langLabel/Intl.DisplayNames
    expect(ja?.count).toBe(2) // gruppiert nach languages[0]
    expect(ja?.filter).toEqual({ kind: 'language', value: 'Japanese' })
    expect(entries.find((e) => e.label === de.views.shelf.noInfo)?.filter).toBeNull()
  })

  it('readStatus: read/unread als Filterwerte', () => {
    const entries = shelfLegend(
      'readStatus',
      [mkBook({ hasRead: true }), mkBook({ hasRead: false }), mkBook({ hasRead: false })],
      scale,
      de,
    )
    expect(entries[0].label).toBe(de.views.shelf.legendUnread)
    expect(entries[0].filter).toEqual({ kind: 'readStatus', value: 'unread' })
    expect(entries[1].filter).toEqual({ kind: 'readStatus', value: 'read' })
  })

  it('acquiredYear: Dekaden-Range, Swatch am Mittelpunkt, ohne Jahr passiv', () => {
    const entries = shelfLegend(
      'acquiredYear',
      [mkBook({ acquiredYear: 1994 }), mkBook({ acquiredYear: 1991 }), mkBook({ acquiredYear: null })],
      scale,
      de,
    )
    const dec = entries.find((e) => e.label === de.views.shelf.decade(1990))
    expect(dec?.count).toBe(2)
    expect(dec?.filter).toEqual({ kind: 'acquiredYear', from: 1990, to: 1999 })
    expect(dec?.color).toBe('scale(1995)')
    expect(entries.find((e) => e.label === de.views.shelf.noAcqYear)?.filter).toBeNull()
  })

  it('sortiert absteigend nach Anzahl', () => {
    const entries = shelfLegend(
      'ddc',
      [
        mkBook({ ddc: null }),
        mkBook({ ddc: null }),
        mkBook({ ddc: { code: '300', top: 3, topLabel: 'Soziologie' } }),
      ],
      scale,
      de,
    )
    expect(entries.map((e) => e.count)).toEqual([2, 1])
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run (Repo-Root): `npx vitest run src/lib/viewData/shelfLegend.test.ts`
Expected: FAIL — Modul `./shelfLegend` existiert nicht.

- [ ] **Step 3: Implementierung** — `src/lib/viewData/shelfLegend.ts`:

```ts
import type { Messages } from '../../i18n/messages'
import { DDC_COLORS } from '../ddc'
import { langLabel, LANG_COLORS } from '../languages'
import type { Book, Filter } from '../types'

export type ColorMode = 'ddc' | 'language' | 'readStatus' | 'acquiredYear'

/** Farbe für Bücher ohne Wert in der aktiven Dimension (auch das Regal färbt damit). */
export const NEUTRAL = '#b9b2a5'

/** Filterdimension je Farbmodus — die Legende zählt ohne die Filter der
 *  eigenen Dimension (Ausschluss-Semantik, s. Spec) und togglet diese Art. */
export const LEGEND_KIND: Record<ColorMode, Filter['kind']> = {
  ddc: 'ddcTop',
  language: 'language',
  readStatus: 'readStatus',
  acquiredYear: 'acquiredYear',
}

export interface LegendEntry {
  label: string
  color: string
  count: number
  /** null = passiver Eintrag: fehlende Werte sind nicht filterbar */
  filter: Filter | null
}

/** Legendeneinträge je Farbmodus, absteigend nach Anzahl — vormals
 *  buildLegend in Shelf.tsx, hier pur und testbar, um den Filter je
 *  Eintrag ergänzt. Sprachen gruppieren nach languages[0] (so färbt das
 *  Regal); der Sprachfilter selbst matcht per includes — dokumentierte
 *  Unschärfe bei mehrsprachigen Büchern (Spec). */
export function shelfLegend(
  mode: ColorMode,
  books: Book[],
  yearScale: (y: number) => string,
  m: Messages,
): LegendEntry[] {
  const dest = new Map<string, { color: string; count: number; filter: Filter | null }>()
  const add = (label: string, color: string, filter: Filter | null) => {
    const e = dest.get(label)
    if (e) e.count += 1
    else dest.set(label, { color, count: 1, filter })
  }
  for (const b of books) {
    switch (mode) {
      case 'ddc':
        if (b.ddc) add(m.ddc.short[b.ddc.top], DDC_COLORS[b.ddc.top], { kind: 'ddcTop', value: b.ddc.top })
        else add(m.views.shelf.noInfo, NEUTRAL, null)
        break
      case 'language': {
        const code = b.languages[0]
        if (code) add(langLabel(code, m), LANG_COLORS[code] ?? NEUTRAL, { kind: 'language', value: code })
        else add(m.views.shelf.noInfo, NEUTRAL, null)
        break
      }
      case 'readStatus':
        if (b.hasRead) add(m.views.shelf.legendRead, '#223a70', { kind: 'readStatus', value: 'read' })
        else add(m.views.shelf.legendUnread, '#f4efe6', { kind: 'readStatus', value: 'unread' })
        break
      case 'acquiredYear': {
        if (b.acquiredYear === null) {
          add(m.views.shelf.noAcqYear, NEUTRAL, null)
        } else {
          // Dekaden-Swatch am Dekaden-Mittelpunkt aus dem tatsächlichen
          // Jahresverlauf, sonst wäre die Legende ohne Farbwert nutzlos.
          const decade = Math.floor(b.acquiredYear / 10) * 10
          add(m.views.shelf.decade(decade), yearScale(decade + 5), {
            kind: 'acquiredYear',
            from: decade,
            to: decade + 9,
          })
        }
        break
      }
    }
  }
  return [...dest].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count)
}
```

- [ ] **Step 4: Tests grün**

Run (Repo-Root): `npx vitest run src/lib/viewData/shelfLegend.test.ts`
Expected: 5 Tests PASS. Danach `npx tsc --noEmit` (sauber) und `npx vitest run` (alle Tests grün — `Shelf.tsx` ist noch unverändert und kollidiert nicht, die neue Datei ist additiv).

- [ ] **Step 5: Commit**

```bash
git add src/lib/viewData/shelfLegend.ts src/lib/viewData/shelfLegend.test.ts
git commit -m "feat(shelf-legend): shelfLegend als pure Funktion mit Filterzuordnung"
```

---

### Task 2: Legende nach oben, aktivierbar

**Files:**
- Modify: `src/views/Shelf.tsx` (Import-Block, Komponentenkopf, Legenden-JSX; `buildLegend` entfällt)
- Modify: `src/views/Shelf.module.css` (Button-Stile ergänzen)

**Interfaces:**
- Consumes: `shelfLegend`, `LEGEND_KIND`, `NEUTRAL`, `ColorMode`, `LegendEntry` aus `../lib/viewData/shelfLegend` (Task 1); `filterBooks`, `sameFilter`, `useFilterStore` aus `../store/filters` (existiert); `useLibraryData()` → `{ books, stats, filtered }`.
- Produces: keine neuen Schnittstellen.

**Hinweis Hook-Reihenfolge:** `legendBooks` ist ein `useMemo` und MUSS vor dem Early-Return `if (filtered.length === 0) return <EmptyState />` stehen (Rules of Hooks). Der `shelfLegend`-Aufruf selbst ist ein einfacher Funktionsaufruf und bleibt nach dem Guard.

- [ ] **Step 1: Import-Block ersetzen** — die Zeilen 1–20 von `src/views/Shelf.tsx` (bis einschließlich `const NEUTRAL = '#b9b2a5'`) werden zu:

```tsx
import { scaleLinear } from 'd3-scale'
import { useMemo, useState } from 'react'
import { BookDetail } from '../components/BookDetail'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { DDC_COLORS } from '../lib/ddc'
import { isActivationKey } from '../lib/keyboard'
import { LANG_COLORS } from '../lib/languages'
import type { Book } from '../lib/types'
import { useMeasure } from '../lib/useMeasure'
import { shelfLayout, type ShelfSort } from '../lib/viewData/shelf'
import { LEGEND_KIND, NEUTRAL, shelfLegend, type ColorMode } from '../lib/viewData/shelfLegend'
import { filterBooks, sameFilter, useFilterStore } from '../store/filters'
import styles from './Shelf.module.css'
```

Entfallen gegenüber vorher: `import type { Messages } …`, `langLabel` aus languages, die lokale Zeile `type ColorMode = …` und `const NEUTRAL = …` (beides kommt jetzt aus `shelfLegend.ts`).

- [ ] **Step 2: Komponentenkopf erweitern** — aus

```tsx
  const { m, fmtNum } = useI18n()
  const { filtered } = useLibraryData()
```

wird

```tsx
  const { m, fmtNum } = useI18n()
  const { books, filtered } = useLibraryData()
  const filters = useFilterStore((s) => s.filters)
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
```

- [ ] **Step 3: `yearScale` klemmen** — im bestehenden `useMemo` aus

```tsx
    return scaleLinear<string>()
      .domain([Math.min(...years, 1991), Math.max(...years, 2026)])
      .range(['#cfc7b4', '#223a70'])
```

wird

```tsx
    // clamp: Dekaden aus der Ausschlussmenge können außerhalb der Domain
    // liegen — ohne Klemme extrapolierte Farben außerhalb der Palette.
    return scaleLinear<string>()
      .domain([Math.min(...years, 1991), Math.max(...years, 2026)])
      .range(['#cfc7b4', '#223a70'])
      .clamp(true)
```

- [ ] **Step 4: `legendBooks` vor dem Early-Return einfügen** — direkt nach dem `yearScale`-`useMemo` und VOR `if (filtered.length === 0) return <EmptyState />`:

```tsx
  // Ausschluss-Semantik: Die Legende zählt ohne die Filter ihrer eigenen
  // Dimension, sonst verschwänden beim Anklicken einer Kategorie alle
  // Geschwistereinträge (s. Spec). Population = alles, was die Ansicht
  // einfärbt: Regal plus „ohne Maße"-Block (mediaType 'book').
  const legendBooks = useMemo(
    () =>
      filterBooks(books, filters.filter((f) => f.kind !== LEGEND_KIND[color])).filter(
        (b) => b.mediaType === 'book',
      ),
    [books, filters, color],
  )
```

- [ ] **Step 5: Legendenberechnung umstellen** — nach dem Guard wird aus

```tsx
  const legend = buildLegend(color, layout.placed.map((p) => p.book), yearScale, m)
```

```tsx
  const legend = shelfLegend(color, legendBooks, yearScale, m)
```

- [ ] **Step 6: Legenden-JSX nach oben verschieben und aktivierbar machen** — den bestehenden `<ul className={styles.legend} …>…</ul>`-Block (nach dem „ohne Maße“-Abschnitt) ersatzlos entfernen und stattdessen direkt NACH dem schließenden `</div>` der `.controls` einfügen:

```tsx
      <ul className={styles.legend} aria-label={m.views.shelf.legendAria}>
        {legend.map((l) => {
          const f = l.filter
          const isActive = f !== null && filters.some((g) => sameFilter(g, f))
          const body = (
            <>
              <i style={{ background: l.color, borderColor: 'var(--ink-45)' }} /> {l.label}{' '}
              <span className={styles.legendCount}>{fmtNum(l.count)}</span>
            </>
          )
          return (
            <li key={l.label}>
              {f !== null ? (
                <button
                  className={isActive ? styles.legendBtnActive : styles.legendBtn}
                  aria-pressed={isActive}
                  onClick={() => toggleFilter(f)}
                >
                  {body}
                </button>
              ) : (
                <span className={styles.legendPassive}>{body}</span>
              )}
            </li>
          )
        })}
      </ul>
```

- [ ] **Step 7: `buildLegend` löschen** — die komplette Funktion `function buildLegend(…) { … }` am Dateiende (nach der `Shelf`-Komponente) entfernen.

- [ ] **Step 8: CSS ergänzen** — in `src/views/Shelf.module.css` direkt nach der bestehenden `.legendCount`-Regel:

```css
/* Interaktive Legendeneinträge: Ruhe wie reiner Text, Hover/Fokus mit
   Rahmen, aktiv mit Kon-Rahmen plus Fläche — Farbe nie alleiniger Träger. */
.legendBtn,
.legendBtnActive,
.legendPassive {
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 1px var(--space-1);
  border-radius: var(--radius);
}

.legendBtn,
.legendBtnActive {
  cursor: pointer;
}

.legendBtn:hover,
.legendBtn:focus-visible {
  border-color: var(--ink-45);
}

.legendBtnActive {
  border-color: var(--kon);
  background: var(--ink-08);
}
```

- [ ] **Step 9: Verifizieren**

Run (Repo-Root): `npx tsc --noEmit` (sauber), `npx vitest run` (alle Tests grün), `npx vite build` (fehlerfrei).

- [ ] **Step 10: Commit**

```bash
git add src/views/Shelf.tsx src/views/Shelf.module.css
git commit -m "feat(shelf-legend): Legende oberhalb des Regals, Klick togglet Filter"
```

---

## Abschluss-Verifikation (durch die Koordination, nach allen Tasks)

Manuell/Playwright gegen die Definition of Done der Spec:

1. Legende steht in allen vier Farbmodi zwischen Steuerzeile und Regal; unterhalb des Regals ist sie verschwunden.
2. Klick „Philosophie“ → Chip `Gebiet: Philosophie`, URL trägt den Filter, Regal filtert; erneuter Klick (Legende oder Chip) entfernt ihn.
3. Bei aktivem Eintrag bleiben alle Geschwisterkategorien sichtbar; Zahlen reagieren auf fremde Filter (z. B. `Status: gelesen` setzen → DDC-Zahlen schrumpfen).
4. Zwei Wissensgebiete nacheinander → zwei Chips, ODER-Menge.
5. Dekaden-Klick → Chip `Erworben: 1990–1999`; zweite Dekade zusätzlich; Swatch-Farben in der Palette (clamp).
6. „Keine Angabe“/„Ohne Erwerbsjahr“ nicht klickbar, mit Anzahl sichtbar.
7. Tastatur: Tab erreicht die Einträge, Enter/Leertaste togglet, `aria-pressed` und sichtbare Aktiv-Markierung (Kon-Rahmen + Fläche) korrekt.
