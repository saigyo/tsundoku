# Kopfzeile mit Überlaufmenü — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einzeilige Kopfzeile mit „Mehr ▾"-Überlaufmenü (Spec `docs/superpowers/specs/2026-08-06-nav-overflow-design.md`), neue Nav-Reihenfolge nach Erkenntniswert.

**Architecture:** Neue Komponente `NavOverflow` ersetzt die Tab-Schleife in `App.tsx`. Eine unsichtbare Messzeile liefert die Breiten aller Tabs und des breitesten Knopf-Zustands; die pure, getestete Funktion `fitCount` bestimmt deterministisch den Schnitt. Überlauf strikt vom Ende der Reihenfolge; Markierung C1 (Knopf zeigt den Namen der aktiven versteckten View mit roter Linie).

**Tech Stack:** React + TypeScript, CSS Modules, Vitest. Keine neuen Abhängigkeiten.

## Global Constraints

- Bezeichner Englisch, Kommentare und UI-Texte Deutsch; UI-Texte nie hart in Komponenten — immer über die typisierten Message-Bundles (`de.tsx` ist Referenz).
- Kein Label-Kürzen, kein `title`-Attribut auf Nav-Elementen.
- Überlauf erfasst Tabs strikt vom Ende der Reihenfolge; keine „Beförderung" gewählter Views in die Zeile.
- `ViewId`s und URL-Parameter bleiben unverändert; nur die Reihenfolge in `VIEW_ORDER` ändert sich.
- Tastatur: sichtbarer Fokus; Menü-Knopf `aria-expanded`, aktiver Menüeintrag `aria-current="page"`.
- Jeder Commit per `git commit -F <datei>` mit beiden Trailern:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` und
  `Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP`.
- Verifikation nur mit `npx tsc --noEmit`, `npx vitest run`, `npx vite build` — IDE-Diagnostik ist in diesem Projekt häufig stale und zählt nicht.

---

### Task 1: `fitCount` — Schnittberechnung mit Tests

**Files:**
- Create: `src/lib/navOverflow.ts`
- Test: `src/lib/navOverflow.test.ts`

**Interfaces:**
- Consumes: nichts (pure Funktion).
- Produces: `fitCount(tabWidths: number[], buttonWidth: number, gap: number, available: number): number` — von Task 3 importiert.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

`src/lib/navOverflow.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fitCount } from './navOverflow'

describe('fitCount', () => {
  it('alles passt ohne Knopf', () => {
    // 100 + 8 + 100 = 208 ≤ 300
    expect(fitCount([100, 100], 80, 8, 300)).toBe(2)
  })

  it('exakte Breite passt noch', () => {
    // 100 + 8 + 100 + 8 + 100 = 316
    expect(fitCount([100, 100, 100], 80, 8, 316)).toBe(3)
  })

  it('Knopf verdrängt den letzten Tab', () => {
    // 316 > 315 → Überlauf; 2 Tabs + Knopf: 80 + (100+8) + (100+8) = 296 ≤ 315
    expect(fitCount([100, 100, 100], 80, 8, 315)).toBe(2)
  })

  it('nichts passt', () => {
    // Schon 80 + 100 + 8 = 188 > 50 → 0 Tabs, nur der Knopf
    expect(fitCount([100, 100], 80, 8, 50)).toBe(0)
  })

  it('leere Liste', () => {
    expect(fitCount([], 80, 8, 100)).toBe(0)
  })
})
```

- [ ] **Step 2: Tests laufen lassen — sie müssen fehlschlagen**

Run: `npx vitest run src/lib/navOverflow.test.ts`
Expected: FAIL (Modul `./navOverflow` existiert nicht)

- [ ] **Step 3: Implementierung**

`src/lib/navOverflow.ts`:

```ts
/**
 * Wie viele Tabs passen in die Nav-Zeile? Passt alles, gibt es keinen
 * Überlauf (und keinen Knopf). Sonst wird die Knopfbreite reserviert und
 * von vorn aufgefüllt: k Tabs + Knopf brauchen sum(w[0..k-1]) + k*gap +
 * buttonWidth (je ein gap zwischen den Elementen). Deterministisch:
 * gleiche Breiten ⇒ gleicher Schnitt (Spec, Entscheidung 1).
 */
export function fitCount(
  tabWidths: number[],
  buttonWidth: number,
  gap: number,
  available: number,
): number {
  const n = tabWidths.length
  const total = tabWidths.reduce((s, w) => s + w, 0) + gap * Math.max(0, n - 1)
  if (total <= available) return n
  let used = buttonWidth
  let k = 0
  while (k < n && used + tabWidths[k] + gap <= available) {
    used += tabWidths[k] + gap
    k += 1
  }
  return k
}
```

- [ ] **Step 4: Tests laufen lassen — grün**

Run: `npx vitest run src/lib/navOverflow.test.ts`
Expected: PASS (5 Tests)

- [ ] **Step 5: Commit**

Commit-Datei (z. B. `/tmp/c1.txt`):

```
feat(nav): fitCount — Schnittberechnung für das Überlaufmenü

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
```

```bash
git add src/lib/navOverflow.ts src/lib/navOverflow.test.ts
git commit -F /tmp/c1.txt
```

---

### Task 2: i18n — `app.moreMenu` in Interface und fünf Bundles

**Files:**
- Modify: `src/i18n/messages.ts` (Namespace `app`)
- Modify: `src/i18n/de.tsx`, `src/i18n/en.tsx`, `src/i18n/fr.tsx`, `src/i18n/es.tsx`, `src/i18n/ja.tsx`

**Interfaces:**
- Produces: `m.app.moreMenu: string` — von Task 3 als Knopf-Beschriftung genutzt.

- [ ] **Step 1: Interface erweitern**

In `src/i18n/messages.ts` im `app`-Block nach `navAria: string` einfügen:

```ts
    moreMenu: string
```

- [ ] **Step 2: Die fünf Bundles ergänzen**

Jeweils im `app`-Block nach dem `navAria`-Eintrag:

`de.tsx`: `moreMenu: 'Mehr',`
`en.tsx`: `moreMenu: 'More',`
`fr.tsx`: `moreMenu: 'Plus',`
`es.tsx`: `moreMenu: 'Más',`
`ja.tsx`: `moreMenu: 'その他',`

- [ ] **Step 3: Typprüfung**

Run: `npx tsc --noEmit`
Expected: keine Fehler (alle fünf Bundles vollständig)

- [ ] **Step 4: Commit**

Commit-Datei:

```
feat(i18n): app.moreMenu für das Nav-Überlaufmenü

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
```

```bash
git add src/i18n/messages.ts src/i18n/de.tsx src/i18n/en.tsx src/i18n/fr.tsx src/i18n/es.tsx src/i18n/ja.tsx
git commit -F /tmp/c2.txt
```

---

### Task 3: `NavOverflow`-Komponente und App-Integration

**Files:**
- Create: `src/components/NavOverflow.tsx`
- Create: `src/components/NavOverflow.module.css`
- Modify: `src/App.tsx` (VIEW_ORDER, Shell-Nav)
- Modify: `src/App.module.css` (Nav-Regeln wandern aus)

**Interfaces:**
- Consumes: `fitCount` aus Task 1, `m.app.moreMenu` aus Task 2, `useI18n` (liefert `m` und `locale`), `ViewId` aus `src/lib/types`.
- Produces: `<NavOverflow views active onSelect />` — einziger Nav-Einstieg der App.

- [ ] **Step 1: Komponente anlegen**

`src/components/NavOverflow.tsx`:

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import { fitCount } from '../lib/navOverflow'
import type { ViewId } from '../lib/types'
import styles from './NavOverflow.module.css'

/**
 * Einzeilige Navigation mit Überlaufmenü (Spec „Kopfzeile mit
 * Überlaufmenü"): Tabs, die nicht passen, wandern strikt vom Ende der
 * Reihenfolge in ein „Mehr ▾"-Menü. Markierung C1 — ist die aktive View
 * versteckt, zeigt der Knopf ihren Namen mit roter Linie; die sichtbaren
 * Tabs stehen immer an ihrem Platz.
 */
export function NavOverflow({
  views,
  active,
  onSelect,
}: {
  views: ViewId[]
  active: ViewId
  onSelect: (v: ViewId) => void
}) {
  const { m, locale } = useI18n()
  const navRef = useRef<HTMLElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const menuWrapRef = useRef<HTMLSpanElement>(null)
  const [visibleCount, setVisibleCount] = useState(views.length)
  const [open, setOpen] = useState(false)

  // Messzeile: alle Tab-Labels plus alle möglichen Knopf-Zustände
  // (unsichtbar, nicht umbrechend). fitCount rechnet mit der maximalen
  // Knopfbreite — der Schnitt hängt damit nur von Breite und Sprache ab,
  // nie davon, welche View gerade aktiv ist.
  useLayoutEffect(() => {
    const nav = navRef.current
    const meas = measureRef.current
    if (nav === null || meas === null) return
    const compute = () => {
      const tabs = [...meas.querySelectorAll<HTMLElement>('[data-tab]')]
      const buttons = [...meas.querySelectorAll<HTMLElement>('[data-btn]')]
      const gap = parseFloat(getComputedStyle(nav).columnGap) || 0
      const buttonWidth = Math.max(...buttons.map((el) => el.offsetWidth), 0)
      setVisibleCount(
        fitCount(tabs.map((el) => el.offsetWidth), buttonWidth, gap, nav.clientWidth),
      )
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(nav)
    return () => ro.disconnect()
    // locale in den Deps: neue Labels ⇒ neue Breiten messen.
  }, [views, locale])

  // View-Wechsel schließt das Menü (auch programmatisch, z. B. Back-Button).
  useEffect(() => {
    setOpen(false)
  }, [active])

  // Esc und Außenklick schließen — Listener nur bei offenem Menü.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      const el = menuWrapRef.current
      if (el !== null && e.target instanceof Node && el.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const visible = views.slice(0, visibleCount)
  const hidden = views.slice(visibleCount)
  const activeHidden = hidden.includes(active)
  const buttonLabel = `${activeHidden ? m.nav[active] : m.app.moreMenu} ▾`

  const tab = (id: ViewId) => (
    <button
      key={id}
      className={styles.navItem}
      aria-current={active === id ? 'page' : undefined}
      onClick={() => onSelect(id)}
    >
      {m.nav[id]}
    </button>
  )

  return (
    <nav aria-label={m.app.navAria} className={styles.nav} ref={navRef}>
      {visible.map(tab)}
      {hidden.length > 0 && (
        <span className={styles.menuWrap} ref={menuWrapRef}>
          <button
            className={styles.navItem}
            aria-current={activeHidden ? 'page' : undefined}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {buttonLabel}
          </button>
          {open && (
            <div className={styles.menu}>
              {hidden.map((id) => (
                <button
                  key={id}
                  className={active === id ? styles.itemActive : styles.item}
                  aria-current={active === id ? 'page' : undefined}
                  onClick={() => {
                    onSelect(id)
                    setOpen(false)
                  }}
                >
                  {m.nav[id]}
                </button>
              ))}
            </div>
          )}
        </span>
      )}
      {/* Messzeile: nimmt an Layout und Zugänglichkeit nicht teil. */}
      <div className={styles.measure} ref={measureRef} aria-hidden="true">
        {views.map((id) => (
          <span key={id} data-tab className={styles.navItem}>
            {m.nav[id]}
          </span>
        ))}
        <span data-btn className={styles.navItem}>{`${m.app.moreMenu} ▾`}</span>
        {views.map((id) => (
          <span key={`b-${id}`} data-btn className={styles.navItem}>
            {`${m.nav[id]} ▾`}
          </span>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Styles anlegen**

`src/components/NavOverflow.module.css` — die Tab-Optik zieht aus
`App.module.css` hierher um (inkl. der FR/ES-Verdichtung); `flex-wrap`
entfällt bewusst:

```css
.nav {
  display: flex;
  gap: var(--space-1);
  flex: 1 1 0;
  min-width: 0;
  position: relative;
  overflow: hidden; /* Sicherheitsnetz gegen Subpixel-Überstand, nie sichtbar */
}

.navItem {
  border: none;
  background: none;
  padding: var(--space-1) var(--space-3);
  color: var(--ink-70);
  border-bottom: 2px solid transparent;
  /* Fest wie .brand (28px): die JA-Grundgröße (93,75 %) soll die Tab-Höhe nicht verändern. */
  font-size: 16px;
  white-space: nowrap;
}

/* Engere Tab-Abstände für die breiten FR/ES-Labels (Bestand aus App.module.css). */
.navItem:lang(fr),
.navItem:lang(es) {
  padding: var(--space-1) 6px;
}

.navItem[aria-current='page'] {
  color: var(--sumi);
  border-bottom-color: var(--enji);
}

.menuWrap {
  position: relative;
}

/* Sumi-Panel wie das Titel-Popup; rechtsbündig am Knopf, damit es am
   rechten Fensterrand nach links ausweicht (Spec, Entscheidung 4). */
.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: var(--sumi);
  color: var(--shironeri);
  border-radius: var(--radius);
  box-shadow: 0 6px 20px rgba(28, 27, 25, 0.35);
  padding: 4px 0;
  min-width: max-content;
  z-index: 20;
}

.item,
.itemActive {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  color: inherit;
  font-size: 14px;
  padding: 6px 16px;
  border-left: 3px solid transparent;
  white-space: nowrap;
}

.itemActive {
  border-left-color: var(--enji);
}

.item:hover,
.itemActive:hover {
  background: rgba(238, 232, 220, 0.14);
}

.item:focus-visible,
.itemActive:focus-visible {
  outline: 2px solid var(--shironeri);
  outline-offset: -2px;
}

.measure {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  gap: var(--space-1);
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
}
```

- [ ] **Step 3: App umstellen**

`src/App.tsx`:

1. Import ergänzen: `import { NavOverflow } from './components/NavOverflow'`
2. `VIEW_ORDER` ersetzen (neue Reihenfolge nach Erkenntniswert, Spec
   Entscheidung 2 — `genres` folgt erst mit der Genre-Spec):

```ts
/** Navigationsreihenfolge nach Erkenntniswert (Spec „Kopfzeile mit
 *  Überlaufmenü"): die hinteren Views überlaufen zuerst ins Mehr-Menü. */
export const VIEW_ORDER: ViewId[] = [
  'shelf', 'timeline', 'knowledge', 'tagTrends', 'network', 'languages', 'canon', 'years', 'pace',
]
```

3. In `Shell` den `<nav>…</nav>`-Block ersetzen durch:

```tsx
<NavOverflow
  views={VIEW_ORDER.filter((id) => VIEW_REGISTRY[id])}
  active={view}
  onSelect={setView}
/>
```

`src/App.module.css`: die Regeln `.nav`, `.navItem`,
`.navItem:lang(fr), .navItem:lang(es)` und `.navItem[aria-current='page']`
ersatzlos entfernen (sie leben jetzt in `NavOverflow.module.css`); die
Regel `.header:lang(fr), .header:lang(es)` und alles andere bleibt.

- [ ] **Step 4: Verifikation**

Run: `npx tsc --noEmit` → keine Fehler
Run: `npx vitest run` → alle Tests grün (171 = 166 + 5 neue)
Run: `npx vite build` → fehlerfrei

- [ ] **Step 5: Commit**

Commit-Datei:

```
feat(nav): Überlaufmenü statt Kopfzeilen-Umbruch

Einzeilige Nav mit „Mehr ▾"-Menü: Messzeile + fitCount bestimmen
den Schnitt deterministisch pro Breite und Sprache, Überlauf strikt
vom Ende der neuen Reihenfolge nach Erkenntniswert. Markierung C1:
ist die aktive View versteckt, wird der Knopf zum aktiven Tab
(Name + rote Linie), im Panel trägt sie eine rote Randmarke.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
```

```bash
git add src/components/NavOverflow.tsx src/components/NavOverflow.module.css src/App.tsx src/App.module.css
git commit -F /tmp/c3.txt
```

---

## Nach den Tasks (Controller, nicht Subagent)

Playwright-DoD der Spec (Punkte 1–7) mit realen Daten auf eigenem Server
(Port 5199, nie 5174): breites Fenster ohne Knopf; Verkleinern lässt
Lesetempo → Ausgabe × Erwerb der Reihe nach überlaufen (alle fünf
Sprachen, ES als breitester Fall nach Locale-Wechsel); Menü-Wahl zeigt
C1-Markierung; Esc/Außenklick/Toggle schließen; Tastaturbedienung mit
sichtbarem Fokus.
