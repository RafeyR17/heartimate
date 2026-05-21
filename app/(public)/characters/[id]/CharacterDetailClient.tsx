'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle } from 'lucide-react'
import { getRelationshipLevel } from '@/lib/affection'
import {
  CharacterSuggestedMobile,
  CharacterSuggestedSidebar,
} from './character-detail/CharacterSuggestedRail'
import { CharacterDetailActions } from './character-detail/CharacterDetailActions'
import { CharacterDetailHeader } from './character-detail/CharacterDetailHeader'
import {
  CharacterMetricBar,
  computeCharacterMetrics,
  parseDialogues,
} from './character-detail/character-metrics'
import { useCharacterLike } from './character-detail/useCharacterLike'
import { useCharacterToast } from './character-detail/useCharacterToast'
import {
  CHARACTER_DETAIL_DEFAULT_AVATAR,
  CHARACTER_DETAIL_ROSE,
  type CharacterDetailClientProps,
} from './character-detail/types'
import { characterReadableClass, characterReadableNarrowClass } from '@/lib/character-readable'
import { HorizontalCarousel, carouselSnapItemClass } from '@/components/ui/horizontal-carousel'

const PersonaSelectModal = dynamic(
  () => import('@/components/PersonaSelectModal'),
  { ssr: false }
)

export default function CharacterDetailClient({
  character,
  creator,
  currentUserId,
  isLiked: initialIsLiked,
  suggested,
  story,
  storyDays = 0,
}: CharacterDetailClientProps) {
  const [showPersonaModal, setShowPersonaModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'lore' | 'personality' | 'scenario'>('lore')
  const [expandedDesc, setExpandedDesc] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const { toast, showToast } = useCharacterToast()
  const { liked, likeCount, liking, animateLike, toggleLike } = useCharacterLike(
    character,
    initialIsLiked,
    currentUserId
  )

  const storyRel = story ? getRelationshipLevel(story.affectionScore) : null
  const { intensity, dominance, tenderness } = computeCharacterMetrics(character)
  const parsedDialogues = parseDialogues(character.example_dialogs)

  const rulesList = (character.personality || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))
    .map((line) => line.replace(/^[\s•\-*]+/, ''))

  function openPersonaModal() {
    if (!currentUserId) {
      const returnTo = `/characters/${character.id}`
      window.location.href = `/login?redirect_url=${encodeURIComponent(returnTo)}`
      return
    }
    setChatError(null)
    setShowPersonaModal(true)
  }

  return (
    <div className="bg-[#080608] text-white font-body -mx-0 w-full">
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-lg border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ background: CHARACTER_DETAIL_ROSE }}
        >
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-5 md:px-10 pb-28 lg:pb-14 -mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 lg:gap-14">
          <div>
            <CharacterDetailHeader
              character={character}
              likeCount={likeCount}
              chatError={chatError}
              onStartChat={openPersonaModal}
            />

            <CharacterDetailActions
              character={character}
              currentUserId={currentUserId}
              liked={liked}
              likeCount={likeCount}
              liking={liking}
              animateLike={animateLike}
              onToggleLike={toggleLike}
              onToast={showToast}
            />

            <div className="mt-8 lg:hidden">
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">
                Core Metrics
              </p>
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
                <CharacterMetricBar label="Intensity" value={intensity} color={CHARACTER_DETAIL_ROSE} />
                <CharacterMetricBar label="Dominance" value={dominance} color="#a78bfa" />
                <CharacterMetricBar label="Tenderness" value={tenderness} color="#f59e0b" />
              </div>
            </div>

            <div className="mt-10">
              <div className="border-b border-white/8 -mx-1">
              <HorizontalCarousel
                ariaLabel="Character details"
                fadeEdges={false}
                trackClassName="gap-1 pb-0 pe-2"
              >
                {(['lore', 'personality', 'scenario'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`${carouselSnapItemClass} relative inline-flex items-center px-5 min-h-[44px] text-sm font-medium capitalize whitespace-nowrap cursor-pointer transition-colors ${
                      activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <span
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                        style={{
                          background: CHARACTER_DETAIL_ROSE,
                          boxShadow: `0 0 12px ${CHARACTER_DETAIL_ROSE}`,
                        }}
                      />
                    )}
                  </button>
                ))}
              </HorizontalCarousel>
              </div>

              <div className={`pt-8 min-h-[200px] ${characterReadableClass}`}>
                {activeTab === 'lore' && (
                  <div>
                    <h2 className="font-heading text-2xl font-semibold mb-4 text-white">Lore & Essence</h2>
                    <div>
                      <p className={expandedDesc ? '' : 'line-clamp-4'}>
                        {character.description || 'No description provided.'}
                      </p>
                      {character.description && character.description.length > 220 && (
                        <button
                          type="button"
                          onClick={() => setExpandedDesc(!expandedDesc)}
                          className="text-rose text-sm font-medium mt-2 hover:underline cursor-pointer"
                        >
                          {expandedDesc ? 'Read less' : 'Read more'}
                        </button>
                      )}
                    </div>
                    <div className="mt-8 grid md:grid-cols-2 gap-8 pt-8 border-t border-white/8">
                      <div>
                        <p className="font-label text-[10px] uppercase tracking-wider text-white/40 mb-3">
                          Personality & Rules
                        </p>
                        {rulesList.length > 0 ? (
                          <ul className="space-y-2">
                            {rulesList.map((rule, idx) => (
                              <li key={idx} className={`flex gap-2 ${characterReadableNarrowClass}`}>
                                <span className="text-rose shrink-0">✦</span>
                                {rule}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={`italic ${characterReadableNarrowClass} text-white/50`}>
                            {character.personality || 'No specific rules provided.'}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="font-label text-[10px] uppercase tracking-wider text-white/40 mb-3">
                          Opening Scene
                        </p>
                        <p className={`italic ${characterReadableNarrowClass} text-white/60`}>
                          {character.scenario || 'A private moment waiting for you to arrive.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'personality' && (
                  <div>
                    <h2 className="font-heading text-2xl font-semibold mb-4 text-white">Core Persona</h2>
                    <p className="whitespace-pre-wrap">
                      {character.personality || 'No personality details provided.'}
                    </p>

                    {character.example_dialogs && (
                      <div className="mt-10 pt-8 border-t border-white/8">
                        <h3 className="font-heading text-lg mb-5">How They Speak</h3>
                        {parsedDialogues.length > 0 ? (
                          <div className="flex flex-col gap-3 max-w-prose w-full">
                            {parsedDialogues.map((item, idx) => (
                              <div
                                key={idx}
                                className={`max-w-[92%] px-4 py-3 rounded-2xl text-sm md:text-[15px] leading-[1.7] ${
                                  item.role === 'user'
                                    ? 'self-end bg-white/8 text-white/90 rounded-tr-sm'
                                    : 'self-start border border-rose/20 bg-rose/10 text-rose-100 rounded-tl-sm'
                                }`}
                              >
                                {item.content}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre className={`bg-white/5 border border-white/8 rounded-xl p-4 whitespace-pre-wrap ${characterReadableNarrowClass}`}>
                            {character.example_dialogs}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'scenario' && (
                  <div>
                    <h2 className="font-heading text-2xl font-semibold mb-4 text-white">Scenario</h2>
                    <p className="font-heading italic text-white/80 text-lg md:text-xl leading-[1.75] whitespace-pre-wrap">
                      {character.scenario ||
                        'A deep, uninterrupted room for two souls to explore mutual secrets.'}
                    </p>
                    <div className="mt-10 pt-8 border-t border-white/8">
                      <p className="font-label text-[10px] uppercase tracking-wider text-white/40 mb-4">
                        Their First Words
                      </p>
                      <blockquote
                        className="border-l-2 pl-5 max-w-prose w-full"
                        style={{ borderColor: CHARACTER_DETAIL_ROSE }}
                      >
                        <p className="font-heading italic text-white/85 text-base md:text-lg leading-[1.75]">
                          {character.greeting || 'Welcome, darling...'}
                        </p>
                      </blockquote>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="hidden lg:flex flex-col gap-6 lg:sticky lg:top-6 self-start">
            {story && storyRel && (
              <div className="rounded-xl border border-[#e8507a]/20 bg-[rgba(232,80,122,0.05)] p-5">
                <p className="font-label text-[10px] uppercase tracking-[0.2em] text-[#e8507a] mb-3">
                  Your Story
                </p>
                <span
                  className="inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.1em]"
                  style={{ color: storyRel.color, background: `${storyRel.color}20` }}
                >
                  ● {storyRel.label}
                </span>
                <div className="mt-3 space-y-1 text-[12px] text-white/70">
                  <p>{story.totalMessages} messages exchanged</p>
                  <p>{storyDays} days talking</p>
                  <p>Since {new Date(story.startedAt).toLocaleDateString()}</p>
                </div>
                <div className="mt-3 h-1 rounded bg-white/10 overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${storyRel.progress}%`, background: storyRel.color }}
                  />
                </div>
                <Link
                  href={`/chat/${story.chatId}`}
                  className="mt-4 inline-block text-[13px] text-[#e8507a] hover:underline"
                >
                  Continue your story →
                </Link>
              </div>
            )}

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/40 mb-5">
                Core Metrics
              </p>
              <CharacterMetricBar label="Intensity" value={intensity} color={CHARACTER_DETAIL_ROSE} />
              <CharacterMetricBar label="Dominance" value={dominance} color="#a78bfa" />
              <CharacterMetricBar label="Tenderness" value={tenderness} color="#f59e0b" />
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">
                Created By
              </p>
              {creator ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/10">
                    <Image
                      src={creator.avatar_url || CHARACTER_DETAIL_DEFAULT_AVATAR}
                      alt={creator.display_name}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{creator.display_name}</p>
                    <Link
                      href={`/profile/${creator.id}`}
                      className="text-[11px] text-rose hover:underline"
                    >
                      View profile →
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/60">Heartimate Creator</p>
              )}
            </div>

            <CharacterSuggestedSidebar suggested={suggested} />
          </aside>
        </div>

        <CharacterSuggestedMobile suggested={suggested} />
      </div>

      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 flex items-center gap-3 border-t border-white/[0.08] backdrop-blur-xl safe-bottom"
        style={{
          background: 'rgba(8,6,8,0.95)',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          minHeight: '70px',
        }}
      >
        <button
          type="button"
          onClick={toggleLike}
          disabled={liking || !currentUserId}
          aria-label={liked ? 'Unlike' : 'Like'}
          className="touch-target w-12 h-12 shrink-0 rounded-full border border-rose/40 flex flex-col items-center justify-center cursor-pointer disabled:opacity-50"
        >
          <Heart
            className={`w-5 h-5 transition-transform ${liked ? 'fill-rose text-rose' : 'text-white/50'} ${animateLike ? 'scale-125' : ''}`}
          />
        </button>

        <button
          type="button"
          onClick={openPersonaModal}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl min-h-[48px] font-heading italic text-base md:text-lg text-white cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${CHARACTER_DETAIL_ROSE}, #c93d66)`,
            boxShadow: '0 6px 24px rgba(232,80,122,0.35)',
          }}
        >
          <MessageCircle className="w-5 h-5 fill-white/90" />
          Start Chatting →
        </button>
      </div>

      <PersonaSelectModal
        open={showPersonaModal}
        onClose={() => setShowPersonaModal(false)}
        characterId={character.id}
        characterName={character.name}
      />
    </div>
  )
}
