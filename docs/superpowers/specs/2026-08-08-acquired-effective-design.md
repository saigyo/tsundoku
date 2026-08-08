# Effektives Erwerbssignal (`acquiredYearEffective`) — Design

Datum: 2026-08-08 · Branch: `feat/acquired-effective` (von `main`) · Status: entworfen

## Motivation

Alle Erwerbs-Views (Erwerb & Lektüre, Wissenslandkarte, Ausgabe × Erwerb,
Regal-Sortierung und -Färbung, Tag-Trends, Sprachfluss) lesen heute
ausschließlich `acquiredYear` aus `dateacquired` — Abdeckung 74,0 %
(3.601 von 4.865). `entrydate` hat dagegen 100 % Abdeckung und ist für alle
Nicht-Massenimport-Einträge ein brauchbarer Proxy für den Erwerbszeitpunkt:
Wer ein Buch kurz nach dem Kauf katalogisiert, hinterlässt mit dem
Katalogisierungsdatum eine Erwerbsspur. Wertlos ist das Signal nur für die
Erstkatalogisierung des Bestands und spätere Katalogisierungs-Sessions —
dafür wird die bestehende `bulkImport`-Erkennung erweitert (siehe unten).

Analog zu `readYearEffective` (dateread, sonst Jahres-Tag) entsteht ein
effektives Erwerbssignal mit Quellen-Marker. Die Erwerbs-Zeitachse wächst
damit von 74,0 % auf 79,6 % Abdeckung, ohne dass eine einzige Zahl
erfunden wird.

## Entscheidungen

1. **Neue Felder statt Überschreiben.** `acquiredDate`/`acquiredYear`
   bleiben unverändert (keine stille Korrektur); daneben entstehen
   `acquiredDateEffective`, `acquiredYearEffective` und
   `acquiredYearSource`.
2. **Bulk-Ausnahme nur für den Fallback.** Ein Massenimport-Eintrag mit
   echtem `dateacquired` zählt als direkt (25 Fälle); nur der
   entrydate-Fallback ist für Bulk-Einträge gesperrt.
3. **Erstkatalogisierungsphase datengetrieben, kein fest verdrahtetes
   Datum.** Die Tages-Schwelle (≥ 50) übersieht die „Schultertage" der
   Bestandserfassung (27.08.: 34, 28.10.: 37, 30.10.: 21 …). Die Phase
   verrät sich aber selbst: Solange ein Monat fast nur Einträge ohne
   `dateacquired` enthält, wird Bestand katalogisiert, nicht Erwerb
   erfasst. Eine Kalenderkonstante („bis Ende 2006") wäre einfacher,
   würde aber im Browser-Upload-Pfad fremde Bibliotheken falsch
   markieren.
4. **Alle Erwerbs-Lesarten wechseln auf effektiv** — inklusive des
   `acquiredYear`-Filters, sonst verfehlt ein Jahresklick in einer View die
   Proxy-Bücher, die dieselbe View anzeigt.
5. **Herkunft sichtbar.** BookDetail kennzeichnet Proxy-Daten; die
   Datenqualitäts-View (Folge-Feature) macht die Dreiteilung
   direkt / Proxy / fehlend zur Kachel und das Proxy-Flag filterbar.

## Normalizer

### Erweiterung Regel 1: Erstkatalogisierungsphase

Die `bulkImport`-Erkennung bekommt neben der Tages-Schwelle eine zweite,
monatsbasierte Komponente:

```
Phase = zusammenhängende Kalendermonate ab dem ersten Eintragsmonat des
        Kontos, in denen ≥ 2/3 der Einträge KEIN dateacquired tragen;
        sie endet vor dem ersten Monat, der die Bedingung verletzt.
bulkImport = entrydate liegt in der Phase
             ODER entrydate-Tag hat ≥ 50 Einträge (Regel wie bisher)
```

Beim aktuellen Export umfasst die Phase **August 2006 bis Januar 2007**
(Anteile ohne Kaufdatum: 98 / 100 / 99 / 98 / 82 / 93 %; Februar 2007
kippt auf 43 %, ab da dominieren frisch gekaufte Bücher). Die Tages-Schwelle
bleibt für spätere Sessions nötig (13.03.2016: 65 Einträge).
`stats.bulkImported` steigt dadurch von 763 auf **1.016**; Datenprofil
(Regel 1) und Import-Bericht führen beide Komponenten auf.

### Regel 13: effektives Erwerbssignal

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
(inkl. der Bulk-Ausnahme und der 25 Bulk-Fälle mit echtem Datum) und steht
als Kommentar im Code an der Stelle, wo sie greift.

**Stats:** neuer Zähler `withAcquiredEffective` (erwartet: 3.874) neben
`withAcquiredDate` (3.601). Kein neues Facetten-Array (keine View braucht
es).

**Erwartete Kennzahlen beim aktuellen Export** (in Konsolenzeile von
`normalize.mjs`, CLAUDE.md-Erwartungsblock und Datenprofil nachführen):

| Kennzahl | Wert |
| --- | --- |
| bulkImport gesamt (Phase + Tages-Schwelle) | 1.016 |
| direkt (`dateacquired`) | 3.601 (74,0 %) |
| Proxy (`entrydate`, nicht bulk) | 273 (Jahre 2007–2026) |
| fehlend (bulk ohne Datum oder ohne entrydate) | 991 |
| effektiv gesamt | 3.874 (79,6 %) |
| bulk mit echtem `dateacquired` (zählt als direkt) | 25 |

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
„Erwerbssignal: 3.601 direkt + 273 per Katalogisierungsdatum = 3.874"
(Schlüssel `report.acquired`/`report.acquiredValue`), fünfsprachig. Die
bestehende Massenimport-Zeile zeigt mit der Phasen-Regel automatisch
1.016.

## Tests

- `scripts/normalize.test.mjs`: Phasen-Fälle der Regel-1-Erweiterung —
  zusammenhängende Monate ≥ 2/3 ohne `dateacquired` sind Bulk, der erste
  Monat darunter beendet die Phase (spätere Monate mit hohem Anteil
  bleiben draußen), Tages-Schwelle greift weiterhin nach der Phase;
  Regel-13-Fälle — direkt, Fallback, Bulk-Sperre des Fallbacks
  (Phasen-Bulk und Tages-Bulk), Bulk mit echtem Datum, weder-noch;
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
   Summe 3.874 ist (statt 3.601); die Jahre 2007–2026 enthalten
   Proxy-Anteile, 2006 bekommt keinen einzigen Proxy (Erstkatalogisierung).
3. Klick auf ein Erwerbsjahr filtert auch die Proxy-Bücher dieses Jahres
   (Stichprobe per Playwright auf Port 5199).
4. BookDetail eines Proxy-Buchs zeigt den Herkunftshinweis in allen fünf
   Sprachen.
5. Alle Vitest-Tests grün; CLAUDE.md-Erwartungsblock und
   `docs/datenprofil.md` aktualisiert.
