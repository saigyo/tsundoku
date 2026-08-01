import { vi } from 'vitest'

// localStorage mock for jsdom environments that don't have it enabled
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {}

  const localStorageMock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => {
        delete store[key]
      })
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] ?? null
    },
    get length() {
      return Object.keys(store).length
    },
  }

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })
}
