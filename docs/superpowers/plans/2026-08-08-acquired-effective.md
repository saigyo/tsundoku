# Effektives Erwerbssignal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `acquiredDateEffective`/`acquiredYearEffective`/`acquiredYearSource` im Normalizer (entrydate-Proxy mit Erstkatalogisierungs-Sperre) und Umstellung aller Erwerbs-Lesarten der App darauf.

**Architecture:** Zwei Normalizer-Regeln (Regel-1-Erweiterung „Erstkatalogisierungsphase", Regel 13 „effektives Erwerbssignal") liefern neue Buchfelder; Frontend-Typen, der `acquiredYear`-Filter, sechs viewData-Module/Views, BookDetail und der Import-Bericht wechseln von `acquiredYear`/`acquiredDate` auf die effektiven Felder. Spec: `docs/superpowers/specs/2026-08-08-acquired-effective-design.md`.

**Tech Stack:** Vite + React + TypeScript, Vitest, Zustand; Normalizer in `scripts/` (reines ESM ohne Node-APIs im Kern).

## Global Constraints

- Deutsche UI-Texte/Kommentare/Doku, englische Bezeichner; `de.tsx` ist die i18n-Referenz, alle fünf Sprachen (de/en/fr/es/ja) werden immer gemeinsam gepflegt.
- Keine stille Datenkorrektur: jede Regel steht in `docs/datenprofil.md` UND als Kommentar im Code an der Stelle, wo sie greift; `acquiredDate`/`acquiredYear`/`entryDate`/`entryYear` bleiben unverändert erhalten.
- Erwartete Kennzahlen beim aktuellen Export: bulkImported **1.016**, direkt **3.601**, Proxy **273** (Jahre 2007–2026), fehlend **991**, effektiv **3.874**, Bulk mit echtem `dateacquired` **25**. Abweichungen klären und dokumentieren, nicht wegcasten.
- Inkompatible `Book`/`Stats`-Änderung ⇒ `SCHEMA_VERSION` in `src/lib/libraryStore.ts` erhöhen (1 → 2).
- Commits per `git commit -F <datei>` mit BEIDEN Trailern:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` und
  `Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP`
- `public/data/**` und `*librarything*.json` sind git-ignoriert und dürfen NIE committet werden (private Bibliotheksdaten).
- Playwright nur gegen einen eigenen Dev-Server auf **Port 5199** (`npm run dev -- --port 5199`); Port 5174 ist der Server des Nutzers und wird nie angefasst.
- IDE-Diagnostik ist chronisch stale — nur `npx tsc --noEmit`, `npx vitest run` und der Vite-Build zählen.
- Arbeitsbranch: `feat/acquired-effective` (existiert, enthält die Specs).

---

### Task 1: Normalizer — Erstkatalogisierungsphase (Regel-1-Erweiterung)

**Files:**
- Modify: `scripts/normalize-core.mjs` (Bulk-Erkennung ~Zeile 286–290, Export-Block am Dateiende)
- Modify: `scripts/normalize.test.mjs`
- Modify: `docs/datenprofil.md` (Regel 1)

**Interfaces:**
- Produces: `bulkPhaseMonths(records) -> Set<string>` (exportiert; Monate `'YYYY-MM'`), erweiterte `bulkImport`-Semantik an jedem Buch. Task 2 baut darauf auf.

**Kontext:** Heute gilt ein Eintrag als `bulkImport`, wenn sein `entrydate`-Tag ≥ 50 Einträge hat (`BULK_THRESHOLD`). Die Erstkatalogisierung des Bestands (Aug 2006 – Jan 2007) hat aber viele Tage unter der Schwelle. Kennzeichen der Phase: Monate, in denen fast alle Einträge kein `dateacquired` tragen.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/normalize.test.mjs` (Import um `bulkPhaseMonths` ergänzen — die CLI-Hülle re-exportiert alles aus dem Kern):

```js
describe('bulkPhaseMonths (Regel 1: Erstkatalogisierungsphase)', () => {
  // Records brauchen nur entrydate/dateacquired; books_id/title für normalize().
  const rec = (id, entrydate, dateacquired) => ({ books_id: String(id), title: `B${id}`, entrydate, dateacquired })

  it('zusammenhängende Monate ab Kontostart mit >= 2/3 ohne dateacquired', () => {
    const records = [
      // 2020-01: 3 Einträge, 3 ohne dateacquired -> Phase
      rec(1, '2020-01-05'), rec(2, '2020-01-06'), rec(3, '2020-01-07'),
      // 2020-02: 3 Einträge, 2 ohne (2/3 erfüllt) -> Phase
      rec(4, '2020-02-01'), rec(5, '2020-02-02'), rec(6, '2020-02-03', '2020-02-03'),
      // 2020-03: 3 Einträge, 1 ohne (< 2/3) -> Ende der Phase
      rec(7, '2020-03-01'), rec(8, '2020-03-02', '2020-03-02'), rec(9, '2020-03-03', '2020-03-03'),
      // 2020-04: wieder 100 % ohne — bleibt trotzdem draußen (Phase ist zusammenhängend)
      rec(10, '2020-04-01'), rec(11, '2020-04-02'),
    ]
    expect(bulkPhaseMonths(records)).toEqual(new Set(['2020-01', '2020-02']))
  })

  it('leere/kaputte entrydates zählen nicht mit', () => {
    const records = [rec(1, '2020-01-05'), rec(2, undefined), rec(3, '')]
    expect(bulkPhaseMonths(records)).toEqual(new Set(['2020-01']))
  })

  it('Phase markiert Bücher als bulkImport, Tages-Schwelle gilt weiterhin danach', () => {
    const records = [
      // Phase: 2020-01 (alle ohne dateacquired, nur 3 Einträge — unter der Tagesschwelle)
      rec(1, '2020-01-05'), rec(2, '2020-01-06'), rec(3, '2020-01-07'),
      // Normalmonat beendet die Phase
      rec(4, '2020-02-01', '2020-02-01'), rec(5, '2020-02-02', '2020-02-02'), rec(6, '2020-02-03', '2020-02-03'),
      // Späterer Massenimport-Tag: 50 Einträge am selben Tag
      ...Array.from({ length: 50 }, (_, i) => rec(100 + i, '2021-06-01')),
      // Normaler Einzeleintrag danach
      rec(999, '2021-07-01'),
    ]
    const { books } = normalize(records_to_raw(records))
    const byId = (id) => books.find((b) => b.id === String(id))
    expect(byId(1).bulkImport).toBe(true)   // Phase
    expect(byId(4).bulkImport).toBe(false)  // Normalmonat
    expect(byId(100).bulkImport).toBe(true) // Tages-Schwelle
    expect(byId(999).bulkImport).toBe(false)
  })
})
```

Dazu oben im Testfile einmalig den Helfer (neben den anderen Top-Level-Konstanten):

```js
/** normalize() erwartet den Rohexport als Objekt { books_id: record }. */
const records_to_raw = (records) => Object.fromEntries(records.map((r) => [r.books_id, r]))
```

In der Suite „Goldene Kennzahlen am realen Export" ergänzen:

```js
  it('Regel 1: 1016 Bulk-Einträge (Phase Aug 2006–Jan 2007 + Tages-Schwelle)', () => {
    expect(books.filter((b) => b.bulkImport).length).toBe(1016)
  })
```

- [ ] **Step 2: Tests laufen lassen — sie müssen fehlschlagen**

Run: `npx vitest run scripts/normalize.test.mjs`
Expected: FAIL — `bulkPhaseMonths is not defined` bzw. Zähler 763 ≠ 1016.

- [ ] **Step 3: Implementierung in `scripts/normalize-core.mjs`**

Direkt vor dem bestehenden Bulk-Block (`// Massenimporte erkennen: ...`) die neue Funktion auf Modulebene einfügen (bei den anderen Regel-Funktionen wie `fixPermutedDimensions`):

```js
/**
 * Regel 1 (Erweiterung, Erstkatalogisierungsphase): Beim Anlegen des Kontos
 * wird der vorhandene Bestand katalogisiert — das Katalogisierungsdatum ist
 * dann kein Erwerbssignal. Die Phase verrät sich selbst: Monate, in denen
 * mindestens 2/3 der Einträge KEIN dateacquired tragen. Sie beginnt mit dem
 * ersten Eintragsmonat und endet vor dem ersten Monat, der die Bedingung
 * verletzt (zusammenhängend — spätere Monate mit hohem Anteil sind normale
 * Erfassung von Altbestand-Nachzüglern, keine Erstkatalogisierung).
 * Bewusst datengetrieben statt Kalenderkonstante: der Browser-Upload-Pfad
 * verarbeitet auch fremde Bibliotheken.
 */
function bulkPhaseMonths(records) {
  const perMonth = new Map()
  for (const r of records) {
    const month = String(r.entrydate ?? '').slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(month)) continue
    const e = perMonth.get(month) ?? { n: 0, noAcq: 0 }
    e.n += 1
    if (!r.dateacquired) e.noAcq += 1
    perMonth.set(month, e)
  }
  const phase = new Set()
  for (const [month, e] of [...perMonth].sort()) {
    if (e.noAcq / e.n < 2 / 3) break
    phase.add(month)
  }
  return phase
}
```

Im Bulk-Block innerhalb von `normalize()` (nach `const bulkDates = new Set(...)`):

```js
  const phaseMonths = bulkPhaseMonths(records)
```

Wobei `records` dort das bereits vorhandene Array der Rohdatensätze ist (im Code heißt es `records` — die Werte von `Object.values(raw)`). Beim Buchaufbau die `bulkImport`-Zeile ersetzen:

```js
      bulkImport: bulkDates.has(r.entrydate) || phaseMonths.has(String(r.entrydate ?? '').slice(0, 7)),
```

`bulkPhaseMonths` in den `export { ... }`-Block am Dateiende aufnehmen.

- [ ] **Step 4: Tests laufen lassen — alle grün**

Run: `npx vitest run scripts/normalize.test.mjs`
Expected: PASS, inklusive Golden-Test 1016.

- [ ] **Step 5: `docs/datenprofil.md` Regel 1 erweitern**

Den bestehenden Regel-1-Absatz um die Phase ergänzen (nach dem Satz zur ≥-50-Schwelle):

```markdown
   Zusätzlich gilt die **Erstkatalogisierungsphase** als Massenimport:
   zusammenhängende Monate ab dem ersten Eintragsmonat des Kontos, in denen
   mindestens ⅔ der Einträge kein `dateacquired` tragen (hier August 2006
   bis Januar 2007; Anteile ohne Kaufdatum 98/100/99/98/82/93 %, Februar
   2007 kippt auf 43 %). Damit sind auch die „Schultertage" der
   Bestandserfassung unter der Tagesschwelle markiert (27.08.: 34,
   28.10.: 37, 30.10.: 21). Insgesamt 1.016 Bulk-Einträge statt 763 mit
   der Tagesschwelle allein; die Schwelle bleibt für spätere Sessions
   nötig (13.03.2016: 65 Einträge).
```

- [ ] **Step 6: Commit**

```bash
git add scripts/normalize-core.mjs scripts/normalize.test.mjs docs/datenprofil.md
git commit -F <msgdatei>   # "feat(normalize): Erstkatalogisierungsphase als Bulk-Import (Regel 1)" + Trailer
```

---

### Task 2: Normalizer — Regel 13 (effektives Erwerbssignal) + Stats + Konsole

**Files:**
- Modify: `scripts/normalize-core.mjs` (Buchaufbau, `stats`-Objekt)
- Modify: `scripts/normalize.mjs` (Konsolenausgabe)
- Modify: `scripts/normalize.test.mjs`
- Modify: `docs/datenprofil.md` (neue Regel 13), `CLAUDE.md` (Erwartungsblock)

**Interfaces:**
- Consumes: `bulkImport`-Semantik aus Task 1.
- Produces: Buchfelder `acquiredDateEffective: string | null`, `acquiredYearEffective: number | null`, `acquiredYearSource: 'dateacquired' | 'entrydate' | null`; `stats.withAcquiredEffective: number`. Tasks 3–7 lesen genau diese Namen.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/normalize.test.mjs`:

```js
describe('effektives Erwerbssignal (Regel 13: entrydate-Proxy mit Bulk-Sperre)', () => {
  const rec = (id, entrydate, dateacquired) => ({ books_id: String(id), title: `B${id}`, entrydate, dateacquired })
  // Phase unterdrücken: Monat mit dateacquired-Mehrheit vorweg
  const normalMonth = [rec(90, '2019-01-01', '2019-01-01'), rec(91, '2019-01-02', '2019-01-02')]

  it('direkt: dateacquired gewinnt immer', () => {
    const { books } = normalize(records_to_raw([...normalMonth, rec(1, '2020-05-10', '2018-03-04')]))
    const b = books.find((x) => x.id === '1')
    expect(b.acquiredDateEffective).toBe('2018-03-04')
    expect(b.acquiredYearEffective).toBe(2018)
    expect(b.acquiredYearSource).toBe('dateacquired')
  })

  it('Fallback: entrydate als Proxy, volle Datumsgranularität', () => {
    const { books } = normalize(records_to_raw([...normalMonth, rec(1, '2020-05-10')]))
    const b = books.find((x) => x.id === '1')
    expect(b.acquiredDateEffective).toBe('2020-05-10')
    expect(b.acquiredYearEffective).toBe(2020)
    expect(b.acquiredYearSource).toBe('entrydate')
  })

  it('Bulk sperrt den Fallback (Tages-Schwelle)', () => {
    const bulkDay = Array.from({ length: 50 }, (_, i) => rec(100 + i, '2021-06-01'))
    const { books } = normalize(records_to_raw([...normalMonth, ...bulkDay]))
    const b = books.find((x) => x.id === '100')
    expect(b.bulkImport).toBe(true)
    expect(b.acquiredYearEffective).toBe(null)
    expect(b.acquiredYearSource).toBe(null)
  })

  it('Bulk sperrt den Fallback (Phase), echtes dateacquired zählt trotzdem direkt', () => {
    const phase = [rec(1, '2020-01-05'), rec(2, '2020-01-06'), rec(3, '2020-01-07', '2015-09-01')]
    const after = [rec(4, '2020-02-01', '2020-02-01'), rec(5, '2020-02-02', '2020-02-02')]
    const { books } = normalize(records_to_raw([...phase, ...after]))
    expect(books.find((x) => x.id === '1').acquiredYearSource).toBe(null)
    const withDate = books.find((x) => x.id === '3')
    expect(withDate.bulkImport).toBe(true)
    expect(withDate.acquiredYearSource).toBe('dateacquired')
    expect(withDate.acquiredYearEffective).toBe(2015)
  })

  it('weder dateacquired noch entrydate -> null', () => {
    const { books } = normalize(records_to_raw([...normalMonth, rec(1, undefined)]))
    const b = books.find((x) => x.id === '1')
    expect(b.acquiredDateEffective).toBe(null)
    expect(b.acquiredYearSource).toBe(null)
  })

  it('stats.withAcquiredEffective zählt direkt + Proxy', () => {
    const { stats } = normalize(records_to_raw([...normalMonth, rec(1, '2020-05-10')]))
    expect(stats.withAcquiredEffective).toBe(3) // 2× direkt + 1× Proxy
  })
})
```

In der Golden-Suite ergänzen:

```js
  it('Regel 13: Erwerbssignal 3601 direkt + 273 Proxy = 3874, Proxy ab 2007', () => {
    expect(books.filter((b) => b.acquiredYearSource === 'dateacquired').length).toBe(3601)
    const proxy = books.filter((b) => b.acquiredYearSource === 'entrydate')
    expect(proxy.length).toBe(273)
    expect(Math.min(...proxy.map((b) => b.acquiredYearEffective))).toBe(2007)
    expect(books.filter((b) => b.acquiredYearEffective !== null).length).toBe(3874)
    expect(books.filter((b) => b.bulkImport && b.acquiredYearSource === 'dateacquired').length).toBe(25)
  })
```

- [ ] **Step 2: Tests laufen lassen — sie müssen fehlschlagen**

Run: `npx vitest run scripts/normalize.test.mjs`
Expected: FAIL — Felder undefined.

- [ ] **Step 3: Implementierung**

In `scripts/normalize-core.mjs` im Buchaufbau: Die `bulkImport`-Berechnung wird vor dem Objektliteral gebraucht — im `records.map`-Callback vor dem `return` einfügen und im Literal referenzieren:

```js
    const bulkImport = bulkDates.has(r.entrydate) || phaseMonths.has(String(r.entrydate ?? '').slice(0, 7))
    // Regel 13: effektives Erwerbssignal — dateacquired, sonst entrydate als
    // Proxy (wer kurz nach dem Kauf katalogisiert, hinterlässt eine
    // Erwerbsspur). Bulk-Einträge (Regel 1) sind vom Fallback ausgeschlossen:
    // Katalogisierungs-Sessions sind kein Erwerbsverhalten. acquiredDate/
    // acquiredYear bleiben daneben unverändert erhalten.
    const acquiredEffective =
      acquired.date !== null
        ? { date: acquired.date, year: acquired.year, source: 'dateacquired' }
        : !bulkImport && entry.date !== null
          ? { date: entry.date, year: entry.year, source: 'entrydate' }
          : { date: null, year: null, source: null }
```

Im Objektliteral `bulkImport: bulkImport,` (statt des Inline-Ausdrucks aus Task 1) und nach `entryYear`/`bulkImport` die neuen Felder:

```js
      acquiredDateEffective: acquiredEffective.date,
      acquiredYearEffective: acquiredEffective.year,
      acquiredYearSource: acquiredEffective.source,
```

Im `stats`-Objekt nach `withAcquiredDate`:

```js
    withAcquiredEffective: books.filter((b) => b.acquiredYearEffective !== null).length,
```

In `scripts/normalize.mjs` nach der `Massenimport-Flag`-Zeile eine neue Konsolenzeile:

```js
  console.log(
    `  Erwerbssignal: ${stats.withAcquiredDate} direkt + ` +
      `${stats.withAcquiredEffective - stats.withAcquiredDate} per Katalogisierungsdatum = ${stats.withAcquiredEffective} (Regel 13)`,
  )
```

- [ ] **Step 4: Tests laufen lassen — alle grün**

Run: `npx vitest run scripts/normalize.test.mjs`
Expected: PASS.

- [ ] **Step 5: Daten regenerieren und Kennzahlen prüfen**

```bash
node scripts/normalize.mjs librarything_kaixo_202607210219.json public/data/hidden/library.json
```

Expected in der Ausgabe: `Massenimport-Flag: 1016` und `Erwerbssignal: 3601 direkt + 273 per Katalogisierungsdatum = 3874`. Datei ist git-ignoriert — nicht committen.

- [ ] **Step 6: Doku nachführen**

`docs/datenprofil.md`: neue Regel 13 ans Ende der Bereinigungsregeln:

```markdown
13. **Effektives Erwerbssignal.** `dateacquired` ist die sicherste Quelle
    (3.601 Einträge); fehlt es, dient `entrydate` als Proxy — außer bei
    Massenimport-Einträgen (Regel 1), deren Katalogisierungsdatum kein
    Erwerbssignal ist. Felder: `acquiredDateEffective`,
    `acquiredYearEffective`, `acquiredYearSource`
    (`'dateacquired' | 'entrydate' | null`); die Rohfelder bleiben
    unverändert daneben stehen. Ergebnis: 273 Proxys (2007–2026),
    zusammen 3.874 von 4.865 (79,6 %); 25 Bulk-Einträge mit echtem
    `dateacquired` zählen als direkt. Alle Erwerbs-Views und der
    Erwerbsjahr-Filter lesen ausschließlich die effektiven Felder.
```

`CLAUDE.md`, Block „Erwartete Ausgabe beim aktuellen Export": nach der Medien-Zeile ergänzen:

```
Erwerbssignal: 3601 direkt + 273 per Katalogisierungsdatum = 3874 | Massenimport: 1016
```

- [ ] **Step 7: Commit**

```bash
git add scripts/normalize-core.mjs scripts/normalize.mjs scripts/normalize.test.mjs docs/datenprofil.md CLAUDE.md
git commit -F <msgdatei>   # "feat(normalize): effektives Erwerbssignal mit Quellen-Marker (Regel 13)" + Trailer
```

---

### Task 3: Frontend-Typen, Fixtures, Schema-Version, Filter

**Files:**
- Modify: `src/lib/types.ts` (Book ~Zeile 47–51, Stats nach `withAcquiredDate`)
- Modify: `src/lib/fixtures.ts`
- Modify: `src/lib/libraryStore.ts:11`
- Modify: `src/store/filters.ts:28-29`
- Test: `src/store/filters.test.ts`

**Interfaces:**
- Consumes: Feldnamen aus Task 2.
- Produces: `Book.acquiredDateEffective/acquiredYearEffective/acquiredYearSource`, `Stats.withAcquiredEffective`; `mkBook` spiegelt `acquiredDate/-Year` automatisch in die effektiven Felder. Tasks 4–6 verlassen sich darauf.

- [ ] **Step 1: Failing Test schreiben**

In `src/store/filters.test.ts` (bestehende Suite, Stil der Nachbartests übernehmen):

```ts
  it('acquiredYear-Filter trifft auch Proxy-Bücher (acquiredYearEffective)', () => {
    const proxy = mkBook({
      acquiredYearEffective: 2010,
      acquiredDateEffective: '2010-04-01',
      acquiredYearSource: 'entrydate',
    })
    const none = mkBook({})
    const out = filterBooks([proxy, none], [{ kind: 'acquiredYear', from: 2010, to: 2010 }])
    expect(out).toEqual([proxy])
  })
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/store/filters.test.ts`
Expected: FAIL (Typfehler unbekannter Felder bzw. leeres Ergebnis).

- [ ] **Step 3: Implementierung**

`src/lib/types.ts`, in `Book` nach `bulkImport`:

```ts
  /** Regel 13: dateacquired, sonst entrydate als Proxy (außer bulkImport). */
  acquiredDateEffective: string | null
  acquiredYearEffective: number | null
  acquiredYearSource: 'dateacquired' | 'entrydate' | null
```

In `Stats` nach `withAcquiredDate: number`:

```ts
  withAcquiredEffective: number
```

`src/lib/fixtures.ts`: Das Spread-Muster beibehalten, aber die drei Felder NACH dem `...over` ableiten (Rückgabe in eine Konstante ziehen):

```ts
export function mkBook(over: Partial<Book> = {}): Book {
  seq += 1
  const base: Book = {
    /* ...bestehende Defaults unverändert..., */
    acquiredDateEffective: null,
    acquiredYearEffective: null,
    acquiredYearSource: null,
    ...over,
  }
  // Tests setzen meist nur acquiredDate/acquiredYear — die effektiven Felder
  // spiegeln das wie der Normalizer (Regel 13), solange sie nicht explizit
  // übersteuert werden.
  if (over.acquiredYearEffective === undefined && over.acquiredDateEffective === undefined && over.acquiredYearSource === undefined) {
    base.acquiredDateEffective = base.acquiredDate
    base.acquiredYearEffective = base.acquiredYear
    base.acquiredYearSource = base.acquiredYear !== null ? 'dateacquired' : null
  }
  return base
}
```

`src/lib/libraryStore.ts:11`: `export const SCHEMA_VERSION = 2` (Kommentar dort ggf. um „2: effektives Erwerbssignal (Regel 13)" ergänzen).

`src/store/filters.ts`, `case 'acquiredYear'`:

```ts
    case 'acquiredYear':
      return b.acquiredYearEffective !== null && b.acquiredYearEffective >= f.from && b.acquiredYearEffective <= f.to
```

- [ ] **Step 4: Tests + Typen prüfen**

Run: `npx vitest run src/store/filters.test.ts && npx tsc --noEmit`
Expected: Filtertest PASS; tsc meldet noch KEINE Fehler (die Views lesen weiterhin die alten Felder — das ist ok, sie sind nicht entfernt).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/fixtures.ts src/lib/libraryStore.ts src/store/filters.ts src/store/filters.test.ts
git commit -F <msgdatei>   # "feat(model): effektive Erwerbsfelder in Typen, Fixtures und Filter" + Trailer
```

---

### Task 4: viewData-Module auf effektives Signal umstellen

**Files:**
- Modify: `src/lib/viewData/timeline.ts`, `knowledge.ts`, `yearMatrix.ts`, `tagTrends.ts`, `shelf.ts`, `shelfLegend.ts`
- Test: `src/lib/viewData/timeline.test.ts`, ggf. Nachbartests, die dadurch brechen

**Interfaces:**
- Consumes: `acquiredYearEffective`/`acquiredDateEffective` (Task 3), `mkBook`-Spiegelung.
- Produces: unveränderte öffentliche Signaturen — nur die gelesenen Buchfelder wechseln.

**Ersetzungsregel (mechanisch, in genau diesen Dateien):** jedes lesende `b.acquiredYear` → `b.acquiredYearEffective`, jedes lesende `a.acquiredDate`/`b.acquiredDate` → `acquiredDateEffective`. Im Einzelnen:

| Datei | Stellen |
| --- | --- |
| `timeline.ts` | `const acq = books.filter(...)`, beide `map`-Casts, `acquired`-Zählung, `unread`-Zählung |
| `knowledge.ts` | `withAcq`-Filter, `yMin`/`yMax`-Casts, Zellzählung |
| `yearMatrix.ts` | `both`-Filter, `const acq = b.acquiredYear as number` |
| `tagTrends.ts` | `axisYear`: `axis === 'acquired' ? b.acquiredYearEffective : ...` |
| `shelf.ts` | `cmp.acquired`: `(a.acquiredDateEffective ?? String(a.acquiredYearEffective ?? '9999'))` (beide Seiten) |
| `shelfLegend.ts` | `case 'acquiredYear'`-Zweig: beide `b.acquiredYear`-Lesungen (Null-Check und Dekade) |

Der Filter-Kind-Name `'acquiredYear'` (shelfLegend, Rückgabe-Filter) bleibt unverändert — die Dimension heißt weiter so, nur ihr Nenner ist effektiv.

- [ ] **Step 1: Failing Test schreiben**

In `src/lib/viewData/timeline.test.ts` ergänzen:

```ts
  it('zählt Proxy-Bücher (nur acquiredYearEffective gesetzt) im Erwerbsbalken', () => {
    const proxy = mkBook({
      acquiredYearEffective: 2010,
      acquiredDateEffective: '2010-04-01',
      acquiredYearSource: 'entrydate',
    })
    const data = timelineData([proxy])
    expect(data.acquiredKnown).toBe(1)
    expect(data.points.find((p) => p.year === 2010)?.acquired).toBe(1)
  })
```

Und in `src/lib/viewData/shelf.test.ts` (Spec: „Shelf sortiert ihn ein"):

```ts
  it('acquired-Sortierung nutzt das effektive Datum (Proxy-Bücher reihen sich ein)', () => {
    const early = mkBook({
      acquiredYearEffective: 2005,
      acquiredDateEffective: '2005-01-01',
      acquiredYearSource: 'entrydate',
      physical: { heightMm: 200, thicknessMm: 20, lengthMm: 130, weightG: null },
    })
    const late = mkBook({
      acquiredDate: '2015-06-01',
      acquiredYear: 2015,
      physical: { heightMm: 200, thicknessMm: 20, lengthMm: 130, weightG: null },
    })
    const { placed } = shelfLayout([late, early], { sort: 'acquired', rowWidth: 600 })
    expect(placed.map((p) => p.book)).toEqual([early, late])
  })
```

- [ ] **Step 2: Tests laufen lassen — beide müssen fehlschlagen**

Run: `npx vitest run src/lib/viewData/timeline.test.ts src/lib/viewData/shelf.test.ts`
Expected: FAIL (`acquiredKnown` 0 bzw. falsche Reihenfolge).

- [ ] **Step 3: Alle sechs Dateien gemäß Tabelle umstellen**

- [ ] **Step 4: Gesamte Testsuite + Typen**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alles PASS. Bestehende Tests, die `acquiredYear` über `mkBook` setzen, laufen dank der Fixture-Spiegelung unverändert. Bricht ein Test anders, den Bruch verstehen statt wegcasten.

- [ ] **Step 5: Commit**

```bash
git add src/lib/viewData/
git commit -F <msgdatei>   # "feat(viewData): Erwerbs-Lesarten auf acquiredYearEffective umgestellt" + Trailer
```

---

### Task 5: View-Komponenten auf effektives Signal umstellen

**Files:**
- Modify: `src/views/KnowledgeMap.tsx:70` (Zellzählung), `:166` (Brush unverändert lassen — setzt nur den Filter)
- Modify: `src/views/AcquisitionReading.tsx:84-88` (Popup-`dateOf` und Jahresmenge), `:366` (Popup-Datumsspalte)
- Modify: `src/views/TagTrends.tsx:133`, `:499` (Popup-`dateOf` Erwerbsachse)
- Modify: `src/views/LanguageFlow.tsx:47` (Jahresbereichs-Vorbelegung)
- Modify: `src/views/Shelf.tsx:37` (yearScale-Domain), `:76` (fill)

**Interfaces:**
- Consumes: `acquiredYearEffective`/`acquiredDateEffective`.
- Produces: keine neuen Schnittstellen.

- [ ] **Step 1: Ersetzungen durchführen**

Gleiche mechanische Regel wie Task 4: lesende `b.acquiredYear` → `b.acquiredYearEffective`, `b.acquiredDate` → `b.acquiredDateEffective` — NUR in den oben gelisteten Zeilen. Filter-Aufrufe (`setRange('acquiredYear', ...)`, `f.kind === 'acquiredYear'`, `<option value="acquiredYear">`) bleiben unverändert: das ist der Dimensionsname. In `AcquisitionReading.tsx` betrifft es beide Arme des Popup-Codes (`popup.anchor.dim === 'acquired' ? (b) => b.acquiredDateEffective : (b) => b.readDate` und die Jahresmengen-Bedingung `b.acquiredYearEffective === popup.anchor.year`); in `TagTrends.tsx` beide `dateOf`-Stellen analog.

- [ ] **Step 2: Suite + Typen + Build**

Run: `npx vitest run && npx tsc --noEmit && npx vite build`
Expected: alles grün.

- [ ] **Step 3: Sichtprüfung am Dev-Server**

```bash
npm run dev -- --port 5199   # eigener Server; 5174 nie anfassen
```

Mit Playwright (IndexedDB-Seed aus `/data/hidden/library.json` wie etabliert): Erwerb & Lektüre öffnen — die Balkensumme der Erwerbsseite muss 3.874 entsprechen (Coverage-Angabe der View prüfen); ein Klick auf ein Jahr ≥ 2007 filtert auch Proxy-Bücher (Regal-Zählung ändert sich konsistent). Danach Server beenden (pkill auf den 5199-Prozess; Exit 144 ist erwartet).

- [ ] **Step 4: Commit**

```bash
git add src/views/
git commit -F <msgdatei>   # "feat(views): Erwerbs-Views lesen das effektive Signal" + Trailer
```

---

### Task 6: BookDetail-Herkunftshinweis + Import-Berichtszeile (i18n, 5 Sprachen)

**Files:**
- Modify: `src/components/BookDetail.tsx:57` (Erwerbszeile)
- Modify: `src/components/DataUpload.tsx` (Berichtszeile nach `bulkImport`)
- Modify: `src/i18n/messages.ts`, `de.tsx`, `en.tsx`, `fr.tsx`, `es.tsx`, `ja.tsx`

**Interfaces:**
- Consumes: `acquiredDateEffective`/`acquiredYearEffective`/`acquiredYearSource`, `stats.withAcquiredEffective`, `stats.withAcquiredDate`.
- Produces: Message-Schlüssel `detail.acquiredProxy(v: string) => string`, `report.acquired: string`, `report.acquiredValue(directFmt, proxyFmt, totalFmt) => string`.

- [ ] **Step 1: Message-Interface erweitern**

`src/i18n/messages.ts`: im `detail`-Block nach `read`-Umfeld `acquiredProxy: (v: string) => string`; im `report`-Block nach `bulkImportValue` die zwei `acquired`-Schlüssel (Signaturen wie oben).

- [ ] **Step 2: Fünf Bundles füllen**

| | `detail.acquiredProxy(v)` | `report.acquired` | `report.acquiredValue(d, p, t)` |
| --- | --- | --- | --- |
| de | `` `${v} (per Katalogisierungsdatum)` `` | `'Erwerbssignal'` | `` `${d} direkt + ${p} per Katalogisierungsdatum = ${t}` `` |
| en | `` `${v} (from entry date)` `` | `'Acquisition signal'` | `` `${d} direct + ${p} via entry date = ${t}` `` |
| fr | `` `${v} (d’après la date de saisie)` `` | `'Signal d’acquisition'` | `` `${d} directs + ${p} via la date de saisie = ${t}` `` |
| es | `` `${v} (según la fecha de registro)` `` | `'Señal de adquisición'` | `` `${d} directas + ${p} por fecha de registro = ${t}` `` |
| ja | `` `${v}（登録日による）` `` | `'入手シグナル'` | `` `直接 ${d} 件 + 登録日による ${p} 件 = 計 ${t} 件` `` |

(ja mit Vollbreiten-Klammern; fr-Apostroph `’`.)

- [ ] **Step 3: Komponenten anpassen**

`BookDetail.tsx`, Erwerbszeile ersetzen:

```tsx
    [
      m.detail.acquired,
      (() => {
        const v = book.acquiredDateEffective ?? (book.acquiredYearEffective !== null ? String(book.acquiredYearEffective) : null)
        if (v === null) return null
        // Regel 13: Proxy-Herkunft sichtbar machen — die Zahl soll nicht mehr
        // Gewissheit vortäuschen, als die Daten hergeben.
        return book.acquiredYearSource === 'entrydate' ? m.detail.acquiredProxy(v) : v
      })(),
    ],
```

`DataUpload.tsx`, in `rows` nach der `bulkImport`-Zeile:

```tsx
      [m.report.acquired, m.report.acquiredValue(
        fmtNum(stats.withAcquiredDate),
        fmtNum(stats.withAcquiredEffective - stats.withAcquiredDate),
        fmtNum(stats.withAcquiredEffective),
      )],
```

- [ ] **Step 4: Suite + Typen (Typsystem erzwingt Vollständigkeit der Bundles)**

Run: `npx vitest run && npx tsc --noEmit`
Expected: grün — fehlt ein Bundle-Schlüssel, schlägt tsc fehl.

- [ ] **Step 5: Commit**

```bash
git add src/components/BookDetail.tsx src/components/DataUpload.tsx src/i18n/
git commit -F <msgdatei>   # "feat(ui): Proxy-Herkunft im BookDetail und Erwerbssignal im Import-Bericht" + Trailer
```

---

### Task 7: DoD-Verifikation (Playwright) — kein neuer Code

**Files:** keine Änderungen erwartet; Befunde führen zurück in die betroffene Task.

- [ ] **Step 1:** `npx vitest run && npx tsc --noEmit && npx vite build` — alles grün.
- [ ] **Step 2:** Dev-Server auf Port 5199, IndexedDB mit `/data/hidden/library.json` seeden (etabliertes Muster: db `tsundoku` v1, store `library`, key `current`, `{schemaVersion: 2, savedAt, sourceName, library}` — Achtung: neue Schema-Version 2).
- [ ] **Step 3:** DoD aus der Spec abhaken: (a) Erwerbsbalken-Summe 3.874, 2006 ohne Proxy-Anteil; (b) Jahresklick ≥ 2007 filtert Proxy-Bücher mit; (c) BookDetail eines Proxy-Buchs zeigt den Herkunftshinweis — Stichprobe in de und ja; (d) Import-Bericht-Zeile erscheint nach frischem Upload (Upload-Ansicht mit dem Roh-Export testen oder Bericht-Screen via „Bibliothek wechseln").
- [ ] **Step 4:** Screenshots/Artefakte aus `.playwright-mcp/` löschen; Server beenden.
- [ ] **Step 5:** Befunde (falls DoD verletzt) als Fix-Runde in der jeweiligen Task behandeln; sonst fertig.
