# Datenqualitäts-View — Design

Datum: 2026-08-08 · Branch: `feat/data-quality-view` (von `feat/acquired-effective`,
gestaffelter PR) · Status: entworfen

## Motivation

CLAUDE.md verlangt: verworfene und veränderte Werte werden gezählt und in
einer Datenqualitäts-Ansicht sichtbar gemacht; fehlende Daten sind ein
Befund, keine Lücke. `docs/visualisierungen.md` führt die View unter
„Später": *die ehrlichste Ansicht der App und billig zu bauen, weil die
Zahlen ohnehin anfallen.* Alle Zutaten existieren: die Normalizer-Zähler in
`stats`, die Feldabdeckung an den Büchern selbst und buchbezogene
Qualitäts-Flags.

## Entscheidungen

1. **Hybrid:** Feldabdeckung und Flag-Zählungen werden aus dem
   **gefilterten** Bestand berechnet und reagieren auf Filter; die reinen
   Import-Zähler (Entities, Maße sortiert/verworfen …) sind global und als
   solche gekennzeichnet — sie fallen nur beim Import an.
2. **Sechs Qualitäts-Flags sind filterbar** über eine generische
   Filterdimension `{ kind: 'flag', value: FlagId }`.
3. **Aufbau:** Kennzahlen-Kacheln (Schlagzeile, schwellwertgefärbt) →
   Balkenliste Feldabdeckung → Balkenliste Flags (klickbar) → globale
   Import-Bereinigung als Liste. Kachel-Dimensionen wiederholen sich in den
   Balkenlisten bewusst: Kachel = Schlagzeile, Liste = vollständiges,
   vergleichbares Inventar.
4. **Kein Titel-Popup** in dieser View: Die Flag-Mengen sind groß
   (399–1.016 Titel), eine Popup-Liste wäre unlesbar; der Klick-Filter
   übernimmt die Rolle „zeig mir diese Bücher" über alle anderen Views.
5. **Neues Normalizer-Flag `abandoned`** („angefangen, nicht
   abgeschlossen") als Regel 14; `hasRead` bleibt unangetastet.
6. **Navigation:** letzte Position der Reihenfolge (nach Lesetempo) — die
   View ist Meta, kein Erkenntnis-Einstieg; sie landet damit im Mehr-Menü.

## Normalizer (Regel 14: `abandoned`)

```
abandoned = (startedDate vorhanden UND nicht hasRead)
            ODER tagsNorm enthält 'unfinished'
```

Begründung im Datenprofil: `datestarted` ohne Abschluss kann „abgebrochen"
oder „Abschluss nie eingetragen" bedeuten — die Daten unterscheiden das
nicht; der Tag `unfinished` markiert zusätzlich 35 Abbrüche, die trotzdem
in „Have read" liegen (Schnittmenge mit der startedDate-Regel: leer).
`hasRead` wird nicht verändert: die 35 bleiben „gelesen" **und** sind als
abgebrochen markiert — die Filterkombination zeigt genau diese Spannung.

**Stats:** neuer Zähler `abandoned` (erwartet: 431 = 396 + 35).
Konsolenzeile von `normalize.mjs`, CLAUDE.md-Erwartungsblock und
Datenprofil nachführen.

## Flags (`src/lib/flags.ts`)

```ts
export const FLAG_IDS = [
  'bulkImport',        // b.bulkImport                          — 1.016
  'physicalEstimated', // b.physicalEstimated                   — 563
  'origLangInferred',  // b.originalLanguagesInferred           — 1.016
  'readYearTag',       // b.readYearSource === 'tag'            — 399
  'acquiredEntry',     // b.acquiredYearSource === 'entrydate'  — 273
  'abandoned',         // b.abandoned                           — 431
] as const
export type FlagId = (typeof FLAG_IDS)[number]
export function hasFlag(b: Book, id: FlagId): boolean
```

(Zahlen: erwartete Treffer im ungefilterten Bestand.)

## Filterdimension `flag`

- `Filter`-Union: `{ kind: 'flag'; value: FlagId }`.
- `matches`: `hasFlag(b, f.value)`.
- **UND innerhalb der Dimension** wie Tags/Genres (mehrere Flags verengen);
  die UND-Ausnahme in `filterBooks` wird um `'flag'` erweitert, ebenso der
  Doku-Kommentar dort und die Architektur-Notiz in CLAUDE.md.
- `urlSync`: Param `['flag', 'flag']`; `parseOne` validiert gegen
  `FLAG_IDS` (unbekannter Wert → verworfen wie bei `mediaType`).
- Chip-Label: `m.filter.flag(m.flagNames[value])`, fünfsprachig.
- `FilterEditor` bleibt unverändert (wie bei Genre): Flags setzt man in der
  View.

## Die View (`src/views/DataQuality.tsx` + `src/lib/viewData/quality.ts`)

View-Id `quality`, ans Ende von `VIEW_IDS`/`VIEW_ORDER`/`VIEW_REGISTRY`.
Nav-Titel: de „Datenqualität", en „Data quality", fr „Qualité des données",
es „Calidad de datos", ja „データ品質". Bei leerem Filterergebnis
`EmptyState` wie überall.

### Block 1: Fünf Kennzahlen-Kacheln (gefiltert)

Jede Kachel: großer Prozentwert (Mono), Label, Untersatz mit absoluten
Zahlen. Färbung als Hintergrund-Tönung nach Schwellwert; der Zahlwert
steht immer dabei — Farbe ist nie alleiniger Träger.

| Kachel | Zähler / Nenner | ungefiltert | Untersatz |
| --- | --- | --- | --- |
| Erwerbssignal | `acquiredYearEffective` vorhanden / alle | 79,6 % | „3.601 direkt · 273 per Katalogisierung · 991 ohne" |
| Lesejahr | `readYearEffective` vorhanden / gelesene (`hasRead`) | 97,0 % (1.294/1.334) | „davon 371 nur per Jahres-Tag" |
| Massenimport | `bulkImport` / alle — **invertierte Skala** | 20,9 % (1.016) | „Katalogisierungs-Sessions, kein Erwerbsverhalten" |
| Maße | vermessen (`!physicalEstimated && heightMm ≠ null`) / alle | 78,8 % (3.834) | „563 geschätzt · 468 ohne" |
| Rating | `rating ≠ null` / alle | 25,1 % (1.220) | „1.220 bewertet" |

Schwellwerte (Abdeckung): **≥ 80 %** rikyū-Tönung, **50–79 %** kon-Tönung,
**< 50 %** enji-Tönung. Massenimport invertiert: **≤ 5 %** rikyū,
**5–20 %** kon, **> 20 %** enji — der ungefilterte Bestand landet mit
20,9 % also ehrlich in der enji-Zone. Tönungen als `color-mix`/rgba über
`--paper`, Textfarbe bleibt `--sumi` (Kontrast). Nenner 0 (leerer
Teilbestand nach Filter, z. B. keine gelesenen) → Kachel zeigt „—" ohne
Färbung statt 0 %.

### Block 2: Feldabdeckung (gefiltert, reine Anzeige)

Balkenzeilen in der Zeilen-Optik der Genres-View (Label · Balken
vorhanden/gesamt · „N von M · P %"), absteigend nach Abdeckung sortiert.
Keine Klick-, keine Popup-Interaktion; keine Hover-Tönung (die Tönung
signalisiert sonst Klickbarkeit).

| Feld | Prädikat | ungefiltert |
| --- | --- | --- |
| DDC | `ddc ≠ null` | 83,0 % |
| Seitenzahl | `pages ≠ null` | 81,7 % |
| Maße vermessen | `!physicalEstimated && heightMm ≠ null` | 78,8 % |
| Originalsprache erfasst | `originalLanguages.length > 0 && !originalLanguagesInferred` | 78,0 % |
| Erwerbsdatum direkt | `acquiredYear ≠ null` | 74,0 % |
| Gewicht | `weightG ≠ null` | 67,7 % |
| Auszeichnungen | `awards.length > 0` | 28,8 % |
| Lesebeginn | `startedDate ≠ null` | 28,4 % |
| Preis | `price ≠ null` | 27,5 % |
| Rating | `rating ≠ null` | 25,1 % |
| Lesedatum | `readDate ≠ null` | 19,2 % |
| Serie | `series.length > 0` | 13,4 % |
| Bezugsquelle | `fromWhere ≠ null` | 5,3 % |

Feldnamen fünfsprachig (`m.views.quality.fields`, typisiert als Record über
die Feld-Ids, damit das Typsystem Vollständigkeit erzwingt).

### Block 3: Qualitäts-Flags (gefiltert, klickbar)

Balkenzeilen wie Block 2, aber klickbar wie Genre-Zeilen: Klick togglet
`{ kind: 'flag', value }`, `aria-pressed` bei aktivem Filter, Hover-Tönung
`--ink-08` auf ganzer Zeile. Reihenfolge absteigend nach Trefferzahl
(ungefiltert: bulkImport 1.016 · origLangInferred 1.016 ·
physicalEstimated 563 · abandoned 431 · readYearTag 399 ·
acquiredEntry 273; bei Gleichstand entscheidet die FLAG_IDS-Reihenfolge). Flag-Namen
fünfsprachig (`m.flagNames`), z. B. de:

- `origLangInferred`: „Originalsprache abgeleitet"
- `bulkImport`: „Massenimport-Eintrag"
- `physicalEstimated`: „Maße geschätzt"
- `acquiredEntry`: „Erwerb nur per Katalogisierungsdatum"
- `abandoned`: „Angefangen, nicht abgeschlossen"
- `readYearTag`: „Lesejahr nur per Jahres-Tag"

Hinweis zur scheinbaren Abweichung: `readYearTag` zählt 399 im
Gesamtbestand; die Lesejahr-Kachel nennt 371, weil ihr Nenner die
gelesenen Titel sind — 28 Bücher tragen einen Jahres-Tag, liegen aber
nicht in „Have read". Das ist dieselbe Sorte Befund, die diese View
sichtbar machen soll, kein Rechenfehler.

### Block 4: Import-Bereinigung (global, Liste)

Schlichte Definitionsliste unter der Überschrift „Beim Import bereinigt
(ganze Bibliothek)" — ausdrücklich als global gekennzeichnet, reagiert
nicht auf Filter. Quelle `stats`, plus ein clientseitig aus `books`
gezählter Tag-Wert (Vorbild: Import-Bericht in `DataUpload.tsx`):

| Zeile | Quelle | ungefiltert |
| --- | --- | --- |
| HTML-Entities dekodiert | `stats.entitiesDecoded` | 924 |
| Maße umsortiert (permutiert) | `stats.dimsSorted` | 822 |
| Maße verworfen | `stats.dimsDiscarded` | 9 |
| Maße aus Seitenzahl geschätzt | `stats.dimsEstimated` | 563 |
| Originalsprachen abgeleitet | `stats.origLangInferred` | 1.016 |
| Tags zusammengeführt | roh distinct → `stats.tagsNorm.length` | 3.762 → 3.702 |

## i18n

Neue Schlüssel: `nav.quality`, `views.quality.*` (Titel, Kachel-Labels und
-Untersätze als Formatierungsfunktionen, Blocküberschriften, Feldnamen,
Zeilenformat „N von M · P %"), `flagNames` (Record über `FlagId`),
`filter.flag`. `de.tsx` ist Referenz; fr mit ` ` vor `%`, ja mit
Vollbreiten-Interpunktion, wie in den bestehenden Bundles.

## Barrierefreiheit

Kacheln und Zeilen sind per Tastatur erreichbar (Flags als `button` mit
sichtbarem Fokus); Färbung nur Tönung + Zahl; `prefers-reduced-motion`
betrifft diese View nicht (keine Animationen).

## Tests

- `scripts/normalize.test.mjs`: Regel 14 — startedDate ohne Abschluss,
  unfinished-Tag trotz hasRead, gelesen mit startedDate (kein Flag),
  Zähler.
- `src/lib/flags.test.ts`: `hasFlag` für alle sechs Ids.
- `src/store/`-Tests: flag-Filter matcht/verengt als UND; urlSync
  round-trip inkl. Verwerfen unbekannter Werte.
- `src/lib/viewData/quality.test.ts`: Kachel-Berechnung (inkl. Nenner 0),
  Abdeckungszeilen, Sortierung.
- Playwright-DoD (Port 5199): Kachelwerte im ungefilterten Bestand wie in
  den Tabellen; Flag-Klick setzt Chip und filtert eine andere View;
  Sprachwechsel ja/fr stichprobenartig.

## Definition of Done

1. Ungefilterte Kacheln zeigen 79,6 / 97,0 / 20,9 / 78,8 / 25,1 % mit den
   dokumentierten Untersätzen; Abweichungen werden geklärt und im Spec
   nachgetragen, nicht weggecastet.
2. Flag-Klick „Angefangen, nicht abgeschlossen" → Chip erscheint, Regal
   zeigt 431 Bücher; zweites Flag verengt (UND).
3. Filter aus anderer View (z. B. Genre) verändert Kacheln und Balken;
   Block 4 bleibt unverändert global.
4. URL mit `?flag=abandoned` stellt den Zustand her; unbekannter Wert wird
   ignoriert.
5. Alle Vitest-Tests grün; Datenprofil (Regel 14) und
   CLAUDE.md-Erwartungsblock aktualisiert.
