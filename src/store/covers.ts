import { create } from 'zustand'

const STORAGE_KEY = 'tsundoku.covers'

/** Opt-in für OpenLibrary-Cover: gilt global und dauerhaft (nicht pro Buch
 *  oder Bibliothek), widerrufbar über den Fußzeilen-Schalter. Beim Laden
 *  gehen ISBN und Request-Metadaten an covers.openlibrary.org — deshalb
 *  Opt-in statt Default. */
function readStored(): boolean {
  // localStorage kann werfen (Safari Private Mode, abgeschaltete Cookies)
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

interface CoversState {
  enabled: boolean
  setEnabled: (v: boolean) => void
}

export const useCoversStore = create<CoversState>()((set) => ({
  enabled: readStored(),
  setEnabled: (v) => {
    try {
      if (v) localStorage.setItem(STORAGE_KEY, '1')
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Persistenz ist Komfort, keine Voraussetzung
    }
    set({ enabled: v })
  },
}))
