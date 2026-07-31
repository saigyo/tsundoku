# Design: Tsundoku-Webanwendung

Datum: 2026-07-31 · Status: vom Nutzer freigegeben

Dieses Dokument hält die Entwurfsentscheidungen fest, die über die bestehende
Projektdoku hinausgehen. Es ersetzt nichts: Stack, Konventionen und Gestaltung
stehen in `CLAUDE.md`, das Datenmodell in `docs/datenprofil.md`, die acht Views
mit Definition of Done in `docs/visualisierungen.md`. Bei Widerspruch gilt die
Projektdoku.

## Ziel & Scope

Vollausbau: Projektfundament plus alle acht Views in der Reihenfolge aus
`docs/visualisierungen.md`, jede mit vollständiger Filterintegration und ihrer
Definition of Done. Nach jeder View existiert ein lauffähiger, committeter
Stand.

**Außerhalb des Scopes:** die „Später"-Ideen (Buchhandlungskarte, Autorentiefe,
Datenqualitätsansicht), Deployment-Automatisierung (es genügt, dass
`npm run build` ein statisch auslieferbares `dist/` erzeugt), Mobil-Layout
unterhalb Tablet-Breite.

## Entschiedene Fragen

| Frage | Entscheidung |
| ----- | ------------ |
| App-Layout | Regal als Home + jeweils eine aktive View, persistente Navigation und Filter-Chips |
| Styling | CSS Modules + Design-Tokens als Custom Properties (kein Tailwind) |
| URL-Sync | Eigenes Modul über `pushState`/`popstate`, kein Router |
| Scope | Fundament + alle 8 Views in einem Vorhaben |

## Architektur

### Shell

Eine Seite. Kopfzeile mit Titel, View-Navigation (acht Einträge in
Doku-Reihenfolge) und darunter die permanent sichtbare Filter-Chip-Leiste.
Der Hauptbereich rendert genau die aktive View; nicht aktive Views sind nicht
gemountet (das Force-Layout des Tag-Netzwerks u. Ä. laufen also nur bei
Bedarf).

Solange das Regal (View 6) noch nicht gebaut ist, ist View 1 die Startansicht.
Sobald das Regal landet, wird es Default-View und rückt in der Navigation nach
vorn.

### State

Ein Zustand-Store (`src/store/filters.ts`) hält:

- `filters: Filter[]` — die Filter-Union aus `CLAUDE.md`, unverändert
- `view: ViewId` — die aktive Ansicht

Abgeleitet und memoisiert: das gefilterte `Book[]` (UND über Dimensionen, ODER
innerhalb einer Dimension). Views bekommen ausschließlich dieses Array und
schreiben Filter über Store-Aktionen (`addFilter`, `removeFilter`,
`toggleFilter`, `clearAll`). Konsequenz der Doku-Regel „keine View filtert
selbst": eine View filtert auch sich selbst — Klick auf einen Tag reduziert
auch das Tag-Netzwerk auf die Treffermenge.

### URL-Sync

`src/store/urlSync.ts` serialisiert View + Filter in den Query-String:

- ein Parameter pro Dimension, ODER-Werte kommagetrennt
  (`?tag=Japan,Philosophie&lang=de`)
- Jahresbereiche als `from-to` (`?acquired=2010-2015`)
- `view=` für die aktive Ansicht

Filteraktionen erzeugen `pushState` (Back-Button macht Filterschritte
rückgängig), `popstate` liest den Query-String zurück in den Store. Beim Start
initialisiert die URL den Store. Das Modul ist die Grundlage der
Teilbarkeit-Anforderung und wird vollständig getestet (Roundtrip
Filter → Query → Filter).

### Daten

`fetch('/data/library.json')` beim App-Start, Ladezustand, danach alles im
Speicher — kein Worker, kein IndexedDB (4.865 Objekte). TypeScript-Typen in
`src/lib/types.ts` spiegeln exakt das Ausgabeformat des Normalizers aus
`docs/datenprofil.md` (Buch-Felder, `stats`-Facetten, fehlende Werte als
`null`).

Die vorberechneten `stats` dienen Startansicht und Facettenlisten; alle
gefilterten Aggregate berechnen die Views zur Laufzeit aus dem gefilterten
Array.

## Struktur

```
src/
  App.tsx, main.tsx          Shell, Datenladen
  store/filters.ts           Zustand-Store + Filterlogik (getestet)
  store/urlSync.ts           URL-Serialisierung (getestet)
  views/<AchtViews>.tsx      eine Datei pro View
  components/                FilterChips, CoverageNote, EmptyState, BookDetail
  lib/types.ts               Book, Stats, Filter, ViewId
  lib/format.ts              Zahlen-/Datumsformat (de-DE)
  lib/scales.ts              Farb- und Größenskalen (DDC-Farben, Sprachfarben …)
  styles/tokens.css          Palette, Typografie, Abstände als Custom Properties
```

Geteilte Bausteine (von mehreren Views gefordert):

- **FilterChips** — aktive Filter über allen Views, einzeln entfernbar,
  „alle lösen"
- **CoverageNote** — Abdeckungsangabe der jeweiligen Datengrundlage
  („935 von 4.865 Titeln haben ein tagesgenaues Lesedatum")
- **EmptyState** — nennt bei leerer Treffermenge die greifenden Filter und
  bietet an, sie zu lösen
- **BookDetail** — Detailkarte eines Titels; vom Regal gefordert, auch aus
  Views 1 und 7 erreichbar

## Gestaltung

CSS Modules + Design-Tokens. Palette (`sumi`, `shironeri`, `kon`, `enji`,
`rikyū`) und Typografie-Rollen (Display-Serife sparsam, ruhige Body-Schrift,
Mono für Zahlen/Achsen, Noto Sans JP als CJK-Fallback) aus `CLAUDE.md`.
Desktop-first, funktional bis Tablet-Breite. Barrierefreiheits-Untergrenze
(Tastaturfokus, `prefers-reduced-motion`, Farbe nie alleiniger
Bedeutungsträger) gilt pro View als Abnahmekriterium. Beim Bau von Shell und
Regal wird die Frontend-Design-Guidance herangezogen, damit das Ergebnis nicht
nach Default-Interface aussieht.

## Fehlerbehandlung

- `library.json` fehlt (404): Die App zeigt eine Anleitung mit dem
  `node scripts/normalize.mjs …`-Aufruf statt eines nackten Fehlers.
- Ladefehler/ungültiges JSON: Fehlermeldung mit Details, kein weißer Bildschirm.
- Unbekannte Query-Parameter oder unparsebare Filterwerte in der URL werden
  ignoriert (die App startet mit den verwertbaren Filtern), nicht als Fehler
  behandelt.
- Leere Treffermenge ist kein Fehler, sondern der dokumentierte EmptyState.

## Tests & Verifikation

Vitest. Pflichtabdeckung laut `CLAUDE.md`:

1. **Normalizer:** Die reinen Parser-Helfer in `scripts/normalize.mjs`
   (`toPages`, `toMm`, `toGrams`, Tag-Normalisierung, `mediaType`,
   Jahres-Tag-Logik …) werden exportierbar gemacht und mit Fixtures getestet.
   Verhalten unverändert — abgesichert durch Kennzahlenvergleich vor/nach dem
   Umbau.
2. **Filterlogik:** UND/ODER-Semantik über alle neun Filter-Dimensionen,
   Randfälle (leere Filtermenge, Bereichsgrenzen, `null`-Werte).
3. **URL-Roundtrip:** Filter → Query-String → Filter verlustfrei; defekte
   Query-Strings degradieren stumm.

Allererster Schritt vor jeder weiteren Arbeit: Normalisierung gegen den echten
Export im Repo-Root laufen lassen und die Konsolen-Kennzahlen gegen
`docs/datenprofil.md` prüfen. Bei Abweichung: Profil aktualisieren, nicht die
Abweichung wegcasten.

## Risiken

- **Regal-Performance** (bis 4.500 SVG-Rects): SVG zuerst, Sortier-Übergänge
  über `transform`. Fallback auf Canvas mit Trefferindex ist in der Doku
  vorgesehen; die Entscheidung fällt erst bei gemessenem Ruckeln, nicht
  vorsorglich.
- **Force-Layout-Kosten** (Tag-Netzwerk): läuft nur bei gemounteter View;
  Schwellwert-Voreinstellung (Tags ≥ 10 Titel) begrenzt die Knotenzahl.
- **Fonts:** Noto-Familien selbst hosten (kein CDN-Zwang zur Laufzeit), Umfang
  der CJK-Subsets im Blick behalten.

## Reihenfolge

1. Fundament: Vite-Scaffold, Normalisierung verifizieren, Tokens, Typen,
   Filter-Store + URL-Sync (mit Tests), Shell mit Chips/Navigation/EmptyState
2. View 1 — Erwerb und Lektüre
3. View 2 — Wissenslandkarte
4. View 3 — Tag-Netzwerk
5. View 4 — Sprachfluss
6. View 5 — Erscheinungsjahr gegen Erwerbsjahr
7. View 6 — Das Regal (wird Default-View)
8. View 7 — Lesetempo
9. View 8 — Kanonabgleich

Nach jedem Schritt: lauffähiger Stand, Filterintegration vollständig, Commit.
