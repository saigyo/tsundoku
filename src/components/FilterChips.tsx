import { useState } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import { filterKey, filterLabel, useFilterStore } from '../store/filters'
import { FilterEditor } from './FilterEditor'
import styles from './FilterChips.module.css'

/** Permanenter Filterbalken: Chips der aktiven Filter plus „+"-Button für
 *  den Filter-Editor. Rendert auch ohne aktive Filter (sonst gäbe es keinen
 *  Zugang zum Editor und das Layout spränge beim ersten Filter). */
export function FilterChips() {
  const { m } = useI18n()
  const filters = useFilterStore((s) => s.filters)
  const removeFilter = useFilterStore((s) => s.removeFilter)
  const clearFilters = useFilterStore((s) => s.clearFilters)
  const [editorOpen, setEditorOpen] = useState(false)
  return (
    <div className={styles.bar} role="region" aria-label={m.chips.regionAria}>
      {filters.map((f) => {
        const label = filterLabel(f, m)
        return (
          <button
            key={filterKey(f)}
            className={styles.chip}
            onClick={() => removeFilter(f)}
            aria-label={m.chips.removeAria(label)}
          >
            {label} <span aria-hidden="true">×</span>
          </button>
        )
      })}
      {filters.length > 1 && (
        <button className={styles.clear} onClick={clearFilters}>
          {m.chips.clearAll}
        </button>
      )}
      <button className={styles.add} onClick={() => setEditorOpen(true)} aria-label={m.filterEditor.openAria}>
        <span aria-hidden="true">+</span>
      </button>
      {editorOpen && <FilterEditor onClose={() => setEditorOpen(false)} />}
    </div>
  )
}
