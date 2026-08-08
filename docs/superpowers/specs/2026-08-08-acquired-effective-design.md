# Effektives Erwerbssignal (`acquiredYearEffective`) — Design

Datum: 2026-08-08 · Branch: `feat/acquired-effective` (von `main`) · Status: entworfen

## Motivation

Alle Erwerbs-Views (Erwerb & Lektüre, Wissenslandkarte, Ausgabe × Erwerb,
Regal-Sortierung und -Färbung, Tag-Trends, Sprachfluss) lesen heute
ausschließlich `acquiredYear` aus `dateacquired` — Abdeckung 74,0 %
(3.601 von 4.865). `entrydate` hat dagegen 100 % Abdeckung und ist für alle
Nicht-Massenimport-Einträge ein brauchbarer Proxy für den Erwerbszeitpunkt:
Wer ein Buch kurz nach dem Kauf katalogisiert, hinterlässt mit dem
Katalogisierungsdatum eine Erwerbsspur. Nur die Massenimport-Tage
(Katalogisierungs-Sessions, v. a. August 2006) sind als Erwerbssignal
wertlos — sie sind bereits als `bulkImport` markiert.

Analog zu `readYearEffective` (dateread, sonst Jahres-Tag) entsteht ein
effektives Erwerbssignal mit Quellen-Marker. Die Erwerbs-Zeitachse wächst
damit von 74,0 % auf 84,5 % Abdeckung, ohne dass eine einzige Zahl
erfunden wird.

## Entscheidungen

1. **Neue Felder statt Überschreiben.** `acquiredDate`/`acquiredYear`
   bleiben unverändert (keine stille Korrektur); daneben entstehen
   `acquiredDateEffective`, `acquiredYearEffective` und
   `acquiredYearSource`.
2. **Bulk-Ausnahme nur für den Fallback.** Ein Massenimport-Eintrag mit
   echtem `dateacquired` zählt als direkt (9 Fälle); nur der
   entrydate-Fallback ist für Bulk-Einträge gesperrt.
3. **Alle Erwerbs-Lesarten wechseln auf effektiv** — inklusive des
   `acquiredYear`-Filters, sonst verfehlt ein Jahresklick in einer View die
   Proxy-Bücher, die dieselbe View anzeigt.
4. **Herkunft sichtbar.** BookDetail kennzeichnet Proxy-Daten; die
   Datenqualitäts-View (Folge-Feature) macht die Dreiteilung
   direkt / Proxy / fehlend zur Kachel und das Proxy-Flag filterbar.

## Normalizer (Regel 13 im Datenprofil)

In `scripts/normalize-core.mjs`, pro Buch:

```
acquiredDateEffective = acquiredDate            wenn dateacquired vorhanden
                      = entryDate               sonst, wenn nicht bulkImport
                      = null                    sonst (bulk ohne dateacquired
                                                 oder entrydate fehlt)
acquiredYearEffective = Jahr davon (oder null)
acquiredYearSource    = 'dateacquired' | 'entrydate' | null
```

`entrydate` ist ein volles Datum — der Proxy verliert keine Granularität.
Die Regel wird als **Regel 13** in `docs/datenprofil.md` dokumentiert
(inkl. der Bulk-Ausnahme und der 9 Bulk-Fälle mit echtem Datum) und steht
als Kommentar im Code an der Stelle, wo sie greift.

**Stats:** neuer Zähler `withAcquiredEffective` (erwartet: 4.111) neben
`withAcquiredDate` (3.601). Kein neues Facetten-Array (keine View braucht
es).

**Erwartete Kennzahlen beim aktuellen Export** (in Konsolenzeile von
`normalize.mjs`, CLAUDE.md-Erwartungsblock und Datenprofil nachführen):

| Kennzahl | Wert |
| --- | --- |
| direkt (`dateacquired`) | 3.601 (74,0 %) |
| Proxy (`entrydate`, nicht bulk) | 510 (Jahre 2006–2026) |
| fehlend (bulk ohne Datum oder ohne entrydate) | 754 |
| effektiv gesamt | 4.111 (84,5 %) |
| bulk mit echtem `dateacquired` (zählt als direkt) | 9 |

## Frontend-Umstellung

**Typen:** `Book` um die drei Felder erweitern, `Stats` um
`withAcquiredEffective`; `src/lib/fixtures.ts` nachziehen.

**Filter (`src/store/filters.ts`):** `case 'acquiredYear'` matcht gegen
`acquiredYearEffective`. Filterbedeutung („Erwerb von–bis") bleibt, nur der
Nenner wächst.

**Views/Datenmodule** — jede Stelle, die heute `acquiredYear` oder
`acquiredDate` liest, wechselt auf die effektive Variante:

| Stelle | Wechsel |
| --- | --- |
| `src/lib/viewData/timeline.ts` | Jahresbalken + Besitzkurve |
| `src/lib/viewData/knowledge.ts` | Jahresraster |
| `src/lib/viewData/yearMatrix.ts` | Erwerbsachse |
| `src/lib/viewData/tagTrends.ts` | `yearOf`-Erwerbsachse |
| `src/lib/viewData/shelf.ts` | Sortierung (`acquiredDateEffective ?? acquiredYearEffective`) |
| `src/lib/viewData/shelfLegend.ts` | Färbemodus Erwerbsjahr (Dekaden, `noAcqYear`-Fallback) |
| `src/views/KnowledgeMap.tsx` | Zellzählung + Brush |
| `src/views/AcquisitionReading.tsx` | Popup-Buchmenge und Datumsspalte (`acquiredDateEffective`) |
| `src/views/TagTrends.tsx` | Popup-Datumsspalte |
| `src/views/LanguageFlow.tsx` | Jahresbereichs-Vorbelegung |
| `src/views/Shelf.tsx` | Jahresskala der Färbung |

`entryDate`/`entryYear` selbst bleiben unbenutzt wie bisher — sie sind nur
noch Quelle des Normalizer-Fallbacks.

**BookDetail (`src/components/BookDetail.tsx`):** Die Erwerbszeile zeigt
`acquiredDateEffective`; bei `acquiredYearSource === 'entrydate'` mit
Herkunftshinweis, z. B. de: „12.03.2011 (per Katalogisierungsdatum)".
Neuer Message-Schlüssel `detail.acquiredProxy(dateFmt)` in allen fünf
Sprachen.

**Import-Bericht (`src/components/DataUpload.tsx`):** neue Zeile
„Erwerbssignal: 3.601 direkt + 510 per Katalogisierungsdatum = 4.111"
(Schlüssel `report.acquired`/`report.acquiredValue`), fünfsprachig.

## Tests

- `scripts/normalize.test.mjs`: Regel-13-Fälle — direkt, Fallback,
  Bulk-Sperre des Fallbacks, Bulk mit echtem Datum, weder-noch;
  `withAcquiredEffective`-Zähler.
- `src/store/filters.test.ts` (bzw. bestehende Filtertests):
  `acquiredYear`-Filter trifft ein Buch, dessen Signal nur aus dem Proxy
  stammt.
- Bestehende viewData-Tests: Fixtures um die Felder ergänzen; wo ein Test
  die Erwerbslogik prüft, einen Proxy-Fall aufnehmen (Timeline zählt ihn,
  Shelf sortiert ihn ein).

## Definition of Done

1. `node scripts/normalize.mjs <export>` meldet die Kennzahlen aus der
   Tabelle oben; Abweichungen werden im Datenprofil geklärt, nicht
   weggecastet.
2. Erwerb & Lektüre zeigt im ungefilterten Bestand Jahresbalken, deren
   Summe 4.111 ist (statt 3.601); die Jahre 2006–2026 enthalten
   Proxy-Anteile.
3. Klick auf ein Erwerbsjahr filtert auch die Proxy-Bücher dieses Jahres
   (Stichprobe per Playwright auf Port 5199).
4. BookDetail eines Proxy-Buchs zeigt den Herkunftshinweis in allen fünf
   Sprachen.
5. Alle Vitest-Tests grün; CLAUDE.md-Erwartungsblock und
   `docs/datenprofil.md` aktualisiert.
