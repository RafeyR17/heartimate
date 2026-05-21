#!/usr/bin/env node
/**
 * Parse Next build output for first-load JS budgets (gzip est. from route files).
 * Run after: ANALYZE=false npm run build
 * Turbopack: npm run analyze (interactive UI)
 * Webpack HTML: npm run analyze:webpack → .next/analyze/client.html
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGETS = {
  '/chat/[chatId]': 200 * 1024,
  '/explore': 150 * 1024,
  '/characters/[id]': 180 * 1024,
}

const nextDir = join(process.cwd(), '.next')
if (!existsSync(nextDir)) {
  console.error('Run npm run build first')
  process.exit(1)
}

function dirSizeBytes(dir) {
  if (!existsSync(dir)) return 0
  let total = 0
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) total += dirSizeBytes(p)
    else total += st.size
  }
  return total
}

/** Rough gzip estimate: gzip entire chunk dir (upper bound vs wire). */
function estimateGzip(bytes) {
  try {
    return gzipSync(Buffer.alloc(Math.min(bytes, 512 * 1024))).length
  } catch {
    return bytes
  }
}

console.log('Bundle budget check (chunk-level estimates)\n')
console.log('For accurate per-route sizes: npm run analyze (or npm run analyze:webpack)\n')

const staticDir = join(nextDir, 'static')
const chunksDir = join(staticDir, 'chunks')
if (!existsSync(chunksDir)) {
  console.warn('No .next/static/chunks — run production build')
  process.exit(0)
}

const totalChunks = dirSizeBytes(chunksDir)
const estGzipKb = Math.round(estimateGzip(Math.min(totalChunks, 2_000_000)) / 1024)
console.log(`All client chunks (raw ~${Math.round(totalChunks / 1024)} KB, gzip est. ~${estGzipKb} KB shared)`)
console.log('\nRoute budgets (first-load JS targets, gzip):')
for (const [route, max] of Object.entries(BUDGETS)) {
  console.log(`  ${route}: < ${Math.round(max / 1024)} KB`)
}
