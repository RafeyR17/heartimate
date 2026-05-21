import Image from 'next/image'
import Link from 'next/link'
import { GitFork } from 'lucide-react'

const ROSE = '#e8507a'

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a0e1c"/><circle cx="50" cy="35" r="20" fill="%23e8507a" opacity="0.4"/><path d="M20 80c0-15 15-25 30-25s30 10 30 25" fill="%23e8507a" opacity="0.4"/></svg>'

/** Server-rendered LCP hero — zero client JS for above-the-fold character image. */
export function CharacterDetailHero({
  name,
  avatarUrl,
  tags,
  isNsfw,
  forkedFrom,
}: {
  name: string
  avatarUrl: string | null
  tags: string[]
  isNsfw: boolean
  forkedFrom?: { id: string; name: string } | null
}) {
  const heroImage = avatarUrl || DEFAULT_AVATAR

  return (
    <section className="relative w-full h-[58vh] min-h-[340px] max-h-[720px] overflow-hidden">
      <Image
        src={heroImage}
        alt={name}
        fill
        className="object-cover object-[center_15%] scale-105"
        sizes="100vw"
        priority
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
              linear-gradient(180deg, rgba(8,6,8,0.55) 0%, transparent 35%),
              linear-gradient(0deg, #080608 0%, rgba(8,6,8,0.92) 28%, rgba(8,6,8,0.35) 55%, transparent 100%),
              radial-gradient(ellipse 80% 50% at 70% 20%, rgba(232,80,122,0.18), transparent)
            `,
        }}
      />

      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-5 md:px-10 py-5">
        <Link
          href="/explore"
          className="flex items-center gap-2 text-[13px] text-white/70 hover:text-white transition-colors bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10"
        >
          <span aria-hidden>←</span>
          Back
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 md:px-10 pb-8 md:pb-10">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {isNsfw && (
            <span
              className="inline-block text-[10px] font-label font-bold uppercase tracking-[0.2em] text-white px-3 py-1 rounded-full"
              style={{
                background: ROSE,
                boxShadow: `0 0 20px rgba(232,80,122,0.45)`,
              }}
            >
              18+ · NSFW
            </span>
          )}
          {forkedFrom && (
            <Link
              href={`/characters/${forkedFrom.id}`}
              className="inline-flex items-center gap-1.5 text-[10px] font-label font-bold uppercase tracking-wider text-rose px-3 py-1 rounded-full border border-rose/40 bg-rose/10 hover:bg-rose/15 transition-colors"
            >
              <GitFork className="w-3 h-3" />
              Forked from {forkedFrom.name}
            </Link>
          )}
        </div>

        <h1
          className="font-heading font-bold text-white leading-[0.95] tracking-tight"
          style={{
            fontSize: 'clamp(42px, 7vw, 88px)',
            textShadow: '0 4px 40px rgba(0,0,0,0.7)',
          }}
        >
          {name}
        </h1>

        <p className="font-label text-[11px] uppercase tracking-[0.25em] text-white/45 mt-2">
          {tags[0] || 'Companion'}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 max-w-3xl">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-label uppercase tracking-wider px-3 py-1 rounded-full border border-white/15 text-white/65 bg-white/5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
