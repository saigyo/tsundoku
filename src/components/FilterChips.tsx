import { filterLabel, useFilterStore } from '../store/filters'
import styles from './FilterChips.module.css'

export function FilterChips() {
  const filters = useFilterStore((s) => s.filters)
  const removeFilter = useFilterStore((s) => s.removeFilter)
  const clearFilters = useFilterStore((s) => s.clearFilters)
  if (filters.length === 0) return null
  return (
    <div className={styles.bar} role="region" aria-label="Aktive Filter">
      {filters.map((f) => {
        const label = filterLabel(f)
        return (
          <button
            key={label}
            className={styles.chip}
            onClick={() => removeFilter(f)}
            aria-label={`Filter entfernen: ${label}`}
          >
            {label} <span aria-hidden="true">×</span>
          </button>
        )
      })}
      {filters.length > 1 && (
        <button className={styles.clear} onClick={clearFilters}>
          Alle Filter lösen
        </button>
      )}
    </div>
  )
}
