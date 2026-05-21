import Link from 'next/link'
import { SiteFooter } from '@/components/legal/site-footer'

type LegalSection = {
  id: string
  title: string
  paragraphs: readonly string[] | string[]
  list?: readonly string[] | string[]
}

type LegalPageProps = {
  title: string
  subtitle: string
  lastUpdated: string
  sections: LegalSection[]
}

export function LegalPage({ title, subtitle, lastUpdated, sections }: LegalPageProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#080608]">
      <div className="flex-1 px-4 py-10 md:px-8 md:py-14">
        <article className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="font-body text-sm text-muted hover:text-white transition-colors"
          >
            ← Back to Heartimate
          </Link>

          <header className="mt-8 mb-10 border-b border-white/10 pb-8">
            <h1 className="font-heading text-3xl md:text-4xl text-white italic tracking-tight">
              {title}
            </h1>
            <p className="mt-3 font-body text-muted text-[15px] leading-relaxed">
              {subtitle}
            </p>
            <p className="mt-4 font-label text-[11px] uppercase tracking-[0.12em] text-muted">
              Last updated: {lastUpdated}
            </p>
          </header>

          <div className="flex flex-col gap-10 font-body text-[15px] text-white/85 leading-[1.75]">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                {section.title ? (
                  <h2 className="font-heading text-xl text-white italic mb-3">
                    {section.title}
                  </h2>
                ) : null}
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)} className="mb-3 text-white/75">
                    {p}
                  </p>
                ))}
                {section.list && (
                  <ul className="list-disc pl-5 space-y-2 text-white/70">
                    {section.list.map((item) => (
                      <li key={item.slice(0, 48)}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
      <SiteFooter />
    </div>
  )
}
