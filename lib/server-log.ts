import 'server-only'

type LogLevel = 'error' | 'warn' | 'info'

function emit(level: LogLevel, scope: string, message: string, detail?: unknown): void {
  const payload: Record<string, unknown> = { level, scope, message }
  if (detail !== undefined) payload.detail = detail
  const line = JSON.stringify(payload)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

/** Structured server-side logging (JSON lines). Use in lib/ and API routes. */
export const serverLog = {
  error: (scope: string, message: string, detail?: unknown) =>
    emit('error', scope, message, detail),
  warn: (scope: string, message: string, detail?: unknown) =>
    emit('warn', scope, message, detail),
  info: (scope: string, message: string, detail?: unknown) =>
    emit('info', scope, message, detail),
}
