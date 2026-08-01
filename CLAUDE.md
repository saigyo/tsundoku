# Tsundoku

Webanwendung zur interaktiven Exploration einer LibraryThing-Bibliothek
(4.865 Einträge, Erwerbshistorie ab 1991, Lesehistorie ab 1988).

積ん読 – „Bücher kaufen und stapeln, ohne sie zu lesen". Der Name ist Programm:
Die zentrale Frage der Anwendung ist nicht „was besitze ich", sondern
**„was verrät die Differenz zwischen Erwerb und Lektüre über mich"**.

## Was dieses Projekt ist

Eine rein clientseitige Single-Page-App. Kein Backend, keine Datenbank, kein
Login. Der LibraryThing-Export wird einmalig durch ein Skript normalisiert und
als statisches JSON ausgeliefert. Alles Weitere passiert im Browser.

**Nicht-Ziele:** Katalogverwaltung, Bearbeitung von Buchdaten, Synchronisation
mit LibraryThing, Empfehlungs-Engine, Backend jeglicher Art.

## Stack

| Bereich    | Wahl                            | Begründung                                                        |
| ---------- | ------------------------------- | ----------------------------------------------------------------- |
| Build      | Vite + React + TypeScript       | bekanntes Setup, statisches Deployment                            |
| Charts     | D3 (`d3-scale`, `d3-shape`, `d3-force`, `d3-hierarchy`, `d3-sankey`) | Netzwerk, Sunburst, Sankey und das Regal sind mit einer Chart-Lib nicht baubar |
| State      | Zustand                         | ein globaler Filter-Store, von allen Views gelesen                |
| Layout     | CSS Modules oder Tailwind       | freie Wahl, aber konsistent durchziehen                            |
| Tests      | Vitest                          | Pflicht für `scripts/normalize.mjs` und die Filterlogik           |

Bewusst **keine** Recharts/Chart.js-Ebene: Nur zwei der acht Views sind
Standarddiagramme, und eine zweite Chart-Abstraktion neben D3 kostet mehr als
sie spart. SVG direkt aus React rendern, D3 nur für Skalen, Layouts und Pfade.

## Struktur

```
scripts/normalize.mjs     CLI: Roh-Export -> public/data/library.json  (existiert, getestet)
scripts/normalize-core.mjs Normalizer-Kern ohne Node-APIs — läuft auch im Browser (Upload-Pfad)
scripts/tag-aliases.json  DE/EN-Tag-Mapping, per Hand erweiterbar (existiert)
docs/datenprofil.md       Feldinventar, Bereinigungsregeln, Fallstricke — VOR dem Bauen lesen
docs/visualisierungen.md  Die acht Views als Einzelspezifikationen mit Definition of Done
public/data/library.json  generiert, nicht eingecheckt
src/store/filters.ts      globaler Filterzustand (Cross-Filtering)
src/i18n/                Messages-Interface + fünf Sprach-Bundles, LocaleContext (useI18n)
src/views/<View>.tsx      eine Datei pro Visualisierung
src/lib/                  Skalen, Farbzuordnungen, Formatierung
```

## Die eine Architekturentscheidung, die zählt

**Cross-Filtering ist das Produkt.** Jede Ansicht ist gleichzeitig Anzeige *und*
Filtereingabe: Klick auf einen Tag im Netzwerk, ein Jahr in der Zeitleiste oder
ein Regalsegment schränkt den Datensatz für *alle* anderen Ansichten ein.

Ein einziger Store hält die aktive Filtermenge und leitet daraus ein
gefiltertes `Book[]` ab. Views bekommen ausschließlich dieses Array; keine View
filtert selbst und keine View kennt eine andere.

```ts
type Filter =
  | { kind: 'tag'; value: string }
  | { kind: 'language'; value: string }
  | { kind: 'ddcTop'; value: number }
  | { kind: 'mediaType'; value: MediaType }
  | { kind: 'collection'; value: string }
  | { kind: 'author'; value: string }
  | { kind: 'acquiredYear'; from: number; to: number }
  | { kind: 'readYear'; from: number; to: number }
  | { kind: 'readStatus'; value: 'read' | 'unread' }
```

Filter kombinieren sich als UND über Dimensionen, als ODER innerhalb einer
Dimension — mit einer Ausnahme: Mehrere Tags verknüpfen sich als UND (ein
Buch trägt viele Tags, mehrere gewählte sollen verengen, nicht erweitern; bei
einwertigen Dimensionen wie Sprache oder Medium wäre UND fast immer leer).
Aktive Filter stehen als Chips permanent sichtbar über allen Views,
einzeln entfernbar. Der Filterzustand gehört in die URL (Query-String), damit
ein Zustand teilbar und per Back-Button umkehrbar ist.

4.865 Objekte sind wenig: alles im Speicher halten, mit `Array.filter` arbeiten,
das Ergebnis memoisieren. Keine Worker, kein IndexedDB, keine Virtualisierung —
außer im Regal, das bis zu 4.500 SVG-Elemente zeichnet.

## Reihenfolge

Die Views in der Reihenfolge aus `docs/visualisierungen.md` bauen. Sie ist nach
Erkenntnisgewinn pro Aufwand sortiert, nicht nach Effekt. Nach jeder View:
lauffähiger Stand, Filterintegration vollständig, dann erst die nächste.

Vor der ersten View: Normalisierung laufen lassen, Kennzahlen aus der
Konsolenausgabe gegen `docs/datenprofil.md` prüfen. Weichen sie ab, ist der
Export ein anderer als der dokumentierte — dann Profil aktualisieren, nicht die
Abweichung wegcasten.

## Konventionen

- **Fünfsprachige Oberfläche** (DE/EN/FR/ES/JA) über typisierte
  Message-Bundles in `src/i18n/` — UI-Texte nie hart in Komponenten, `de.tsx`
  ist die Referenzfassung; Englisch im Code.
- **Keine stillen Datenkorrekturen.** Jede Regel, die Werte verändert oder
  verwirft, steht in `docs/datenprofil.md` und im Code an der Stelle, wo sie
  greift. Verworfene Werte werden gezählt und in einer Datenqualitäts-Ansicht
  sichtbar gemacht, nicht versteckt.
- **Fehlende Daten sind ein Befund, keine Lücke.** Nur 25 % der Titel haben ein
  Rating, 74 % ein Erwerbsdatum. Views zeigen die Abdeckung ihrer eigenen
  Datengrundlage an, statt eine Teilmenge als Gesamtbild auszugeben.
- CJK-Titel kommen häufig vor (226 japanische, 100 chinesische Titel). Fonts,
  Zeilenhöhen und Trunkierung müssen das aushalten.
- Barrierefreiheit als Untergrenze: Tastaturfokus sichtbar, `prefers-reduced-motion`
  respektiert, Farbe nie alleiniger Bedeutungsträger.

## Gestaltung

Das Thema der Sammlung ist ihr stärkstes Gestaltungsmaterial: Japan ist mit
Abstand das größte Cluster (948 Titel), gefolgt von Philosophie und Soziologie.
Vorschlag als Ausgangspunkt, nicht als Vorschrift:

- **Palette** aus traditionellen japanischen Farbnamen, weil sie zur Sammlung
  gehört: `sumi` #1C1B19 (Tusche, Grund), `shironeri` #EEE8DC (ungebleichte
  Seide, Fläche), `kon` #223A70 (Indigo, primärer Akzent), `enji` #9E3D3B
  (Karmin, Gegenakzent), `rikyū` #7A8B4A (Grau-Grün, tertiär).
- **Typografie** dreirollig: charakterstarke Display-Serife sparsam eingesetzt,
  ruhige Body-Schrift, Mono für Zahlen und Achsenbeschriftung. Noto Sans/Serif JP
  als CJK-Fallback ist funktionale Notwendigkeit, kein Stilmittel.
- **Signature-Element ist das Regal** (View 6): maßstabsgetreu gezeichnete
  Buchrücken als Startbild *und* als Navigation. Alles andere bleibt daneben
  bewusst zurückhaltend.
- Vermeiden: cremefarbener Hintergrund mit terrakottafarbenem Akzent, das ist
  der Default-Look generierter Interfaces.

## Datengrundlage

Roh-Export liegt außerhalb des Repos. Aufruf:

```bash
node scripts/normalize.mjs ~/pfad/librarything_export.json
# -> public/data/library.json  (~6 MB, nicht eingecheckt)
```

Erwartete Ausgabe beim aktuellen Export:

```
4865 Einträge
Medien: book 4527, ebook 179, film 87, vinyl 72 | gelesen: 1334
Seiten gesamt: 1.359.074 | Lesedauer Median/p90/max: 4/20/209 Tage
Tags: 3702 normalisiert (roh: 3762)
Lesejahr bekannt: 1334 (davon 935 per dateread, Rest aus Jahres-Tags), ab 1988
```
