import { useI18n } from '../i18n/LocaleContext'
import { filterKey, filterLabel, useFilterStore } from '../store/filters'
import styles from './FilterChips.module.css'

export function FilterChips() {
  const { m } = useI18n()
  const filters = useFilterStore((s) => s.filters)
  const removeFilter = useFilterStore((s) => s.removeFilter)
  const clearFilters = useFilterStore((s) => s.clearFilters)
  if (filters.length === 0) return null
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
    </div>
  )
}
