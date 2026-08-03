# Filter-Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanenter Filterbalken mit „+“-Button und Dialog-Popup, das die drei UI-losen Filterdimensionen (Lesestatus, Medium, Sammlung) mit live-gefilterten Facetten-Zählungen setzbar macht.

**Architecture:** Eine pure Zählfunktion `facetCounts` in `src/lib/` (Ausschluss der eigenen Dimension, s. Spec), ein neues Dialog-Popup `FilterEditor` nach dem `<dialog>`/`showModal`-Muster von `BookDetail`, eingehängt in den permanent gerenderten `FilterChips`-Balken. Store und URL-Codierung bleiben unverändert — alle drei Filterarten existieren dort bereits.

**Tech Stack:** React + TypeScript, Zustand (bestehender `useFilterStore`), CSS Modules, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-filter-editor-design.md` (freigegeben inkl. Mock-Abstimmung).

## Global Constraints

- Fünfsprachige Oberfläche: jeder neue Key in **allen fünf** Bundles (de/en/fr/es/ja); die Werte in diesem Plan sind verbindlich und **zeichengenau** zu übernehmen. `de.tsx` ist Referenzfassung.
- UI-Texte nie hart in Komponenten; Datenwerte (Sammlungsnamen) werden nie übersetzt.
- Kommentare auf Deutsch, Bezeichner auf Englisch (Bestandskonvention).
- Barrierefreiheit: Toggle-Chips als `<button>` mit `aria-pressed`; Dialog per `showModal` (nativer Fokusfang, Esc). Farbe nie alleiniger Bedeutungsträger (aktive Chips unterscheiden sich auch durch Füllung, nicht nur Farbton).
- Keine stillen Datenkorrekturen; `facetCounts` ist rein lesend.
- Tests laufen **aus dem Repo-Root** (`npx vitest run`), sonst löst `vitest.setup.ts` nicht auf.
- Vor jedem Commit: `npx tsc --noEmit` sauber und `npx vitest run` grün.

---

### Task 1: `facetCounts` — Zählungen mit Ausschluss der eigenen Dimension

**Files:**
- Create: `src/lib/facetCounts.ts`
- Test: `src/lib/facetCounts.test.ts`

**Interfaces:**
- Consumes: `filterBooks(books, filters)` aus `../store/filters` (existiert), `mkBook` aus `./fixtures` (existiert), Typen `Book`, `Filter`, `MediaType` aus `./types`.
- Produces (Task 3 verlässt sich darauf):
  ```ts
  export interface FacetCounts {
    read: number
    unread: number
    media: Map<MediaType, number>
    collections: Map<string, number>
  }
  export function facetCounts(books: Book[], filters: Filter[]): FacetCounts
  ```

- [ ] **Step 1: Fehlschlagenden Test schreiben** — `src/lib/facetCounts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { facetCounts } from './facetCounts'
import { mkBook } from './fixtures'

const books = [
  mkBook({ hasRead: true, mediaType: 'book', collections: ['A', 'B'] }),
  mkBook({ hasRead: false, mediaType: 'book', collections: ['A'] }),
  mkBook({ hasRead: true, mediaType: 'ebook', collections: [] }),
  mkBook({ hasRead: false, mediaType: 'film', collections: ['B'] }),
]

describe('facetCounts', () => {
  it('zählt ohne Filter die Gesamtmengen', () => {
    const c = facetCounts(books, [])
    expect(c.read).toBe(2)
    expect(c.unread).toBe(2)
    expect(c.media.get('book')).toBe(2)
    expect(c.media.get('ebook')).toBe(1)
    expect(c.media.get('film')).toBe(1)
    expect(c.media.get('vinyl')).toBeUndefined()
    expect(c.collections.get('A')).toBe(2)
    expect(c.collections.get('B')).toBe(2)
  })

  it('ignoriert Filter der eigenen Dimension (Status), wendet ihn auf fremde an', () => {
    const c = facetCounts(books, [{ kind: 'readStatus', value: 'read' }])
    // Status-Zahlen: eigener readStatus-Filter zählt nicht mit
    expect(c.read).toBe(2)
    expect(c.unread).toBe(2)
    // Medium-Zahlen: readStatus wirkt (nur Gelesene)
    expect(c.media.get('book')).toBe(1)
    expect(c.media.get('ebook')).toBe(1)
    expect(c.media.get('film')).toBeUndefined()
    // Sammlungs-Zahlen: readStatus wirkt
    expect(c.collections.get('A')).toBe(1)
    expect(c.collections.get('B')).toBe(1)
  })

  it('kombiniert: eigene Dimension raus, alle fremden bleiben', () => {
    const c = facetCounts(books, [
      { kind: 'mediaType', value: 'book' },
      { kind: 'readStatus', value: 'unread' },
    ])
    // Medium zählt ohne mediaType-Filter, aber nur Ungelesene
    expect(c.media.get('book')).toBe(1)
    expect(c.media.get('film')).toBe(1)
    expect(c.media.get('ebook')).toBeUndefined()
    // Status zählt ohne readStatus-Filter, aber nur Medium book
    expect(c.read).toBe(1)
    expect(c.unread).toBe(1)
  })

  it('zählt ein Buch je Sammlung genau einmal (Mehrfach-Zugehörigkeit)', () => {
    const c = facetCounts(books, [{ kind: 'collection', value: 'A' }])
    // eigener collection-Filter ausgeschlossen -> volle Sammlungszahlen
    expect(c.collections.get('A')).toBe(2)
    expect(c.collections.get('B')).toBe(2)
    // fremde Dimensionen: collection-Filter wirkt (A = Bücher 1+2)
    expect(c.read).toBe(1)
    expect(c.unread).toBe(1)
    expect(c.media.get('book')).toBe(2)
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run (Repo-Root): `npx vitest run src/lib/facetCounts.test.ts`
Expected: FAIL — Modul `./facetCounts` existiert nicht.

- [ ] **Step 3: Implementierung** — `src/lib/facetCounts.ts`:

```ts
import { filterBooks } from '../store/filters'
import type { Book, Filter, MediaType } from './types'

export interface FacetCounts {
  read: number
  unread: number
  media: Map<MediaType, number>
  collections: Map<string, number>
}

/** Zählungen für den Filter-Editor. Jede Dimension zählt gegen die
 *  Filtermenge OHNE die Filter der eigenen Dimension — sonst nullte ein
 *  aktiver Filter seine Geschwister aus („Medium: Buch“ aktiv → E-Book
 *  zeigte 0, obwohl ein Klick die Menge per ODER erweitert). Jede Zahl
 *  beantwortet: „Wie viele Titel zeigt die App, wenn dieser Chip
 *  (zusätzlich) aktiv ist?“ (Spec 2026-08-03, Abschnitt Zählungen.) */
export function facetCounts(books: Book[], filters: Filter[]): FacetCounts {
  const without = (kind: Filter['kind']) =>
    filterBooks(books, filters.filter((f) => f.kind !== kind))

  const statusBase = without('readStatus')
  const read = statusBase.filter((b) => b.hasRead).length

  const media = new Map<MediaType, number>()
  for (const b of without('mediaType')) media.set(b.mediaType, (media.get(b.mediaType) ?? 0) + 1)

  const collections = new Map<string, number>()
  for (const b of without('collection'))
    for (const c of b.collections) collections.set(c, (collections.get(c) ?? 0) + 1)

  return { read, unread: statusBase.length - read, media, collections }
}
```

- [ ] **Step 4: Tests grün**

Run (Repo-Root): `npx vitest run src/lib/facetCounts.test.ts`
Expected: 4 Tests PASS. Danach `npx tsc --noEmit` (sauber) und `npx vitest run` (alle Tests grün).

- [ ] **Step 5: Commit**

```bash
git add src/lib/facetCounts.ts src/lib/facetCounts.test.ts
git commit -m "feat(filter-editor): facetCounts mit Ausschluss der eigenen Dimension"
```

---

### Task 2: i18n-Keys `filterEditor` in Interface und allen fünf Bundles

**Files:**
- Modify: `src/i18n/messages.ts` (Interface `Messages`, nach dem `chips`-Block)
- Modify: `src/i18n/de.tsx`, `src/i18n/en.tsx`, `src/i18n/fr.tsx`, `src/i18n/es.tsx`, `src/i18n/ja.tsx` (jeweils nach dem `chips`-Block)

**Interfaces:**
- Produces (Task 3 verlässt sich darauf): `m.filterEditor.openAria`, `.title`, `.status`, `.medium`, `.collection`, `.read`, `.unread`, `.close` — alle `string`.

**Hinweise:**
- Werte **zeichengenau** übernehmen. Die japanischen Werte per Edit-Tool einfügen (perl/sed scheitern an CJK in `ja.tsx` stillschweigend).
- Die Wortwahl folgt dem Bestand: Gruppenlabels entsprechen den Substantiven der `filter.*`-Chips (de „Medium“, fr „Support“, es „Medio“, ja „媒体“), Statuswerte den `filter.status*`-Formulierungen.

- [ ] **Step 1: Interface erweitern** — in `src/i18n/messages.ts` direkt nach dem `chips: { … }`-Block einfügen:

```ts
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
```

- [ ] **Step 2: Fünf Bundles ergänzen** — jeweils direkt nach dem `chips: { … }`-Block:

`de.tsx`:
```ts
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
```

`en.tsx`:
```ts
  filterEditor: {
    openAria: 'Add filter',
    title: 'Filters',
    status: 'Status',
    medium: 'Medium',
    collection: 'Collection',
    read: 'Read',
    unread: 'Unread',
    close: 'Close',
  },
```

`fr.tsx`:
```ts
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
```

`es.tsx`:
```ts
  filterEditor: {
    openAria: 'Añadir filtro',
    title: 'Filtros',
    status: 'Estado',
    medium: 'Medio',
    collection: 'Colección',
    read: 'Leído',
    unread: 'Sin leer',
    close: 'Cerrar',
  },
```

`ja.tsx`:
```ts
  filterEditor: {
    openAria: 'フィルターを追加',
    title: 'フィルター',
    status: 'ステータス',
    medium: '媒体',
    collection: 'コレクション',
    read: '読了',
    unread: '未読',
    close: '閉じる',
  },
```

- [ ] **Step 3: Verifizieren**

Run (Repo-Root): `npx tsc --noEmit`
Expected: sauber — das Interface erzwingt Vollständigkeit in allen fünf Bundles; ein vergessenes Bundle wäre ein Typfehler.
Dann `npx vitest run`: alle Tests grün.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages.ts src/i18n/de.tsx src/i18n/en.tsx src/i18n/fr.tsx src/i18n/es.tsx src/i18n/ja.tsx
git commit -m "feat(filter-editor): i18n-Keys filterEditor in allen fünf Bundles"
```

---

### Task 3: `FilterEditor`-Popup und permanenter Balken

**Files:**
- Create: `src/components/FilterEditor.tsx`
- Create: `src/components/FilterEditor.module.css`
- Modify: `src/components/FilterChips.tsx` (komplette Datei unten)
- Modify: `src/components/FilterChips.module.css` (Ergänzung unten)

**Interfaces:**
- Consumes: `facetCounts` aus Task 1 (`FacetCounts` mit `read`, `unread`, `media: Map<MediaType, number>`, `collections: Map<string, number>`), `m.filterEditor.*` aus Task 2, `useLibraryData()` → `{ books, stats, filtered }` aus `../lib/DataContext`, `useFilterStore`/`sameFilter`/`filterKey`/`filterLabel` aus `../store/filters`, `useI18n()` → `{ m, fmtNum }`.
- Produces: `FilterEditor({ onClose }: { onClose: () => void })` — wird nur von `FilterChips` gemountet (Mount = öffnen, wie `CoverZoom` in `BookDetail.tsx`).

**Hinweise:**
- `stats.collections` ist `Facet = [string | number, number][]`, absteigend nach Gesamtanzahl — diese Reihenfolge unverändert übernehmen (stabil, springt beim Filtern nicht); Werte mit `String(value)` behandeln.
- Dialog: `padding: 0` am `<dialog>`, Inhalt in innerem `.panel` — so treffen Klicks auf `e.target === ref.current` ausschließlich den Backdrop, nie die Innenfläche.
- App-Einbindung existiert schon (`<FilterChips />` in `App.tsx`); URL-Sync kann alle drei Filterarten bereits (keine Änderung).

- [ ] **Step 1: `src/components/FilterEditor.tsx` anlegen:**

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { facetCounts } from '../lib/facetCounts'
import type { Filter, MediaType } from '../lib/types'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './FilterEditor.module.css'

const MEDIA_TYPES: MediaType[] = ['book', 'ebook', 'film', 'vinyl']

/** Dialog-Popup für die Filterdimensionen ohne eigene View (Status, Medium,
 *  Sammlung). Bewusst dumme Anzeige: Setzen/Entfernen ist toggleFilter
 *  (ODER innerhalb der Dimension wie überall), die Zählungen kommen aus
 *  facetCounts. Bleibt beim Klicken offen — man setzt oft mehrere
 *  Kriterien in Folge; Esc, Backdrop-Klick und Schließen-Button schließen. */
export function FilterEditor({ onClose }: { onClose: () => void }) {
  const { m, fmtNum } = useI18n()
  const { books, stats } = useLibraryData()
  const filters = useFilterStore((s) => s.filters)
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => ref.current?.showModal(), [])
  const counts = useMemo(() => facetCounts(books, filters), [books, filters])

  const chip = (f: Filter & { value: string | number }, label: string, count: number) => {
    const active = filters.some((g) => sameFilter(g, f))
    return (
      <button
        key={String(f.value)}
        className={active ? styles.valActive : styles.val}
        aria-pressed={active}
        onClick={() => toggleFilter(f)}
      >
        {label} <span className={styles.count}>{fmtNum(count)}</span>
      </button>
    )
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      onClick={(e) => {
        // padding 0 am dialog: nur echte Backdrop-Klicks treffen das Element selbst
        if (e.target === ref.current) onClose()
      }}
      aria-label={m.filterEditor.title}
    >
      <div className={styles.panel}>
        <h4 className={styles.title}>{m.filterEditor.title}</h4>
        <div className={styles.group}>
          <p className={styles.groupLabel}>{m.filterEditor.status}</p>
          <div className={styles.values}>
            {chip({ kind: 'readStatus', value: 'read' }, m.filterEditor.read, counts.read)}
            {chip({ kind: 'readStatus', value: 'unread' }, m.filterEditor.unread, counts.unread)}
          </div>
        </div>
        <div className={styles.group}>
          <p className={styles.groupLabel}>{m.filterEditor.medium}</p>
          <div className={styles.values}>
            {MEDIA_TYPES.map((t) => chip({ kind: 'mediaType', value: t }, m.media[t], counts.media.get(t) ?? 0))}
          </div>
        </div>
        <div className={styles.group}>
          <p className={styles.groupLabel}>{m.filterEditor.collection}</p>
          <div className={styles.values}>
            {/* Reihenfolge aus stats.collections (Gesamtbestand, stabil);
                Sammlungsnamen sind Datenwerte und werden nie übersetzt. */}
            {stats.collections.map(([value]) =>
              chip({ kind: 'collection', value: String(value) }, String(value), counts.collections.get(String(value)) ?? 0),
            )}
          </div>
        </div>
        <div className={styles.foot}>
          <button className={styles.close} onClick={onClose}>
            {m.filterEditor.close}
          </button>
        </div>
      </div>
    </dialog>
  )
}
```

- [ ] **Step 2: `src/components/FilterEditor.module.css` anlegen:**

```css
/* Oben rechts unter dem Filterbalken statt bildschirmzentriert — das Popup
   soll sich wie ein Ausklapp-Panel des „+"-Buttons anfühlen (Spec/Mock). */
.dialog {
  margin: 6.5rem var(--space-5) auto auto;
  width: min(32rem, calc(100vw - 2 * var(--space-5)));
  background: var(--paper);
  border: 1px solid var(--ink-15);
  border-radius: var(--radius);
  box-shadow: 0 6px 24px rgba(28, 27, 25, 0.18);
  padding: 0;
}

.dialog::backdrop {
  background: rgba(28, 27, 25, 0.2);
}

.panel {
  padding: var(--space-4) var(--space-5);
}

.title {
  margin: 0 0 var(--space-3);
  font-family: var(--font-title);
  font-weight: var(--weight-display);
  font-size: 17px;
}

.group {
  margin-bottom: var(--space-4);
}

.groupLabel {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-70);
  margin: 0 0 var(--space-2);
}

.values {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
}

.val,
.valActive {
  border: 1px solid var(--ink-45);
  background: transparent;
  color: var(--sumi);
  border-radius: var(--radius);
  padding: 2px var(--space-2);
  font-size: 14px;
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
}

.valActive {
  border-color: var(--kon);
  background: var(--kon);
  color: var(--shironeri);
}

.count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-70);
}

.valActive .count {
  color: rgba(238, 232, 220, 0.75);
}

.foot {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-1);
}

.close {
  border: 1px solid var(--ink-45);
  background: transparent;
  border-radius: var(--radius);
  padding: 2px var(--space-3);
  font-size: 14px;
  color: var(--sumi);
}
```

- [ ] **Step 3: `src/components/FilterChips.tsx` ersetzen** (kompletter neuer Inhalt — Balken permanent, „+“-Button rechts, Editor-Mount):

```tsx
import { useState } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import { filterKey, filterLabel, useFilterStore } from '../store/filters'
import { FilterEditor } from './FilterEditor'
import styles from './FilterChips.module.css'

/** Permanenter Filterbalken: Chips der aktiven Filter plus „+"-Button für
 *  den Filter-Editor. Rendert auch ohne aktive Filter (sonst gäbe es keinen
 *  Zugang zum Editor und das Layout spränge beim ersten Filter). */
export function FilterChips() {
  const { m } = useI18n()
  const filters = useFilterStore((s) => s.filters)
  const removeFilter = useFilterStore((s) => s.removeFilter)
  const clearFilters = useFilterStore((s) => s.clearFilters)
  const [editorOpen, setEditorOpen] = useState(false)
  return (
    <div className={styles.bar} role="region" aria-label={m.chips.regionAria}>
      {filters.map((f) => {
        const label = filterLabel(f, m)
        return (
          <button
            key={filterKey(f)}
            className={styles.chip}
            onClick={() => removeFilter(f)}
            aria-label={m.chips.removeAria(label)}
          >
            {label} <span aria-hidden="true">×</span>
          </button>
        )
      })}
      {filters.length > 1 && (
        <button className={styles.clear} onClick={clearFilters}>
          {m.chips.clearAll}
        </button>
      )}
      <button className={styles.add} onClick={() => setEditorOpen(true)} aria-label={m.filterEditor.openAria}>
        <span aria-hidden="true">+</span>
      </button>
      {editorOpen && <FilterEditor onClose={() => setEditorOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 4: `src/components/FilterChips.module.css` ergänzen** (ans Dateiende):

```css
.add {
  margin-left: auto;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--ink-45);
  background: transparent;
  color: var(--ink-70);
  font-size: 17px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.add:hover {
  border-color: var(--kon);
  color: var(--kon);
}
```

- [ ] **Step 5: Verifizieren**

Run (Repo-Root): `npx tsc --noEmit` (sauber), `npx vitest run` (alle Tests grün), `npx vite build` (baut fehlerfrei).

- [ ] **Step 6: Commit**

```bash
git add src/components/FilterEditor.tsx src/components/FilterEditor.module.css src/components/FilterChips.tsx src/components/FilterChips.module.css
git commit -m "feat(filter-editor): Popup und permanenter Filterbalken mit +-Button"
```

---

## Abschluss-Verifikation (durch die Koordination, nach allen Tasks)

Manuell/Playwright gegen die Definition of Done der Spec:

1. Ohne aktive Filter: Balken sichtbar, nur „+“ rechts; Klick öffnet das Popup oben rechts mit drei Gruppen und Zählungen (Status 1.334/3.531 beim Referenz-Export).
2. „Gelesen“ klicken → Chip „Status: gelesen“ erscheint, URL enthält `status=read`, Views filtern.
3. Ausschluss-Semantik: mit aktivem „Gelesen“ zeigen Film/Vinyl 0, bleiben klickbar; die Status-Zahlen bleiben 1.334/3.531.
4. Esc, Backdrop-Klick und Schließen-Button schließen; Chip-Klicks im Popup schließen nicht.
5. Tastatur: „+“ und alle Chips per Tab erreichbar, `aria-pressed` wechselt.
6. Alle fünf Sprachen: Popup-Texte übersetzt, Sammlungsnamen unübersetzt.
