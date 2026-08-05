# Interaktives Titel-Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Hover-Tooltips mit Buchlisten (Erwerb & Lektüre, Tag-Trends) werden zu betretbaren, nicht-modalen Popups mit klickbarer, chronologisch sortierter Titelliste und Weg zur Buch-Detailansicht.

**Architecture:** Drei neue Bausteine — Sortier-Helfer `sortBooksByDate` (rein, Vitest-getestet), Lebenszyklus-Hook `useBookListPopup` (Zustandsautomat armed/grace/pinned, Esc-/Außenklick-Listener) und Präsentationskomponente `BookListPopup` (Sumi-Popover mit Datumsspalte, internem Scroll, Viewport-Klemmung). Beide Views ersetzen ihren passiven Titel-Tooltip durch Hook + Komponente und erhalten `BookDetail` nach dem Muster von `ReadingPace`. Der passive `Tooltip` bleibt für die Ungelesen-Kurve.

**Tech Stack:** React + TypeScript, CSS Modules, Vitest. Keine neuen Dependencies.

**Spec:** `docs/superpowers/specs/2026-08-05-book-list-popup-design.md` (freigegeben) — der Zustandsautomat dort ist die verbindliche Verhaltensreferenz.

## Global Constraints

- Kommentare Deutsch, Bezeichner Englisch; UI-Texte nie hart in Komponenten, alle fünf Bundles (de/en/fr/es/ja) synchron mit `messages.ts`.
- Typografie der Bundles: de „…“ = U+201E/U+201C; fr schmales geschütztes Leerzeichen U+202F (Bytes `e2 80 af`) vor `:` und innen in `« … »`, Apostroph U+2019; en gerade Anführungszeichen `"…"` (Dateikonvention); es `«…»` ohne Innenabstand; ja Zählwort 件 und Vollbreiten-Doppelpunkt `：`.
- Die Klick-Semantik der Charts bleibt unverändert (Brush, Ein-Jahres-Klick in Tag-Trends); das Popup wird nur durch Hineinfahren interaktiv.
- Zahlwerte aus der Spec: Gnadenfrist 250 ms, Anker-Versatz 12 px, `max-width: 26rem`, Liste `max-height: 50vh`.
- Rules of Hooks: neue States/Effekte in den Views VOR den Early-Returns.
- **Jeder Commit trägt beide Trailer-Zeilen** (Co-Authored-By + Claude-Session), Message per `-F`-Datei (zsh zerlegt Sonderzeichen in `-m`); Befehle mit `&&` verketten, nie `;`.
- Vor jedem Commit (Repo-Root): `npx tsc --noEmit` sauber, `npx vitest run` grün, `npx vite build` fehlerfrei. Kein Dev-Server, Port 5174 nie anfassen.

---

### Task 1: Sortier-Helfer `sortBooksByDate`

**Files:**
- Create: `src/lib/bookListPopup.ts`
- Test: `src/lib/bookListPopup.test.ts`

**Interfaces:**
- Consumes: `Book` aus `src/lib/types` (Felder `title: string`, `acquiredDate: string | null`, `readDate: string | null`).
- Produces: `sortBooksByDate(books: Book[], dateOf: (b: Book) => string | null): Book[]` — neue, sortierte Liste; Eingabe unverändert.

- [ ] **Step 1: Failing Tests schreiben** — `src/lib/bookListPopup.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sortBooksByDate } from './bookListPopup'
import type { Book } from './types'

/** Minimal-Buch: die Sortierung liest nur title und das dateOf-Feld. */
const book = (title: string, acquiredDate: string | null): Book =>
  ({ title, acquiredDate }) as Book

const dateOf = (b: Book) => b.acquiredDate

describe('sortBooksByDate', () => {
  it('sortiert datierte Titel chronologisch (ISO-Stringordnung)', () => {
    const out = sortBooksByDate(
      [book('B', '2009-11-27'), book('A', '2009-01-12'), book('C', '2009-02-03')],
      dateOf,
    )
    expect(out.map((b) => b.title)).toEqual(['A', 'C', 'B'])
  })

  it('stellt undatierte Titel ans Ende, untereinander alphabetisch', () => {
    const out = sortBooksByDate(
      [book('Zebra', null), book('Mitte', '2009-06-01'), book('Anfang', null)],
      dateOf,
    )
    expect(out.map((b) => b.title)).toEqual(['Mitte', 'Anfang', 'Zebra'])
  })

  it('mutiert die Eingabe nicht', () => {
    const input = [book('B', '2010-01-01'), book('A', '2009-01-01')]
    sortBooksByDate(input, dateOf)
    expect(input.map((b) => b.title)).toEqual(['B', 'A'])
  })

  it('leere Liste bleibt leer', () => {
    expect(sortBooksByDate([], dateOf)).toEqual([])
  })
})
```

- [ ] **Step 2: Tests laufen lassen — sie müssen fehlschlagen**

Run (Repo-Root): `npx vitest run src/lib/bookListPopup.test.ts`
Expected: FAIL (Modul `./bookListPopup` existiert nicht).

- [ ] **Step 3: Implementierung** — `src/lib/bookListPopup.ts`:

```ts
import type { Book } from './types'

/**
 * Chronologisch nach Achsendatum (ISO-Strings `YYYY-MM-DD`, Stringvergleich
 * genügt); Titel ohne Tagesdatum ans Ende, untereinander alphabetisch
 * (Spec „Interaktives Titel-Popup", Entscheidung 7). Liefert eine neue Liste.
 */
export function sortBooksByDate(books: Book[], dateOf: (b: Book) => string | null): Book[] {
  return [...books].sort((a, z) => {
    const da = dateOf(a)
    const dz = dateOf(z)
    if (da !== null && dz !== null) return da < dz ? -1 : da > dz ? 1 : 0
    if (da !== null) return -1
    if (dz !== null) return 1
    return a.title.localeCompare(z.title)
  })
}
```

- [ ] **Step 4: Tests laufen lassen — grün**

Run: `npx vitest run src/lib/bookListPopup.test.ts`
Expected: 4 Tests PASS.

- [ ] **Step 5: Verifizieren** — `npx tsc --noEmit && npx vitest run && npx vite build` (alles sauber).

- [ ] **Step 6: Commit** (Message per `-F`, mit beiden Trailern):

```bash
cat > /tmp/blp-task1-commit.txt <<'MSG'
feat(popup): Sortier-Helfer sortBooksByDate

Chronologische Ordnung nach Achsendatum für die Titelliste des
interaktiven Popups; undatierte Titel ans Ende, alphabetisch.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
MSG
git add src/lib/bookListPopup.ts src/lib/bookListPopup.test.ts && git commit -F /tmp/blp-task1-commit.txt
```

---

### Task 2: i18n-Namespace `bookListPopup`

**Files:**
- Modify: `src/i18n/messages.ts` (Interface, direkt vor `rangeForm:`)
- Modify: `src/i18n/de.tsx`, `src/i18n/en.tsx`, `src/i18n/fr.tsx`, `src/i18n/es.tsx`, `src/i18n/ja.tsx` (jeweils direkt vor `rangeForm:`)

**Interfaces:**
- Produces: `m.bookListPopup.listAria(context: string)`, `m.bookListPopup.scrollHint(countFmt: string)`, `m.bookListPopup.openDetailAria(title: string)` — von Task 3 konsumiert.
- Die `andMore`-Schlüssel werden hier NICHT angefasst (das machen Task 4/5 zusammen mit den Views, sonst bricht tsc).

- [ ] **Step 1: Interface** — in `src/i18n/messages.ts` nach dem schließenden `}`-Block von `detail` (nach `close: string`), vor `rangeForm:` einfügen:

```ts
  bookListPopup: {
    listAria: (context: string) => string
    scrollHint: (countFmt: string) => string
    openDetailAria: (title: string) => string
  }
```

- [ ] **Step 2: Fünf Bundles** — jeweils an derselben Position (nach dem `detail`-Block, vor `rangeForm:`). Die Strings EXAKT übernehmen — die Anführungs- und Leerzeichen sind Teil der Anforderung:

`de.tsx` (Anführungszeichen sind U+201E/U+201C):

```tsx
  bookListPopup: {
    listAria: (context) => `Titelliste: ${context}`,
    scrollHint: (countFmt) => `↕ ${countFmt} Titel — scrollen für mehr`,
    openDetailAria: (title) => `Details zu „${title}“ öffnen`,
  },
```

`en.tsx` (gerade Anführungszeichen, Dateikonvention):

```tsx
  bookListPopup: {
    listAria: (context) => `Title list: ${context}`,
    scrollHint: (countFmt) => `↕ ${countFmt} titles — scroll for more`,
    openDetailAria: (title) => `Open details for "${title}"`,
  },
```

`fr.tsx` — die Leerzeichen vor `:` und innen in `« … »` sind **U+202F** (schmales geschütztes Leerzeichen, Bytes `e2 80 af`), KEINE normalen Leerzeichen; von einem Nachbareintrag (z. B. `unpinAria`) kopieren, nicht neu tippen:

```tsx
  bookListPopup: {
    listAria: (context) => `Liste des titres : ${context}`,
    scrollHint: (countFmt) => `↕ ${countFmt} titres — faire défiler pour la suite`,
    openDetailAria: (title) => `Ouvrir les détails de « ${title} »`,
  },
```

`es.tsx`:

```tsx
  bookListPopup: {
    listAria: (context) => `Lista de títulos: ${context}`,
    scrollHint: (countFmt) => `↕ ${countFmt} títulos — desplázate para ver más`,
    openDetailAria: (title) => `Abrir los detalles de «${title}»`,
  },
```

`ja.tsx` (Vollbreiten-Doppelpunkt `：`; 件 als neutrales Zählwort — die Liste kann gemischte Medien enthalten):

```tsx
  bookListPopup: {
    listAria: (context) => `タイトル一覧：${context}`,
    scrollHint: (countFmt) => `↕ 全${countFmt}件 — スクロールで続きを表示`,
    openDetailAria: (title) => `「${title}」の詳細を開く`,
  },
```

- [ ] **Step 3: U+202F-Verifikation für fr**

Run: `node -e "const s=require('fs').readFileSync('src/i18n/fr.tsx','utf8'); console.log(s.includes('titres\u202f:'), s.includes('\u202f\${title}\u202f'))"`
Expected: `true true` — sonst wurden normale Leerzeichen getippt; korrigieren.

- [ ] **Step 4: Verifizieren** — `npx tsc --noEmit && npx vitest run && npx vite build` (alles sauber).

- [ ] **Step 5: Commit**

```bash
cat > /tmp/blp-task2-commit.txt <<'MSG'
feat(popup): i18n-Namespace bookListPopup in fünf Sprachen

listAria, scrollHint, openDetailAria für das interaktive Titel-Popup;
ja mit neutralem Zählwort 件 (gemischte Medien), fr mit U+202F.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
MSG
git add src/i18n/messages.ts src/i18n/de.tsx src/i18n/en.tsx src/i18n/fr.tsx src/i18n/es.tsx src/i18n/ja.tsx && git commit -F /tmp/blp-task2-commit.txt
```

---

### Task 3: Hook `useBookListPopup` + Komponente `BookListPopup`

**Files:**
- Create: `src/lib/useBookListPopup.ts`
- Create: `src/components/BookListPopup.tsx`
- Create: `src/components/BookListPopup.module.css`

**Interfaces:**
- Consumes: `m.bookListPopup.*` (Task 2), `useI18n()` aus `../i18n/LocaleContext` (liefert `{ m, fmtNum, locale }`), `Book` aus `../lib/types`.
- Produces (für Task 4/5):
  - `useBookListPopup<A>(sameAnchor: (a: A, b: A) => boolean, suspended: boolean)` → `{ popup: { anchor: A; x: number; y: number } | null, popupRef: RefObject<HTMLDivElement | null>, hoverAnchor(anchor: A, x: number, y: number): void, leaveChart(): void, popupEnter(): void, popupLeave(): void, pin(): void, close(): void }`
  - `BookListPopup` mit Props `{ x, y, header: ReactNode, ariaContext: string, books: Book[], dateOf: (b: Book) => string | null, onSelect: (b: Book) => void, onPointerEnter: () => void, onPointerLeave: () => void, popupRef: RefObject<HTMLDivElement | null> }`

- [ ] **Step 1: Hook** — `src/lib/useBookListPopup.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

const GRACE_MS = 250

export type PopupState<A> = { anchor: A; x: number; y: number }

/**
 * Zustandsautomat des Titel-Popups (Spec „Interaktives Titel-Popup"):
 * armed (Hover-Regeln aktiv) → grace (Zeiger draußen, 250-ms-Frist) →
 * geschlossen; pinned nach Titelklick — Chart-Hover wird dann vollständig
 * ignoriert (weder Schließen noch Ersetzen), erst erneutes Betreten des
 * Popups macht die Hover-Regel wieder scharf. `suspended` setzt die
 * Esc-/Außenklick-Listener aus, solange der BookDetail-Dialog offen ist:
 * dessen Klicks und Esc gehören dem Dialog, nicht dem Popup dahinter.
 */
export function useBookListPopup<A>(sameAnchor: (a: A, b: A) => boolean, suspended: boolean) {
  const [popup, setPopup] = useState<PopupState<A> | null>(null)
  const phase = useRef<'armed' | 'grace' | 'pinned'>('armed')
  const timer = useRef<number | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const close = useCallback(() => {
    cancelTimer()
    phase.current = 'armed'
    setPopup(null)
  }, [cancelTimer])

  /** Chart-Pointermove über einem Jahr / einer Zelle mit Inhalt. */
  const hoverAnchor = useCallback(
    (anchor: A, x: number, y: number) => {
      if (phase.current === 'pinned') return
      cancelTimer()
      phase.current = 'armed'
      // Gleicher Anker: Position der ersten Meldung behalten — das Popup
      // steht fest und folgt nicht dem Zeiger (sonst wäre es unbetretbar).
      setPopup((p) => (p !== null && sameAnchor(p.anchor, anchor) ? p : { anchor, x, y }))
    },
    [cancelTimer, sameAnchor],
  )

  /** Zeiger verlässt Chartfläche oder Popup: Gnadenfrist überbrückt den
   *  12-px-Spalt zwischen Anker und Popup. */
  const beginGrace = useCallback(() => {
    if (phase.current === 'pinned') return
    phase.current = 'grace'
    cancelTimer()
    timer.current = window.setTimeout(close, GRACE_MS)
  }, [cancelTimer, close])

  const popupEnter = useCallback(() => {
    cancelTimer()
    // Betreten macht die Hover-Regel wieder scharf — auch aus pinned.
    phase.current = 'armed'
  }, [cancelTimer])

  /** Beim Titelklick: das Popup überlebt den BookDetail-Dialog und den
   *  zufälligen Zeigerstand nach dessen Schließen. */
  const pin = useCallback(() => {
    cancelTimer()
    phase.current = 'pinned'
  }, [cancelTimer])

  // Esc und Pointer-Down außerhalb schließen in jedem Zustand (auch pinned:
  // Nav-Tabs, Filter-Chips, freie Fläche) — außer suspended.
  useEffect(() => {
    if (popup === null || suspended) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onDown = (e: PointerEvent) => {
      const el = popupRef.current
      if (el !== null && e.target instanceof Node && el.contains(e.target)) return
      close()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [popup, suspended, close])

  // Aufräumen beim Unmount (View-Wechsel bei laufender Gnadenfrist).
  useEffect(() => cancelTimer, [cancelTimer])

  return { popup, popupRef, hoverAnchor, leaveChart: beginGrace, popupEnter, popupLeave: beginGrace, pin, close }
}
```

- [ ] **Step 2: Komponente** — `src/components/BookListPopup.tsx`:

```tsx
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import type { Book } from '../lib/types'
import styles from './BookListPopup.module.css'

/**
 * Interaktives, nicht-modales Titel-Popup: fest am Jahres-/Zellanker,
 * betretbar, Titelzeilen öffnen die Buch-Detailansicht. Positionierung wie
 * Tooltip (horizontales Umspringen am Fensterrand, useLayoutEffect misst
 * vor dem Paint), zusätzlich vertikale Klemmung in den Viewport (Spec DoD 8).
 */
export function BookListPopup({
  x,
  y,
  header,
  ariaContext,
  books,
  dateOf,
  onSelect,
  onPointerEnter,
  onPointerLeave,
  popupRef,
}: {
  x: number
  y: number
  header: ReactNode
  ariaContext: string
  books: Book[] // bereits sortiert (sortBooksByDate)
  dateOf: (b: Book) => string | null
  onSelect: (b: Book) => void
  onPointerEnter: () => void
  onPointerLeave: () => void
  popupRef: RefObject<HTMLDivElement | null>
}) {
  const { m, fmtNum, locale } = useI18n()
  const listRef = useRef<HTMLUListElement>(null)
  const [shift, setShift] = useState({ dx: 12, dy: 12 })
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = popupRef.current
    if (el === null) return
    const parent = el.offsetParent?.getBoundingClientRect()
    const left = (parent?.left ?? 0) + x
    const top = (parent?.top ?? 0) + y
    const dx = left + 12 + el.offsetWidth > window.innerWidth - 8 ? -el.offsetWidth - 12 : 12
    // Vertikal klemmen statt abschneiden: notfalls über den Anker schieben.
    const dy = Math.min(12, window.innerHeight - 8 - top - el.offsetHeight)
    setShift({ dx, dy })
    const list = listRef.current
    if (list !== null) setOverflows(list.scrollHeight > list.clientHeight)
    // overflows in den Deps: die nachgerückte Fußzeile ändert die Höhe,
    // die Klemmung wird danach einmal neu gemessen.
  }, [x, y, books, overflows, popupRef])

  // ISO-Datum lokal parsen — new Date('YYYY-MM-DD') wäre UTC-Mitternacht
  // und kippte in Zeitzonen westlich von UTC auf den Vortag.
  const fmtDay = (iso: string) => {
    const [yy, mm, dd] = iso.split('-').map(Number)
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(
      new Date(yy, mm - 1, dd),
    )
  }

  return (
    <div
      ref={popupRef}
      className={styles.pop}
      style={{ transform: `translate(${x + shift.dx}px, ${y + shift.dy}px)` }}
      role="dialog"
      aria-label={m.bookListPopup.listAria(ariaContext)}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <header className={styles.header}>{header}</header>
      <ul ref={listRef} className={styles.list}>
        {books.map((b) => {
          const d = dateOf(b)
          return (
            <li key={b.id}>
              <button
                className={styles.row}
                onClick={() => onSelect(b)}
                aria-label={m.bookListPopup.openDetailAria(b.title)}
              >
                <span className={styles.date}>{d === null ? '—' : fmtDay(d)}</span>
                <span className={styles.rowTitle}>{b.title}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {overflows && (
        <div className={styles.foot} aria-hidden="true">
          {m.bookListPopup.scrollHint(fmtNum(books.length))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: CSS** — `src/components/BookListPopup.module.css`:

```css
.pop {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--sumi);
  color: var(--shironeri);
  padding: var(--space-2) 0 var(--space-1);
  border-radius: var(--radius);
  font-size: 13px;
  max-width: 26rem;
  z-index: 10;
  box-shadow: 0 6px 24px rgba(28, 27, 25, 0.35);
}

.header {
  padding: 0 var(--space-3) var(--space-2);
  border-bottom: 1px solid rgba(238, 232, 220, 0.18);
}

.list {
  list-style: none;
  margin: var(--space-1) 0 0;
  padding: 0 var(--space-1);
  max-height: 50vh;
  overflow-y: auto;
  scrollbar-width: thin;
}

.row {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
  width: 100%;
  text-align: left;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  padding: 2px var(--space-2);
  border-radius: var(--radius);
  cursor: pointer;
}

.row:hover,
.row:focus-visible {
  background: rgba(238, 232, 220, 0.14);
}

/* Der globale Kon-Fokusring ist auf der Sumi-Fläche fast unsichtbar. */
.row:focus-visible {
  outline-color: var(--shironeri);
}

.date {
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgba(238, 232, 220, 0.55);
  flex: none;
  width: 4.5em;
}

.rowTitle {
  flex: 1;
  min-width: 0;
}

.foot {
  padding: var(--space-1) var(--space-3) 0;
  font-size: 11px;
  color: rgba(238, 232, 220, 0.45);
}
```

- [ ] **Step 4: Verifizieren** — `npx tsc --noEmit && npx vitest run && npx vite build` (alles sauber; die neuen Dateien sind noch unbenutzt, das ist in Ordnung).

- [ ] **Step 5: Commit**

```bash
cat > /tmp/blp-task3-commit.txt <<'MSG'
feat(popup): Hook useBookListPopup und Komponente BookListPopup

Zustandsautomat armed/grace/pinned mit 250-ms-Gnadenfrist, Esc- und
Außenklick-Listener (ausgesetzt bei offenem BookDetail); Popover im
Tooltip-Stil mit Datumsspalte, internem Scroll (50vh) und
Viewport-Klemmung horizontal wie vertikal.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
MSG
git add src/lib/useBookListPopup.ts src/components/BookListPopup.tsx src/components/BookListPopup.module.css && git commit -F /tmp/blp-task3-commit.txt
```

---

### Task 4: Integration in „Erwerb & Lektüre"

**Files:**
- Modify: `src/views/AcquisitionReading.tsx`
- Modify: `src/views/AcquisitionReading.module.css` (`.tipList` entfernen)
- Modify: `src/i18n/messages.ts` + alle fünf Bundles (`views.timeline.andMore` entfernen)

**Interfaces:**
- Consumes: `sortBooksByDate` (Task 1), `useBookListPopup` + `BookListPopup` (Task 3), `BookDetail` aus `../components/BookDetail` (`{ book: Book | null; onClose: () => void }`), bestehende Keys `m.views.timeline.tooltipAcquired/tooltipRead`.
- Produces: keine neuen Schnittstellen.

- [ ] **Step 1: Imports und State** — in `src/views/AcquisitionReading.tsx`:

Imports ergänzen (alphabetisch einsortieren):

```tsx
import { BookDetail } from '../components/BookDetail'
import { BookListPopup } from '../components/BookListPopup'
import { sortBooksByDate } from '../lib/bookListPopup'
import { useBookListPopup } from '../lib/useBookListPopup'
import type { Book } from '../lib/types'
```

Die Zeile mit dem `hover`-State

```tsx
  const [hover, setHover] = useState<{ year: number; dim: 'acquired' | 'read'; px: number; py: number } | null>(null)
```

ersetzen durch:

```tsx
  const [selected, setSelected] = useState<Book | null>(null)
  // Interaktives Titel-Popup statt passivem Tooltip (Spec „Interaktives
  // Titel-Popup"); solange der Detail-Dialog offen ist, sind Esc/Außenklick
  // des Popups ausgesetzt.
  const { popup, popupRef, hoverAnchor, leaveChart, popupEnter, popupLeave, pin, close } =
    useBookListPopup<{ dim: 'acquired' | 'read'; year: number }>(
      (a, b) => a.dim === b.dim && a.year === b.year,
      selected !== null,
    )
```

- [ ] **Step 2: Popup-Inhalt und Leerlauf-Effekt** — direkt nach dem Brush-Escape-Effekt (nach dessen schließendem `}, [dragging])`), VOR den Early-Returns einfügen:

```tsx
  // Popup-Inhalt: Bücher des Anker-Jahres der jeweiligen Halbebene,
  // chronologisch nach dem Achsendatum (Spec, Entscheidung 7). Vor den
  // Early-Returns, weil der Leerlauf-Effekt darauf aufbaut (Rules of Hooks).
  const popupBooks = useMemo(() => {
    if (popup === null) return []
    const dateOf =
      popup.anchor.dim === 'acquired' ? (b: Book) => b.acquiredDate : (b: Book) => b.readDate
    return sortBooksByDate(
      filtered.filter((b) =>
        popup.anchor.dim === 'acquired'
          ? b.acquiredYear === popup.anchor.year
          : b.readYearEffective === popup.anchor.year,
      ),
      dateOf,
    )
  }, [popup, filtered])

  // Filterwechsel kann das Anker-Jahr leeren, ohne dass ein pointerleave
  // feuert — ein leeres Popup (auch ein stehengebliebenes) schließt.
  useEffect(() => {
    if (popup !== null && popupBooks.length === 0) close()
  }, [popup, popupBooks, close])
```

- [ ] **Step 3: `hoverTitles` entfernen** — den Block

```tsx
  // Halbebene wie beim Brush: oberhalb der Nulllinie die erworbenen Titel,
  // darunter die gelesenen (datiert + Jahres-Tag, wie die Balken selbst).
  const hoverTitles =
    hover === null
      ? []
      : hover.dim === 'acquired'
        ? filtered.filter((b) => b.acquiredYear === hover.year).map((b) => b.title)
        : filtered.filter((b) => b.readYearEffective === hover.year).map((b) => b.title)
```

ersatzlos löschen; stattdessen (an derselben Stelle) die Popup-Kopfzeile ableiten:

```tsx
  // Halbebene wie beim Brush: oberhalb der Nulllinie die erworbenen Titel,
  // darunter die gelesenen (datiert + Jahres-Tag, wie die Balken selbst).
  const popupHeadline =
    popup === null
      ? ''
      : popup.anchor.dim === 'acquired'
        ? m.views.timeline.tooltipAcquired(fmtNum(popupBooks.length))
        : m.views.timeline.tooltipRead(fmtNum(popupBooks.length))
```

- [ ] **Step 4: Brush-Rect-Handler umstellen** — im `onPointerMove` des Brush-Overlays den `setHover(…)`-Aufruf ersetzen; aus

```tsx
            onPointerMove={(e) => {
              const px = localX(e)
              setDrag((d) => (d ? { ...d, x1: px } : d))
              const wrapRect = wrapRef.current?.getBoundingClientRect()
              const svgY = e.clientY - e.currentTarget.getBoundingClientRect().top + M.top
              setHover({
                year: yearAt(px),
                dim: svgY < y(0) ? 'acquired' : 'read',
                px: wrapRect ? e.clientX - wrapRect.left : px,
                py: wrapRect ? e.clientY - wrapRect.top : 0,
              })
            }}
```

wird

```tsx
            onPointerMove={(e) => {
              const px = localX(e)
              setDrag((d) => (d ? { ...d, x1: px } : d))
              if (drag) return // während des Brushs kein Popup (Spec)
              const wrapRect = wrapRef.current?.getBoundingClientRect()
              const svgY = e.clientY - e.currentTarget.getBoundingClientRect().top + M.top
              const year = yearAt(px)
              // Anker: x an der Bandmitte des Jahres, y am Zeiger der ersten
              // Meldung in diesem Jahr (Spec, Entscheidung 3).
              hoverAnchor(
                { dim: svgY < y(0) ? 'acquired' : 'read', year },
                M.left + (x(year) ?? 0) + bw / 2,
                wrapRect ? e.clientY - wrapRect.top : 0,
              )
            }}
```

und `onPointerLeave={() => setHover(null)}` wird `onPointerLeave={leaveChart}`.

- [ ] **Step 5: JSX — Popup statt Tooltip, BookDetail anhängen** — den Block

```tsx
      {hover && !drag && hoverTitles.length > 0 && (
        <Tooltip x={hover.px} y={hover.py}>
          <strong>{hover.year}</strong>:{' '}
          {hover.dim === 'acquired'
            ? m.views.timeline.tooltipAcquired(fmtNum(hoverTitles.length))
            : m.views.timeline.tooltipRead(fmtNum(hoverTitles.length))}
          <ul className={styles.tipList}>
            {hoverTitles.slice(0, 10).map((t) => (
              <li key={t}>{t}</li>
            ))}
            {hoverTitles.length > 10 && <li>{m.views.timeline.andMore(fmtNum(hoverTitles.length - 10))}</li>}
          </ul>
        </Tooltip>
      )}
```

ersetzen durch

```tsx
      {popup && popupBooks.length > 0 && (
        <BookListPopup
          x={popup.x}
          y={popup.y}
          popupRef={popupRef}
          header={
            <>
              <strong>{popup.anchor.year}</strong>: {popupHeadline}
            </>
          }
          ariaContext={`${popup.anchor.year}: ${popupHeadline}`}
          books={popupBooks}
          dateOf={(b) => (popup.anchor.dim === 'acquired' ? b.acquiredDate : b.readDate)}
          onSelect={(b) => {
            pin()
            setSelected(b)
          }}
          onPointerEnter={popupEnter}
          onPointerLeave={popupLeave}
        />
      )}
```

und direkt vor dem schließenden `</div>` der Komponente (nach dem `unreadHover`-Tooltip-Block) einfügen:

```tsx
      <BookDetail book={selected} onClose={() => setSelected(null)} />
```

Der `Tooltip`-Import bleibt (Ungelesen-Kurve nutzt ihn weiter).

- [ ] **Step 6: CSS und i18n aufräumen**

- In `src/views/AcquisitionReading.module.css` die `.tipList`-Regel komplett entfernen.
- `views.timeline.andMore` entfernen: in `src/i18n/messages.ts` die Zeile `andMore: (countFmt: string) => string` im `timeline`-Block, und in allen fünf Bundles die `andMore`-Zeile im `timeline`-Block (de: `… und ${countFmt} weitere`, en: `… and ${countFmt} more`, fr: `… et ${countFmt} autres`, es: `… y ${countFmt} más`, ja: `…ほか ${countFmt} 点`). Der jeweils zweite `andMore`-Treffer pro Bundle gehört zu `tagTrends` und bleibt (Task 5).

- [ ] **Step 7: Verifizieren** — `npx tsc --noEmit && npx vitest run && npx vite build` (alles sauber).

- [ ] **Step 8: Commit**

```bash
cat > /tmp/blp-task4-commit.txt <<'MSG'
feat(timeline): interaktives Titel-Popup statt passivem Tooltip

Hover über den Jahresbalken öffnet das betretbare Popup mit allen
Titeln (chronologisch, Datumsspalte); Titelklick öffnet BookDetail,
das Popup bleibt dahinter stehen. Ungelesen-Tooltip bleibt passiv;
andMore-Deckelung entfällt.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
MSG
git add src/views/AcquisitionReading.tsx src/views/AcquisitionReading.module.css src/i18n/messages.ts src/i18n/de.tsx src/i18n/en.tsx src/i18n/fr.tsx src/i18n/es.tsx src/i18n/ja.tsx && git commit -F /tmp/blp-task4-commit.txt
```

---

### Task 5: Integration in „Tag-Trends"

**Files:**
- Modify: `src/views/TagTrends.tsx`
- Modify: `src/views/TagTrends.module.css` (`.tipList` entfernen)
- Modify: `src/i18n/messages.ts` + alle fünf Bundles (`views.tagTrends.andMore` entfernen)

**Interfaces:**
- Consumes: `sortBooksByDate` (Task 1), `useBookListPopup` + `BookListPopup` (Task 3), `BookDetail` aus `../components/BookDetail`, bestehender Key `m.views.tagTrends.tooltip(tag, year, countFmt, factorFmt)`.
- Produces: keine neuen Schnittstellen.

- [ ] **Step 1: Imports und State** — in `src/views/TagTrends.tsx`:

Imports: `import { Tooltip } from '../components/Tooltip'` **entfernen** (einziger Nutzer war der Titel-Tooltip) und ergänzen:

```tsx
import { BookDetail } from '../components/BookDetail'
import { BookListPopup } from '../components/BookListPopup'
import { sortBooksByDate } from '../lib/bookListPopup'
import { useBookListPopup } from '../lib/useBookListPopup'
```

`import type { RangeKind } from '../lib/types'` wird zu `import type { Book, RangeKind } from '../lib/types'`.

Die Zeile

```tsx
  const [hover, setHover] = useState<{ tag: string; year: number; px: number; py: number } | null>(null)
```

ersetzen durch:

```tsx
  const [selected, setSelected] = useState<Book | null>(null)
  // Interaktives Titel-Popup statt passivem Tooltip (Spec „Interaktives
  // Titel-Popup"); suspended, solange der Detail-Dialog offen ist.
  const { popup, popupRef, hoverAnchor, leaveChart, popupEnter, popupLeave, pin, close } =
    useBookListPopup<{ tag: string; year: number }>(
      (a, b) => a.tag === b.tag && a.year === b.year,
      selected !== null,
    )
```

- [ ] **Step 2: Verwaister-Hover-Effekt umstellen** — der bestehende Effekt prüft `hover`; er prüft jetzt den Popup-Anker und schließt über den Hook (deckt auch stehende Popups nach Achsen-/Filterwechsel ab, Spec DoD 7). Aus

```tsx
  useEffect(() => {
    if (hover !== null) {
      const row = visible.find((r) => r.tag === hover.tag)
      if (!row || !data.years.includes(hover.year) || row.counts[hover.year - data.years[0]] === 0)
        setHover(null)
    }
    if (hoverTag !== null && !visible.some((r) => r.tag === hoverTag)) setHoverTag(null)
  }, [visible, data.years, hover, hoverTag])
```

wird

```tsx
  useEffect(() => {
    if (popup !== null) {
      const row = visible.find((r) => r.tag === popup.anchor.tag)
      if (!row || !data.years.includes(popup.anchor.year) || row.counts[popup.anchor.year - data.years[0]] === 0)
        close()
    }
    if (hoverTag !== null && !visible.some((r) => r.tag === hoverTag)) setHoverTag(null)
  }, [visible, data.years, popup, hoverTag, close])
```

(Der erläuternde Kommentar davor bleibt; „Tooltip" darin durch „Popup" ersetzen.)

- [ ] **Step 3: Ableitungen umstellen** — aus

```tsx
  const effHover = hover?.tag ?? hoverTag
  const hoverBooks =
    hover === null
      ? []
      : filtered
          .filter((b) => axisYear(b, axis) === hover.year && b.tagsNorm.includes(hover.tag))
          .map((b) => b.title)
  const hoverRow = hover === null ? null : (visible.find((r) => r.tag === hover.tag) ?? null)
```

wird

```tsx
  const effHover = popup?.anchor.tag ?? hoverTag
  const popupBooks =
    popup === null
      ? []
      : sortBooksByDate(
          filtered.filter(
            (b) => axisYear(b, axis) === popup.anchor.year && b.tagsNorm.includes(popup.anchor.tag),
          ),
          axis === 'acquired' ? (b) => b.acquiredDate : (b) => b.readDate,
        )
  const popupRow = popup === null ? null : (visible.find((r) => r.tag === popup.anchor.tag) ?? null)
```

- [ ] **Step 4: Hover-Handler der Linien und Zellen** — Linien (fetter transparenter Pfad):

```tsx
                          onPointerMove={(e) => {
                            if (drag) return
                            const yr = yearAt(localX(e.clientX))
                            hoverAnchor(
                              { tag: r.tag, year: yr },
                              M.left + xc(data.years.indexOf(yr)),
                              tipPos(e).py,
                            )
                          }}
                          onPointerLeave={leaveChart}
```

Heatmap-Zellen:

```tsx
                          onPointerMove={(e) => {
                            if (drag) return
                            hoverAnchor({ tag: r.tag, year: yr }, M.left + xc(i), tipPos(e).py)
                          }}
                          onPointerLeave={leaveChart}
```

- [ ] **Step 5: JSX — Popup statt Tooltip, BookDetail anhängen** — den Block `{hover && !drag && hoverRow && ( <Tooltip …> … </Tooltip> )}` ersetzen durch:

```tsx
          {popup && popupRow && popupBooks.length > 0 && (() => {
            const headline = t.tooltip(
              popup.anchor.tag,
              popup.anchor.year,
              fmtNum(popupBooks.length),
              fmtFactor(factorAt(popupRow, popup.anchor.year - data.years[0])),
            )
            return (
              <BookListPopup
                x={popup.x}
                y={popup.y}
                popupRef={popupRef}
                header={headline}
                ariaContext={headline}
                books={popupBooks}
                dateOf={axis === 'acquired' ? (b) => b.acquiredDate : (b) => b.readDate}
                onSelect={(b) => {
                  pin()
                  setSelected(b)
                }}
                onPointerEnter={popupEnter}
                onPointerLeave={popupLeave}
              />
            )
          })()}
```

Direkt vor dem schließenden `</div>` der Komponente (nach dem `ranking`-`<section>`) einfügen:

```tsx
      <BookDetail book={selected} onClose={() => setSelected(null)} />
```

- [ ] **Step 6: CSS und i18n aufräumen**

- In `src/views/TagTrends.module.css` die `.tipList`-Regel komplett entfernen.
- `views.tagTrends.andMore` entfernen: in `src/i18n/messages.ts` die Zeile `andMore: (countFmt: string) => string` im `tagTrends`-Block, und in allen fünf Bundles die verbliebene `andMore`-Zeile im `tagTrends`-Block.

- [ ] **Step 7: Verifizieren** — `npx tsc --noEmit && npx vitest run && npx vite build` (alles sauber).

- [ ] **Step 8: Commit**

```bash
cat > /tmp/blp-task5-commit.txt <<'MSG'
feat(tag-trends): interaktives Titel-Popup statt passivem Tooltip

Linien- und Heatmap-Hover öffnen das betretbare Popup (alle Titel,
chronologisch nach Achsendatum, Datumsspalte); Titelklick öffnet
BookDetail, das Popup bleibt dahinter stehen. Der Verwaister-Hover-
Effekt schließt jetzt auch stehende Popups; andMore-Deckelung entfällt.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
MSG
git add src/views/TagTrends.tsx src/views/TagTrends.module.css src/i18n/messages.ts src/i18n/de.tsx src/i18n/en.tsx src/i18n/fr.tsx src/i18n/es.tsx src/i18n/ja.tsx && git commit -F /tmp/blp-task5-commit.txt
```

---

## Abschluss-Verifikation (durch die Koordination, nach den Tasks)

Playwright gegen die Definition of Done der Spec, mit realen Daten
(`public/data/hidden/library.json` via IndexedDB-Muster, eigener Server, nie
Port 5174):

1. Hover über ein Jahr in „Erwerb & Lektüre" zeigt das Popup sofort an der
   Jahresposition; Bewegung innerhalb des Jahres verschiebt es nicht.
2. Maus ins Popup fahren hält es offen; Titelklick öffnet `BookDetail`;
   Dialog schließen → Popup steht noch; zweiter Titel ist klickbar.
3. Nach Detail-Schließen ersetzt Mausbewegung über andere Jahre das stehende
   Popup nicht; erst nach Betreten+Verlassen (oder Esc) kommen neue Popups.
4. Volles Jahr: alle Titel, interner Scroll, Fußzeilen-Hinweis; Datumsspalte
   chronologisch, „—"-Titel am Ende.
5. Brush unverändert (kein Popup während des Zugs); Ein-Jahres-Klick in
   Tag-Trends fokussiert weiter die Rangliste.
6. Esc und Außenklick schließen (auch pinned, z. B. Nav-Tab); Esc im offenen
   `BookDetail` schließt nur den Dialog.
7. Tag-Trends: Achsenwechsel bei stehendem Popup schließt es.
8. Anker am rechten Rand: Popup springt links, bleibt im Viewport; hohes
   Popup wird vertikal geklemmt.
