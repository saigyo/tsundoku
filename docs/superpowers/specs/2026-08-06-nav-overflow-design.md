# Kopfzeile mit Überlaufmenü — Design

Datum: 2026-08-06 · Status: mit Markus abgestimmt (Brainstorming mit
Visual-Companion-Mockups; Varianten A–D, gewählt C mit Markierung C1)

## Motivation

Mit neun Nav-Tabs braucht die Kopfzeile für Einzeiligkeit je nach Sprache
1294–1475 px (DE 1315, EN 1385, FR 1389, JA 1294, ES 1475). Die geplante
zehnte View „Genres" schiebt das um ~100–140 px nach oben — der ungestaltete
flex-wrap-Umbruch würde in fast allen Sprachen zum Normalfall. Weitere Views
zeichnen sich ab (z. B. Datenqualitätsübersicht aus dem Erstkonzept).

Verworfen wurden: dauerhaft zweizeilige Kopfzeile (kostet vertikalen Platz,
Leerraum neben der Marke; Variante A), Gruppentrenner in eigener Nav-Zeile
(Variante B), Integration der Genres in die Kanon-View unter neuem Namen
(Variante D). Kein Label-Kürzen — stehende Entscheidung aus dem Backlog.

## Entscheidungen

1. **Einzeilig mit Überlaufmenü.** Tabs, die nicht in die Zeile passen,
   wandern in ein „Mehr ▾"-Menü. Der Überlauf erfasst die Tabs strikt vom
   Ende der Navigationsreihenfolge her — welche das sind, hängt nur von
   Fensterbreite und Sprache ab, nie von der Nutzungshistorie
   (keine „Beförderung" gewählter Views in die Zeile).
2. **Neue Navigationsreihenfolge** nach Erkenntniswert, damit die
   schwächsten Views zuerst überlaufen:
   Regal · Erwerb & Lektüre · Wissenslandkarte · **Genres** · Tag-Trends ·
   Tag-Netzwerk · Sprachfluss · Kanon · Ausgabe × Erwerb · Lesetempo.
   (Wissenslandkarte und Genres bewusst benachbart: DDC und Genre schneiden
   quer zueinander. `ViewId`s und URL-Parameter bleiben unverändert.)
3. **Markierung C1 — der Menü-Knopf wird zum aktiven Tab.** Ist die aktive
   View im Menü versteckt, zeigt der Knopf *ihren Namen* mit ▾ und roter
   Unterstreichung (wie jeder aktive Tab). Ist eine sichtbare View aktiv,
   heißt er schlicht „Mehr ▾" ohne Markierung. Im aufgeklappten Menü trägt
   die aktive View eine rote Randmarke (3 px links, `--enji`).
   Sichtbare Tabs stehen immer an ihrem Platz — nichts springt.
4. **Menü-Panel im Sumi-Stil** wie das Titel-Popup: `--sumi`-Fläche,
   `--shironeri`-Text, Radius, Schatten; absolut unter dem Knopf, rechtsbündig
   an ihm ausgerichtet, innerhalb des Viewports (rechter Rand: nach links
   ausweichen). Einträge sind volle Zeilen-Buttons.
5. **Interaktion:** Klick auf den Knopf öffnet/schließt; Eintrag-Klick
   wechselt die View und schließt; Esc und Außenklick (pointerdown) schließen.
   Tastatur: Knopf und Einträge sind fokussierbare `<button>` in
   Dokumentreihenfolge, sichtbarer Fokusring (`--shironeri` auf Sumi wie im
   Titel-Popup); `aria-expanded` am Knopf, `aria-current="page"` am aktiven
   Eintrag. Kein Roving-Focus/Arrow-Key-Menümuster — zwei bis drei Einträge
   rechtfertigen die Komplexität nicht.
6. **Bestehende Verdichtungen bleiben:** die engeren FR/ES-Tab-Abstände und
   der kompakte Kopfzeilen-Durchschuss. `flex-wrap` an der Nav entfällt —
   die Zeile bricht nie mehr um.

## Komponenten

### `src/components/NavOverflow.tsx`

Ersetzt die Tab-Schleife in `App.tsx` (`Shell`). Props:
`views: ViewId[]`, `active: ViewId`, `onSelect: (v: ViewId) => void`,
`labels: (v: ViewId) => string`, `moreLabel: string`.

Messprinzip: Alle Tabs werden immer gerendert; zusätzlich rendert die
Komponente eine unsichtbare, nicht umbrechende Messzeile (`visibility:
hidden`, `position: absolute`, `aria-hidden`) mit allen Tab-Labels plus
Menü-Knopf im breitesten Zustand (längstes Label + „ ▾"). Ein
`ResizeObserver` auf dem Nav-Container liefert die verfügbare Breite;
aus den gemessenen Einzelbreiten bestimmt eine pure Funktion den Schnitt:

```ts
/** Wie viele Tabs passen? Passt alles ohne Knopf, gibt es keinen Überlauf;
 *  sonst wird der Platz für den Knopf (maximale Knopfbreite) reserviert. */
export function fitCount(tabWidths: number[], buttonWidth: number, gap: number, available: number): number
```

`fitCount` ist exportiert und getestet (Vitest). Locale-Wechsel ändert die
Labels → Messzeile misst neu (Effekt auf `locale`). Der Schnitt ist
deterministisch: gleiche Breite + Sprache ⇒ gleiche Aufteilung.

Menü-Zustand (`open`) liegt in der Komponente; Esc-/Außenklick-Listener nur
bei geöffnetem Menü. View-Wechsel (auch programmatisch) schließt das Menü.

### `App.tsx` / `App.module.css`

`VIEW_ORDER` wird auf die neue Reihenfolge umgestellt (Entscheidung 2).
`.nav` verliert `flex-wrap`. Neue Klassen für Knopf (erbt `.navItem`-Optik)
und Menü-Panel.

## i18n

Neuer Schlüssel `app.moreMenu` („Mehr" / "More" / « Plus » / «Más» /
「その他」) in `messages.ts` und allen fünf Bundles. Keine weiteren Texte —
die Menüeinträge nutzen die vorhandenen `nav.*`-Labels.

## Tests / Definition of Done

Vitest: `fitCount` (alles passt · nichts passt · Knopfbreite verdrängt
letzten Tab · leere Liste).

Playwright mit realen Daten (eigener Server, nie Port 5174):

1. Breites Fenster (≥ 1600 px, DE): alle zehn Tabs sichtbar, kein
   Menü-Knopf.
2. Fenster schmaler ziehen: die hinteren Tabs (Lesetempo, dann
   Ausgabe × Erwerb, …) wandern in „Mehr ▾"; keine zweite Zeile, kein
   Label-Umbruch — in allen fünf Sprachen.
3. View aus dem Menü wählen: Menü schließt, Inhalt wechselt, der Knopf
   zeigt den View-Namen mit roter Linie; die sichtbaren Tabs bleiben
   unverändert an ihrem Platz.
4. Sichtbaren Tab wählen, während eine Menü-View aktiv war: Knopf kehrt zu
   „Mehr ▾" ohne Markierung zurück.
5. Menü offen: Esc schließt; Außenklick schließt; erneuter Knopf-Klick
   schließt. Aufgeklapptes Menü markiert die aktive View mit roter
   Randmarke.
6. Tastatur: Tab-Fokus erreicht Knopf und Menüeinträge, Enter wählt,
   Fokusring sichtbar.
7. Nach Locale-Wechsel (ES als breitester Fall) stimmt der Schnitt sofort —
   kein kurzzeitiger Umbruch.
