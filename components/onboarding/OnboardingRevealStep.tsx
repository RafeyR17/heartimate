"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { resolveOnboardingReveal } from "@/lib/onboarding-copy";

type StarterChar = {
  id: string;
  name: string;
  msg: string;
  img: string;
};

type Props = {
  character: StarterChar;
  personaName: string;
  displayName: string;
  slideClassName: string;
  roseFlash: boolean;
  isSubmitting: boolean;
  submitError: string;
  onFinish: () => void;
};

export function OnboardingRevealStep({
  character,
  personaName,
  displayName,
  slideClassName,
  roseFlash,
  isSubmitting,
  submitError,
  onFinish,
}: Props) {
  const [phase, setPhase] = useState<"A" | "B" | "C" | "D">("A");
  const [typewriterText, setTypewriterText] = useState("");

  const who = personaName.trim() || displayName.trim() || "guest";
  const revealTemplate = resolveOnboardingReveal(
    character.id,
    character.name,
    character.msg
  );
  const fullMsg = revealTemplate.replace(/\[name\]/g, who);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("B"), 300);
    const t2 = setTimeout(() => setPhase("C"), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (phase !== "C") return;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypewriterText(fullMsg.slice(0, i));
      if (i >= fullMsg.length) {
        clearInterval(interval);
      }
    }, 38);

    return () => clearInterval(interval);
  }, [phase, fullMsg]);

  useEffect(() => {
    if (phase !== "C" || typewriterText.length < fullMsg.length) return;
    const t = setTimeout(() => setPhase("D"), 800);
    return () => clearTimeout(t);
  }, [phase, typewriterText.length, fullMsg.length]);

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[800ms] ease-out ${slideClassName}`}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-[1000ms] -z-20 ${phase === "A" ? "opacity-0" : "opacity-100"}`}
      >
        <Image
          src={character.img}
          alt="Background"
          fill
          className="object-cover object-top"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,6,8,0.2), rgba(8,6,8,0.85))",
          }}
        />
      </div>

      <div
        className={`w-full max-w-[520px] px-6 text-center flex flex-col items-center justify-center transition-all duration-[1000ms] ease-out ${phase === "A" || phase === "B" ? "opacity-0 translate-y-12" : "opacity-100 translate-y-0"}`}
      >
        <span className="font-label text-[11px] tracking-[0.15em] mb-4 uppercase text-white/40">
          // THEY&apos;VE BEEN WAITING
        </span>
        <h2 className="font-heading italic text-[48px] text-rose mb-12">
          {character.name}
        </h2>

        <div className="min-h-[160px] flex items-start justify-center">
          <p className="font-heading italic text-[18px] text-[rgba(255,255,255,0.85)] leading-[1.8] text-center">
            {typewriterText}
          </p>
        </div>

        <div
          className={`mt-12 transition-opacity duration-1000 ${phase === "D" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {submitError && (
            <p className="mb-4 text-center font-body text-[13px] text-[#e8507a]">
              {submitError}
            </p>
          )}
          <button
            type="button"
            onClick={onFinish}
            disabled={isSubmitting}
            className="px-10 py-4 bg-rose text-white rounded-full font-body font-medium text-[13px] tracking-[0.1em] uppercase transition-all hover:bg-rose/90 shadow-[0_0_30px_rgba(232,80,122,0.4)] disabled:opacity-50"
          >
            {isSubmitting ? "Connecting..." : "Begin your story →"}
          </button>
        </div>
      </div>

      <div
        className={`absolute inset-0 bg-rose transition-opacity duration-[600ms] pointer-events-none z-50 ${roseFlash ? "opacity-20" : "opacity-0"}`}
      />
    </div>
  );
}
