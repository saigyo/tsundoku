#!/usr/bin/env node
/**
 * Tsundoku – CLI-Huelle um den Normalizer.
 *
 *   node scripts/normalize.mjs <export.json> [out=public/data/library.json]
 *
 * Die eigentliche Transformation lebt in scripts/normalize-core.mjs — frei
 * von Node-APIs, damit sie auch im Browser laeuft (Upload-Pfad der App).
 * Diese Datei macht ausschliesslich I/O: lesen, schreiben, drucken.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { normalize } from './normalize-core.mjs'

export * from './normalize-core.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

/** I/O-Huelle: Argumente lesen, Datei einlesen, normalize() aufrufen, schreiben, drucken. */
function main() {
  const inPath = process.argv[2]
  const outPath = process.argv[3] ?? resolve(HERE, '../public/data/library.json')

  if (!inPath) {
    console.error('Usage: node scripts/normalize.mjs <export.json> [out.json]')
    process.exit(1)
  }

  const raw = JSON.parse(readFileSync(inPath, 'utf8'))
  const { stats, books } = normalize(raw, inPath)

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify({ stats, books }))

  console.log(`${books.length} Einträge -> ${outPath}`)
  console.log(
    `  Medien: ${JSON.stringify(stats.byMediaType)} | gelesen: ${stats.read} | Massenimport-Flag: ${stats.bulkImported}`,
  )
  console.log(
    `  Erwerbssignal: ${stats.withAcquiredDate} direkt + ` +
      `${stats.withAcquiredEffective - stats.withAcquiredDate} per Katalogisierungsdatum = ${stats.withAcquiredEffective} (Regel 13)`,
  )
  console.log(
    `  Maße permutiert: ${stats.dimsSorted} korrigiert (Tripel sortiert, Dicke = kleinster Wert), ` +
      `${stats.dimsDiscarded} verworfen (kleinster Wert keine plausible Dicke)`,
  )
  console.log(
    `  Maße geschätzt aus Seitenzahl: ${stats.dimsEstimated} Bücher (physicalEstimated-Flag, im Regal markiert)`,
  )
  console.log(
    `  Originalsprache aus Ausgabesprache übernommen: ${stats.origLangInferred} Bücher (Erfassungskonvention)`,
  )
  console.log(`  HTML-Entities dekodiert: ${stats.entitiesDecoded} Felder (Titel, Autorennamen)`)
  console.log(
    `  Seiten gesamt: ${stats.pagesTotal.toLocaleString('de-DE')} | Lesedauer Median/p90/max: ` +
      `${stats.readDays.median}/${stats.readDays.p90}/${stats.readDays.max} Tage`,
  )
  console.log(`  Tags: ${stats.tagsNorm.length} normalisiert (roh: ${new Set(books.flatMap((b) => b.tags)).size})`)
  const readYears = stats.readPerYearEffective.map(([y]) => y)
  console.log(
    `  Lesejahr bekannt: ${stats.withReadYearEffective} (davon ${stats.withReadDate} per dateread, Rest aus Jahres-Tags)` +
      (readYears.length ? `, ab ${Math.min(...readYears)}` : ''),
  )
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isCli) main()
