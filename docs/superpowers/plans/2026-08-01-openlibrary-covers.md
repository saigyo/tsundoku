# OpenLibrary-Cover im Buch-Detail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Buch-Detail-Popup zeigt für Bücher mit gültiger ISBN das OpenLibrary-Cover (Größe M, Opt-in) und verlinkt die OpenLibrary-Buchseite.

**Architecture:** Reine URL-/Normalisierungsfunktionen in `src/lib/openlibrary.ts`; ein kleiner Zustand-Store `src/store/covers.ts` hält das Opt-in (localStorage `tsundoku.covers`); `BookDetail.tsx` bekommt einen Cover-Block mit drei Zuständen (Opt-in-Platzhalter, Bild, „Kein Cover" bei 404) und den Link; `Footer.tsx` einen Abschalt-Toggle. Sechs neue i18n-Keys in allen fünf Bundles — Übersetzungen stehen wortgenau in diesem Plan.

**Tech Stack:** React + TypeScript, Zustand, CSS Modules, Vitest (jsdom).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-openlibrary-covers-design.md`.
- Nur das Detail-Popup lädt Cover — nie Regal, Listen oder andere Views (Rate-Limit: 100 ISBN-Anfragen/IP pro 5 Min).
- Cover-URL exakt: `https://covers.openlibrary.org/b/isbn/<isbn>-M.jpg?default=false`; Buchseiten-URL exakt: `https://openlibrary.org/isbn/<isbn>`.
- localStorage-Schlüssel exakt `tsundoku.covers`, Wert `'1'` = aktiviert; Lesen/Schreiben in try/catch (Muster: `src/i18n/LocaleContext.tsx`).
- UI-Texte nie hart in Komponenten — ausschließlich über `useI18n()`/Message-Bundles; die Übersetzungen aus diesem Plan **zeichengenau** übernehmen, nicht umformulieren.
- Kommentare im Code auf Deutsch (bestehende Konvention), Bezeichner Englisch.
- Tests laufen mit `npx vitest run` (jsdom, localStorage vorhanden); TypeScript-Check mit `npx tsc --noEmit` (IDE-Diagnostik ist auf diesem System unzuverlässig — nur tsc/vitest zählen).
- Keine neuen Dependencies.

---

### Task 1: ISBN-Normalisierung und URL-Bau (`src/lib/openlibrary.ts`)

**Files:**
- Create: `src/lib/openlibrary.ts`
- Test: `src/lib/openlibrary.test.ts`

**Interfaces:**
- Consumes: nichts (reine Funktionen).
- Produces: `normalizeIsbn(raw: string): string | null`, `coverUrl(isbn: string): string | null`, `bookUrl(isbn: string): string | null` — Task 4 importiert alle drei.

- [ ] **Step 1: Failing Test schreiben** — `src/lib/openlibrary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { bookUrl, coverUrl, normalizeIsbn } from './openlibrary'

describe('normalizeIsbn', () => {
  it('lässt saubere ISBN-10 und ISBN-13 durch', () => {
    expect(normalizeIsbn('0195121236')).toBe('0195121236')
    expect(normalizeIsbn('9784904454015')).toBe('9784904454015')
  })
  it('entfernt Bindestriche und Leerzeichen', () => {
    expect(normalizeIsbn('978-3-86832-485-3')).toBe('9783868324853')
    expect(normalizeIsbn('3 499 22662 2')).toBe('3499226622')
  })
  it('hebt das Prüfzeichen x an', () => {
    expect(normalizeIsbn('080442957x')).toBe('080442957X')
  })
  it('weist andere Längen zurück', () => {
    // 12 Stellen — abgeschnittene ISBN, real im Datenbestand
    expect(normalizeIsbn('978-4-904454-01')).toBeNull()
    expect(normalizeIsbn('12345')).toBeNull()
    expect(normalizeIsbn('')).toBeNull()
  })
  it('weist Buchstaben außer dem Prüfzeichen zurück', () => {
    expect(normalizeIsbn('B00X4WHP5E')).toBeNull() // ASIN, keine ISBN
    expect(normalizeIsbn('123456789Y')).toBeNull()
  })
})

describe('coverUrl / bookUrl', () => {
  it('baut die M-Cover-URL mit default=false', () => {
    expect(coverUrl('978-3-86832-485-3')).toBe(
      'https://covers.openlibrary.org/b/isbn/9783868324853-M.jpg?default=false',
    )
  })
  it('baut die Buchseiten-URL', () => {
    expect(bookUrl('0195121236')).toBe('https://openlibrary.org/isbn/0195121236')
  })
  it('reicht ungültige ISBNs als null durch', () => {
    expect(coverUrl('978-4-904454-01')).toBeNull()
    expect(bookUrl('nope')).toBeNull()
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/lib/openlibrary.test.ts`
Expected: FAIL („Failed to load … openlibrary" — Modul existiert nicht).

- [ ] **Step 3: Implementierung** — `src/lib/openlibrary.ts`:

```ts
/** OpenLibrary-URLs für das Buch-Detail. Nur das Detail-Popup lädt Cover:
 *  ISBN-basierte Cover-Abfragen sind auf 100 Anfragen/IP pro 5 Minuten
 *  rate-limitiert — Einzelabrufe sind sicher, Listenansichten wären es nicht. */

/** Bindestriche/Leerzeichen entfernen, Prüfzeichen x anheben. Nur Längen 10
 *  und 13 gelten; keine Prüfziffernvalidierung (Spec). Der Datenbestand
 *  enthält u. a. eine auf 12 Stellen abgeschnittene ISBN — die liefert null. */
export function normalizeIsbn(raw: string): string | null {
  const s = raw.replace(/[-\s]/g, '').toUpperCase()
  return /^[0-9]{9}[0-9X]$|^[0-9]{13}$/.test(s) ? s : null
}

/** Cover Größe M; ?default=false lässt fehlende Cover als 404 antworten
 *  statt als leeres 1×1-GIF, sodass onError im <img> greift. */
export function coverUrl(isbn: string): string | null {
  const n = normalizeIsbn(isbn)
  return n === null ? null : `https://covers.openlibrary.org/b/isbn/${n}-M.jpg?default=false`
}

/** Buchseite; OpenLibrary leitet auf die Editionsseite weiter. */
export function bookUrl(isbn: string): string | null {
  const n = normalizeIsbn(isbn)
  return n === null ? null : `https://openlibrary.org/isbn/${n}`
}
```

- [ ] **Step 4: Tests laufen lassen — müssen grün sein**

Run: `npx vitest run src/lib/openlibrary.test.ts`
Expected: PASS (8 Tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/openlibrary.ts src/lib/openlibrary.test.ts
git commit -m "feat(covers): ISBN-Normalisierung und OpenLibrary-URLs"
```

---

### Task 2: Opt-in-Store (`src/store/covers.ts`)

**Files:**
- Create: `src/store/covers.ts`
- Test: `src/store/covers.test.ts`

**Interfaces:**
- Consumes: nichts.
- Produces: `useCoversStore` (Zustand-Hook) mit `{ enabled: boolean, setEnabled(v: boolean): void }` — Tasks 4 und 5 lesen `enabled` und rufen `setEnabled`.

- [ ] **Step 1: Failing Test schreiben** — `src/store/covers.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCoversStore } from './covers'

describe('useCoversStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useCoversStore.setState({ enabled: false })
  })

  it('liest den gespeicherten Zustand beim Start', async () => {
    localStorage.setItem('tsundoku.covers', '1')
    vi.resetModules()
    const { useCoversStore: fresh } = await import('./covers')
    expect(fresh.getState().enabled).toBe(true)
  })

  it('persistiert das Einschalten als "1"', () => {
    useCoversStore.getState().setEnabled(true)
    expect(useCoversStore.getState().enabled).toBe(true)
    expect(localStorage.getItem('tsundoku.covers')).toBe('1')
  })

  it('entfernt den Eintrag beim Ausschalten', () => {
    useCoversStore.getState().setEnabled(true)
    useCoversStore.getState().setEnabled(false)
    expect(useCoversStore.getState().enabled).toBe(false)
    expect(localStorage.getItem('tsundoku.covers')).toBeNull()
  })

  it('überlebt werfendes localStorage (Private Mode, Quota)', () => {
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota')
    }
    try {
      useCoversStore.getState().setEnabled(true)
      expect(useCoversStore.getState().enabled).toBe(true)
    } finally {
      Storage.prototype.setItem = orig
    }
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/store/covers.test.ts`
Expected: FAIL (Modul existiert nicht).

- [ ] **Step 3: Implementierung** — `src/store/covers.ts`:

```ts
import { create } from 'zustand'

const STORAGE_KEY = 'tsundoku.covers'

/** Opt-in für OpenLibrary-Cover: gilt global und dauerhaft (nicht pro Buch
 *  oder Bibliothek), widerrufbar über den Fußzeilen-Schalter. Beim Laden
 *  gehen ISBN und Request-Metadaten an covers.openlibrary.org — deshalb
 *  Opt-in statt Default. */
function readStored(): boolean {
  // localStorage kann werfen (Safari Private Mode, abgeschaltete Cookies)
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

interface CoversState {
  enabled: boolean
  setEnabled: (v: boolean) => void
}

export const useCoversStore = create<CoversState>()((set) => ({
  enabled: readStored(),
  setEnabled: (v) => {
    try {
      if (v) localStorage.setItem(STORAGE_KEY, '1')
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Persistenz ist Komfort, keine Voraussetzung
    }
    set({ enabled: v })
  },
}))
```

- [ ] **Step 4: Tests laufen lassen — müssen grün sein**

Run: `npx vitest run src/store/covers.test.ts`
Expected: PASS (4 Tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/covers.ts src/store/covers.test.ts
git commit -m "feat(covers): Opt-in-Store mit localStorage-Persistenz"
```

---

### Task 3: i18n-Keys in Interface und allen fünf Bundles

**Files:**
- Modify: `src/i18n/messages.ts` (Gruppen `detail` und `footer`)
- Modify: `src/i18n/de.tsx`, `src/i18n/en.tsx`, `src/i18n/fr.tsx`, `src/i18n/es.tsx`, `src/i18n/ja.tsx`

**Interfaces:**
- Consumes: bestehendes `Messages`-Interface.
- Produces: `m.detail.coverAlt(title: string): string`, `m.detail.coverLoad`, `m.detail.coverNote`, `m.detail.coverNone`, `m.detail.viewOnOl` (alle `string`), `m.footer.covers: string` — Tasks 4 und 5 verwenden sie.

**Die Übersetzungen unten sind verbindlich und zeichengenau zu übernehmen** (inklusive typografischer Apostrophe/Gedankenstriche, `↗` und CJK-Leerzeichen). Nichts umformulieren, nichts „verbessern".

- [ ] **Step 1: Interface erweitern** — in `src/i18n/messages.ts`, Gruppe `detail`, direkt vor `close: string` einfügen:

```ts
    coverAlt: (title: string) => string
    coverLoad: string
    coverNote: string
    coverNone: string
    viewOnOl: string
```

In der Gruppe `footer` direkt vor `languageAria: string` einfügen:

```ts
    covers: string
```

- [ ] **Step 2: TypeScript-Check — muss fehlschlagen**

Run: `npx tsc --noEmit`
Expected: FAIL — alle fünf Bundles melden fehlende Properties.

- [ ] **Step 3: Bundles ergänzen** — in jeder Sprachdatei in der Gruppe `detail` direkt vor der Zeile `close: …` einfügen, in der Gruppe `footer` direkt vor der Zeile `languageAria: …`:

`src/i18n/de.tsx`:

```ts
    coverAlt: (title) => `Cover: ${title}`,
    coverLoad: 'Cover von OpenLibrary laden',
    coverNote: 'Dabei wird die ISBN an covers.openlibrary.org übermittelt. Einmal zustimmen genügt — abschaltbar in der Fußzeile.',
    coverNone: 'Kein Cover',
    viewOnOl: 'Bei OpenLibrary ansehen ↗',
```

```ts
    covers: 'Cover von OpenLibrary',
```

`src/i18n/en.tsx`:

```ts
    coverAlt: (title) => `Cover: ${title}`,
    coverLoad: 'Load cover from OpenLibrary',
    coverNote: 'This sends the ISBN to covers.openlibrary.org. Agreeing once is enough — turn it off any time in the footer.',
    coverNone: 'No cover',
    viewOnOl: 'View on OpenLibrary ↗',
```

```ts
    covers: 'Covers from OpenLibrary',
```

`src/i18n/fr.tsx`:

```ts
    coverAlt: (title) => `Couverture : ${title}`,
    coverLoad: 'Charger la couverture depuis OpenLibrary',
    coverNote: 'L’ISBN est alors transmis à covers.openlibrary.org. Un seul accord suffit — désactivable à tout moment dans le pied de page.',
    coverNone: 'Pas de couverture',
    viewOnOl: 'Voir sur OpenLibrary ↗',
```

```ts
    covers: 'Couvertures OpenLibrary',
```

`src/i18n/es.tsx`:

```ts
    coverAlt: (title) => `Portada: ${title}`,
    coverLoad: 'Cargar la portada desde OpenLibrary',
    coverNote: 'Esto envía el ISBN a covers.openlibrary.org. Basta con aceptar una vez — puedes desactivarlo en el pie de página.',
    coverNone: 'Sin portada',
    viewOnOl: 'Ver en OpenLibrary ↗',
```

```ts
    covers: 'Portadas de OpenLibrary',
```

`src/i18n/ja.tsx`:

```ts
    coverAlt: (title) => `表紙: ${title}`,
    coverLoad: 'OpenLibrary から表紙を読み込む',
    coverNote: '読み込み時に ISBN が covers.openlibrary.org に送信されます。同意は一度だけで済み、フッターでいつでも解除できます。',
    coverNone: '表紙なし',
    viewOnOl: 'OpenLibrary で見る ↗',
```

```ts
    covers: 'OpenLibrary の表紙',
```

- [ ] **Step 4: Checks — müssen grün sein**

Run: `npx tsc --noEmit && npx vitest run src/i18n`
Expected: tsc ohne Fehler; Bundle-Smoke-Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/messages.ts src/i18n/de.tsx src/i18n/en.tsx src/i18n/fr.tsx src/i18n/es.tsx src/i18n/ja.tsx
git commit -m "feat(covers): i18n-Keys für Cover-Block, Opt-in und OpenLibrary-Link"
```

---

### Task 4: Cover-Block und OpenLibrary-Link im Detail-Popup

**Files:**
- Modify: `src/components/BookDetail.tsx`
- Modify: `src/components/BookDetail.module.css`

**Interfaces:**
- Consumes: `normalizeIsbn`, `coverUrl`, `bookUrl` aus `../lib/openlibrary` (Task 1); `useCoversStore` aus `../store/covers` (Task 2); `m.detail.coverAlt/coverLoad/coverNote/coverNone/viewOnOl` (Task 3).
- Produces: nichts, das spätere Tasks konsumieren.

- [ ] **Step 1: Cover-Komponente und Kopfbereich einbauen** — `src/components/BookDetail.tsx`:

Imports erweitern (bestehende Zeilen 1–6; `useState` kommt hinzu, zwei neue Import-Zeilen):

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import { langLabel } from '../lib/languages'
import { bookUrl, coverUrl, normalizeIsbn } from '../lib/openlibrary'
import type { Book, Filter } from '../lib/types'
import { useCoversStore } from '../store/covers'
import { filterLabel, sameFilter, useFilterStore } from '../store/filters'
import styles from './BookDetail.module.css'
```

Nach der `BookDetail`-Funktion (Dateiende) diese Komponente ergänzen:

```tsx
/** Cover-Block mit drei Zuständen: Opt-in-Platzhalter, Bild, „Kein Cover"
 *  (404 via onError). Wird mit key={book.id} eingesetzt, damit der
 *  Fehlerzustand beim Wechsel zum nächsten Buch zurückgesetzt wird. */
function Cover({ isbn, title }: { isbn: string; title: string }) {
  const { m } = useI18n()
  const enabled = useCoversStore((s) => s.enabled)
  const setEnabled = useCoversStore((s) => s.setEnabled)
  const [failed, setFailed] = useState(false)
  if (!enabled) {
    return (
      <div className={styles.cover}>
        <button className={styles.coverLoad} onClick={() => setEnabled(true)}>
          {m.detail.coverLoad}
        </button>
        <p className={styles.coverNote}>{m.detail.coverNote}</p>
      </div>
    )
  }
  if (failed) {
    return (
      <div className={styles.cover}>
        <span className={styles.coverNone}>{m.detail.coverNone}</span>
      </div>
    )
  }
  return (
    <div className={styles.cover}>
      {/* isbn kommt bereits normalisiert vom Aufrufer, coverUrl kann nicht null sein */}
      <img
        className={styles.coverImg}
        src={coverUrl(isbn)!}
        alt={m.detail.coverAlt(title)}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
```

In der `BookDetail`-Funktion nach der Zeile `if (!book) return <dialog ref={ref} />` ergänzen:

```tsx
  // Cover und Link nur bei gültiger ISBN; die ISBN-Zeile in rows zeigt weiter den Rohwert.
  const isbn = book.isbn === null ? null : normalizeIsbn(book.isbn)
  const olUrl = isbn === null ? null : bookUrl(isbn)
```

Den bisherigen Block aus `<h3 …>` und `<p className={styles.authors}>…</p>` in einen Kopfbereich mit Cover fassen (der Inhalt von Titel und Autoren bleibt unverändert):

```tsx
      <div className={styles.head}>
        <div className={styles.headText}>
          <h3 className={styles.title}>{book.title}</h3>
          <p className={styles.authors}>
            {/* … bestehender Autoren-Code unverändert … */}
          </p>
        </div>
        {isbn !== null && <Cover key={book.id} isbn={isbn} title={book.title} />}
      </div>
```

Den bisherigen LibraryThing-Link-Block (`{book.workCode !== null && (…)}`) durch einen gemeinsamen Link-Absatz ersetzen:

```tsx
      {(book.workCode !== null || olUrl !== null) && (
        <p className={styles.ltLink}>
          {book.workCode !== null && (
            <a
              href={`https://www.librarything.com/work/${book.workCode}/book/${book.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {m.detail.viewOnLt}
            </a>
          )}
          {book.workCode !== null && olUrl !== null && (
            <span aria-hidden="true"> · </span>
          )}
          {olUrl !== null && (
            <a href={olUrl} target="_blank" rel="noopener noreferrer">
              {m.detail.viewOnOl}
            </a>
          )}
        </p>
      )}
```

- [ ] **Step 2: Styles ergänzen** — an `src/components/BookDetail.module.css` anhängen:

```css
.head {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
}

.headText {
  flex: 1;
  min-width: 0;
}

/* Reservierte Coverfläche 2:3 — kein Layoutsprung durch nachladende Bilder.
   Dient zugleich als Opt-in-Platzhalter und als „Kein Cover"-Fläche. */
.cover {
  flex-shrink: 0;
  width: 120px;
  aspect-ratio: 2 / 3;
  background: var(--shironeri);
  border: 1px solid var(--ink-15);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2);
  text-align: center;
  overflow: hidden;
}

.coverImg {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.coverLoad {
  border: 1px solid var(--ink-45);
  background: none;
  color: var(--ink-70);
  border-radius: var(--radius);
  padding: 2px var(--space-2);
  font-size: 12px;
  line-height: 1.3;
}

.coverNote {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--ink-70);
}

.coverNone {
  font-size: 12px;
  color: var(--ink-70);
}
```

- [ ] **Step 3: Checks**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc ohne Fehler, gesamte Suite PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/BookDetail.tsx src/components/BookDetail.module.css
git commit -m "feat(covers): Cover-Block mit Opt-in und OpenLibrary-Link im Detail-Popup"
```

---

### Task 5: Fußzeilen-Schalter und README-Absatz

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/Footer.module.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: `useCoversStore` (Task 2), `m.footer.covers` (Task 3).
- Produces: nichts.

- [ ] **Step 1: Schalter einbauen** — `src/components/Footer.tsx`:

Import ergänzen:

```tsx
import { useCoversStore } from '../store/covers'
```

In der Komponente:

```tsx
  const coversEnabled = useCoversStore((s) => s.enabled)
  const setCoversEnabled = useCoversStore((s) => s.setEnabled)
```

Zwischen dem `m.footer.embedded`-Link und dem Sprach-`<select>` (nach dem dortigen `</a>`) einfügen:

```tsx
      <span className={styles.sep} aria-hidden="true">·</span>
      <label className={styles.covers}>
        <input
          type="checkbox"
          checked={coversEnabled}
          onChange={(e) => setCoversEnabled(e.target.checked)}
        />
        {m.footer.covers}
      </label>
```

- [ ] **Step 2: Style ergänzen** — an `src/components/Footer.module.css` anhängen:

```css
.covers {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
```

- [ ] **Step 3: README-Absatz** — in `README.md` direkt nach dem Absatz, der mit „The file never leaves the browser…" beginnt (endet auf „…exported in filtered form from LibraryThing."), als eigenen Absatz einfügen:

```markdown
The one **opt-in** exception: book covers in the detail popup. Enable them
once (button in the popup) and the app fetches the cover of the currently
opened book from OpenLibrary — transmitting that book's ISBN, plus the usual
request metadata, to covers.openlibrary.org. Nothing else is sent, and the
toggle in the footer turns covers off again at any time.
```

- [ ] **Step 4: Checks**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc ohne Fehler, gesamte Suite PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Footer.tsx src/components/Footer.module.css README.md
git commit -m "feat(covers): Fußzeilen-Schalter und README-Hinweis zum Cover-Opt-in"
```
