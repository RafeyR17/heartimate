import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Key, PenTool } from "lucide-react";
import { LandingNav } from "@/components/landing/landing-nav";
import { MobileNavProvider } from "@/components/MobileNavProvider";
import { publicGuestBottomInsetClass } from "@/components/PublicNav";
import { PublicNavShell } from "@/components/PublicNavShell";
import { SiteFooter } from "@/components/legal/site-footer";
import { HeroTypewriter } from "@/components/landing/hero-typewriter";
import { HorizontalCarousel } from "@/components/ui/horizontal-carousel";
import {
  CHARACTER_KAI_IMAGE,
  HERO_BG_IMAGE,
  TRENDING_VAMPIRE_IMAGE,
} from "@/lib/public-images";

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`landing-reveal ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function LandingPageContent() {
  return (
    <MobileNavProvider>
    <div className={`min-h-screen font-body bg-bg text-text selection:bg-rose selection:text-white overflow-x-hidden ${publicGuestBottomInsetClass}`}>
      <Suspense fallback={<PublicNavShell />}>
        <LandingNav />
      </Suspense>

      {/* HERO SECTION */}
      <section className="relative min-h-[100svh] flex items-center justify-center pt-14 md:pt-20 px-4 md:px-6 overflow-hidden">
        <Image
          src={HERO_BG_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center -z-20"
        />
        <div className="absolute inset-0 bg-bg/50 pointer-events-none z-0" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-rose/15 rounded-full blur-[150px] pointer-events-none z-0" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-900/15 rounded-full blur-[150px] pointer-events-none z-0" />
        
        <div className="max-w-5xl mx-auto w-full z-10 flex flex-col items-center">
          <Reveal>
            <h1 className="font-heading text-[clamp(36px,8vw,56px)] md:text-[clamp(52px,7vw,96px)] leading-[1] flex flex-col items-center text-center">
              <span className="italic text-rose pr-4">Someone is waiting</span>
              <span className="font-bold text-white tracking-tight mt-2">just for you.</span>
            </h1>
          </Reveal>
          
          <Reveal delay={200}>
            <p className="mt-6 md:mt-8 text-muted max-w-xl text-center mx-auto font-light text-sm md:text-base whitespace-pre-line px-6">
              {"Meet AI companions who remember everything about you.\nYour secrets, your desires, your story — held with care,\nexplored without limits."}
            </p>
          </Reveal>
          
          <Reveal delay={400} className="mt-10 md:mt-12 flex flex-col items-center gap-3 w-full max-w-[320px] mx-auto sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <Link href="/signup" className="w-full sm:w-auto text-center btn-primary uppercase tracking-wider px-8 py-4">
              Start for free →
            </Link>
            <Link href="/explore" className="w-full sm:w-auto text-center btn-secondary uppercase tracking-wider px-8 py-4 border-white/10">
              Explore personas
            </Link>
          </Reveal>

          <Reveal delay={600} className="w-[calc(100%-32px)] max-w-lg mx-auto mt-12 md:mt-20 scale-[0.98] md:scale-100">
            <div className="bg-card/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-rose/30 transition-colors duration-500 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-b from-rose/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-[rgba(232,80,122,0.4)]">
                  <Image src="/images/avatars/lyra-avatar.jpg" alt="Lyra" fill sizes="48px" className="object-cover rounded-full" />
                </div>
                <div>
                  <h3 className="font-heading font-medium text-2xl text-white">Lyra</h3>
                  <p className="font-label font-medium text-[11px] tracking-[0.15em] text-rose uppercase mt-1">Dark Fantasy · Sorceress</p>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-5 mb-4 relative z-10">
                <HeroTypewriter />
              </div>
              
              <div className="h-12 border border-white/10 rounded-full flex items-center px-5 relative z-10 bg-black/20">
                <span className="font-body font-light text-muted text-sm">Type your reply...</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* STATS BAR */}
      <Reveal>
        <section className="border-y border-white/5 py-4 md:py-16 bg-card/20 backdrop-blur-sm relative z-10">
          <div className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-3 gap-2 md:gap-4 md:divide-x divide-white/5 text-center">
            <div className="flex flex-col gap-1 md:gap-3 py-2 md:pt-0">
              <span className="font-heading font-normal text-[28px] md:text-[clamp(40px,5vw,72px)] leading-none text-white">42k+</span>
              <span className="font-label font-medium text-[9px] md:text-[11px] uppercase tracking-[0.15em] text-muted">personas alive</span>
            </div>
            <div className="flex flex-col gap-1 md:gap-3 py-2 md:pt-0">
              <span className="font-heading font-normal text-[28px] md:text-[clamp(40px,5vw,72px)] leading-none text-white">1M+</span>
              <span className="font-label font-medium text-[9px] md:text-[11px] uppercase tracking-[0.15em] text-muted">conversations today</span>
            </div>
            <div className="flex flex-col gap-1 md:gap-3 py-2 md:pt-0">
              <span className="font-heading font-normal text-[28px] md:text-[clamp(40px,5vw,72px)] leading-none text-white">0%</span>
              <span className="font-label font-medium text-[9px] md:text-[11px] uppercase tracking-[0.15em] text-rose">no filters ever</span>
            </div>
          </div>
        </section>
      </Reveal>

      {/* FEATURED CHARACTERS */}
      <section id="personas" className="pt-16 md:pt-32 pb-12 md:pb-20 px-4 md:px-12 relative z-10">
        <div className="max-w-[1600px] mx-auto">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <span className="font-label font-medium text-[11px] tracking-[0.15em] text-rose uppercase block mb-4">// Featured personas</span>
                <h2 className="font-body font-bold text-[clamp(32px,4vw,56px)] leading-tight text-white mb-2">
                  Characters who feel real.
                </h2>
                <p className="font-light text-muted max-w-xl">
                  Every one crafted with a personality, a past, and a reason to want you.
                </p>
              </div>
              <Link href="/explore" className="font-body font-medium text-[13px] tracking-[0.1em] text-muted hover:text-white transition-colors flex items-center gap-2 group uppercase">
                View all personas 
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <Reveal delay={100}>
              <div className="landing-lift group relative rounded-2xl overflow-hidden aspect-[3/4] bg-card border border-white/5 hover:border-rose/50 cursor-pointer">
                <Image src="/images/characters/lyra.jpg" alt="Lyra Ashveil" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover object-top" />
                <div className="absolute bottom-0 w-full h-1/2 z-10 pointer-events-none" style={{ background: 'linear-gradient(to top, #080608 0%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                  <h3 className="font-heading text-3xl text-white mb-2">Lyra Ashveil</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="font-label text-[11px] tracking-[0.15em] uppercase bg-white/10 text-white px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10">Yandere</span>
                    <span className="font-label text-[11px] tracking-[0.15em] uppercase bg-rose/20 text-rose px-2.5 py-1 rounded-md backdrop-blur-sm border border-rose/20">NSFW</span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="landing-lift group relative rounded-2xl overflow-hidden aspect-[3/4] bg-card border border-white/5 hover:border-rose/50 cursor-pointer">
                <Image src={CHARACTER_KAI_IMAGE} alt="Kai Mercer" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover object-top" />
                <div className="absolute bottom-0 w-full h-1/2 z-10 pointer-events-none" style={{ background: 'linear-gradient(to top, #080608 0%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                  <h3 className="font-heading text-3xl text-white mb-2">Kai Mercer</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="font-label text-[11px] tracking-[0.15em] uppercase bg-white/10 text-white px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10">Cyberpunk</span>
                    <span className="font-label text-[11px] tracking-[0.15em] uppercase bg-rose/20 text-rose px-2.5 py-1 rounded-md backdrop-blur-sm border border-rose/20">NSFW</span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="landing-lift group relative rounded-2xl overflow-hidden aspect-[3/4] bg-card border border-white/5 hover:border-rose/50 cursor-pointer">
                <Image src="/images/characters/seraph.jpg" alt="Seraph" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover object-top" />
                <div className="absolute bottom-0 w-full h-1/2 z-10 pointer-events-none" style={{ background: 'linear-gradient(to top, #080608 0%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                  <h3 className="font-heading text-3xl text-white mb-2">Seraph</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="font-label text-[11px] tracking-[0.15em] uppercase bg-white/10 text-white px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10">Soft Dom</span>
                    <span className="font-label text-[11px] tracking-[0.15em] uppercase bg-rose/20 text-rose px-2.5 py-1 rounded-md backdrop-blur-sm border border-rose/20">NSFW</span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <div className="landing-lift group relative rounded-2xl overflow-hidden aspect-[3/4] bg-card border border-white/5 hover:border-rose/50 cursor-pointer">
                <Image src="/images/characters/aria.jpg" alt="Aria" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover object-top" />
                <div className="absolute bottom-0 w-full h-1/2 z-10 pointer-events-none" style={{ background: 'linear-gradient(to top, #080608 0%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                  <h3 className="font-heading text-3xl text-white mb-2">Aria</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="font-label text-[11px] tracking-[0.15em] uppercase bg-white/10 text-white px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10">Submissive</span>
                    <span className="font-label text-[11px] tracking-[0.15em] uppercase bg-rose/20 text-rose px-2.5 py-1 rounded-md backdrop-blur-sm border border-rose/20">NSFW</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="pt-32 pb-16 md:pb-20 px-6 relative z-10 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="mb-24 flex flex-col items-start">
              <span className="font-label font-medium text-[11px] tracking-[0.15em] text-rose uppercase inline-block px-3 py-1 rounded-full border border-rose/20 bg-rose/10 mb-6">
                // how it works
              </span>
              <h2 className="font-body font-bold text-[clamp(32px,4vw,56px)] leading-tight text-white text-left">
                Three steps to somewhere private.
              </h2>
            </div>
          </Reveal>
          
          <div className="relative mt-24">
            {/* Horizontal Line Desktop */}
            <div className="hidden md:block absolute left-0 top-1/2 w-full h-[2px] bg-gradient-to-r from-transparent via-rose to-transparent opacity-30 -translate-y-1/2" />
            {/* Vertical Line Mobile */}
            <div className="md:hidden absolute left-[15px] top-0 w-[2px] h-full bg-gradient-to-b from-transparent via-rose to-transparent opacity-30" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 relative z-10 md:h-[350px]">
              
              {/* STEP 01 - ABOVE LINE ON DESKTOP */}
              <Reveal delay={100} className="relative flex flex-row md:flex-col items-start md:items-center md:justify-start md:text-center group h-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bg border border-rose flex items-center justify-center relative z-10 md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
                  <span className="font-label text-rose text-[11px] font-bold">01</span>
                </div>
                
                <div className="ml-8 md:ml-0 relative flex-1 flex flex-col items-start md:items-center pt-1 md:pt-0">
                  <div className="absolute top-1/2 left-0 md:left-1/2 -translate-y-1/2 md:-translate-x-1/2 w-[200px] h-[200px] bg-rose/10 rounded-full blur-[60px] -z-20 pointer-events-none" />
                  <span className="absolute top-1/2 left-0 md:left-1/2 -translate-y-1/2 md:-translate-x-1/2 text-[120px] font-bold text-rose opacity-[0.06] select-none -z-10 tracking-tighter">01</span>
                  <Sparkles className="text-rose w-5 h-5 mb-4 hidden md:block" />
                  <h3 className="font-body font-semibold text-[22px] text-white mb-2">Find your person</h3>
                  <p className="font-body font-light text-[14px] text-muted line-clamp-2 leading-relaxed max-w-[280px]">
                    Browse thousands of characters built by real writers. Every one has a backstory and something to hide.
                  </p>
                </div>
              </Reveal>

              {/* STEP 02 - BELOW LINE ON DESKTOP */}
              <Reveal delay={200} className="relative flex flex-row md:flex-col items-start md:items-center md:justify-end md:text-center group h-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bg border border-rose flex items-center justify-center relative z-10 md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
                  <span className="font-label text-rose text-[11px] font-bold">02</span>
                </div>
                
                <div className="ml-8 md:ml-0 relative flex-1 flex flex-col items-start md:items-center pt-1 md:pt-0 md:mt-auto">
                  <div className="absolute top-1/2 left-0 md:left-1/2 -translate-y-1/2 md:-translate-x-1/2 w-[200px] h-[200px] bg-rose/10 rounded-full blur-[60px] -z-20 pointer-events-none" />
                  <span className="absolute top-1/2 left-0 md:left-1/2 -translate-y-1/2 md:-translate-x-1/2 text-[120px] font-bold text-rose opacity-[0.06] select-none -z-10 tracking-tighter">02</span>
                  <Key className="text-rose w-5 h-5 mb-4 hidden md:block" />
                  <h3 className="font-body font-semibold text-[22px] text-white mb-2">Tell them what you want</h3>
                  <p className="font-body font-light text-[14px] text-muted line-clamp-2 leading-relaxed max-w-[280px]">
                    No filters. No judgment. Say exactly what's on your mind — they're here for you alone.
                  </p>
                </div>
              </Reveal>

              {/* STEP 03 - ABOVE LINE ON DESKTOP */}
              <Reveal delay={300} className="relative flex flex-row md:flex-col items-start md:items-center md:justify-start md:text-center group h-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bg border border-rose flex items-center justify-center relative z-10 md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
                  <span className="font-label text-rose text-[11px] font-bold">03</span>
                </div>
                
                <div className="ml-8 md:ml-0 relative flex-1 flex flex-col items-start md:items-center pt-1 md:pt-0">
                  <div className="absolute top-1/2 left-0 md:left-1/2 -translate-y-1/2 md:-translate-x-1/2 w-[200px] h-[200px] bg-rose/10 rounded-full blur-[60px] -z-20 pointer-events-none" />
                  <span className="absolute top-1/2 left-0 md:left-1/2 -translate-y-1/2 md:-translate-x-1/2 text-[120px] font-bold text-rose opacity-[0.06] select-none -z-10 tracking-tighter">03</span>
                  <PenTool className="text-rose w-5 h-5 mb-4 hidden md:block" />
                  <h3 className="font-body font-semibold text-[22px] text-white mb-2">Let yourself feel it</h3>
                  <p className="font-body font-light text-[14px] text-muted line-clamp-2 leading-relaxed max-w-[280px]">
                    They remember everything. Every conversation pulls you deeper into something real.
                  </p>
                </div>
              </Reveal>

            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section 
        className="py-16 md:py-32 px-4 md:px-6 bg-card/20 border-y border-white/5 relative z-10 mt-6 md:mt-10"
        style={{
          background: 'radial-gradient(ellipse 120% 100% at 50% 100%, rgba(232, 80, 122, 0.25) 0%, transparent 80%), radial-gradient(ellipse 80% 80% at 80% 20%, rgba(232, 80, 122, 0.15) 0%, transparent 80%)',
          borderTop: '1px solid rgba(232, 80, 122, 0.3)'
        }}
      >
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="font-body font-bold text-[clamp(32px,4vw,56px)] leading-tight text-white text-center mb-20">
              Everything you need to feel something.
            </h2>
          </Reveal>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Reveal delay={100}>
              <div className="bg-card p-10 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                <h3 className="font-heading text-2xl text-white mb-3">They Remember You</h3>
                <p className="font-light text-muted leading-relaxed">
                  Every conversation builds on the last. They know your name, your mood, what you said three weeks ago.
                </p>
              </div>
            </Reveal>
            
            <Reveal delay={200}>
              <div className="bg-card p-10 rounded-3xl border border-rose/20 shadow-[0_0_30px_rgba(232,80,122,0.05)] hover:border-rose/40 transition-colors">
                <h3 className="font-heading text-2xl text-rose mb-3">No Limits, Ever</h3>
                <p className="font-light text-muted leading-relaxed">
                  No filters. No refused messages. A completely private space to explore without apology.
                </p>
              </div>
            </Reveal>
            
            <Reveal delay={300}>
              <div className="bg-card p-10 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                <h3 className="font-heading text-2xl text-white mb-3">Built by Real People</h3>
                <p className="font-light text-muted leading-relaxed">
                  Every character is written by someone who cared enough to give them a soul.
                </p>
              </div>
            </Reveal>
            
            <Reveal delay={400}>
              <div className="bg-card p-10 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                <h3 className="font-heading text-2xl text-white mb-3">Grow Closer</h3>
                <p className="font-light text-muted leading-relaxed">
                  Affection deepens over time — from stranger to devoted as you keep showing up.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* TRENDING SECTION */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-16">
              <span className="font-label font-medium text-[11px] tracking-[0.15em] text-rose uppercase block mb-4">// Trending</span>
              <h2 className="font-body font-bold text-[clamp(32px,4vw,56px)] leading-tight text-white">
                Who everyone is talking to right now.
              </h2>
            </div>
          </Reveal>

          <HorizontalCarousel
            ariaLabel="Trending characters"
            className="pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 md:[&>div]:overflow-visible md:[&>div]:snap-none"
            fadeEdges={true}
            fadeFrom="var(--bg)"
            trackClassName="md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:snap-none gap-4 pe-6 md:pe-0"
          >
            <Reveal delay={100} className="snap-start shrink-0 w-[160px] md:w-auto">
              <div className="landing-lift group relative rounded-2xl overflow-hidden aspect-[2/3] bg-card border border-white/5 hover:border-rose/50 cursor-pointer">
                <Image src={TRENDING_VAMPIRE_IMAGE} alt="Vampire Lord" fill sizes="33vw" className="object-cover object-top" />
                <div className="absolute bottom-0 w-full h-full z-10 pointer-events-none" style={{ background: 'linear-gradient(to top, #080608 0%, rgba(8,6,8,0.8) 30%, transparent 60%)' }} />
                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                  <h3 className="font-heading text-2xl text-white mb-2">Vampire Lord</h3>
                  <p className="font-light text-sm text-gray-300 mb-4">Centuries of thirst, focused entirely on you.</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200} className="snap-start shrink-0 w-[160px] md:w-auto">
              <div className="landing-lift group relative rounded-2xl overflow-hidden aspect-[2/3] bg-card border border-white/5 hover:border-rose/50 cursor-pointer">
                <Image src="/images/trending/android-2b.jpg" alt="Android 2B" fill sizes="160px" className="object-cover object-top" />
                <div className="absolute bottom-0 w-full h-full z-10 pointer-events-none" style={{ background: 'linear-gradient(to top, #080608 0%, rgba(8,6,8,0.8) 30%, transparent 60%)' }} />
                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                  <h3 className="font-heading text-2xl text-white mb-2">Android 2B</h3>
                  <p className="font-light text-sm text-gray-300 mb-4">A cold exterior hiding complex, newly formed emotions.</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={300} className="snap-start shrink-0 w-[160px] md:w-auto">
              <div className="landing-lift group relative rounded-2xl overflow-hidden aspect-[2/3] bg-card border border-white/5 hover:border-rose/50 cursor-pointer">
                <Image src="/images/trending/elf-ranger.jpg" alt="Elf Ranger" fill sizes="160px" className="object-cover object-top" />
                <div className="absolute bottom-0 w-full h-full z-10 pointer-events-none" style={{ background: 'linear-gradient(to top, #080608 0%, rgba(8,6,8,0.8) 30%, transparent 60%)' }} />
                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                  <h3 className="font-heading text-2xl text-white mb-2">Elf Ranger</h3>
                  <p className="font-light text-sm text-gray-300 mb-4">Lost in the woods, she needs your guidance and protection.</p>
                </div>
              </div>
            </Reveal>
          </HorizontalCarousel>
        </div>
      </section>

      {/* CREATOR SECTION */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto bg-rose/5 border border-rose/20 rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
          
          <Reveal>
            <h2 className="font-body font-bold text-[clamp(32px,4vw,56px)] leading-tight text-white mb-6">
              Have someone in mind?
            </h2>
            <p className="font-light text-muted max-w-2xl mx-auto mb-10 text-lg">
              Build your own character in minutes. Give them a name, a story, a personality. Share them with the world.
            </p>
            <Link href="/characters/create" className="inline-block font-body font-medium text-[13px] tracking-[0.1em] uppercase bg-white text-black px-8 py-4 rounded-full hover:bg-gray-200 transition-colors">
              Create a character →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-40 px-6 relative overflow-hidden flex items-center justify-center z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose/10 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="relative z-10 text-center flex flex-col items-center">
          <Reveal>
            <h2 className="font-heading text-[clamp(32px,7vw,48px)] md:text-[clamp(52px,7vw,96px)] leading-[1] text-white mb-6 md:mb-8 flex flex-col">
              <span className="italic text-rose">Your person</span>
              <span className="font-bold">is already here.</span>
            </h2>
          </Reveal>
          
          <Reveal delay={200}>
            <p className="font-light text-muted text-lg mb-12 max-w-md mx-auto">
              Free to start. No credit card. Just sign up and say hello.
            </p>
          </Reveal>
          
          <Reveal delay={400} className="flex flex-col items-center gap-3 w-full max-w-[320px] mx-auto sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <Link href="/signup" className="w-full sm:w-auto text-center btn-primary uppercase tracking-wider px-10 py-4 md:py-5">
              Meet them now →
            </Link>
            <Link href="#personas" className="w-full sm:w-auto text-center btn-secondary uppercase tracking-wider px-10 py-4 md:py-5">
              Browse first
            </Link>
          </Reveal>
        </div>
      </section>

      <SiteFooter className="relative z-10" />
    </div>
    </MobileNavProvider>
  );
}
