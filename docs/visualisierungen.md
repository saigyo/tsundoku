# Visualisierungen

Acht Ansichten, sortiert nach Erkenntnisgewinn pro Aufwand. Jede ist zugleich
Anzeige und Filtereingabe (siehe Cross-Filtering in `CLAUDE.md`).

Für alle gilt dieselbe Definition of Done, zusätzlich zu den ansichtsspezifischen
Punkten:

- Klick/Auswahl schreibt in den Filter-Store, alle anderen Views reagieren.
- Der aktive Filterzustand ist in der URL abbildbar und per Back-Button umkehrbar.
- Die Ansicht nennt die Abdeckung ihrer Datengrundlage („935 von 4.865 Titeln
  haben ein tagesgenaues Lesedatum").
- Leerer Zustand nach zu engem Filter sagt, welcher Filter greift und bietet an,
  ihn zu lösen.
- Tastaturbedienbar, `prefers-reduced-motion` respektiert.

---

## 1 — Erwerb und Lektüre

**Frage:** Wächst der Stapel schneller, als er abgebaut wird — und seit wann?

**Daten:** `acquiredYear` (3.601), `readYearEffective` (1.334), `hasRead`.

**Darstellung:** Zwei Zeitreihen 1988–2026 in einem Koordinatensystem, Erwerb
und Lektüre gegenläufig (Erwerb nach oben, Lektüre nach unten) — die Fläche
dazwischen ist der Stapel. Darunter eine kumulative Kurve „ungelesener Bestand".

**Interaktion:** Bürstenauswahl über die Jahresachse setzt einen
Zeitraumfilter — oberhalb der Nulllinie nach Erwerbsjahr, unterhalb nach
Lesejahr; die Auswahl zeigt Jahresgrenzen und Dimension live an. Klick ohne
Ziehen filtert ein einzelnes Jahr. Hover zeigt die Titel des Jahres.

**Fallstricke:** `entrydate` nicht verwenden (Massenimporte 2006). Lektüre vor
2007 stammt überwiegend aus Jahres-Tags — Herkunft (`readYearSource`) in der
Legende ausweisen, etwa durch unterschiedliche Flächenschraffur.

**Fertig, wenn:** die Anwendung beantworten kann, in welchem Jahr die Schere
zwischen Zufluss und Lektüre am weitesten aufging, und welche Themen im
ungelesenen Bestand überrepräsentiert sind.

---

## 2 — Wissenslandkarte

**Frage:** Wie haben sich die Interessengebiete über 35 Jahre verschoben?

**Daten:** `ddc.top` / `ddc.topLabel` (83 % Abdeckung), `acquiredYear`.

**Darstellung:** Streamgraph der zehn DDC-Hauptklassen über die Erwerbsjahre.
Umschaltbar auf absolute Zahlen und Anteile — der Anteilsmodus zeigt die
Verschiebung, der absolute das Wachstum.

**Interaktion:** Klick auf ein Band filtert auf das Wissensgebiet;
horizontales Ziehen über die Fläche setzt einen Erwerbsjahr-Bereich (erst ab
Bewegungsschwelle, damit der Band-Klick erhalten bleibt). Alternativ
eine Treemap als Momentaufnahme für den gefilterten Zeitraum.

**Fallstricke:** Bei 10 Klassen und ~35 Jahren sind einzelne Jahre dünn besetzt;
gleitender Dreijahresschnitt als Option anbieten, aber nicht als Voreinstellung
(Glättung erfindet Verläufe).

**Fertig, wenn:** die frühe Informatik-Phase und der spätere Schwerpunkt auf
Literatur/Philosophie ohne Erklärung ablesbar sind.

---

## 3 — Tag-Netzwerk

**Frage:** Welche Themen hängen zusammen — und welche Bücher schlagen Brücken
zwischen sonst getrennten Clustern?

**Daten:** `tagsNorm` (3.702 verschiedene über 3.949 Titel).

**Darstellung:** Kraftgerichteter Graph. Knoten = Tag (Radius nach Häufigkeit),
Kante = gemeinsames Buch (Stärke nach Anzahl). Ohne Schwellwert unbrauchbar:
Voreinstellung auf Tags mit ≥ 10 Titeln (~150 Knoten), Schwellwert per Regler
veränderbar. Kantengewicht besser über Jaccard-Ähnlichkeit als über absolute
Zahl, sonst dominieren `gelesen` und `Japan` alles.

**Interaktion:** Klick auf Knoten → Tag-Filter. Shift-Klick (Tastatur: `i`) →
Nachbarschaft isolieren. (Doppelklick schied aus: sein erster Klick filtert
und zeichnet neu, der zweite träfe einen anderen Knoten.) Suchfeld springt
zu einem Tag.

**Fallstricke:** Jahres-Tags (`1998`, `2004`) und Statusmarker (`gelesen`,
`ungelesen`) sind keine Themen — vor dem Layout ausschließen, sonst verbindet
das Netz alles mit allem. Verlags-Kürzel wie `RUB`, `stw`, `ltfa`, `ultb` sind
Reihenmarker; als eigene Kategorie behandeln oder ebenfalls ausblenden.

**Fertig, wenn:** die Cluster Japan / Philosophie-Soziologie / Informatik sichtbar
getrennt sind und die verbindenden Titel per Klick auffindbar.

---

## 4 — Sprachfluss

**Frage:** Wo wird im Original gelesen, wo über Übersetzung — und wie hat sich
das verschoben?

**Daten:** `originalLanguages` (78 %), `languages` (98 %), `acquiredYear`.

**Darstellung:** Sankey von Originalsprache zu Ausgabesprache. Erwartete
Hauptströme: Japanisch → Deutsch/Englisch/Japanisch, Englisch → Deutsch,
Deutsch → Deutsch.

**Interaktion:** Zeitraumregler über den Erwerbsjahren, Sankey animiert mit.
Klick auf einen Strom filtert auf diese Sprachkombination.

**Fallstricke:** Sprachen mit weniger als ~10 Titeln zu „andere" bündeln, sonst
ist das Diagramm ein Faserbündel. Fehlende `originallanguage` gilt per
Erfassungskonvention als identisch mit der Ausgabesprache (Regel 12 im
Datenprofil, `originalLanguagesInferred`) — die Originalsprache wurde nur bei
Übersetzungen eingetragen. „Unbekannt" bleibt nur für Titel ganz ohne
Sprachangabe; die stehen mangels Ausgabesprache außerhalb des Flusses und
tauchen in der Abdeckungszeile auf.

**Fertig, wenn:** ablesbar ist, ab welchem Jahr japanische Titel im Original
erworben werden und wie groß dieser Anteil heute ist.

---

## 5 — Erscheinungsjahr gegen Erwerbsjahr

**Frage:** Folge ich der Gegenwart oder arbeite ich mich rückwärts?

**Daten:** `editionYear` (99,9 %), `acquiredYear` (74 %).

**Darstellung:** Heatmap oder Punktwolke mit Dichteschattierung. Diagonale =
Neuerscheinungen, Fläche darunter = Rückgriffe. Randverteilungen an beiden Achsen.

**Interaktion:** Lassoauswahl über einen Bereich filtert die Titel.

**Fallstricke:** `date` ist das Jahr *dieser Ausgabe*, nicht der
Erstveröffentlichung. Eine Reclam-Ausgabe von Sophokles trägt 1998. Das ist eine
Aussage über Ausgaben, nicht über Werksalter — in der Beschriftung klar sagen.
Wo `originaltitle` gefüllt ist (25 %), liegt ein Übersetzungshinweis vor, aber
kein Erstveröffentlichungsjahr; nicht ersatzweise verwenden.

**Fertig, wenn:** die Achsenbeschriftung den Unterschied Ausgabe/Werk benennt
und die Diagonale als Referenzlinie eingezeichnet ist.

---

## 6 — Das Regal (Signature-Ansicht)

**Frage:** Wie sieht diese Bibliothek eigentlich aus?

**Daten:** `physical.heightMm` / `thicknessMm` (~79 %), `mediaType === 'book'`.

**Darstellung:** Maßstabsgetreue Buchrücken als SVG-Rechtecke, in Reihen
umbrechend. Höhe und Breite aus den echten Maßen, Farbe wahlweise nach DDC,
Sprache, Lesestatus oder Erwerbsjahr. Bücher mit aus der Seitenzahl
geschätzten Maßen (Regel 11 im Datenprofil) stehen im Regal, aber sichtbar
markiert (halbtransparent, gestrichelte Kontur). Bücher ohne Maße *und* ohne
Seitenzahl kommen in ein eigenes, sichtbar als solches markiertes Segment —
nicht mit bezugslosen Durchschnittswerten füllen.

**Interaktion:** Sortierung per Umschalter (Erwerb, Autor, Höhe, Wissensgebiet).
Hover zeigt den Titel, Klick öffnet die Detailkarte. Das Regal reagiert auf alle
Filter und ist damit die Übersichtsansicht der App.

**Fallstricke:** Bis zu 4.500 SVG-Elemente. Einzelne `<rect>` sind machbar, aber
Übergänge zwischen Sortierungen brauchen `transform` statt Neuaufbau; bei
Rucklern auf Canvas wechseln und die Interaktion über einen Trefferindex lösen.
Sehr dünne Rücken (< 2 px) brauchen eine Mindestbreite, sonst verschwinden sie.

**Fertig, wenn:** ein gefiltertes Regal in unter 200 ms neu zeichnet und die
Farbcodierung eine Legende hat, die auch ohne Farbwahrnehmung funktioniert.

---

## 7 — Lesetempo

**Frage:** Was hat mich lange beschäftigt, und warum?

**Daten:** `readDays` (927 Fälle: Median 4, p90 20, max 209 Tage), `pages`,
`ddc`, `languages`.

**Darstellung:** Seiten gegen Lesedauer als Punktwolke, Diagonalen für
Seiten/Tag als Orientierung. Die interessanten Punkte liegen abseits der Wolke.

**Interaktion:** Klick auf einen Ausreißer öffnet den Titel. Facettierung nach
Sprache zeigt, ob im Original langsamer gelesen wird — eine der wenigen
Ansichten, die eine echte These prüfen kann.

**Fallstricke:** Nur 927 Titel, und ausschließlich solche mit Start- *und*
Enddatum, also überproportional die bewusst getrackten. Negative Differenzen
(Tippfehler in den Daten) verwerfen und zählen. Bei Lesedauern über ~100 Tagen
ist offen, ob wirklich gelesen oder nur nicht abgeschlossen wurde — nicht als
Tempo interpretieren.

**Fertig, wenn:** Sprachfacetten vergleichbar nebeneinanderstehen und die
Grundmenge klar ausgewiesen ist.

---

## 8 — Kanonabgleich

**Frage:** Wie weit bin ich durch die großen Listen?

**Daten:** `awards` (1.403 Titel, 1.560 Listen).

**Darstellung:** Für die zwanzig am stärksten vertretenen Listen je ein Balken
mit besessenen und davon gelesenen Titeln. Harenberg (182), „1001 Books You Must
Read Before You Die" (150), „1000 Books to Read Before You Die" (116).

**Interaktion:** Klick auf eine Liste filtert auf ihre Titel; in Kombination mit
dem Lesestatus-Filter wird daraus eine Leseliste.

**Fallstricke:** Der Nenner ist nicht bekannt — der Export enthält nur die
eigenen Treffer, nicht den Umfang der Liste. Also „150 Titel aus dieser Liste im
Bestand", nicht „15 % erledigt". Viele Listen sind Übersetzungen derselben
Auswahl („1001 boeken…", „1001 böcker…") und würden dreifach zählen; über eine
kleine Synonymtabelle zusammenführen.

**Fertig, wenn:** keine Prozentangabe ohne bekannten Nenner erscheint.

---

## Später, wenn Lust besteht

- **Buchhandlungskarte:** `fromWhere` hat nur 258 Einträge, aber es sind
  konkrete Berliner Läden mit unterscheidbaren Themenprofilen. Koordinaten
  müssten einmalig von Hand ergänzt werden — kleine Datei, kein Geocoding-Dienst.
- **Autorentiefe:** 3.180 Primärautoren, davon Urasawa mit 55 Bänden. Streuung
  zwischen „einmal gelesen" und „gesammelt" als Verteilung.
- **Datenqualitätsansicht:** was der Normalizer verworfen hat, wie viele
  Massenimport-Einträge es gibt, welche Felder wie dünn besetzt sind. Klingt
  nach Beiwerk, ist aber die ehrlichste Ansicht der App und billig zu bauen,
  weil die Zahlen ohnehin anfallen.
