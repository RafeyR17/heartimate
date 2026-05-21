"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useMobileNav } from "./MobileNavProvider";

export function TopbarClient() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { toggle } = useMobileNav();
  const showMobileSearch = pathname === "/explore";

  const [mobileSearchSynced, setMobileSearchSynced] = useState(false);
  if (showMobileSearch && !mobileSearchSynced) {
    setMobileSearchSynced(true);
    setQuery(searchParams.get("q") ?? "");
  }
  if (!showMobileSearch && mobileSearchSynced) {
    setMobileSearchSynced(false);
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/explore?q=${encodeURIComponent(q)}`);
    else router.push("/explore");
  };

  return (
    <div className="h-14 md:h-[60px] border-b border-white/5 bg-[rgba(8,6,8,0.8)] backdrop-blur px-4 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-40 safe-top">
      <div className="flex items-center gap-2 md:hidden shrink-0">
        <button
          type="button"
          onClick={toggle}
          aria-label="Open menu"
          aria-controls="mobile-nav-drawer"
          className="touch-target rounded-lg text-white/70 hover:text-white hover:bg-white/5"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {showMobileSearch ? (
        <form onSubmit={handleSearch} className="flex-1 relative md:max-w-[480px] min-w-0">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Search characters..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full h-11 md:h-auto md:py-[10px] pr-4 pl-10 font-body text-base md:text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[rgba(232,80,122,0.3)] transition-colors"
          />
        </form>
      ) : (
        <div className="flex-1 md:hidden flex items-center min-w-0">
          <Link href="/home" className="font-heading italic text-base text-white flex items-center truncate">
            Heartimate<span className="text-rose">.</span>
          </Link>
        </div>
      )}

      <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-[480px] relative">
        <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search characters..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-full py-[10px] pr-4 pl-10 font-body text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[rgba(232,80,122,0.3)] transition-colors"
        />
      </form>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/profile"
          className="touch-target relative w-10 h-10 rounded-full overflow-hidden border border-white/10 hover:border-rose/50 transition-colors bg-white/5"
        >
          {user?.imageUrl ? (
            <Image src={user.imageUrl} alt="User Avatar" fill className="object-cover" sizes="40px" />
          ) : (
            <div className="w-full h-full bg-white/10" />
          )}
        </Link>
      </div>
    </div>
  );
}
