#!/usr/bin/env node
/**
 * Mobile Lighthouse (LCP, CLS) on production build.
 * Requires: npm run build first (or run via CI job).
 *
 *   npm run build && npm run check:lighthouse
 *
 * Optional: LIGHTHOUSE_URLS=http://127.0.0.1:3000/,http://127.0.0.1:3000/explore
 * Chat (/chat/...) needs auth — add a signed-in URL manually for local runs only.
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
if (!existsSync(join(root, '.next'))) {
  console.error('Missing .next — run `npm run build` before check:lighthouse')
  process.exit(1)
}

const result = spawnSync('npx', ['lhci', 'autorun'], {
  stdio: 'inherit',
  env: { ...process.env, CI: 'true' },
  cwd: root,
})

process.exit(result.status ?? 1)
