import { requireAuthedServerDb } from "@/lib/server-auth";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { pickPersonaName } from "@/lib/app-types";
import { fetchHomeRecentChats, fetchHomeTrendingCharacters } from "@/lib/home-data";
import { resolveCharacterImageSrc } from "@/lib/safe-image-src";
import { EmptyState } from "@/components/EmptyState";
import { StreakSync } from "@/components/StreakSync";
import { HorizontalCarousel, carouselSnapItemClass } from "@/components/ui/horizontal-carousel";



function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export default async function HomePage() {
  const { supabase, user } = await requireAuthedServerDb();

  const [chats, trending] = await Promise.all([
    fetchHomeRecentChats(supabase, user.id),
    fetchHomeTrendingCharacters(supabase),
  ]);
  const hasRecentChats = chats.length > 0;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto w-full flex flex-col gap-10 overflow-x-hidden">
      <StreakSync />
      
      {/* SECTION 1 - HERO BANNER */}
      <section className="relative w-full rounded-2xl overflow-hidden flex flex-col items-center text-center py-8 px-4 sm:px-6 md:min-h-[340px] md:py-12 md:justify-center">
        {/* Layered backgrounds */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0d0010 0%, #1a0028 40%, #0d0010 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 60% 50%, rgba(232,80,122,0.15), transparent)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 40% 40% at 20% 80%, rgba(150,20,80,0.1), transparent)' }} />

        {/* Welcome label — in flow on mobile; corner on desktop */}
        <p className="relative z-10 w-full max-w-2xl font-label text-[10px] sm:text-[11px] text-rose uppercase tracking-[0.15em] mb-4 text-left truncate md:absolute md:top-5 md:left-6 md:mb-0 md:max-w-[min(280px,calc(100%-3rem))]">
          // WELCOME BACK, {user.display_name}
        </p>

        {/* Centered content */}
        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
          {/* Pill tag */}
          <div
            className="mb-4 sm:mb-6 inline-flex items-center px-3 sm:px-4 py-1.5 rounded-full font-body font-medium text-[11px] sm:text-[12px] text-rose"
            style={{ background: 'rgba(232,80,122,0.15)', border: '1px solid rgba(232,80,122,0.3)' }}
          >
            ✦ Your private sanctuary
          </div>

          {/* Heading */}
          <h1 className="font-heading leading-[1.1] mb-3 sm:mb-4 text-[28px] sm:text-[36px] md:text-[52px] lg:text-[64px] w-full">
            <span className="italic text-rose block">Someone is waiting</span>
            <span className="font-bold text-white block">just for you.</span>
          </h1>

          {/* Subtext */}
          <p
            className="font-body font-light text-[14px] sm:text-[16px] max-w-[480px] mx-auto mb-5 sm:mb-8 px-1"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            AI companions with deep memory and no restrictions. Your private world.
          </p>

          {/* Buttons */}
          <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
            <Link
              href={hasRecentChats ? "/profile?tab=chats" : "/explore"}
              className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px] bg-rose text-white px-5 md:px-6 py-3 rounded-full font-body font-medium text-[13px] hover:bg-rose/90 transition-colors shadow-[0_0_20px_rgba(232,80,122,0.35)] min-h-[44px] inline-flex items-center justify-center"
            >
              {hasRecentChats ? "Continue chatting →" : "Start exploring →"}
            </Link>
            <Link
              href="/explore"
              className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px] text-white/70 hover:text-white px-5 md:px-6 py-3 rounded-full font-body font-medium text-[13px] border border-white/15 hover:bg-white/5 transition-colors min-h-[44px] inline-flex items-center justify-center"
            >
              Find someone new
            </Link>
          </div>

          {/* Avatar cluster — below CTAs on mobile, corner on desktop */}
          <div className="mt-6 flex justify-center md:hidden">
            {hasRecentChats ? (
              chats.map((chat, i) => (
                <div
                  key={chat.id}
                  className="relative w-10 h-10 rounded-full border-2 border-[#1a0028] overflow-hidden bg-[#0d0a0e]"
                  style={{
                    zIndex: 3 - i,
                    marginLeft: i === 0 ? 0 : '-12px',
                    boxShadow: '0 0 20px rgba(232,80,122,0.3)',
                  }}
                >
                  <Image src={resolveCharacterImageSrc(chat.character?.avatar_url)} alt={chat.character?.name || "Character"} fill className="object-cover object-top" sizes="40px" />
                </div>
              ))
            ) : (
              <>
                {[
                  { src: "/images/characters/lyra.jpg", alt: "Lyra", z: 30 },
                  { src: "/images/characters/kai.jpg", alt: "Kai", z: 20 },
                  { src: "/images/characters/aria.jpg", alt: "Aria", z: 10 },
                ].map((char, i) => (
                  <div
                    key={char.alt}
                    className="relative w-10 h-10 rounded-full border-2 border-[#1a0028] overflow-hidden bg-[#0d0a0e]"
                    style={{
                      zIndex: char.z,
                      marginLeft: i === 0 ? 0 : '-12px',
                      boxShadow: '0 0 20px rgba(232,80,122,0.3)',
                    }}
                  >
                    <Image src={char.src} alt={char.alt} fill className="object-cover object-top" sizes="40px" />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Avatar cluster — bottom right (desktop only) */}
        <div className="absolute bottom-3 right-4 md:bottom-5 md:right-6 hidden md:flex">
          {hasRecentChats ? (
            chats.map((chat, i) => (
              <div
                key={chat.id}
                className="relative w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-[#1a0028] overflow-hidden bg-[#0d0a0e]"
                style={{
                  zIndex: 3 - i,
                  marginLeft: i === 0 ? 0 : '-12px',
                  boxShadow: '0 0 20px rgba(232,80,122,0.3)',
                }}
              >
                <Image src={resolveCharacterImageSrc(chat.character?.avatar_url)} alt={chat.character?.name || "Character"} fill className="object-cover object-top" sizes="56px" />
              </div>
            ))
          ) : (
            <>
              {[
                { src: "/images/characters/lyra.jpg", alt: "Lyra", z: 30 },
                { src: "/images/characters/kai.jpg", alt: "Kai", z: 20 },
                { src: "/images/characters/aria.jpg", alt: "Aria", z: 10 },
              ].map((char, i) => (
                <div
                  key={char.alt}
                  className="relative w-14 h-14 rounded-full border-2 border-[#1a0028] overflow-hidden bg-[#0d0a0e]"
                  style={{
                    zIndex: char.z,
                    marginLeft: i === 0 ? 0 : '-12px',
                    boxShadow: '0 0 20px rgba(232,80,122,0.3)',
                  }}
                >
                  <Image src={char.src} alt={char.alt} fill className="object-cover object-top" sizes="56px" />
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* SECTION 2 - CONTINUE CHATTING */}
      {hasRecentChats ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body font-semibold text-[16px] text-white">Continue where you left off</h2>
            <Link href="/profile?tab=chats" className="font-body text-[13px] text-rose hover:text-rose/80 transition-colors">See all →</Link>
          </div>
          <HorizontalCarousel ariaLabel="Recent chats" className="pb-4" fadeFrom="#080608">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className={`${carouselSnapItemClass} w-[140px] md:w-[200px] rounded-xl border border-white/5 overflow-hidden group hover:border-[rgba(232,80,122,0.3)] hover:-translate-y-0.5 transition-all bg-white/[0.02]`}
              >
                <div className="relative w-full h-[120px] bg-white/5">
                  <Image src={resolveCharacterImageSrc(chat.character?.avatar_url)} alt={chat.character?.name || "Character"} fill className="object-cover object-top" sizes="200px" />
                </div>
                <div className="p-3">
                  <h3 className="font-body font-semibold text-[14px] text-white truncate">{chat.character?.name || "Unknown"}</h3>
                  {pickPersonaName(chat.persona) && (
                    <p className="font-body text-[11px] text-rose/80 truncate mt-0.5">
                      as {pickPersonaName(chat.persona)}
                    </p>
                  )}
                  <p className="font-body text-[12px] text-muted truncate mt-1">Continue the story...</p>
                  {chat.last_message_at && (
                    <p className="font-label text-[10px] text-white/30 uppercase mt-1">
                      {formatTimeAgo(chat.last_message_at)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </HorizontalCarousel>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02]">
          <EmptyState
            icon={<MessageCircle className="w-7 h-7" />}
            title="No chats yet"
            subtitle="Pick a character from Explore and start your first story."
            action={{ label: "Explore characters →", href: "/explore" }}
          />
        </section>
      )}

      {/* SECTION 3 - CATEGORY FILTER PILLS */}
      <section>
        <HorizontalCarousel
          ariaLabel="Trending categories"
          className="pb-2"
          fadeFrom="#080608"
          trackClassName="gap-2"
        >
          {[
            "🔥 Trending Now", "Anime & Manga", "Dark Fantasy",
            "Sci-Fi Romance", "Supernatural", "Yandere",
            "Romance", "Historical", "Monster"
          ].map((pill, i) => (
            <Link
              key={pill}
              href={`/explore?tags=${encodeURIComponent(pill.replace('🔥 ', ''))}`}
              className={`${carouselSnapItemClass} whitespace-nowrap px-4 min-h-[44px] inline-flex items-center rounded-full font-body text-[13px] transition-colors border ${
                i === 0
                  ? 'bg-rose/10 text-rose border-rose/30'
                  : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {pill}
            </Link>
          ))}
        </HorizontalCarousel>
      </section>

      {/* SECTION 4 - DISCOVER CHARACTERS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-body font-semibold text-[18px] text-white">Discover Characters</h2>
          <Link href="/explore" className="font-body text-[13px] text-muted hover:text-white transition-colors">View All →</Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {trending.length > 0 ? (
            trending.map((char) => (
              <Link key={char.id} href={`/characters/${char.id}`} className="group rounded-2xl border border-white/5 bg-[#0d0a0e] overflow-hidden hover:border-[rgba(232,80,122,0.25)] hover:-translate-y-1 transition-all duration-250 hover:shadow-[0_12px_40px_rgba(232,80,122,0.1)] flex flex-col">
                <div className="relative w-full aspect-square bg-white/5">
                  <Image 
                    src={resolveCharacterImageSrc(char.avatar_url)} 
                    alt={char.name} 
                    fill 
                    className="object-cover object-top" 
                    sizes="(max-width:768px) 50vw, 25vw"
                  />
                  <div className="absolute top-2 left-2 bg-rose text-white text-[10px] font-label font-bold px-2 py-0.5 rounded-full uppercase">
                    18+
                  </div>
                  <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-[10px] font-label font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Online
                  </div>
                </div>
                <div className="p-3.5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-body font-semibold text-[14px] text-white truncate">{char.name}</h3>
                    <div className="flex items-center gap-1 text-muted flex-shrink-0">
                      <Heart className="w-3 h-3" />
                      <span className="font-body text-[12px]">
                        {(char.likes_count ?? 0) >= 1000
                          ? `${((char.likes_count ?? 0) / 1000).toFixed(1)}k`
                          : char.likes_count ?? 0}
                      </span>
                    </div>
                  </div>
                  <p className="font-body text-[12px] text-muted mt-1 line-clamp-2 leading-relaxed">
                    {char.description}
                  </p>
                  <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                    {char.tags && char.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="font-label text-[10px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-white/40 uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState
              icon={<Heart className="w-7 h-7" />}
              title="No characters yet"
              subtitle="The catalog is empty — check back soon or create your own."
              action={{ label: "Create a character →", href: "/characters/create" }}
            />
          )}
        </div>
      </section>

      {/* SECTION 5 - CREATE CTA BANNER */}
      <section className="w-full rounded-2xl border border-[rgba(232,80,122,0.15)] p-8 md:p-10 text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(232,80,122,0.08)] to-[rgba(232,80,122,0.03)]" />
        <div className="relative z-10">
          <h2 className="font-heading italic text-2xl md:text-[28px] text-white mb-2">Have someone in mind?</h2>
          <p className="font-body font-light text-[14px] text-muted max-w-sm mx-auto">
            Build your own character and share them with the world.
          </p>
          <Link href="/characters/create" className="inline-block mt-6 px-8 py-3 bg-rose text-white rounded-full font-body font-medium text-[13px] hover:bg-rose/90 transition-colors shadow-[0_0_20px_rgba(232,80,122,0.2)]">
            Start Creating →
          </Link>
        </div>
      </section>

    </div>
  );
}
