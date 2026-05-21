"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Compass,
  TrendingUp,
  Heart,
  User,
  Plus,
  Settings,
  Sparkles,
  LogIn,
  UserPlus,
  X,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { Suspense, useEffect } from "react";
import { StreakWidget } from "./StreakWidget";
import { useMobileNav } from "./MobileNavProvider";
import { cn } from "@/lib/utils";
import { pickPersonaName, type SidebarChatItem } from "@/lib/app-types";

type NavLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
};

function SidebarPanel({
  logoHref,
  navLinks,
  isSignedIn,
  chats,
  streakCount,
  displayName,
  avatarUrl,
  user,
  onNavigate,
  className,
}: {
  logoHref: string;
  navLinks: NavLink[];
  isSignedIn: boolean;
  chats: SidebarChatItem[];
  streakCount: number;
  displayName: string;
  avatarUrl: string | null;
  user: ReturnType<typeof useUser>["user"];
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col h-full bg-[#0d0a0e]", className)}>
      <div className="py-5 px-5 border-b border-white/5 flex items-center justify-between shrink-0 safe-top">
        <Link
          href={logoHref}
          className="font-heading italic text-[18px] text-white flex items-center"
          onClick={onNavigate}
        >
          Heartimate<span className="text-[#e8507a]">.</span>
        </Link>
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close menu"
            className="touch-target rounded-lg text-white/50 hover:text-white hover:bg-white/5 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 scroll-container">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-[10px] px-[12px] py-[10px] min-h-[44px] rounded-lg font-body font-medium text-[13px] transition-all duration-200 border-l-2",
              link.isActive
                ? "bg-[rgba(232,80,122,0.12)] !text-[#e8507a] border-[#e8507a]"
                : "text-white/50 hover:bg-white/5 hover:text-white border-transparent"
            )}
          >
            <link.icon
              className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                link.isActive ? "text-[#e8507a]" : "text-white/50 group-hover:text-white"
              )}
            />
            {link.label}
          </Link>
        ))}

        {isSignedIn && (
          <StreakWidget streakCount={streakCount} avatarUrl={chats?.[0]?.character?.avatar_url || null} />
        )}

        {isSignedIn && chats.length > 0 && (
          <div className="mt-6">
            <div className="font-label text-[10px] text-white/30 uppercase tracking-[0.2em] px-[12px] mb-3">
              // Recent Chats
            </div>
            <div className="flex flex-col gap-1">
              {chats.map((chat) => {
                const isActive = pathname === `/chat/${chat.id}`;
                const charName = chat.character?.name || "Unknown";
                const charAvatar = chat.character?.avatar_url || "/images/characters/lyra.jpg";
                const personaName = pickPersonaName(chat.persona);
                return (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-[10px] px-[12px] py-[8px] min-h-[44px] rounded-lg font-body font-medium text-[13px] transition-all duration-200 border-l-2",
                      isActive
                        ? "bg-[rgba(232,80,122,0.12)] !text-[#e8507a] border-[#e8507a]"
                        : "text-white/50 hover:bg-white/5 hover:text-white border-transparent"
                    )}
                  >
                    <div className="relative w-5 h-5 rounded-full overflow-hidden bg-white/5 flex-shrink-0">
                      <Image
                        src={charAvatar}
                        alt={charName}
                        fill
                        className="object-cover object-top"
                        sizes="20px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="truncate block">{charName}</span>
                      {personaName && (
                        <span className="truncate block text-[10px] text-white/35 font-normal">
                          as {personaName}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-white/5 p-4 shrink-0 safe-bottom">
        {isSignedIn ? (
          <>
            <Link
              href="/profile"
              onClick={onNavigate}
              className="flex items-center gap-[10px] px-[12px] py-[10px] min-h-[44px] rounded-lg font-body font-medium text-[13px] text-white/50 hover:bg-white/5 hover:text-white transition-all duration-200 mb-2"
            >
              <Settings className="w-4 h-4" />
              Profile
            </Link>

            <Link
              href="/profile"
              onClick={onNavigate}
              className="flex items-center gap-3 px-2 py-2 min-h-[44px] rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-white/5">
                {(avatarUrl || user?.imageUrl) && (
                  <Image
                    src={avatarUrl || user?.imageUrl || ""}
                    alt="Avatar"
                    fill
                    className="object-cover"
                    sizes="32px"
                    unoptimized={Boolean(avatarUrl?.startsWith("data:"))}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-[13px] text-white font-medium truncate">
                  {displayName || user?.fullName || user?.username || "User"}
                </p>
                <div className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/70 font-label uppercase mt-0.5">
                  Free
                </div>
              </div>
            </Link>
          </>
        ) : (
          <p className="px-3 font-body text-[12px] text-white/35 leading-relaxed">
            Sign in to save chats, create characters, and build your sanctuary.
          </p>
        )}
      </div>
    </div>
  );
}

function SidebarContent({
  displayName,
  avatarUrl,
  chats = [],
  streakCount = 0,
}: {
  displayName: string;
  avatarUrl: string | null;
  chats: SidebarChatItem[];
  streakCount?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isSignedIn } = useUser();
  const { open, close } = useMobileNav();

  const sort = searchParams.get("sort");
  const isChatPage = pathname?.startsWith("/chat/");

  const signedInNavLinks: NavLink[] = [
    { label: "Home", href: "/home", icon: Home, isActive: pathname === "/home" },
    { label: "Discover", href: "/explore", icon: Compass, isActive: pathname === "/explore" && sort !== "trending" },
    { label: "Trending", href: "/explore?sort=trending", icon: TrendingUp, isActive: pathname === "/explore" && sort === "trending" },
    { label: "Favorites", href: "/profile?tab=favorites", icon: Heart, isActive: pathname === "/profile" && searchParams.get("tab") === "favorites" },
    { label: "Personas", href: "/personas", icon: Sparkles, isActive: Boolean(pathname?.startsWith("/personas")) },
    { label: "My Characters", href: "/profile?tab=characters", icon: User, isActive: pathname === "/profile" && searchParams.get("tab") === "characters" },
    { label: "Create", href: "/characters/create", icon: Plus, isActive: pathname === "/characters/create" },
  ];

  const guestNavLinks: NavLink[] = [
    { label: "Explore", href: "/explore", icon: Compass, isActive: pathname === "/explore" },
    { label: "Log in", href: "/login", icon: LogIn, isActive: pathname === "/login" },
    { label: "Sign up", href: "/signup", icon: UserPlus, isActive: pathname === "/signup" },
  ];

  const navLinks = isSignedIn ? signedInNavLinks : guestNavLinks;
  const logoHref = isSignedIn ? "/home" : "/";

  useEffect(() => {
    close();
  }, [pathname, searchParams, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const panelProps = {
    logoHref,
    navLinks,
    isSignedIn: Boolean(isSignedIn),
    chats,
    streakCount,
    displayName,
    avatarUrl,
    user,
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-[220px] h-screen fixed left-0 top-0 border-r border-white/5 z-50">
        <SidebarPanel {...panelProps} />
      </div>

      {/* Mobile slide-out drawer */}
      {!isChatPage && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            aria-hidden={!open}
            tabIndex={open ? 0 : -1}
            onClick={close}
            className={cn(
              "md:hidden fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity duration-300",
              open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
          />
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            aria-hidden={!open}
            className={cn(
              "md:hidden fixed top-0 left-0 bottom-0 z-[56] w-[min(280px,85vw)] border-r border-white/10 shadow-2xl transition-transform duration-300 ease-out",
              open ? "translate-x-0" : "-translate-x-full pointer-events-none"
            )}
          >
            <SidebarPanel {...panelProps} onNavigate={close} />
          </aside>
        </>
      )}
    </>
  );
}

export function SidebarClient({
  displayName,
  avatarUrl = null,
  chats = [],
  streakCount = 0,
}: {
  displayName: string;
  avatarUrl?: string | null;
  chats: SidebarChatItem[];
  streakCount?: number;
}) {
  return (
    <Suspense fallback={<div className="w-[220px] hidden md:block bg-[#0d0a0e] fixed h-screen" />}>
      <SidebarContent
        displayName={displayName}
        avatarUrl={avatarUrl ?? null}
        chats={chats}
        streakCount={streakCount}
      />
    </Suspense>
  );
}
