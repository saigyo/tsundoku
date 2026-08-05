# Tag-Trends: Zeitraum-Einschränkung per von/bis-Formular — Design

**Datum:** 2026-08-05
**Status:** freigegeben zur Planung

## Motivation

Die Bibliothek fängt erst ab 2006 richtig an — die linke Hälfte der
Trend-Charts (1991–2005) ist dünn besetzt und kostet Auflösung. Der
Zeitraum ist zwar heute schon global filterbar (Brush in „Erwerb &
Lektüre", URL), aber die Tag-Trends-View selbst bietet keine Affordanz
dafür. Der Brush dieser View ist anders belegt (view-lokaler Abschnitt
der Rangliste) und bleibt es.

## Entscheidungen (mit Markus abgestimmt, 2026-08-05)

1. **Globaler Filter, kein view-lokaler Zoom.** Ein von/bis-Formular
   ruft `setRange` auf — das Ergebnis ist ein normaler Filter-Chip
   (sichtbar, einzeln entfernbar, in der URL, wirkt auf alle Views).
   Die Vergleichsbasis der Rangliste schrumpft mit; das deckt sich mit
   der Unterzeile „gegenüber der aktuellen Filtermenge" und vermeidet
   ein drittes Zeitkonzept in der View (Zoom + Abschnitt + Filter).
2. **Dimension = Achsen-Schalter.** Das Formular hat keine eigene
   Dimensionsauswahl: Achse „Erwerb" → `setRange('acquiredYear', from,
   to)`, Achse „Lektüre" → `setRange('readYear', from, to)` (der
   readYear-Filter matcht `readYearEffective`, konsistent zur Achse).
3. **Verworfen:** Auto-Trim dünner Randjahre (versteckt Daten,
   Schwellwert-Debatte) und view-lokaler Zoom (drei Zeitkonzepte,
   zweiter Brush).

## Verhalten im Detail

- **Platzierung:** drittes Element der Controls-Zeile, rechts neben den
  beiden Schiebeschaltern; gleiche Formsprache wie das von/bis-Formular
  der Timeline (`rangeForm`-Muster), aber ohne Dimensions-`<select>`.
- **Vorbelegung und Synchronisation:** Ist ein Filter der
  Achsen-Dimension aktiv, zeigen die Felder dessen `from`/`to`; sonst
  die volle Spanne der aktuellen Achse (`data.years[0]` bis letztes
  Jahr). Ein Effekt (Muster `AcquisitionReading.tsx:38-47`) hält die
  Felder bei Achsenwechsel, Chip-Entfernung und externen
  Filteränderungen synchron.
- **Submit:** natives `<form onSubmit>` (Enter im Feld submittet);
  Validierung `from ≥ 1900 && to ≥ from`, sonst kein `setRange`.
  `setRange` ersetzt bestehende Filter derselben Dimension (bestehende
  Store-Semantik).
- **Wechselwirkung mit dem view-lokalen Abschnitt:** keine besondere —
  der Filter verengt `data.years`, die bestehende Abschnitts-Klemmung
  (`sel`-useMemo) beschneidet die Auswahl bzw. fällt auf „letzte fünf
  Jahre" zurück (im Tag-Trends-Zyklus DoD-verifiziert).
- **i18n:** keine neuen Schlüssel — `m.rangeForm.from/to/submit`
  existieren fünfsprachig; die Inputs tragen sichtbare Labels.
  Aria-Label des Formulars: nicht nötig, die beschrifteten Felder und
  der Submit-Button sind selbsterklärend (gleiches Muster wie Timeline).
- **Tastatur:** Inputs sind `type="number"` mit `min`/`max` wie in der
  Timeline (1900–2100); Tab-Reihenfolge natürlich (nach den Schaltern).

## Dateien

| Datei | Änderung |
|---|---|
| `src/views/TagTrends.tsx` | Formular-State (`formFrom`/`formTo` + Sync-Effekt), `<form>` in der Controls-Zeile, Submit → `setRange` auf der Achsen-Dimension |
| `src/views/TagTrends.module.css` | `.rangeForm`-Regeln (kompakt, an `.ctl`-Optik angelehnt; Muster `AcquisitionReading.module.css`) |
| Store, i18n, Datenmodul, andere Views | unverändert |

Keine neuen Tests: `setRange`, `filterBooks` und die Abschnitts-Klemmung
sind bereits getestet bzw. verifiziert; das Formular ist reine
Verdrahtung getesteter Bausteine (wie das Timeline-Formular, das auch
keinen eigenen Test hat). Verifikation über die DoD.

## Definition of Done

- Ohne aktiven Jahresfilter zeigt das Formular die volle Spanne der
  Achse (z. B. 1991–2026); mit aktivem Filter dessen von/bis.
- Submit (Button und Enter) erzeugt den Chip `Erwerb 2006–2026` bzw.
  `Gelesen …`; Linien/Heatmap beginnen bei 2006, die
  Ranglisten-Vergleichsbasis ist die gefilterte Menge.
- Achsenwechsel wechselt Dimension und Vorbelegung des Formulars;
  ein bestehender Chip der anderen Dimension bleibt unberührt stehen.
- Chip-Entfernung setzt die Felder auf die volle Spanne zurück.
- Ungültige Eingaben (`to < from`, `from < 1900`) lösen kein `setRange`
  aus.
- Der view-lokale Abschnitt übersteht die Verengung (Klemmung bzw.
  Fallback), die Ranglisten-Überschrift zeigt nie einen leeren Bereich.
- `tsc` sauber, alle Tests grün, `vite build` fehlerfrei;
  Playwright-Verifikation mit realen Daten.
