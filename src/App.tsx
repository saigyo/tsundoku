import { useEffect, useState, type ComponentType } from 'react'
import styles from './App.module.css'
import { DataSummary } from './components/DataSummary'
import { FilterChips } from './components/FilterChips'
import { DataProvider } from './lib/DataContext'
import { loadLibrary, LibraryMissingError } from './lib/loadLibrary'
import type { Library, ViewId } from './lib/types'
import { useFilterStore } from './store/filters'
import { AcquisitionReading } from './views/AcquisitionReading'
import { KnowledgeMap } from './views/KnowledgeMap'
import { LanguageFlow } from './views/LanguageFlow'
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
}

/** Navigationsreihenfolge; Regal steht als Signature-Ansicht zuerst. */
export const VIEW_ORDER: ViewId[] = [
  'shelf', 'timeline', 'knowledge', 'network', 'languages', 'years', 'pace', 'canon',
]

type LoadState =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error'; message: string }
  | { state: 'ready'; library: Library }

export default function App() {
  const [load, setLoad] = useState<LoadState>({ state: 'loading' })

  useEffect(() => {
    loadLibrary()
      .then((library) => setLoad({ state: 'ready', library }))
      .catch((e: unknown) =>
        setLoad(
          e instanceof LibraryMissingError
            ? { state: 'missing' }
            : { state: 'error', message: e instanceof Error ? e.message : String(e) },
        ),
      )
  }, [])

  if (load.state === 'loading') return <p className={styles.center}>Bibliothek wird geladen …</p>
  if (load.state === 'missing') {
    return (
      <div className={styles.center}>
        <h1>Tsundoku 積ん読</h1>
        <p>
          <code>public/data/library.json</code> fehlt. Einmal generieren:
        </p>
        <pre>node scripts/normalize.mjs librarything_kaixo_202607210219.json</pre>
      </div>
    )
  }
  if (load.state === 'error') {
    return (
      <div className={styles.center}>
        <h1>Tsundoku 積ん読</h1>
        <p>Bibliothek konnte nicht geladen werden: {load.message}</p>
      </div>
    )
  }

  return (
    <DataProvider library={load.library}>
      <Shell />
    </DataProvider>
  )
}

function Shell() {
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
      </header>
      <FilterChips />
      <main className={styles.main}>
        <Active />
      </main>
    </>
  )
}
