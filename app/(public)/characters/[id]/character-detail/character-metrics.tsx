import type { CharacterDetailCharacter } from './types'

export function parseDialogues(text: string | null) {
  if (!text) return []
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const result: Array<{ role: 'user' | 'assistant'; content: string }> = []

  for (const line of lines) {
    const cleanLine = line.replace(/^[\s•\-*]+/, '')
    if (/^(user|{{user}}|you|player):/i.test(cleanLine)) {
      result.push({
        role: 'user',
        content: cleanLine.replace(/^(user|{{user}}|you|player):\s*/i, ''),
      })
    } else if (/^(char|character|{{char}}|assistant|bot|npc):/i.test(cleanLine)) {
      result.push({
        role: 'assistant',
        content: cleanLine.replace(/^(char|character|{{char}}|assistant|bot|npc):\s*/i, ''),
      })
    } else {
      const colonIdx = cleanLine.indexOf(':')
      if (colonIdx > 0 && colonIdx < 20) {
        const speaker = cleanLine.substring(0, colonIdx).toLowerCase()
        const content = cleanLine.substring(colonIdx + 1).trim()
        if (speaker.includes('user') || speaker.includes('you')) {
          result.push({ role: 'user', content })
        } else {
          result.push({ role: 'assistant', content })
        }
      } else {
        result.push({ role: 'assistant', content: cleanLine })
      }
    }
  }
  return result
}

export function computeCharacterMetrics(character: CharacterDetailCharacter) {
  const tagsLower = (character.tags || []).map((t) => t.toLowerCase())
  const personalityLower = (character.personality || '').toLowerCase()

  const intensityTags = [
    'dark', 'dominant', 'yandere', 'bdsm', 'submissive', 'dom', 'control',
    'mafia', 'monster', 'demon', 'master', 'mistress', 'corrupt', 'obsession',
  ]
  const intensityCount = tagsLower.filter((t) =>
    intensityTags.some((it) => t.includes(it))
  ).length
  let intensity = 2
  if (intensityCount === 1) intensity = 3
  else if (intensityCount === 2) intensity = 4
  else if (intensityCount >= 3) intensity = 5

  let dominance = 3
  const isDom =
    tagsLower.some((t) =>
      ['dominant', 'soft dom', 'yandere', 'dom', 'master', 'mistress', 'alpha', 'boss'].some(
        (k) => t.includes(k)
      )
    ) ||
    ['dominant', 'yandere', 'dom', 'alpha', 'obsession'].some((k) =>
      personalityLower.includes(k)
    )
  const isSub =
    tagsLower.some((t) =>
      ['submissive', 'sweet', 'sub', 'maid', 'slave', 'shy', 'meek'].some((k) =>
        t.includes(k)
      )
    ) ||
    ['submissive', 'sweet', 'sub', 'maid', 'shy'].some((k) => personalityLower.includes(k))
  if (isDom) dominance = 5
  else if (isSub) dominance = 1

  let tenderness = 3
  const isTender =
    tagsLower.some((t) =>
      ['romance', 'hurt-comfort', 'sweet', 'vanilla', 'fluffy', 'gentle', 'care', 'soft', 'love'].some(
        (k) => t.includes(k)
      )
    ) ||
    ['romance', 'sweet', 'gentle', 'love', 'vanilla', 'soft'].some((k) =>
      personalityLower.includes(k)
    )
  const isHarsh =
    tagsLower.some((t) =>
      ['dark', 'horror', 'villain', 'cold', 'cruel', 'yandere', 'monster', 'rough', 'evil'].some(
        (k) => t.includes(k)
      )
    ) ||
    ['dark', 'horror', 'villain', 'cold', 'cruel', 'yandere', 'rough'].some((k) =>
      personalityLower.includes(k)
    )
  if (isTender) tenderness = 5
  else if (isHarsh) tenderness = 1

  return { intensity, dominance, tenderness }
}

export function CharacterMetricBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="mb-1">
      <div className="flex justify-between mb-1.5">
        <span className="text-[11px] text-white/50 font-label tracking-wide uppercase">
          {label}
        </span>
        <span className="text-[11px] font-bold" style={{ color }}>
          {value}/5
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{
              background: i <= value ? color : 'rgba(255,255,255,0.08)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
