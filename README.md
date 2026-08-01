# Tsundoku 積ん読

Interaktive Exploration einer LibraryThing-Bibliothek: 4.865 Einträge,
Erwerbshistorie ab 1991, Lesehistorie ab 1988.

積ん読 — „Bücher kaufen und stapeln, ohne sie zu lesen". Der Name ist Programm:
Die zentrale Frage der Anwendung ist nicht „was besitze ich", sondern **„was
verrät die Differenz zwischen Erwerb und Lektüre über mich"**. Nur gut ein
Viertel der Sammlung ist gelesen; der Rest ist der Stapel, und der Stapel hat
eine Geschichte.

Clientseitige Single-Page-App, kein Backend — läuft auf
**<https://saigyo.github.io/tsundoku/>** mit der eigenen
LibraryThing-Bibliothek: Export hochladen, die Normalisierung passiert im
Browser, nichts verlässt den Rechner.

## Was es zu sehen gibt

Acht Ansichten, und jede ist zugleich Anzeige und Filtereingabe: Ein Klick auf
einen Tag im Netzwerk, einen Strom im Sprachfluss oder ein per Ziehen
aufgespannter Zeitraum in den Zeitleisten schränkt den Datensatz für *alle*
anderen Ansichten ein. Die aktiven Filter stehen als Chips über jeder Ansicht,
einzeln lösbar, und der komplette Zustand liegt in der URL — jede Sicht auf
die Sammlung ist ein Link.

**Das Regal** ist Start- und Signature-Ansicht: jeder Buchrücken ein Rechteck
in echten Proportionen, Höhe und Dicke aus den Katalogmaßen (wo sie fehlen,
aus der Seitenzahl geschätzt und sichtbar gestrichelt markiert). Farbe nach
Wissensgebiet, Sprache, Lesestatus oder Erwerbsjahr; Sortierung nach Erwerb,
Autor·in, Höhe oder Wissensgebiet. Ein Klick auf einen Rücken öffnet die
Detailkarte des Titels — dort sind Autor·innen, Tags, Sprachen und
Wissensgebiet selbst wieder klickbare Filter, und ein Link führt zum Buch in
der eigenen LibraryThing-Bibliothek. Hier mit den Filtern „Sprache: Deutsch"
und „Erworben: 2020–2026":

![Das Regal, gefiltert auf deutsche Titel der Erwerbsjahre 2020–2026](docs/screenshots/regal-gefiltert.png)

**Die Wissenslandkarte** zeichnet die Interessengebiete über 35 Erwerbsjahre
als Streamgraph der Dewey-Hauptklassen — vom schmalen Rinnsal der frühen Jahre
über die Massenkatalogisierung 2006 bis zum breiten Strom aus Literatur (grün),
Sozialwissenschaften (rot) und Künsten. Horizontales Ziehen über die Fläche
filtert den Erwerbszeitraum:

![Wissenslandkarte: DDC-Hauptklassen über die Erwerbsjahre](docs/screenshots/wissenslandkarte.png)

**Der Sprachfluss** verbindet Originalsprache und Ausgabesprache als
Sankey-Diagramm: Was wird im Original gelesen, was in Übersetzung? Ein Strom
filtert beide Sprachen zugleich, die Sprachbalken links und rechts jeweils
nur ihre Seite; der Zeitraumfilter kennt wahlweise Erwerbs- oder Lesejahre.
Hier eingeschränkt auf die Erwerbsjahre 2020–2026 — gut sichtbar der
japanische Strom, der sich in deutsche und englische Übersetzungen und ins
Original aufteilt:

![Sprachfluss der Erwerbsjahre 2020–2026](docs/screenshots/sprachfluss-gefiltert.png)

Dazu kommen: **Erwerb & Lektüre** (gegenläufige Zeitreihen, dazwischen wächst
der Stapel; Ziehen über der Nulllinie filtert Erwerbs-, darunter Lesejahre),
das **Tag-Netzwerk** (welche Themen hängen zusammen — mit Zoom, Verschieben,
Tag-Suche und isolierbarer Nachbarschaft), **Ausgabe × Erwerb**
(Neuerscheinungen auf der Diagonale, Rückgriffe darunter; ein aufgezogenes
Rechteck filtert beide Achsen), das **Lesetempo** (Seiten gegen Tage,
facettierbar nach Sprache — wird im Original langsamer gelesen?) und der
**Kanonabgleich** (Harenberg, „1001 Books" & Co.: besessen vs. gelesen,
grundsätzlich ohne Prozentangaben, denn der Listenumfang ist unbekannt).

Fehlende Daten werden dabei nie versteckt: Jede Ansicht nennt die Abdeckung
ihrer eigenen Datengrundlage, und alles, was die Normalisierung korrigiert,
schätzt oder verwirft, ist als Regel dokumentiert und gezählt
(`docs/datenprofil.md`).

## Start

**Ohne Installation:** Die App läuft als statische Seite auf
<https://saigyo.github.io/tsundoku/> — ohne eingebaute Bibliotheksdaten.
Beim Start nimmt sie einen LibraryThing-Export entgegen, normalisiert ihn
direkt im Browser (derselbe Code wie das CLI-Skript), zeigt die Kennzahlen
der Normalisierung und lädt dann die Ansichten:

![Begrüßungsseite mit Upload des LibraryThing-Exports](docs/screenshots/begruessung-upload.png)

Die Datei verlässt den Browser dabei nicht; die normalisierten Daten bleiben
lokal im Browser (IndexedDB) und überstehen einen Reload — „Bibliothek
wechseln" in der Kopfzeile lädt jederzeit einen anderen Export, und stammen
gespeicherte Daten aus einer inzwischen inkompatiblen Version, bittet die App
um einen Neu-Upload. Obergrenze sind 10.000 Einträge, denn die Ansichten
halten alles im Speicher; größere Bibliotheken lassen sich bei LibraryThing
gefiltert exportieren.

**Lokal:** Als Datengrundlage dient ein Export der eigenen
LibraryThing-Bibliothek: auf <https://www.librarything.com/export.php> das
Format **JSON** wählen, die erzeugte Datei herunterladen und dem Normalizer
übergeben:

```bash
node scripts/normalize.mjs ~/pfad/librarything_export.json
npm install
npm run dev
```

Der erste Befehl schreibt `public/data/library.json` und gibt Kennzahlen aus,
die gegen `docs/datenprofil.md` geprüft werden können. Fehlt die Datei,
zeigt auch die lokale App den Upload-Dialog. (Die dort dokumentierten
Zahlen und einige Bereinigungsregeln sind spezifisch für diese Bibliothek —
mit einem fremden Export läuft die App trotzdem, nur das Datenprofil passt
dann nicht mehr.)

## Stack

Vite + React + TypeScript, Zustand für den einen Filter-Store, D3-Module
(`d3-scale`, `d3-shape`, `d3-force`, `d3-sankey`) für Skalen, Layouts und
Pfade — das SVG rendert React selbst. Kein Router: der Query-String ist der
Zustand. Der Normalizer ist ein Node-freies ES-Modul
(`scripts/normalize-core.mjs`), das CLI und Browser-Upload gemeinsam nutzen.
Vitest testet Normalizer, Filterlogik und URL-Roundtrip; eine GitHub Action
baut und testet jeden PR, eine weitere veröffentlicht `main` als
GitHub-Page (ohne Bibliotheksdaten).

## Dokumente

- `CLAUDE.md` — Stack, Architektur, Konventionen, Gestaltungsrichtung
- `docs/datenprofil.md` — Feldinventar, Bereinigungsregeln, Fallstricke
- `docs/visualisierungen.md` — die acht Ansichten mit Abnahmekriterien

## Stand

Anwendung vollständig: Fundament (Filter-Store, URL-Sync, Shell), alle acht
Views aus `docs/visualisierungen.md` samt Zoom-, Brush- und
Detail-Interaktionen, Upload-Pfad mit Normalisierung im Browser und
Persistenz, Veröffentlichung als GitHub-Page. Lokal: Start mit
`npm run dev`, statischer Build mit `npm run build`, Datengrundlage einmalig
per `node scripts/normalize.mjs <export.json>` erzeugen.

## Lizenz

Tsundoku selbst steht unter der [MIT-Lizenz](LICENSE) — der Code ist frei
verwendbar. Die Bibliotheksdaten (der LibraryThing-Export) sind nicht Teil
des Repositories.

Die veröffentlichte App bündelt Komponenten Dritter unter eigenen Lizenzen:

| Komponente | Zweck | Lizenz |
|---|---|---|
| [React](https://react.dev/) © Meta Platforms | UI-Rendering | [MIT](https://github.com/facebook/react/blob/main/LICENSE) |
| [Zustand](https://github.com/pmndrs/zustand) © Paul Henschel | Filter-Store | [MIT](https://github.com/pmndrs/zustand/blob/main/LICENSE) |
| [D3-Module](https://d3js.org/) © Mike Bostock (d3-array, ‑force, ‑hierarchy, ‑scale, ‑shape) | Skalen, Layouts, Pfade | [ISC](https://github.com/d3/d3/blob/main/LICENSE) |
| [d3-sankey](https://github.com/d3/d3-sankey) © Mike Bostock | Sankey-Layout (Sprachfluss) | [BSD-3-Clause](https://github.com/d3/d3-sankey/blob/master/LICENSE) |
| [Fraunces](https://github.com/undercasetype/Fraunces) © Undercase Type | Display-Serife | [OFL-1.1](https://github.com/undercasetype/Fraunces/blob/master/OFL.txt) |
| [Source Sans 3](https://github.com/adobe-fonts/source-sans) © Adobe | Body-Schrift | [OFL-1.1](https://github.com/adobe-fonts/source-sans/blob/release/LICENSE.md) |
| [IBM Plex Mono](https://github.com/IBM/plex) © IBM | Zahlen & Achsenbeschriftung | [OFL-1.1](https://github.com/IBM/plex/blob/master/LICENSE.txt) |
| [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP) © Google | CJK-Fallback | [OFL-1.1](https://openfontlicense.org/) |
| [Fontsource](https://fontsource.org/) | Font-Paketierung fürs Self-Hosting | [MIT](https://github.com/fontsource/fontsource/blob/main/LICENSE) |

Die Schriften sind als WOFF-Dateien in die veröffentlichte App eingebettet
(Self-Hosting, kein CDN zur Laufzeit); die SIL Open Font License erlaubt das
mit Namensnennung, die diese Tabelle leistet. Die Fußzeile der App verweist
hierher.
