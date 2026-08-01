/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
})
