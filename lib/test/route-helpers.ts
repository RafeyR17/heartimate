export async function readJsonResponse(res: Response) {
  const json = (await res.json()) as Record<string, unknown>
  return { status: res.status, json }
}

export function jsonRequest(
  url: string,
  body: unknown,
  init: RequestInit = {}
): Request {
  return new Request(url, {
    method: init.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
    body: JSON.stringify(body),
    ...init,
  })
}
