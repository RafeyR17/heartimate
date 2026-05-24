"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X, Heart, MessageSquare, Compass, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { DarkSelect } from "@/components/ui/dark-select";
import { CharacterAvatar } from "@/components/CharacterAvatar";

const EXPLORE_SORT_OPTIONS = [
  { value: "trending", label: "🔥 Trending" },
  { value: "likes", label: "❤️ Most Liked" },
  { value: "chats", label: "💬 Most Chatted" },
  { value: "newest", label: "✨ Newest" },
  { value: "random", label: "🎲 Random" },
] as const;

// Curated luxury tag lists
const TAGS = [
  "Romance",
  "Dark Fantasy",
  "Yandere",
  "Sci-Fi",
  "Supernatural",
  "Enemies to Lovers",
  "Submissive",
  "Dominant",
  "Horror",
  "Historical",
  "Monster",
  "Forbidden Love",
  "Anime & Manga",
  "Sci-Fi Romance"
];

export interface Character {
  id: string;
  name: string;
  avatar_url: string;
  description: string;
  tags: string[];
  is_nsfw: boolean;
  likes_count: number;
  chat_count: number;
  created_at: string;
  users: {
    display_name: string;
  } | null;
}

interface ExploreClientProps {
  initialCharacters: Character[];
  totalCount: number;
  hasMore: boolean;
  queryText: string;
  selectedTags: string[];
  sortOption: string;
  currentLimit: number;
  fetchError?: string | null;
}

function CharacterSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0a0e] overflow-hidden flex flex-col animate-pulse">
      <div className="w-full aspect-square bg-white/5" />
      <div className="p-3.5 flex-1 flex flex-col gap-2.5">
        <div className="flex justify-between items-center gap-4">
          <div className="h-4 bg-white/10 rounded w-2/3" />
          <div className="h-3 bg-white/10 rounded w-10" />
        </div>
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-5/6" />
        <div className="flex gap-1.5 mt-auto pt-3">
          <div className="h-5 bg-white/10 rounded w-12" />
          <div className="h-5 bg-white/10 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export default function ExploreClient({
  initialCharacters,
  totalCount,
  hasMore,
  queryText,
  selectedTags,
  sortOption,
  currentLimit,
  fetchError = null,
}: ExploreClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(queryText);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateUrl = useCallback(
    (newParams: { q?: string; tags?: string[]; sort?: string; limit?: number }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newParams.q !== undefined) {
        if (newParams.q.trim()) params.set("q", newParams.q.trim());
        else params.delete("q");
      }

      if (newParams.tags !== undefined) {
        if (newParams.tags.length > 0) params.set("tags", newParams.tags.join(","));
        else params.delete("tags");
      }

      if (newParams.sort !== undefined) {
        if (newParams.sort) params.set("sort", newParams.sort);
        else params.delete("sort");
      }

      if (newParams.limit !== undefined) {
        params.set("limit", newParams.limit.toString());
      }

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const [syncedQuery, setSyncedQuery] = useState(queryText);
  if (queryText !== syncedQuery) {
    setSyncedQuery(queryText);
    setSearch(queryText);
  }

  // Handle live debounced search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== queryText) {
        updateUrl({ q: search, limit: 20 });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [search, queryText, updateUrl]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const clearSearch = () => {
    setSearch("");
    updateUrl({ q: "", limit: 20 });
  };

  const toggleTag = (tag: string) => {
    let newTags = [...selectedTags];
    if (newTags.includes(tag)) {
      newTags = newTags.filter((t) => t !== tag);
    } else {
      newTags.push(tag);
    }
    updateUrl({ tags: newTags, limit: 20 });
  };

  const clearAllFilters = () => {
    setSearch("");
    updateUrl({ tags: [], q: "", limit: 20 });
  };

  const handleSortChange = (value: string) => {
    updateUrl({ sort: value, limit: 20 });
  };

  const loadMore = () => {
    updateUrl({ limit: currentLimit + 20 });
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto w-full flex flex-col gap-6 select-none relative overflow-x-hidden">
      {/* Luxury Loading pulse top bar */}
      {isPending && (
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-rose z-50 animate-pulse shadow-[0_0_10px_rgba(232,80,122,0.8)]" />
      )}

      {/* HEADER HERO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="font-heading italic text-rose text-3xl md:text-4xl font-semibold mb-1 tracking-wide">
            Discover Companions
          </h1>
          <p className="font-body text-white/50 text-[13px] font-light">
            AI companions with deep memories and no boundaries. Find your private story.
          </p>
        </div>
        <div className="text-[12px] font-label text-white/30 tracking-[0.1em] uppercase self-start md:self-end">
          // Showing {totalCount} results
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-[#e8507a]/40 bg-[#e8507a]/10 px-4 py-3 font-body text-[13px] text-white/80">
          {fetchError}
        </div>
      )}

      {/* FILTER BAR CONTAINER */}
      <div className="flex flex-col gap-4 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
        {/* Search Input and Sort Select */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search characters, tags, or creators..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-10 text-[13.5px] text-white placeholder:text-white/20 focus:outline-none focus:border-rose/40 focus:ring-1 focus:ring-rose/25 transition-all font-body"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <DarkSelect
            value={sortOption}
            onChange={handleSortChange}
            options={EXPLORE_SORT_OPTIONS}
            aria-label="Sort characters"
            className="min-w-[160px]"
            triggerClassName="rounded-xl border-white/10 bg-white/5 py-3 hover:bg-white/10"
          />
        </div>

        {/* Category horizontal scrolling filters */}
        <div className="flex flex-col gap-3 border-t border-white/5 pt-4 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="font-body text-[12.5px] text-white/40 uppercase tracking-wider font-semibold">Filter by Tags</span>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="px-2.5 py-1 rounded-full font-body text-[11px] text-rose bg-rose/10 border border-rose/30 hover:bg-rose/20 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear ({selectedTags.length})
                </button>
              )}
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[12px] font-body text-rose/80 hover:text-rose transition-colors cursor-pointer flex items-center gap-1 shrink-0 bg-rose/5 border border-rose/20 hover:bg-rose/10 px-3 py-1 rounded-full"
            >
              {isExpanded ? "Show Less ↑" : "See All ↓"}
            </button>
          </div>

          <div 
            className={`transition-all duration-350 ${
              isExpanded 
                ? "flex flex-wrap gap-2 py-1 w-full" 
                : "flex gap-2 overflow-x-auto scrollbar-hide py-1 w-full"
            }`}
            style={!isExpanded ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
          >
            {TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full font-body text-[12.5px] transition-all duration-200 border cursor-pointer ${
                    isSelected
                      ? "bg-rose text-white border-rose shadow-[0_0_12px_rgba(232,80,122,0.3)]"
                      : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CHARACTER GRID SECTION */}
      {initialCharacters.length === 0 ? (
        <EmptyState
          icon={<Compass />}
          title="Into the unknown"
          subtitle="No companions match your search. Try different terms or clear your filters."
          action={{ label: 'Reset filters & search', onClick: clearAllFilters }}
        />
      ) : (
        // REAL GRID
        <>
          <div
            className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity duration-300 ${
              isPending ? "opacity-50" : "opacity-100"
            }`}
          >
            {initialCharacters.map((char) => {
              const formattedLikes =
                char.likes_count >= 1000
                  ? `${(char.likes_count / 1000).toFixed(1)}k`
                  : char.likes_count || 0;
              const formattedChats =
                char.chat_count >= 1000
                  ? `${(char.chat_count / 1000).toFixed(1)}k`
                  : char.chat_count || 0;

              return (
                <Link
                  key={char.id}
                  href={`/characters/${char.id}`}
                  className="group rounded-2xl border border-white/5 bg-[#0d0a0e] overflow-hidden hover:border-[rgba(232,80,122,0.25)] hover:-translate-y-1 transition-all duration-250 hover:shadow-[0_12px_40px_rgba(232,80,122,0.1)] flex flex-col"
                >
                  <div className="relative w-full aspect-square bg-white/5 overflow-hidden group-hover:[&_img]:scale-105 transition-transform duration-300">
                    <CharacterAvatar
                      name={char.name}
                      avatarUrl={char.avatar_url}
                      tags={char.tags}
                      sizes="(max-width:768px) 50vw, 25vw"
                    />
                    {char.is_nsfw && (
                      <div className="absolute top-2 left-2 bg-rose text-white text-[10px] font-label font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(232,80,122,0.4)]">
                        18+
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-[10px] font-label font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Online
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-body font-semibold text-[14px] text-white truncate">
                        {char.name}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-0.5 text-white/40">
                          <Heart className="w-3 h-3" />
                          <span className="font-body text-[11.5px]">{formattedLikes}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-white/40">
                          <MessageSquare className="w-3 h-3" />
                          <span className="font-body text-[11.5px]">{formattedChats}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-white/30 font-body mb-2 mt-0.5">
                      by {char.users?.display_name || "Creator"}
                    </p>

                    <p className="font-body text-[12px] text-white/50 line-clamp-2 leading-relaxed">
                      {char.description}
                    </p>

                    <div className="mt-auto pt-3.5 flex flex-wrap gap-1.5">
                      {char.tags &&
                        char.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="font-label text-[9px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-white/40 uppercase tracking-wide"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Skeletons rendering during background loading transitions */}
            {isPending &&
              Array.from({ length: 4 }).map((_, i) => <CharacterSkeleton key={i} />)}
          </div>

          {/* LOAD MORE BUTTON */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full font-body text-[13px] border border-white/10 transition-all flex items-center gap-2 cursor-pointer focus:outline-none hover:-translate-y-0.5 active:translate-y-0"
              >
                <Sparkles className="w-4 h-4 text-rose" />
                Load More Companions
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
