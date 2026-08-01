# Datenprofil

Erhoben am realen Export (`librarything_kaixo_202607210219.json`, 9,7 MB,
4.865 Einträge). Alle Zahlen sind gemessen, nicht geschätzt.

Struktur des Rohexports: ein Objekt `{ "<books_id>": { …record } }`, keine
Verschachtelung darüber hinaus. `Object.values()` genügt.

## Feldabdeckung

| Feld                       | Abdeckung | Anmerkung                                                            |
| -------------------------- | --------: | -------------------------------------------------------------------- |
| `title`, `authors`, `genre`, `collections`, `source`, `entrydate`, `format` |   100 %   | verlässlich                                                           |
| `date`                     |    99,9 % | Jahr **dieser Ausgabe**, nicht der Erstveröffentlichung               |
| `language` / `originallanguage` | 97,8 % / 78 % | beide vorhanden → Übersetzungsfluss auswertbar                  |
| `ddc`                      |    83,0 % | Dewey-Code, erste Stelle = Wissensgebiet                              |
| `pages`                    |    81,8 % | mehrteilig, siehe Bereinigung                                          |
| `tags`                     |    81,2 % | 3.762 verschiedene, zweisprachig geführt                              |
| `dimensions`/`height`/`thickness` | ~79 % | Zoll, für das Regal ausreichend dicht                              |
| `dateacquired`             |    74,0 % | 1991–2026, das verlässlichste Zeitsignal                              |
| `weight`                   |    67,7 % | Pfund                                                                  |
| `awards`                   |    28,8 % | 1.560 verschiedene Listen, inkl. der großen Kanons                    |
| `datestarted`              |    28,4 % | 1.380 Einträge                                                         |
| `price`                    |    27,5 % | überwiegend USD-Listenpreis, **nicht** der Kaufpreis                  |
| `rating`                   |    25,1 % | 1.220 Bewertungen                                                      |
| `dateread`                 |    19,2 % | 935 — aber siehe „Jahres-Tags" unten                                   |
| `series`                   |    13,4 % | 667 Reihen                                                             |
| `fromwhere`                |     5,3 % | 258 Einträge, konkrete Buchhandlungen                                  |
| `comment`                  |     0,9 % | 44 Einträge, u. a. Inhaltsverzeichnisse von Sammelbänden               |
| `review`                   |     0,0 % | 1 Eintrag — als Datenquelle unbrauchbar                               |

## Der wichtigste Befund: Jahres-Tags sind ein Lesetagebuch

1.316 Titel tragen einen Tag der Form `^(19|20)\d{4}$`. Von den 917 Fällen, in
denen sich das prüfen lässt, stimmen **912 exakt mit `dateread` überein** — die
fünf Abweichungen sind Bücher mit mehreren Jahres-Tags (Wiederlektüre).

Damit wächst die Lesehistorie von 935 auf **1.334 Titel** — exakt die Zahl der
als „Have read" markierten Bücher — und reicht statt bis 2002 bis **1988**
zurück. Ohne diese Regel fehlen der Anwendung 18 Jahre Lesebiografie.

Der Normalizer setzt deshalb `readYearEffective = dateread ?? kleinster
Jahres-Tag` und markiert die Herkunft in `readYearSource`. Jede Zeitreihe zur
Lektüre nutzt `readYearEffective`; wo tagesgenaue Daten nötig sind (Lesedauer),
bleibt `dateread` maßgeblich, und die Ansicht weist die kleinere Grundmenge aus.

Lektüre pro Jahr (effektiv): 1988–1995 je 1–6, ab 1996 zweistellig, Maximum 2014
mit 74, seither 40–60 pro Jahr.

## Bereinigungsregeln

Implementiert in `scripts/normalize.mjs`.

1. **`entrydate` ist Katalogisierungs-, kein Erwerbsdatum.** Vier Tage im Jahr
   2006 tragen 698 Einträge (Spitzentag 276), 763 Einträge insgesamt liegen auf
   Massenimport-Tagen. Regel: Tage mit ≥ 50 Einträgen werden als `bulkImport:
   true` markiert. Für Zeitreihen zum Erwerb `dateacquired` verwenden.

2. **`pages` ist semikolonsepariert.** Mehrbänder und römisch gezählter
   Vorspann stehen in einem Feld: `"500; 442; 258"`, `"xvi; 342"`. Regel:
   an `;` splitten, arabische Teile summieren, römische ignorieren, Ergebnisse
   > 20.000 verwerfen. Naives Entfernen aller Nichtziffern erzeugt sonst Werte
   wie 518.435.524 und einen Bibliotheksumfang von einer Milliarde Seiten.
   Korrekt: **1.359.074 Seiten**.

3. **Maße in imperialen Einheiten.** `height`/`thickness`/`length` in Zoll
   (15 Ausreißer in cm), `weight` in Pfund (3 in kg). Umrechnung in mm bzw. g,
   Einheit aus dem String gelesen statt angenommen.

4. **Tags zweisprachig doppelt.** `have read`/`gelesen` (je 1.334),
   `Japanese literature`/`japanische Literatur`, `philosophy`/`Philosophie`.
   Ohne Zusammenführung zerfällt jedes Cluster in eine deutsche und eine
   englische Hälfte. `scripts/tag-aliases.json` bildet ~80 Varianten auf
   kanonische deutsche Tags ab; die Datei ist bewusst per Hand pflegbar. Rohe
   Tags bleiben in `tags` erhalten, normalisierte stehen in `tagsNorm`.

5. **Die Bibliothek enthält keine reinen Bücher.** 72 Schallplatten
   (Sammlung „Vinyl records", Format „Tonaufnahme, Schallplatte"), 87 Filme
   (DVD/Blu-Ray), 179 E-Books. `mediaType` unterscheidet
   `book` (4.527) / `ebook` / `film` / `vinyl`. Views zu Seitenzahlen, Maßen
   und Regal filtern auf `book`; Views zu Interessen dürfen alles zeigen.

6. **`price` ist ein Katalogpreis.** Fast durchgängig USD-Listenpreise aus dem
   Amazon-Import, keine bezahlten Beträge. Als Ausgabenanalyse unbrauchbar,
   als grobe Proxy-Größe für Buchtyp (Fachbuch vs. Taschenbuch) verwendbar.
   `price_purchase` gibt es nur 34-mal.

7. **`source` ≠ Bezugsquelle.** `source` ist der Katalog, aus dem die Metadaten
   stammen (`amazon germany books` etc.). Der tatsächliche Kaufort steht in
   `fromwhere` — 258 Einträge, überwiegend Berliner Buchhandlungen: Dussmann
   (67), Fundus (41), ocelot (24), Walther König (15), Grober Unfug (12),
   Yamashina (9). Kleine, aber inhaltlich saubere Grundmenge.

8. **`rating` ist stark beschnitten.** Verteilung: 5,0 → 233; 4,5 → 258;
   4,0 → 552; 3,5 → 110; 3,0 → 62; ≤ 2,5 → 5. Bücher werden offenbar bewertet,
   *wenn* sie gefallen haben. Als Verteilung irreführend, als Filter („nur
   Favoriten") brauchbar.

9. **`height`/`thickness`/`length` sind bei ~830 vermessenen Titeln
   vertauscht.** LibraryThing hält die Dicke mal im `thickness`-, mal im
   `length`-Feld, teils voll rotiert; die `dimensions`-Zeichenkette zeigt
   jeweils die echte Reihenfolge (geprüft an realen Fällen, z. B. Fotoband
   `11.77 × 1.38 × 10 inches` mit `thickness` = 10 Zoll). Regel über die
   Invariante „die Dicke ist stets die kleinste der drei Kanten": verletzt
   ein Datensatz sie, wird das Tripel sortiert und kanonisch neu zugewiesen —
   Höhe = größter, Länge (Breite) = mittlerer, Dicke = kleinster Wert;
   fehlende Felder werden nie befüllt (**822 Fälle korrigiert**). Datensätze,
   die die Invariante erfüllen, bleiben unangetastet — das schützt legitime
   dicke Schuber (max. 94 mm) und Querformate; Gleichstände (Dicke = Breite,
   eine Handvoll Fälle) sind nicht auflösbar und bleiben stehen. Ist auch der
   kleinste Wert keine plausible Dicke (≥ 80 mm — die dickste unauffällige
   Dicke im Korpus liegt bei 79 mm), wird nur `thicknessMm` verworfen, das
   Buch landet im unvermessenen Regal-Segment (**9 Fälle verworfen**).
   Implementiert als `fixPermutedDimensions()` in `scripts/normalize.mjs`,
   mit Unit-Tests für alle Zweige. Ohne diese Regel hätte das Regal (View 6)
   762 Bücher mit bis zu 594 mm „Dicke" als unrealistisch breite Blöcke
   gerendert statt als Buchrücken.

10. **Rohe HTML-Entities in Titeln und Autorennamen.** 143 `originalTitle`
    (überwiegend japanische/chinesische Titel als numerische Entities, z. B.
    `&#23476;&#12398;&#12354;&#12392;` → „宴のあと"), 44 `title`
    (`Tageb&uuml;cher` → „Tagebücher") und Autorenfelder — `authors[].name`/
    `.sort` 39-mal, `authors[].role` 643-mal (`&Uuml;bersetzer` → „Übersetzer"),
    `primaryAuthor` 16-mal — sind nicht dekodiert. Vermutlich ein
    Re-Import-Artefakt aus LibraryThings eigener Web-Anzeige. Regel:
    `decodeEntities()` löst numerische Entities (dezimal `&#NNNN;` und hex
    `&#xNNNN;`) über `String.fromCodePoint` auf sowie eine Liste benannter
    Entities, die exakt dem entspricht, was im Export vorkommt (Umlaute,
    Akzente, «»/–, griechische Buchstaben) plus die vier XML-Basisentities
    als Sicherheitsnetz — keine vollständige HTML5-Tabelle. Angewendet auf
    `title`, `originalTitle`, `primaryAuthor`, `authors[].name/.sort/.role`;
    `series`, `awards`, `tags`, `fromwhere`, `genre`, `collections` wurden
    geprüft und enthalten keine Entities, bleiben also unverändert. Insgesamt
    **924 Feldwerte dekodiert**. Einige entschlüsselte Autorennamen
    (z. B. „Habermas, Jürgen") fallen dadurch mit bereits korrekt
    geschriebenen Duplikaten zusammen — das ist die beabsichtigte Bereinigung,
    keine Regression; `tags`/`awards`/`pages`/Medienzahlen (golden Test) sind
    davon nicht betroffen, da dort keine Entities vorkamen.

11. **Fehlende Maße werden aus der Seitenzahl geschätzt.** 902 Bücher haben
    weder Höhe noch Dicke, 32 nur eines von beiden; 563 davon haben eine
    Seitenzahl. Für diese wird die Dicke als Seiten × Median-Seitendicke der
    vollständig vermessenen Bücher extrapoliert (~0,078 mm/Seite, gedeckelt
    auf 1–120 mm) und eine fehlende Höhe durch die Medianhöhe ersetzt.
    Rückwärts an den vermessenen Büchern geprüft: Schätzfehler Median
    4,7 mm, p90 12,8 mm. Geschätzte Bücher tragen `physicalEstimated: true`
    und werden im Regal halbtransparent mit gestrichelter Kontur gezeigt —
    keine stille Korrektur. Bücher ohne Seitenzahl (~371) bleiben im
    unvermessenen Segment: für sie gäbe es nur bezugslose Platzhalter.
    Implementiert als `estimateMissingDimensions()` in
    `scripts/normalize.mjs`, mit Unit-Tests.

12. **Fehlende Originalsprache = Ausgabesprache (Erfassungskonvention).**
    Die Originalsprache wurde beim Katalogisieren nur eingetragen, wenn sie
    von der Ausgabesprache abweicht (Übersetzung). Der Normalizer übernimmt
    deshalb bei erfasster Ausgabe-, aber fehlender Originalsprache die
    Ausgabesprache als Original (**1.016 Bücher**, markiert mit
    `originalLanguagesInferred: true`). „Unbekannt" bleibt damit nur für
    Titel ganz ohne Sprachangabe. Implementiert als
    `inferOriginalLanguages()` in `scripts/normalize.mjs`, mit Unit-Tests.

## Ausgabeformat

`public/data/library.json`:

```jsonc
{
  "stats": { /* Facetten als [Wert, Anzahl][], absteigend */ },
  "books": [ /* Book[] */ ]
}
```

`stats` enthält vorberechnete Häufigkeiten für `languages`, `originalLanguages`,
`collections`, `genres`, `ddcTop`, `formats`, `tagsNorm`, `authors`, `series`,
`awards`, `fromWhere`, `acquiredPerYear`, `readPerYear`, `readPerYearEffective`
— gedacht für Startansicht und Facettenlisten, damit die App beim Start nicht
über 4.865 Objekte aggregieren muss. Alle gefilterten Aggregate berechnet die
App zur Laufzeit selbst.

Ein `Book` trägt u. a.: `id`, `workCode` (LibraryThing-Werkschlüssel, in allen
4.865 Einträgen vorhanden; Detail-URL: `librarything.com/work/{workCode}/book/{id}`),
`title`, `originalTitle`, `authors[]`,
`primaryAuthor`, `tags[]`, `tagsNorm[]`, `collections[]`, `genres[]`,
`series[]`, `awards[]`, `ddc {code, top, topLabel}`, `languages[]`,
`originalLanguages[]`, `originalLanguagesInferred`, `editionYear`, `formats[]`, `mediaType`, `pages`,
`volumes`, `physical {heightMm, thicknessMm, lengthMm, weightG}`,
`physicalEstimated`, `rating`,
`acquiredDate`, `acquiredYear`, `entryDate`, `bulkImport`, `startedDate`,
`readDate`, `readYear`, `yearTags[]`, `readYearEffective`, `readYearSource`,
`readDays`, `hasRead`, `fromWhere`, `price {amount, currency}`, `comment`,
`isbn`.

Fehlende Werte sind konsequent `null`, nie `""`, `0` oder `"unknown"`.

**Abweichungen des Generats von der obigen Kurzbeschreibung** (geprüft in Task 3
gegen `public/data/library.json`, Typen in `src/lib/types.ts` entsprechend
angepasst — das Generat gilt):
- `authors[]` enthält Objekte `{ name, sort, role }` (`role` Freitext oder
  `null`), nicht nur Namensstrings.
- `Book.entryYear` (`number | null`) existiert zusätzlich zu `entryDate`.
- `Book.readYearSource` nimmt den Wert `"tag"` an, nicht `"yeartag"`.
- `stats` enthält neben den Facetten zusätzlich `generatedAt`, `source`,
  `total`, `byMediaType`, `read`, `withAcquiredDate`, `withReadDate`,
  `withReadYearEffective`, `withRating`, `bulkImported`, `pagesTotal` und
  `readDays` (`{ median, p90, max }`, keine Facette).

## Kennzahlen zum Gegenprüfen

| Kennzahl                          | Wert                            |
| --------------------------------- | ------------------------------- |
| Einträge gesamt                   | 4.865                           |
| davon Bücher / E-Books / Film / Vinyl | 4.527 / 179 / 87 / 72       |
| als gelesen markiert              | 1.334 (27,4 %)                  |
| Lesejahr bekannt                  | 1.334, ab 1988                  |
| Erwerbsjahr bekannt               | 3.601, ab 1991                  |
| Primärautoren                     | 3.180 (Top: Urasawa 55, Murakami 23, Keene 20, Knuth 18) |
| Tags roh / normalisiert           | 3.762 / 3.702                   |
| Reihen                            | 667                             |
| Auszeichnungen/Listen             | 1.560 (Harenberg 182, „1001 Books" 150) |
| Sprachen                          | DE 3.028, EN 1.670, JA 226, ZH 100, ES 56, FR 49, LA 29, GRC 19 |
| DDC-Schwerpunkte                  | Literatur 1.281, Sozialwiss. 582, Künste 562, Philosophie 412 |
| Seiten gesamt (bereinigt)         | 1.359.074                       |
| Lesedauer (935 Fälle)             | Median 4 Tage, p90 20, max 209  |
