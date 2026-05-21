"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] flex flex-col items-center justify-center gap-4 p-6">
      <p className="heading-accent text-2xl">
        Heartimate<span className="text-rose">.</span>
      </p>
      <p className="text-muted-on-dark text-sm">Signing you in…</p>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/home"
        signUpFallbackRedirectUrl="/onboarding"
      />
    </div>
  );
}
