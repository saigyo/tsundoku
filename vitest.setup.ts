/** Node ≥26 legt ein experimentelles globales localStorage an, das ohne
 *  --localstorage-file undefined bleibt — und beim Global-Setup von Vitest
 *  jsdoms funktionierendes localStorage verdeckt. window === globalThis in
 *  dieser Umgebung, es gibt also auch über window keine echte Instanz.
 *  Ersatz: eine Map-basierte Storage-Klasse mit Methoden auf dem Prototyp,
 *  eingesetzt als globales Storage + localStorage. Prototyp-Overrides in
 *  Tests (Storage.prototype.setItem = …) greifen damit wie im Browser. */
if (typeof localStorage === 'undefined') {
  class MemoryStorage {
    private data = new Map<string, string>()
    getItem(key: string): string | null {
      return this.data.get(String(key)) ?? null
    }
    setItem(key: string, value: string): void {
      this.data.set(String(key), String(value))
    }
    removeItem(key: string): void {
      this.data.delete(String(key))
    }
    clear(): void {
      this.data.clear()
    }
    key(index: number): string | null {
      return [...this.data.keys()][index] ?? null
    }
    get length(): number {
      return this.data.size
    }
  }
  Object.defineProperty(globalThis, 'Storage', { value: MemoryStorage, configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
}
