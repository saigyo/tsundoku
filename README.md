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

Anwendung vollständig: Fundament (Filter-Store, URL-Sync, Shell) und alle acht
Views aus `docs/visualisierungen.md`. Start mit `npm run dev`, statischer Build
mit `npm run build`. Datengrundlage einmalig per
`node scripts/normalize.mjs <export.json>` erzeugen.
