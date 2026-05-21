export type GoldenTarget = 'prompt' | 'refusal' | 'assistant'

export type GoldenSpec = {
  scenarioId: string
  target: GoldenTarget
  mustContain?: string[]
  mustNotContain?: string[]
  mustMatchRegex?: string[]
}

export function assertGoldenText(spec: GoldenSpec, text: string): string[] {
  const failures: string[] = []
  const lower = text.toLowerCase()

  for (const phrase of spec.mustContain ?? []) {
    if (!lower.includes(phrase.toLowerCase())) {
      failures.push(`missing required phrase: ${phrase}`)
    }
  }
  for (const phrase of spec.mustNotContain ?? []) {
    if (lower.includes(phrase.toLowerCase())) {
      failures.push(`forbidden phrase present: ${phrase}`)
    }
  }
  for (const pattern of spec.mustMatchRegex ?? []) {
    if (!new RegExp(pattern, 'i').test(text)) {
      failures.push(`regex did not match: ${pattern}`)
    }
  }
  return failures
}
