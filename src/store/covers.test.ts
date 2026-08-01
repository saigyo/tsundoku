import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCoversStore } from './covers'

describe('useCoversStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useCoversStore.setState({ enabled: false })
  })

  it('liest den gespeicherten Zustand beim Start', async () => {
    localStorage.setItem('tsundoku.covers', '1')
    vi.resetModules()
    const { useCoversStore: fresh } = await import('./covers')
    expect(fresh.getState().enabled).toBe(true)
  })

  it('persistiert das Einschalten als "1"', () => {
    useCoversStore.getState().setEnabled(true)
    expect(useCoversStore.getState().enabled).toBe(true)
    expect(localStorage.getItem('tsundoku.covers')).toBe('1')
  })

  it('entfernt den Eintrag beim Ausschalten', () => {
    useCoversStore.getState().setEnabled(true)
    useCoversStore.getState().setEnabled(false)
    expect(useCoversStore.getState().enabled).toBe(false)
    expect(localStorage.getItem('tsundoku.covers')).toBeNull()
  })

  it('überlebt werfendes localStorage (Private Mode, Quota)', () => {
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota')
    }
    try {
      useCoversStore.getState().setEnabled(true)
      expect(useCoversStore.getState().enabled).toBe(true)
    } finally {
      Storage.prototype.setItem = orig
    }
  })
})
