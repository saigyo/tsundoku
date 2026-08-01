import { useEffect, useState, type ComponentType } from 'react'
import styles from './App.module.css'
import { DataSummary } from './components/DataSummary'
import { DataUpload } from './components/DataUpload'
import { FilterChips } from './components/FilterChips'
import { Footer } from './components/Footer'
import { DataProvider } from './lib/DataContext'
import { clearStoredLibrary, loadStoredLibrary } from './lib/libraryStore'
import { loadLibrary, LibraryMissingError } from './lib/loadLibrary'
import type { Library, ViewId } from './lib/types'
import { useFilterStore } from './store/filters'
import { AcquisitionReading } from './views/AcquisitionReading'
import { CanonCheck } from './views/CanonCheck'
import { KnowledgeMap } from './views/KnowledgeMap'
import { LanguageFlow } from './views/LanguageFlow'
import { ReadingPace } from './views/ReadingPace'
import { Shelf } from './views/Shelf'
import { TagNetwork } from './views/TagNetwork'
import { YearMatrix } from './views/YearMatrix'

/** Views tragen sich hier ein, sobald sie gebaut sind (Tasks 7–14). */
export const VIEW_REGISTRY: Partial<Record<ViewId, { label: string; component: ComponentType }>> = {
  shelf: { label: 'Regal', component: Shelf },
  timeline: { label: 'Erwerb & Lektüre', component: AcquisitionReading },
  knowledge: { label: 'Wissenslandkarte', component: KnowledgeMap },
  network: { label: 'Tag-Netzwerk', component: TagNetwork },
  languages: { label: 'Sprachfluss', component: LanguageFlow },
  years: { label: 'Ausgabe × Erwerb', component: YearMatrix },
  pace: { label: 'Lesetempo', component: ReadingPace },
  canon: { label: 'Kanon', component: CanonCheck },
}

/** Navigationsreihenfolge; Regal steht als Signature-Ansicht zuerst. */
export const VIEW_ORDER: ViewId[] = [
  'shelf', 'timeline', 'knowledge', 'network', 'languages', 'years', 'pace', 'canon',
]

type LoadState =
  | { state: 'loading' }
  | { state: 'missing'; notice?: string }
  | { state: 'error'; message: string }
  // source: 'server' = library.json vom Host, 'browser' = Upload/IndexedDB —
  // nur Letzteres bekommt den Bibliothek-wechseln-Knopf.
  | { state: 'ready'; library: Library; source: 'server' | 'browser' }

export default function App() {
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
          setLoad({
            state: 'missing',
            notice:
              'Die im Browser gespeicherte Bibliothek stammt aus einer älteren Version der Anwendung ' +
              'und kann nicht mehr gelesen werden — bitte den Export einmal neu hochladen.',
          })
        } else {
          setLoad({ state: 'missing' })
        }
      })
  }, [])

  let content
  if (load.state === 'loading') {
    content = <p className={styles.center}>Bibliothek wird geladen …</p>
  } else if (load.state === 'missing' || (load.state === 'ready' && replacing)) {
    content = (
      <div>
        <h1 className={styles.center}>Tsundoku 積ん読</h1>
        <DataUpload
          notice={load.state === 'missing' ? load.notice : undefined}
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
        <p>Bibliothek konnte nicht geladen werden: {load.message}</p>
      </div>
    )
  } else {
    content = (
      <DataProvider library={load.library}>
        <Shell onReplaceLibrary={load.source === 'browser' ? () => setReplacing(true) : undefined} />
      </DataProvider>
    )
  }

  return (
    <div className={styles.app}>
      {content}
      <Footer />
    </div>
  )
}

function Shell({ onReplaceLibrary }: { onReplaceLibrary?: () => void }) {
  const view = useFilterStore((s) => s.view)
  const setView = useFilterStore((s) => s.setView)
  const entry = VIEW_REGISTRY[view]
  const Active = entry?.component ?? DataSummary
  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.brand}>
          Tsundoku <span lang="ja">積ん読</span>
        </h1>
        <nav aria-label="Ansichten" className={styles.nav}>
          {VIEW_ORDER.filter((id) => VIEW_REGISTRY[id]).map((id) => (
            <button
              key={id}
              className={styles.navItem}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => setView(id)}
            >
              {VIEW_REGISTRY[id]!.label}
            </button>
          ))}
        </nav>
        {onReplaceLibrary && (
          <button className={styles.replaceLibrary} onClick={onReplaceLibrary}>
            Bibliothek wechseln
          </button>
        )}
      </header>
      <FilterChips />
      <main className={styles.main}>
        <Active />
      </main>
    </>
  )
}
