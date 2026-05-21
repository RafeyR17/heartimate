"use client";

import { useMemo, useState } from "react";
import { STREAK_MILESTONES } from "@/lib/streak-constants";
import { AvatarImage } from "@/components/ui/avatar-image";
import { AccessibleDialog } from "@/components/AccessibleDialog";

import {
  getCelebratedStreakMilestones,
  markStreakMilestoneCelebrated,
} from "@/lib/client-storage";

export function StreakWidget({
  streakCount,
  avatarUrl,
}: {
  streakCount: number;
  avatarUrl?: string | null;
}) {
  const reachedMilestone = useMemo(
    () => [...STREAK_MILESTONES].reverse().find((m) => streakCount >= m) ?? null,
    [streakCount]
  );

  const [dismissedMilestone, setDismissedMilestone] = useState<number | null>(null);
  const [checkedMilestone, setCheckedMilestone] = useState<number | null>(null);

  if (
    reachedMilestone != null &&
    checkedMilestone !== reachedMilestone &&
    !getCelebratedStreakMilestones().has(reachedMilestone)
  ) {
    setCheckedMilestone(reachedMilestone);
    markStreakMilestoneCelebrated(reachedMilestone);
  }

  const showMilestone =
    reachedMilestone != null &&
    checkedMilestone === reachedMilestone &&
    dismissedMilestone !== reachedMilestone;

  const isGold = streakCount >= 7;
  const isGlowing = streakCount >= 30;

  return (
    <>
      <div
        className={`mt-3 mx-1 rounded-xl border px-3 py-2.5 ${
          isGold ? "border-[#c9a96e]/40" : "border-white/10"
        } ${isGlowing ? "streak-glow" : ""}`}
        style={{ background: "rgba(232,80,122,0.06)" }}
      >
        <p
          className="font-body font-semibold text-[14px]"
          style={{ color: isGold ? "#c9a96e" : "#fff" }}
        >
          🔥 {Math.max(0, streakCount)} day streak {streakCount >= 7 ? "🏆" : ""}
        </p>
        {streakCount === 0 && (
          <p className="text-[12px] text-white/45 mt-0.5">Start your streak today</p>
        )}
      </div>

      <AccessibleDialog
        open={showMilestone}
        onClose={() => setDismissedMilestone(reachedMilestone)}
        title={`${reachedMilestone} day streak milestone`}
        panelClassName="max-w-md p-6 text-center mx-4"
      >
        {reachedMilestone !== null && (
          <>
            <div className="text-5xl mb-3" aria-hidden>
              {emojiFor(reachedMilestone)}
            </div>
            <p className="font-heading italic text-[34px] text-[#e8507a] leading-tight">
              {reachedMilestone} days in a row.
            </p>
            <p className="text-white/65 mt-2">Your companions have noticed.</p>
            <div className="mt-5 text-center">
              {avatarUrl && (
                <div className="relative w-12 h-12 rounded-full mx-auto overflow-hidden border border-white/15">
                  <AvatarImage
                    src={avatarUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
              )}
              <p className="text-[13px] text-white/50 italic mt-2">
                “You keep coming back... I think I like that about you.”
              </p>
            </div>
            <button
              type="button"
              className="mt-6 w-full min-h-[44px] rounded-full bg-[#e8507a] text-white text-[14px] font-medium py-2.5"
              onClick={() => setDismissedMilestone(reachedMilestone)}
            >
              Keep going →
            </button>
          </>
        )}
      </AccessibleDialog>
    </>
  );
}

function emojiFor(m: number) {
  if (m >= 30) return "👑";
  if (m >= 14) return "💫";
  if (m >= 7) return "⚡";
  return "🔥";
}
