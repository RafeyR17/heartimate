#!/usr/bin/env node
/**
 * Run vitest for tests related to staged files (pre-commit via lint-staged).
 * Skips when no matching tests; never runs live LLM eval.
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const staged = process.argv.slice(2).filter(Boolean)
if (staged.length === 0) process.exit(0)

/** @param {string} file */
function relatedTestsFor(file) {
  const tests = new Set()

  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(file)) {
    if (!file.includes('tests/llm-eval/live.test')) tests.add(file)
    return tests
  }

  if (file === 'vitest.config.ts' || file === 'vitest.setup.ts') {
    return tests
  }

  const routeMatch = file.match(/^app\/api\/(.+)\/route\.ts$/)
  if (routeMatch) {
    const base = `app/api/${routeMatch[1]}/route`
    for (const suffix of ['.test.ts', '.contract.test.ts']) {
      const t = `${base}${suffix}`
      if (existsSync(t)) tests.add(t)
    }
    return tests
  }

  const libMatch = file.match(/^lib\/(.+)\.ts$/)
  if (libMatch && !libMatch[1].endsWith('.test')) {
    const t = `lib/${libMatch[1]}.test.ts`
    if (existsSync(t)) tests.add(t)
    return tests
  }

  if (file.startsWith('tests/security/')) {
    tests.add(file.replace(/\.ts$/, '.test.ts'))
    if (existsSync(file)) tests.add(file)
  }

  if (file.startsWith('tests/llm-eval/') && !file.includes('live.test')) {
    tests.add('tests/llm-eval/scenarios.test.ts')
    tests.add('tests/llm-eval/golden.test.ts')
  }

  if (file === 'lib/api-contract.ts') {
    tests.add('lib/api-contract.test.ts')
  }

  return tests
}

const allTests = new Set()
for (const file of staged) {
  for (const t of relatedTestsFor(file)) allTests.add(t)
}

if (allTests.size === 0) process.exit(0)

const args = ['vitest', 'run', ...allTests]
const result = spawnSync('npx', args, { stdio: 'inherit', shell: false })
process.exit(result.status ?? 1)
