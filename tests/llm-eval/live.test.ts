import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompt'
import { resolveChatModel } from '@/lib/llm'
import { PROMPT_VERSION } from '@/lib/prompt-version'
import { loadLlmEvalEnv } from './load-env'
import { LLM_EVAL_SCENARIOS } from './scenarios'
import { assertGoldenText, type GoldenSpec } from './golden-assert'

loadLlmEvalEnv()

const LIVE = Boolean(process.env.OPENROUTER_API_KEY?.trim())

if (!LIVE) {
  console.warn(
    '\n[test:llm-eval:live] Skipped — set OPENROUTER_API_KEY in the shell or in .env.local at the repo root.\n'
  )
}
const goldenDir = join(__dirname, 'golden')

function loadAssistantGolden(scenarioId: string): GoldenSpec | null {
  const file = readdirSync(goldenDir).find(
    (f) => f === `${scenarioId}.assistant.json`
  )
  if (!file) return null
  return JSON.parse(readFileSync(join(goldenDir, file), 'utf8')) as GoldenSpec
}

describe.skipIf(!LIVE)('LLM eval live (OpenRouter)', () => {
  it('uses current prompt version', () => {
    expect(PROMPT_VERSION).toBeTruthy()
  })

  for (const scenario of LLM_EVAL_SCENARIOS) {
    if (
      scenario.tags.includes('moderation') ||
      scenario.tags.includes('memory') ||
      scenario.tags.includes('regenerate')
    ) {
      continue
    }

    it(
      scenario.id,
      async () => {
        const systemPrompt = buildSystemPrompt({
          name: scenario.character.name,
          personality: scenario.character.personality,
          scenario: scenario.character.scenario,
          greeting: 'Hi',
          example_dialogs: '',
          tags: [],
          is_nsfw: scenario.character.is_nsfw,
        })

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer':
              process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Heartimate LLM Eval',
          },
          body: JSON.stringify({
            model: resolveChatModel(scenario.character.is_nsfw),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: scenario.userMessage },
            ],
            stream: false,
            max_tokens: 400,
            temperature: scenario.character.is_nsfw ? 0.92 : 0.85,
          }),
          signal: AbortSignal.timeout(90_000),
        })

        const raw = await response.text()
        expect(response.ok, raw.slice(0, 500)).toBe(true)

        const data = JSON.parse(raw) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const content = data.choices?.[0]?.message?.content ?? ''
        expect(content.trim().length).toBeGreaterThan(20)

        const golden = loadAssistantGolden(scenario.id)
        if (golden) {
          const failures = assertGoldenText(golden, content)
          expect(failures, failures.join('; ')).toEqual([])
        }
      },
      120_000
    )
  }
})
