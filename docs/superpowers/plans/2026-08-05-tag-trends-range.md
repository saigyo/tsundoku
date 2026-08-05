# Tag-Trends Zeitraum-Einschränkung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein von/bis-Formular in der Controls-Zeile der Tag-Trends-View setzt einen globalen Jahresfilter auf der gerade gewählten Zeitachse.

**Architecture:** Reiner Umbau von `TagTrends.tsx` + CSS: zwei Formular-States mit Sync-Effekt (Muster `AcquisitionReading.tsx:38-47`), ein `<form>` neben den Schiebeschaltern, Submit ruft `setRange` auf der Achsen-Dimension. Store, i18n, Datenmodul unverändert; keine neuen Tests (reine Verdrahtung getesteter Bausteine).

**Tech Stack:** React + TypeScript, Zustand (`setRange`), CSS Modules.

**Spec:** `docs/superpowers/specs/2026-08-05-tag-trends-range-design.md` (freigegeben).

## Global Constraints

- Dimension = Achsen-Schalter: Achse `'acquired'` → `setRange('acquiredYear', from, to)`, Achse `'read'` → `setRange('readYear', from, to)`. Kein eigener Dimensions-`<select>`.
- Der view-lokale Abschnitt (`selRaw`/`sel`) und der Brush bleiben unangetastet.
- Validierung: `formFrom >= 1900 && formTo >= formFrom`, sonst kein `setRange`; Inputs `type="number"` mit `min={1900} max={2100}`.
- Keine neuen i18n-Schlüssel — nur `m.rangeForm.from/to/submit`.
- Rules of Hooks: neuer State und Effekt VOR den Early-Returns.
- Kommentare Deutsch, Bezeichner Englisch, keine neuen Dependencies.
- **Jeder Commit trägt beide Trailer-Zeilen** (Co-Authored-By + Claude-Session) — die Commit-Steps unten enthalten sie; Message per `-F`-Datei committen, nicht per `-m` (zsh zerlegt Sonderzeichen).
- Vor dem Commit (Repo-Root): `npx tsc --noEmit` sauber, `npx vitest run` grün, `npx vite build` fehlerfrei. Kein Dev-Server, Port 5174 nie anfassen.

---

### Task 1: von/bis-Formular in der Controls-Zeile

**Files:**
- Modify: `src/views/TagTrends.tsx` (Import, State, Sync-Effekt, Formular-JSX)
- Modify: `src/views/TagTrends.module.css` (`.rangeForm`-Regeln)

**Interfaces:**
- Consumes: `useFilterStore((s) => s.setRange)` mit Signatur `setRange(kind: RangeKind, from: number, to: number)`; Typ `RangeKind` aus `../lib/types`; `m.rangeForm.{from,to,submit}` (existiert fünfsprachig); bestehende Werte `axis`, `filters`, `data.years` in der Komponente.
- Produces: keine neuen Schnittstellen.

- [ ] **Step 1: Import erweitern** — in `src/views/TagTrends.tsx` nach Zeile 11 (`import { useMeasure } …`) einfügen:

```tsx
import type { RangeKind } from '../lib/types'
```

(Import-Block bleibt alphabetisch: die Zeile gehört zwischen `../lib/useMeasure` und `../lib/viewData/tagTrends`.)

- [ ] **Step 2: State und Store-Hook ergänzen** — aus

```tsx
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
```

wird

```tsx
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const setRange = useFilterStore((s) => s.setRange)
```

und direkt nach `const [mode, setMode] = useState<Mode>('lines')`:

```tsx
  const [formFrom, setFormFrom] = useState(0)
  const [formTo, setFormTo] = useState(0)
```

- [ ] **Step 3: Achsen-Dimension und Sync-Effekt** — direkt VOR dem Kommentar `// Verwaister Hover: …` (und damit vor den Early-Returns) einfügen:

```tsx
  // Das von/bis-Formular ist der globale Gegenspieler zum view-lokalen
  // Abschnitt: Es filtert wirklich (setRange auf der Achsen-Dimension).
  // Aktiver Filter belegt die Felder vor, sonst die volle Achsenspanne
  // (Muster aus AcquisitionReading).
  const axisKind: RangeKind = axis === 'acquired' ? 'acquiredYear' : 'readYear'
  useEffect(() => {
    const r = filters.find((f) => f.kind === axisKind)
    if (r && 'from' in r) {
      setFormFrom(r.from)
      setFormTo(r.to)
    } else if (data.years.length > 0) {
      setFormFrom(data.years[0])
      setFormTo(data.years[data.years.length - 1])
    }
  }, [axisKind, filters, data.years])
```

- [ ] **Step 4: Formular-JSX** — in der Controls-Zeile nach dem zweiten `</span>` (dem `ctl`-Span des Darstellungs-Schalters), noch innerhalb von `<div className={styles.controls}>`:

```tsx
        <form
          className={styles.rangeForm}
          onSubmit={(e) => {
            e.preventDefault()
            if (formFrom >= 1900 && formTo >= formFrom) setRange(axisKind, formFrom, formTo)
          }}
        >
          <label>
            {m.rangeForm.from}{' '}
            <input
              type="number"
              value={formFrom}
              onChange={(e) => setFormFrom(Number(e.target.value))}
              min={1900}
              max={2100}
            />
          </label>
          <label>
            {m.rangeForm.to}{' '}
            <input
              type="number"
              value={formTo}
              onChange={(e) => setFormTo(Number(e.target.value))}
              min={1900}
              max={2100}
            />
          </label>
          <button type="submit">{m.rangeForm.submit}</button>
        </form>
```

- [ ] **Step 5: CSS** — in `src/views/TagTrends.module.css` direkt nach dem `.ctl`-Block einfügen (Muster `AcquisitionReading.module.css`, aber ohne `margin-top` — das Formular sitzt in der Flex-Zeile):

```css
.rangeForm {
  display: inline-flex;
  gap: var(--space-3);
  align-items: center;
}

.rangeForm input {
  width: 5em;
  font-family: var(--font-mono);
}
```

- [ ] **Step 6: Verifizieren**

Run (Repo-Root): `npx tsc --noEmit` (sauber), `npx vitest run` (alle Tests grün), `npx vite build` (fehlerfrei).

- [ ] **Step 7: Commit** (Message per `-F`, mit beiden Trailern):

```bash
cat > /tmp/tagtrends-range-commit.txt <<'MSG'
feat(tag-trends): Zeitraum-Einschränkung per von/bis-Formular

Globaler Jahresfilter auf der gewählten Achse (Erwerb → acquiredYear,
Lektüre → readYear) direkt aus der View: Formular in der Controls-Zeile,
Vorbelegung aus aktivem Filter oder voller Achsenspanne, Sync-Effekt
nach dem Timeline-Muster. Der view-lokale Abschnitt bleibt unberührt.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
MSG
git add src/views/TagTrends.tsx src/views/TagTrends.module.css
git commit -F /tmp/tagtrends-range-commit.txt
```

---

## Abschluss-Verifikation (durch die Koordination, nach dem Task)

Playwright gegen die Definition of Done der Spec, mit realen Daten (eigener Server, nie Port 5174):

1. Ohne Jahresfilter zeigt das Formular die volle Achsenspanne (1991–2026); Submit „2006–2026" erzeugt den Chip, Linien/Heatmap beginnen bei 2006.
2. Enter im Feld submittet; `to < from` und `from < 1900` lösen kein `setRange` aus.
3. Achsenwechsel wechselt Dimension und Vorbelegung; ein Chip der anderen Dimension bleibt stehen.
4. Chip-Entfernung setzt die Felder auf die volle Spanne zurück.
5. Ranglisten-Vergleichsbasis = gefilterte Menge (Faktoren ändern sich gegenüber ungefiltert); Abschnitts-Klemmung übersteht die Verengung.
