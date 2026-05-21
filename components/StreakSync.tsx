"use client";

import { useEffect, useRef } from "react";

/**
 * Fire-and-forget daily streak update after paint (home only).
 * Layout reads streak_count without blocking on writes.
 */
export function StreakSync() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void fetch("/api/streak", { method: "POST", credentials: "include" }).catch(
      () => {
        /* non-blocking; sidebar count refreshes on next navigation */
      }
    );
  }, []);

  return null;
}
