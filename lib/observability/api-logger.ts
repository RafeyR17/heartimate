export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type ApiLogFields = Record<string, unknown>

export type ApiLogger = {
  requestId: string
  route: string
  info: (event: string, fields?: ApiLogFields) => void
  warn: (event: string, fields?: ApiLogFields) => void
  error: (event: string, fields?: ApiLogFields) => void
  span: <T>(name: string, fn: () => Promise<T>, fields?: ApiLogFields) => Promise<T>
  child: (fields: ApiLogFields) => ApiLogger
}

type LogRecord = {
  ts: string
  level: LogLevel
  service: 'heartimate-api'
  requestId: string
  route: string
  event: string
  span?: string
  durationMs?: number
  [key: string]: unknown
}

function writeLog(record: LogRecord): void {
  const line = JSON.stringify(record)
  if (record.level === 'error') {
    console.error(line)
    return
  }
  if (record.level === 'warn') {
    console.warn(line)
    return
  }
  console.log(line)
}

function emit(
  level: LogLevel,
  base: { requestId: string; route: string; span?: string },
  event: string,
  fields?: ApiLogFields
): void {
  writeLog({
    ts: new Date().toISOString(),
    level,
    service: 'heartimate-api',
    requestId: base.requestId,
    route: base.route,
    event,
    ...(base.span ? { span: base.span } : {}),
    ...fields,
  })
}

export function createApiLogger(opts: {
  requestId: string
  route: string
  span?: string
  baseFields?: ApiLogFields
}): ApiLogger {
  const base = {
    requestId: opts.requestId,
    route: opts.route,
    span: opts.span,
  }
  const merged = opts.baseFields ?? {}

  const withFields = (fields?: ApiLogFields): ApiLogFields => ({
    ...merged,
    ...fields,
  })

  return {
    requestId: opts.requestId,
    route: opts.route,
    info: (event, fields) => emit('info', base, event, withFields(fields)),
    warn: (event, fields) => emit('warn', base, event, withFields(fields)),
    error: (event, fields) => emit('error', base, event, withFields(fields)),
    child: (fields) =>
      createApiLogger({
        requestId: opts.requestId,
        route: opts.route,
        span: opts.span,
        baseFields: withFields(fields),
      }),
    span: async (name, fn, fields) => {
      const spanName = opts.span ? `${opts.span}.${name}` : name
      const start = Date.now()
      emit('info', { ...base, span: spanName }, 'span.start', withFields(fields))
      try {
        const result = await fn()
        emit('info', { ...base, span: spanName }, 'span.end', {
          ...withFields(fields),
          durationMs: Date.now() - start,
          ok: true,
        })
        return result
      } catch (err) {
        emit('error', { ...base, span: spanName }, 'span.error', {
          ...withFields(fields),
          durationMs: Date.now() - start,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },
  }
}

export function logApiResponse(opts: {
  requestId: string
  route: string
  status: number
  durationMs: number
  userId?: string
}): void {
  const fields = {
    status: opts.status,
    durationMs: opts.durationMs,
    ...(opts.userId ? { userId: opts.userId } : {}),
  }
  emit(
    'info',
    { requestId: opts.requestId, route: opts.route },
    'request.complete',
    fields
  )
  emit(
    'info',
    { requestId: opts.requestId, route: opts.route },
    'metric.api.latency_ms',
    {
      metric: 'api.latency_ms',
      value: opts.durationMs,
      route: opts.route,
      status: opts.status,
    }
  )
}
