import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { API_ROUTES } from '@/lib/api-routes'

const specPath = join(process.cwd(), 'openapi/heartimate.openapi.json')

function openapiPathToRouteId(openapiPath: string, method: string): string {
  const normalized = openapiPath.replace(/\{([^}]+)\}/g, ':$1')
  return `${method.toUpperCase()} ${normalized}`
}

describe('API contract', () => {
  const spec = JSON.parse(readFileSync(specPath, 'utf8')) as {
    paths: Record<string, Record<string, unknown>>
  }

  it('documents every canonical route', () => {
    const documented = new Set<string>()
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const method of Object.keys(methods)) {
        if (method === 'parameters') continue
        documented.add(openapiPathToRouteId(path, method))
      }
    }

    const missing = API_ROUTES.filter((route) => !documented.has(route))
    expect(missing, `OpenAPI missing: ${missing.join(', ')}`).toEqual([])
  })

  it('includes health and chat stream paths', () => {
    expect(spec.paths['/api/health']?.get).toBeDefined()
    expect(spec.paths['/api/chat']?.post).toBeDefined()
  })
})
