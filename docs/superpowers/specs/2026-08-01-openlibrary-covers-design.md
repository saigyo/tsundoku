# OpenLibrary-Cover im Buch-Detail — Design

Datum: 2026-08-01 · Status: freigegeben

## Ziel

Das Buch-Detail-Popup zeigt für Bücher mit gültiger ISBN das Buchcover von
OpenLibrary (Größe M) und verlinkt auf die zugehörige OpenLibrary-Buchseite.
Cover-Laden ist **Opt-in**: Beim Laden gehen ISBN und Request-Metadaten an
covers.openlibrary.org — die App ist nach dem initialen Seitenladen sonst
vollständig offline, und dieser Unterschied bleibt eine bewusste Entscheidung
des Nutzers.

## Rahmen

- Nur das Detail-Popup lädt Cover — nie Regal, Listen oder andere Views.
  Grund: ISBN-basierte Cover-Abfragen sind auf 100 Anfragen/IP pro 5 Minuten
  rate-limitiert; nur ein Einzelabruf pro Popup ist damit sicher.
- Kein eigenes Caching (der Browser-HTTP-Cache genügt), keine
  Prüfziffernvalidierung, keine weiteren OpenLibrary-APIs.

## 1. URL-Bau und ISBN-Hygiene — `src/lib/openlibrary.ts` (neu)

Reine Funktionen, mit Vitest getestet:

- `normalizeIsbn(raw: string): string | null` — entfernt Bindestriche und
  Leerzeichen, hebt ein abschließendes `x` auf `X` an. Ergebnis mit Länge 10
  oder 13 wird zurückgegeben, alles andere `null`. (Datenbestand: 4.393 von
  4.865 Büchern mit ISBN; 3 mit Bindestrichen, davon 1 abgeschnitten auf
  12 Stellen — die liefert `null`.)
- `coverUrl(isbn: string): string | null` —
  `https://covers.openlibrary.org/b/isbn/<normalisiert>-M.jpg?default=false`.
  `?default=false` lässt fehlende Cover als HTTP 404 antworten statt als
  leeres 1×1-GIF, sodass `onError` greifen kann. `null` bei ungültiger ISBN.
- `bookUrl(isbn: string): string | null` —
  `https://openlibrary.org/isbn/<normalisiert>` (OpenLibrary leitet auf die
  Editionsseite weiter). `null` bei ungültiger ISBN.

Bei ungültiger ISBN: kein Cover-Versuch, kein Link — die bestehende
ISBN-Zeile im Popup zeigt weiterhin den Rohwert.

## 2. Opt-in-Zustand — `src/store/covers.ts` (neu)

Kleiner Zustand-Store nach dem Muster der Sprachwahl (`LocaleContext`):

- localStorage-Schlüssel `tsundoku.covers`; Wert `'1'` = aktiviert, jeder
  andere/fehlende Wert = deaktiviert. Lesen und Schreiben in try/catch
  (Private Mode, Quota) — schlägt Persistenz fehl, gilt der Zustand für die
  laufende Sitzung.
- `useCoversStore`: `{ enabled: boolean, setEnabled(v: boolean): void }`.
  `setEnabled` schreibt localStorage (`'1'` setzen bzw. Eintrag entfernen).
- Ein Opt-in gilt global (nicht pro Buch), dauerhaft (nicht pro Bibliothek)
  und ist jederzeit über die Fußzeile widerrufbar.

## 3. Popup-UI — `BookDetail.tsx` / `BookDetail.module.css`

Der Cover-Block erscheint nur, wenn `normalizeIsbn(book.isbn)` eine gültige
ISBN liefert — Bücher ohne (gültige) ISBN zeigen das Popup unverändert wie
heute, ohne Platzhalter. Der Block bildet eine eigene Spalte rechts neben
dem *gesamten* Textblock (Titel, Autoren, Detailzeilen, Links; Dialogbreite
dafür 50 rem statt 36 rem), damit das Cover die Detailzeilen nicht nach
unten schiebt. Spaltenbreite 198 px (180 px Inhalt plus Padding/Rahmen),
`min-height` 270 px nahe der üblichen M-Coverhöhe; das Bild selbst erscheint
in natürlicher M-Größe (üblich 180 px breit), nur breitere Ausreißer werden
herunterskaliert. Drei Zustände:

*(Ursprünglich war eine schmalere 120-px-Spalte mit festem Seitenverhältnis
2:3 neben nur Titel/Autoren spezifiziert; nach Sichtung auf dem Dev-Server
wurde das Layout auf natürliche M-Größe und die Vollspalten-Anordnung
geändert — dieser Text beschreibt den umgesetzten Stand.)*

1. **Opt-in fehlt:** Platzhalterfläche im Palettenstil (shironeri-Fläche,
   ink-Rahmen) mit Button „Cover von OpenLibrary laden" und einem
   Erklärungssatz: die ISBN geht an covers.openlibrary.org; einmal zustimmen
   genügt, abschaltbar in der Fußzeile. Klick ruft `setEnabled(true)`.
2. **Aktiviert:** `<img>` mit `coverUrl(isbn)`, `alt` aus
   `m.detail.coverAlt(book.title)`; bis zum Laden liegt die Platzhalterfläche
   darunter. `loading="lazy"` ist unnötig (Einzelbild), `referrerpolicy`
   bleibt Browser-Default. Das Bild ist ein Button (`m.detail.coverZoomAria`):
   Klick öffnet ein **Zoom-Overlay** (verschachtelter `<dialog>`) mit der
   L-Version des Covers in natürlicher Größe, viewport-begrenzt; Esc oder
   Klick schließt nur das Overlay (das `close`-Event wird per
   `stopPropagation` am Aufsteigen zum Buch-Popup gehindert). Fehlt die
   L-Version (404), fällt das Overlay auf das bereits geladene M-Cover
   zurück. Ein einmal fehlgeschlagener Ladeversuch wird beim erneuten
   Aktivieren über die Fußzeile zurückgesetzt (neuer Versuch statt
   dauerhaftem „Kein Cover").
3. **Kein Cover bei OpenLibrary (404):** dieselbe Platzhalterfläche ohne
   Button, mit dezenter Beschriftung „Kein Cover". 404 wird über das
   `onError`-Event des `<img>` erkannt (State pro Buch — beim Öffnen eines
   anderen Buchs zurücksetzen).

Der **OpenLibrary-Link** („Bei OpenLibrary ansehen", `bookUrl(isbn)`,
`target="_blank" rel="noopener noreferrer"`) steht unabhängig vom Opt-in
neben dem bestehenden LibraryThing-Link, sobald eine gültige ISBN existiert —
ein Link löst keinen Request aus, erst der Klick navigiert.

Barrierefreiheit: Opt-in-Button und Link sind Tastatur-erreichbar wie die
bestehenden Elemente; die Platzhalterfläche im Zustand 3 trägt ihre
Beschriftung als sichtbaren Text (kein reines `aria-label`), Farbe ist nie
alleiniger Träger des Zustands.

## 4. Fußzeilen-Schalter — `Footer.tsx`

Neben dem Sprachumschalter eine beschriftete Checkbox „Cover von
OpenLibrary", direkt an `useCoversStore` gebunden. Abschalten wirkt sofort:
offene/kommende Popups zeigen wieder den Opt-in-Platzhalter (Zustand 1).

## 5. i18n — sieben neue Message-Keys in allen fünf Bundles

| Key | Deutsche Referenzfassung |
| --- | --- |
| `detail.coverAlt(title)` | `Cover: ${title}` |
| `detail.coverLoad` | „Cover von OpenLibrary laden" |
| `detail.coverNote` | „Dabei wird die ISBN an covers.openlibrary.org übermittelt. Einmal zustimmen genügt — abschaltbar in der Fußzeile." |
| `detail.coverNone` | „Kein Cover" |
| `detail.coverZoomAria` | „Cover vergrößern" (Aria-Label des Zoom-Buttons) |
| `detail.viewOnOl` | „Bei OpenLibrary ansehen" |
| `footer.covers` | „Cover von OpenLibrary" |

Die Übersetzungen für EN/FR/ES/JA werden im Implementierungsplan wortgenau
festgelegt (vom Planautor, nicht von Implementierer-Agenten erfunden) —
Register wie in der bestehenden Lokalisierung: EN neutral-direkt, FR
Vouvoiement, ES Tuteo, JA です/ます bzw. kopulafreie Labels.

## 6. README

Kurzer Absatz beim bestehenden Privacy-Hinweis: Cover kommen per Opt-in von
OpenLibrary, übertragen wird die ISBN des geöffneten Buchs, Widerruf über
den Fußzeilen-Schalter.

## Tests

- `openlibrary.test.ts`: Normalisierung (Bindestriche, Kleinbuchstabe x,
  Längen 10/13, Zurückweisung von 12 Stellen), URL-Bau, `null`-Durchreichung.
- `covers.test.ts`: Store-Init aus localStorage, Persistenz beim Setzen,
  Verhalten bei geworfenem localStorage (try/catch-Pfad).
- Bestehende Suite bleibt grün; UI-Zustände werden manuell auf dem
  Dev-Server geprüft (bestehendes Vorgehen).
