#!/usr/bin/env node
/**
 * WCAG 2.5.5 touch target audit (44×44px minimum).
 * Run: npm run check:touch-targets
 *
 * Heuristics on .tsx/.jsx — not a full DOM audit. Fix flagged lines or add
 * touch-target / iconTouchClass from lib/touch-targets.ts.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const MIN = 44
const SCAN_DIRS = ['app', 'components', 'lib']
const SKIP = new Set(['node_modules', '.next', 'dist'])

/** @type {Array<{ file: string, line: number, rule: string, snippet: string }>} */
const findings = []

const MIN_H_LT_44 = /min-h-\[(3[0-9]|40|42)px\]/g
const SMALL_BOX_ON_CONTROL =
  /<(?:button|a|Link)\b[^>]*\bclassName=(?:"[^"]*"|{`[^`]*`}|{cn\([^)]*\)})[^>]*>/g
const W8_H8 = /\b(w-8\s+h-8|h-8\s+w-8|w-9\s+h-9|h-9\s+w-9|w-10\s+h-10|h-10\s+w-10)\b/
const HAS_TOUCH = /\b(touch-target|iconTouchClass|min-h-\[(4[4-9]|[5-9]\d)px\]|min-h-\[44px\])/

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(tsx|jsx)$/.test(name)) out.push(p)
  }
  return out
}

function lineNum(text, index) {
  return text.slice(0, index).split('\n').length
}

function scanFile(path) {
  const rel = relative(ROOT, path)
  const text = readFileSync(path, 'utf8')
  const lines = text.split('\n')

  lines.forEach((line, i) => {
    const n = i + 1
    const isParagraph = /<p\b/i.test(line)
    const isTextField =
      (/<(?:textarea|input)\b/i.test(line) && !/<button\b/i.test(line)) ||
      /chat-composer-input|resize-none|placeholder:/i.test(line)
    const hasGlobalPrimary = /\bbtn-primary\b/.test(line) // min-h-[44px] in app/globals.css

    if (MIN_H_LT_44.test(line)) {
      MIN_H_LT_44.lastIndex = 0
      if (isParagraph || isTextField) return
      if (/<button\b/i.test(line) && (HAS_TOUCH.test(line) || hasGlobalPrimary)) return
      findings.push({
        file: rel,
        line: n,
        rule: `min-height < ${MIN}px`,
        snippet: line.trim().slice(0, 120),
      })
    }

    if (/<button\b/i.test(line) && MIN_H_LT_44.test(line)) {
      MIN_H_LT_44.lastIndex = 0
      if (!HAS_TOUCH.test(line) && !hasGlobalPrimary) {
        findings.push({
          file: rel,
          line: n,
          rule: 'button may be under 44px (no touch-target / min-h-[44px])',
          snippet: line.trim().slice(0, 120),
        })
      }
    }

    if (/<button\b/i.test(line) && W8_H8.test(line) && !HAS_TOUCH.test(line)) {
      findings.push({
        file: rel,
        line: n,
        rule: 'icon button uses small box without touch-target',
        snippet: line.trim().slice(0, 120),
      })
    }
  })

  let m
  SMALL_BOX_ON_CONTROL.lastIndex = 0
  const src = text
  while ((m = SMALL_BOX_ON_CONTROL.exec(src)) !== null) {
    const tag = m[0]
    if (!W8_H8.test(tag) || HAS_TOUCH.test(tag)) continue
    if (/sr-only|hidden|aria-hidden/.test(tag)) continue
    findings.push({
      file: rel,
      line: lineNum(src, m.index),
      rule: 'interactive control may be under 44px',
      snippet: tag.slice(0, 100),
    })
  }
}

for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir)
  try {
    for (const f of walk(abs)) scanFile(f)
  } catch {
    /* dir missing */
  }
}

const deduped = [...new Map(findings.map((f) => [`${f.file}:${f.line}:${f.rule}`, f])).values()].sort(
  (a, b) => a.file.localeCompare(b.file) || a.line - b.line
)

console.log(`Touch target audit (minimum ${MIN}×${MIN}px)\n`)

if (!deduped.length) {
  console.log('No heuristic violations found.')
  console.log('\nManual checklist:')
  console.log('  - [ ] Icon-only controls use iconTouchClass or touch-target')
  console.log('  - [ ] Primary CTAs use min-h-[44px]')
  console.log('  - [ ] Chat overlays use var(--chat-overlay-bottom) above keyboard')
  process.exit(0)
}

for (const f of deduped) {
  console.log(`${f.file}:${f.line}  ${f.rule}`)
  console.log(`  ${f.snippet}\n`)
}

console.log(`${deduped.length} finding(s). Add touch-target / iconTouchClass / min-h-[44px].`)
console.log('See lib/touch-targets.ts and docs/TOUCH_TARGETS.md')
process.exit(1)
