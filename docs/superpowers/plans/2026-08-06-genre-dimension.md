# Genre-Dimension und Genres-View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Genre als UND-verknüpfte Filterdimension plus Genres-View mit Fiction/Nonfiction-Achse und Lesequoten (Spec `docs/superpowers/specs/2026-08-06-genre-dimension-design.md`).

**Architecture:** Die Zusammenlegungs-Semantik (Achse aus Dach+General) wohnt in `lib/genres.ts` (`genreMatches`, `displayGenres`), die Aggregation in `lib/viewData/genres.ts` (`genreRows`). Filter, URL-Sync und Chips erweitern die bestehenden Mechanismen; die View folgt dem Kanonabgleich-Muster inklusive Titel-Popup.

**Tech Stack:** React + TypeScript, CSS Modules, Zustand-Store, Vitest. Keine neuen Abhängigkeiten.

## Global Constraints

- **Voraussetzung:** Branch `feat/genre-dimension` ist vor Task 1 auf den fertigen Stand von `feat/nav-overflow` rebased (`git rebase feat/nav-overflow`) — die View-Reihenfolge und `NavOverflow` existieren dann bereits.
- Bezeichner Englisch, Kommentare und UI-Texte Deutsch; UI-Texte nie hart in Komponenten — typisierte Message-Bundles, `de.tsx` ist Referenz.
- Genre-Werte sind Datenwerte; angezeigt wird immer `genreLabel(value, m)` (übersetzt, Fallback Rohwert).
- Filterlogik: `genre` verhält sich wie `tag` — UND innerhalb der Dimension.
- Kein `title`-Attribut auf Zeilen-Buttons (nativer Tooltip kollidiert mit dem Titel-Popup — Lehre aus PR #21).
- FR-Typografie: schmales geschütztes Leerzeichen vor Doppelpunkt/Prozent als Escape ` ` im Quelltext (kein literales unsichtbares Zeichen — Edit-Falle); DE „…"-Anführungszeichen U+201E/U+201C; ES «» ohne Innenabstand.
- Jeder Commit per `git commit -F <datei>` mit beiden Trailern:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` und
  `Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP`.
- Verifikation nur mit `npx tsc --noEmit`, `npx vitest run`, `npx vite build` — IDE-Diagnostik ist häufig stale und zählt nicht.

---

### Task 1: `lib/genres.ts` — Zusammenlegungs-Semantik mit Tests

**Files:**
- Create: `src/lib/genres.ts`
- Test: `src/lib/genres.test.ts`

**Interfaces:**
- Consumes: `Book` aus `src/lib/types`, `Messages` aus `src/i18n/messages` (nur Typ), `mkBook` aus `src/lib/fixtures` (Test).
- Produces: `GENRE_FICTION`, `GENRE_NONFICTION`, `NO_GENRE`, `UMBRELLA_VALUES`, `GENRE_KEYS`, `GenreKey`, `genreMatches(b, value)`, `displayGenres(b)`, `genreLabel(value, m)` — genutzt von Tasks 2–6.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

`src/lib/genres.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from './fixtures'
import { displayGenres, genreMatches, GENRE_FICTION, GENRE_NONFICTION, NO_GENRE } from './genres'

describe('genreMatches', () => {
  it('Achsenwert trifft Dach, General und beide', () => {
    expect(genreMatches(mkBook({ genres: ['Fiction'] }), GENRE_FICTION)).toBe(true)
    expect(genreMatches(mkBook({ genres: ['General Fiction'] }), GENRE_FICTION)).toBe(true)
    expect(genreMatches(mkBook({ genres: ['Fiction', 'General Fiction'] }), GENRE_FICTION)).toBe(true)
    expect(genreMatches(mkBook({ genres: ['General Nonfiction'] }), GENRE_NONFICTION)).toBe(true)
  })
  it('Achsenwert trifft nicht über die Achse hinweg', () => {
    expect(genreMatches(mkBook({ genres: ['General Fiction'] }), GENRE_NONFICTION)).toBe(false)
  })
  it('spezifischer Wert und No Genre treffen direkt', () => {
    expect(genreMatches(mkBook({ genres: ['Comics', 'Nonfiction'] }), 'Comics')).toBe(true)
    expect(genreMatches(mkBook({ genres: [NO_GENRE] }), NO_GENRE)).toBe(true)
    expect(genreMatches(mkBook({ genres: ['Comics'] }), 'Poetry')).toBe(false)
  })
})

describe('displayGenres', () => {
  it('dedupliziert Dach + General zu einem Achsenlabel', () => {
    expect(displayGenres(mkBook({ genres: ['Nonfiction', 'General Nonfiction', 'Philosophy'] }))).toEqual([
      'Nonfiction',
      'Philosophy',
    ])
  })
  it('Achse vor spezifischen Werten, Datenreihenfolge bleibt', () => {
    expect(displayGenres(mkBook({ genres: ['History', 'Nonfiction', 'Philosophy'] }))).toEqual([
      'Nonfiction',
      'History',
      'Philosophy',
    ])
  })
  it('No Genre bleibt sichtbar', () => {
    expect(displayGenres(mkBook({ genres: [NO_GENRE] }))).toEqual([NO_GENRE])
  })
})
```

- [ ] **Step 2: Tests laufen lassen — FAIL** (`npx vitest run src/lib/genres.test.ts`, Modul fehlt)

- [ ] **Step 3: Implementierung**

`src/lib/genres.ts`:

```ts
import type { Messages } from '../i18n/messages'
import type { Book } from './types'

export const GENRE_FICTION = 'Fiction'
export const GENRE_NONFICTION = 'Nonfiction'
export const NO_GENRE = 'No Genre'

/** Dach- und General-Werte je Achse: „General X" ist im Datenbestand
 *  praktisch Teilmenge von X (754/759 bzw. 1260/1266) und markiert
 *  „ohne Spezialgenre" — es geht im Dach auf (Spec, Entscheidung 2). */
const AXIS_MEMBERS: Record<string, readonly string[]> = {
  [GENRE_FICTION]: ['Fiction', 'General Fiction'],
  [GENRE_NONFICTION]: ['Nonfiction', 'General Nonfiction'],
}

/** Werte, die nie als spezifische Genre-Zeile erscheinen. */
export const UMBRELLA_VALUES: ReadonlySet<string> = new Set([
  'Fiction',
  'General Fiction',
  'Nonfiction',
  'General Nonfiction',
])

/** Filter- und Anzeige-Semantik an einer Stelle: Achsenwerte treffen
 *  Dach ODER General, alles andere ist direkte Mitgliedschaft. */
export function genreMatches(b: Book, value: string): boolean {
  const members = AXIS_MEMBERS[value]
  if (members !== undefined) return members.some((g) => b.genres.includes(g))
  return b.genres.includes(value)
}

/** Anzeige im BookDetail: pro Achse höchstens ein Eintrag, dann die
 *  spezifischen Werte in Datenreihenfolge, ggf. No Genre am Platz. */
export function displayGenres(b: Book): string[] {
  const out: string[] = []
  if (genreMatches(b, GENRE_FICTION)) out.push(GENRE_FICTION)
  if (genreMatches(b, GENRE_NONFICTION)) out.push(GENRE_NONFICTION)
  out.push(...b.genres.filter((g) => !UMBRELLA_VALUES.has(g)))
  return out
}

/** Übersetztes Label mit Fallback auf den Rohwert (unbekannte künftige
 *  Genres bleiben lesbar statt zu verschwinden). */
export function genreLabel(value: string, m: Messages): string {
  return (m.genreNames as Record<string, string>)[value] ?? value
}

/** Vollständiges LibraryThing-Vokabular des Exports (2026-08-06) —
 *  erzwingt per Typsystem denselben Schlüsselsatz in allen Bundles. */
export const GENRE_KEYS = [
  'Fiction',
  'General Fiction',
  'Nonfiction',
  'General Nonfiction',
  'No Genre',
  'Anthropology',
  'Art & Design',
  'Biography & Memoir',
  'Business',
  "Children's Books",
  'Comics',
  'Economics',
  'Fantasy',
  'Food & Cooking',
  'Health & Wellness',
  'Historical Fiction',
  'History',
  'Home & Garden',
  'Horror',
  'Hunting and Fishing',
  'Kids',
  'LGBTQ+',
  'Literature Studies and Criticism',
  'Music',
  'Mystery',
  'Philosophy',
  'Picture Books',
  'Poetry',
  'Politics, Government, Law and Public Policy',
  'Recent Fiction',
  'Reference',
  'Religion & Spirituality',
  'Romance',
  'Science & Nature',
  'Science Fiction',
  'Sexuality and Gender Studies',
  'Sociology',
  'Sports and Leisure',
  'Suspense & Thriller',
  'Technology',
  'Teen',
  'Travel',
  'Tween',
  'Young Adult',
] as const
export type GenreKey = (typeof GENRE_KEYS)[number]
```

Hinweis: `mkBook` muss `genres` unterstützen — tut es, wenn die Fixture
alle `Book`-Felder mit Defaults belegt (prüfen in `src/lib/fixtures.ts`;
Default `genres: []`, per Override setzbar — falls das Feld dort fehlt,
mit Default `[]` ergänzen).

- [ ] **Step 4: Tests laufen lassen — PASS** (`npx vitest run src/lib/genres.test.ts`)

- [ ] **Step 5: Commit** (`git add src/lib/genres.ts src/lib/genres.test.ts src/lib/fixtures.ts` — Letzteres nur falls geändert)

```
feat(genre): Zusammenlegungs-Semantik genreMatches/displayGenres

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
```

---

### Task 2: `lib/viewData/genres.ts` — Aggregation mit Tests

**Files:**
- Create: `src/lib/viewData/genres.ts`
- Test: `src/lib/viewData/genres.test.ts`

**Interfaces:**
- Consumes: `genreMatches`, `GENRE_FICTION`, `GENRE_NONFICTION`, `NO_GENRE`, `UMBRELLA_VALUES` aus Task 1; `mkBook` aus `src/lib/fixtures`.
- Produces: `GenreRow { genre: string; owned: number; read: number }`, `GenreData { axis: GenreRow[]; rows: GenreRow[]; noGenre: GenreRow; covered: number }`, `genreRows(books: Book[]): GenreData` — von Task 5 genutzt.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

`src/lib/viewData/genres.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { genreRows } from './genres'

const books = [
  mkBook({ genres: ['Nonfiction', 'General Nonfiction', 'Philosophy'], hasRead: true }),
  mkBook({ genres: ['General Nonfiction'] }), // nur General: zählt zur Achse, keine Listenzeile
  mkBook({ genres: ['Fiction', 'Comics'], hasRead: true }),
  mkBook({ genres: ['Comics'] }), // spezifisch ohne Dach: Listenzeile, keine Achse
  mkBook({ genres: ['No Genre'] }),
]

describe('genreRows', () => {
  const d = genreRows(books)

  it('Achse zählt Dach- und General-only-Bücher', () => {
    expect(d.axis).toEqual([
      { genre: 'Fiction', owned: 1, read: 1 },
      { genre: 'Nonfiction', owned: 2, read: 1 },
    ])
  })
  it('Listenzeilen ohne Dach/General/No Genre, absteigend nach Bestand', () => {
    expect(d.rows).toEqual([
      { genre: 'Comics', owned: 2, read: 1 },
      { genre: 'Philosophy', owned: 1, read: 1 },
    ])
  })
  it('No Genre als eigene Zeile', () => {
    expect(d.noGenre).toEqual({ genre: 'No Genre', owned: 1, read: 0 })
  })
  it('covered = Titel mit mindestens einem Wert ≠ No Genre', () => {
    expect(d.covered).toBe(4)
  })
})
```

- [ ] **Step 2: Tests laufen lassen — FAIL** (Modul fehlt)

- [ ] **Step 3: Implementierung**

`src/lib/viewData/genres.ts`:

```ts
import { GENRE_FICTION, GENRE_NONFICTION, genreMatches, NO_GENRE, UMBRELLA_VALUES } from '../genres'
import type { Book } from '../types'

export interface GenreRow {
  genre: string
  owned: number
  read: number
}

export interface GenreData {
  axis: GenreRow[] // Fiction, Nonfiction — feste Reihenfolge
  rows: GenreRow[] // spezifische Genres, absteigend nach Bestand
  noGenre: GenreRow // feste letzte Zeile der View
  covered: number // Titel mit mindestens einem Wert ≠ No Genre
}

export function genreRows(books: Book[]): GenreData {
  const axis = [GENRE_FICTION, GENRE_NONFICTION].map((genre) => {
    let owned = 0
    let read = 0
    for (const b of books) {
      if (!genreMatches(b, genre)) continue
      owned += 1
      if (b.hasRead) read += 1
    }
    return { genre, owned, read }
  })

  const spec = new Map<string, { owned: number; read: number }>()
  const noGenre = { genre: NO_GENRE, owned: 0, read: 0 }
  let covered = 0
  for (const b of books) {
    if (b.genres.some((g) => g !== NO_GENRE)) covered += 1
    for (const g of new Set(b.genres)) {
      if (g === NO_GENRE) {
        noGenre.owned += 1
        if (b.hasRead) noGenre.read += 1
        continue
      }
      if (UMBRELLA_VALUES.has(g)) continue
      const e = spec.get(g) ?? { owned: 0, read: 0 }
      e.owned += 1
      if (b.hasRead) e.read += 1
      spec.set(g, e)
    }
  }

  const rows = [...spec]
    .map(([genre, v]) => ({ genre, ...v }))
    .sort((a, z) => z.owned - a.owned || a.genre.localeCompare(z.genre))
  return { axis, rows, noGenre, covered }
}
```

- [ ] **Step 4: Tests laufen lassen — PASS**

- [ ] **Step 5: Commit**

```
feat(genre): genreRows — Achsen- und Listenaggregation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
```

---

### Task 3: ViewId `genres` + i18n (Interface und fünf Bundles)

**Files:**
- Modify: `src/lib/types.ts` (VIEW_IDS)
- Modify: `src/i18n/messages.ts`
- Modify: `src/i18n/de.tsx`, `en.tsx`, `fr.tsx`, `es.tsx`, `ja.tsx`

**Interfaces:**
- Consumes: `GenreKey` aus Task 1.
- Produces: `'genres'` in `ViewId`; `m.nav.genres`, `m.filter.genre(label)`, `m.detail.genres`, `m.views.genres.{title, coverage, counts, sortLabel, sortByOwned, sortByRate}`, `m.genreNames: Record<GenreKey, string>` — genutzt von Tasks 4–6.

- [ ] **Step 1: `VIEW_IDS` erweitern**

In `src/lib/types.ts` im `VIEW_IDS`-Array `'genres',` nach `'canon',`
einfügen. (Die Registry- und Reihenfolge-Einträge folgen in Task 5 —
bis dahin fällt `?view=genres` auf die DataSummary zurück, das ist ok.)

- [ ] **Step 2: `messages.ts` erweitern**

1. Import ergänzen: `import type { GenreKey } from '../lib/genres'`
2. Im `filter`-Block nach `award: (v: string) => string`:
   `genre: (label: string) => string`
3. Im `detail`-Block (bei den Zeilenlabels, nach `tags: string` bzw. am
   Ende der Labels): `genres: string`
4. Im `views`-Block nach dem `canon`-Eintrag:

```ts
    genres: {
      title: string
      coverage: (noGenreFmt: string, noAxisFmt: string) => string
      counts: (ownedFmt: string, readFmt: string, pctFmt: string) => string
      sortLabel: string
      sortByOwned: string
      sortByRate: string
    }
```

5. Auf oberster Ebene (nach `views`): `genreNames: Record<GenreKey, string>`

- [ ] **Step 3: Bundles ergänzen — Struktur (alle fünf gleich)**

Je Bundle: `nav.genres`, `filter.genre`, `detail.genres`,
`views.genres`-Block nach `canon`, `genreNames`-Block auf oberster Ebene
(nach `views`). Für `counts` gilt: exakt die Formulierung des jeweiligen
`views.canon.counts` übernehmen und ` · ` + Prozentteil anhängen
(fr: ` %`, en/ja: `%` ohne Leerzeichen, de/es: ` %`).

**de.tsx:**

```tsx
  nav: { /* … */ genres: 'Genres', },
  filter: { /* … */ genre: (label) => `Genre: ${label}`, },
  detail: { /* … */ genres: 'Genres', },
  views: {
    /* … */
    genres: {
      title: 'Genres',
      coverage: (noGenreFmt, noAxisFmt) =>
        `tragen ein Genre jenseits von „Ohne Genre". ${noGenreFmt} Titel ohne Genre sind ` +
        `fast ausschließlich Vinyl und Filme; ${noAxisFmt} weitere tragen nur spezifische ` +
        `Genres ohne Belletristik-/Sachbuch-Zuordnung.`,
      counts: (ownedFmt, readFmt, pctFmt) => `${ownedFmt} im Bestand · ${readFmt} gelesen · ${pctFmt} %`,
      sortLabel: 'Sortierung:',
      sortByOwned: 'Bestand',
      sortByRate: 'Lesequote',
    },
  },
  genreNames: {
    'Fiction': 'Belletristik',
    'General Fiction': 'Allgemeine Belletristik',
    'Nonfiction': 'Sachbuch',
    'General Nonfiction': 'Allgemeines Sachbuch',
    'No Genre': 'Ohne Genre',
    'Anthropology': 'Anthropologie',
    'Art & Design': 'Kunst & Design',
    'Biography & Memoir': 'Biografie & Memoiren',
    'Business': 'Wirtschaft & Management',
    "Children's Books": 'Kinderbücher',
    'Comics': 'Comics',
    'Economics': 'Volkswirtschaft',
    'Fantasy': 'Fantasy',
    'Food & Cooking': 'Essen & Kochen',
    'Health & Wellness': 'Gesundheit & Wellness',
    'Historical Fiction': 'Historischer Roman',
    'History': 'Geschichte',
    'Home & Garden': 'Haus & Garten',
    'Horror': 'Horror',
    'Hunting and Fishing': 'Jagd & Fischerei',
    'Kids': 'Kinder',
    'LGBTQ+': 'LGBTQ+',
    'Literature Studies and Criticism': 'Literaturwissenschaft & Kritik',
    'Music': 'Musik',
    'Mystery': 'Krimi',
    'Philosophy': 'Philosophie',
    'Picture Books': 'Bilderbücher',
    'Poetry': 'Lyrik',
    'Politics, Government, Law and Public Policy': 'Politik, Staat & Recht',
    'Recent Fiction': 'Neue Belletristik',
    'Reference': 'Nachschlagewerke',
    'Religion & Spirituality': 'Religion & Spiritualität',
    'Romance': 'Liebesroman',
    'Science & Nature': 'Wissenschaft & Natur',
    'Science Fiction': 'Science-Fiction',
    'Sexuality and Gender Studies': 'Sexualität & Gender Studies',
    'Sociology': 'Soziologie',
    'Sports and Leisure': 'Sport & Freizeit',
    'Suspense & Thriller': 'Thriller',
    'Technology': 'Technik',
    'Teen': 'Jugendbuch',
    'Travel': 'Reise',
    'Tween': 'Tween',
    'Young Adult': 'Young Adult',
  },
```

**en.tsx:** `nav.genres: 'Genres'`, `filter.genre: (label) => `Genre: ${label}``,
`detail.genres: 'Genres'`,

```tsx
    genres: {
      title: 'Genres',
      coverage: (noGenreFmt, noAxisFmt) =>
        `carry a genre beyond “No Genre”. The ${noGenreFmt} titles without one are almost ` +
        `exclusively vinyl and films; another ${noAxisFmt} carry only specific genres with ` +
        `no fiction/nonfiction assignment.`,
      counts: (ownedFmt, readFmt, pctFmt) => `${ownedFmt} owned · ${readFmt} read · ${pctFmt}%`,
      sortLabel: 'Sort:',
      sortByOwned: 'Owned',
      sortByRate: 'Read rate',
    },
```

`genreNames`: Identitätsabbildung — jeder der 44 Schlüssel auf sich
selbst (`'Fiction': 'Fiction',` …, `"Children's Books": "Children's Books",` usw., alle 44 ausschreiben).

**fr.tsx:** `nav.genres: 'Genres'`, `filter.genre: (label) => `Genre : ${label}``,
`detail.genres: 'Genres'`,

```tsx
    genres: {
      title: 'Genres',
      coverage: (noGenreFmt, noAxisFmt) =>
        `portent un genre au-delà de « sans genre ». Les ${noGenreFmt} titres sans genre ` +
        `sont presque exclusivement des vinyles et des films ; ${noAxisFmt} autres ne portent ` +
        `que des genres spécifiques, sans classement fiction/non-fiction.`,
      counts: /* views.canon.counts-Formulierung + ` · ${pctFmt} %` */,
      sortLabel: 'Tri :',
      sortByOwned: 'Fonds',
      sortByRate: 'Taux de lecture',
    },
  genreNames: {
    'Fiction': 'Fiction',
    'General Fiction': 'Fiction générale',
    'Nonfiction': 'Non-fiction',
    'General Nonfiction': 'Non-fiction générale',
    'No Genre': 'Sans genre',
    'Anthropology': 'Anthropologie',
    'Art & Design': 'Art et design',
    'Biography & Memoir': 'Biographies et mémoires',
    'Business': 'Affaires et management',
    "Children's Books": 'Livres pour enfants',
    'Comics': 'Bande dessinée',
    'Economics': 'Économie',
    'Fantasy': 'Fantasy',
    'Food & Cooking': 'Cuisine et gastronomie',
    'Health & Wellness': 'Santé et bien-être',
    'Historical Fiction': 'Roman historique',
    'History': 'Histoire',
    'Home & Garden': 'Maison et jardin',
    'Horror': 'Horreur',
    'Hunting and Fishing': 'Chasse et pêche',
    'Kids': 'Enfants',
    'LGBTQ+': 'LGBTQ+',
    'Literature Studies and Criticism': 'Études littéraires et critique',
    'Music': 'Musique',
    'Mystery': 'Policier',
    'Philosophy': 'Philosophie',
    'Picture Books': 'Albums illustrés',
    'Poetry': 'Poésie',
    'Politics, Government, Law and Public Policy': 'Politique, droit et société',
    'Recent Fiction': 'Fiction récente',
    'Reference': 'Ouvrages de référence',
    'Religion & Spirituality': 'Religion et spiritualité',
    'Romance': 'Romance',
    'Science & Nature': 'Sciences et nature',
    'Science Fiction': 'Science-fiction',
    'Sexuality and Gender Studies': 'Sexualité et études de genre',
    'Sociology': 'Sociologie',
    'Sports and Leisure': 'Sports et loisirs',
    'Suspense & Thriller': 'Thriller',
    'Technology': 'Technologie',
    'Teen': 'Ado',
    'Travel': 'Voyage',
    'Tween': 'Préado',
    'Young Adult': 'Young adult',
  },
```

**es.tsx:** `nav.genres: 'Géneros'`, `filter.genre: (label) => `Género: ${label}``,
`detail.genres: 'Géneros'`,

```tsx
    genres: {
      title: 'Géneros',
      coverage: (noGenreFmt, noAxisFmt) =>
        `llevan un género más allá de «Sin género». Los ${noGenreFmt} títulos sin género son ` +
        `casi exclusivamente vinilos y películas; otros ${noAxisFmt} solo llevan géneros ` +
        `específicos, sin clasificación ficción/no ficción.`,
      counts: /* views.canon.counts-Formulierung + ` · ${pctFmt} %` */,
      sortLabel: 'Orden:',
      sortByOwned: 'Fondo',
      sortByRate: 'Tasa de lectura',
    },
  genreNames: {
    'Fiction': 'Ficción',
    'General Fiction': 'Ficción general',
    'Nonfiction': 'No ficción',
    'General Nonfiction': 'No ficción general',
    'No Genre': 'Sin género',
    'Anthropology': 'Antropología',
    'Art & Design': 'Arte y diseño',
    'Biography & Memoir': 'Biografías y memorias',
    'Business': 'Empresa y negocios',
    "Children's Books": 'Libros infantiles',
    'Comics': 'Cómic',
    'Economics': 'Economía',
    'Fantasy': 'Fantasía',
    'Food & Cooking': 'Cocina y gastronomía',
    'Health & Wellness': 'Salud y bienestar',
    'Historical Fiction': 'Novela histórica',
    'History': 'Historia',
    'Home & Garden': 'Hogar y jardín',
    'Horror': 'Terror',
    'Hunting and Fishing': 'Caza y pesca',
    'Kids': 'Niños',
    'LGBTQ+': 'LGBTQ+',
    'Literature Studies and Criticism': 'Estudios literarios y crítica',
    'Music': 'Música',
    'Mystery': 'Novela negra',
    'Philosophy': 'Filosofía',
    'Picture Books': 'Álbumes ilustrados',
    'Poetry': 'Poesía',
    'Politics, Government, Law and Public Policy': 'Política, derecho y sociedad',
    'Recent Fiction': 'Ficción reciente',
    'Reference': 'Obras de referencia',
    'Religion & Spirituality': 'Religión y espiritualidad',
    'Romance': 'Romántica',
    'Science & Nature': 'Ciencia y naturaleza',
    'Science Fiction': 'Ciencia ficción',
    'Sexuality and Gender Studies': 'Sexualidad y estudios de género',
    'Sociology': 'Sociología',
    'Sports and Leisure': 'Deporte y ocio',
    'Suspense & Thriller': 'Suspense y thriller',
    'Technology': 'Tecnología',
    'Teen': 'Adolescente',
    'Travel': 'Viajes',
    'Tween': 'Preadolescente',
    'Young Adult': 'Juvenil',
  },
```

**ja.tsx:** `nav.genres: 'ジャンル'`, `filter.genre: (label) => `ジャンル：${label}``,
`detail.genres: 'ジャンル'`,

```tsx
    genres: {
      title: 'ジャンル',
      coverage: (noGenreFmt, noAxisFmt) =>
        `件が「ジャンルなし」以外のジャンルを持つ。ジャンルなしの${noGenreFmt}件はほぼ` +
        `レコード盤と映画。さらに${noAxisFmt}件はフィクション／ノンフィクションの` +
        `区分なしに固有ジャンルのみを持つ。`,
      counts: /* views.canon.counts-Formulierung + `・${pctFmt}%` */,
      sortLabel: '並べ替え：',
      sortByOwned: '蔵書数',
      sortByRate: '既読率',
    },
  genreNames: {
    'Fiction': 'フィクション',
    'General Fiction': '一般フィクション',
    'Nonfiction': 'ノンフィクション',
    'General Nonfiction': '一般ノンフィクション',
    'No Genre': 'ジャンルなし',
    'Anthropology': '人類学',
    'Art & Design': '美術・デザイン',
    'Biography & Memoir': '伝記・回想録',
    'Business': 'ビジネス',
    "Children's Books": '児童書',
    'Comics': 'コミック',
    'Economics': '経済学',
    'Fantasy': 'ファンタジー',
    'Food & Cooking': '料理・食',
    'Health & Wellness': '健康・ウェルネス',
    'Historical Fiction': '歴史小説',
    'History': '歴史',
    'Home & Garden': '住まいと庭',
    'Horror': 'ホラー',
    'Hunting and Fishing': '狩猟・釣り',
    'Kids': '子ども',
    'LGBTQ+': 'LGBTQ+',
    'Literature Studies and Criticism': '文学研究・批評',
    'Music': '音楽',
    'Mystery': 'ミステリー',
    'Philosophy': '哲学',
    'Picture Books': '絵本',
    'Poetry': '詩歌',
    'Politics, Government, Law and Public Policy': '政治・法・公共政策',
    'Recent Fiction': '近年のフィクション',
    'Reference': 'レファレンス',
    'Religion & Spirituality': '宗教・スピリチュアリティ',
    'Romance': '恋愛小説',
    'Science & Nature': '科学・自然',
    'Science Fiction': 'SF',
    'Sexuality and Gender Studies': 'セクシュアリティ・ジェンダー研究',
    'Sociology': '社会学',
    'Sports and Leisure': 'スポーツ・レジャー',
    'Suspense & Thriller': 'サスペンス・スリラー',
    'Technology': '技術',
    'Teen': 'ティーン',
    'Travel': '旅行',
    'Tween': 'トゥイーン',
    'Young Adult': 'ヤングアダルト',
  },
```

- [ ] **Step 4: Verifikation**

Run: `npx tsc --noEmit` → keine Fehler (Record<GenreKey, string> erzwingt
Vollständigkeit in allen fünf Bundles).
Run: `node -e "const s=require('fs').readFileSync('src/i18n/fr.tsx','utf8'); if(!s.includes('Tri\\\\u202f') && !s.includes('Tri\\u202f')) { console.error('U+202f fehlt'); process.exit(1) } console.log('fr ok')"`

- [ ] **Step 5: Commit**

```
feat(i18n): Genre-Vokabular in fünf Sprachen + ViewId genres

44 genreNames-Einträge je Bundle (Record<GenreKey, string> erzwingt
Vollständigkeit), views.genres-Namespace, filter.genre, detail.genres,
nav.genres.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
```

---

### Task 4: Filterdimension `genre` (Typ, Store, URL-Sync) mit Tests

**Files:**
- Modify: `src/lib/types.ts` (Filter-Union)
- Modify: `src/store/filters.ts`
- Modify: `src/store/urlSync.ts`
- Test: `src/store/filters.test.ts`, `src/store/urlSync.test.ts` (erweitern)

**Interfaces:**
- Consumes: `genreMatches`, `genreLabel` aus Task 1; `m.filter.genre` aus Task 3.
- Produces: `{ kind: 'genre'; value: string }` als vollwertiger Filter (Matching, UND-Semantik, Chip-Label, URL-Parameter `genre`).

- [ ] **Step 1: Fehlschlagende Tests ergänzen**

In `src/store/filters.test.ts` (Fixtures oben ergänzen:
`const comic = mkBook({ genres: ['Nonfiction', 'Comics'], hasRead: true })`
und `const novel = mkBook({ genres: ['General Fiction'] })`, beide in einem
neuen lokalen Array verwenden):

```ts
describe('filterBooks: genre', () => {
  const genreBooks = [comic, novel]
  it('Achsenwert trifft auch General-only (Zusammenlegung)', () => {
    expect(filterBooks(genreBooks, [{ kind: 'genre', value: 'Fiction' }])).toEqual([novel])
  })
  it('UND innerhalb der Dimension wie bei Tags', () => {
    expect(
      filterBooks(genreBooks, [
        { kind: 'genre', value: 'Nonfiction' },
        { kind: 'genre', value: 'Comics' },
      ]),
    ).toEqual([comic])
    expect(
      filterBooks(genreBooks, [
        { kind: 'genre', value: 'Fiction' },
        { kind: 'genre', value: 'Comics' },
      ]),
    ).toEqual([])
  })
  it('Chip-Label nutzt die Übersetzung', () => {
    expect(filterLabel({ kind: 'genre', value: 'Comics' }, de)).toBe('Genre: Comics')
    expect(filterLabel({ kind: 'genre', value: 'Mystery' }, de)).toBe('Genre: Krimi')
  })
})
```

In `src/store/urlSync.test.ts`:

```ts
it('genre überlebt die URL-Runde', () => {
  const q = stateToQuery('shelf', [{ kind: 'genre', value: 'Comics' }])
  expect(queryToState(q).filters).toEqual([{ kind: 'genre', value: 'Comics' }])
})
```

- [ ] **Step 2: Tests laufen lassen — FAIL** (Typ- und Match-Fehler)

- [ ] **Step 3: Implementierung**

1. `src/lib/types.ts`, Filter-Union nach der `award`-Zeile:
   `| { kind: 'genre'; value: string }`
2. `src/store/filters.ts`:
   - Import: `import { genreLabel, genreMatches } from '../lib/genres'`
   - In `matches` nach dem `award`-Fall:
     ```ts
     case 'genre':
       return genreMatches(b, f.value)
     ```
   - In `filterBooks` die UND-Ausnahme erweitern (Kommentar mitziehen —
     Genres sind wie Tags mehrwertig pro Buch):
     ```ts
     kind === 'tag' || kind === 'genre' ? g.every((f) => matches(b, f)) : g.some((f) => matches(b, f)),
     ```
   - In `filterLabel` nach dem `award`-Fall:
     ```ts
     case 'genre':
       return m.filter.genre(genreLabel(f.value, m))
     ```
3. `src/store/urlSync.ts`, in `PARAMS` nach der `award`-Zeile:
   `['genre', 'genre'],` (der `default`-Zweig von `parseOne` trägt den
   Wert bereits durch).

- [ ] **Step 4: Alle Tests laufen lassen — PASS** (`npx vitest run`)

- [ ] **Step 5: Commit**

```
feat(filter): Genre-Dimension — UND-Semantik, Chips, URL-Sync

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
```

---

### Task 5: Genres-View mit Achsen-Gruppe, Sortierung und Titel-Popup

**Files:**
- Modify: `src/lib/bookListPopup.ts` (`readDateOrTagYear` zieht ein)
- Modify: `src/views/CanonCheck.tsx` (importiert statt lokal)
- Create: `src/views/Genres.tsx`
- Create: `src/views/Genres.module.css`
- Modify: `src/App.tsx` (Registry + Reihenfolge)

**Interfaces:**
- Consumes: `genreRows`/`GenreRow` aus Task 2, `genreLabel`/`genreMatches`/`GENRE_FICTION`/`GENRE_NONFICTION`/`NO_GENRE` aus Task 1, Filter aus Task 4, i18n aus Task 3, `BookListPopup`/`useBookListPopup`/`sortBooksByDate` (Bestand).
- Produces: View `genres` in Registry und Reihenfolge; `readDateOrTagYear` als gemeinsamer Export.

- [ ] **Step 1: `readDateOrTagYear` nach `src/lib/bookListPopup.ts` verschieben**

Dort exportieren (Funktionstext samt Kommentar unverändert aus
`CanonCheck.tsx` übernehmen, `import type { Book }` existiert bereits):

```ts
// Nur per Jahres-Tag als gelesen markierte Titel haben kein readDate — ihr
// Jahr ist trotzdem bekannt und zählt; das nackte „YYYY" sortiert per
// ISO-Stringvergleich vor die datierten Titel desselben Jahres.
export const readDateOrTagYear = (b: Book): string | null =>
  b.readDate ?? (b.readYearEffective !== null ? String(b.readYearEffective) : null)
```

In `CanonCheck.tsx` die lokale Definition entfernen und importieren:
`import { readDateOrTagYear, sortBooksByDate } from '../lib/bookListPopup'`.

Run: `npx tsc --noEmit` → keine Fehler.

- [ ] **Step 2: View anlegen**

`src/views/Genres.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { BookDetail } from '../components/BookDetail'
import { BookListPopup } from '../components/BookListPopup'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useI18n } from '../i18n/LocaleContext'
import { readDateOrTagYear, sortBooksByDate } from '../lib/bookListPopup'
import { GENRE_FICTION, GENRE_NONFICTION, genreLabel, genreMatches, NO_GENRE } from '../lib/genres'
import type { Book } from '../lib/types'
import { useBookListPopup } from '../lib/useBookListPopup'
import { useLibraryData } from '../lib/DataContext'
import { genreRows, type GenreRow } from '../lib/viewData/genres'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './Genres.module.css'

type SortMode = 'owned' | 'rate'

export function Genres() {
  const { m, fmtNum } = useI18n()
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const [sort, setSort] = useState<SortMode>('owned')
  const data = useMemo(() => genreRows(filtered), [filtered])
  const wrapRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Book | null>(null)
  // Titel-Popup wie im Kanonabgleich (Spec „Interaktives Titel-Popup"):
  // Hover listet die Titel des Genres, der Zeilen-Klick bleibt der Filter.
  const { popup, popupRef, hoverAnchor, leaveChart, popupEnter, popupLeave, pin, close } =
    useBookListPopup<{ genre: string }>((a, b) => a.genre === b.genre, selected !== null)

  const popupBooks = useMemo(() => {
    if (popup === null) return []
    return sortBooksByDate(
      filtered.filter((b) => genreMatches(b, popup.anchor.genre)),
      readDateOrTagYear,
    )
  }, [popup, filtered])

  // Filterwechsel kann die Liste leeren, ohne dass ein pointerleave feuert.
  useEffect(() => {
    if (popup !== null && popupBooks.length === 0) close()
  }, [popup, popupBooks, close])

  // Quoten-Sortierung in der View, die Grundreihenfolge (Bestand) bleibt
  // im Datenmodul stabil. Sekundärschlüssel Bestand.
  const sortedRows = useMemo(() => {
    if (sort === 'owned') return data.rows
    return [...data.rows].sort(
      (a, z) => z.read / z.owned - a.read / a.owned || z.owned - a.owned,
    )
  }, [data, sort])

  if (filtered.length === 0) return <EmptyState />

  const axisMax = Math.max(...data.axis.map((r) => r.owned), 1)
  const listMax = Math.max(...data.rows.map((r) => r.owned), data.noGenre.owned, 1)
  // Achsenlücke für die Abdeckungsnotiz: nur spezifische Genres, kein
  // Dach/General, kein No Genre (Befund, keine stille Korrektur).
  const noAxis = filtered.filter(
    (b) =>
      !genreMatches(b, GENRE_FICTION) &&
      !genreMatches(b, GENRE_NONFICTION) &&
      !b.genres.includes(NO_GENRE),
  ).length
  const isActive = (g: string) => filters.some((f) => sameFilter(f, { kind: 'genre', value: g }))
  const pct = (r: GenreRow) => (r.owned === 0 ? 0 : Math.round((100 * r.read) / r.owned))

  const row = (r: GenreRow, max: number) => (
    <li key={r.genre}>
      <button
        className={styles.row}
        aria-pressed={isActive(r.genre)}
        onClick={() => toggleFilter({ kind: 'genre', value: r.genre })}
        onPointerMove={(e) => {
          // Anker am Zeiger wie in der Heatmap: die Zeilen sind flach.
          const rect = wrapRef.current?.getBoundingClientRect()
          if (rect === undefined || r.owned === 0) return
          hoverAnchor({ genre: r.genre }, e.clientX - rect.left, e.clientY - rect.top)
        }}
      >
        <span className={styles.listName}>{genreLabel(r.genre, m)}</span>
        <span className={styles.barTrack}>
          <span className={styles.barOwned} style={{ width: `${(r.owned / max) * 100}%` }}>
            <span
              className={styles.barRead}
              style={{ width: `${r.owned === 0 ? 0 : (r.read / r.owned) * 100}%` }}
            />
          </span>
        </span>
        <span className={styles.counts}>
          {m.views.genres.counts(fmtNum(r.owned), fmtNum(r.read), fmtNum(pct(r)))}
        </span>
      </button>
    </li>
  )

  const popupCounts =
    popup === null
      ? ''
      : m.views.genres.counts(
          fmtNum(popupBooks.length),
          fmtNum(popupBooks.filter((b) => b.hasRead).length),
          fmtNum(
            popupBooks.length === 0
              ? 0
              : Math.round((100 * popupBooks.filter((b) => b.hasRead).length) / popupBooks.length),
          ),
        )

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>{m.views.genres.title}</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          {m.views.genres.coverage(fmtNum(data.noGenre.owned), fmtNum(noAxis))}
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <span>{m.views.genres.sortLabel}</span>
        <button
          className={styles.action}
          aria-pressed={sort === 'owned'}
          onClick={() => setSort('owned')}
        >
          {m.views.genres.sortByOwned}
        </button>
        <button
          className={styles.action}
          aria-pressed={sort === 'rate'}
          onClick={() => setSort('rate')}
        >
          {m.views.genres.sortByRate}
        </button>
      </div>

      {/* Achse: Dach+General zusammengelegt, eigener Maßstab — die
          Summenbalken sind überlappende Mitgliedschaften, keine Anteile. */}
      <ol className={styles.axis} onPointerLeave={leaveChart}>
        {data.axis.map((r) => row(r, axisMax))}
      </ol>

      <ol className={styles.rows} onPointerLeave={leaveChart}>
        {sortedRows.map((r) => row(r, listMax))}
        {data.noGenre.owned > 0 && row(data.noGenre, listMax)}
      </ol>

      {popup && popupBooks.length > 0 && (
        <BookListPopup
          x={popup.x}
          y={popup.y}
          popupRef={popupRef}
          header={
            <>
              <strong>{genreLabel(popup.anchor.genre, m)}</strong>: {popupCounts}
            </>
          }
          ariaContext={`${genreLabel(popup.anchor.genre, m)}: ${popupCounts}`}
          books={popupBooks}
          dateOf={readDateOrTagYear}
          dateGranularity="year"
          onSelect={(b) => {
            pin()
            setSelected(b)
          }}
          onPointerEnter={popupEnter}
          onPointerLeave={popupLeave}
        />
      )}
      <BookDetail book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
```

- [ ] **Step 3: Styles anlegen**

`src/views/Genres.module.css` (Zeilen-Optik wie der Kanonabgleich):

```css
.wrap {
  /* Positionierungskontext für das absolut gesetzte Titel-Popup */
  position: relative;
}

.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.controls {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin: var(--space-2) 0 var(--space-3);
  font-size: 14px;
}

.action {
  border: 1px solid var(--kon);
  background: none;
  color: var(--kon);
  border-radius: var(--radius);
  padding: 2px var(--space-2);
}

.action[aria-pressed='true'] {
  background: var(--kon);
  color: var(--shironeri);
}

.axis {
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0 0 var(--space-3);
  display: grid;
  gap: var(--space-1);
  border-bottom: 1px solid var(--ink-15);
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-1);
}

.row {
  display: grid;
  grid-template-columns: minmax(12rem, 20rem) 1fr max-content;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  border: none;
  background: none;
  padding: var(--space-1) var(--space-2);
  text-align: left;
  font-size: 14px;
}

.row[aria-pressed='true'] {
  outline: 1px solid var(--kon);
  background: var(--paper);
}

.listName {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.barTrack {
  display: block;
  height: 14px;
}

.barOwned {
  display: block;
  height: 100%;
  background: var(--ink-15);
}

.barRead {
  display: block;
  height: 100%;
  background: var(--kon);
}

.counts {
  font-family: var(--font-mono);
  color: var(--ink-70);
  white-space: nowrap;
}
```

- [ ] **Step 4: Registrieren**

`src/App.tsx`:
1. `import { Genres } from './views/Genres'`
2. In `VIEW_REGISTRY`: `genres: Genres,` (nach `canon`)
3. In `VIEW_ORDER` `'genres',` nach `'knowledge',` einfügen — Ergebnis:
   `['shelf', 'timeline', 'knowledge', 'genres', 'tagTrends', 'network', 'languages', 'canon', 'years', 'pace']`

- [ ] **Step 5: Verifikation**

Run: `npx tsc --noEmit` → keine Fehler
Run: `npx vitest run` → alle Tests grün
Run: `npx vite build` → fehlerfrei

- [ ] **Step 6: Commit**

```
feat(genre): Genres-View — Achse, Lesequoten, Titel-Popup

Balkenliste im Kanon-Stil: Fiction/Nonfiction-Zusammenfassung mit
eigenem Maßstab, spezifische Genres mit Quote als Zahl, Sortier-
Umschalter Bestand/Lesequote, „Ohne Genre" als feste letzte Zeile.
readDateOrTagYear zieht als gemeinsamer Export nach lib/bookListPopup.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
```

---

### Task 6: Genres-Zeile im BookDetail

**Files:**
- Modify: `src/components/BookDetail.tsx`

**Interfaces:**
- Consumes: `displayGenres`, `genreLabel` aus Task 1; Filter `{ kind: 'genre' }` aus Task 4; `m.detail.genres` aus Task 3.
- Produces: klickbare Genre-Chips im Detail-Dialog.

- [ ] **Step 1: Zeile ergänzen**

In `src/components/BookDetail.tsx`:
1. Import: `import { displayGenres, genreLabel } from '../lib/genres'`
2. Im `rows`-Array nach der `tags`-Zeile:

```tsx
    [
      m.detail.genres,
      chips(displayGenres(book).map((g) => chip({ kind: 'genre', value: g }, genreLabel(g, m)))),
    ],
```

(`chips(...)` liefert bei leerer Liste `null`, die Zeile verschwindet dann
wie bei den anderen — mit 100 % Genre-Abdeckung praktisch nie.)

- [ ] **Step 2: Verifikation**

Run: `npx tsc --noEmit` → keine Fehler
Run: `npx vitest run` → grün

- [ ] **Step 3: Commit**

```
feat(genre): Genres-Zeile im BookDetail mit Filter-Chips

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F4fjRtBP7VWSwbD4CFKadP
```

---

## Nach den Tasks (Controller, nicht Subagent)

Playwright-DoD der Spec (Punkte 1–7) mit realen Daten auf eigenem Server
(Port 5199, nie 5174): Kennzahlen (Nonfiction 2.744, Fiction 1.390,
Philosophy 800, „Ohne Genre" 405 zuletzt, Comics 73 %), UND-Verengung
Nonfiction + Comics mit Chips, Sortier-Umschalter, Popup-Kette bis
BookDetail (Jahresspalte inkl. Jahres-Tag-Lektüre), Genres-Zeile im
Detail, Locale-Stichprobe JA (哲学), Abdeckungsnotiz 4.460 von 4.865.
