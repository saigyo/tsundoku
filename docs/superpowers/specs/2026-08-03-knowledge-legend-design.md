# Wissenslandkarten-Legende: stabil, markiert, lesbar — Design

**Datum:** 2026-08-03
**Status:** freigegeben zur Planung

## Motivation

Die Legende der Wissenslandkarte filtert bereits per Klick (`toggleFilter`
auf `ddcTop`), leidet aber am Verschwinde-Problem: `data.classes` und die
Zählungen stammen aus `ddcYearMatrix(filtered)` — nach dem Klick auf eine
Klasse sind die Geschwister weg. Außerdem stehen die Anzahlen durch
`margin-left: auto` am rechten Zellenrand des Rasters, optisch näher am
nächsten Eintrag als am eigenen Label, und DDC-Code wie Anzahl sind
identisch gestylt (Mono, `--ink-70`) und dadurch verwechselbar. Der aktive
Zustand ist gar nicht markiert (auch kein `aria-pressed`).

## Entscheidungen (mit Markus abgestimmt)

1. **Feste Taxonomie statt Datenableitung:** Die Legende zeigt immer alle
   zehn DDC-Hauptklassen (0–9), unabhängig von Daten und Filtern. Leere
   Klassen zeigen 0 und bleiben klickbar.
2. **Zählung mit Ausschluss-Semantik** (Muster aus Filter-Editor und
   Regal-Legende): gezählt wird auf
   `filterBooks(books, filters ohne ddcTop)`, eingeschränkt auf die
   Population dieser View — `b.acquiredYear !== null && b.ddc !== null`
   (dasselbe `usable`-Kriterium wie in `ddcYearMatrix`). Die Zählung
   läuft direkt über Bücher, nicht über die (bei „geglättet" gerundeten)
   Stromzeilen — exakte Zahlen unabhängig vom Glättungs-Schalter.
   Die Ströme selbst bleiben unverändert aus `filtered` gezeichnet.
3. **Anzahl direkt hinter dem Label** (kleiner Abstand statt
   `margin-left: auto`); das Raster (`grid`, 16rem-Spalten) bleibt.
4. **DDC-Code als Code-Badge:** Mono, etwas kleiner (11px), Hintergrund
   `--ink-08`, Padding `0 3px`, Radius `--radius` — liest sich als
   Bezeichner. Die Anzahl bleibt nackte Mono-Zahl in `--ink-70` (wie in
   der Regal-Legende). Verworfen: Code auf Stromfarbe — Textkontrast bei
   zehn Farben nicht haltbar.
5. **Aktiv-Markierung wie im Regal:** `aria-pressed`, Rahmen `--kon` plus
   Fläche `--ink-08`; transparenter 1px-Rahmen im Ruhezustand (kein
   Layout-Sprung), Hover/Fokus `--ink-45`. Auf aktiver Fläche bekommt das
   Code-Badge `--ink-15`, damit es sich weiter abhebt.
6. **Unverändert:** Hover-Kopplung Legende ↔ Strom (`hoverClass`), Klick-
   und Brush-Verhalten des Diagramms, Store, URL-Sync, i18n (keine neuen
   Keys — Labels aus `m.ddc.labels`, `aria-pressed` trägt den Zustand).

## Verhalten im Detail

- Aktiv ist ein Eintrag, wenn `filters` einen `{ kind: 'ddcTop', value: c }`
  enthält (`sameFilter`) — egal ob per Legende, Strom-Klick, Buch-Popup
  oder URL gesetzt.
- Mehrfachauswahl (ODER) funktioniert damit wie in der Regal-Legende:
  Geschwister bleiben sichtbar, zweiter Klick auf eine andere Klasse
  ergibt zwei Chips.
- Klassen, die die Bibliothek gar nicht enthält, stehen mit 0 in der
  Legende — die Ströme zeichnen weiterhin nur vorhandene Klassen
  (`data.classes`).
- Hover auf einem Legendeneintrag hebt weiterhin den zugehörigen Strom
  hervor; bei Klassen ohne Strom (0) passiert visuell nichts — akzeptiert.

## Dateien

| Datei | Änderung |
|---|---|
| `src/views/KnowledgeMap.tsx` | Legende über festes `[0..9]`; `legendCounts` als `useMemo` (Ausschluss-Semantik, vor Early-Returns); `aria-pressed` + Aktiv-Klasse; Badge-Span |
| `src/views/KnowledgeMap.module.css` | `legendCount` ohne `margin-left: auto`; `legendNum` → Badge; Aktiv-/Hover-Zustände |
| Store, i18n, `lib/viewData/knowledge.ts` | unverändert |

Die Zählung ist eine Drei-Zeilen-Komposition aus `filterBooks` + Tally in
der Komponente (bereits getestete Bausteine, wie bei der Regal-Legende) —
keine neue Bibliotheksfunktion, keine neuen Tests nötig; die bestehenden
`ddcYearMatrix`-Tests bleiben unberührt.

## Definition of Done

- Klick auf „Philosophie & Psychologie" setzt den Chip; alle zehn Klassen
  bleiben in der Legende sichtbar, der aktive Eintrag ist markiert
  (Kon-Rahmen + Fläche, `aria-pressed="true"`).
- Zweite Klasse zusätzlich wählbar → zwei Chips, ODER-Menge.
- Zahlen stehen direkt hinter den Labels; bei aktivem Fremdfilter
  (z. B. `Status: gelesen`) passen sie sich an, Klassen mit 0 bleiben
  sichtbar und klickbar.
- Glättungs-Schalter ändert die Legendenzahlen nicht.
- DDC-Codes erscheinen als Badge, optisch klar von den Anzahlen
  unterschieden; auf aktiver Fläche weiterhin abgehoben.
- Tastatur: Einträge fokussierbar, Enter/Leertaste togglet,
  `aria-pressed` korrekt.
- `tsc` sauber, alle Tests grün, `vite build` fehlerfrei.
