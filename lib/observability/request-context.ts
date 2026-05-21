import { AsyncLocalStorage } from 'node:async_hooks'
import type { ApiLogger } from '@/lib/observability/api-logger'

export type ApiRequestContext = {
  requestId: string
  route: string
  log: ApiLogger
  userId?: string
}

const apiContextStorage = new AsyncLocalStorage<ApiRequestContext>()

export function getApiContext(): ApiRequestContext | undefined {
  return apiContextStorage.getStore()
}

export function getApiRequestId(): string | undefined {
  return apiContextStorage.getStore()?.requestId
}

export function runWithApiContext<T>(store: ApiRequestContext, fn: () => T): T {
  return apiContextStorage.run(store, fn)
}
