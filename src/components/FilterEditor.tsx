import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { facetCounts } from '../lib/facetCounts'
import type { Filter, MediaType } from '../lib/types'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './FilterEditor.module.css'

const MEDIA_TYPES: MediaType[] = ['book', 'ebook', 'film', 'vinyl']

/** Dialog-Popup für die Filterdimensionen ohne eigene View (Status, Medium,
 *  Sammlung). Bewusst dumme Anzeige: Setzen/Entfernen ist toggleFilter
 *  (ODER innerhalb der Dimension wie überall), die Zählungen kommen aus
 *  facetCounts. Bleibt beim Klicken offen — man setzt oft mehrere
 *  Kriterien in Folge; Esc, Backdrop-Klick und Schließen-Button schließen. */
export function FilterEditor({ onClose }: { onClose: () => void }) {
  const { m, fmtNum } = useI18n()
  const { books, stats } = useLibraryData()
  const filters = useFilterStore((s) => s.filters)
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
  }, [])
  const counts = useMemo(() => facetCounts(books, filters), [books, filters])

  const chip = (f: Filter & { value: string | number }, label: string, count: number) => {
    const active = filters.some((g) => sameFilter(g, f))
    return (
      <button
        key={String(f.value)}
        className={active ? styles.valActive : styles.val}
        aria-pressed={active}
        onClick={() => toggleFilter(f)}
      >
        {label} <span className={styles.count}>{fmtNum(count)}</span>
      </button>
    )
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      onClick={(e) => {
        // padding 0 am dialog: nur echte Backdrop-Klicks treffen das Element selbst
        // dialog.close() statt onClose(), damit der Fokus nativ zurückkehrt
        if (e.target === ref.current) ref.current?.close()
      }}
      aria-label={m.filterEditor.title}
    >
      <div className={styles.panel}>
        <h4 className={styles.title}>{m.filterEditor.title}</h4>
        <div className={styles.group}>
          <p className={styles.groupLabel}>{m.filterEditor.status}</p>
          <div className={styles.values}>
            {chip({ kind: 'readStatus', value: 'read' }, m.filterEditor.read, counts.read)}
            {chip({ kind: 'readStatus', value: 'unread' }, m.filterEditor.unread, counts.unread)}
          </div>
        </div>
        <div className={styles.group}>
          <p className={styles.groupLabel}>{m.filterEditor.medium}</p>
          <div className={styles.values}>
            {MEDIA_TYPES.map((t) => chip({ kind: 'mediaType', value: t }, m.media[t], counts.media.get(t) ?? 0))}
          </div>
        </div>
        <div className={styles.group}>
          <p className={styles.groupLabel}>{m.filterEditor.collection}</p>
          <div className={styles.values}>
            {/* Reihenfolge aus stats.collections (Gesamtbestand, stabil);
                Sammlungsnamen sind Datenwerte und werden nie übersetzt. */}
            {stats.collections.map(([value]) =>
              chip({ kind: 'collection', value: String(value) }, String(value), counts.collections.get(String(value)) ?? 0),
            )}
          </div>
        </div>
        <div className={styles.foot}>
          <button className={styles.close} onClick={() => ref.current?.close()}>
            {m.filterEditor.close}
          </button>
        </div>
      </div>
    </dialog>
  )
}
