# Genre-Dimension und Genres-View — Design

Datum: 2026-08-06 · Status: mit Markus abgestimmt · Baut auf der Spec
„Kopfzeile mit Überlaufmenü" (2026-08-06) auf, die den zehnten Tab trägt.

## Motivation

Das `genre`-Feld des Exports ist mit 100 % Abdeckung das einzige noch
ungenutzte Vollabdeckungs-Attribut. Analyse am realen Datenbestand
(2026-08-06, 4.865 Einträge):

- 44 Ausprägungen, LibraryThings kontrolliertes englisches Vokabular;
  Median 2 Genres pro Buch (Maximum 8).
- Vier Dachwerte: Fiction (1.390), Nonfiction (2.744), General Fiction
  (759), General Nonfiction (1.266). „General X" ist praktisch Teilmenge
  von X (754/759 bzw. 1.260/1.266) und markiert „ohne Spezialgenre" —
  eine Restkategorie, kein Geschwister.
- „No Genre": 405 Titel, fast ausschließlich Nicht-Buch-Material
  (70/72 Vinyl, 85/87 Filme, dazu 246 Bücher).
- 373 Titel tragen nur spezifische Genres ohne Dachwert; 47 tragen
  Fiction und Nonfiction zugleich.
- Die Lesequote streut stark und ist der eigentliche Erkenntnisgewinn:
  Comics 73 %, Mystery 62 %, Fiction gesamt 36 %, Nonfiction gesamt 22 %,
  Philosophy 19 %, Reference 1 % (bei ★4,6 — die geschätztesten,
  ungelesensten Bücher). Die Durchschnittsbewertung ist dagegen fast
  konstant (★4,0–4,3) und kein interessantes Kriterium.

Genre ergänzt DDC (nur 83 % Abdeckung; 365 Titel ohne DDC haben ein
spezifisches Genre) und schneidet quer zu den thematischen Tags: Genre ist
formal (Comics, Poetry, Biography), Tags sind thematisch-geografisch.
Die Fiction/Nonfiction-Achse existiert bisher in keiner Dimension der App.

## Entscheidungen

1. **Eigene View „Genres"** (zehnter Tab, Position 4 der neuen
   Nav-Reihenfolge), Balkenliste im Stil des Kanonabgleichs. Keine
   Integration in die Kanon-View.
2. **Getrennte Ebenen:** Die Achse Fiction/Nonfiction (aus den Dachwerten,
   „General X" geht im Dach auf) steht als eigene Zusammenfassung über der
   Liste der ~39 spezifischen Genres. Dach- und General-Werte erscheinen
   nie als Listenzeilen.
3. **Filterdimension `genre`,** UND-verknüpft innerhalb der Dimension (wie
   Tags): „Nonfiction + Comics" verengt auf Sach-Comics. Achsenwerte und
   spezifische Genres teilen dieselbe Dimension.
4. **Genre-Namen werden übersetzt** (wie die DDC-Klassen): Schlüssel =
   englischer Originalwert, Fallback = Rohwert für unbekannte künftige
   Genres.
5. **„No Genre" ist sichtbar und filterbar:** feste letzte Zeile der Liste
   („Ohne Genre"), die CoverageNote erklärt den Medientyp-Zusammenhang.
   Fehlende Daten sind ein Befund, keine Lücke.
6. **Lesequote als Zahl,** nicht nur als Füllgrad: Zeilentext
   „N im Bestand · n gelesen · q %".
7. **Sortier-Umschalter** nach Bestand (Default) | nach Lesequote;
   „Ohne Genre" bleibt in beiden Fällen unten. Kein topN — das Vokabular
   ist begrenzt, alle Zeilen sind sichtbar.
8. **Titel-Popup wie im Kanonabgleich:** Hover über eine Zeile öffnet das
   BookListPopup (Jahresgranularität, `readDateOrTagYear`, Anker am
   Zeiger, Gnadenfrist über der Liste), Kopfzeile = übersetztes
   Genre-Label + Zählung; Zeilen-Klick bleibt der Filter.
9. **BookDetail zeigt eine Genres-Zeile** mit klickbaren, übersetzten
   Werten (Filter-Toggle wie Wissensgebiet/Tags), dedupliziert: pro Achse
   höchstens ein Eintrag (Dach + General erscheinen nicht doppelt),
   danach die spezifischen Genres, ggf. „Ohne Genre".
10. **FilterEditor bleibt unverändert** — er deckt bewusst nur Dimensionen
    ohne eigene View ab.

## Komponenten

### `src/lib/genres.ts`

```ts
export const GENRE_FICTION = 'Fiction'
export const GENRE_NONFICTION = 'Nonfiction'
export const NO_GENRE = 'No Genre'
/** Dach- und General-Werte, die in der Achse aufgehen. */
const AXIS_MEMBERS: Record<string, string[]> = {
  [GENRE_FICTION]: ['Fiction', 'General Fiction'],
  [GENRE_NONFICTION]: ['Nonfiction', 'General Nonfiction'],
}
/** Filter- und Anzeige-Semantik an einer Stelle:
 *  Achsenwert → Dach ODER General vorhanden; sonst direkte Mitgliedschaft. */
export function genreMatches(b: Book, value: string): boolean
/** Buch-Genres für Anzeige (BookDetail): Achsenlabel statt Dach+General
 *  doppelt, dann spezifische Werte in Datenreihenfolge, ggf. No Genre. */
export function displayGenres(b: Book): string[]
```

### `src/lib/viewData/genres.ts`

```ts
export interface GenreRow { genre: string; owned: number; read: number }
export interface GenreData {
  axis: GenreRow[]        // Fiction, Nonfiction (feste Reihenfolge)
  rows: GenreRow[]        // spezifische Genres, absteigend nach owned
  noGenre: GenreRow       // eigene Zeile, vom Aufrufer ans Ende gesetzt
  covered: number         // Titel mit mindestens einem Wert ≠ No Genre
}
export function genreRows(books: Book[]): GenreData
```

Sortierung nach Lesequote geschieht in der View (memoisiert), nicht im
Datenmodul — die Grundreihenfolge bleibt stabil nach Bestand.

### `src/views/Genres.tsx` + `Genres.module.css`

Aufbau analog `CanonCheck.tsx` (Positionierungskontext `.wrap`,
`BookListPopup`-Verdrahtung, `BookDetail`, Leerlauf-Effekt):

- Kopf: Titel + CoverageNote (`covered` von `filtered.length`); Text nennt
  den No-Genre-Befund (fast ausschließlich Vinyl/Filme) und die 373 Titel
  ohne Achsenwert.
- Achsen-Gruppe: zwei Balkenzeilen Fiction/Nonfiction, eigener Maßstab
  (Maximum der beiden), Gelesen-Füllung, Klick = `toggleFilter`,
  `aria-pressed`; feine Trennlinie zur Liste (`--ink-15`).
- Liste: alle spezifischen Genres (Maßstab = größtes spezifische Genre)
  plus „Ohne Genre" als letzte Zeile. Zeile = Label · Balken ·
  Mono-Zählung „N im Bestand · n gelesen · q %" (q gerundet, ganzzahlig;
  bei owned 0 keine Quote). Kein `title`-Attribut (nativer Tooltip
  kollidierte mit dem Popup — Lehre aus PR #21); lange Labels enden im
  Ellipsis, das Popup zeigt den vollen Namen.
- Sortier-Umschalter: zwei Buttons im Stil der bestehenden
  Aktions-Buttons mit `aria-pressed` (Bestand | Lesequote). Quote
  absteigend, Sekundärschlüssel Bestand.
- Hover-Popup: exakt das Kanon-Muster inkl. `dateGranularity="year"` und
  `readDateOrTagYear` — Letzteres wandert von `CanonCheck.tsx` nach
  `src/lib/bookListPopup.ts` und wird von beiden Views importiert.

### Filter-Integration

- `src/lib/types.ts`: `| { kind: 'genre'; value: string }` im
  `Filter`-Union.
- `src/store/filters.ts`: `matches` über `genreMatches`; die
  UND-Ausnahme in `filterBooks` wird zu
  `kind === 'tag' || kind === 'genre'`; `filterLabel` →
  `m.filter.genre(genreLabel(f.value, m))`.
- URL-Sync: läuft über die bestehende generische
  Serialisierung (`kind:value`) — keine Sonderbehandlung; in der
  Implementierung verifizieren.
- `BookDetail.tsx`: Genres-Zeile aus `displayGenres(book)`, Werte als
  Filter-Links (wie Tags), Label übersetzt.

## i18n

- `nav.genres`: „Genres" / "Genres" / « Genres » / «Géneros» /
  「ジャンル」.
- Namespace `views.genres`: `title`, `coverage` (mit No-Genre- und
  Achsenlücken-Befund), `counts(ownedFmt, readFmt, pctFmt)`,
  `sortLabel`, `sortByOwned`, `sortByRate`. (Der Anzeigename der festen
  letzten Zeile kommt aus `genreNames['No Genre']` — keine zweite Quelle.)
- `filter.genre(label)`.
- `m.genreNames: Record<string, string>` in allen fünf Bundles: alle 44
  Originalwerte inkl. der Dachwerte (für Chips/BookDetail) und „No Genre";
  Zugriff über Helfer `genreLabel(value, m)` mit Fallback auf den
  Rohwert. EN bildet identisch ab (Vollständigkeit erzwingt das
  Typsystem: gleicher Schlüsselsatz in allen Bundles).
- JA mit gängigen Begriffen (フィクション, ノンフィクション, 哲学, 歴史,
  コミック, 詩歌, SF, ミステリー …), FR/ES typografisch nach den
  bestehenden Regeln (U+202F vor Doppelpunkt in FR-Sätzen usw.).

## Tests / Definition of Done

Vitest:

- `genreMatches`: Achsenwert trifft Dach-only, General-only und beide;
  spezifischer Wert direkt; `No Genre`; Nichttreffer.
- `displayGenres`: Dach+General dedupliziert zu einem Achsenlabel;
  Reihenfolge Achse → spezifisch; No-Genre-Fall.
- `genreRows`: Achsenzählung inkl. General-only-Büchern; spezifische
  Zeilen ohne Dach/General/No Genre; `covered`; Quoten.
- `filterBooks`: zwei Genre-Filter verengen (UND), Genre + andere
  Dimension kombiniert UND-über-Dimensionen.

Playwright mit realen Daten (eigener Server, nie Port 5174):

1. View „Genres" zeigt die erwarteten Kennzahlen des Datenprofils:
   Nonfiction 2.744, Fiction 1.390, Philosophy 800, „Ohne Genre" 405 als
   letzte Zeile; Comics mit 73 % Lesequote.
2. Klick auf „Nonfiction", dann „Comics": Chips erscheinen, alle Views
   zeigen die verengte Menge (Sach-Comics), Chip-Entfernen stellt zurück.
3. Sortier-Umschalter: nach Lesequote steht Comics vor Mystery; „Ohne
   Genre" bleibt unten; Umschalten zurück stellt die Bestandsreihenfolge
   wieder her.
4. Hover über eine Genre-Zeile öffnet das Titel-Popup (Jahresspalte,
   chronologisch, Jahres-Tag-Lektüre mit Jahr); Titelklick öffnet
   BookDetail; Popup übersteht das Schließen; Zeilen-Klick filtert
   weiterhin.
5. BookDetail zeigt die Genres-Zeile dedupliziert; Klick auf einen Wert
   setzt den Filter und schließt wie bei Tags üblich.
6. Locale-Wechsel: Balkenliste, Chips und Popup-Kopfzeile zeigen die
   übersetzten Namen (Stichprobe JA: 哲学 für Philosophy).
7. Abdeckungsnotiz nennt 4.460 von 4.865 und den Vinyl/Film-Befund.

## Nachtrag: gemessene Kennzahlen (2026-08-07)

Die Playwright-DoD gegen den realen Datenbestand ergab drei Abweichungen zu
den Analysezahlen oben — alle definitionsbedingt, keine Datenfehler:

- **Achse 1.395 / 2.750** (statt 1.390 / 2.744): `genreMatches` zählt per
  Design die General-only-Bücher zur Achse (5 bzw. 6 Titel).
- **covered 4.506** (statt 4.865 − 405 = 4.460): 46 Titel tragen „No Genre"
  *zusammen mit* echten Genres — sie zählen zur Abdeckung und zugleich zur
  „Ohne Genre"-Zeile.
- **Achsenlücke 365** (statt 373): auch hier schließen die General-Werte
  einige Titel an die Achse an.

## Nachtrag: Hover-Nähe (2026-08-07)

Nutzerbefund: Der Zeilen-Button spannt die volle Breite — die 1fr-Balkenspur
ist bei kurzen Balken fast komplett Leerraum, und beim Überfahren der Seite
erschien ständig ein Popup ohne erkennbaren Zeilenbezug. Regel seitdem
(Genres-View **und** Kanonabgleich, identische Zeilenstruktur): Popup
**und Filter-Klick** lösen nur „in der Nähe" von Inhalt aus — die Zählung
trifft direkt (ihre Box umschließt den Text), Label und Balken mit
seitlicher Toleranz von 32 px; beim Label zählt der tatsächliche Text
(Range-Messung), nicht die minmax-Spalte. Der übrige Leerraum der Zeile
bleibt für Hover wie Klick still. Tastatur-Klicks (Enter/Space, ohne
Zeigerposition) passieren das Gate immer.
