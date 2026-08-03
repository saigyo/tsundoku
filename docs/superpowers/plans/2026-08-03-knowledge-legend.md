# Wissenslandkarten-Legende Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Legende der Wissenslandkarte zeigt immer alle zehn DDC-Klassen mit Ausschluss-Zählung, markiert aktive Einträge nach dem Regal-Muster, rückt Anzahlen ans Label und stylt DDC-Codes als Code-Badge.

**Architecture:** Reiner Umbau von `KnowledgeMap.tsx` + CSS: feste Klassenliste `[0..9]` statt `data.classes`, ein `legendCounts`-`useMemo` (Komposition aus `filterBooks` + Tally, vor den Early-Returns), `aria-pressed` + Aktiv-Klasse im Legenden-Button. Ströme, Store, URL-Sync, i18n und `lib/viewData/knowledge.ts` bleiben unverändert; keine neuen Tests (bereits getestete Bausteine).

**Tech Stack:** React + TypeScript, Zustand (`useFilterStore`), CSS Modules.

**Spec:** `docs/superpowers/specs/2026-08-03-knowledge-legend-design.md` (freigegeben).

## Global Constraints

- Legende zeigt **immer alle zehn** DDC-Hauptklassen (0–9); leere Klassen mit 0, klickbar.
- Zählung verbindlich: `filterBooks(books, filters ohne 'ddcTop')`, dann nur Bücher mit `b.ddc !== null && b.acquiredYear !== null` (View-Population = `usable`-Kriterium aus `ddcYearMatrix`); direkt über Bücher, nie über Stromzeilen.
- Ströme bleiben unverändert aus `filtered` gezeichnet (`data.classes`).
- Aktiv-Markierung: `aria-pressed`, Rahmen `--kon` + Fläche `--ink-08`; Ruhe transparenter 1px-Rahmen, Hover/Fokus `--ink-45`. Code-Badge auf aktiver Fläche `--ink-15`.
- Keine neuen i18n-Keys; Kommentare auf Deutsch, Bezeichner auf Englisch.
- Hover-Kopplung Legende ↔ Strom (`hoverClass`) und Brush/Klick im Diagramm unverändert.
- Rules of Hooks: das neue `useMemo` MUSS vor den Early-Returns (`EmptyState`, `noData`) stehen.
- Vor dem Commit: `npx tsc --noEmit` sauber, `npx vitest run` grün (aus dem Repo-Root), `npx vite build` fehlerfrei. Kein Dev-Server, Port 5174 nie anfassen.

---

### Task 1: Legende stabil, markiert, lesbar

**Files:**
- Modify: `src/views/KnowledgeMap.tsx` (Import, Komponentenkopf, neues `useMemo`, Legenden-JSX)
- Modify: `src/views/KnowledgeMap.module.css` (`.legendItem`-Block, `.legendNum`, `.legendCount`)

**Interfaces:**
- Consumes: `filterBooks`, `sameFilter`, `useFilterStore` aus `../store/filters` (existiert); `useLibraryData()` → `{ books, filtered }`; `DDC_COLORS` aus `../lib/ddc`; `m.ddc.labels`.
- Produces: keine neuen Schnittstellen.

- [ ] **Step 1: Import erweitern** — aus

```tsx
import { useFilterStore } from '../store/filters'
```

wird

```tsx
import { filterBooks, sameFilter, useFilterStore } from '../store/filters'
```

- [ ] **Step 2: Konstante ergänzen** — direkt unter `const M = { top: 8, right: 16, bottom: 28, left: 16 }`:

```tsx
/** Feste DDC-Taxonomie: Die Legende zeigt immer alle zehn Hauptklassen,
 *  unabhängig von Daten und Filtern (Spec) — die Ströme zeichnen weiter
 *  nur vorhandene Klassen (data.classes). */
const DDC_CLASSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```

- [ ] **Step 3: Komponentenkopf erweitern** — aus

```tsx
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
```

wird

```tsx
  const { books, filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
```

- [ ] **Step 4: `legendCounts` einfügen** — direkt nach dem bestehenden `const data = useMemo(...)` und VOR `if (filtered.length === 0) return <EmptyState />`:

```tsx
  // Legendenzahlen mit Ausschluss der eigenen Dimension (Muster aus
  // Filter-Editor und Regal-Legende): gezählt wird ohne ddcTop-Filter,
  // eingeschränkt auf die Population dieser View (ddc + Erwerbsjahr,
  // das usable-Kriterium aus ddcYearMatrix). Direkt über Bücher, nicht
  // über die bei „geglättet" gerundeten Stromzeilen.
  const legendCounts = useMemo(() => {
    const counts = new Map<number, number>()
    const base = filterBooks(books, filters.filter((f) => f.kind !== 'ddcTop'))
    for (const b of base) {
      if (b.ddc === null || b.acquiredYear === null) continue
      counts.set(b.ddc.top, (counts.get(b.ddc.top) ?? 0) + 1)
    }
    return counts
  }, [books, filters])
```

- [ ] **Step 5: Legenden-JSX ersetzen** — der bestehende `<ul className={styles.legend}>…</ul>`-Block am Komponentenende wird komplett zu:

```tsx
      <ul className={styles.legend}>
        {DDC_CLASSES.map((c) => {
          const active = filters.some((g) => sameFilter(g, { kind: 'ddcTop', value: c }))
          return (
            <li key={c}>
              <button
                className={active ? styles.legendItemActive : styles.legendItem}
                aria-pressed={active}
                onClick={() => toggleFilter({ kind: 'ddcTop', value: c })}
                onPointerEnter={() => setHoverClass(c)}
                onPointerLeave={() => setHoverClass(null)}
              >
                <i style={{ background: DDC_COLORS[c] }} />
                <span className={styles.legendNum}>{c}00</span> {m.ddc.labels[c]}
                <span className={styles.legendCount}>{fmtNum(legendCounts.get(c) ?? 0)}</span>
              </button>
            </li>
          )
        })}
      </ul>
```

(`classCounts` bleibt unverändert bestehen — die Strom-`<title>`-Tooltips nutzen es weiter.)

- [ ] **Step 6: CSS umbauen** — in `src/views/KnowledgeMap.module.css` werden die Regeln `.legendItem`, `.legendItem i`, `.legendNum` und `.legendCount` komplett ersetzt durch:

```css
.legendItem,
.legendItemActive {
  border: 1px solid transparent;
  background: none;
  color: inherit;
  font: inherit;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
  padding: 2px var(--space-1);
  width: 100%;
  text-align: left;
  border-radius: var(--radius);
  cursor: pointer;
}

.legendItem:hover,
.legendItem:focus-visible {
  border-color: var(--ink-45);
}

.legendItemActive {
  border-color: var(--kon);
  background: var(--ink-08);
}

.legendItem i,
.legendItemActive i {
  width: 12px;
  height: 12px;
  flex: none;
}

/* Code-Badge: Der DDC-Code liest sich als Bezeichner (wie Inline-Code),
   die nackte Mono-Zahl dahinter als Anzahl — vorher waren beide
   identisch gestylt und verwechselbar. */
.legendNum {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-70);
  background: var(--ink-08);
  padding: 0 3px;
  border-radius: var(--radius);
}

.legendItemActive .legendNum {
  background: var(--ink-15);
}

.legendCount {
  font-family: var(--font-mono);
  color: var(--ink-70);
}
```

(Die entscheidende Layout-Änderung: `.legendCount` verliert sein `margin-left: auto` — die Anzahl rückt direkt hinter das Label. Der `.legend`-Grid-Block bleibt unverändert.)

- [ ] **Step 7: Verifizieren**

Run (Repo-Root): `npx tsc --noEmit` (sauber), `npx vitest run` (alle Tests grün), `npx vite build` (fehlerfrei).

- [ ] **Step 8: Commit**

```bash
git add src/views/KnowledgeMap.tsx src/views/KnowledgeMap.module.css
git commit -m "feat(knowledge): Legende stabil mit Ausschluss-Zählung, markiert, Code-Badge"
```

---

## Abschluss-Verifikation (durch die Koordination, nach dem Task)

Manuell/Playwright gegen die Definition of Done der Spec:

1. Klick „Philosophie & Psychologie" → Chip, alle zehn Klassen bleiben sichtbar, aktiver Eintrag markiert (`aria-pressed="true"`, Kon-Rahmen + Fläche).
2. Zweite Klasse → zwei Chips, ODER-Menge.
3. Zahlen direkt hinter den Labels; mit `Status: gelesen` passen sie sich an, 0-Klassen bleiben klickbar.
4. Glättungs-Schalter ändert die Legendenzahlen nicht.
5. DDC-Codes als Badge, auf aktiver Fläche `--ink-15`.
6. Tastatur: Fokus, Enter togglet, `aria-pressed` korrekt.
