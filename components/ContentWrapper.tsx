"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppBottomTabBar, appShellBottomInsetClass, shouldShowAppBottomTabBar } from "./AppBottomTabBar";
import { TopbarClient } from "./TopbarClient";
import { TopbarShell } from "./TopbarShell";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isChatPage = pathname.startsWith("/chat/");
  const showAppTabBar = shouldShowAppBottomTabBar(pathname);

  const isFormPage = pathname.includes("/create") || pathname.includes("/edit") || pathname.startsWith("/onboarding");
  const showTopbar = !isChatPage && !isFormPage;

  return (
    <div className="flex-1 md:ml-[220px] flex flex-col min-w-0 overflow-x-hidden">
      {showTopbar && (
        <Suspense fallback={<TopbarShell />}>
          <TopbarClient />
        </Suspense>
      )}
      <main
        className={cn(
          "flex-1 flex flex-col w-full h-full overflow-x-hidden",
          showAppTabBar && appShellBottomInsetClass
        )}
      >
        {children}
      </main>
      {showAppTabBar && <AppBottomTabBar />}
    </div>
  );
}
