# Tsundoku 積ん読

Interaktive Exploration einer LibraryThing-Bibliothek: 4.865 Einträge,
Erwerbshistorie ab 1991, Lesehistorie ab 1988.

Clientseitige Single-Page-App, kein Backend. Der Export wird einmalig
normalisiert und als statisches JSON ausgeliefert.

## Start

```bash
node scripts/normalize.mjs ~/pfad/librarything_export.json
npm install
npm run dev
```

Der erste Befehl schreibt `public/data/library.json` und gibt Kennzahlen aus,
die gegen `docs/datenprofil.md` geprüft werden können.

## Dokumente

- `CLAUDE.md` — Stack, Architektur, Konventionen, Gestaltungsrichtung
- `docs/datenprofil.md` — Feldinventar, Bereinigungsregeln, Fallstricke
- `docs/visualisierungen.md` — die acht Ansichten mit Abnahmekriterien

## Stand

Normalisierung fertig und am realen Export getestet. Anwendung noch nicht
begonnen; Reihenfolge steht in `docs/visualisierungen.md`.
