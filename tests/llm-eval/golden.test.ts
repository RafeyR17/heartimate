import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { moderateUserMessage } from '@/lib/chat-moderation'
import { resetModerationCircuitForTests } from '@/lib/chat-moderation-circuit'
import { buildSystemPrompt } from '@/lib/prompt'
import { PROMPT_VERSION } from '@/lib/prompt-version'
import { LLM_EVAL_SCENARIOS } from './scenarios'
import { assertGoldenText, type GoldenSpec } from './golden-assert'

const goldenDir = join(__dirname, 'golden')
const goldenFiles = readdirSync(goldenDir).filter((f) => f.endsWith('.json'))

function loadGolden(file: string): GoldenSpec {
  return JSON.parse(readFileSync(join(goldenDir, file), 'utf8')) as GoldenSpec
}

const baseCharacter = {
  greeting: 'Hi',
  example_dialogs: '',
  tags: [] as string[],
}

describe('LLM eval golden files', () => {
  it('tracks prompt version', () => {
    expect(PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}-v\d+$/)
  })

  it('loads golden specs for core scenarios', () => {
    expect(goldenFiles.length).toBeGreaterThanOrEqual(6)
  })

  for (const file of goldenFiles) {
    const spec = loadGolden(file)
    if (spec.target !== 'prompt' && spec.target !== 'refusal') continue

    it(`${file} (${spec.target})`, async () => {
      const scenario = LLM_EVAL_SCENARIOS.find((s) => s.id === spec.scenarioId)
      expect(scenario, `unknown scenario ${spec.scenarioId}`).toBeDefined()
      if (!scenario) return

      let text: string
      if (spec.target === 'prompt') {
        const memory =
          spec.scenarioId === 'long-chat-memory'
            ? 'Turn 5: User said the red scarf from grandmother is their lucky charm.'
            : undefined
        text = buildSystemPrompt(
          { ...baseCharacter, ...scenario.character },
          memory,
          undefined,
          undefined,
          null
        )
      } else {
        const prev = process.env.CHAT_MODERATION_DISABLED
        process.env.CHAT_MODERATION_DISABLED = 'true'
        resetModerationCircuitForTests()
        const mod = await moderateUserMessage({
          message: scenario.userMessage,
          characterName: scenario.character.name,
          isNsfw: scenario.character.is_nsfw,
        })
        process.env.CHAT_MODERATION_DISABLED = prev
        expect(mod.allowed).toBe(false)
        if (!mod.allowed) {
          text = mod.refusalText
        } else {
          text = ''
        }
      }

      const failures = assertGoldenText(spec, text)
      expect(failures, failures.join('; ')).toEqual([])
    })
  }
})
