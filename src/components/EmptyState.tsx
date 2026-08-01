import { useI18n } from '../i18n/LocaleContext'
import { filterKey, filterLabel, useFilterStore } from '../store/filters'
import styles from './EmptyState.module.css'

/** Leere Treffermenge: nennt die greifenden Filter und bietet an, sie zu lösen. */
export function EmptyState() {
  const { m } = useI18n()
  const filters = useFilterStore((s) => s.filters)
  const removeFilter = useFilterStore((s) => s.removeFilter)
  const clearFilters = useFilterStore((s) => s.clearFilters)
  return (
    <div className={styles.box}>
      <h3>{m.empty.title}</h3>
      <p>{m.empty.active}</p>
      <ul>
        {filters.map((f) => {
          const label = filterLabel(f, m)
          return (
            <li key={filterKey(f)}>
              {label}{' '}
              <button className={styles.release} onClick={() => removeFilter(f)}>
                {m.empty.release}
              </button>
            </li>
          )
        })}
      </ul>
      <button onClick={clearFilters}>{m.chips.clearAll}</button>
    </div>
  )
}
