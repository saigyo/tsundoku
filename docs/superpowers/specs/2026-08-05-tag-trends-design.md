# Tag-Trends: Entwicklung und Überrepräsentation der Tags über die Zeit — Design

**Datum:** 2026-08-05
**Status:** freigegeben zur Planung

## Motivation

Die Wissenslandkarte zeigt die Entwicklung der Sammlung entlang der zehn
DDC-Klassen — die Tags (3.702 normalisierte, Top: Japan 948) sind aber die
feinere und persönlichere Themenschicht. Die neue Ansicht beantwortet zwei
Fragen zugleich: **„Wie entwickeln sich meine Themen?"** (Häufigkeit über
die Zeit) und **„Was war in diesem Zeitabschnitt anders als sonst?"**
(Überrepräsentation gegenüber der aktuellen Filtermenge — die „Phasen" der
Sammlung, die in absoluten Zahlen unter den Dauerbrennern verschwinden).

## Entscheidungen (mit Markus abgestimmt)

1. **Beide Lesarten gleichrangig,** als zwei gekoppelte Teilbilder: oben
   ein Trend-Panel, darunter die Abschnitts-Rangliste.
2. **Trend-Panel umschaltbar** (Variante D aus dem Brainstorming):
   Modus „Linien" (Top-12 + gepinnte, einzeln verfolgbar) und Modus
   „Heatmap" (Top-30 + gepinnte, Phasen auf einen Blick). Ein Datenmodell,
   zwei Projektionen; Streamgraph verworfen (12+ ähnlich große Ströme sind
   nicht einzeln verfolgbar, Umstapeln bei Zu-/Abwahl unruhig);
   Übereinander-Variante verworfen (drei Panels sprengen die
   Viewport-Höhe, Redundanz).
3. **Feste Label-Spalte links, in beiden Modi gleiche Sortierung**
   (Gesamthäufigkeit in der Filtermenge, absteigend; bei Gleichstand
   alphabetisch): „das dritte von oben" ist nach dem Umschalten derselbe
   Tag. Im Heatmap-Modus stehen die Zeilen exakt neben den Labels, im
   Linien-Modus ist dieselbe Liste die interaktive Legende.
4. **Zeitachse umschaltbar:** Erwerb (`acquiredYear`) / Lektüre
   (`readYearEffective`). Alle globalen Filter gelten unverändert;
   Lektüre-Achse + Ungelesen-Filter ergibt eine leere Ansicht — akzeptiert,
   keine Sonderbehandlung.
5. **Wählbarer Abschnitt, view-lokal:** Klick (Einzeljahr) oder Brush
   (Bereich) auf der Zeitachse wählt den Abschnitt der Rangliste.
   **Bewusster Bruch mit der Brush-Konvention** der anderen Views: ein
   globaler `setRange`-Filter würde die Vergleichsbasis auf den Abschnitt
   selbst kollabieren (jeder Faktor ×1,0). Der Abschnitt steht dafür im
   Klartext in der Ranglisten-Überschrift. Voreinstellung: die letzten
   fünf Jahre der gewählten Achse.
6. **Vergleichsbasis ist die aktuelle Filtermenge** (über alle Jahre, auf
   der gewählten Achse) — nicht der Gesamtbestand. Konsistent mit dem
   Cross-Filtering; ohne aktive Filter identisch mit „gegenüber dem
   Gesamtbestand".
7. **Tag-Auswahl fürs Trend-Panel:** Top-N der Filtermenge plus aus der
   Rangliste zuwählbare („pinnen", max. 8, 📌-Toggle). Pins sind lokaler
   Explorationszustand der View — nicht in der URL.
8. **Echtes Schiebeschalter-Widget** (`ToggleSwitch`) statt
   Radio-Button-Gruppe, zweimal eingesetzt (Achse, Darstellung):
   visuell zwei beschriftete Segmente mit gleitendem Daumen, technisch
   zwei visually-hidden Radio-Inputs (Tastatur-/Screenreader-Semantik
   gratis); Gleit-Animation respektiert `prefers-reduced-motion`.

## Maß

Für Tag *t* und Jahresmenge *S* (Abschnitt bzw. Einzeljahr):

```
lift(t, S) = (n_t,S / N_S) / (n_t / N)
```

mit *n_t,S* = Titel mit Tag *t* in *S*, *N_S* = alle Titel in *S*,
*n_t* = Titel mit Tag *t* in der Basis, *N* = alle Titel der Basis.
Basis = aktuelle Filtermenge, eingeschränkt auf Titel mit Jahr auf der
gewählten Achse („usable"); die Basis enthält den Abschnitt (bewusst —
konservativ und einfach erklärbar).

- **Rangliste:** alle geeigneten Tags mit *n_t,S* ≥ 3 (Mindest-Support
  gegen Rauschen) und lift > 1, absteigend nach lift, Top 15. Anzeige:
  Balken, Faktor („×6,1"), Klartext („14 von 18 Titeln"), 📌-Toggle.
- **Heatmap-Zellfarbe:** lift des Tags im Einzeljahr, als log₂(lift) auf
  ±2 geklemmt; Enji-Skala = überrepräsentiert, Kon-Skala =
  unterrepräsentiert, Papier = neutral; Zellen mit 0 Titeln bleiben leer
  (kein Tooltip). Kein Mindest-Support in der Zellfarbe — Rauschen ist
  dort sichtbar, aber per Tooltip nachprüfbar; Farbe ist nie alleiniger
  Träger (Zahlen im Tooltip).

## Tag-Eignung

Übernimmt die bestehenden Ausschlüsse aus `tagNetwork.ts`:
`STATUS_TAGS` und `SERIES_MARKER_TAGS` sind dort exportiert; `YEAR_TAG`
(`/^(19|20)\d{2}$/`) wird dafür zusätzlich exportiert (bisher
modulprivat). Ausgeschlossene Kategorien werden gezählt und im
Coverage-Hinweis der View ausgewiesen (Muster Tag-Netzwerk).

## Verhalten im Detail

- **Linien-Modus:** Top-12 + gepinnte als Linien (y = Titel pro Jahr,
  absolut). Farben kategorial, stabil solange sich die sichtbare Menge
  nicht ändert. Hover auf Linie (verbreiterte unsichtbare Hit-Fläche)
  hebt hervor, dimmt übrige (0,9/0,25), markiert das Label synchron;
  Hover auf Label koppelt umgekehrt. Verwaister Hover wird per Effekt
  gelöst (Lehre aus der Wissenslandkarte).
- **Heatmap-Modus:** Top-30 + gepinnte als Zeilen. Hover auf Zelle hebt
  die Zeile dezent hervor, Label synchron.
- **Tooltip (beide Modi identisch, `Tooltip`-Komponente):**
  „Tag — Jahr: N Titel (×F)" plus Titelliste (max. 10, dann „… und N
  weitere"), wie der Timeline-Hover. Der Faktor F ist dieselbe Zahl, die
  die Heatmap-Zellfarbe bestimmt.
- **Label-Spalte:** Tag-Name + Gesamtzahl; Klick = `toggleFilter({ kind:
  'tag', value })`, aktive markiert wie in Regal-/Wissenslandkarten-
  Legende (Kon-Rahmen + `--ink-08`, `aria-pressed`); gepinnte tragen das
  📌 und stehen auch außerhalb der Top-N in der Liste (einsortiert nach
  demselben Kriterium).
- **Abschnittswahl:** Brush mit Escape-Abbruch und Textselektions-Sperre
  (Muster Timeline/Wissenslandkarte), Klick = Einzeljahr. Auswahl als
  schraffierte/getönte Fläche über der Zeichenfläche, Jahreszahlen an den
  Rändern.
- **Coverage:** `CoverageNote` mit Abdeckung der gewählten Achse
  (usable / filtered) und den ausgeschlossenen Tag-Kategorien. Leere
  Filtermenge → `EmptyState`; Achse ohne Jahre → noData-Hinweis.
- **Tastatur:** Labels und Ranglisten-Zeilen sind Buttons (fokussierbar,
  Enter/Leertaste); ToggleSwitch per Pfeiltasten/Tab (Radio-Semantik).
  Der Brush bleibt Maus-Interaktion; ein von/bis-Formular als
  Tastatur-Zwilling ist bewusst verworfen (YAGNI) — der Abschnitt ist
  Explorationszustand, kein Filter, und die Voreinstellung liefert
  Tastaturnutzern immer eine Rangliste.
- **CJK:** Label-Spalte und Rangliste trunkieren lange Tags mit Ellipse,
  voller Text im Tooltip/`title`.

## Dateien

| Datei | Änderung |
|---|---|
| `src/lib/viewData/tagTrends.ts` | neu: `tagTrendRows(books, axis)` → `{ years, totalsPerYear, rows, usable, excluded }` (rows: alle geeigneten Tags, sortiert, mit `counts` je Jahr); `tagRanking(data, from, to, { minSupport: 3, limit: 15 })` → `[{ tag, lift, inSlice, total }]` |
| `src/lib/viewData/tagTrends.test.ts` | neu: Ausschlüsse, Sortierung (Anzahl desc, dann alphabetisch), Jahres-Alignment, Lift-Berechnung, Mindest-Support, Limit, leere Achse |
| `src/components/ToggleSwitch.tsx` + `.module.css` | neu: zweiwertiges Schiebe-Widget (visually-hidden Radios, `prefers-reduced-motion`) |
| `src/views/TagTrends.tsx` + `.module.css` | neu: View (Label-Spalte, Linien-/Heatmap-Renderer, Brush, Rangliste, Pins) |
| `src/lib/types.ts` | `VIEW_IDS` um `'tagTrends'` erweitert (nach `'network'`) |
| `src/App.tsx` | View in Nav-Reihenfolge (Zeile 36) und View-Switch registrieren |
| `src/lib/viewData/tagNetwork.ts` | `YEAR_TAG` exportieren (sonst unverändert) |
| `src/i18n/messages.ts` + 5 Bundles | Nav-Label (de „Tag-Trends", ja „タグの推移") + Namespace `views.tagTrends` (Titel, Achsen-/Modus-Beschriftungen, Ranglisten-Überschrift mit Zeitraum, Tooltip, Coverage, Pin-Aria) |
| Store, URL-Sync | unverändert (View liest `filtered`, ruft `toggleFilter`) |

Die Zählung läuft einmal über die Bücher (`tagTrendRows`), Rangliste und
Zellfarben leiten sich ohne erneuten Buchdurchlauf daraus ab. 4.865
Bücher × ~3 Tags sind im Speicher trivial; memoisiert über
`(filtered, axis)`.

## Definition of Done

- Trend-Panel zeigt im Linien-Modus Top-12 der Filtermenge, im
  Heatmap-Modus Top-30; Label-Spalte links in beiden Modi identisch
  sortiert; Umschalten per Schiebeschalter erhält Reihenfolge und
  Abschnitt.
- Achsen-Schalter Erwerb/Lektüre wechselt beide Teilbilder und den
  Coverage-Hinweis; Filter (insb. Gelesen/Ungelesen) wirken wie überall.
- Brush/Klick wählt den Abschnitt; Rangliste zeigt Top-15 nach Lift mit
  Mindest-Support 3, Faktor und „n von m Titeln"; Voreinstellung letzte
  fünf Jahre.
- 📌 übernimmt einen Ranglisten-Tag in Label-Spalte und Trend-Panel
  (max. 8), zweites 📌 entfernt ihn; Pins überleben den Moduswechsel,
  stehen aber nicht in der URL.
- Klick auf Label = Tag-Filter-Chip, aktiver Zustand markiert
  (`aria-pressed`); Klick auf denselben Tag entfernt den Filter.
- Hover: Linie/Zelle → einheitlicher Tooltip (Tag, Jahr, Anzahl, Faktor,
  Titelliste ≤ 10); Linien dimmen 0,9/0,25; kein verwaister Hover nach
  Zu-/Abwahl.
- Heatmap-Zellfarben: Enji über, Kon unter, Papier neutral, leer bei 0;
  Tooltip-Faktor = Zellfarben-Faktor.
- Jahres-Tags, Statusmarker und Reihenkürzel tauchen nirgends als Tag
  auf; ausgeschlossene Kategorien im Coverage-Hinweis beziffert.
- `tsc` sauber, alle Tests grün (`tagTrends.test.ts` neu), `vite build`
  fehlerfrei; Tastaturpfade und `prefers-reduced-motion` verifiziert.
