# Interaktives Titel-Popup — Design

Datum: 2026-08-05 · Status: freigegeben (mündlich), Spec zur Review

## Motivation

Die Hover-Tooltips in „Erwerb & Lektüre" und „Tag-Trends" zeigen Buchlisten,
sind aber passiv (`pointer-events: none`, gedeckelt auf 10 Titel): Von der
Liste aus gibt es keinen Weg zur Buch-Detailansicht. Der Tooltip wird zu einem
interaktiven, nicht-modalen Popup nach dem Vorbild der JetBrains-Editor-Popups:
Hineinfahren mit der Maus hält es am Leben, die Titel sind klickbar und öffnen
den bestehenden modalen `BookDetail`-Dialog.

## Entscheidungen

1. **JetBrains-Muster statt Klick-Pinning.** Das Popup wird durch Hineinfahren
   der Maus interaktiv, nicht durch einen Klick auf die Chartfläche. Die
   Klick-Semantik der Charts bleibt vollständig erhalten (Brush; der
   Ein-Jahres-Klick in Tag-Trends fokussiert weiter die Rangliste).
2. **Nicht-modal, kein Modal-Stapel.** Das Popup ist ein Popover mit
   Light-Dismiss; modal ist nur der `BookDetail`-Dialog darüber.
3. **Anker pro Jahr/Zelle.** Das Popup folgt nicht dem Zeiger. Es wird beim
   Betreten eines Jahres (bzw. einer Heatmap-Zelle/Linienposition) einmal
   positioniert: x an der Bandmitte des Jahres (Heatmap: an der Zeigerposition —
   die Zellen sind nur 18 px hoch, jeder unnötige Abstand zwingt den Weg ins
   Popup über eine Nachbarzelle), y an der Zeigerposition des ersten Events in
   diesem Jahr. Bewegung innerhalb desselben Jahres lässt es stehen; Wechsel
   zum Nachbarjahr ersetzt Anker und Inhalt — aber erst nach kurzem Verweilen
   (Nachtrag unten).
4. **Sofortiges Erscheinen, keine Verweildauer.** Hover ist im Chart die
   Leseinteraktion (anders als im Code-Editor); der Tooltip erscheint heute
   auch sofort. Nachrüsten einer kurzen Frist (~150 ms) bleibt möglich, falls
   es sich zappelig anfühlt.
5. **Alle Titel, interner Scroll.** Keine 10er-Deckelung mehr. Die Liste
   scrollt intern bei `max-height: 50vh`; ein Fußzeilen-Hinweis
   („↕ N Titel — scrollen für mehr") erscheint nur, wenn die Liste tatsächlich
   überläuft (`scrollHeight > clientHeight`).
6. **Zeilen-Variante A: mit Datumsspalte** (per Mockup gewählt). Jede Zeile:
   Monospace-Datum (Tag+Monat, lokalisiert via `Intl.DateTimeFormat(locale,
   { day: '2-digit', month: '2-digit' })`) plus Titel; „—" für Titel ohne
   Tagesdatum. Das Jahr steht bereits in der Kopfzeile.
7. **Chronologische Sortierung innerhalb des Jahres** nach dem Datum der
   jeweiligen Achse (`acquiredDate` bzw. `readDate`; in Tag-Trends je nach
   Achsen-Schalter). Titel ohne Tagesdatum am Ende, untereinander alphabetisch
   (`localeCompare`).
8. **Lebenszyklus mit Wieder-Scharfschaltung.** „Verlassen schließt" gilt nur,
   wenn die Maus vorher drin war; nach einem Titelklick ist das Popup
   angeheftet und ignoriert den Chart-Hover vollständig (weder Schließen noch
   Ersetzen) — auch wenn die Maus nach dem Schließen des Detail-Dialogs
   zufällig auf einem anderen Jahr steht. Details im Zustandsautomaten unten.
9. **Kein mausloser Öffnungsweg** in dieser Iteration (YAGNI). Wer das Popup
   per Maus erreicht hat, navigiert darin mit Tab/Enter (Zeilen sind Buttons);
   die Detail-Ansicht bleibt per Tastatur über Regal und Lesetempo erreichbar.
10. **Der passive `Tooltip` bleibt** für Fälle ohne Titelliste (Ungelesen-Kurve
    in „Erwerb & Lektüre").

## Zustandsautomat

Zustände: `closed`, `armed`, `grace`, `pinned`.

| Zustand  | Ereignis                                   | Folge |
| -------- | ------------------------------------------ | ----- |
| `closed` | Chart-Hover (Jahr/Zelle mit Titeln)        | `armed`, Anker + Inhalt setzen |
| `armed`  | Chart-Hover, gleicher Anker                | bleibt `armed` (No-op) |
| `armed`  | Chart-Hover, anderer Anker                 | bleibt `armed`, Anker + Inhalt ersetzen |
| `armed`  | Zeiger verlässt Chartfläche **und** Popup  | `grace`, Timer 250 ms |
| `grace`  | Zeiger betritt Popup oder Chartfläche      | `armed` (bei anderem Anker: ersetzen) |
| `grace`  | Timer läuft ab                             | `closed` |
| `armed`  | Klick auf Titel                            | `pinned`; `BookDetail` öffnet |
| `pinned` | Chart-Hover / Zeiger verlässt irgendwas    | ignoriert |
| `pinned` | Zeiger betritt das Popup                   | `armed` (Hover-Regel wieder scharf) |
| alle     | Esc (wenn kein `BookDetail` offen)         | `closed` |
| alle     | Pointer-Down außerhalb des Popups          | `closed` (Chart-Aktion des Klicks läuft normal weiter) — gilt auch für `pinned`, also z. B. Klicks auf Nav-Tabs oder Filter-Chips; **ausgenommen** Klicks, solange `BookDetail` offen ist (die landen im modalen Dialog und dürfen das dahinter wartende Popup nicht schließen) |
| `armed`/`grace`/`pinned` | Inhalt wird leer (Filter-/Achsenwechsel entfernt Anker-Jahr/-Zelle) | `closed` |

Anmerkungen:

- Der 12-px-Versatz zwischen Anker und Popup wird von der 250-ms-Gnadenfrist
  überbrückt; ein geometrischer Safe-Korridor ist nicht nötig.
- **Wechsel-Verzögerung (Nachtrag nach interaktivem Test):** Das *erste*
  Öffnen bleibt sofort, aber ein *anderer* Anker ersetzt ein stehendes Popup
  erst, wenn der Zeiger ~180 ms auf dem neuen Ziel verweilt. Grund: Auf dem
  Weg ins Popup überstreicht der Zeiger in dichten Linienregionen fremde
  Fangpfade bzw. in der Heatmap Nachbarzellen — jedes transiente Überstreichen
  ersetzte sonst das Popup. Betreten des Popups oder Rückkehr auf den
  aktuellen Anker verwirft einen schwebenden Wechsel; Bewegung innerhalb des
  Kandidaten-Ziels lässt dessen Timer weiterlaufen (sonst käme der Wechsel bei
  bewusstem Verweilen nie).
- Während eines Brushs (`drag !== null`) wird kein Popup gezeigt (wie heute).
- Solange `BookDetail` offen ist, blockiert der modale Dialog ohnehin alle
  Pointer-Events; Esc schließt dann nur den Dialog (natives `<dialog>`-
  Verhalten), nicht das Popup.
- `pinned` endet nur durch Betreten des Popups, Esc oder Außenklick. Preis:
  direkt nach dem Detail-Schließen öffnen andere Jahre erst wieder Popups,
  wenn das stehende Popup dismisst wurde — gewolltes Verhalten („es bleibt
  stehen, wo ich war").

## Komponenten

### `src/lib/bookListPopup.ts` (neu)

Sortierlogik als reine Funktion, Vitest-getestet:

```ts
/** Chronologisch nach Achsendatum; ohne Datum ans Ende, alphabetisch. */
export function sortBooksByDate(books: Book[], dateOf: (b: Book) => string | null): Book[]
```

Datumsstrings sind ISO (`YYYY-MM-DD`), String-Vergleich genügt.

### `src/components/BookListPopup.tsx` (neu)

Präsentationskomponente, Stil des heutigen Tooltips (Sumi-Fläche,
Shironeri-Text), aber `pointer-events: auto`:

```ts
export function BookListPopup(props: {
  x: number
  y: number
  header: ReactNode           // bestehende Tooltip-Kopfzeile der View
  books: Book[]               // bereits sortiert
  dateOf: (b: Book) => string | null
  onSelect: (b: Book) => void // öffnet BookDetail, View setzt pinned
  onPointerEnter: () => void  // Lebenszyklus-Meldungen an den Hook
  onPointerLeave: () => void
})
```

- Zeilen als `<button>`: Datumsspalte (Mono, 11 px, gedimmt, feste Breite)
  + Titel (Ellipsis-frei, Umbruch erlaubt — CJK-tauglich).
- `max-width: 26rem` (etwas breiter als der Tooltip, wegen der Datumsspalte);
  Liste `max-height: 50vh; overflow-y: auto`; Überlauf-Hinweis in der Fußzeile.
- Horizontales Umspringen am Fensterrand wie `Tooltip` (Messung per
  `useLayoutEffect`); zusätzlich vertikale Klemmung, damit die volle Höhe im
  Viewport bleibt.
- `aria-label` der Popup-Region über neuen i18n-Schlüssel.

### `src/lib/useBookListPopup.ts` (neu)

Hook mit dem Zustandsautomaten, von beiden Views benutzt. Er kapselt
Gnadenfrist-Timer, Esc-/Außenklick-Listener und den `pinned`-Übergang;
die View meldet Chart-Hover/-Leave und Titelklicks.

```ts
export function useBookListPopup<A>(sameAnchor: (a: A, b: A) => boolean): {
  popup: { anchor: A; x: number; y: number } | null
  hoverAnchor: (anchor: A, x: number, y: number) => void  // Chart-Pointermove
  leaveChart: () => void                                   // Chart-Pointerleave
  popupEnter: () => void
  popupLeave: () => void
  pin: () => void          // beim Titelklick
  close: () => void        // z. B. wenn Inhalt leer wird
}
```

Anker-Typen: `{ dim, year }` (Erwerb & Lektüre) bzw. `{ tag, year }`
(Tag-Trends). Der Hook hält nur Anker + Position; Inhalt (Bücher, Kopfzeile)
leitet die View wie bisher pro Render ab.

## Integration in die Views

**Erwerb & Lektüre** (`AcquisitionReading.tsx`):

- `hover`-State und Tooltip-JSX der Halbebenen werden durch den Hook und
  `BookListPopup` ersetzt; `hoverTitles` wird zu `hoverBooks: Book[]`
  (gleiche Filter, ohne `.map((b) => b.title)`), sortiert per
  `sortBooksByDate` mit `dateOf` = `acquiredDate` bzw. `readDate`.
- Kopfzeile unverändert `tooltipAcquired`/`tooltipRead`.
- Der Ungelesen-Tooltip (`unreadHover`) bleibt beim passiven `Tooltip`.
- `BookDetail` + `selected`-State nach dem Muster von `ReadingPace.tsx`.

**Tag-Trends** (`TagTrends.tsx`):

- `hover`-State (Linien wie Heatmap) speist den Hook; `hoverBooks` liefert
  `Book[]` statt Titel-Strings; `dateOf` folgt dem Achsen-Schalter.
- Der Verwaister-Hover-Effekt (Filter-/Achsenwechsel) ruft zusätzlich
  `close()` des Hooks, damit auch ein stehendes Popup verschwindet, wenn
  sein Inhalt leer würde.
- Kopfzeile unverändert (`t.tooltip(tag, year, count, factor)`).
- `BookDetail` + `selected`-State wie oben.

## i18n

Neuer Namespace `bookListPopup` in `messages.ts` + fünf Bundles:

- `listAria(context: string)` — Aria-Label der Popup-Region (Kontext = Kopf-
  zeilentext der View).
- `scrollHint(count: string)` — „↕ N Titel — scrollen für mehr".
- `openDetailAria(title: string)` — Aria-Label der Titel-Buttons.

Die Schlüssel `views.timeline.andMore` und `views.tagTrends.andMore`
(Tooltip-Deckelung) werden mit der Deckelung überflüssig und aus `messages.ts`
und allen fünf Bundles entfernt — sie haben keine weiteren Nutzer.

## Tests / Definition of Done

Vitest: `sortBooksByDate` (datiert vor undatiert, ISO-Ordnung, alphabetischer
Rest, leere Liste).

Playwright mit realen Daten (eigener Server, nie Port 5174):

1. Hover über ein Jahr in „Erwerb & Lektüre" zeigt das Popup sofort an der
   Jahresposition; Bewegung innerhalb des Jahres verschiebt es nicht.
2. Maus ins Popup fahren hält es offen; Titelklick öffnet `BookDetail`;
   Dialog schließen → Popup steht noch; zweiter Titel ist klickbar.
3. Nach Detail-Schließen: Mausbewegung über andere Jahre ersetzt das stehende
   Popup **nicht**; erst nach Betreten+Verlassen des Popups (oder Esc)
   erscheinen wieder neue Popups.
4. Liste eines vollen Jahres (z. B. 120 Titel) zeigt alle Titel, scrollt
   intern, Fußzeilen-Hinweis sichtbar; Datumsspalte chronologisch, „—"-Titel
   am Ende.
5. Brush funktioniert unverändert (Ziehen setzt Filter/Abschnitt, kein Popup
   während des Zugs); Ein-Jahres-Klick in Tag-Trends fokussiert weiter die
   Rangliste.
6. Esc und Außenklick schließen das Popup; Esc im offenen `BookDetail`
   schließt nur den Dialog.
7. Tag-Trends: Achsenwechsel bei stehendem Popup schließt es (Inhalt leer
   bzw. Anker ungültig) — kein verwaistes Popup.
8. Anker am rechten Fensterrand (letztes Jahr): Popup springt auf die linke
   Seite und bleibt vollständig im Viewport; ebenso wird ein hohes Popup
   vertikal geklemmt statt unten abgeschnitten.

## Nachtrag: Kanon-View (2026-08-06)

Das Popup gilt auch für den Kanonabgleich, der bisher gar keine Buchliste
hatte. Abweichungen gegenüber den Jahres-Views:

- **Anker** ist die Kanon-Zeile (`{ list }`), Position am Zeiger wie in der
  Heatmap — die Zeilen sind flach, eine Zeilenmitte läge zu weit weg.
  `pointerleave` der `<ol>` startet die Gnadenfrist; die Wechsel-Verzögerung
  fängt das Überstreichen dicht gestapelter Zeilen ab.
- **Zeilen-Klick bleibt der Award-Filter** (unveränderte Klick-Semantik,
  analog Brush/Ein-Jahres-Klick).
- **Datumsspalte = Lesedatum mit Jahresgranularität**: Ohne Jahres-Anker wäre
  „TT.MM." über eine 1988–2026 spannende Lesehistorie mehrdeutig. Neues
  optionales Prop `dateGranularity: 'dayMonth' | 'year'` an `BookListPopup`
  (Default `dayMonth`); die Jahreszahl kommt als `iso.slice(0, 4)` ohne
  Intl — reine Ziffern lesen sich in allen fünf Sprachen, und „2019年"
  sprengte die feste Spaltenbreite. Gelesene chronologisch vorn, Ungelesene
  („—") alphabetisch am Ende — passend zur Frage der View („besessen vs.
  gelesen").
- **Kopfzeile** = Listenname + vorhandener `views.canon.counts`-String,
  berechnet aus dem Popup-Inhalt selbst (nicht aus `data.rows`, die Zeile
  kann nach topN-/Filterwechsel verschwunden sein). Keine neuen i18n-Strings.
