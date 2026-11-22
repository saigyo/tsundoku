/// <reference types="vitest/config" />
import { existsSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  define: {
    // Ob die App beim Start public/data/library.json anfragt. Im Build nur,
    // wenn die Datei mit ausgeliefert wird — sonst stünde auf der GitHub-Page
    // bei jedem Aufruf ein 404 in der Konsole, den JavaScript nicht
    // unterdrücken kann. Dev-Server und Tests fragen immer an, weil die Datei
    // während des Betriebs per `npm run normalize` entstehen kann.
    __SERVER_LIBRARY__: JSON.stringify(command === 'serve' || existsSync('public/data/library.json')),
  },
  server: {
    watch: {
      // fsevents liefert auf diesem System Änderungen unzuverlässig (Dateien
      // wurden nach Edits weiter alt ausgeliefert, bis der Server neu
      // startete). Polling ist die robuste Alternative; Kosten: etwas CPU
      // im Dev-Betrieb.
      usePolling: true,
      interval: 300,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: true,
  },
}))
