import { useEffect, useState, type ComponentType } from 'react'
import styles from './App.module.css'
import { DataSummary } from './components/DataSummary'
import { DataUpload } from './components/DataUpload'
import { FilterChips } from './components/FilterChips'
import { Footer } from './components/Footer'
import { NavOverflow } from './components/NavOverflow'
import { useI18n } from './i18n/LocaleContext'
import { DataProvider } from './lib/DataContext'
import { clearStoredLibrary, loadStoredLibrary } from './lib/libraryStore'
import { loadLibrary, LibraryMissingError } from './lib/loadLibrary'
import type { Library, ViewId } from './lib/types'
import { useFilterStore } from './store/filters'
import { AcquisitionReading } from './views/AcquisitionReading'
import { CanonCheck } from './views/CanonCheck'
import { Genres } from './views/Genres'
import { KnowledgeMap } from './views/KnowledgeMap'
import { LanguageFlow } from './views/LanguageFlow'
import { ReadingPace } from './views/ReadingPace'
import { Shelf } from './views/Shelf'
import { TagTrends } from './views/TagTrends'
import { TagNetwork } from './views/TagNetwork'
import { YearMatrix } from './views/YearMatrix'

/** Views tragen sich hier ein, sobald sie gebaut sind (Tasks 7–14). */
export const VIEW_REGISTRY: Partial<Record<ViewId, ComponentType>> = {
  shelf: Shelf,
  timeline: AcquisitionReading,
  knowledge: KnowledgeMap,
  tagTrends: TagTrends,
  network: TagNetwork,
  languages: LanguageFlow,
  years: YearMatrix,
  pace: ReadingPace,
  canon: CanonCheck,
  genres: Genres,
}

/** Navigationsreihenfolge nach Erkenntniswert (Spec „Kopfzeile mit
 *  Überlaufmenü"): die hinteren Views überlaufen zuerst ins Mehr-Menü. */
export const VIEW_ORDER: ViewId[] = [
  'shelf', 'timeline', 'knowledge', 'genres', 'tagTrends', 'network', 'languages', 'canon', 'years', 'pace',
]

type LoadState =
  | { state: 'loading' }
  | { state: 'missing'; incompatible: boolean }
  | { state: 'error'; message: string }
  // source: 'server' = library.json vom Host, 'browser' = Upload/IndexedDB —
  // nur Letzteres bekommt den Bibliothek-wechseln-Knopf.
  | { state: 'ready'; library: Library; source: 'server' | 'browser' }

export default function App() {
  const { m } = useI18n()
  const [load, setLoad] = useState<LoadState>({ state: 'loading' })
  const [replacing, setReplacing] = useState(false)

  useEffect(() => {
    loadLibrary()
      .then((library) => setLoad({ state: 'ready', library, source: 'server' }))
      .catch(async (e: unknown) => {
        // Keine library.json (z. B. auf der veröffentlichten GitHub-Page) oder
        // Lade-/Netzfehler: zuvor hochgeladene Bibliothek aus IndexedDB nutzen;
        // der Fehlerbildschirm ist die letzte Instanz.
        const stored = await loadStoredLibrary()
        if (stored.state === 'ok') {
          setLoad({ state: 'ready', library: stored.record.library, source: 'browser' })
          return
        }
        if (!(e instanceof LibraryMissingError)) {
          setLoad({ state: 'error', message: e instanceof Error ? e.message : String(e) })
          return
        }
        if (stored.state === 'incompatible') {
          clearStoredLibrary().catch(() => undefined)
          setLoad({ state: 'missing', incompatible: true })
        } else {
          setLoad({ state: 'missing', incompatible: false })
        }
      })
  }, [])

  let content
  if (load.state === 'loading') {
    content = <p className={styles.center}>{m.app.loading}</p>
  } else if (load.state === 'missing' || (load.state === 'ready' && replacing)) {
    content = (
      <div>
        <h1 className={styles.center}>Tsundoku 積ん読</h1>
        <DataUpload
          notice={load.state === 'missing' && load.incompatible ? m.app.incompatibleNotice : undefined}
          onCancel={load.state === 'ready' ? () => setReplacing(false) : undefined}
          onLoaded={(library) => {
            setLoad({ state: 'ready', library, source: 'browser' })
            setReplacing(false)
          }}
        />
      </div>
    )
  } else if (load.state === 'error') {
    content = (
      <div className={styles.center}>
        <h1>Tsundoku 積ん読</h1>
        <p>{m.app.loadError(load.message)}</p>
      </div>
    )
  } else {
    content = (
      <DataProvider library={load.library}>
        <Shell />
      </DataProvider>
    )
  }

  return (
    <div className={styles.app}>
      {content}
      <Footer
        onReplaceLibrary={
          load.state === 'ready' && load.source === 'browser' && !replacing
            ? () => setReplacing(true)
            : undefined
        }
      />
    </div>
  )
}

function Shell() {
  const view = useFilterStore((s) => s.view)
  const setView = useFilterStore((s) => s.setView)
  const Active = VIEW_REGISTRY[view] ?? DataSummary
  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.brand}>
          Tsundoku <span lang="ja">積ん読</span>
        </h1>
        <NavOverflow
          views={VIEW_ORDER.filter((id) => VIEW_REGISTRY[id])}
          active={view}
          onSelect={setView}
        />
      </header>
      <FilterChips />
      <main className={styles.main}>
        <Active />
      </main>
    </>
  )
}
