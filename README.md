# Tsundoku 積ん読

Interactive exploration of a [LibraryThing](https://www.librarything.com)
library (LibraryThing is an online service for cataloging your own book
collection): 4,865 entries, acquisitions since 1991, reading history
since 1988.

積ん読 — "buying books and letting them pile up, unread." The name is the
thesis: the question at the heart of this app is not "what do I own" but
**"what does the gap between acquiring and reading reveal about me?"** Just
over a quarter of the collection has been read; the rest is the pile, and the
pile has a history.

A client-side single-page app, no backend — running at
**<https://saigyo.github.io/tsundoku/>** with your own LibraryThing library:
upload the export, normalization happens in the browser, nothing leaves your
machine. The interface comes in five languages (German, English, French,
Spanish, Japanese), detected automatically and switchable in the footer.

## What you'll see

Eight views, and each is display and filter input at once: clicking a tag in
the network, a stream in the Language Flow, or dragging out a period in the
timelines narrows the dataset for *all* other views. The active filters sit
as chips above every view, individually removable, and the complete state
lives in the URL — every perspective on the collection is a link.

**The Shelf** is the opening and signature view: every spine a rectangle in
true proportions, height and thickness taken from the catalog dimensions
(where those are missing, estimated from the page count and visibly marked
with a dashed outline).
Color by subject area, language, read status, or acquisition year; sorted by
acquisition, author, height, or subject area. Clicking a spine opens the
title's detail card — there, authors, tags, languages, and subject area are
themselves clickable filters, and a link leads to the book in your own
LibraryThing library. Here with the filters "Language: German" and
"Acquired: 2020–2026":

![The Shelf, filtered to German titles acquired 2020–2026](docs/screenshots/regal-gefiltert.png)

**The Knowledge Map** traces the areas of interest across 35 years of
acquisitions as a streamgraph of Dewey main classes — from the thin trickle
of the early years, past the mass cataloging of 2006, to the broad stream of
literature (green), social sciences (red), and the arts. Dragging
horizontally across the chart filters the acquisition period:

![Knowledge Map: DDC main classes across acquisition years](docs/screenshots/wissenslandkarte.png)

**The Language Flow** connects original language and edition language as a
Sankey diagram: what gets read in the original, what in translation? A
stream filters both languages at once, the language bars on the left and
right each only their own side; the period filter takes either acquisition
or reading years. Here restricted to acquisitions from 2020–2026 — clearly
visible the Japanese stream, splitting into German and English translations
and into the original:

![Language Flow for acquisitions 2020–2026](docs/screenshots/sprachfluss-gefiltert.png)

Beyond these: **Acquisitions and Reading** (opposing time series, the pile
growing in between; dragging above the zero line filters acquisition years,
below it reading years), the **Tag Network** (which topics belong together —
with zoom, panning, tag search, and isolatable neighborhoods),
**Edition × Acquisition** (new releases on the diagonal, reaching back below
it; dragging out a rectangle filters both axes), the **Reading Pace** (pages
against days, facetable by language — does the original slow you down?), and
the **Canon Comparison** (Harenberg, "1001 Books" & co.: owned versus read,
deliberately without percentages, because the full length of each list is
unknown).

Missing data is never hidden along the way: every view states the coverage
of its own data basis, and everything the normalization corrects, estimates,
or discards is documented as a rule and counted (`docs/datenprofil.md`).

## Getting started

**Without installing anything:** the app runs as a static page at
<https://saigyo.github.io/tsundoku/> — with no library data built in. On
start it accepts a LibraryThing export, normalizes it right in the browser
(the same code as the CLI script), shows the normalization figures, and then
loads the views:

![Welcome page with LibraryThing export upload](docs/screenshots/begruessung-upload.png)

The file never leaves the browser; the normalized data stays local in the
browser (IndexedDB) and survives a reload — "Switch library" in the header
loads a different export at any time, and if stored data comes from a
version that has since become incompatible, the app asks for a fresh upload.
The limit is 10,000 entries, because the views keep everything in memory;
larger libraries can be exported in filtered form from LibraryThing.

**Locally** (Node ≥ 24): the data basis is an export of your own
[LibraryThing](https://www.librarything.com) library: at
<https://www.librarything.com/export.php> choose the **JSON** format,
download the generated file, and hand it to the normalizer:

```bash
node scripts/normalize.mjs ~/path/librarything_export.json
npm install
npm run dev
```

The first command writes `public/data/library.json` and prints figures that
can be checked against `docs/datenprofil.md`. If the file is missing, the
local app shows the upload dialog as well. (The numbers documented there and
some of the cleaning rules are specific to this one library — the app still
runs with someone else's export, the data profile just no longer applies.)

## Stack

Vite + React + TypeScript, Zustand for the single filter store, D3 modules
(`d3-scale`, `d3-shape`, `d3-force`, `d3-sankey`) for scales, layouts, and
paths — the SVG is rendered by React itself. No router: the query string is
the state. The normalizer is a Node-free ES module
(`scripts/normalize-core.mjs`) shared by the CLI and the browser upload.
Vitest covers the normalizer, the filter logic, and the URL round-trip; one
GitHub Action builds and tests every PR, another publishes `main` as a
GitHub Page (without library data).

## Documents

- `CLAUDE.md` — stack, architecture, conventions, design direction
- `docs/datenprofil.md` — field inventory, cleaning rules, pitfalls
- `docs/visualisierungen.md` — the eight views with acceptance criteria

The documents in `docs/` (data profile, view specifications) deliberately
remain in German: they describe one specific library and the decisions made
for it.

## Status

The application is complete: foundation (filter store, URL sync, shell), all
eight views from `docs/visualisierungen.md` including zoom, brush, and
detail interactions, the upload path with in-browser normalization and
persistence, publication as a GitHub Page. Locally: start with
`npm run dev`, build statically with `npm run build`, generate the data
basis once with `node scripts/normalize.mjs <export.json>`.

## License

Tsundoku itself is under the [MIT license](LICENSE) — the code is free to
use. The library data (the LibraryThing export) is not part of the
repository.

The published app bundles third-party components under their own licenses:

| Component | Purpose | License |
|---|---|---|
| [React](https://react.dev/) © Meta Platforms | UI rendering | [MIT](https://github.com/facebook/react/blob/main/LICENSE) |
| [Zustand](https://github.com/pmndrs/zustand) © Paul Henschel | Filter store | [MIT](https://github.com/pmndrs/zustand/blob/main/LICENSE) |
| [D3 modules](https://d3js.org/) © Mike Bostock (d3-array, ‑force, ‑hierarchy, ‑scale, ‑shape) | Scales, layouts, paths | [ISC](https://github.com/d3/d3/blob/main/LICENSE) |
| [d3-sankey](https://github.com/d3/d3-sankey) © Mike Bostock | Sankey layout (Language Flow) | [BSD-3-Clause](https://github.com/d3/d3-sankey/blob/master/LICENSE) |
| [Fraunces](https://github.com/undercasetype/Fraunces) © Undercase Type | Display serif | [OFL-1.1](https://github.com/undercasetype/Fraunces/blob/master/OFL.txt) |
| [Source Sans 3](https://github.com/adobe-fonts/source-sans) © Adobe | Body face | [OFL-1.1](https://github.com/adobe-fonts/source-sans/blob/release/LICENSE.md) |
| [IBM Plex Mono](https://github.com/IBM/plex) © IBM | Numerals & axis labels | [OFL-1.1](https://github.com/IBM/plex/blob/master/LICENSE.txt) |
| [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP) © Google | CJK fallback | [OFL-1.1](https://openfontlicense.org/) |
| [Shippori Mincho](https://github.com/fontdasu/ShipporiMincho) © FONTDASU | Display CJK (Japanese UI, wordmark) | OFL-1.1 |
| [Noto Serif JP](https://fonts.google.com/noto/specimen/Noto+Serif+JP) © Google | CJK fallback for book titles | OFL-1.1 |
| [Fontsource](https://fontsource.org/) | Font packaging for self-hosting | [MIT](https://github.com/fontsource/fontsource/blob/main/LICENSE) |

The fonts are embedded in the published app as WOFF files (self-hosted, no
CDN at runtime); the SIL Open Font License permits this with attribution,
which this table provides. The app's footer links here.
