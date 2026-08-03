# Aktive Regal-Legende oberhalb des Regals — Design

**Datum:** 2026-08-03
**Status:** freigegeben zur Planung

## Motivation

Die Farblegende der Regal-Ansicht steht unterhalb beider Regal-Blöcke
(`Shelf.tsx`) und ist bei vollem Regal (bis 4.500 Rücken) erst nach langem
Scrollen sichtbar. Außerdem ist sie reine Anzeige, obwohl jede
Legendenkategorie einer existierenden Filterart entspricht — im Produkt
„Cross-Filtering“ ein verschenkter Filtereingang.

## Entscheidungen (mit Markus abgestimmt)

1. **Legende wandert nach oben:** direkt unter die Steuerzeile
   (Sortierung/Farbe), vor das Regal-SVG. Dort steht auch das Dropdown, das
   die Farbzuordnung definiert.
2. **Legende wird aktiv:** Klick auf einen Eintrag togglet den
   zugehörigen Filter (Klick setzt, erneuter Klick entfernt) — Chip im
   Filterbalken, URL-Eintrag, Wirkung auf alle Views inklusive des Regals
   selbst.
3. **Ausschluss-Semantik für die Legendenzählung** (wie im Filter-Editor,
   Spec 2026-08-03-filter-editor): sonst verschwänden beim Anklicken einer
   Kategorie alle Geschwistereinträge.
4. **Passive Einträge:** „Keine Angabe“ / „Ohne Erwerbsjahr“ haben keine
   Filterart (es gibt keinen Filter für fehlende Werte) und bleiben
   nicht-klickbare Legendeneinträge.
5. Verworfen: Legende unten lassen und per `position: sticky` anheften —
   kostet dauerhaft Viewport-Höhe und macht die Einträge nicht aktivierbar.

## Abbildung Farbmodus → Filter

| Farbmodus (`ColorMode`) | Legendeneintrag | Filter beim Klick |
|---|---|---|
| `ddc` | DDC-Hauptklasse | `{ kind: 'ddcTop', value: top }` |
| `language` | erste Sprache des Buchs | `{ kind: 'language', value: code }` |
| `readStatus` | Gelesen / Ungelesen | `{ kind: 'readStatus', value: 'read' \| 'unread' }` |
| `acquiredYear` | Dekade | `{ kind: 'acquiredYear', from: dekade, to: dekade + 9 }` |

Alles über `toggleFilter` aus dem Store — auch der Dekaden-Range togglet
sauber (`sameFilter` vergleicht `from`/`to`).

**Mehrfachauswahl ist ausdrücklich Teil des Features:** Der Store
verknüpft seit jeher ODER innerhalb einer Dimension („Philosophie ODER
Soziologie“, zwei Chips), aber die bisherigen Filtereingänge machten den
zweiten Wert praktisch unerreichbar, weil er nach dem ersten Klick aus
der Anzeige verschwand. Die Ausschluss-Semantik der Legende (unten) macht
die vorhandene ODER-Mechanik erstmals bequem bedienbar — für
Wissensgebiete, Sprachen und Dekaden gleichermaßen. Keine Store-Änderung.

Dokumentierte Unschärfe: Die Legende gruppiert Sprachen nach `languages[0]`
(so färbt das Regal), der Sprachfilter matcht per `languages.includes(…)`.
Ein mehrsprachiges Buch kann also unter Kategorie A gezählt sein und
zusätzlich einen Filter auf Sprache B erfüllen. Das ist die bestehende
Filtersemantik und bleibt unverändert.

## Zählung (Ausschluss-Semantik)

Die Legende zählt gegen die Filtermenge **ohne die Filter der eigenen
Dimension** des aktiven Farbmodus:

```
kindOf: ddc → 'ddcTop', language → 'language',
        readStatus → 'readStatus', acquiredYear → 'acquiredYear'
legendBooks = filterBooks(books, filters.filter(f => f.kind !== kindOf(color)))
                .filter(b => b.mediaType === 'book')
```

- Population = alle Buch-Objekte (`mediaType === 'book'`) — dieselbe
  Menge, die die Ansicht zeichnet (Regal **plus** „ohne Maße“-Block).
  **Bewusste Korrektur:** bisher zählte die Legende nur die gestellten
  Rücken (`layout.placed`) und ignorierte die vermessungslosen Bücher,
  obwohl beide Blöcke nach derselben Zuordnung eingefärbt sind. Ab jetzt
  zählt sie beide. Die Zahlen können sich dadurch sichtbar ändern — das
  ist gewollt, keine stille Datenkorrektur.
- Kategorien mit Anzahl 0 (unter fremden Filtern leer) bleiben sichtbar
  und klickbar, wie im Filter-Editor.
- Aktive Kategorie: `filters.some(g => sameFilter(g, f))` → `aria-pressed`.
- `buildLegend` bekommt `legendBooks` statt `layout.placed`; Sortierung
  weiterhin absteigend nach Anzahl.

**Dekaden-Swatches:** `yearScale` (Farbverlauf über die Erwerbsjahre der
gestellten Bücher) wird mit `.clamp(true)` versehen — Dekaden, die nur in
der Ausschlussmenge vorkommen, lägen sonst außerhalb der Domain und
bekämen extrapolierte Farben außerhalb der Palette.

## UI

- Struktur bleibt eine Liste (`<ul aria-label=…>`); interaktive Einträge
  werden `<button>` im `<li>` (Swatch `<i>` + Label + Anzahl wie bisher),
  passive Einträge bleiben reiner Text.
- Zustände: Ruhezustand sieht aus wie die heutige Legende (kein Rahmen);
  Hover/Fokus: 1px-Rahmen `--ink-45`; aktiv: 1px-Rahmen `--kon` plus
  Hintergrund `--ink-08` und `aria-pressed="true"` — Farbe ist nie der
  einzige Träger des Aktiv-Zustands (Rahmen + Hintergrund).
- Tastatur: Buttons sind nativ fokussier- und aktivierbar; Fokusring per
  bestehendem `--focus-ring`.
- Position: `<ul>` wandert unverändert benannt zwischen `.controls` und
  das Regal-SVG. Unter dem Regal steht nichts mehr.

## Dateien

| Datei | Änderung |
|---|---|
| `src/views/Shelf.tsx` | Legende nach oben; `buildLegend` liefert zusätzlich den Filter je Eintrag (`filter: Filter \| null`, null = passiv); Klick-/Aktiv-Logik |
| `src/views/Shelf.module.css` | Button-Stile für Legendeneinträge (Ruhe/Hover/Aktiv) |
| `src/lib/viewData/shelf.ts` | unverändert |
| Store, i18n | unverändert — alle Labels und Filterarten existieren (`m.views.shelf.*`, `filterLabel`) |

Neue i18n-Keys: **keine** (Labels wie bisher; `aria-label` des Buttons =
sichtbares Label + Anzahl, keine neue Formulierung nötig — der
Toggle-Charakter ist durch `aria-pressed` ausgedrückt).

## Tests

`buildLegend` wird um die Filterzuordnung erweitert und dabei aus der
Komponente in `src/lib/viewData/shelfLegend.ts` extrahiert (pure Funktion:
`(mode, books, yearScale, m) → { label, color, count, filter }[]`), mit
Vitest-Tests: Kategorienbildung je Modus, Dekaden-Rundung, passive
Einträge (`filter: null` bei fehlenden Werten), Sortierung. Die
Ausschluss-Menge selbst ist `filterBooks`-Komposition in der Komponente
(bereits getestete Bausteine).

## Definition of Done

- Legende erscheint oberhalb des Regals (unter der Steuerzeile), unten ist
  sie verschwunden; in allen vier Farbmodi.
- Klick auf „Philosophie“ setzt den Chip „Gebiet: Philosophie“, Regal und
  alle Views filtern, URL trägt den Filter; erneuter Klick entfernt ihn.
- Bei aktivem Eintrag bleiben alle Geschwisterkategorien sichtbar
  (Ausschluss-Semantik), Zahlen passen sich fremden Filtern an.
- Dekaden-Klick erzeugt `Erworben: 1990–1999`-Chip; zweite Dekade
  zusätzlich wählbar (ODER); Dekaden-Swatch nie außerhalb der Palette.
- Zwei Wissensgebiete nacheinander anklickbar → zwei Chips,
  ODER-verknüpfte Menge; jeder einzeln wieder abwählbar (per Legende oder
  Chip).
- „Keine Angabe“/„Ohne Erwerbsjahr“ nicht klickbar, aber sichtbar mit
  Anzahl.
- Tastatur: Einträge per Tab erreichbar, Enter/Leertaste togglet,
  `aria-pressed` korrekt.
- `shelfLegend`-Tests grün; keine neuen i18n-Keys nötig.
