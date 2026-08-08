import { FLAG_IDS } from '../lib/flags'
import { DEFAULT_VIEW, VIEW_IDS, type Filter, type MediaType, type ViewId } from '../lib/types'
import { useFilterStore } from './filters'

const PARAMS: [param: string, kind: Filter['kind']][] = [
  ['tag', 'tag'],
  ['lang', 'language'],
  ['olang', 'originalLanguage'],
  ['ddc', 'ddcTop'],
  ['media', 'mediaType'],
  ['coll', 'collection'],
  ['author', 'author'],
  ['award', 'award'],
  ['genre', 'genre'],
  ['flag', 'flag'],
  ['acq', 'acquiredYear'],
  ['read', 'readYear'],
  ['ed', 'editionYear'],
  ['status', 'readStatus'],
]

const RANGE = new Set<Filter['kind']>(['acquiredYear', 'readYear', 'editionYear'])
const MEDIA: MediaType[] = ['book', 'ebook', 'film', 'vinyl']

export function stateToQuery(view: ViewId, filters: Filter[]): string {
  const q = new URLSearchParams()
  if (view !== DEFAULT_VIEW) q.append('view', view)
  for (const [param, kind] of PARAMS) {
    for (const f of filters) {
      if (f.kind !== kind) continue
      q.append(param, 'from' in f ? `${f.from}-${f.to}` : String(f.value))
    }
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

function parseOne(kind: Filter['kind'], raw: string): Filter | null {
  if (RANGE.has(kind)) {
    const m = /^(\d{4})-(\d{4})$/.exec(raw)
    if (!m) return null
    const from = Number(m[1])
    const to = Number(m[2])
    if (from > to) return null
    return { kind, from, to } as Filter
  }
  switch (kind) {
    case 'ddcTop': {
      const n = Number(raw)
      return Number.isInteger(n) && n >= 0 && n <= 9 ? { kind, value: n } : null
    }
    case 'mediaType':
      return (MEDIA as string[]).includes(raw) ? { kind, value: raw as MediaType } : null
    case 'readStatus':
      return raw === 'read' || raw === 'unread' ? { kind, value: raw } : null
    case 'flag':
      return (FLAG_IDS as readonly string[]).includes(raw) ? { kind, value: raw } : null
    default:
      return raw ? ({ kind, value: raw } as Filter) : null
  }
}

export function queryToState(search: string): { view: ViewId; filters: Filter[] } {
  const q = new URLSearchParams(search)
  const rawView = q.get('view') ?? ''
  const view: ViewId = (VIEW_IDS as readonly string[]).includes(rawView)
    ? (rawView as ViewId)
    : DEFAULT_VIEW
  const filters: Filter[] = []
  for (const [param, kind] of PARAMS) {
    for (const raw of q.getAll(param)) {
      const f = parseOne(kind, raw)
      if (f) filters.push(f)
    }
  }
  return { view, filters }
}

let applyingFromUrl = false

export function startUrlSync(): () => void {
  const initial = queryToState(location.search)
  applyingFromUrl = true
  useFilterStore.setState({ view: initial.view, filters: initial.filters })
  applyingFromUrl = false

  const unsub = useFilterStore.subscribe((s, prev) => {
    if (applyingFromUrl) return
    if (s.view === prev.view && s.filters === prev.filters) return
    const target = `${location.pathname}${stateToQuery(s.view, s.filters)}`
    if (target !== `${location.pathname}${location.search}`) {
      history.pushState(null, '', target)
    }
  })

  const onPop = () => {
    const st = queryToState(location.search)
    applyingFromUrl = true
    useFilterStore.setState({ view: st.view, filters: st.filters })
    applyingFromUrl = false
  }
  window.addEventListener('popstate', onPop)
  return () => {
    unsub()
    window.removeEventListener('popstate', onPop)
  }
}
