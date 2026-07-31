import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { filterBooks, useFilterStore } from '../store/filters'
import type { Book, Library, Stats } from './types'

export interface LibraryData {
  books: Book[]
  stats: Stats
  filtered: Book[]
}

const Ctx = createContext<LibraryData | null>(null)

export function DataProvider({ library, children }: { library: Library; children: ReactNode }) {
  const filters = useFilterStore((s) => s.filters)
  const filtered = useMemo(() => filterBooks(library.books, filters), [library.books, filters])
  const value = useMemo(
    () => ({ books: library.books, stats: library.stats, filtered }),
    [library, filtered],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLibraryData(): LibraryData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLibraryData außerhalb von DataProvider')
  return v
}
