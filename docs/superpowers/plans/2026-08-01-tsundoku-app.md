# Tsundoku App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clientseitige SPA zur Exploration der LibraryThing-Bibliothek: Fundament (Datenpipeline-Verifikation, Filter-Store, URL-Sync, Shell) plus die acht Views aus `docs/visualisierungen.md`, jede mit vollständiger Cross-Filter-Integration.

**Architecture:** Ein Zustand-Store hält `Filter[]` + aktive View; daraus wird memoisiert ein gefiltertes `Book[]` abgeleitet, das alle Views als einzige Datenquelle bekommen. URL-Sync ohne Router (`pushState`/`popstate`). Jede View = eine Datei in `src/views/`, ihre reine Datenaufbereitung = eine getestete Funktion in `src/lib/viewData/`.

**Tech Stack:** Vite + React 19 + TypeScript (strict), Zustand, D3-Module (`d3-scale`, `d3-shape`, `d3-force`, `d3-hierarchy`, `d3-sankey`, `d3-array`), CSS Modules + Design-Tokens, Vitest (jsdom).

**Maßgebliche Dokumente:** `CLAUDE.md` (Stack, Konventionen, Gestaltung), `docs/datenprofil.md` (Datenmodell, Bereinigungsregeln), `docs/visualisierungen.md` (View-Spezifikationen mit Definition of Done), `docs/superpowers/specs/2026-07-31-tsundoku-app-design.md` (Architekturentscheidungen). Bei Widerspruch gilt die Projektdoku.

## Global Constraints

- **UI-Sprache Deutsch, Code Englisch.** Zahlenformat de-DE (`1.359.074`), Formatierung ausschließlich über `src/lib/format.ts`.
- **Fehlende Werte sind `null`**, nie `""`, `0` oder `"unknown"` — im Datenmodell und in allen Transformationen.
- **Keine stillen Datenkorrekturen.** Jede Regel, die Werte verwirft, zählt die Verworfenen und die View weist sie aus.
- **Jede View zeigt die Abdeckung ihrer Datengrundlage** (CoverageNote) und hat einen EmptyState, der die greifenden Filter nennt.
- **Views filtern nie selbst.** Sie erhalten das gefilterte Array aus dem Context und schreiben Filter ausschließlich über Store-Aktionen.
- **Barrierefreiheits-Untergrenze pro View:** sichtbarer Tastaturfokus, `prefers-reduced-motion` respektiert (keine Transitions/Animationen), Farbe nie alleiniger Bedeutungsträger.
- **CJK-tauglich:** Titel wie 『世界の終りとハードボイルド・ワンダーランド』 dürfen nirgends Layout brechen; Trunkierung mit `text-overflow: ellipsis` bzw. SVG-`<title>`.
- **Erweiterte Filter-Union:** zusätzlich zu den neun Dimensionen aus `CLAUDE.md` gibt es `originalLanguage`, `editionYear` (Bereich) und `award` — von den DoDs der Views 4, 5 und 8 gefordert. Diese Abweichung ist beabsichtigt und hier dokumentiert.
- **Nach jedem Task:** `npx vitest run` grün, `npx tsc --noEmit` fehlerfrei, Commit. Nach jedem View-Task zusätzlich manuelle Prüfung im Dev-Server.
- Der Roh-Export liegt im Repo-Root als `librarything_kaixo_202607210219.json` (gitignored). `public/data/library.json` wird generiert und nie eingecheckt.

## Dateistruktur (Zielbild)

```
package.json, vite.config.ts, tsconfig.json, index.html
scripts/normalize.mjs          (modifiziert: Helfer exportiert, CLI-Guard)
scripts/normalize.test.mjs     (neu)
src/main.tsx                   Fonts, Styles, startUrlSync, Mount
src/App.tsx                    Ladezustände, Shell, View-Registry
src/store/filters.ts (+.test)  Filter-Union-Logik + Zustand-Store
src/store/urlSync.ts (+.test)  Query-String-Serialisierung + History
src/lib/types.ts               Book, Stats, Library, Filter, ViewId
src/lib/format.ts              de-DE-Formatierung
src/lib/ddc.ts                 DDC-Hauptklassen: Labels + Farben
src/lib/languages.ts           Sprachcodes → deutsche Namen + Farben
src/lib/awards.ts (+.test)     Kanon-Synonymtabelle (Task 4 leer, Task 14 gefüllt)
src/lib/fixtures.ts            mkBook-Factory für Tests
src/lib/loadLibrary.ts (+.test) fetch + Fehlerklassen
src/lib/DataContext.tsx        { books, stats, filtered } Context
src/lib/useMeasure.ts          ResizeObserver-Hook
src/lib/viewData/*.ts (+.test) reine Transformationen, eine pro View
src/components/                FilterChips, CoverageNote, EmptyState, BookDetail,
                               Axis, Tooltip, DataSummary (+ CSS Modules)
src/views/<Acht Views>.tsx     (+ CSS Modules)
src/styles/tokens.css          Palette, Typografie, Abstände
src/styles/global.css          Reset, Body, Fokus, reduced-motion
```

---

### Task 1: Projekt-Scaffold und Datenpipeline-Verifikation

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`, `src/styles/global.css`
- Generate (nicht einchecken): `public/data/library.json`

**Interfaces:**
- Consumes: `scripts/normalize.mjs` (existiert), Roh-Export im Repo-Root
- Produces: lauffähiges Vite-Projekt mit `npm run dev|build|test`, Design-Tokens; `public/data/library.json` generiert und gegen `docs/datenprofil.md` verifiziert

- [ ] **Step 1: package.json schreiben**

```json
{
  "name": "tsundoku",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "normalize": "node scripts/normalize.mjs librarything_kaixo_202607210219.json"
  },
  "dependencies": {
    "@fontsource/fraunces": "^5.2.0",
    "@fontsource/ibm-plex-mono": "^5.2.0",
    "@fontsource/noto-sans-jp": "^5.2.0",
    "@fontsource/source-sans-3": "^5.2.0",
    "d3-array": "^3.2.4",
    "d3-force": "^3.0.0",
    "d3-hierarchy": "^3.1.2",
    "d3-sankey": "^0.12.3",
    "d3-scale": "^4.0.2",
    "d3-shape": "^3.2.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zustand": "^5.0.5"
  },
  "devDependencies": {
    "@types/d3-array": "^3.2.1",
    "@types/d3-force": "^3.0.10",
    "@types/d3-hierarchy": "^3.1.7",
    "@types/d3-sankey": "^0.12.4",
    "@types/d3-scale": "^4.0.8",
    "@types/d3-shape": "^3.1.6",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.5.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

(Versionen sind Untergrenzen; `npm install` zieht aktuelle Patchstände.)

- [ ] **Step 2: vite.config.ts schreiben**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
  },
})
```

- [ ] **Step 3: tsconfig.json schreiben**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: index.html schreiben**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tsundoku 積ん読</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Design-Tokens schreiben (`src/styles/tokens.css`)**

```css
:root {
  /* Palette: traditionelle japanische Farbnamen (siehe CLAUDE.md) */
  --sumi: #1c1b19;          /* Tusche — Text, Grund */
  --shironeri: #eee8dc;     /* ungebleichte Seide — Fläche */
  --paper: #f4efe6;         /* hellere Kartenfläche */
  --kon: #223a70;           /* Indigo — Primärakzent */
  --enji: #9e3d3b;          /* Karmin — Gegenakzent */
  --rikyu: #7a8b4a;         /* Grau-Grün — tertiär */
  --ink-70: rgba(28, 27, 25, 0.7);
  --ink-45: rgba(28, 27, 25, 0.45);
  --ink-15: rgba(28, 27, 25, 0.15);
  --ink-08: rgba(28, 27, 25, 0.08);

  --font-display: 'Fraunces', 'Noto Sans JP', serif;
  --font-body: 'Source Sans 3', 'Noto Sans JP', sans-serif;
  --font-mono: 'IBM Plex Mono', 'Noto Sans JP', monospace;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 40px;
  --radius: 2px;
  --focus-ring: 2px solid var(--kon);
}
```

- [ ] **Step 6: Globale Styles schreiben (`src/styles/global.css`)**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--shironeri);
  color: var(--sumi);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.5;
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 500;
  margin: 0;
}

button {
  font: inherit;
  cursor: pointer;
}

:focus-visible {
  outline: var(--focus-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
  }
}
```

- [ ] **Step 7: Einstieg schreiben**

`src/main.tsx`:

```tsx
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/noto-sans-jp/400.css'
import './styles/tokens.css'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (Platzhalter, wird in Task 6 ersetzt):

```tsx
export default function App() {
  return (
    <main style={{ padding: 'var(--space-6)' }}>
      <h1>Tsundoku 積ん読</h1>
      <p>Shell folgt in Task 6.</p>
    </main>
  )
}
```

- [ ] **Step 8: Installieren und Pipeline verifizieren**

```bash
npm install
npm run normalize
```

Die Konsolenausgabe MUSS diesen Kennzahlen aus `CLAUDE.md` entsprechen:

```
4865 Einträge
Medien: book 4527, ebook 179, film 87, vinyl 72 | gelesen: 1334
Seiten gesamt: 1.359.074 | Lesedauer Median/p90/max: 4/20/209 Tage
Tags: 3702 normalisiert (roh: 3762)
Lesejahr bekannt: 1334 (davon 935 per dateread, Rest aus Jahres-Tags), ab 1988
```

Weicht etwas ab: STOPP — nicht wegcasten, sondern die Abweichung an den Nutzer melden (der Export wäre dann ein anderer als der dokumentierte, `docs/datenprofil.md` müsste aktualisiert werden).

- [ ] **Step 9: Dev-Server und Checks**

```bash
npm run dev   # kurz öffnen: Titel „Tsundoku 積ん読" sichtbar, Fraunces geladen
npm run test  # grün (passWithNoTests)
npm run typecheck
```

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src
git commit -m "feat: scaffold Vite/React/TS mit Design-Tokens, Pipeline verifiziert"
```

---

### Task 2: Normalizer testbar machen

**Files:**
- Modify: `scripts/normalize.mjs`
- Test: `scripts/normalize.test.mjs`

**Interfaces:**
- Consumes: bestehende interne Helfer `toPages`, `toMm`, `toGrams`, `toPrice`, `toDate`, `daysBetween`, `normTag`, `mediaType` (Signaturen vor dem Umbau im Code nachlesen)
- Produces: benannte Exporte dieser Helfer plus `normalize(raw)` → `{ stats, books }`; CLI-Verhalten unverändert

- [ ] **Step 1: `scripts/normalize.mjs` vollständig lesen**

Vor jeder Änderung die Datei komplett lesen (269 Zeilen). Die Helfer-Signaturen und den Hauptablauf verstehen. Falls Signaturen von den Annahmen der Tests unten abweichen (z. B. `toPages` gibt `{ pages, volumes }` statt `number` zurück), die **Aufrufform** der Tests anpassen — die dokumentierten Regel-Erwartungen (Summen, Verwerfungsgrenzen) bleiben die Assertion-Ziele.

- [ ] **Step 2: Failing Tests schreiben (`scripts/normalize.test.mjs`)**

```js
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { toPages, toMm, toGrams, normTag, mediaType, normalize } from './normalize.mjs'

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
    // konkretes Mapping vor dem Schreiben in scripts/tag-aliases.json nachschlagen
    expect(normTag('Japanese literature')).toBe(normTag('japanische Literatur'))
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

const EXPORT_PATH = new URL('../librarything_kaixo_202607210219.json', import.meta.url)

describe.skipIf(!existsSync(EXPORT_PATH))('Goldene Kennzahlen am realen Export', () => {
  const raw = JSON.parse(readFileSync(EXPORT_PATH, 'utf8'))
  const { books } = normalize(raw)

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
})
```

Anmerkung zu den Einheiten-Tests: erwartete Rundung (`203` vs `203.2`) an die tatsächliche Implementierung anpassen — maßgeblich ist die dokumentierte Regel (Einheit aus dem String gelesen), nicht die Nachkommastelle. Ebenso `readYearSource`-Literale (`'dateread'`) gegen den Code prüfen.

- [ ] **Step 3: Tests laufen lassen — sie MÜSSEN fehlschlagen**

```bash
npx vitest run scripts/normalize.test.mjs
```

Expected: FAIL — die Importe existieren noch nicht als Exporte.

- [ ] **Step 4: Referenzkopie der Ausgabe sichern**

```bash
cp public/data/library.json /tmp/library-before-refactor.json
```

- [ ] **Step 5: Refactoring — Exporte + CLI-Guard**

In `scripts/normalize.mjs`:

1. Den Hauptablauf (Datei lesen → Records transformieren → Stats bauen → schreiben + Kennzahlen drucken) so aufteilen, dass eine reine Funktion `normalize(raw)` das Objekt `{ stats, books }` zurückgibt und `main()` nur noch I/O macht (lesen, `normalize` aufrufen, schreiben, drucken).
2. Am Dateiende:

```js
export { toPages, toMm, toGrams, toPrice, toDate, daysBetween, normTag, mediaType, normalize }

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isCli) main()
```

(`pathToFileURL` aus `node:url` ist bereits importiert — prüfen, sonst ergänzen.) Kein Verhalten ändern, nur umstellen.

- [ ] **Step 6: Tests laufen lassen — grün**

```bash
npx vitest run scripts/normalize.test.mjs
```

Expected: PASS (inkl. goldener Kennzahlen).

- [ ] **Step 7: Ausgabe byte-identisch?**

```bash
npm run normalize
cmp /tmp/library-before-refactor.json public/data/library.json && echo IDENTISCH
```

Expected: `IDENTISCH`. Wenn nicht: Refactoring hat Verhalten geändert — Ursache finden, beheben.

- [ ] **Step 8: Commit**

```bash
git add scripts/normalize.mjs scripts/normalize.test.mjs
git commit -m "test: Normalizer-Helfer exportieren und gegen Datenprofil-Regeln testen"
```

---

### Task 3: Typen und Datenladen

**Files:**
- Create: `src/lib/types.ts`, `src/lib/loadLibrary.ts`, `src/lib/format.ts`, `src/lib/fixtures.ts`
- Test: `src/lib/loadLibrary.test.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Consumes: Ausgabeformat von `normalize.mjs` (siehe `docs/datenprofil.md`, Abschnitt „Ausgabeformat")
- Produces: `Book`, `Stats`, `Library`, `MediaType`, `Filter`, `ViewId`, `VIEW_IDS`, `DEFAULT_VIEW`; `loadLibrary(): Promise<Library>`, `LibraryMissingError`; `fmtInt(n)`, `fmtYear(y)`; `mkBook(overrides): Book`

- [ ] **Step 1: `src/lib/types.ts` schreiben**

```ts
export type MediaType = 'book' | 'ebook' | 'film' | 'vinyl'

export interface Physical {
  heightMm: number | null
  thicknessMm: number | null
  lengthMm: number | null
  weightG: number | null
}

export interface Book {
  id: string
  title: string
  originalTitle: string | null
  authors: string[]
  primaryAuthor: string | null
  tags: string[]
  tagsNorm: string[]
  collections: string[]
  genres: string[]
  series: string[]
  awards: string[]
  ddc: { code: string; top: number; topLabel: string } | null
  languages: string[]
  originalLanguages: string[]
  editionYear: number | null
  formats: string[]
  mediaType: MediaType
  pages: number | null
  volumes: number | null
  physical: Physical
  rating: number | null
  acquiredDate: string | null
  acquiredYear: number | null
  entryDate: string | null
  bulkImport: boolean
  startedDate: string | null
  readDate: string | null
  readYear: number | null
  yearTags: number[]
  readYearEffective: number | null
  readYearSource: 'dateread' | 'yeartag' | null
  readDays: number | null
  hasRead: boolean
  fromWhere: string | null
  price: { amount: number; currency: string } | null
  comment: string | null
  isbn: string | null
}

/** Facetten: [Wert, Anzahl], absteigend nach Anzahl. */
export type Facet = [string | number, number][]

export interface Stats {
  languages: Facet
  originalLanguages: Facet
  collections: Facet
  genres: Facet
  ddcTop: Facet
  formats: Facet
  tagsNorm: Facet
  authors: Facet
  series: Facet
  awards: Facet
  fromWhere: Facet
  acquiredPerYear: Facet
  readPerYear: Facet
  readPerYearEffective: Facet
}

export interface Library {
  stats: Stats
  books: Book[]
}

export type Filter =
  | { kind: 'tag'; value: string }
  | { kind: 'language'; value: string }
  | { kind: 'originalLanguage'; value: string }
  | { kind: 'ddcTop'; value: number }
  | { kind: 'mediaType'; value: MediaType }
  | { kind: 'collection'; value: string }
  | { kind: 'author'; value: string }
  | { kind: 'award'; value: string }
  | { kind: 'acquiredYear'; from: number; to: number }
  | { kind: 'readYear'; from: number; to: number }
  | { kind: 'editionYear'; from: number; to: number }
  | { kind: 'readStatus'; value: 'read' | 'unread' }

export type RangeKind = 'acquiredYear' | 'readYear' | 'editionYear'

export const VIEW_IDS = [
  'timeline',
  'knowledge',
  'network',
  'languages',
  'years',
  'shelf',
  'pace',
  'canon',
] as const
export type ViewId = (typeof VIEW_IDS)[number]

/** Wird in Task 12 auf 'shelf' umgestellt, sobald das Regal existiert. */
export const DEFAULT_VIEW: ViewId = 'timeline'
```

Nach dem Schreiben: `head -c 3000 public/data/library.json` ansehen und die Feldnamen/-formen eines echten Buchs gegen `Book` abgleichen. Weicht das Generat ab (z. B. `stats`-Schlüsselnamen), gilt das Generat — Typen anpassen und die Abweichung in `docs/datenprofil.md` notieren.

- [ ] **Step 2: Failing Tests für Laden + Formatierung**

`src/lib/loadLibrary.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadLibrary, LibraryMissingError } from './loadLibrary'

const lib = { stats: {}, books: [] }

afterEach(() => vi.unstubAllGlobals())

describe('loadLibrary', () => {
  it('liefert die geparste Bibliothek', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(lib), { status: 200 }),
    ))
    await expect(loadLibrary()).resolves.toEqual(lib)
  })

  it('wirft LibraryMissingError bei 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(loadLibrary()).rejects.toBeInstanceOf(LibraryMissingError)
  })

  it('wirft bei anderen HTTP-Fehlern mit Statuscode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    await expect(loadLibrary()).rejects.toThrow('500')
  })
})
```

`src/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fmtInt } from './format'

describe('fmtInt', () => {
  it('formatiert de-DE mit Punkt', () => {
    expect(fmtInt(1359074)).toBe('1.359.074')
  })
})
```

- [ ] **Step 3: Tests laufen lassen — FAIL (Module fehlen)**

```bash
npx vitest run src/lib
```

- [ ] **Step 4: Implementieren**

`src/lib/loadLibrary.ts`:

```ts
import type { Library } from './types'

export class LibraryMissingError extends Error {
  constructor() {
    super('public/data/library.json fehlt')
    this.name = 'LibraryMissingError'
  }
}

export async function loadLibrary(): Promise<Library> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/library.json`)
  if (res.status === 404) throw new LibraryMissingError()
  if (!res.ok) throw new Error(`Laden fehlgeschlagen: HTTP ${res.status}`)
  return (await res.json()) as Library
}
```

`src/lib/format.ts`:

```ts
const intFmt = new Intl.NumberFormat('de-DE')

export function fmtInt(n: number): string {
  return intFmt.format(n)
}

/** Jahre ohne Tausenderpunkt: 1998, nicht 1.998. */
export function fmtYear(y: number): string {
  return String(y)
}
```

`src/lib/fixtures.ts` (nur für Tests, bewusst in `src/lib`, damit Views-Tests kurz importieren):

```ts
import type { Book } from './types'

let seq = 0

export function mkBook(over: Partial<Book> = {}): Book {
  seq += 1
  return {
    id: String(seq),
    title: `Buch ${seq}`,
    originalTitle: null,
    authors: [],
    primaryAuthor: null,
    tags: [],
    tagsNorm: [],
    collections: [],
    genres: [],
    series: [],
    awards: [],
    ddc: null,
    languages: [],
    originalLanguages: [],
    editionYear: null,
    formats: [],
    mediaType: 'book',
    pages: null,
    volumes: null,
    physical: { heightMm: null, thicknessMm: null, lengthMm: null, weightG: null },
    rating: null,
    acquiredDate: null,
    acquiredYear: null,
    entryDate: null,
    bulkImport: false,
    startedDate: null,
    readDate: null,
    readYear: null,
    yearTags: [],
    readYearEffective: null,
    readYearSource: null,
    readDays: null,
    hasRead: false,
    fromWhere: null,
    price: null,
    comment: null,
    isbn: null,
    ...over,
  }
}
```

- [ ] **Step 5: Tests laufen lassen — PASS, dann Commit**

```bash
npx vitest run src/lib && npm run typecheck
git add src/lib
git commit -m "feat: Datenmodell-Typen, loadLibrary und de-DE-Formatierung"
```

---

### Task 4: Filterlogik und Store

**Files:**
- Create: `src/store/filters.ts`, `src/lib/ddc.ts`, `src/lib/awards.ts`
- Test: `src/store/filters.test.ts`

**Interfaces:**
- Consumes: `Book`, `Filter`, `RangeKind`, `ViewId`, `DEFAULT_VIEW` aus `src/lib/types.ts`; `mkBook` aus `src/lib/fixtures.ts`
- Produces: `filterBooks(books: Book[], filters: Filter[]): Book[]`, `sameFilter(a: Filter, b: Filter): boolean`, `filterLabel(f: Filter): string`, Zustand-Store `useFilterStore` mit `{ filters, view, addFilter, removeFilter, toggleFilter, setRange, clearFilters, setView }`; `DDC_LABELS: Record<number, string>`, `DDC_COLORS: Record<number, string>`; `canonicalAward(raw: string): string` (Synonymtabelle noch leer, Task 14 füllt sie)

- [ ] **Step 1: Failing Tests schreiben (`src/store/filters.test.ts`)**

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../lib/fixtures'
import { filterBooks, filterLabel, sameFilter, useFilterStore } from './filters'

const japan = mkBook({ tagsNorm: ['Japan'], languages: ['ja'], hasRead: true, readYearEffective: 2014 })
const philo = mkBook({ tagsNorm: ['Philosophie'], languages: ['de'], ddc: { code: '193', top: 1, topLabel: 'Philosophie & Psychologie' }, acquiredYear: 2010 })
const roman = mkBook({ tagsNorm: ['Japan', 'Roman'], languages: ['de'], originalLanguages: ['ja'], acquiredYear: 2015, editionYear: 2012 })
const all = [japan, philo, roman]

describe('filterBooks', () => {
  it('leere Filtermenge liefert dieselbe Referenz', () => {
    expect(filterBooks(all, [])).toBe(all)
  })
  it('ODER innerhalb einer Dimension', () => {
    expect(filterBooks(all, [
      { kind: 'tag', value: 'Philosophie' },
      { kind: 'tag', value: 'Roman' },
    ])).toEqual([philo, roman])
  })
  it('UND über Dimensionen', () => {
    expect(filterBooks(all, [
      { kind: 'tag', value: 'Japan' },
      { kind: 'language', value: 'de' },
    ])).toEqual([roman])
  })
  it('Bereichsfilter schließt null aus und prüft Grenzen inklusiv', () => {
    expect(filterBooks(all, [{ kind: 'acquiredYear', from: 2010, to: 2015 }])).toEqual([philo, roman])
    expect(filterBooks(all, [{ kind: 'acquiredYear', from: 2011, to: 2014 }])).toEqual([])
  })
  it('readYear nutzt readYearEffective', () => {
    expect(filterBooks(all, [{ kind: 'readYear', from: 2014, to: 2014 }])).toEqual([japan])
  })
  it('readStatus unread heißt hasRead === false', () => {
    expect(filterBooks(all, [{ kind: 'readStatus', value: 'unread' }])).toEqual([philo, roman])
  })
  it('ddcTop, originalLanguage, editionYear', () => {
    expect(filterBooks(all, [{ kind: 'ddcTop', value: 1 }])).toEqual([philo])
    expect(filterBooks(all, [{ kind: 'originalLanguage', value: 'ja' }])).toEqual([roman])
    expect(filterBooks(all, [{ kind: 'editionYear', from: 2012, to: 2012 }])).toEqual([roman])
  })
})

describe('sameFilter', () => {
  it('vergleicht kind+value bzw. kind+Bereich', () => {
    expect(sameFilter({ kind: 'tag', value: 'Japan' }, { kind: 'tag', value: 'Japan' })).toBe(true)
    expect(sameFilter({ kind: 'tag', value: 'Japan' }, { kind: 'collection', value: 'Japan' })).toBe(false)
    expect(sameFilter({ kind: 'readYear', from: 1, to: 2 }, { kind: 'readYear', from: 1, to: 3 })).toBe(false)
  })
})

describe('filterLabel', () => {
  it('deutsche Chip-Beschriftungen', () => {
    expect(filterLabel({ kind: 'tag', value: 'Japan' })).toBe('Tag: Japan')
    expect(filterLabel({ kind: 'ddcTop', value: 8 })).toBe('Wissensgebiet: Literatur')
    expect(filterLabel({ kind: 'acquiredYear', from: 2010, to: 2015 })).toBe('Erworben: 2010–2015')
    expect(filterLabel({ kind: 'readStatus', value: 'unread' })).toBe('Status: ungelesen')
  })
})

describe('useFilterStore', () => {
  it('addFilter dedupliziert, toggleFilter entfernt wieder', () => {
    const s = useFilterStore.getState()
    s.clearFilters()
    s.addFilter({ kind: 'tag', value: 'Japan' })
    s.addFilter({ kind: 'tag', value: 'Japan' })
    expect(useFilterStore.getState().filters).toHaveLength(1)
    s.toggleFilter({ kind: 'tag', value: 'Japan' })
    expect(useFilterStore.getState().filters).toHaveLength(0)
  })
  it('setRange ersetzt bestehenden Bereich derselben Dimension', () => {
    const s = useFilterStore.getState()
    s.clearFilters()
    s.setRange('acquiredYear', 2000, 2010)
    s.setRange('acquiredYear', 2005, 2012)
    expect(useFilterStore.getState().filters).toEqual([{ kind: 'acquiredYear', from: 2005, to: 2012 }])
  })
})
```

- [ ] **Step 2: Tests laufen lassen — FAIL**

```bash
npx vitest run src/store
```

- [ ] **Step 3: Implementieren**

`src/lib/ddc.ts`:

```ts
/** Dewey-Hauptklassen, deutsche Kurzlabels für Chips, Legenden, Achsen. */
export const DDC_LABELS: Record<number, string> = {
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
}

/**
 * Startwerte, an der Palette orientiert (kon/enji/rikyū eingereiht).
 * Feinabstimmung bei View 2/6 am echten Bild.
 */
export const DDC_COLORS: Record<number, string> = {
  0: '#2e5c6e', // sabi-asagi
  1: '#223a70', // kon
  2: '#6f5980', // shion
  3: '#9e3d3b', // enji
  4: '#b07736', // kuchiba
  5: '#7a8b4a', // rikyū
  6: '#8d6449', // tobi
  7: '#c8552f', // shu
  8: '#4a6e5a', // rokushō
  9: '#746a5e', // rikyū-nezumi
}
```

Für `filterLabel` das Kurzwort hinter dem `&` weglassen, wenn der Platz knapp wird? Nein — Chips sind einzeilig scrollbar, volle Labels verwenden; nur `ddcTop: 8` → `Literatur` (das Label vor dem `&`… ). Konkret: `filterLabel` nutzt eine zweite, kurze Tabelle:

```ts
export const DDC_SHORT: Record<number, string> = {
  0: 'Informatik', 1: 'Philosophie', 2: 'Religion', 3: 'Sozialwissenschaften',
  4: 'Sprache', 5: 'Naturwissenschaften', 6: 'Technik', 7: 'Künste',
  8: 'Literatur', 9: 'Geschichte',
}
```

`src/lib/awards.ts`:

```ts
/**
 * Kanon-Synonyme: Übersetzungen derselben Liste werden zusammengeführt
 * (docs/visualisierungen.md, View 8). Task 14 füllt die Tabelle aus den
 * echten stats.awards-Werten; bis dahin ist canonicalAward die Identität.
 */
export const AWARD_SYNONYMS: Record<string, string> = {}

export function canonicalAward(raw: string): string {
  return AWARD_SYNONYMS[raw] ?? raw
}
```

`src/store/filters.ts`:

```ts
import { create } from 'zustand'
import { canonicalAward } from '../lib/awards'
import { DDC_SHORT } from '../lib/ddc'
import { DEFAULT_VIEW, type Book, type Filter, type RangeKind, type ViewId } from '../lib/types'

const MEDIA_LABELS: Record<string, string> = {
  book: 'Buch', ebook: 'E-Book', film: 'Film', vinyl: 'Schallplatte',
}

function matches(b: Book, f: Filter): boolean {
  switch (f.kind) {
    case 'tag': return b.tagsNorm.includes(f.value)
    case 'language': return b.languages.includes(f.value)
    case 'originalLanguage': return b.originalLanguages.includes(f.value)
    case 'ddcTop': return b.ddc !== null && b.ddc.top === f.value
    case 'mediaType': return b.mediaType === f.value
    case 'collection': return b.collections.includes(f.value)
    case 'author': return b.authors.includes(f.value) || b.primaryAuthor === f.value
    case 'award': return b.awards.some((a) => canonicalAward(a) === f.value)
    case 'acquiredYear': return b.acquiredYear !== null && b.acquiredYear >= f.from && b.acquiredYear <= f.to
    case 'readYear': return b.readYearEffective !== null && b.readYearEffective >= f.from && b.readYearEffective <= f.to
    case 'editionYear': return b.editionYear !== null && b.editionYear >= f.from && b.editionYear <= f.to
    case 'readStatus': return f.value === 'read' ? b.hasRead : !b.hasRead
  }
}

/** UND über Dimensionen (kind), ODER innerhalb einer Dimension. */
export function filterBooks(books: Book[], filters: Filter[]): Book[] {
  if (filters.length === 0) return books
  const groups = new Map<Filter['kind'], Filter[]>()
  for (const f of filters) {
    const g = groups.get(f.kind)
    if (g) g.push(f)
    else groups.set(f.kind, [f])
  }
  const groupList = [...groups.values()]
  return books.filter((b) => groupList.every((g) => g.some((f) => matches(b, f))))
}

export function sameFilter(a: Filter, b: Filter): boolean {
  if (a.kind !== b.kind) return false
  if ('from' in a && 'from' in b) return a.from === b.from && a.to === b.to
  if ('value' in a && 'value' in b) return a.value === b.value
  return false
}

export function filterLabel(f: Filter): string {
  switch (f.kind) {
    case 'tag': return `Tag: ${f.value}`
    case 'language': return `Sprache: ${f.value}`
    case 'originalLanguage': return `Original: ${f.value}`
    case 'ddcTop': return `Wissensgebiet: ${DDC_SHORT[f.value] ?? f.value}`
    case 'mediaType': return `Medium: ${MEDIA_LABELS[f.value]}`
    case 'collection': return `Sammlung: ${f.value}`
    case 'author': return `Autor·in: ${f.value}`
    case 'award': return `Liste: ${f.value}`
    case 'acquiredYear': return `Erworben: ${f.from}–${f.to}`
    case 'readYear': return `Gelesen: ${f.from}–${f.to}`
    case 'editionYear': return `Ausgabe: ${f.from}–${f.to}`
    case 'readStatus': return `Status: ${f.value === 'read' ? 'gelesen' : 'ungelesen'}`
  }
}

interface FilterState {
  filters: Filter[]
  view: ViewId
  addFilter: (f: Filter) => void
  removeFilter: (f: Filter) => void
  toggleFilter: (f: Filter) => void
  setRange: (kind: RangeKind, from: number, to: number) => void
  clearFilters: () => void
  setView: (v: ViewId) => void
}

export const useFilterStore = create<FilterState>()((set) => ({
  filters: [],
  view: DEFAULT_VIEW,
  addFilter: (f) =>
    set((s) => (s.filters.some((g) => sameFilter(g, f)) ? s : { filters: [...s.filters, f] })),
  removeFilter: (f) => set((s) => ({ filters: s.filters.filter((g) => !sameFilter(g, f)) })),
  toggleFilter: (f) =>
    set((s) =>
      s.filters.some((g) => sameFilter(g, f))
        ? { filters: s.filters.filter((g) => !sameFilter(g, f)) }
        : { filters: [...s.filters, f] },
    ),
  setRange: (kind, from, to) =>
    set((s) => ({ filters: [...s.filters.filter((g) => g.kind !== kind), { kind, from, to } as Filter] })),
  clearFilters: () => set({ filters: [] }),
  setView: (v) => set({ view: v }),
}))
```

Hinweis: `Sprache: ${f.value}` zeigt vorerst den ISO-Code; Task 10 legt `src/lib/languages.ts` mit deutschen Namen an — dann hier `langLabel(f.value)` einsetzen (Task 10 erledigt das).

- [ ] **Step 4: Tests laufen lassen — PASS, Commit**

```bash
npx vitest run src/store && npm run typecheck
git add src/store src/lib/ddc.ts src/lib/awards.ts
git commit -m "feat: Filterlogik (UND/ODER) und Zustand-Store mit 12 Dimensionen"
```

---

### Task 5: URL-Synchronisation

**Files:**
- Create: `src/store/urlSync.ts`
- Test: `src/store/urlSync.test.ts`

**Interfaces:**
- Consumes: `useFilterStore`, `sameFilter` aus Task 4; `Filter`, `ViewId`, `VIEW_IDS`, `DEFAULT_VIEW` aus `types.ts`
- Produces: `stateToQuery(view: ViewId, filters: Filter[]): string` (leer oder `?…`), `queryToState(search: string): { view: ViewId; filters: Filter[] }`, `startUrlSync(): () => void`

**Designabweichung (dokumentiert):** Die Spec nennt kommagetrennte ODER-Werte; implementiert werden **wiederholte Parameter** (`?tag=Japan&tag=Philosophie`), weil Tag-Werte Kommas enthalten können und `URLSearchParams.getAll` das verlustfrei löst. Bereiche bleiben `acq=2010-2015`.

- [ ] **Step 1: Failing Tests schreiben (`src/store/urlSync.test.ts`)**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_VIEW, type Filter } from '../lib/types'
import { useFilterStore } from './filters'
import { queryToState, startUrlSync, stateToQuery } from './urlSync'

const full: Filter[] = [
  { kind: 'tag', value: 'Japan' },
  { kind: 'tag', value: 'Philosophie, deutsche' },
  { kind: 'language', value: 'ja' },
  { kind: 'originalLanguage', value: 'ja' },
  { kind: 'ddcTop', value: 8 },
  { kind: 'mediaType', value: 'vinyl' },
  { kind: 'collection', value: 'Your library' },
  { kind: 'author', value: '村上春樹' },
  { kind: 'award', value: '1001 Books You Must Read Before You Die' },
  { kind: 'acquiredYear', from: 2010, to: 2015 },
  { kind: 'readYear', from: 1988, to: 2020 },
  { kind: 'editionYear', from: 1998, to: 1998 },
  { kind: 'readStatus', value: 'unread' },
]

describe('Roundtrip', () => {
  it('Filter → Query → Filter verlustfrei (Reihenfolge egal)', () => {
    const q = stateToQuery('network', full)
    const back = queryToState(q)
    expect(back.view).toBe('network')
    expect(back.filters).toHaveLength(full.length)
    for (const f of full) expect(back.filters).toContainEqual(f)
  })
  it('Default-View und leere Filter ergeben leeren Query', () => {
    expect(stateToQuery(DEFAULT_VIEW, [])).toBe('')
  })
})

describe('Defekte Query-Strings degradieren stumm', () => {
  it('unbekannte Parameter und kaputte Werte werden ignoriert', () => {
    const st = queryToState('?view=nope&bogus=1&ddc=zwölf&acq=abc&read=2020-1988&status=maybe&tag=Japan')
    expect(st.view).toBe(DEFAULT_VIEW)
    expect(st.filters).toEqual([{ kind: 'tag', value: 'Japan' }])
  })
})

describe('History-Verdrahtung', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/')
    useFilterStore.setState({ filters: [], view: DEFAULT_VIEW })
  })

  it('Store-Änderung schreibt pushState, popstate liest zurück', () => {
    const stop = startUrlSync()
    useFilterStore.getState().addFilter({ kind: 'tag', value: 'Japan' })
    expect(location.search).toBe('?tag=Japan')

    history.replaceState(null, '', '/?tag=Berlin')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(useFilterStore.getState().filters).toEqual([{ kind: 'tag', value: 'Berlin' }])
    stop()
  })

  it('startUrlSync initialisiert den Store aus der URL', () => {
    history.replaceState(null, '', '/?view=knowledge&status=read')
    const stop = startUrlSync()
    expect(useFilterStore.getState().view).toBe('knowledge')
    expect(useFilterStore.getState().filters).toEqual([{ kind: 'readStatus', value: 'read' }])
    stop()
  })
})
```

- [ ] **Step 2: Tests laufen lassen — FAIL**

```bash
npx vitest run src/store/urlSync.test.ts
```

- [ ] **Step 3: Implementieren (`src/store/urlSync.ts`)**

```ts
import { DEFAULT_VIEW, VIEW_IDS, type Filter, type MediaType, type ViewId } from '../lib/types'
import { useFilterStore } from './filters'

const PARAMS: [param: string, kind: Filter['kind']][] = [
  ['tag', 'tag'],
  ['lang', 'language'],
  ['olang', 'originalLanguage'],
  ['ddc', 'ddcTop'],
  ['media', 'mediaType'],
  ['coll', 'collection'],
  ['author', 'author'],
  ['award', 'award'],
  ['acq', 'acquiredYear'],
  ['read', 'readYear'],
  ['ed', 'editionYear'],
  ['status', 'readStatus'],
]

const RANGE = new Set<Filter['kind']>(['acquiredYear', 'readYear', 'editionYear'])
const MEDIA: MediaType[] = ['book', 'ebook', 'film', 'vinyl']

export function stateToQuery(view: ViewId, filters: Filter[]): string {
  const q = new URLSearchParams()
  if (view !== DEFAULT_VIEW) q.append('view', view)
  for (const [param, kind] of PARAMS) {
    for (const f of filters) {
      if (f.kind !== kind) continue
      q.append(param, 'from' in f ? `${f.from}-${f.to}` : String(f.value))
    }
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

function parseOne(kind: Filter['kind'], raw: string): Filter | null {
  if (RANGE.has(kind)) {
    const m = /^(\d{4})-(\d{4})$/.exec(raw)
    if (!m) return null
    const from = Number(m[1])
    const to = Number(m[2])
    if (from > to) return null
    return { kind, from, to } as Filter
  }
  switch (kind) {
    case 'ddcTop': {
      const n = Number(raw)
      return Number.isInteger(n) && n >= 0 && n <= 9 ? { kind, value: n } : null
    }
    case 'mediaType':
      return (MEDIA as string[]).includes(raw) ? { kind, value: raw as MediaType } : null
    case 'readStatus':
      return raw === 'read' || raw === 'unread' ? { kind, value: raw } : null
    default:
      return raw ? ({ kind, value: raw } as Filter) : null
  }
}

export function queryToState(search: string): { view: ViewId; filters: Filter[] } {
  const q = new URLSearchParams(search)
  const rawView = q.get('view') ?? ''
  const view: ViewId = (VIEW_IDS as readonly string[]).includes(rawView)
    ? (rawView as ViewId)
    : DEFAULT_VIEW
  const filters: Filter[] = []
  for (const [param, kind] of PARAMS) {
    for (const raw of q.getAll(param)) {
      const f = parseOne(kind, raw)
      if (f) filters.push(f)
    }
  }
  return { view, filters }
}

let applyingFromUrl = false

export function startUrlSync(): () => void {
  const initial = queryToState(location.search)
  applyingFromUrl = true
  useFilterStore.setState({ view: initial.view, filters: initial.filters })
  applyingFromUrl = false

  const unsub = useFilterStore.subscribe((s, prev) => {
    if (applyingFromUrl) return
    if (s.view === prev.view && s.filters === prev.filters) return
    const target = `${location.pathname}${stateToQuery(s.view, s.filters)}`
    if (target !== `${location.pathname}${location.search}`) {
      history.pushState(null, '', target)
    }
  })

  const onPop = () => {
    const st = queryToState(location.search)
    applyingFromUrl = true
    useFilterStore.setState({ view: st.view, filters: st.filters })
    applyingFromUrl = false
  }
  window.addEventListener('popstate', onPop)
  return () => {
    unsub()
    window.removeEventListener('popstate', onPop)
  }
}
```

Hinweis: `URLSearchParams` encodiert Leerzeichen als `+` und CJK als Prozent-Escapes — der Roundtrip-Test deckt beides ab. Der Vergleich `s.filters === prev.filters` ist Referenzvergleich; Zustand erzeugt bei jeder Filteraktion ein neues Array, das reicht.

- [ ] **Step 4: Tests laufen lassen — PASS, Commit**

```bash
npx vitest run src/store && npm run typecheck
git add src/store/urlSync.ts src/store/urlSync.test.ts
git commit -m "feat: URL-Sync ohne Router (pushState/popstate, wiederholte Parameter)"
```

---

### Task 6: App-Shell mit Chips, Navigation und geteilten Bausteinen

**Files:**
- Create: `src/lib/DataContext.tsx`, `src/lib/useMeasure.ts`, `src/components/FilterChips.tsx` (+ `.module.css`), `src/components/CoverageNote.tsx` (+ `.module.css`), `src/components/EmptyState.tsx` (+ `.module.css`), `src/components/BookDetail.tsx` (+ `.module.css`), `src/components/DataSummary.tsx` (+ `.module.css`), `src/components/Tooltip.tsx` (+ `.module.css`), `src/App.module.css`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `loadLibrary`, `LibraryMissingError`, `filterBooks`, `useFilterStore`, `filterLabel`, `startUrlSync`, `fmtInt`
- Produces: `useLibraryData(): { books: Book[]; stats: Stats; filtered: Book[] }` (Context-Hook), `VIEW_REGISTRY: Partial<Record<ViewId, { label: string; component: ComponentType }>>` in `App.tsx` (Views 1–8 tragen sich hier ein), `<CoverageNote covered={n} total={m}>text</CoverageNote>`, `<EmptyState />`, `<BookDetail book={Book | null} onClose={() => void} />`, `<Tooltip x={n} y={n}>…</Tooltip>`, `useMeasure<T extends Element>(): [RefObject<T | null>, width: number]`

- [ ] **Step 1: DataContext und useMeasure schreiben**

`src/lib/DataContext.tsx`:

```tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { filterBooks, useFilterStore } from '../store/filters'
import type { Book, Library, Stats } from './types'

export interface LibraryData {
  books: Book[]
  stats: Stats
  filtered: Book[]
}

const Ctx = createContext<LibraryData | null>(null)

export function DataProvider({ library, children }: { library: Library; children: ReactNode }) {
  const filters = useFilterStore((s) => s.filters)
  const filtered = useMemo(() => filterBooks(library.books, filters), [library.books, filters])
  const value = useMemo(
    () => ({ books: library.books, stats: library.stats, filtered }),
    [library, filtered],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLibraryData(): LibraryData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLibraryData außerhalb von DataProvider')
  return v
}
```

`src/lib/useMeasure.ts`:

```ts
import { useEffect, useRef, useState } from 'react'

/** Beobachtet die Breite eines Elements (für responsive SVG-Viewports). */
export function useMeasure<T extends Element>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0].contentRect.width))
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}
```

- [ ] **Step 2: Geteilte Komponenten schreiben**

`src/components/FilterChips.tsx`:

```tsx
import { filterLabel, useFilterStore } from '../store/filters'
import styles from './FilterChips.module.css'

export function FilterChips() {
  const filters = useFilterStore((s) => s.filters)
  const removeFilter = useFilterStore((s) => s.removeFilter)
  const clearFilters = useFilterStore((s) => s.clearFilters)
  if (filters.length === 0) return null
  return (
    <div className={styles.bar} role="region" aria-label="Aktive Filter">
      {filters.map((f) => {
        const label = filterLabel(f)
        return (
          <button
            key={label}
            className={styles.chip}
            onClick={() => removeFilter(f)}
            aria-label={`Filter entfernen: ${label}`}
          >
            {label} <span aria-hidden="true">×</span>
          </button>
        )
      })}
      {filters.length > 1 && (
        <button className={styles.clear} onClick={clearFilters}>
          Alle Filter lösen
        </button>
      )}
    </div>
  )
}
```

`src/components/FilterChips.module.css`:

```css
.bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-5);
  border-bottom: 1px solid var(--ink-15);
  background: var(--paper);
}

.chip {
  border: 1px solid var(--kon);
  background: transparent;
  color: var(--kon);
  border-radius: var(--radius);
  padding: 2px var(--space-2);
  font-size: 14px;
}

.chip:hover {
  background: var(--kon);
  color: var(--shironeri);
}

.clear {
  border: none;
  background: transparent;
  color: var(--enji);
  text-decoration: underline;
  font-size: 14px;
}
```

`src/components/CoverageNote.tsx`:

```tsx
import type { ReactNode } from 'react'
import { fmtInt } from '../lib/format'
import styles from './CoverageNote.module.css'

/** „935 von 4.865 Titeln haben …" — jede View weist ihre Datengrundlage aus. */
export function CoverageNote({ covered, total, unit = 'Titeln', children }: {
  covered: number
  total: number
  unit?: string
  children: ReactNode
}) {
  return (
    <p className={styles.note}>
      <span className={styles.numbers}>{fmtInt(covered)} von {fmtInt(total)}</span> {unit} {children}
    </p>
  )
}
```

`src/components/CoverageNote.module.css`:

```css
.note {
  margin: 0;
  font-size: 14px;
  color: var(--ink-70);
}

.numbers {
  font-family: var(--font-mono);
}
```

`src/components/EmptyState.tsx`:

```tsx
import { filterLabel, useFilterStore } from '../store/filters'
import styles from './EmptyState.module.css'

/** Leere Treffermenge: nennt die greifenden Filter und bietet an, sie zu lösen. */
export function EmptyState() {
  const filters = useFilterStore((s) => s.filters)
  const removeFilter = useFilterStore((s) => s.removeFilter)
  const clearFilters = useFilterStore((s) => s.clearFilters)
  return (
    <div className={styles.box}>
      <h3>Keine Titel im aktuellen Filter</h3>
      <p>Diese Filter greifen gerade:</p>
      <ul>
        {filters.map((f) => {
          const label = filterLabel(f)
          return (
            <li key={label}>
              {label}{' '}
              <button className={styles.release} onClick={() => removeFilter(f)}>
                lösen
              </button>
            </li>
          )
        })}
      </ul>
      <button onClick={clearFilters}>Alle Filter lösen</button>
    </div>
  )
}
```

`src/components/EmptyState.module.css`:

```css
.box {
  padding: var(--space-6);
  max-width: 32rem;
}

.release {
  border: none;
  background: none;
  color: var(--enji);
  text-decoration: underline;
  padding: 0;
}
```

`src/components/Tooltip.tsx` (positionierter Container; Inhalt liefern die Views):

```tsx
import type { ReactNode } from 'react'
import styles from './Tooltip.module.css'

export function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div className={styles.tip} style={{ transform: `translate(${x + 12}px, ${y + 12}px)` }}>
      {children}
    </div>
  )
}
```

`src/components/Tooltip.module.css`:

```css
.tip {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  background: var(--sumi);
  color: var(--shironeri);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  font-size: 13px;
  max-width: 22rem;
  z-index: 10;
}
```

(Views, die den Tooltip nutzen, geben ihrem Wrapper `position: relative` und reichen Pointer-Koordinaten relativ dazu.)

`src/components/BookDetail.tsx` — natives `<dialog>` (Fokusfalle und ESC gratis):

```tsx
import { useEffect, useRef } from 'react'
import { fmtInt } from '../lib/format'
import type { Book } from '../lib/types'
import { useFilterStore } from '../store/filters'
import styles from './BookDetail.module.css'

export function BookDetail({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const addFilter = useFilterStore((s) => s.addFilter)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (book && !el.open) el.showModal()
    if (!book && el.open) el.close()
  }, [book])

  if (!book) return <dialog ref={ref} />

  const rows: [string, string | null][] = [
    ['Original', book.originalTitle],
    ['Jahr dieser Ausgabe', book.editionYear === null ? null : String(book.editionYear)],
    ['Sprache', book.languages.join(', ') || null],
    ['Originalsprache', book.originalLanguages.join(', ') || null],
    ['Seiten', book.pages === null ? null : fmtInt(book.pages)],
    ['Wissensgebiet', book.ddc?.topLabel ?? null],
    ['Erworben', book.acquiredDate ?? (book.acquiredYear !== null ? String(book.acquiredYear) : null)],
    ['Gelesen', book.readDate ?? (book.readYearEffective !== null ? `${book.readYearEffective} (Jahres-Tag)` : null)],
    ['Bewertung', book.rating !== null ? `★ ${book.rating.toLocaleString('de-DE')}` : null],
    ['Gekauft bei', book.fromWhere],
    ['Reihe', book.series.join(', ') || null],
    ['Tags', book.tagsNorm.join(', ') || null],
    ['ISBN', book.isbn],
  ]

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-label={book.title}>
      <h3 className={styles.title}>{book.title}</h3>
      <p className={styles.authors}>
        {book.authors.map((a) => (
          <button
            key={a}
            className={styles.author}
            onClick={() => {
              addFilter({ kind: 'author', value: a })
              onClose()
            }}
            aria-label={`Nach ${a} filtern`}
          >
            {a}
          </button>
        ))}
      </p>
      <dl className={styles.rows}>
        {rows
          .filter(([, v]) => v !== null)
          .map(([k, v]) => (
            <div key={k} className={styles.row}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      <button className={styles.close} onClick={onClose}>
        Schließen
      </button>
    </dialog>
  )
}
```

`src/components/BookDetail.module.css`:

```css
.dialog {
  border: 1px solid var(--ink-15);
  border-radius: var(--radius);
  background: var(--paper);
  color: var(--sumi);
  max-width: 36rem;
  padding: var(--space-5);
}

.dialog::backdrop {
  background: rgba(28, 27, 25, 0.5);
}

.title {
  font-size: 24px;
  line-height: 1.3;
}

.authors {
  margin: var(--space-2) 0 var(--space-4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.author {
  border: none;
  background: none;
  padding: 0;
  color: var(--kon);
  text-decoration: underline;
}

.rows {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-4);
  font-size: 14px;
}

.row {
  display: contents;
}

.row dt {
  color: var(--ink-70);
}

.row dd {
  margin: 0;
}

.close {
  margin-top: var(--space-4);
}
```

`src/components/DataSummary.tsx` (Startinhalt, solange die Default-View noch nicht gebaut ist; bleibt danach als Fallback für unbekannte View-IDs):

```tsx
import { fmtInt } from '../lib/format'
import { useLibraryData } from '../lib/DataContext'
import styles from './DataSummary.module.css'

export function DataSummary() {
  const { books, filtered } = useLibraryData()
  const read = filtered.filter((b) => b.hasRead).length
  const pages = filtered.reduce((s, b) => s + (b.pages ?? 0), 0)
  const cells: [string, string][] = [
    ['Titel', fmtInt(filtered.length)],
    ['davon gelesen', fmtInt(read)],
    ['Seiten', fmtInt(pages)],
  ]
  return (
    <div className={styles.grid}>
      {cells.map(([label, value]) => (
        <div key={label} className={styles.cell}>
          <div className={styles.value}>{value}</div>
          <div className={styles.label}>{label}</div>
        </div>
      ))}
      {filtered.length < books.length && (
        <p className={styles.hint}>gefiltert aus {fmtInt(books.length)} Titeln</p>
      )}
    </div>
  )
}
```

`src/components/DataSummary.module.css`:

```css
.grid {
  display: flex;
  gap: var(--space-6);
  padding: var(--space-6);
  flex-wrap: wrap;
}

.value {
  font-family: var(--font-mono);
  font-size: 40px;
}

.label {
  color: var(--ink-70);
}

.hint {
  flex-basis: 100%;
  color: var(--ink-70);
}
```

- [ ] **Step 3: App.tsx ersetzen**

```tsx
import { useEffect, useState, type ComponentType } from 'react'
import styles from './App.module.css'
import { DataSummary } from './components/DataSummary'
import { FilterChips } from './components/FilterChips'
import { DataProvider } from './lib/DataContext'
import { loadLibrary, LibraryMissingError } from './lib/loadLibrary'
import type { Library, ViewId } from './lib/types'
import { useFilterStore } from './store/filters'

/** Views tragen sich hier ein, sobald sie gebaut sind (Tasks 7–14). */
export const VIEW_REGISTRY: Partial<Record<ViewId, { label: string; component: ComponentType }>> = {}

/** Navigationsreihenfolge; Task 12 stellt 'shelf' nach vorn. */
export const VIEW_ORDER: ViewId[] = [
  'timeline', 'knowledge', 'network', 'languages', 'years', 'shelf', 'pace', 'canon',
]

type LoadState =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error'; message: string }
  | { state: 'ready'; library: Library }

export default function App() {
  const [load, setLoad] = useState<LoadState>({ state: 'loading' })

  useEffect(() => {
    loadLibrary()
      .then((library) => setLoad({ state: 'ready', library }))
      .catch((e: unknown) =>
        setLoad(
          e instanceof LibraryMissingError
            ? { state: 'missing' }
            : { state: 'error', message: e instanceof Error ? e.message : String(e) },
        ),
      )
  }, [])

  if (load.state === 'loading') return <p className={styles.center}>Bibliothek wird geladen …</p>
  if (load.state === 'missing') {
    return (
      <div className={styles.center}>
        <h1>Tsundoku 積ん読</h1>
        <p>
          <code>public/data/library.json</code> fehlt. Einmal generieren:
        </p>
        <pre>node scripts/normalize.mjs librarything_kaixo_202607210219.json</pre>
      </div>
    )
  }
  if (load.state === 'error') {
    return (
      <div className={styles.center}>
        <h1>Tsundoku 積ん読</h1>
        <p>Bibliothek konnte nicht geladen werden: {load.message}</p>
      </div>
    )
  }

  return (
    <DataProvider library={load.library}>
      <Shell />
    </DataProvider>
  )
}

function Shell() {
  const view = useFilterStore((s) => s.view)
  const setView = useFilterStore((s) => s.setView)
  const entry = VIEW_REGISTRY[view]
  const Active = entry?.component ?? DataSummary
  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.brand}>
          Tsundoku <span lang="ja">積ん読</span>
        </h1>
        <nav aria-label="Ansichten" className={styles.nav}>
          {VIEW_ORDER.filter((id) => VIEW_REGISTRY[id]).map((id) => (
            <button
              key={id}
              className={styles.navItem}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => setView(id)}
            >
              {VIEW_REGISTRY[id]!.label}
            </button>
          ))}
        </nav>
      </header>
      <FilterChips />
      <main className={styles.main}>
        <Active />
      </main>
    </>
  )
}
```

`src/App.module.css`:

```css
.center {
  padding: var(--space-6);
  max-width: 40rem;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: baseline;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--ink-15);
  flex-wrap: wrap;
}

.brand {
  font-size: 28px;
  letter-spacing: 0.02em;
}

.nav {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.navItem {
  border: none;
  background: none;
  padding: var(--space-1) var(--space-3);
  color: var(--ink-70);
  border-bottom: 2px solid transparent;
}

.navItem[aria-current='page'] {
  color: var(--sumi);
  border-bottom-color: var(--enji);
}

.main {
  padding: var(--space-5);
}
```

- [ ] **Step 4: URL-Sync in main.tsx starten**

In `src/main.tsx` vor `createRoot` ergänzen:

```tsx
import { startUrlSync } from './store/urlSync'

startUrlSync()
```

- [ ] **Step 5: Manuelle Prüfung im Dev-Server**

`npm run dev`, dann:

1. Startseite zeigt Kennzahlen (4.865 Titel, 1.334 gelesen, 1.359.074 Seiten).
2. `public/data/library.json` kurz wegbewegen → Anleitung mit `normalize`-Aufruf erscheint; wieder zurücklegen.
3. `/?tag=Japan&status=unread` aufrufen → zwei Chips erscheinen, Kennzahlen schrumpfen; Chip entfernen → URL ändert sich; Back-Button → Chip ist wieder da.
4. Tab-Taste: Fokusring auf Nav, Chips, Buttons sichtbar.

- [ ] **Step 6: Tests + Typecheck + Commit**

```bash
npm run test && npm run typecheck
git add src
git commit -m "feat: App-Shell mit Filter-Chips, View-Registry und Ladezuständen"
```

---

### Task 7: View 1 — Erwerb und Lektüre

**Files:**
- Create: `src/lib/viewData/timeline.ts`, `src/views/AcquisitionReading.tsx` (+ `.module.css`), `src/components/Axis.tsx` (+ `.module.css`)
- Modify: `src/App.tsx` (View registrieren)
- Test: `src/lib/viewData/timeline.test.ts`

**Interfaces:**
- Consumes: `useLibraryData`, `useFilterStore` (`setRange`, `addFilter`), `CoverageNote`, `EmptyState`, `Tooltip`, `useMeasure`, `fmtInt`, `mkBook`
- Produces: `timelineData(books: Book[]): TimelineData` mit `TimelinePoint { year; acquired; readDated; readTagged }`, `TimelineData { points; unread: { year; count }[]; maxGapYear: number | null; acquiredKnown; readKnown; readTaggedOnly }`; View-Komponente `AcquisitionReading`; `AxisBottom({ ticks: { x; label }[]; y })` und `AxisLeft({ ticks: { y; label }[]; x })` als wiederverwendbare SVG-Achsen

- [ ] **Step 1: Failing Test schreiben (`src/lib/viewData/timeline.test.ts`)**

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { timelineData } from './timeline'

const books = [
  mkBook({ acquiredYear: 2010 }),                                                            // nie gelesen
  mkBook({ acquiredYear: 2010, readYearEffective: 2012, readYearSource: 'dateread', hasRead: true }),
  mkBook({ acquiredYear: 2011, readYearEffective: 2011, readYearSource: 'yeartag', hasRead: true }),
  mkBook({ readYearEffective: 2012, readYearSource: 'dateread', hasRead: true }),            // ohne Erwerbsjahr
]

describe('timelineData', () => {
  const d = timelineData(books)

  it('durchgehende Jahresachse über beide Reihen', () => {
    expect(d.points.map((p) => p.year)).toEqual([2010, 2011, 2012])
  })
  it('zählt Erwerb und Lektüre nach Herkunft getrennt', () => {
    expect(d.points[0]).toEqual({ year: 2010, acquired: 2, readDated: 0, readTagged: 0 })
    expect(d.points[1]).toEqual({ year: 2011, acquired: 1, readDated: 0, readTagged: 1 })
    expect(d.points[2]).toEqual({ year: 2012, acquired: 0, readDated: 2, readTagged: 0 })
  })
  it('ungelesener Bestand: erworben ≤ Jahr und (nie gelesen oder später gelesen)', () => {
    // 2010: 2 erworben, eines davon wird erst 2012 gelesen, eines nie → 2 ungelesen
    // 2011: +1 erworben, aber im selben Jahr gelesen → weiterhin 2
    // 2012: das 2012er-Lesen betrifft ein 2010er-Buch → 1
    expect(d.unread).toEqual([
      { year: 2010, count: 2 },
      { year: 2011, count: 2 },
      { year: 2012, count: 1 },
    ])
  })
  it('Jahr der größten Schere (Erwerb minus Lektüre)', () => {
    expect(d.maxGapYear).toBe(2010)
  })
  it('Abdeckung', () => {
    expect(d.acquiredKnown).toBe(3)
    expect(d.readKnown).toBe(3)
    expect(d.readTaggedOnly).toBe(1)
  })
  it('leere Eingabe', () => {
    expect(timelineData([]).points).toEqual([])
  })
})
```

- [ ] **Step 2: Test laufen lassen — FAIL**

```bash
npx vitest run src/lib/viewData/timeline.test.ts
```

- [ ] **Step 3: Transformation implementieren (`src/lib/viewData/timeline.ts`)**

```ts
import type { Book } from '../types'

export interface TimelinePoint {
  year: number
  acquired: number
  readDated: number
  readTagged: number
}

export interface TimelineData {
  points: TimelinePoint[]
  /** Bücher mit bekanntem Erwerbsjahr, die Ende des Jahres (noch) ungelesen sind. */
  unread: { year: number; count: number }[]
  maxGapYear: number | null
  acquiredKnown: number
  readKnown: number
  readTaggedOnly: number
}

export function timelineData(books: Book[]): TimelineData {
  const acq = books.filter((b) => b.acquiredYear !== null)
  const read = books.filter((b) => b.readYearEffective !== null)
  const years = [
    ...acq.map((b) => b.acquiredYear as number),
    ...read.map((b) => b.readYearEffective as number),
  ]
  if (years.length === 0) {
    return { points: [], unread: [], maxGapYear: null, acquiredKnown: 0, readKnown: 0, readTaggedOnly: 0 }
  }
  const min = Math.min(...years)
  const max = Math.max(...years)

  const points: TimelinePoint[] = []
  const unread: { year: number; count: number }[] = []
  let maxGap = -Infinity
  let maxGapYear: number | null = null
  for (let year = min; year <= max; year++) {
    const acquired = acq.filter((b) => b.acquiredYear === year).length
    const readDated = read.filter(
      (b) => b.readYearEffective === year && b.readYearSource === 'dateread',
    ).length
    const readTagged = read.filter(
      (b) => b.readYearEffective === year && b.readYearSource === 'yeartag',
    ).length
    points.push({ year, acquired, readDated, readTagged })
    unread.push({
      year,
      count: acq.filter(
        (b) =>
          (b.acquiredYear as number) <= year &&
          (b.readYearEffective === null || b.readYearEffective > year),
      ).length,
    })
    const gap = acquired - readDated - readTagged
    if (gap > maxGap) {
      maxGap = gap
      maxGapYear = year
    }
  }

  return {
    points,
    unread,
    maxGapYear,
    acquiredKnown: acq.length,
    readKnown: read.length,
    readTaggedOnly: read.filter((b) => b.readYearSource === 'yeartag').length,
  }
}
```

- [ ] **Step 4: Test laufen lassen — PASS**

```bash
npx vitest run src/lib/viewData/timeline.test.ts
```

- [ ] **Step 5: Achsen-Komponenten schreiben**

`src/components/Axis.tsx`:

```tsx
import styles from './Axis.module.css'

export function AxisBottom({ ticks, y }: { ticks: { x: number; label: string }[]; y: number }) {
  return (
    <g className={styles.axis}>
      {ticks.map((t) => (
        <g key={t.label} transform={`translate(${t.x},${y})`}>
          <line y2={4} className={styles.tick} />
          <text y={16} textAnchor="middle" className={styles.label}>
            {t.label}
          </text>
        </g>
      ))}
    </g>
  )
}

export function AxisLeft({ ticks, x }: { ticks: { y: number; label: string }[]; x: number }) {
  return (
    <g className={styles.axis}>
      {ticks.map((t) => (
        <g key={t.label} transform={`translate(${x},${t.y})`}>
          <line x2={-4} className={styles.tick} />
          <text x={-8} dy="0.32em" textAnchor="end" className={styles.label}>
            {t.label}
          </text>
        </g>
      ))}
    </g>
  )
}
```

`src/components/Axis.module.css`:

```css
.tick {
  stroke: var(--ink-45);
}

.label {
  font-family: var(--font-mono);
  font-size: 11px;
  fill: var(--ink-70);
}
```

- [ ] **Step 6: View-Komponente schreiben (`src/views/AcquisitionReading.tsx`)**

Gestaltprinzip (aus `docs/visualisierungen.md`): Erwerb als Balken nach oben (kon), Lektüre nach unten (enji; Jahres-Tag-Anteil schraffiert), darunter ein zweites Panel mit der Kurve „ungelesener Bestand". Bürste über der Jahresachse setzt `acquiredYear`-Bereich; Klick ohne Ziehen setzt das einzelne Jahr.

```tsx
import { area, curveMonotoneX } from 'd3-shape'
import { scaleBand, scaleLinear } from 'd3-scale'
import { useMemo, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { useMeasure } from '../lib/useMeasure'
import { timelineData } from '../lib/viewData/timeline'
import { useFilterStore } from '../store/filters'
import styles from './AcquisitionReading.module.css'

const H = 340
const H2 = 130
const M = { top: 12, right: 16, bottom: 28, left: 48 }

export function AcquisitionReading() {
  const { books, filtered } = useLibraryData()
  const setRange = useFilterStore((s) => s.setRange)
  const addFilter = useFilterStore((s) => s.addFilter)
  const data = useMemo(() => timelineData(filtered), [filtered])
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<{ year: number; px: number; py: number } | null>(null)
  const [drag, setDrag] = useState<{ x0: number; x1: number } | null>(null)

  if (filtered.length === 0) return <EmptyState />
  if (data.points.length === 0) {
    return (
      <div>
        <CoverageNote covered={0} total={filtered.length}>
          im aktuellen Filter haben ein Erwerbs- oder Lesejahr.
        </CoverageNote>
      </div>
    )
  }

  const innerW = Math.max(200, width - M.left - M.right)
  const years = data.points.map((p) => p.year)
  const x = scaleBand<number>().domain(years).range([0, innerW]).paddingInner(0.15)
  const maxUp = Math.max(...data.points.map((p) => p.acquired), 1)
  const maxDown = Math.max(...data.points.map((p) => p.readDated + p.readTagged), 1)
  const y = scaleLinear().domain([-maxDown, maxUp]).range([H - M.bottom, M.top]).nice()
  const y2 = scaleLinear()
    .domain([0, Math.max(...data.unread.map((u) => u.count), 1)])
    .range([H2 - 24, 8])
    .nice()
  const bw = x.bandwidth()

  const yearAt = (px: number) => {
    const i = Math.max(0, Math.min(years.length - 1, Math.floor((px / innerW) * years.length)))
    return years[i]
  }
  const localX = (e: React.PointerEvent<SVGRectElement>) =>
    e.clientX - e.currentTarget.getBoundingClientRect().left

  const unreadArea = area<{ year: number; count: number }>()
    .x((u) => (x(u.year) ?? 0) + bw / 2)
    .y0(y2(0))
    .y1((u) => y2(u.count))
    .curve(curveMonotoneX)

  const hoverTitles =
    hover === null
      ? []
      : filtered.filter((b) => b.acquiredYear === hover.year).map((b) => b.title)

  const tickEvery = Math.ceil(years.length / Math.floor(innerW / 60))
  const xTicks = years
    .filter((yr) => yr % Math.max(1, tickEvery) === 0)
    .map((yr) => ({ x: (x(yr) ?? 0) + bw / 2, label: String(yr) }))

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>Erwerb und Lektüre</h2>
        <CoverageNote covered={data.acquiredKnown} total={filtered.length}>
          haben ein Erwerbsjahr; {fmtInt(data.readKnown)} ein Lesejahr, davon{' '}
          {fmtInt(data.readTaggedOnly)} nur über Jahres-Tags.
        </CoverageNote>
      </header>

      <svg width={width} height={H} role="img" aria-label="Erwerb (nach oben) und Lektüre (nach unten) pro Jahr">
        <defs>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" fill="var(--enji)" opacity="0.25" />
            <line y2="4" stroke="var(--enji)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <g transform={`translate(${M.left},0)`}>
          <line x1={0} x2={innerW} y1={y(0)} y2={y(0)} stroke="var(--ink-45)" />
          {data.points.map((p) => {
            const xp = x(p.year) ?? 0
            const readTotal = p.readDated + p.readTagged
            return (
              <g key={p.year}>
                <rect x={xp} y={y(p.acquired)} width={bw} height={y(0) - y(p.acquired)} fill="var(--kon)" />
                <rect x={xp} y={y(0)} width={bw} height={y(-p.readDated) - y(0)} fill="var(--enji)" />
                <rect x={xp} y={y(-p.readDated)} width={bw} height={y(-readTotal) - y(-p.readDated)} fill="url(#hatch)" />
              </g>
            )
          })}
          {data.maxGapYear !== null && (
            <g transform={`translate(${(x(data.maxGapYear) ?? 0) + bw / 2},${M.top})`}>
              <line y2={y(0) - M.top} stroke="var(--sumi)" strokeDasharray="2 3" />
              <text y={-2} textAnchor="middle" className={styles.annotation}>
                größte Schere: {data.maxGapYear}
              </text>
            </g>
          )}
          {drag && (
            <rect
              x={Math.min(drag.x0, drag.x1)}
              y={M.top}
              width={Math.abs(drag.x1 - drag.x0)}
              height={H - M.top - M.bottom}
              fill="var(--kon)"
              opacity={0.15}
            />
          )}
          <AxisBottom ticks={xTicks} y={H - M.bottom + 2} />
          <AxisLeft
            x={0}
            ticks={y.ticks(6).map((v) => ({ y: y(v), label: fmtInt(Math.abs(v)) }))}
          />
          <rect
            x={0}
            y={M.top}
            width={innerW}
            height={H - M.top - M.bottom}
            fill="transparent"
            onPointerDown={(e) => {
              const px = localX(e)
              setDrag({ x0: px, x1: px })
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              const px = localX(e)
              setDrag((d) => (d ? { ...d, x1: px } : d))
              setHover({ year: yearAt(px), px: px + M.left, py: e.clientY - e.currentTarget.getBoundingClientRect().top })
            }}
            onPointerUp={() => {
              if (drag) {
                const a = yearAt(Math.min(drag.x0, drag.x1))
                const b = yearAt(Math.max(drag.x0, drag.x1))
                setRange('acquiredYear', a, b)
              }
              setDrag(null)
            }}
            onPointerLeave={() => setHover(null)}
          />
        </g>
      </svg>

      <svg width={width} height={H2} role="img" aria-label="Ungelesener Bestand, kumulativ">
        <g transform={`translate(${M.left},0)`}>
          <path d={unreadArea(data.unread) ?? ''} fill="var(--ink-08)" stroke="var(--sumi)" strokeWidth={1.5} />
          <AxisLeft x={0} ticks={y2.ticks(3).map((v) => ({ y: y2(v), label: fmtInt(v) }))} />
          <text x={4} y={16} className={styles.panelLabel}>
            ungelesener Bestand (nur Titel mit Erwerbsjahr)
          </text>
        </g>
      </svg>

      <div className={styles.legendRow}>
        <span className={styles.legend}><i className={styles.swatchKon} /> Erwerb</span>
        <span className={styles.legend}><i className={styles.swatchEnji} /> Lektüre (tagesgenau)</span>
        <span className={styles.legend}><i className={styles.swatchHatch} /> Lektüre (Jahres-Tag)</span>
        <button className={styles.action} onClick={() => addFilter({ kind: 'readStatus', value: 'unread' })}>
          Ungelesene filtern
        </button>
      </div>

      <form
        className={styles.rangeForm}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const from = Number(fd.get('from'))
          const to = Number(fd.get('to'))
          if (from >= 1900 && to >= from) setRange('acquiredYear', from, to)
        }}
      >
        <label>
          von <input name="from" type="number" defaultValue={years[0]} min={1900} max={2100} />
        </label>
        <label>
          bis <input name="to" type="number" defaultValue={years[years.length - 1]} min={1900} max={2100} />
        </label>
        <button type="submit">Zeitraum filtern</button>
      </form>

      {hover && hoverTitles.length > 0 && (
        <Tooltip x={hover.px} y={hover.py}>
          <strong>{hover.year}</strong>: {fmtInt(hoverTitles.length)} erworben
          <ul className={styles.tipList}>
            {hoverTitles.slice(0, 10).map((t) => (
              <li key={t}>{t}</li>
            ))}
            {hoverTitles.length > 10 && <li>… und {fmtInt(hoverTitles.length - 10)} weitere</li>}
          </ul>
        </Tooltip>
      )}
    </div>
  )
}
```

`src/views/AcquisitionReading.module.css`:

```css
.wrap {
  position: relative;
}

.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.annotation,
.panelLabel {
  font-family: var(--font-mono);
  font-size: 11px;
  fill: var(--ink-70);
}

.legendRow {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  font-size: 14px;
  flex-wrap: wrap;
}

.legend i {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 4px;
  vertical-align: -1px;
}

.swatchKon { background: var(--kon); }
.swatchEnji { background: var(--enji); }
.swatchHatch {
  background: repeating-linear-gradient(45deg, var(--enji) 0 1px, rgba(158, 61, 59, 0.25) 1px 4px);
}

.action {
  margin-left: auto;
  border: 1px solid var(--enji);
  background: none;
  color: var(--enji);
  border-radius: var(--radius);
  padding: 2px var(--space-2);
}

.rangeForm {
  margin-top: var(--space-3);
  display: flex;
  gap: var(--space-3);
  align-items: center;
  font-size: 14px;
}

.rangeForm input {
  width: 5em;
  font-family: var(--font-mono);
}

.tipList {
  margin: var(--space-1) 0 0;
  padding-left: var(--space-4);
}
```

- [ ] **Step 7: View registrieren**

In `src/App.tsx`:

```tsx
import { AcquisitionReading } from './views/AcquisitionReading'

export const VIEW_REGISTRY: Partial<Record<ViewId, { label: string; component: ComponentType }>> = {
  timeline: { label: 'Erwerb & Lektüre', component: AcquisitionReading },
}
```

- [ ] **Step 8: Manuelle DoD-Prüfung im Dev-Server**

1. Balken oben/unten sichtbar, Schraffur vor ~2007 dominiert die Lektüre (Jahres-Tags), Legende erklärt sie.
2. Annotation „größte Schere" zeigt auf ein plausibles Jahr; „Ungelesene filtern" + Wechsel auf Startansicht zeigt die Themen des Stapels.
3. Ziehen über Jahre setzt Chip „Erworben: X–Y", alle Kennzahlen reagieren; Back-Button macht es rückgängig; Formular „von/bis" tut dasselbe per Tastatur.
4. Hover zeigt Titel des Jahres (CJK-Titel unverstümmelt); leerer Filter → EmptyState.
5. `prefers-reduced-motion` aktivieren (DevTools → Rendering): keine Transitions.

- [ ] **Step 9: Tests + Typecheck + Commit**

```bash
npm run test && npm run typecheck
git add src
git commit -m "feat: View 1 Erwerb und Lektüre mit Jahresbürste und Bestandskurve"
```

---

### Task 8: View 2 — Wissenslandkarte (Streamgraph)

**Files:**
- Create: `src/lib/viewData/knowledge.ts`, `src/views/KnowledgeMap.tsx` (+ `.module.css`)
- Modify: `src/App.tsx` (registrieren)
- Test: `src/lib/viewData/knowledge.test.ts`

**Interfaces:**
- Consumes: `DDC_LABELS`, `DDC_COLORS`, `DDC_SHORT` aus `lib/ddc.ts`; Store-`toggleFilter`; geteilte Bausteine wie Task 7
- Produces: `ddcYearMatrix(books: Book[], opts: { smooth: boolean }): KnowledgeData` mit `KnowledgeData { years: number[]; classes: number[]; rows: Record<number, number>[]; covered: number; withAcquired: number }` (`rows[i][ddcClass]` = Anzahl im Jahr `years[i]`); View `KnowledgeMap`

- [ ] **Step 1: Failing Test schreiben (`src/lib/viewData/knowledge.test.ts`)**

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { ddcYearMatrix } from './knowledge'

const ddc = (top: number) => ({ code: `${top}00`, top, topLabel: 'x' })
const books = [
  mkBook({ acquiredYear: 2000, ddc: ddc(8) }),
  mkBook({ acquiredYear: 2000, ddc: ddc(8) }),
  mkBook({ acquiredYear: 2000, ddc: ddc(1) }),
  mkBook({ acquiredYear: 2002, ddc: ddc(8) }),
  mkBook({ acquiredYear: 2001, ddc: null }),      // zählt nicht in die Matrix
  mkBook({ acquiredYear: null, ddc: ddc(8) }),    // zählt nicht in die Matrix
]

describe('ddcYearMatrix', () => {
  it('Matrix über durchgehende Jahre, nur vorhandene Klassen', () => {
    const d = ddcYearMatrix(books, { smooth: false })
    expect(d.years).toEqual([2000, 2001, 2002])
    expect(d.classes).toEqual([1, 8])
    expect(d.rows[0]).toEqual({ 1: 1, 8: 2 })
    expect(d.rows[1]).toEqual({ 1: 0, 8: 0 })
    expect(d.rows[2]).toEqual({ 1: 0, 8: 1 })
  })
  it('gleitender Dreijahresschnitt, zentriert, Ränder mit verfügbaren Nachbarn', () => {
    const d = ddcYearMatrix(books, { smooth: true })
    // Klasse 8 roh: [2, 0, 1] → geglättet: [1, 1, 0.5]
    expect(d.rows.map((r) => r[8])).toEqual([1, 1, 0.5])
  })
  it('Abdeckung: covered = mit DDC und Erwerbsjahr', () => {
    const d = ddcYearMatrix(books, { smooth: false })
    expect(d.covered).toBe(4)
    expect(d.withAcquired).toBe(5)
  })
})
```

- [ ] **Step 2: Test laufen lassen — FAIL**

```bash
npx vitest run src/lib/viewData/knowledge.test.ts
```

- [ ] **Step 3: Implementieren (`src/lib/viewData/knowledge.ts`)**

```ts
import type { Book } from '../types'

export interface KnowledgeData {
  years: number[]
  /** DDC-Hauptklassen, die im Datensatz vorkommen, aufsteigend. */
  classes: number[]
  /** rows[i][klasse] = Anzahl (ggf. geglättet) im Jahr years[i]. */
  rows: Record<number, number>[]
  covered: number
  withAcquired: number
}

export function ddcYearMatrix(books: Book[], opts: { smooth: boolean }): KnowledgeData {
  const withAcq = books.filter((b) => b.acquiredYear !== null)
  const usable = withAcq.filter((b) => b.ddc !== null)
  if (usable.length === 0) {
    return { years: [], classes: [], rows: [], covered: 0, withAcquired: withAcq.length }
  }
  const years: number[] = []
  const yMin = Math.min(...usable.map((b) => b.acquiredYear as number))
  const yMax = Math.max(...usable.map((b) => b.acquiredYear as number))
  for (let y = yMin; y <= yMax; y++) years.push(y)
  const classes = [...new Set(usable.map((b) => (b.ddc as { top: number }).top))].sort((a, b) => a - b)

  const raw = years.map((year) => {
    const row: Record<number, number> = {}
    for (const c of classes) {
      row[c] = usable.filter((b) => b.acquiredYear === year && b.ddc?.top === c).length
    }
    return row
  })

  const rows = opts.smooth
    ? raw.map((_, i) => {
        const row: Record<number, number> = {}
        const window = raw.slice(Math.max(0, i - 1), Math.min(raw.length, i + 2))
        for (const c of classes) {
          row[c] = window.reduce((s, r) => s + r[c], 0) / window.length
        }
        return row
      })
    : raw

  return { years, classes, rows, covered: usable.length, withAcquired: withAcq.length }
}
```

- [ ] **Step 4: Test laufen lassen — PASS**

- [ ] **Step 5: View-Komponente schreiben (`src/views/KnowledgeMap.tsx`)**

```tsx
import { scaleLinear, scalePoint } from 'd3-scale'
import { area, curveMonotoneX, stack, stackOffsetExpand, stackOffsetWiggle, stackOrderInsideOut, type Series } from 'd3-shape'
import { useMemo, useState } from 'react'
import { AxisBottom } from '../components/Axis'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { DDC_COLORS, DDC_LABELS } from '../lib/ddc'
import { fmtInt } from '../lib/format'
import { useMeasure } from '../lib/useMeasure'
import { ddcYearMatrix } from '../lib/viewData/knowledge'
import { useFilterStore } from '../store/filters'
import styles from './KnowledgeMap.module.css'

const H = 420
const M = { top: 8, right: 16, bottom: 28, left: 16 }

export function KnowledgeMap() {
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const [mode, setMode] = useState<'absolute' | 'share'>('absolute')
  const [smooth, setSmooth] = useState(false)
  const [hoverClass, setHoverClass] = useState<number | null>(null)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const data = useMemo(() => ddcYearMatrix(filtered, { smooth }), [filtered, smooth])

  if (filtered.length === 0) return <EmptyState />
  if (data.years.length === 0) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        im aktuellen Filter haben DDC-Code und Erwerbsjahr.
      </CoverageNote>
    )
  }

  const innerW = Math.max(200, width - M.left - M.right)
  const x = scalePoint<number>().domain(data.years).range([0, innerW])
  const stacked: Series<Record<number, number>, number>[] = stack<Record<number, number>, number>()
    .keys(data.classes)
    .offset(mode === 'share' ? stackOffsetExpand : stackOffsetWiggle)
    .order(stackOrderInsideOut)(data.rows)
  const yMin = Math.min(...stacked.flatMap((s) => s.map((d) => d[0])))
  const yMax = Math.max(...stacked.flatMap((s) => s.map((d) => d[1])))
  const y = scaleLinear().domain([yMin, yMax]).range([H - M.bottom, M.top])
  const mkArea = area<[number, number]>()
    .x((_, i) => x(data.years[i]) ?? 0)
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(curveMonotoneX)

  const tickEvery = Math.max(1, Math.ceil(data.years.length / Math.floor(innerW / 60)))
  const xTicks = data.years
    .filter((yr) => yr % tickEvery === 0)
    .map((yr) => ({ x: x(yr) ?? 0, label: String(yr) }))

  const classCounts = new Map(
    data.classes.map((c) => [c, data.rows.reduce((s, r) => s + r[c], 0)]),
  )

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Wissenslandkarte</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          haben DDC-Code und Erwerbsjahr ({fmtInt(data.withAcquired - data.covered)} mit
          Erwerbsjahr, aber ohne DDC).
        </CoverageNote>
      </header>

      <div className={styles.controls} role="group" aria-label="Darstellung">
        <label>
          <input type="radio" name="mode" checked={mode === 'absolute'} onChange={() => setMode('absolute')} /> absolut
        </label>
        <label>
          <input type="radio" name="mode" checked={mode === 'share'} onChange={() => setMode('share')} /> Anteile
        </label>
        <label>
          <input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} /> Dreijahresschnitt
        </label>
      </div>

      <svg width={width} height={H} role="img" aria-label="DDC-Hauptklassen über Erwerbsjahre">
        <g transform={`translate(${M.left},0)`}>
          {stacked.map((s) => (
            <path
              key={s.key}
              d={mkArea(s as unknown as [number, number][]) ?? ''}
              fill={DDC_COLORS[s.key]}
              opacity={hoverClass === null || hoverClass === s.key ? 0.9 : 0.25}
              onPointerEnter={() => setHoverClass(s.key)}
              onPointerLeave={() => setHoverClass(null)}
              onClick={() => toggleFilter({ kind: 'ddcTop', value: s.key })}
            >
              <title>{`${s.key} ${DDC_LABELS[s.key]}: ${fmtInt(classCounts.get(s.key) ?? 0)} Titel`}</title>
            </path>
          ))}
          <AxisBottom ticks={xTicks} y={H - M.bottom + 2} />
        </g>
      </svg>

      <ul className={styles.legend}>
        {data.classes.map((c) => (
          <li key={c}>
            <button
              className={styles.legendItem}
              onClick={() => toggleFilter({ kind: 'ddcTop', value: c })}
              onPointerEnter={() => setHoverClass(c)}
              onPointerLeave={() => setHoverClass(null)}
            >
              <i style={{ background: DDC_COLORS[c] }} />
              <span className={styles.legendNum}>{c}00</span> {DDC_LABELS[c]}
              <span className={styles.legendCount}>{fmtInt(Math.round(classCounts.get(c) ?? 0))}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

`src/views/KnowledgeMap.module.css`:

```css
.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-2);
}

.controls {
  display: flex;
  gap: var(--space-4);
  font-size: 14px;
  margin-bottom: var(--space-2);
}

.legend {
  list-style: none;
  margin: var(--space-3) 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: var(--space-1);
}

.legendItem {
  border: none;
  background: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
  padding: 2px;
  width: 100%;
  text-align: left;
}

.legendItem i {
  width: 12px;
  height: 12px;
  flex: none;
}

.legendNum {
  font-family: var(--font-mono);
  color: var(--ink-70);
}

.legendCount {
  margin-left: auto;
  font-family: var(--font-mono);
  color: var(--ink-70);
}
```

Die Legende ist der farbunabhängige Zugang (Nummer + Label + Anzahl, klickbar und fokussierbar) — damit ist Farbe nie alleiniger Bedeutungsträger und die View tastaturbedienbar.

- [ ] **Step 6: Registrieren**

In `src/App.tsx` ergänzen:

```tsx
import { KnowledgeMap } from './views/KnowledgeMap'
// im Registry-Literal:
  knowledge: { label: 'Wissenslandkarte', component: KnowledgeMap },
```

- [ ] **Step 7: Manuelle DoD-Prüfung**

1. Frühe Informatik-Phase (Klasse 0/6) und späterer Literatur/Philosophie-Schwerpunkt ohne Erklärung ablesbar (DoD aus der View-Spec).
2. Umschalten absolut/Anteile ändert die Aussage sichtbar; Dreijahresschnitt ist standardmäßig AUS.
3. Klick auf Band oder Legendeneintrag setzt Chip „Wissensgebiet: …"; erneuter Klick entfernt ihn.
4. Mit Filter „Erworben: 1995–2005" (aus View 1) zeigt der Streamgraph nur diese Jahre.

- [ ] **Step 8: Tests + Typecheck + Commit**

```bash
npm run test && npm run typecheck
git add src
git commit -m "feat: View 2 Wissenslandkarte als DDC-Streamgraph"
```

---

### Task 9: View 3 — Tag-Netzwerk

**Files:**
- Create: `src/lib/viewData/tagNetwork.ts`, `src/views/TagNetwork.tsx` (+ `.module.css`)
- Modify: `src/App.tsx` (registrieren)
- Test: `src/lib/viewData/tagNetwork.test.ts`

**Interfaces:**
- Consumes: geteilte Bausteine; Store-`toggleFilter`
- Produces: `tagGraph(books: Book[], opts: { minCount: number; maxLinksPerNode?: number }): TagGraph` mit `TagNode { id: string; count: number }`, `TagLink { source: string; target: string; shared: number; jaccard: number }`, `TagGraph { nodes; links; totalTags: number; excluded: { yearTags: number; status: number; seriesMarkers: number } }`; Konstanten `STATUS_TAGS: Set<string>`, `SERIES_MARKER_TAGS: Set<string>`; View `TagNetwork`

- [ ] **Step 1: Failing Test schreiben (`src/lib/viewData/tagNetwork.test.ts`)**

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { tagGraph } from './tagNetwork'

const books = [
  mkBook({ tagsNorm: ['Japan', 'Roman', '1998', 'gelesen'] }),
  mkBook({ tagsNorm: ['Japan', 'Roman', 'RUB'] }),
  mkBook({ tagsNorm: ['Japan', 'Philosophie'] }),
  mkBook({ tagsNorm: ['Philosophie'] }),
]

describe('tagGraph', () => {
  const g = tagGraph(books, { minCount: 2 })

  it('schließt Jahres-Tags, Statusmarker und Reihenkürzel aus und zählt sie', () => {
    expect(g.excluded).toEqual({ yearTags: 1, status: 1, seriesMarkers: 1 })
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['Japan', 'Philosophie', 'Roman'])
    expect(g.totalTags).toBe(3)
  })
  it('Knotengröße = Titelanzahl', () => {
    expect(g.nodes.find((n) => n.id === 'Japan')?.count).toBe(3)
  })
  it('Kanten mit gemeinsamer Anzahl und Jaccard', () => {
    const jr = g.links.find((l) => l.source === 'Japan' && l.target === 'Roman')
    expect(jr?.shared).toBe(2)
    // |Japan ∪ Roman| = 3 + 2 − 2 = 3 → Jaccard 2/3
    expect(jr?.jaccard).toBeCloseTo(2 / 3)
  })
  it('minCount filtert Knoten und ihre Kanten', () => {
    const g3 = tagGraph(books, { minCount: 3 })
    expect(g3.nodes.map((n) => n.id)).toEqual(['Japan'])
    expect(g3.links).toEqual([])
  })
  it('maxLinksPerNode begrenzt auf die stärksten Kanten je Knoten', () => {
    const g1 = tagGraph(books, { minCount: 2, maxLinksPerNode: 1 })
    for (const n of g1.nodes) {
      const deg = g1.links.filter((l) => l.source === n.id || l.target === n.id).length
      expect(deg).toBeLessThanOrEqual(2) // eigene Top-1 plus als Top-1 eines anderen
    }
  })
})
```

- [ ] **Step 2: Test laufen lassen — FAIL**

- [ ] **Step 3: Implementieren (`src/lib/viewData/tagNetwork.ts`)**

```ts
import type { Book } from '../types'

/** Statusmarker sind keine Themen (docs/visualisierungen.md, View 3). */
export const STATUS_TAGS = new Set(['gelesen', 'ungelesen', 'angelesen', 'have read', 'unread'])

/** Verlags-/Reihenkürzel; bei Bedarf erweitern (Fund im Netz melden statt raten). */
export const SERIES_MARKER_TAGS = new Set(['RUB', 'stw', 'ltfa', 'ultb'])

const YEAR_TAG = /^(19|20)\d{2}$/

export interface TagNode {
  id: string
  count: number
}

export interface TagLink {
  source: string
  target: string
  shared: number
  jaccard: number
}

export interface TagGraph {
  nodes: TagNode[]
  links: TagLink[]
  /** Anzahl aller wählbaren (nicht ausgeschlossenen) Tags vor dem Schwellwert. */
  totalTags: number
  excluded: { yearTags: number; status: number; seriesMarkers: number }
}

export function tagGraph(
  books: Book[],
  opts: { minCount: number; maxLinksPerNode?: number },
): TagGraph {
  const maxLinks = opts.maxLinksPerNode ?? 6
  const excludedSets = { yearTags: new Set<string>(), status: new Set<string>(), seriesMarkers: new Set<string>() }
  const counts = new Map<string, number>()

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

  const perBook: string[][] = books.map((b) => b.tagsNorm.filter(eligible))
  for (const tags of perBook) for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1)

  const kept = new Set([...counts].filter(([, c]) => c >= opts.minCount).map(([t]) => t))
  const pair = new Map<string, number>()
  for (const tags of perBook) {
    const ts = tags.filter((t) => kept.has(t)).sort()
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        const key = `${ts[i]} ${ts[j]}`
        pair.set(key, (pair.get(key) ?? 0) + 1)
      }
    }
  }

  const allLinks: TagLink[] = [...pair].map(([key, shared]) => {
    const [a, b] = key.split(' ')
    const union = (counts.get(a) ?? 0) + (counts.get(b) ?? 0) - shared
    return { source: a, target: b, shared, jaccard: union === 0 ? 0 : shared / union }
  })

  // Top-k je Knoten nach Jaccard, Vereinigung beider Seiten
  const byNode = new Map<string, TagLink[]>()
  for (const l of allLinks) {
    for (const id of [l.source, l.target]) {
      const arr = byNode.get(id)
      if (arr) arr.push(l)
      else byNode.set(id, [l])
    }
  }
  const keptLinks = new Set<TagLink>()
  for (const links of byNode.values()) {
    links.sort((a, b) => b.jaccard - a.jaccard)
    for (const l of links.slice(0, maxLinks)) keptLinks.add(l)
  }

  return {
    nodes: [...kept].map((id) => ({ id, count: counts.get(id) ?? 0 })).sort((a, b) => b.count - a.count),
    links: [...keptLinks],
    totalTags: counts.size,
    excluded: {
      yearTags: excludedSets.yearTags.size,
      status: excludedSets.status.size,
      seriesMarkers: excludedSets.seriesMarkers.size,
    },
  }
}
```

- [ ] **Step 4: Test laufen lassen — PASS**

- [ ] **Step 5: View-Komponente schreiben (`src/views/TagNetwork.tsx`)**

Layout synchron rechnen (`simulation.stop(); tick(300)`) und statisch rendern — das respektiert `prefers-reduced-motion` von selbst und kostet bei ~150 Knoten unter 100 ms.

```tsx
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { scaleSqrt } from 'd3-scale'
import { useMemo, useState } from 'react'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { useMeasure } from '../lib/useMeasure'
import { tagGraph, type TagLink } from '../lib/viewData/tagNetwork'
import { useFilterStore } from '../store/filters'
import styles from './TagNetwork.module.css'

const H = 640

interface SimNode extends SimulationNodeDatum {
  id: string
  count: number
}

export function TagNetwork() {
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const [minCount, setMinCount] = useState(10)
  const [isolated, setIsolated] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [wrapRef, width] = useMeasure<HTMLDivElement>()

  const graph = useMemo(() => tagGraph(filtered, { minCount }), [filtered, minCount])
  const maxCount = graph.nodes[0]?.count ?? 1
  const r = useMemo(() => scaleSqrt().domain([1, maxCount]).range([4, 26]), [maxCount])

  const layout = useMemo(() => {
    if (width === 0 || graph.nodes.length === 0) return null
    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }))
    const links = graph.links.map((l) => ({ ...l }))
    const sim = forceSimulation(nodes)
      .force('link', forceLink<SimNode, TagLink & SimulationNodeDatum>(links as never)
        .id((d: SimNode) => d.id)
        .distance((l) => 40 + 160 * (1 - (l as TagLink).jaccard))
        .strength((l) => 0.2 + 0.8 * (l as TagLink).jaccard))
      .force('charge', forceManyBody().strength(-80))
      .force('x', forceX(width / 2).strength(0.05))
      .force('y', forceY(H / 2).strength(0.07))
      .force('collide', forceCollide<SimNode>((d) => r(d.count) + 3))
      .stop()
    sim.tick(300)
    return { nodes, links: links as (TagLink & { source: SimNode; target: SimNode })[] }
  }, [graph, width, r])

  if (filtered.length === 0) return <EmptyState />

  const neighborhood = isolated === null
    ? null
    : new Set([isolated, ...(layout?.links ?? [])
        .filter((l) => l.source.id === isolated || l.target.id === isolated)
        .flatMap((l) => [l.source.id, l.target.id])])

  const visible = (id: string) => neighborhood === null || neighborhood.has(id)
  const activeTags = new Set(filters.filter((f) => f.kind === 'tag').map((f) => (f as { value: string }).value))
  const searchHit = graph.nodes.find((n) => n.id.toLowerCase() === search.toLowerCase())?.id ?? null

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Tag-Netzwerk</h2>
        <CoverageNote covered={graph.nodes.length} total={graph.totalTags} unit="Tags">
          haben ≥ {minCount} Titel und sind im Netz; ausgeblendet: {fmtInt(graph.excluded.yearTags)} Jahres-Tags,{' '}
          {fmtInt(graph.excluded.status)} Statusmarker, {fmtInt(graph.excluded.seriesMarkers)} Reihenkürzel.
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <label>
          Mindestanzahl Titel: <span className={styles.mono}>{minCount}</span>
          <input type="range" min={3} max={50} value={minCount} onChange={(e) => setMinCount(Number(e.target.value))} />
        </label>
        <input
          type="search"
          list="tag-list"
          placeholder="Tag suchen …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Tag suchen"
        />
        <datalist id="tag-list">
          {graph.nodes.map((n) => <option key={n.id} value={n.id} />)}
        </datalist>
        {isolated && (
          <button onClick={() => setIsolated(null)}>Isolation aufheben ({isolated})</button>
        )}
      </div>

      {layout && (
        <svg width={width} height={H} role="img" aria-label="Netzwerk gemeinsam vergebener Tags">
          {layout.links.map((l) => (
            <line
              key={`${l.source.id}-${l.target.id}`}
              x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
              stroke="var(--sumi)"
              strokeOpacity={visible(l.source.id) && visible(l.target.id) ? 0.1 + 0.5 * l.jaccard : 0.02}
            />
          ))}
          {layout.nodes.map((n) => (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              opacity={visible(n.id) ? 1 : 0.12}
              className={styles.node}
              role="button"
              tabIndex={0}
              aria-pressed={activeTags.has(n.id)}
              aria-label={`Tag ${n.id}, ${fmtInt(n.count)} Titel`}
              onClick={() => toggleFilter({ kind: 'tag', value: n.id })}
              onDoubleClick={() => setIsolated((cur) => (cur === n.id ? null : n.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') toggleFilter({ kind: 'tag', value: n.id })
                if (e.key === 'i') setIsolated((cur) => (cur === n.id ? null : n.id))
              }}
            >
              <circle
                r={r(n.count)}
                fill={activeTags.has(n.id) ? 'var(--enji)' : 'var(--kon)'}
                stroke={searchHit === n.id ? 'var(--enji)' : 'var(--shironeri)'}
                strokeWidth={searchHit === n.id ? 3 : 1}
              />
              {(r(n.count) > 10 || searchHit === n.id || visible(n.id) !== (neighborhood === null)) && (
                <text y={-r(n.count) - 4} textAnchor="middle" className={styles.nodeLabel}>
                  {n.id}
                </text>
              )}
              <title>{`${n.id}: ${fmtInt(n.count)} Titel (Enter = filtern, i = isolieren)`}</title>
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}

```

`src/views/TagNetwork.module.css`:

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
  margin: var(--space-2) 0;
  font-size: 14px;
  flex-wrap: wrap;
}

.controls input[type='search'] {
  font: inherit;
  padding: 2px var(--space-2);
}

.mono {
  font-family: var(--font-mono);
}

.node {
  cursor: pointer;
}

.node:focus-visible circle {
  stroke: var(--enji);
  stroke-width: 3px;
}

.nodeLabel {
  font-size: 12px;
  fill: var(--sumi);
  paint-order: stroke;
  stroke: var(--shironeri);
  stroke-width: 3px;
}
```

- [ ] **Step 6: Registrieren**

```tsx
import { TagNetwork } from './views/TagNetwork'
// im Registry-Literal:
  network: { label: 'Tag-Netzwerk', component: TagNetwork },
```

- [ ] **Step 7: Manuelle DoD-Prüfung**

1. Cluster Japan / Philosophie–Soziologie / Informatik sichtbar getrennt (DoD); wenn nicht, `forceManyBody`-Stärke und Distanzfunktion justieren, bis sie es sind.
2. Kein Jahres-Tag, kein `gelesen`, kein `RUB` im Netz; die Coverage-Zeile weist die Ausschlüsse aus.
3. Klick auf Knoten setzt Tag-Chip (Knoten färbt enji); Doppelklick isoliert die Nachbarschaft, Button hebt auf.
4. Suche springt per Highlight zu „Suhrkamp"-artigen Tags; Schwellwert-Regler auf 3 → deutlich mehr Knoten, Layout bleibt < 1 s.
5. Tab + Enter auf einem Knoten filtert (Tastaturpfad).

- [ ] **Step 8: Tests + Typecheck + Commit**

```bash
npm run test && npm run typecheck
git add src
git commit -m "feat: View 3 Tag-Netzwerk mit Jaccard-Kanten und Isolation"
```

---

### Task 10: View 4 — Sprachfluss (Sankey)

**Files:**
- Create: `src/lib/languages.ts`, `src/lib/viewData/languageFlows.ts`, `src/views/LanguageFlow.tsx` (+ `.module.css`)
- Modify: `src/App.tsx` (registrieren), `src/store/filters.ts` (`filterLabel` nutzt `langLabel`)
- Test: `src/lib/viewData/languageFlows.test.ts`

**Interfaces:**
- Consumes: `d3-sankey`; Store-`addFilter`, `setRange`
- Produces: `langLabel(code: string): string`, `LANG_COLORS: Record<string, string>`; `languageFlows(books: Book[], opts?: { minCount?: number }): FlowData` mit `FlowData { nodes: FlowNode[]; links: FlowLink[]; covered: number; unknownOrig: number }`, `FlowNode { id: string; side: 'orig' | 'edition'; lang: string; total: number }` (id-Präfix `o:`/`e:`), `FlowLink { source: string; target: string; value: number }`; View `LanguageFlow`

**Vorab klären (erster Handgriff):** In welcher Form stehen Sprachen im Generat — ISO-Codes (`de`, `ja`) oder Namen (`German`)? Prüfen mit:

```bash
node -e "const l=require('./public/data/library.json'); console.log(l.stats.languages.slice(0,10))"
```

`LANG_LABELS` unten geht von ISO-Codes aus; sind es Namen, die Schlüssel entsprechend anpassen (die Tests nutzen dieselben Konstanten und bleiben damit korrekt).

- [ ] **Step 1: `src/lib/languages.ts` schreiben**

```ts
/** Deutsche Anzeigenamen; Schlüssel = Werte aus stats.languages (siehe Task-Kopf). */
export const LANG_LABELS: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  ja: 'Japanisch',
  zh: 'Chinesisch',
  es: 'Spanisch',
  fr: 'Französisch',
  la: 'Latein',
  grc: 'Altgriechisch',
}

export const OTHER_LANG = 'andere'
export const UNKNOWN_LANG = 'unbekannt'

export function langLabel(code: string): string {
  if (code === OTHER_LANG || code === UNKNOWN_LANG) return code
  return LANG_LABELS[code] ?? code
}

export const LANG_COLORS: Record<string, string> = {
  de: '#223a70',        // kon
  en: '#9e3d3b',        // enji
  ja: '#7a8b4a',        // rikyū
  zh: '#b07736',
  es: '#6f5980',
  fr: '#2e5c6e',
  la: '#8d6449',
  grc: '#4a6e5a',
  [OTHER_LANG]: '#746a5e',
  [UNKNOWN_LANG]: '#b9b2a5',
}
```

- [ ] **Step 2: Failing Test schreiben (`src/lib/viewData/languageFlows.test.ts`)**

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { languageFlows } from './languageFlows'

const books = [
  ...Array.from({ length: 12 }, () => mkBook({ originalLanguages: ['ja'], languages: ['de'] })),
  ...Array.from({ length: 11 }, () => mkBook({ originalLanguages: ['ja'], languages: ['ja'] })),
  ...Array.from({ length: 10 }, () => mkBook({ originalLanguages: [], languages: ['de'] })),
  ...Array.from({ length: 3 }, () => mkBook({ originalLanguages: ['sv'], languages: ['de'] })), // < minCount → 'andere'
  mkBook({ originalLanguages: ['ja'], languages: [] }), // ohne Ausgabesprache → nicht im Fluss
]

describe('languageFlows', () => {
  const d = languageFlows(books, { minCount: 10 })

  it('Hauptströme mit Werten', () => {
    expect(d.links).toContainEqual({ source: 'o:ja', target: 'e:de', value: 12 })
    expect(d.links).toContainEqual({ source: 'o:ja', target: 'e:ja', value: 11 })
  })
  it('fehlende Originalsprache ist ein eigener Strom „unbekannt", nicht „identisch"', () => {
    expect(d.links).toContainEqual({ source: 'o:unbekannt', target: 'e:de', value: 10 })
    expect(d.unknownOrig).toBe(10) // nur Bücher im Fluss (mit Ausgabesprache) zählen
  })
  it('seltene Sprachen (< minCount) werden zu „andere" gebündelt', () => {
    expect(d.links).toContainEqual({ source: 'o:andere', target: 'e:de', value: 3 })
    expect(d.nodes.find((n) => n.id === 'o:sv')).toBeUndefined()
  })
  it('Knoten tragen Seitensummen', () => {
    expect(d.nodes.find((n) => n.id === 'e:de')?.total).toBe(25)
  })
  it('Bücher ohne Ausgabesprache fallen aus dem Fluss und aus covered', () => {
    expect(d.covered).toBe(36)
  })
})
```

- [ ] **Step 3: Test laufen lassen — FAIL, dann implementieren (`src/lib/viewData/languageFlows.ts`)**

```ts
import { OTHER_LANG, UNKNOWN_LANG } from '../languages'
import type { Book } from '../types'

export interface FlowNode {
  id: string
  side: 'orig' | 'edition'
  lang: string
  total: number
}

export interface FlowLink {
  source: string
  target: string
  value: number
}

export interface FlowData {
  nodes: FlowNode[]
  links: FlowLink[]
  /** Bücher mit Ausgabesprache (= im Fluss). */
  covered: number
  /** davon ohne Originalsprache (Strom „unbekannt"). */
  unknownOrig: number
}

export function languageFlows(books: Book[], opts?: { minCount?: number }): FlowData {
  const minCount = opts?.minCount ?? 10
  const inFlow = books.filter((b) => b.languages.length > 0)

  const origOf = (b: Book) => b.originalLanguages[0] ?? UNKNOWN_LANG
  const edOf = (b: Book) => b.languages[0]

  const totals = (langs: string[]) => {
    const m = new Map<string, number>()
    for (const l of langs) m.set(l, (m.get(l) ?? 0) + 1)
    return m
  }
  const origTotals = totals(inFlow.map(origOf))
  const edTotals = totals(inFlow.map(edOf))
  const bundle = (lang: string, side: Map<string, number>) =>
    lang === UNKNOWN_LANG ? lang : (side.get(lang) ?? 0) >= minCount ? lang : OTHER_LANG

  const linkCounts = new Map<string, number>()
  for (const b of inFlow) {
    const key = `o:${bundle(origOf(b), origTotals)} e:${bundle(edOf(b), edTotals)}`
    linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1)
  }

  const links: FlowLink[] = [...linkCounts]
    .map(([key, value]) => {
      const [source, target] = key.split(' ')
      return { source, target, value }
    })
    .sort((a, b) => b.value - a.value)

  const nodeTotals = new Map<string, number>()
  for (const l of links) {
    nodeTotals.set(l.source, (nodeTotals.get(l.source) ?? 0) + l.value)
    nodeTotals.set(l.target, (nodeTotals.get(l.target) ?? 0) + l.value)
  }
  const nodes: FlowNode[] = [...nodeTotals].map(([id, total]) => ({
    id,
    side: id.startsWith('o:') ? 'orig' : 'edition',
    lang: id.slice(2),
    total,
  }))

  return {
    nodes,
    links,
    covered: inFlow.length,
    unknownOrig: inFlow.filter((b) => b.originalLanguages.length === 0).length,
  }
}
```

- [ ] **Step 4: Test laufen lassen — PASS**

- [ ] **Step 5: View-Komponente schreiben (`src/views/LanguageFlow.tsx`)**

Zeitraumsteuerung: dieselbe Von/Bis-Mechanik wie View 1 (setzt den globalen `acquiredYear`-Filter, das Sankey rechnet aus dem gefilterten Array neu). Kein Übergangs-Morphing der Pfade — sofortige Aktualisierung, damit `prefers-reduced-motion` trivially erfüllt ist; dokumentierte Abweichung von „animiert mit".

```tsx
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { useMemo } from 'react'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { langLabel, LANG_COLORS, OTHER_LANG, UNKNOWN_LANG } from '../lib/languages'
import { useMeasure } from '../lib/useMeasure'
import { languageFlows, type FlowLink, type FlowNode } from '../lib/viewData/languageFlows'
import { useFilterStore } from '../store/filters'
import styles from './LanguageFlow.module.css'

const H = 480
const M = { top: 8, right: 140, bottom: 8, left: 140 }

type SNode = SankeyNode<FlowNode, FlowLink>
type SLink = SankeyLink<FlowNode, FlowLink>

export function LanguageFlow() {
  const { filtered } = useLibraryData()
  const addFilter = useFilterStore((s) => s.addFilter)
  const setRange = useFilterStore((s) => s.setRange)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const data = useMemo(() => languageFlows(filtered), [filtered])

  if (filtered.length === 0) return <EmptyState />
  if (data.links.length === 0) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        im aktuellen Filter haben eine Ausgabesprache.
      </CoverageNote>
    )
  }

  const layout = sankey<FlowNode, FlowLink>()
    .nodeId((d) => d.id)
    .nodeWidth(14)
    .nodePadding(12)
    .extent([[M.left, M.top], [Math.max(400, width) - M.right, H - M.bottom]])({
    nodes: data.nodes.map((n) => ({ ...n })),
    links: data.links.map((l) => ({ ...l })),
  })

  const filterable = (lang: string) => lang !== OTHER_LANG && lang !== UNKNOWN_LANG
  const clickLink = (l: SLink) => {
    const s = l.source as SNode
    const t = l.target as SNode
    if (filterable(s.lang)) addFilter({ kind: 'originalLanguage', value: s.lang })
    if (filterable(t.lang)) addFilter({ kind: 'language', value: t.lang })
  }

  const years = filtered.map((b) => b.acquiredYear).filter((y): y is number => y !== null)
  const yMin = years.length ? Math.min(...years) : 1991
  const yMax = years.length ? Math.max(...years) : 2026

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Sprachfluss</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          haben eine Ausgabesprache; {fmtInt(data.unknownOrig)} davon ohne bekannte
          Originalsprache (eigener Strom „unbekannt").
        </CoverageNote>
      </header>

      <form
        className={styles.rangeForm}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const from = Number(fd.get('from'))
          const to = Number(fd.get('to'))
          if (from >= 1900 && to >= from) setRange('acquiredYear', from, to)
        }}
      >
        <label>
          Erwerb von <input name="from" type="number" defaultValue={yMin} min={1900} max={2100} />
        </label>
        <label>
          bis <input name="to" type="number" defaultValue={yMax} min={1900} max={2100} />
        </label>
        <button type="submit">anwenden</button>
      </form>

      <svg width={width} height={H} role="img" aria-label="Fluss von Originalsprache zu Ausgabesprache">
        {layout.links.map((l) => {
          const s = l.source as SNode
          const t = l.target as SNode
          const label = `${langLabel(s.lang)} → ${langLabel(t.lang)}: ${fmtInt(l.value)} Titel`
          return (
            <path
              key={`${s.id}-${t.id}`}
              d={sankeyLinkHorizontal()(l) ?? ''}
              className={styles.link}
              stroke={LANG_COLORS[s.lang] ?? 'var(--ink-45)'}
              strokeWidth={Math.max(1, l.width ?? 1)}
              role={filterable(s.lang) || filterable(t.lang) ? 'button' : undefined}
              tabIndex={filterable(s.lang) || filterable(t.lang) ? 0 : undefined}
              aria-label={`${label}. Enter filtert auf diese Kombination.`}
              onClick={() => clickLink(l)}
              onKeyDown={(e) => e.key === 'Enter' && clickLink(l)}
            >
              <title>{label}</title>
            </path>
          )
        })}
        {layout.nodes.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x0}
              y={n.y0}
              width={(n.x1 ?? 0) - (n.x0 ?? 0)}
              height={(n.y1 ?? 0) - (n.y0 ?? 0)}
              fill={LANG_COLORS[n.lang] ?? 'var(--ink-45)'}
            />
            <text
              x={n.side === 'orig' ? (n.x0 ?? 0) - 6 : (n.x1 ?? 0) + 6}
              y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
              dy="0.32em"
              textAnchor={n.side === 'orig' ? 'end' : 'start'}
              className={styles.nodeLabel}
            >
              {langLabel(n.lang)} · {fmtInt(n.total)}
            </text>
          </g>
        ))}
        <text x={M.left} y={H - 2} className={styles.sideLabel} textAnchor="start">Originalsprache</text>
        <text x={Math.max(400, width) - M.right} y={H - 2} className={styles.sideLabel} textAnchor="end">Ausgabesprache</text>
      </svg>
    </div>
  )
}
```

`src/views/LanguageFlow.module.css`:

```css
.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.rangeForm {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  font-size: 14px;
  margin: var(--space-2) 0 var(--space-3);
}

.rangeForm input {
  width: 5em;
  font-family: var(--font-mono);
}

.link {
  fill: none;
  stroke-opacity: 0.45;
  cursor: pointer;
}

.link:hover,
.link:focus-visible {
  stroke-opacity: 0.8;
}

.nodeLabel {
  font-size: 13px;
  fill: var(--sumi);
}

.sideLabel {
  font-family: var(--font-mono);
  font-size: 11px;
  fill: var(--ink-70);
}
```

- [ ] **Step 6: Chip-Labels auf Sprachnamen umstellen**

In `src/store/filters.ts`:

```ts
import { langLabel } from '../lib/languages'
// in filterLabel:
    case 'language': return `Sprache: ${langLabel(f.value)}`
    case 'originalLanguage': return `Original: ${langLabel(f.value)}`
```

Die `filterLabel`-Tests aus Task 4 prüfen `tag`/`ddcTop`/Bereiche — sie bleiben grün; einen Fall `language → Sprache: Japanisch` ergänzen.

- [ ] **Step 7: Registrieren + manuelle DoD-Prüfung**

```tsx
import { LanguageFlow } from './views/LanguageFlow'
// im Registry-Literal:
  languages: { label: 'Sprachfluss', component: LanguageFlow },
```

1. Hauptströme Japanisch → Deutsch/Englisch/Japanisch, Englisch → Deutsch, Deutsch → Deutsch sichtbar; kein Faserbündel (Bündelung < 10 greift).
2. „unbekannt" ist ein eigener Strom, nicht in „identisch" versteckt.
3. Erwerb von 2015–2026 vs. 1991–2000 vergleichen: der Anteil Japanisch → Japanisch steigt (DoD-Frage beantwortbar).
4. Klick auf Strom setzt zwei Chips (Original + Sprache); Tab+Enter tut dasselbe.

- [ ] **Step 8: Tests + Typecheck + Commit**

```bash
npm run test && npm run typecheck
git add src
git commit -m "feat: View 4 Sprachfluss als Sankey mit Buendelung und unbekannt-Strom"
```

---

### Task 11: View 5 — Erscheinungsjahr gegen Erwerbsjahr

**Files:**
- Create: `src/lib/viewData/yearMatrix.ts`, `src/views/YearMatrix.tsx` (+ `.module.css`)
- Modify: `src/App.tsx` (registrieren)
- Test: `src/lib/viewData/yearMatrix.test.ts`

**Interfaces:**
- Consumes: Store-`setRange` (beide Achsen), geteilte Bausteine
- Produces: `yearMatrix(books: Book[], opts?: { editionFloor?: number }): YearMatrixData` mit `YearMatrixData { cells: { ed: number; acq: number; count: number }[]; edExtent: [number, number] | null; acqExtent: [number, number] | null; edMarginal: Map<number, number>; acqMarginal: Map<number, number>; underflow: number; covered: number; maxCount: number }`; View `YearMatrix`

- [ ] **Step 1: Failing Test schreiben (`src/lib/viewData/yearMatrix.test.ts`)**

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { yearMatrix } from './yearMatrix'

const books = [
  mkBook({ editionYear: 1998, acquiredYear: 2004 }),
  mkBook({ editionYear: 1998, acquiredYear: 2004 }),
  mkBook({ editionYear: 2004, acquiredYear: 2004 }),
  mkBook({ editionYear: 1850, acquiredYear: 2004 }), // unter editionFloor
  mkBook({ editionYear: 2004, acquiredYear: null }),  // ohne Erwerbsjahr → nicht in der Matrix
]

describe('yearMatrix', () => {
  const d = yearMatrix(books, { editionFloor: 1900 })

  it('zählt Zellen (Ausgabejahr × Erwerbsjahr)', () => {
    expect(d.cells).toContainEqual({ ed: 1998, acq: 2004, count: 2 })
    expect(d.cells).toContainEqual({ ed: 2004, acq: 2004, count: 1 })
    expect(d.maxCount).toBe(2)
  })
  it('Ausgaben vor editionFloor landen gezählt im Underflow, nicht in der Matrix', () => {
    expect(d.underflow).toBe(1)
    expect(d.cells.find((c) => c.ed === 1850)).toBeUndefined()
  })
  it('Extents und Randverteilungen', () => {
    expect(d.edExtent).toEqual([1998, 2004])
    expect(d.acqExtent).toEqual([2004, 2004])
    expect(d.edMarginal.get(1998)).toBe(2)
    expect(d.acqMarginal.get(2004)).toBe(3)
  })
  it('covered = beide Jahre bekannt (Underflow zählt als covered)', () => {
    expect(d.covered).toBe(4)
  })
})
```

- [ ] **Step 2: Test laufen lassen — FAIL, dann implementieren (`src/lib/viewData/yearMatrix.ts`)**

```ts
import type { Book } from '../types'

export interface YearMatrixData {
  cells: { ed: number; acq: number; count: number }[]
  edExtent: [number, number] | null
  acqExtent: [number, number] | null
  edMarginal: Map<number, number>
  acqMarginal: Map<number, number>
  /** Ausgaben vor editionFloor — sichtbar auszuweisen, nicht zu verstecken. */
  underflow: number
  covered: number
  maxCount: number
}

export function yearMatrix(books: Book[], opts?: { editionFloor?: number }): YearMatrixData {
  const floor = opts?.editionFloor ?? 1900
  const both = books.filter((b) => b.editionYear !== null && b.acquiredYear !== null)
  const inRange = both.filter((b) => (b.editionYear as number) >= floor)
  const underflow = both.length - inRange.length

  const counts = new Map<string, number>()
  const edMarginal = new Map<number, number>()
  const acqMarginal = new Map<number, number>()
  for (const b of inRange) {
    const ed = b.editionYear as number
    const acq = b.acquiredYear as number
    counts.set(`${ed}:${acq}`, (counts.get(`${ed}:${acq}`) ?? 0) + 1)
    edMarginal.set(ed, (edMarginal.get(ed) ?? 0) + 1)
    acqMarginal.set(acq, (acqMarginal.get(acq) ?? 0) + 1)
  }
  const cells = [...counts].map(([key, count]) => {
    const [ed, acq] = key.split(':').map(Number)
    return { ed, acq, count }
  })
  const eds = [...edMarginal.keys()]
  const acqs = [...acqMarginal.keys()]

  return {
    cells,
    edExtent: eds.length ? [Math.min(...eds), Math.max(...eds)] : null,
    acqExtent: acqs.length ? [Math.min(...acqs), Math.max(...acqs)] : null,
    edMarginal,
    acqMarginal,
    underflow,
    covered: both.length,
    maxCount: cells.reduce((m, c) => Math.max(m, c.count), 0),
  }
}
```

- [ ] **Step 3: Test laufen lassen — PASS**

- [ ] **Step 4: View-Komponente schreiben (`src/views/YearMatrix.tsx`)**

Heatmap: x = Ausgabejahr, y = Erwerbsjahr, Zellfarbe kon mit Wurzel-Opazität, Diagonale als Referenzlinie. Rechteck-Bürste setzt `editionYear`- UND `acquiredYear`-Bereich (zwei Chips). Randverteilungen als schmale Balkenreihen oben (Ausgabe) und rechts (Erwerb).

```tsx
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { useMemo, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { useMeasure } from '../lib/useMeasure'
import { yearMatrix } from '../lib/viewData/yearMatrix'
import { useFilterStore } from '../store/filters'
import styles from './YearMatrix.module.css'

const H = 520
const M = { top: 48, right: 64, bottom: 40, left: 56 }

export function YearMatrix() {
  const { filtered } = useLibraryData()
  const setRange = useFilterStore((s) => s.setRange)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const data = useMemo(() => yearMatrix(filtered), [filtered])

  if (filtered.length === 0) return <EmptyState />
  if (!data.edExtent || !data.acqExtent) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        im aktuellen Filter haben Ausgabe- und Erwerbsjahr (ab 1900).
      </CoverageNote>
    )
  }

  const innerW = Math.max(240, width - M.left - M.right)
  const innerH = H - M.top - M.bottom
  const x = scaleLinear().domain([data.edExtent[0] - 0.5, data.edExtent[1] + 0.5]).range([0, innerW])
  const y = scaleLinear().domain([data.acqExtent[0] - 0.5, data.acqExtent[1] + 0.5]).range([0, innerH])
  const cw = Math.max(1, x(data.edExtent[0] + 0.5) - x(data.edExtent[0] - 0.5) - 1)
  const ch = Math.max(1, y(data.acqExtent[0] + 0.5) - y(data.acqExtent[0] - 0.5) - 1)
  const opacity = scaleSqrt().domain([0, Math.max(1, data.maxCount)]).range([0, 0.95])
  const edMarginalMax = Math.max(...data.edMarginal.values())
  const acqMarginalMax = Math.max(...data.acqMarginal.values())

  const yearAtX = (px: number) => Math.round(x.invert(px))
  const yearAtY = (py: number) => Math.round(y.invert(py))
  const local = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { px: e.clientX - r.left, py: e.clientY - r.top }
  }

  // Diagonale nur im Überlappungsbereich beider Achsen
  const dMin = Math.max(data.edExtent[0], data.acqExtent[0])
  const dMax = Math.min(data.edExtent[1], data.acqExtent[1])

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Ausgabejahr gegen Erwerbsjahr</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          haben beide Jahre. Achtung: das ist das Jahr <em>dieser Ausgabe</em>, nicht des
          Werks — eine Reclam-Sophokles-Ausgabe zählt als 1998.
        </CoverageNote>
      </header>
      {data.underflow > 0 && (
        <p className={styles.underflow}>{fmtInt(data.underflow)} Ausgaben vor 1900 nicht dargestellt.</p>
      )}

      <svg width={width} height={H} role="img" aria-label="Heatmap Ausgabejahr × Erwerbsjahr">
        <g transform={`translate(${M.left},${M.top})`}>
          {[...data.edMarginal].map(([yr, n]) => (
            <rect
              key={`em${yr}`}
              x={x(yr - 0.5) + 0.5}
              y={-8 - 32 * (n / edMarginalMax)}
              width={cw}
              height={32 * (n / edMarginalMax)}
              fill="var(--ink-45)"
            />
          ))}
          {[...data.acqMarginal].map(([yr, n]) => (
            <rect
              key={`am${yr}`}
              x={innerW + 8}
              y={y(yr - 0.5) + 0.5}
              width={44 * (n / acqMarginalMax)}
              height={ch}
              fill="var(--ink-45)"
            />
          ))}
          {data.cells.map((c) => (
            <rect
              key={`${c.ed}:${c.acq}`}
              x={x(c.ed - 0.5) + 0.5}
              y={y(c.acq - 0.5) + 0.5}
              width={cw}
              height={ch}
              fill="var(--kon)"
              fillOpacity={opacity(c.count)}
            >
              <title>{`Ausgabe ${c.ed}, erworben ${c.acq}: ${fmtInt(c.count)} Titel`}</title>
            </rect>
          ))}
          {dMax >= dMin && (
            <line
              x1={x(dMin - 0.5)} y1={y(dMin - 0.5)} x2={x(dMax + 0.5)} y2={y(dMax + 0.5)}
              stroke="var(--enji)" strokeDasharray="4 3"
            />
          )}
          {drag && (
            <rect
              x={Math.min(drag.x0, drag.x1)}
              y={Math.min(drag.y0, drag.y1)}
              width={Math.abs(drag.x1 - drag.x0)}
              height={Math.abs(drag.y1 - drag.y0)}
              fill="var(--enji)"
              opacity={0.15}
              stroke="var(--enji)"
            />
          )}
          <AxisBottom
            y={innerH + 4}
            ticks={x.ticks(Math.floor(innerW / 70)).map((v) => ({ x: x(v), label: String(v) }))}
          />
          <AxisLeft
            x={-4}
            ticks={y.ticks(8).map((v) => ({ y: y(v), label: String(v) }))}
          />
          <text x={innerW / 2} y={innerH + 36} textAnchor="middle" className={styles.axisTitle}>
            Jahr dieser Ausgabe →
          </text>
          <text transform={`translate(${-40},${innerH / 2}) rotate(-90)`} textAnchor="middle" className={styles.axisTitle}>
            Erwerbsjahr →
          </text>
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerDown={(e) => {
              const { px, py } = local(e)
              setDrag({ x0: px, y0: py, x1: px, y1: py })
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (!drag) return
              const { px, py } = local(e)
              setDrag({ ...drag, x1: px, y1: py })
            }}
            onPointerUp={() => {
              if (drag) {
                setRange('editionYear', yearAtX(Math.min(drag.x0, drag.x1)), yearAtX(Math.max(drag.x0, drag.x1)))
                setRange('acquiredYear', yearAtY(Math.min(drag.y0, drag.y1)), yearAtY(Math.max(drag.y0, drag.y1)))
              }
              setDrag(null)
            }}
          />
        </g>
      </svg>

      <form
        className={styles.rangeForm}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const ef = Number(fd.get('ef')); const et = Number(fd.get('et'))
          const af = Number(fd.get('af')); const at = Number(fd.get('at'))
          if (ef >= 1900 && et >= ef) setRange('editionYear', ef, et)
          if (af >= 1900 && at >= af) setRange('acquiredYear', af, at)
        }}
      >
        <span>Ausgabe</span>
        <input name="ef" type="number" defaultValue={data.edExtent[0]} aria-label="Ausgabejahr von" />
        <input name="et" type="number" defaultValue={data.edExtent[1]} aria-label="Ausgabejahr bis" />
        <span>Erwerb</span>
        <input name="af" type="number" defaultValue={data.acqExtent[0]} aria-label="Erwerbsjahr von" />
        <input name="at" type="number" defaultValue={data.acqExtent[1]} aria-label="Erwerbsjahr bis" />
        <button type="submit">Bereich filtern</button>
      </form>
    </div>
  )
}
```

`src/views/YearMatrix.module.css`:

```css
.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.underflow {
  font-size: 14px;
  color: var(--ink-70);
  margin: var(--space-1) 0;
}

.axisTitle {
  font-family: var(--font-mono);
  font-size: 12px;
  fill: var(--ink-70);
}

.rangeForm {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-size: 14px;
  margin-top: var(--space-2);
}

.rangeForm input {
  width: 5em;
  font-family: var(--font-mono);
}
```

- [ ] **Step 5: Registrieren + manuelle DoD-Prüfung**

```tsx
import { YearMatrix } from './views/YearMatrix'
// im Registry-Literal:
  years: { label: 'Ausgabe × Erwerb', component: YearMatrix },
```

1. Achsentitel benennen explizit „Jahr dieser Ausgabe" (DoD), Diagonale ist eingezeichnet (DoD).
2. Diagonale = Neuerscheinungen; Fläche darunter (Ausgabe < Erwerb) sichtbar besetzt.
3. Bürste über einen Bereich setzt ZWEI Chips (Ausgabe + Erwerb); Formular tut dasselbe per Tastatur.
4. Underflow-Zeile erscheint, wenn Ausgaben vor 1900 im Filter sind.

- [ ] **Step 6: Tests + Typecheck + Commit**

```bash
npm run test && npm run typecheck
git add src
git commit -m "feat: View 5 Heatmap Ausgabejahr gegen Erwerbsjahr mit Rechteckbuerste"
```

---

### Task 12: View 6 — Das Regal (Signature-Ansicht, wird Default)

**Files:**
- Create: `src/lib/viewData/shelf.ts`, `src/views/Shelf.tsx` (+ `.module.css`)
- Modify: `src/App.tsx` (registrieren, `VIEW_ORDER` mit `shelf` zuerst), `src/lib/types.ts` (`DEFAULT_VIEW = 'shelf'`), ggf. `src/store/urlSync.test.ts` (nur falls dort View-Literale statt `DEFAULT_VIEW` verwendet wurden)
- Test: `src/lib/viewData/shelf.test.ts`

**Interfaces:**
- Consumes: `BookDetail`, `Tooltip`, `DDC_COLORS`, `LANG_COLORS`, Store
- Produces: `shelfLayout(books: Book[], opts: ShelfOpts): ShelfLayoutResult` mit `ShelfSort = 'acquired' | 'author' | 'height' | 'ddc'`, `ShelfOpts { sort: ShelfSort; rowWidth: number; pxPerMm?: number; minW?: number; rowGap?: number }`, `PlacedBook { book: Book; x: number; y: number; w: number; h: number }`, `ShelfLayoutResult { placed: PlacedBook[]; totalHeight: number; unmeasured: Book[]; nonBooks: number }`; View `Shelf`

- [ ] **Step 1: Failing Test schreiben (`src/lib/viewData/shelf.test.ts`)**

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { shelfLayout } from './shelf'

const phys = (heightMm: number, thicknessMm: number) => ({
  heightMm, thicknessMm, lengthMm: null, weightG: null,
})
const books = [
  mkBook({ physical: phys(200, 20), acquiredYear: 2001, primaryAuthor: 'B', title: 'Beta' }),
  mkBook({ physical: phys(180, 30), acquiredYear: 2000, primaryAuthor: 'A', title: 'Alpha' }),
  mkBook({ physical: phys(220, 1), acquiredYear: 2002, primaryAuthor: 'C', title: 'Gamma' }), // sehr dünn
  mkBook({ title: 'Ohne Maße' }),                                    // heightMm null → unmeasured
  mkBook({ mediaType: 'vinyl', physical: phys(310, 5) }),            // kein Buch → nonBooks
]

describe('shelfLayout', () => {
  it('nur Bücher mit Maßen werden platziert, Rest getrennt ausgewiesen', () => {
    const r = shelfLayout(books, { sort: 'acquired', rowWidth: 1000, pxPerMm: 1 })
    expect(r.placed).toHaveLength(3)
    expect(r.unmeasured.map((b) => b.title)).toEqual(['Ohne Maße'])
    expect(r.nonBooks).toBe(1)
  })
  it('Maßstab: Breite = Dicke, Höhe = Buchhöhe, Mindestbreite greift', () => {
    const r = shelfLayout(books, { sort: 'acquired', rowWidth: 1000, pxPerMm: 1, minW: 2 })
    const gamma = r.placed.find((p) => p.book.title === 'Gamma')!
    expect(gamma.w).toBe(2)      // 1 mm → min 2 px
    expect(gamma.h).toBe(220)
    const alpha = r.placed.find((p) => p.book.title === 'Alpha')!
    expect(alpha.w).toBe(30)
  })
  it('Sortierung acquired ordnet nach Erwerb', () => {
    const r = shelfLayout(books, { sort: 'acquired', rowWidth: 1000, pxPerMm: 1 })
    expect(r.placed.map((p) => p.book.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })
  it('Sortierung height ordnet absteigend nach Höhe', () => {
    const r = shelfLayout(books, { sort: 'height', rowWidth: 1000, pxPerMm: 1 })
    expect(r.placed.map((p) => p.book.title)).toEqual(['Gamma', 'Beta', 'Alpha'])
  })
  it('Reihenumbruch: Bücher stehen auf der Regalkante (gleiche Unterkante je Reihe)', () => {
    const r = shelfLayout(books, { sort: 'acquired', rowWidth: 40, pxPerMm: 1 })
    // Reihe 1: Alpha (30) + Beta (20) passt nicht → Beta bricht um
    const alpha = r.placed.find((p) => p.book.title === 'Alpha')!
    const beta = r.placed.find((p) => p.book.title === 'Beta')!
    expect(alpha.x).toBe(0)
    expect(beta.x).toBe(0)
    expect(beta.y).toBeGreaterThan(alpha.y)
    // Unterkante = y + h ist innerhalb einer Reihe konstant
    const rows = new Map<number, number>()
    for (const p of r.placed) rows.set(p.y + p.h, (rows.get(p.y + p.h) ?? 0) + 1)
    expect([...rows.values()].reduce((a, b) => a + b, 0)).toBe(3)
  })
})
```

- [ ] **Step 2: Test laufen lassen — FAIL, dann implementieren (`src/lib/viewData/shelf.ts`)**

```ts
import type { Book } from '../types'

export type ShelfSort = 'acquired' | 'author' | 'height' | 'ddc'

export interface ShelfOpts {
  sort: ShelfSort
  rowWidth: number
  /** Standard 0.55 px/mm → 20-cm-Buch ≈ 110 px hoch. */
  pxPerMm?: number
  minW?: number
  rowGap?: number
}

export interface PlacedBook {
  book: Book
  x: number
  y: number
  w: number
  h: number
}

export interface ShelfLayoutResult {
  placed: PlacedBook[]
  totalHeight: number
  unmeasured: Book[]
  nonBooks: number
}

const cmp: Record<ShelfSort, (a: Book, b: Book) => number> = {
  acquired: (a, b) =>
    (a.acquiredDate ?? String(a.acquiredYear ?? '9999')).localeCompare(
      b.acquiredDate ?? String(b.acquiredYear ?? '9999'),
    ) || a.title.localeCompare(b.title, 'de'),
  author: (a, b) =>
    (a.primaryAuthor ?? '￿').localeCompare(b.primaryAuthor ?? '￿', 'de') ||
    a.title.localeCompare(b.title, 'de'),
  height: (a, b) =>
    (b.physical.heightMm ?? 0) - (a.physical.heightMm ?? 0) || a.title.localeCompare(b.title, 'de'),
  ddc: (a, b) =>
    (a.ddc?.top ?? 99) - (b.ddc?.top ?? 99) ||
    (a.primaryAuthor ?? '￿').localeCompare(b.primaryAuthor ?? '￿', 'de'),
}

export function shelfLayout(books: Book[], opts: ShelfOpts): ShelfLayoutResult {
  const pxPerMm = opts.pxPerMm ?? 0.55
  const minW = opts.minW ?? 2
  const rowGap = opts.rowGap ?? 14

  const onlyBooks = books.filter((b) => b.mediaType === 'book')
  const nonBooks = books.length - onlyBooks.length
  const measured = onlyBooks.filter(
    (b) => b.physical.heightMm !== null && b.physical.thicknessMm !== null,
  )
  const unmeasured = onlyBooks.filter(
    (b) => b.physical.heightMm === null || b.physical.thicknessMm === null,
  )

  const sorted = [...measured].sort(cmp[opts.sort])

  // Erste Passe: in Reihen einteilen; zweite Passe: y so setzen, dass die
  // Unterkanten einer Reihe auf der Regalkante stehen.
  interface Row { items: { book: Book; w: number; h: number; x: number }[]; maxH: number }
  const rows: Row[] = []
  let cur: Row = { items: [], maxH: 0 }
  let cx = 0
  for (const b of sorted) {
    const w = Math.max(minW, (b.physical.thicknessMm as number) * pxPerMm)
    const h = (b.physical.heightMm as number) * pxPerMm
    if (cx + w > opts.rowWidth && cur.items.length > 0) {
      rows.push(cur)
      cur = { items: [], maxH: 0 }
      cx = 0
    }
    cur.items.push({ book: b, w, h, x: cx })
    cur.maxH = Math.max(cur.maxH, h)
    cx += w
  }
  if (cur.items.length > 0) rows.push(cur)

  const placed: PlacedBook[] = []
  let baseline = 0
  for (const row of rows) {
    baseline += row.maxH
    for (const it of row.items) {
      placed.push({ book: it.book, x: it.x, y: baseline - it.h, w: it.w, h: it.h })
    }
    baseline += rowGap
  }

  return { placed, totalHeight: baseline, unmeasured, nonBooks }
}
```

- [ ] **Step 3: Test laufen lassen — PASS**

- [ ] **Step 4: View-Komponente schreiben (`src/views/Shelf.tsx`)**

Kernidee Rendering: jedes Buch ist ein `<rect>` in einer `<g>` mit `transform: translate(x, y)` als **CSS-Eigenschaft** (`style={{ transform }}`), sodass Sortierwechsel per CSS-Transition animieren (`transition: transform 400ms`), ohne Neuaufbau. `key={book.id}` hält die Identität. `prefers-reduced-motion` schaltet die Transition global ab (global.css).

```tsx
import { scaleLinear } from 'd3-scale'
import { useMemo, useState } from 'react'
import { BookDetail } from '../components/BookDetail'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useLibraryData } from '../lib/DataContext'
import { DDC_COLORS, DDC_SHORT } from '../lib/ddc'
import { fmtInt } from '../lib/format'
import { langLabel, LANG_COLORS } from '../lib/languages'
import type { Book } from '../lib/types'
import { useMeasure } from '../lib/useMeasure'
import { shelfLayout, type ShelfSort } from '../lib/viewData/shelf'
import styles from './Shelf.module.css'

type ColorMode = 'ddc' | 'language' | 'readStatus' | 'acquiredYear'

const NEUTRAL = '#b9b2a5'

const SORT_LABELS: Record<ShelfSort, string> = {
  acquired: 'Erwerb', author: 'Autor·in', height: 'Höhe', ddc: 'Wissensgebiet',
}
const COLOR_LABELS: Record<ColorMode, string> = {
  ddc: 'Wissensgebiet', language: 'Sprache', readStatus: 'Lesestatus', acquiredYear: 'Erwerbsjahr',
}

export function Shelf() {
  const { filtered } = useLibraryData()
  const [sort, setSort] = useState<ShelfSort>('acquired')
  const [color, setColor] = useState<ColorMode>('ddc')
  const [selected, setSelected] = useState<Book | null>(null)
  const [hover, setHover] = useState<{ book: Book; px: number; py: number } | null>(null)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()

  const layout = useMemo(
    () => shelfLayout(filtered, { sort, rowWidth: Math.max(320, width) }),
    [filtered, sort, width],
  )

  const yearScale = useMemo(() => {
    const years = layout.placed
      .map((p) => p.book.acquiredYear)
      .filter((y): y is number => y !== null)
    return scaleLinear<string>()
      .domain([Math.min(...years, 1991), Math.max(...years, 2026)])
      .range(['#cfc7b4', '#223a70'])
  }, [layout])

  if (filtered.length === 0) return <EmptyState />

  const fill = (b: Book): string => {
    switch (color) {
      case 'ddc': return b.ddc ? DDC_COLORS[b.ddc.top] : NEUTRAL
      case 'language': return LANG_COLORS[b.languages[0] ?? ''] ?? NEUTRAL
      case 'readStatus': return b.hasRead ? 'var(--kon)' : 'var(--paper)'
      case 'acquiredYear': return b.acquiredYear !== null ? yearScale(b.acquiredYear) : NEUTRAL
    }
  }
  // Farbe nie alleiniger Träger: ungelesen bekommt zusätzlich eine Kontur.
  const stroke = (b: Book) =>
    color === 'readStatus' && !b.hasRead ? 'var(--sumi)' : 'none'

  const legend = buildLegend(color, layout.placed.map((p) => p.book))

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>Das Regal</h2>
        <CoverageNote covered={layout.placed.length} total={filtered.length}>
          sind Bücher mit Höhen- und Dickenangabe und stehen maßstabsgetreu im Regal
          ({fmtInt(layout.unmeasured.length)} ohne Maße unten, {fmtInt(layout.nonBooks)} Nicht-Bücher
          nicht dargestellt).
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <label>
          Sortierung{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as ShelfSort)}>
            {Object.entries(SORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>
          Farbe{' '}
          <select value={color} onChange={(e) => setColor(e.target.value as ColorMode)}>
            {Object.entries(COLOR_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      <svg width={width} height={layout.totalHeight + 4} role="img" aria-label={`Regal mit ${layout.placed.length} Büchern`}>
        {layout.placed.map((p) => (
          <g key={p.book.id} className={styles.spine} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
            <rect
              width={p.w}
              height={p.h}
              fill={fill(p.book)}
              stroke={stroke(p.book)}
              strokeWidth={1}
              tabIndex={-1}
              onClick={() => setSelected(p.book)}
              onPointerEnter={(e) => {
                const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
                setHover({ book: p.book, px: e.clientX - r.left, py: e.clientY - r.top })
              }}
              onPointerLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      {layout.unmeasured.length > 0 && (
        <section aria-label="Bücher ohne Maßangaben">
          <h3 className={styles.unmeasuredTitle}>
            ohne Maßangaben ({fmtInt(layout.unmeasured.length)}) — Einheitsgröße, nicht maßstäblich
          </h3>
          <svg width={width} height={64}>
            {layout.unmeasured.map((b, i) => {
              const perRow = Math.floor(Math.max(320, width) / 5)
              return (
                <rect
                  key={b.id}
                  x={(i % perRow) * 5}
                  y={(Math.floor(i / perRow)) * 60}
                  width={4}
                  height={56}
                  fill={fill(b)}
                  stroke="var(--ink-45)"
                  strokeDasharray="2 2"
                  strokeWidth={0.5}
                  onClick={() => setSelected(b)}
                >
                  <title>{b.title}</title>
                </rect>
              )
            })}
          </svg>
        </section>
      )}

      <ul className={styles.legend} aria-label="Farblegende">
        {legend.map((l) => (
          <li key={l.label}>
            <i style={{ background: l.color, borderColor: 'var(--ink-45)' }} /> {l.label}{' '}
            <span className={styles.legendCount}>{fmtInt(l.count)}</span>
          </li>
        ))}
      </ul>

      {hover && (
        <Tooltip x={hover.px} y={hover.py + 140}>
          <strong>{hover.book.title}</strong>
          {hover.book.primaryAuthor && <> — {hover.book.primaryAuthor}</>}
        </Tooltip>
      )}
      <BookDetail book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function buildLegend(mode: ColorMode, books: Book[]): { label: string; color: string; count: number }[] {
  const add = (m: Map<string, { color: string; count: number }>, label: string, color: string) => {
    const e = m.get(label)
    if (e) e.count += 1
    else m.set(label, { color, count: 1 })
  }
  const m = new Map<string, { color: string; count: number }>()
  for (const b of books) {
    switch (mode) {
      case 'ddc':
        add(m, b.ddc ? DDC_SHORT[b.ddc.top] : 'ohne Angabe', b.ddc ? DDC_COLORS[b.ddc.top] : NEUTRAL)
        break
      case 'language':
        add(m, b.languages[0] ? langLabel(b.languages[0]) : 'ohne Angabe', LANG_COLORS[b.languages[0] ?? ''] ?? NEUTRAL)
        break
      case 'readStatus':
        add(m, b.hasRead ? 'gelesen' : 'ungelesen (Kontur)', b.hasRead ? '#223a70' : '#f4efe6')
        break
      case 'acquiredYear':
        add(m, b.acquiredYear === null ? 'ohne Erwerbsjahr' : `${Math.floor(b.acquiredYear / 10) * 10}er`, NEUTRAL)
        break
    }
  }
  return [...m].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count)
}
```

(Bei `acquiredYear` zeigt die Legende Dekaden mit neutralem Swatch plus Min/Max-Verlauf — beim Implementieren die zwei Endfarben des Verlaufs als Swatches einsetzen; wichtig ist: Label + Anzahl machen die Legende auch ohne Farbwahrnehmung lesbar.)

`src/views/Shelf.module.css`:

```css
.wrap {
  position: relative;
}

.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.controls {
  display: flex;
  gap: var(--space-5);
  font-size: 14px;
  margin: var(--space-2) 0 var(--space-3);
}

.controls select {
  font: inherit;
}

.spine {
  transition: transform 400ms ease;
  cursor: pointer;
}

.spine rect:hover,
.spine rect:focus-visible {
  stroke: var(--enji);
  stroke-width: 1.5px;
}

.unmeasuredTitle {
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--ink-70);
  margin: var(--space-4) 0 var(--space-1);
}

.legend {
  list-style: none;
  padding: 0;
  margin: var(--space-3) 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  font-size: 14px;
}

.legend i {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1px solid transparent;
  margin-right: 4px;
  vertical-align: -1px;
}

.legendCount {
  font-family: var(--font-mono);
  color: var(--ink-70);
}
```

- [ ] **Step 5: Zum Default machen**

1. `src/lib/types.ts`: `export const DEFAULT_VIEW: ViewId = 'shelf'`
2. `src/App.tsx`: registrieren und `VIEW_ORDER` umstellen auf `['shelf', 'timeline', 'knowledge', 'network', 'languages', 'years', 'pace', 'canon']`:

```tsx
import { Shelf } from './views/Shelf'
// im Registry-Literal:
  shelf: { label: 'Regal', component: Shelf },
```

3. `npx vitest run src/store` — die urlSync-Tests müssen weiter grün sein (sie asserten gegen `DEFAULT_VIEW`, nicht gegen ein Literal; falls doch ein Literal drinsteht, jetzt auf `DEFAULT_VIEW` umstellen).

- [ ] **Step 6: Performance messen (DoD: < 200 ms)**

In den DevTools (Performance-Tab oder `console.time` temporär um das Setzen eines Filters): Filter „Sprache: Japanisch" bei geöffnetem Regal setzen und lösen. Neuzeichnen muss unter 200 ms bleiben. Wenn nicht: erst `React.memo` auf die Spine-Gruppe und Hover-State aus dem SVG heraushalten (CSS `:hover` statt React-State prüfen); nur wenn es dann immer noch ruckelt, Canvas-Fallback mit Trefferindex bauen (dokumentierte Eskalation aus der View-Spec — als eigener Folgetask, nicht nebenbei).

- [ ] **Step 7: Manuelle DoD-Prüfung**

1. Regal ist Startansicht (URL ohne Parameter), Navigation zeigt „Regal" zuerst.
2. Sortierwechsel Erwerb → Höhe: Rücken gleiten an ihre neuen Plätze (mit `prefers-reduced-motion`: springen sofort).
3. Farbmodus-Wechsel: Legende passt sich an, „ungelesen" auch über Kontur erkennbar, „ohne Angabe" ausgewiesen.
4. Sehr dünne Bücher (Manga-Einzelbände) bleiben sichtbar (Mindestbreite 2 px).
5. Hover zeigt Titel; Klick öffnet Detailkarte; ESC schließt sie.
6. Bücher ohne Maße stehen in eigenem, klar beschriftetem Segment.

- [ ] **Step 8: Tests + Typecheck + Commit**

```bash
npm run test && npm run typecheck
git add src
git commit -m "feat: View 6 Regal mit massstabsgetreuen Ruecken, wird Default-View"
```

---

### Task 13: View 7 — Lesetempo

**Files:**
- Create: `src/lib/viewData/pace.ts`, `src/views/ReadingPace.tsx` (+ `.module.css`)
- Modify: `src/App.tsx` (registrieren)
- Test: `src/lib/viewData/pace.test.ts`

**Interfaces:**
- Consumes: `BookDetail`, geteilte Bausteine
- Produces: `paceData(books: Book[]): PaceData` mit `PacePoint { book: Book; pages: number; days: number; suspect: boolean }`, `PaceData { points: PacePoint[]; withDays: number; discardedNegative: number; facets: { lang: string; points: PacePoint[] }[] }`; View `ReadingPace`

- [ ] **Step 1: Failing Test schreiben (`src/lib/viewData/pace.test.ts`)**

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { paceData } from './pace'

const books = [
  mkBook({ readDays: 4, pages: 320, languages: ['de'] }),
  mkBook({ readDays: 150, pages: 900, languages: ['ja'] }),  // > 100 Tage → suspekt
  mkBook({ readDays: -3, pages: 200, languages: ['de'] }),   // Tippfehler → verwerfen und zählen
  mkBook({ readDays: 10, pages: null, languages: ['de'] }),  // ohne Seiten → kein Punkt, zählt in withDays
  mkBook({ readDays: 2, pages: 150, languages: ['sv'] }),    // seltene Sprache → Facette 'andere'
  mkBook({ pages: 300 }),                                    // ohne readDays
]

describe('paceData', () => {
  const d = paceData(books)

  it('Punkte brauchen readDays ≥ 0 und Seitenzahl', () => {
    expect(d.points).toHaveLength(3)
  })
  it('negative Lesedauern werden verworfen und gezählt', () => {
    expect(d.discardedNegative).toBe(1)
  })
  it('withDays zählt alle mit gültiger Lesedauer (auch ohne Seiten)', () => {
    expect(d.withDays).toBe(4)
  })
  it('über 100 Tage gilt als „offen", nicht als Tempo', () => {
    expect(d.points.find((p) => p.days === 150)?.suspect).toBe(true)
    expect(d.points.find((p) => p.days === 4)?.suspect).toBe(false)
  })
  it('Facetten nach Erstsprache, seltene als andere', () => {
    const langs = d.facets.map((f) => f.lang)
    expect(langs).toContain('de')
    expect(langs).toContain('ja')
    expect(d.facets.find((f) => f.lang === 'andere')?.points).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Test laufen lassen — FAIL, dann implementieren (`src/lib/viewData/pace.ts`)**

```ts
import type { Book } from '../types'

export interface PacePoint {
  book: Book
  pages: number
  days: number
  /** > 100 Tage: offen, ob gelesen oder nur nicht abgeschlossen — kein Tempo. */
  suspect: boolean
}

export interface PaceData {
  points: PacePoint[]
  withDays: number
  discardedNegative: number
  facets: { lang: string; points: PacePoint[] }[]
}

const FACET_LANGS = ['de', 'en', 'ja']

export function paceData(books: Book[]): PaceData {
  const withDaysAll = books.filter((b) => b.readDays !== null)
  const negative = withDaysAll.filter((b) => (b.readDays as number) < 0)
  const valid = withDaysAll.filter((b) => (b.readDays as number) >= 0)

  const points: PacePoint[] = valid
    .filter((b) => b.pages !== null)
    .map((b) => ({
      book: b,
      pages: b.pages as number,
      days: b.readDays as number,
      suspect: (b.readDays as number) > 100,
    }))

  const facetOf = (p: PacePoint) => {
    const l = p.book.languages[0]
    return l !== undefined && FACET_LANGS.includes(l) ? l : 'andere'
  }
  const facetMap = new Map<string, PacePoint[]>()
  for (const p of points) {
    const key = facetOf(p)
    const arr = facetMap.get(key)
    if (arr) arr.push(p)
    else facetMap.set(key, [p])
  }
  const order = [...FACET_LANGS, 'andere']
  const facets = order
    .filter((l) => facetMap.has(l))
    .map((lang) => ({ lang, points: facetMap.get(lang) as PacePoint[] }))

  return { points, withDays: valid.length, discardedNegative: negative.length, facets }
}
```

Hinweis: `FACET_LANGS` an die tatsächliche Sprachdarstellung im Generat anpassen (siehe Task 10, ISO-Codes vs. Namen).

- [ ] **Step 3: Test laufen lassen — PASS**

- [ ] **Step 4: View-Komponente schreiben (`src/views/ReadingPace.tsx`)**

Punktwolke Seiten (x, Wurzelskala) gegen Lesedauer (y, Wurzelskala), Orientierungsdiagonalen für 10/50/100 Seiten pro Tag, suspekte Punkte (> 100 Tage) hohl gezeichnet. Facettierung nach Sprache als Small Multiples mit gemeinsamen Skalen — die Vergleichsansicht ist der Kern der View (DoD: „Sprachfacetten vergleichbar nebeneinander").

```tsx
import { scaleSqrt } from 'd3-scale'
import { useMemo, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { BookDetail } from '../components/BookDetail'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { langLabel } from '../lib/languages'
import type { Book } from '../lib/types'
import { useMeasure } from '../lib/useMeasure'
import { paceData, type PacePoint } from '../lib/viewData/pace'
import styles from './ReadingPace.module.css'

const M = { top: 12, right: 16, bottom: 40, left: 48 }
const RATES = [10, 50, 100] // Seiten pro Tag

export function ReadingPace() {
  const { filtered } = useLibraryData()
  const [facet, setFacet] = useState(false)
  const [selected, setSelected] = useState<Book | null>(null)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const data = useMemo(() => paceData(filtered), [filtered])

  if (filtered.length === 0) return <EmptyState />
  if (data.points.length === 0) {
    return (
      <CoverageNote covered={data.withDays} total={filtered.length}>
        im aktuellen Filter haben Start- und Enddatum (davon {fmtInt(data.points.length)} auch
        eine Seitenzahl).
      </CoverageNote>
    )
  }

  const maxPages = Math.max(...data.points.map((p) => p.pages))
  const maxDays = Math.max(...data.points.map((p) => p.days), 1)
  const panels: { lang: string | null; points: PacePoint[] }[] = facet
    ? data.facets.map((f) => ({ lang: f.lang, points: f.points }))
    : [{ lang: null, points: data.points }]
  const panelW = facet ? Math.max(260, Math.floor(width / Math.min(panels.length, 2)) - 16) : width
  const panelH = facet ? 320 : 440

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Lesetempo</h2>
        <CoverageNote covered={data.points.length} total={filtered.length}>
          haben Lesedauer und Seitenzahl — überproportional die bewusst getrackten.{' '}
          {data.discardedNegative > 0 && <>{fmtInt(data.discardedNegative)} negative Dauern verworfen.</>}
        </CoverageNote>
      </header>
      <label className={styles.facetToggle}>
        <input type="checkbox" checked={facet} onChange={(e) => setFacet(e.target.checked)} />{' '}
        nach Sprache facettieren
      </label>

      <div className={facet ? styles.grid : undefined}>
        {panels.map((panel) => {
          const innerW = panelW - M.left - M.right
          const innerH = panelH - M.top - M.bottom
          const x = scaleSqrt().domain([0, maxPages]).range([0, innerW]).nice()
          const y = scaleSqrt().domain([0, maxDays]).range([innerH, 0]).nice()
          return (
            <figure key={panel.lang ?? 'alle'} className={styles.panel}>
              {panel.lang && (
                <figcaption className={styles.caption}>
                  {langLabel(panel.lang)} · {fmtInt(panel.points.length)}
                </figcaption>
              )}
              <svg width={panelW} height={panelH} role="img"
                aria-label={`Seiten gegen Lesedauer${panel.lang ? `, ${langLabel(panel.lang)}` : ''}`}>
                <g transform={`translate(${M.left},${M.top})`}>
                  {RATES.map((rate) => {
                    // Linie tage = seiten / rate, gezeichnet als Polylinie in der Wurzelskala
                    const pts = x.ticks(40)
                      .filter((p) => p / rate <= y.domain()[1])
                      .map((p) => `${x(p)},${y(p / rate)}`)
                    return (
                      <g key={rate}>
                        <polyline points={pts.join(' ')} fill="none" stroke="var(--ink-15)" />
                        <text x={innerW - 4} y={y(Math.min(maxPages / rate, y.domain()[1])) - 4} textAnchor="end" className={styles.rateLabel}>
                          {rate} S./Tag
                        </text>
                      </g>
                    )
                  })}
                  {panel.points.map((p) => (
                    <circle
                      key={p.book.id}
                      cx={x(p.pages)}
                      cy={y(p.days)}
                      r={3.5}
                      className={p.suspect ? styles.dotSuspect : styles.dot}
                      tabIndex={0}
                      role="button"
                      aria-label={`${p.book.title}: ${fmtInt(p.pages)} Seiten in ${fmtInt(p.days)} Tagen`}
                      onClick={() => setSelected(p.book)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelected(p.book)}
                    >
                      <title>{`${p.book.title} — ${fmtInt(p.pages)} S. / ${fmtInt(p.days)} Tage${p.suspect ? ' (über 100 Tage: offen, ob durchgehend gelesen)' : ''}`}</title>
                    </circle>
                  ))}
                  <AxisBottom y={innerH + 4} ticks={x.ticks(6).map((v) => ({ x: x(v), label: fmtInt(v) }))} />
                  <AxisLeft x={-4} ticks={y.ticks(6).map((v) => ({ y: y(v), label: fmtInt(v) }))} />
                  <text x={innerW / 2} y={innerH + 34} textAnchor="middle" className={styles.axisTitle}>Seiten</text>
                  <text transform={`translate(${-36},${innerH / 2}) rotate(-90)`} textAnchor="middle" className={styles.axisTitle}>Tage</text>
                </g>
              </svg>
            </figure>
          )
        })}
      </div>
      <p className={styles.note}>
        Hohle Punkte: über 100 Tage — offen, ob durchgehend gelesen; nicht als Tempo interpretieren.
      </p>
      <BookDetail book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
```

`src/views/ReadingPace.module.css`:

```css
.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.facetToggle {
  display: inline-block;
  font-size: 14px;
  margin: var(--space-2) 0;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.panel {
  margin: 0;
}

.caption {
  font-size: 14px;
  color: var(--ink-70);
}

.dot {
  fill: var(--kon);
  fill-opacity: 0.55;
  cursor: pointer;
}

.dotSuspect {
  fill: none;
  stroke: var(--enji);
  stroke-width: 1.5;
  cursor: pointer;
}

.dot:hover,
.dot:focus-visible,
.dotSuspect:hover,
.dotSuspect:focus-visible {
  stroke: var(--sumi);
  stroke-width: 2;
}

.rateLabel,
.axisTitle {
  font-family: var(--font-mono);
  font-size: 11px;
  fill: var(--ink-70);
}

.note {
  font-size: 14px;
  color: var(--ink-70);
}
```

- [ ] **Step 5: Registrieren + manuelle DoD-Prüfung**

```tsx
import { ReadingPace } from './views/ReadingPace'
// im Registry-Literal:
  pace: { label: 'Lesetempo', component: ReadingPace },
```

1. Grundmenge klar ausgewiesen (~927 von 4.865 ohne Filter; Zahl gegen die Konsole der Normalisierung plausibilisieren).
2. Facettierung an: de/en/ja nebeneinander mit gleichen Skalen — die These „im Original langsamer" ist prüfbar (DoD).
3. Ausreißer (max 209 Tage) hohl gezeichnet; Klick öffnet die Detailkarte; Tab+Enter ebenso.
4. Diagonalen beschriftet (10/50/100 Seiten/Tag).

- [ ] **Step 6: Tests + Typecheck + Commit**

```bash
npm run test && npm run typecheck
git add src
git commit -m "feat: View 7 Lesetempo mit Tempo-Diagonalen und Sprachfacetten"
```

---

### Task 14: View 8 — Kanonabgleich

**Files:**
- Create: `src/lib/viewData/canon.ts`, `src/views/CanonCheck.tsx` (+ `.module.css`)
- Modify: `src/App.tsx` (registrieren), `src/lib/awards.ts` (Synonymtabelle füllen)
- Test: `src/lib/viewData/canon.test.ts`, `src/lib/awards.test.ts`

**Interfaces:**
- Consumes: `canonicalAward`, `AWARD_SYNONYMS` aus Task 4; Store-`toggleFilter`
- Produces: `canonRows(books: Book[], topN?: number): CanonData` mit `CanonRow { list: string; owned: number; read: number }`, `CanonData { rows: CanonRow[]; withAwards: number }`; gefüllte `AWARD_SYNONYMS`; View `CanonCheck`

- [ ] **Step 1: Echte Listennamen inspizieren**

```bash
node -e "const l=require('./public/data/library.json'); console.log(l.stats.awards.slice(0,40))"
```

Daraus die Übersetzungs-Duplikate der großen Kanons identifizieren (dokumentiert: „1001 boeken…", „1001 böcker…" als Übersetzungen von „1001 Books You Must Read Before You Die"; analog „1000 Books…", Harenberg-Varianten). Nur zusammenführen, was erkennbar dieselbe Liste ist — im Zweifel getrennt lassen.

- [ ] **Step 2: Failing Tests schreiben**

`src/lib/awards.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { AWARD_SYNONYMS, canonicalAward } from './awards'

describe('canonicalAward', () => {
  it('führt Übersetzungen derselben Liste zusammen', () => {
    // Die konkreten Schlüssel stammen aus Step 1; dieser Test fixiert das Prinzip
    // an einem realen Paar. Beispiel (anpassen an echte Werte):
    const [synonym, canonical] = Object.entries(AWARD_SYNONYMS)[0] ?? []
    expect(synonym).toBeDefined()
    expect(canonicalAward(synonym as string)).toBe(canonical)
  })
  it('lässt unbekannte Listen unverändert', () => {
    expect(canonicalAward('Ein ganz eigener Preis')).toBe('Ein ganz eigener Preis')
  })
})
```

`src/lib/viewData/canon.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { canonRows } from './canon'

// Test nutzt eine eigene Mini-Synonymik über die echte Tabelle hinweg:
// wir testen mit Listen, die NICHT in AWARD_SYNONYMS stehen, plus einem Paar daraus.
const books = [
  mkBook({ awards: ['Liste A'], hasRead: true }),
  mkBook({ awards: ['Liste A', 'Liste B'] }),
  mkBook({ awards: ['Liste A', 'Liste A'] }), // Duplikat im selben Buch zählt einfach
  mkBook({ awards: ['Liste B'], hasRead: true }),
  mkBook({ awards: [] }),
]

describe('canonRows', () => {
  const d = canonRows(books, 20)

  it('zählt besessen und gelesen je Liste', () => {
    expect(d.rows).toContainEqual({ list: 'Liste A', owned: 3, read: 1 })
    expect(d.rows).toContainEqual({ list: 'Liste B', owned: 2, read: 1 })
  })
  it('sortiert absteigend nach Besitz und begrenzt auf topN', () => {
    expect(d.rows[0].list).toBe('Liste A')
    expect(canonRows(books, 1).rows).toHaveLength(1)
  })
  it('withAwards = Bücher mit mindestens einer Liste', () => {
    expect(d.withAwards).toBe(4)
  })
})
```

- [ ] **Step 3: Tests laufen lassen — FAIL, dann implementieren**

`src/lib/awards.ts` — Tabelle füllen (Werte aus Step 1; hier die dokumentierten Fälle als Startpunkt, exakte Schreibweise gegen die echten Daten prüfen):

```ts
export const AWARD_SYNONYMS: Record<string, string> = {
  '1001 boeken die je gelezen moet hebben': '1001 Books You Must Read Before You Die',
  '1001 böcker du måste läsa innan du dör': '1001 Books You Must Read Before You Die',
  '1001 libros que hay que leer antes de morir': '1001 Books You Must Read Before You Die',
  // … weitere Funde aus stats.awards ergänzen; im Zweifel NICHT zusammenführen.
}
```

`src/lib/viewData/canon.ts`:

```ts
import { canonicalAward } from '../awards'
import type { Book } from '../types'

export interface CanonRow {
  list: string
  owned: number
  read: number
}

export interface CanonData {
  rows: CanonRow[]
  withAwards: number
}

export function canonRows(books: Book[], topN = 20): CanonData {
  const byList = new Map<string, { owned: number; read: number }>()
  let withAwards = 0
  for (const b of books) {
    const lists = [...new Set(b.awards.map(canonicalAward))]
    if (lists.length > 0) withAwards += 1
    for (const list of lists) {
      const e = byList.get(list) ?? { owned: 0, read: 0 }
      e.owned += 1
      if (b.hasRead) e.read += 1
      byList.set(list, e)
    }
  }
  const rows = [...byList]
    .map(([list, v]) => ({ list, ...v }))
    .sort((a, b) => b.owned - a.owned || a.list.localeCompare(b.list, 'de'))
    .slice(0, topN)
  return { rows, withAwards }
}
```

- [ ] **Step 4: Tests laufen lassen — PASS**

- [ ] **Step 5: View-Komponente schreiben (`src/views/CanonCheck.tsx`)**

Balkenliste: pro Liste ein Balken für den Besitz (helle Fläche) mit Lese-Anteil (kon) darin, Zahlen als Text. **Keine Prozentangaben** — der Nenner (Listenumfang) ist unbekannt (DoD).

```tsx
import { useMemo, useState } from 'react'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { canonRows } from '../lib/viewData/canon'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './CanonCheck.module.css'

export function CanonCheck() {
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const addFilter = useFilterStore((s) => s.addFilter)
  const [topN, setTopN] = useState(20)
  const data = useMemo(() => canonRows(filtered, topN), [filtered, topN])

  if (filtered.length === 0) return <EmptyState />
  if (data.rows.length === 0) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        im aktuellen Filter stehen auf einer Auszeichnungs- oder Kanonliste.
      </CoverageNote>
    )
  }

  const max = data.rows[0].owned
  const hasUnreadFilter = filters.some((f) => sameFilter(f, { kind: 'readStatus', value: 'unread' }))
  const isActive = (list: string) => filters.some((f) => sameFilter(f, { kind: 'award', value: list }))

  return (
    <div>
      <header className={styles.head}>
        <h2>Kanonabgleich</h2>
        <CoverageNote covered={data.withAwards} total={filtered.length}>
          stehen auf mindestens einer Liste. Angaben sind „im Bestand", nicht „von der
          Liste erledigt" — der Listenumfang ist aus dem Export nicht bekannt.
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <label>
          Listen anzeigen:{' '}
          <select value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
            {[10, 20, 40].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        {!hasUnreadFilter && (
          <button
            className={styles.action}
            onClick={() => addFilter({ kind: 'readStatus', value: 'unread' })}
          >
            Nur Ungelesene → Leseliste
          </button>
        )}
      </div>

      <ol className={styles.rows}>
        {data.rows.map((r) => (
          <li key={r.list}>
            <button
              className={styles.row}
              aria-pressed={isActive(r.list)}
              onClick={() => toggleFilter({ kind: 'award', value: r.list })}
              title={r.list}
            >
              <span className={styles.listName}>{r.list}</span>
              <span className={styles.barTrack}>
                <span className={styles.barOwned} style={{ width: `${(r.owned / max) * 100}%` }}>
                  <span className={styles.barRead} style={{ width: `${r.owned === 0 ? 0 : (r.read / r.owned) * 100}%` }} />
                </span>
              </span>
              <span className={styles.counts}>
                {fmtInt(r.owned)} im Bestand · {fmtInt(r.read)} gelesen
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

`src/views/CanonCheck.module.css`:

```css
.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.controls {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  margin: var(--space-2) 0 var(--space-3);
  font-size: 14px;
}

.action {
  border: 1px solid var(--enji);
  background: none;
  color: var(--enji);
  border-radius: var(--radius);
  padding: 2px var(--space-2);
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-1);
}

.row {
  display: grid;
  grid-template-columns: minmax(12rem, 22rem) 1fr max-content;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  border: none;
  background: none;
  padding: var(--space-1) var(--space-2);
  text-align: left;
  font-size: 14px;
}

.row[aria-pressed='true'] {
  outline: 1px solid var(--kon);
  background: var(--paper);
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

.barRead {
  display: block;
  height: 100%;
  background: var(--kon);
}

.counts {
  font-family: var(--font-mono);
  color: var(--ink-70);
  white-space: nowrap;
}
```

(Der Lese-Anteil ist als gefüllter Teilbalken **im** Besitzbalken dargestellt plus als Zahl — Verhältnis zweier bekannter Größen, keine Prozentangabe gegen unbekannten Nenner.)

- [ ] **Step 6: Registrieren + manuelle DoD-Prüfung**

```tsx
import { CanonCheck } from './views/CanonCheck'
// im Registry-Literal:
  canon: { label: 'Kanon', component: CanonCheck },
```

1. Harenberg (~182), „1001 Books" (~150), „1000 Books" (~116) vorn; Übersetzungsvarianten tauchen NICHT als eigene Zeilen auf (Stichprobe in `stats.awards` gegenprüfen).
2. Nirgends ein Prozentzeichen (DoD).
3. Klick auf Liste setzt Chip „Liste: …"; kombiniert mit „Nur Ungelesene" entsteht die Leseliste; Regal-View zeigt dann genau diese Bücher.
4. Lange Listennamen (CJK, Übersetzungen) werden per Ellipsis gekürzt, voller Name im Title-Attribut.

- [ ] **Step 7: Tests + Typecheck + Commit**

```bash
npm run test && npm run typecheck
git add src
git commit -m "feat: View 8 Kanonabgleich mit Synonymzusammenfuehrung, ohne Prozente"
```

---

### Task 15: Abschluss — Gesamtverifikation und Doku

**Files:**
- Modify: `README.md` (Abschnitt „Stand")

**Interfaces:**
- Consumes: alles Vorherige
- Produces: verifizierter Endstand

- [ ] **Step 1: Alles laufen lassen**

```bash
npm run normalize   # Kennzahlen nochmals gegen docs/datenprofil.md
npm run test        # alle Suites grün
npm run typecheck
npm run build       # muss ein statisches dist/ erzeugen
npm run preview     # Stichprobe: Regal als Start, ein Filter quer durch 3 Views
```

- [ ] **Step 2: Gesamt-Smoke über die Definition of Done aller Views**

Im Preview einmal durchklicken: In jeder der acht Views einen Filter setzen und prüfen, dass (a) Chip erscheint, (b) URL sich ändert, (c) zwei andere Views reagieren, (d) Back-Button den Schritt zurücknimmt, (e) CoverageNote sichtbar ist. Bei Befund: Task-bezogen fixen, nicht hier flicken.

- [ ] **Step 3: README aktualisieren**

Abschnitt „Stand" ersetzen durch:

```markdown
## Stand

Anwendung vollständig: Fundament (Filter-Store, URL-Sync, Shell) und alle acht
Views aus `docs/visualisierungen.md`. Start mit `npm run dev`, statischer Build
mit `npm run build`. Datengrundlage einmalig per
`node scripts/normalize.mjs <export.json>` erzeugen.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: Stand nach Fertigstellung aller acht Views"
```

---

## Plan-Selbstprüfung (durchgeführt)

- **Spec-Abdeckung:** Shell/Chips/URL (Tasks 5–6), erweiterte Filter-Union (Task 4), alle acht Views (7–14), Regal wird Default (12), Tests für Normalizer/Filterlogik/URL-Roundtrip (2, 4, 5), Fehlerzustände inkl. fehlender `library.json` (6), Abschluss (15).
- **Bewusste Abweichungen von Spec/Doku, jeweils am Task dokumentiert:** wiederholte URL-Parameter statt kommagetrennt (Task 5); Sankey ohne Übergangsanimation (Task 10); View-2-Treemap-Alternative weggelassen (YAGNI — Streamgraph erfüllt die DoD allein).
- **Bekannte Unschärfen, die die Ausführung am echten Generat auflösen muss:** exakte Helfer-Signaturen des Normalizers (Task 2), Sprachdarstellung ISO-Code vs. Name (Tasks 10/13), exakte `stats`-Schlüssel (Task 3), echte Listennamen für `AWARD_SYNONYMS` (Task 14).




