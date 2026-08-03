# Filter-Editor im permanenten Filterbalken — Design

**Datum:** 2026-08-03
**Status:** freigegeben zur Planung

## Motivation

Cross-Filtering ist das Produkt, aber drei Filterdimensionen haben keinen
UI-Zugang, weil ihnen die „eigene“ View fehlt:

| Kriterium | UI-Zugang heute |
|---|---|
| `readStatus` „gelesen“ | keiner (nur URL `status=read`) |
| `readStatus` „ungelesen“ | zwei Shortcut-Buttons (Erwerb & Lektüre, Kanon) |
| `mediaType` | keiner (nur URL) |
| `collection` | keiner (nur URL) |

Alle übrigen Dimensionen haben natürliche Orte (Tags im Netzwerk, Sprachen im
Sprachfluss, DDC in der Wissenslandkarte, Jahre in Zeitleiste/Matrix,
Autor·innen im Buch-Popup, Listen im Kanon). Statt Extra-Buttons über die
Views zu streuen, bekommt der Filterbalken einen zentralen Editor für die
heimatlosen Dimensionen.

## Entscheidungen (mit Markus abgestimmt)

1. **Permanenter Filterbalken.** `FilterChips` rendert immer; ohne aktive
   Filter zeigt der Balken nur den „+“-Button. Löst das Henne-Ei-Problem
   (Popup-Zugang ohne sichtbaren Balken) und beseitigt den Layout-Sprung
   beim ersten Filter.
2. **Umfang:** Status + Medium + Sammlung von Anfang an. Danach ist jede
   Filterart der App per UI erreichbar.
3. **Live-Zählungen mit Facetten-Semantik** (statt statischer
   Gesamtzahlen), Details unten.

## UI

### Balken

- „+“-Button ganz rechts im Balken (`margin-left: auto`), runde Form,
  Icon-only mit `aria-label` (Key `filterEditor.openAria`).
- Bei leerer Filtermenge: Balken mit nur diesem Button, kein Hinweistext.
- Chips und „Alle Filter lösen“ unverändert.

### Popup

Natives `<dialog>` per `showModal` — Muster wie `BookDetail`/`CoverZoom`
(Esc gratis, Fokusfang nativ, barrierefrei). Per CSS oben **rechts**
ausgerichtet (unterhalb des Balkens, nahe am „+“-Button, statt
bildschirmzentriert), Breite gedeckelt (~ 32rem), damit es sich wie ein
Ausklapp-Panel anfühlt. Gestaltung per Mock abgestimmt (2026-08-03):
Gruppenlabels in Mono-Kapitälchen, Toggle-Chips im Stil der
Buch-Popup-Tags, Zählungen in Mono neben dem Wert, aktiver Zustand in Kon.

Inhalt: drei beschriftete Gruppen, darunter ein Schließen-Button.

| Gruppe | Werte | Quelle |
|---|---|---|
| Status | Gelesen, Ungelesen | fest (2 Chips) |
| Medium | Buch, E-Book, Film, Vinyl | feste `MediaType`-Reihenfolge, Labels aus `m.media` |
| Sammlung | alle Sammlungen der Bibliothek | `stats.collections`, Reihenfolge nach Gesamtanzahl absteigend (stabil — springt beim Filtern nicht) |

Jeder Wert ist ein Toggle-Chip (`<button>` mit `aria-pressed`), daneben die
Zählung. Sammlungsnamen sind Datenwerte und werden nie übersetzt.

### Verhalten

- Chip-Klick = `toggleFilter` aus dem Store — exakt die Semantik der Chips
  im Buch-Popup: setzen/entfernen, ODER innerhalb der Dimension. Keine
  Sonderfälle: „Gelesen“ zusätzlich zu „Ungelesen“ ist wirkungslos statt
  falsch, beide Chips sind dann sichtbar aktiv.
- Das Popup bleibt beim Klicken offen (mehrere Kriterien in Folge); die
  Chips im Balken dahinter aktualisieren sich live.
- Schließen: Esc, Backdrop-Klick (`e.target === dialog`-Prüfung, damit
  Klicks im Inhalt nicht schließen) oder Schließen-Button.

## Zählungen

**Jede Dimension zählt gegen die Filtermenge ohne die Filter der eigenen
Dimension.** Naives Zählen auf der voll gefilterten Menge würde Geschwister
eines aktiven Filters ausnullen („Medium: Buch“ aktiv → E-Book zeigt 0,
obwohl ein Klick die Menge per ODER erweitert). Mit Ausschluss der eigenen
Dimension beantwortet jede Zahl die Frage: „Wie viele Titel zeigt die App,
wenn dieser Chip (zusätzlich) aktiv ist?“

- Status-Zahlen: `filterBooks(books, filters ohne readStatus)`, dann Tally
  über `hasRead`.
- Medium-Zahlen: `filterBooks(books, filters ohne mediaType)`, Tally über
  `mediaType`.
- Sammlungs-Zahlen: `filterBooks(books, filters ohne collection)`, Tally
  über `collections[]` (ein Buch kann in mehreren Sammlungen sein).

Werte mit Anzahl 0 bleiben sichtbar und klickbar (ehrliche „0“, kein
Ausblenden/Deaktivieren — fehlende Treffer sind ein Befund). Umsetzung als
pure Funktion in `src/lib/` mit Vitest-Tests (Filterlogik ist testpflichtig),
im Popup memoisiert über `[books, filters]`; gerechnet wird nur bei
geöffnetem Popup (Komponente wird erst bei Öffnen gemountet).

## Komponenten & Dateien

| Datei | Verantwortung |
|---|---|
| `src/components/FilterChips.tsx` | permanent rendern, „+“-Button, öffnet Editor |
| `src/components/FilterEditor.tsx` | neu: das Dialog-Popup (dumme Anzeige, Logik im Store/Helper) |
| `src/components/FilterEditor.module.css` | neu: Panel-Layout, Chip-Stile analog BookDetail |
| `src/lib/facetCounts.ts` (+ `.test.ts`) | neu: `facetCounts(books, filters)` → Zählungen der drei Dimensionen mit Ausschluss der eigenen Dimension |
| `src/i18n/messages.ts` + fünf Bundles | neue Keys, siehe unten |

Store und URL-Codierung bleiben unverändert (alle drei Filterarten
existieren dort bereits).

## i18n-Keys (neu, Namespace `filterEditor`)

| Key | Deutsch (Referenz) |
|---|---|
| `openAria` | Filter hinzufügen |
| `title` | Filter |
| `status` | Status |
| `medium` | Medium |
| `collection` | Sammlung |
| `read` | Gelesen |
| `unread` | Ungelesen |
| `close` | Schließen |

Übersetzungen (EN/FR/ES/JA) entstehen im Implementierungsplan und werden
dort verbindlich festgeschrieben; FR mit U+202F vor Doppelpunkten, falls
Doppelpunkte vorkommen.

## Nicht im Umfang

- Weitere Dimensionen im Popup (Jahre, Sprachen, Tags … haben ihre Views).
- Umbau der zwei bestehenden „nur Ungelesene“-Shortcuts (bleiben).
- Persistenz des Popup-Zustands; das Popup ist zustandslos bis auf offen/zu.

## Definition of Done

- Ohne aktive Filter ist der Balken mit „+“ sichtbar; Popup öffnet, alle
  drei Gruppen zeigen Werte mit Zählungen.
- „Status: gelesen“ ist erstmals per UI setzbar; Chip erscheint, alle Views
  filtern, URL enthält `status=read`.
- Zählungen folgen der Ausschluss-Semantik (Test: Medium-Filter aktiv →
  Geschwister-Medien zeigen weiter ihre erreichbaren Anzahlen).
- Esc, Backdrop und Schließen-Button schließen; Toggle-Klicks schließen
  nicht.
- Tastatur: Popup per Tab erreichbar und vollständig bedienbar,
  `aria-pressed` korrekt.
- `facetCounts`-Tests grün; alle fünf Sprachen vollständig.
